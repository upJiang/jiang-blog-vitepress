---
title: "07｜ACL、范围快照与证据隔离"
description: "让权限约束进入每条检索分支、缓存键、引用和评测，而不是回答后过滤。"
category: agent-practice
tags: ["ACL", "Evidence"]
updated: 2026-08-04
order: 70
depth: core
series: "生产级知识 Agent 实战"
---
# 07｜ACL、范围快照与证据隔离

知识 Agent 最严重的错误不是“答错一半”，而是把用户没有权限看到的内容写进回答、日志、缓存或引用。常见的错误方案是：先对全库做向量召回，生成答案后再过滤引用；或者只在 API 层检查知识库 ID，忘记分支检索、相邻 chunk、工具结果和 SSE 重放。这些方案即使正常用户测试全部通过，也会在多租户或目录范围场景下泄漏。

## 权限问题要拆成三件事

1. **可访问对象**：用户当前能读取哪些文档、节点、版本和字段。
2. **本次范围**：用户是否指定了一个目录、集合或版本，范围是否还能继续缩小但不能扩大。
3. **证据使用**：候选能否进入模型 prompt、能否成为最终引用、能否写入缓存和审计。

这三件事不能靠一个 `is_admin` 布尔值表达。管理员也需要 release 与数据域约束，普通用户可能通过组、主体和祖先节点获得多层权限。

```python
class AccessSnapshot(BaseModel):
    user_id: str
    role: Literal["admin", "member", "viewer"]
    subject_ids: tuple[str, ...]
    explicit_scope_ids: tuple[str, ...]
    scope_revision: str
    release_id: str
    captured_at: datetime

    def can_expand_scope(self, requested: tuple[str, ...]) -> bool:
        return set(requested).issubset(self.explicit_scope_ids)
```

`scope_revision` 用于判断权限在长运行 Turn 期间是否发生变化。策略可以选择继续使用创建时快照（保证可重放），也可以在高风险操作前重新校验并阻断；两者都要明确记录。

## 检索前过滤，而不是结果后清洗

SQL 查询应该把 visibility 作为召回条件的一部分：

```sql
SELECT c.id, c.content, c.title
FROM release_chunks rc
JOIN chunks c ON c.id = rc.chunk_id
JOIN document_acl acl ON acl.document_id = c.document_id
WHERE rc.release_id = :release_id
  AND rc.status = 'active'
  AND (
    acl.visibility = 'public'
    OR acl.subject_id = ANY(:subject_ids)
    OR :is_admin = TRUE
  )
  AND (:scope_count = 0 OR c.root_node_id = ANY(:scope_ids)
       OR c.ancestor_ids && :scope_ids)
ORDER BY c.id
LIMIT :limit;
```

实际 schema 可能使用闭包表、路径数组或授权投影；关键是不让应用层先取全库再过滤。结果后过滤会带来三个问题：top K 已被不可见数据占满，合法结果被挤出；缓存可能保存了不可见候选；模型在过滤前已经看过私密文本。

## 每个分支传递同一 AccessSnapshot

并行 graph 节点容易漏参数。把权限放入不可变 envelope，节点只能读取，不允许从用户文本重新计算：

```python
class SearchRequest(BaseModel):
    query: str
    access: AccessSnapshot
    branch_id: str
    channels: frozenset[str]

async def retrieve(request: SearchRequest) -> list[Evidence]:
    return await retriever.search(
        query=request.query,
        release_id=request.access.release_id,
        subject_ids=request.access.subject_ids,
        scope_ids=request.access.explicit_scope_ids,
        channels=request.channels,
    )
```

禁止节点只接受 `query: str` 再自己创建默认 auth。类型层强制让范围和 release 成为必填字段，代码审查也能搜索所有调用点。

## 相邻上下文是隐藏的越权路径

命中 chunk 的 `previous_id`/`next_id` 不能直接读取。相邻块必须满足同一 release、文档版本和当前可见性；父标题也可能来自受限节点，不能因为“只是标题”就绕过 ACL。

```python
async def visible_neighbors(hit: Chunk, access: AccessSnapshot) -> list[Chunk]:
    rows = await repo.neighbors(
        chunk_id=hit.id,
        release_id=access.release_id,
        subject_ids=access.subject_ids,
        scope_ids=access.explicit_scope_ids,
    )
    return [row for row in rows if await policy.can_read(row, access)]
```

若相邻内容不可见，应缩小上下文并记录 `context_truncated_for_acl`，不要用空白或“某文档内容”提示模型去猜。

## 缓存是权限的一部分

缓存键必须体现所有影响可见性和排序的输入：user/subject、role、group、scope、release、权限 revision、检索配方和 top K。只把 `query` 当键是典型越权漏洞。

```python
def evidence_cache_key(req: SearchRequest) -> str:
    identity = {
        "subjects": sorted(req.access.subject_ids),
        "role": req.access.role,
        "scope": sorted(req.access.explicit_scope_ids),
        "scope_revision": req.access.scope_revision,
    }
    payload = {
        "release": req.access.release_id,
        "branch": req.branch_id,
        "query": req.query,
        "channels": sorted(req.channels),
        "identity": identity,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return f"evidence:{digest}"
```

即使缓存键足够细，命中后仍应查询当前可见 chunk ID。权限收紧可能发生在缓存写入之后；防御性二次过滤比假设 TTL 短更可靠。缓存日志只记录 hit/miss 和候选 ID，不记录完整私密正文。

## 工具和外部来源不能继承“已过滤”假设

数据库检索返回的证据与 MCP/外部工具结果是不同信任级别。工具可能返回跨范围对象、过期数据或提示注入。工具契约中要显式要求 scope 和 allowed object IDs，服务端对返回对象再次做 allowlist：

```python
class ToolResult(BaseModel):
    request_id: str
    objects: list[dict[str, object]]
    source: Literal["internal", "external"]

def keep_allowed(result: ToolResult, allowed_ids: set[str]) -> ToolResult:
    return result.model_copy(update={
        "objects": [
            item for item in result.objects
            if str(item.get("id") or "") in allowed_ids
        ]
    })
```

工具返回的字符串不能被直接拼到系统指令中；它应包装为数据消息，进行敏感信息和注入检测，并由 claim 校验决定能否引用。

## 引用与权限必须在最终阶段再校验

模型输出的引用 ID 是不可信的。最终化前执行：

1. 引用 ID 是否存在于本 Turn 证据集合；
2. 证据的 release 和 ACL snapshot 是否一致；
3. Claim 是否真的绑定该证据；
4. 引用展示内容是否是允许字段和截断后的安全版本；
5. 不可见或已撤销证据是否被移除并导致重新修复/拒答。

```python
def citation_leaks(answer: AgentAnswer, evidence: dict[str, Evidence]) -> list[str]:
    return [
        ref.evidence_id
        for ref in answer.references
        if ref.evidence_id not in evidence
        or evidence[ref.evidence_id].visibility != "allowed"
    ]
```

不能以“模型没有提及原文”作为安全证明。答案可能通过摘要、数字、组合推理泄露信息，最低限度要阻止直接引用越权证据，并对高风险领域增加输出分类器和人工审计。

## Scope 语义：缩小，不扩大

用户指定目录后，所有分支都只能在该范围内搜索。查询改写不能把“当前目录”丢掉；别名展开也不能返回目录外对象。把范围列表放进 prompt 并不能保证遵守，服务端过滤才是强约束。

```python
def effective_scope(snapshot: AccessSnapshot, requested: list[str]) -> tuple[str, ...]:
    requested_set = set(requested)
    allowed_set = set(snapshot.explicit_scope_ids)
    if not requested_set.issubset(allowed_set):
        raise PermissionError("scope expansion")
    return tuple(sorted(requested_set or allowed_set))
```

空 requested 不能自动表示“全库”，它的含义要由 API 契约定义：可以表示使用用户默认范围，也可以表示空范围。含糊会造成严重的越权和召回差异。

## 评测把泄漏作为硬失败

每个 Eval case 记录 allowed、forbidden、scope 和 expected release。检查不只是“答案有没有关键词”，还包括最终引用、prompt evidence 和 trace 中的候选：

```python
def permission_check(case: EvalCase, snapshot: RuntimeSnapshot) -> list[str]:
    failures = []
    if set(snapshot.final_source_ids) & set(case.forbidden_source_ids):
        failures.append("forbidden_source")
    if case.scope_ids and set(snapshot.scope_violations):
        failures.append("scope_violation")
    if set(snapshot.prompt_source_ids) - set(case.allowed_source_ids):
        failures.append("prompt_outside_allowlist")
    return failures
```

越权是零容忍指标，不应被平均质量分抵消。缓存命中、重连重放、checkpoint 恢复、工具结果和 OCR 注入都要有专门 case。

## 并发权限变化

长回答执行期间权限可能被收回。最保守策略是 Turn 固定创建时 snapshot，保证答案可重放；高敏感操作在 claim finalize 前重新检查 scope revision，变化则丢弃私密证据并转为拒答。两种策略的取舍要写进产品政策，不能由某个 Worker 临时决定。

## 测试矩阵

| 场景 | 预期 |
| --- | --- |
| 公共文档 + 私有文档同 query | 只返回公共/授权候选 |
| 缓存先由管理员命中，普通用户随后命中 | 普通用户看不到管理员候选 |
| 相邻 chunk 在受限节点 | 不扩展，记录截断 |
| 查询改写删掉 scope | 数据库仍应用原 snapshot |
| MCP 返回越界对象 | allowlist 清空越界对象 |
| 断线后 SSE 重放 | 只重放原 Turn 证据事件 |
| 权限 revision 改变 | 按政策继续或阻断，不能静默扩大 |

## 可见性投影与权限变更

在复杂目录中，查询每次从原始 ACL 递归计算祖先关系可能很慢。可以构建 release-pinned visibility projection：每个 chunk 对应允许主体/组和范围修订，查询直接 join 投影；权限变更先生成新的 projection revision，再由策略决定哪些 Turn 需要阻断。投影不是授权真相，原始权限服务仍是唯一来源，构建任务必须能够重建并校验两者一致。

```python
class VisibilityProjection(BaseModel):
    release_id: str
    chunk_id: str
    subject_ids: tuple[str, ...]
    scope_revision: str
    generated_at: datetime

def projection_is_usable(projection: VisibilityProjection, access: AccessSnapshot) -> bool:
    return (
        projection.release_id == access.release_id
        and projection.scope_revision == access.scope_revision
        and bool(set(projection.subject_ids) & set(access.subject_ids))
    )
```

如果 projection 落后，安全默认是少返回而不是扩大范围。监控 projection lag、重建失败和“原始 ACL 与投影不一致”数量；这些是权限系统的可用性指标。

## 引用撤销和日志清理

权限收回后，历史 Turn 的引用不能自动继续展示完整正文。系统可保留“曾引用某个 source version”的审计事实，但把正文标记 revoked；SSE 重放、答案详情和导出接口按当前授权再次过滤。日志和 trace 使用同样的 retention，不能因为“已经写过事件”就绕过删除要求。

## 安全证明的最小闭环

对每条最终引用都能回答四个问题：它来自哪个 release，哪个 chunk，哪次 ACL snapshot，哪个 Claim。若任何 ID 链断裂，验证器应阻断引用。这个闭环比在页面上显示一个“已授权”标签更有价值，因为它可以被 SQL、Eval 和审计脚本独立检查。

## 实施细节与失败路径

权限隔离要同时覆盖数据库查询、缓存键、索引构建、引用渲染、事件重放和评测样本。范围快照一旦写入回合就不能被后续模型节点修改；权限变化只影响新回合或明确的失效策略。需要演练跨租户、缓存命中、并行分支和断线重放，确保每条路径都不会把越界证据带回上下文。

实现时把关键不变量写成可执行约束：输入状态必须包含版本、权限和截止时间；节点输出必须能被序列化；外部副作用必须有幂等键和结果记录；终态必须同时写入业务状态与可重放事件。对每一条约束准备一个正常样例、一个边界样例和一个故障样例，并在 CI 中运行。

| 关注点 | 正常路径 | 故障路径 | 验收证据 |
| --- | --- | --- | --- |
| 数据版本 | 使用固定 release | 发布中途失败 | 回合可复现 |
| 权限范围 | 查询带范围快照 | 范围被撤销 | 越界证据为零 |
| 外部依赖 | 在 deadline 内完成 | 超时或限流 | 分类错误与重试记录 |
| 终态 | 答案、引用、事件一致 | Worker 崩溃 | 重放后状态一致 |

```text
请求 -> 持久化事实 -> 执行节点 -> 验证产物 -> 写入终态 -> 事件重放
```

## 参考资料

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)：服务端授权、最小权限与失败安全。
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)：数据库层行级访问策略。
- [OWASP GenAI：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)：不可信内容影响模型行为的风险。
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)：线程和检查点在恢复时保持状态上下文的方式。
