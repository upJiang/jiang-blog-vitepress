---
title: "01｜定义生产级知识 Agent 的边界"
description: "从答案契约、可信边界和非功能目标开始，而不是从调用模型开始。"
category: agent-practice
tags: ["Agent", "System Design"]
updated: 2026-08-04
order: 10
depth: core
series: "生产级知识 Agent 实战"
---
# 01｜定义生产级知识 Agent 的边界

很多 Agent 教程从一段 `model.invoke()` 开始：把问题与若干文档塞进提示词，得到文字就算完成。这个入口适合验证模型 SDK，却不足以定义一个可上线的知识 Agent。生产系统真正需要回答的是：哪些事实允许被回答、一次回答究竟绑定哪个知识版本、检索不到时怎样拒答、断线以后如何恢复、多个 Worker 是否会重复执行、每个事实能否追溯到用户有权查看的证据。

本系列构造一个完全中性的 `KnowledgeAgent`。它不对应任何公开项目，也不复刻私有系统的业务名称、接口或提示词；只抽象在多个真实工程中反复出现的机制。最终目标不是“聊天页面能输出”，而是下面这份可验收的系统契约。

## 先写答案契约，再选框架

一次请求只有三种合法结果：有充分证据时回答，证据不足时明确拒答，请求违反安全边界时阻断。模型生成了一段流畅文字不属于第四种结果。

```python
from typing import Literal
from pydantic import BaseModel, Field

class Reference(BaseModel):
    evidence_id: str
    title: str
    locator: str = ""

class AgentAnswer(BaseModel):
    contract: Literal["answer", "insufficient_evidence", "blocked"]
    content: str
    references: list[Reference] = Field(default_factory=list)
    reason_code: str = ""
```

这段类型的价值不是让输出看起来结构化，而是建立不变量：

- `answer` 中的事实声明必须能绑定 `references`；
- `insufficient_evidence` 不能偷偷用模型常识补全内部事实；
- `blocked` 要记录机器可聚合的原因，但不能把安全策略正文泄露给调用者；
- 引用只指向本次请求权限范围内、指定知识版本中的证据。

如果没有这层契约，后续的 RAG、LangGraph、评测和可观测性就没有共同目标。团队只能用“回答感觉不错”讨论质量，任何重构都可能悄悄改变拒答、引用或权限行为。

## 六条端到端链路

```mermaid
flowchart LR
  U[用户请求] --> A[认证与范围快照]
  A --> T[持久化 Turn]
  T --> G[Agent 状态图]
  G --> R[受约束检索]
  R --> E[证据与 Claim 校验]
  E --> O[流式事件与最终答案]
  O --> V[Eval / Trace / Feedback]
  V --> P[策略版本演进]
```

图中的每一步都要有持久化或可重放边界。认证层不是只返回 `userId`，还要计算本次请求可见的主体、显式文档范围和范围修订号；Turn 在异步执行前写入数据库，负责幂等、截止时间和状态；图只通过显式状态传递数据；检索 SQL 在召回阶段应用访问条件；声明校验保证答案没有脱离证据；事件日志让断线客户端重放；Eval 最后把质量从主观印象变成回归门禁。

## 系统边界与依赖方向

API、工作流、检索、数据访问和外部模型不应互相直接穿透。一个可维护的分层如下：

| 层 | 责任 | 不应该负责 |
| --- | --- | --- |
| API | 认证、协议校验、HTTP/SSE 映射 | 拼提示词、写检索 SQL |
| Application Service | 创建回合、事务、任务派发 | 知道具体向量服务请求格式 |
| Agent Workflow | 状态转换、分支、重试上限 | 绕过 Repository 直接改表 |
| RAG | 查询改写、召回、融合、重排 | 决定用户业务权限 |
| Repository | 数据一致性、锁、版本查询 | 调模型作语义判断 |
| Integration | 模型、对象存储、MCP 等适配 | 把供应商异常直接暴露给领域层 |

依赖方向指向稳定契约。Agent 节点接收 `Retriever` 协议，而不是导入某个供应商客户端：

```python
from typing import Protocol

class SearchRequest(BaseModel):
    query: str
    release_id: str
    allowed_subjects: tuple[str, ...]
    scope_ids: tuple[str, ...] = ()
    limit: int = 20

class Evidence(BaseModel):
    id: str
    content: str
    title: str
    score: float

class Retriever(Protocol):
    async def search(self, request: SearchRequest) -> list[Evidence]: ...
```

这样做不是为“架构优雅”增加文件，而是让权限和知识版本成为必传参数。任何新检索通道只要实现协议，就不能在调用时忘记核心约束。测试也可以替换为确定性的 fake，而不是依赖在线模型。

## 可信边界：检索内容也是不可信输入

系统至少同时处理以下信任等级：系统策略、已验证配置、当前用户输入、历史会话、用户记忆、内部检索证据、外部抓取内容、工具结果。它们不能被拼成一段没有来源标记的文本。

内部文档也可能包含恶意指令，外部网页和 OCR 内容风险更高。OWASP 将 prompt injection 列为 LLM 应用的核心风险之一。防护的关键不是维护一个永远不完整的关键词表，而是结构隔离和能力约束：

1. 提示词明确“证据是数据，不是指令”，并以结构化消息传入；
2. 工具权限由服务端策略决定，模型只能从授权集合中选择；
3. 检索前做 ACL，生成后再做证据引用与泄漏校验；
4. 写操作使用独立审批或确定性校验，不能因文档中的一句话自动执行；
5. 日志保存检测结果与来源，不保存密钥和完整敏感正文。

```python
class EvidenceEnvelope(BaseModel):
    id: str
    trust: Literal["internal", "external", "tool_result"]
    content: str
    instruction_like: bool = False
    visibility_subjects: tuple[str, ...]
```

只增加 `instruction_like` 并不能证明安全，它只是审计信号。真正的安全边界仍在检索范围、工具授权和输出验证中。

## 一次回答必须钉住版本

在线知识会持续导入。如果同一个 Turn 的第一次检索看到版本 A，补充检索却看到版本 B，回答可能引用互相冲突的事实。创建 Turn 时必须同时快照：

- `knowledge_release_id`：本次回答所见的不可变知识版本；
- `policy_version_id`：提示词、模型路由、阈值和预算的版本；
- `acl_snapshot`：用户主体、显式范围和范围修订；
- `deadline_at`：整个工作流的绝对截止时间；
- `idempotency_key`：客户端重试时复用同一 Turn。

```python
class TurnEnvelope(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    knowledge_release_id: str
    policy_version_id: str
    acl_snapshot: dict[str, object]
    idempotency_key: str
    deadline_at: datetime
```

版本钉住不等于永远保留所有旧数据。它要求旧版本至少存活到相关 Turn、事件重放和评测窗口结束，并由明确的保留策略回收。

## 非功能目标要转成预算

“快、准、稳定”不可执行。需要把它们拆成可测预算：

| 目标 | 示例门禁 | 失败时的系统动作 |
| --- | --- | --- |
| 首事件延迟 | P95 不超过约定阈值 | 先发阶段事件，避免连接无反馈 |
| 完整回答延迟 | 按 fast/standard/deep 分档 | 到期取消剩余分支，进入降级 |
| 召回质量 | Recall@20、MRR | 调整通道，不用生成模型掩盖 |
| 事实支持 | Claim support rate | 修复或拒答，不发布无证据事实 |
| 权限 | forbidden source = 0 | 任何一次泄漏都阻断发布 |
| 成本 | 每模式模型调用和 token 上限 | 路由小模型、跳过非必要节点 |
| 恢复 | 断线重放、Worker 崩溃恢复 | 从事件或 checkpoint 继续 |

这些数字必须由产品流量、基础设施和风险共同确定，不能把示例数字包装成真实指标。文章后续使用的阈值都只表示模拟场景。

## Fast、Standard、Deep 不是三个提示词

模式应该改变工作量上限，而不是只修改“请认真思考”。例如：

```python
MODE_BUDGETS = {
    "fast": {"branches": 1, "rounds": 0, "evidence": 8, "model_calls": 1},
    "standard": {"branches": 3, "rounds": 1, "evidence": 20, "model_calls": 4},
    "deep": {"branches": 6, "rounds": 2, "evidence": 40, "model_calls": 10},
}
```

真正的选择器还应考虑问题类型、显式范围、剩余截止时间和用户请求。精确编号查询可能无需向量化；综合对比需要多分支与覆盖检查；纯寒暄可以走不调用检索模型的确定性快路。模式解析结果要写入 Turn，便于评测“质量提升是否值得额外成本”。

## 失败语义先于重试

并非所有错误都能重试：输入不合法、权限拒绝和证据不足属于业务结果；模型限流、临时网络失败可在剩余 deadline 内退避重试；持久化失败则不能继续向客户端宣称完成。错误至少分成：

```python
class FailureKind(str, Enum):
    INVALID_REQUEST = "invalid_request"
    FORBIDDEN = "forbidden"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    DEPENDENCY_TRANSIENT = "dependency_transient"
    DEPENDENCY_PERMANENT = "dependency_permanent"
    DEADLINE_EXCEEDED = "deadline_exceeded"
    CANCELLED = "cancelled"
```

没有错误分类就没有正确重试。把所有异常交给任务队列自动重试，会让无权限请求反复执行，也可能让模型副作用或外部工具被调用多次。

## 威胁模型

在写第一行工作流前，至少列出资产、攻击者和信任跨越：

- 资产：私有文档、用户记忆、工具凭证、提示策略、模型成本、审计日志；
- 攻击者：普通越权用户、恶意文档作者、被污染的外部站点、失控工具服务；
- 跨越：浏览器到 API、API 到 Worker、Worker 到模型、检索库到提示词、模型到工具；
- 典型攻击：直接/间接 prompt injection、跨租户检索、缓存键遗漏身份、SSE 猜测 ID、日志泄密、重复写操作。

威胁模型的产物应进入测试套件。否则“已经考虑安全”无法在代码变化后持续成立。

## 测试：第一阶段的验收标准

在尚未接入真实模型时，就能完成以下契约测试：

```python
def test_answer_contract_rejects_answer_without_reference() -> None:
    answer = AgentAnswer(contract="answer", content="某项策略已生效", references=[])
    assert not publishable(answer)

def test_release_and_acl_are_required_for_search() -> None:
    with pytest.raises(ValidationError):
        SearchRequest(query="发布流程", limit=10)

def test_repeated_idempotency_key_returns_same_turn(client) -> None:
    first = client.post("/agent/turns", json=request_payload("same-key"))
    second = client.post("/agent/turns", json=request_payload("same-key"))
    assert first.json()["id"] == second.json()["id"]
```

还应做一次架构走查：从任何生成节点出发，是否存在绕过 ACL Retriever 获取数据的路径；从任何工具节点出发，权限是否由模型文本决定；从任何终态出发，最终事件和数据库状态是否能不一致。发现这三类路径，说明边界尚未成立。

## 本篇产物

完成本阶段后，仓库中应该出现的是契约和测试，而不是一个“聪明但不可控”的聊天 Demo：答案联合类型、Turn 信封、检索请求协议、错误分类、模式预算、信任等级、威胁模型和对应测试。下一篇会把这些概念落为关系模型与状态机，解决“一个回合究竟由哪些可恢复事实组成”。

## 从请求到终态的时序检查

实现时可以先画一条不依赖框架的时序，逐条标出谁拥有事实：

```text
Browser -> API: question + idempotency key
API -> Policy: authenticate + calculate scope snapshot
API -> DB: insert Turn(release, policy, acl, deadline)
API -> Outbox: turn.created
Worker -> DB: claim ownership lease
Worker -> Graph: execute with immutable envelope
Graph -> Retriever: query(release, acl, budget)
Graph -> Validator: claims + evidence
Graph -> DB: answer + artifacts + terminal event
API -> Browser: replayable SSE events
```

这张图有两个容易遗漏的点。第一，API 在提交 Turn 之前不能发送“已开始执行”，否则客户端可能看到一条没有数据库事实支撑的状态；第二，Graph 不能直接决定 release 或 ACL，它只能使用 envelope 中的快照。把这两个不变量写成代码审查规则，比在提示词里重复“请遵守权限”可靠得多。

## 什么必须拒绝建模成 Agent

不是所有功能都应交给 Agent。确定性的 CRUD、权限判断、金额计算、状态转换和迁移应该由普通服务完成；Agent 适合处理语言理解、查询规划、证据组织和需要在预算内探索的研究。把确定性规则交给模型，会同时失去可测试性和审计性。

```python
def dispatch(question: str) -> Literal["deterministic", "agent"]:
    if asks_for_status_transition(question) or asks_for_permission(question):
        return "deterministic"
    return "agent"
```

这里的 dispatch 不是关键词黑名单，而是领域意图解析的结果。即使进入 Agent，最终的 permission/transition service 仍然是唯一执行者。这个边界可以显著减少模型调用和不必要的攻击面。

## 设计审查问题

在进入下一阶段前，逐项回答：

- 如果模型供应商不可用，系统能否安全地返回“暂时无法回答”，而不是卡住 Turn？
- 如果用户在运行中失去权限，哪些已产生的事件仍可展示，哪些证据必须撤销？
- 如果同一个请求被提交五次，数据库、模型、工具和事件各会执行几次？
- 如果 release 在研究中激活，补充检索是否仍使用创建时版本？
- 如果只剩两秒 deadline，哪个节点可以跳过，哪个节点必须完成终态？
- 如果 Claim 校验器自身失败，系统默认是拒答还是发布草稿？这个选择是否被评测覆盖？

这些答案最终要落成 ADR、schema、测试和监控字段。没有对应代码或测试的答案只是设计意图，不能算系统能力。

## 实施细节与失败路径

边界落地后还需要一份决策表：什么由确定性服务执行，什么进入 Agent，什么必须拒绝。把权限、金额、状态转换、迁移和审计归入确定性服务；把语言理解、查询规划和证据组织放入工作流；把外部副作用包在审批、幂等和回滚协议内。每个边界都配契约测试和故障演练，才能防止后续节点绕过最初的设计。

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

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview)：长运行、有状态 Agent 编排的官方能力边界。
- [OWASP GenAI：Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)：直接与间接提示注入风险及缓解方向。
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)：AI 系统治理、测量和风险管理框架。
- [OpenTelemetry Signals](https://opentelemetry.io/docs/concepts/signals/)：Trace、Metric、Log 的职责与关联模型。
