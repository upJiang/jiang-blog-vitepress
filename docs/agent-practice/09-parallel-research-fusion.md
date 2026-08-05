---
title: "09｜并行研究、融合与补充检索"
description: "设计 fan-out/fan-in、证据去重、覆盖率计算和有上限的研究回路。"
category: agent-practice
tags: ["Parallel", "Evidence Fusion"]
updated: 2026-08-04
order: 90
depth: core
series: "生产级知识 Agent 实战"
---
# 09｜并行研究、融合与补充检索

复杂问题不是“让模型多想几次”。它需要把问题拆成可验证目标，让不同检索通道并行工作，再以覆盖率和冲突情况决定是否补充研究。没有上限的 Agent loop 会不断重写 query、重复调用模型、消耗成本并让结果不可复现；没有融合记录的并行检索则只能看到最后几个候选。

## 研究计划的数据结构

```python
class ResearchPlan(BaseModel):
    objective: str
    branches: tuple[SearchBranch, ...]
    evidence_budget: int = Field(ge=1, le=100)
    max_rounds: int = Field(ge=0, le=2)
    minimum_coverage: float = Field(ge=0, le=1)

class BranchResult(BaseModel):
    branch_id: str
    query: str
    candidates: list[Candidate]
    elapsed_ms: int
    error_code: str = ""
```

计划生成后先由确定性校验器检查 branch id 唯一、总 limit 不超预算、scope 没有扩大、query 非空。模型可以提出“比较缓存和回滚”，但不能决定查哪个租户或调用未授权工具。

## Fan-out 的并发边界

使用 `asyncio.TaskGroup` 或框架的 Send fan-out 时，需要同时控制分支数、每支超时和共享资源并发。并行不是无限吞吐；模型、数据库连接池和 embedding 服务都可能成为瓶颈。

```python
async def run_branches(plan: ResearchPlan, deadline: float) -> list[BranchResult]:
    semaphore = asyncio.Semaphore(4)

    async def run(branch: SearchBranch) -> BranchResult:
        async with semaphore:
            remaining = max(0.1, deadline - time.monotonic())
            try:
                async with asyncio.timeout(min(branch.deadline_ms / 1000, remaining)):
                    return await execute_branch(branch)
            except TimeoutError:
                return BranchResult(branch_id=branch.id, query=branch.query,
                                    candidates=[], error_code="branch_timeout")

    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(run(branch)) for branch in plan.branches]
    return [task.result() for task in tasks]
```

一个分支失败不应取消所有独立分支，除非是安全或 release 校验失败。`TaskGroup` 的异常传播策略要经过封装；业务结果应把可恢复失败转换为 BranchResult，而不是让一个网络超时让整图无声失败。

## 融合三步走

1. **规范化候选**：补齐 source version、chunk、channel、rank、score、trust 和 locator。
2. **去重与多样性**：同 chunk 合并，同文档限额，保留多通道证据。
3. **预算裁剪**：按融合分和证据覆盖选择有限集合，记录被裁剪的候选数。

```python
def fuse_results(results: list[BranchResult], budget: int) -> list[Candidate]:
    groups: dict[str, list[Candidate]] = defaultdict(list)
    for result in results:
        for rank, candidate in enumerate(result.candidates, 1):
            candidate.fusion_score = candidate.fusion_score + 1 / (60 + rank)
            groups[candidate.chunk_id].append(candidate)
    merged = [merge_same_chunk(items) for items in groups.values()]
    diverse = diversify_by_document(sorted(merged, key=lambda c: -c.fusion_score))
    return diverse[:budget]
```

合并函数不能丢掉“哪条分支命中”。该字段用于诊断：如果只在 exact 命中，说明用户依赖标识；如果只在 dense 命中，可能需要补充术语别名。

## 覆盖率不是候选数量

`top_k=20` 不意味着回答覆盖了问题。先把问题转成 target units：实体、动作、条件、时间、关系或用户要求的比较维度。Claim planner 或结构化理解器给每个 unit 一个 ID，候选 evidence 通过词法、结构化字段和模型/规则标注其覆盖。

```python
class TargetUnit(BaseModel):
    id: str
    text: str
    required: bool = True

def coverage(targets: list[TargetUnit], evidence: list[Evidence]) -> float:
    if not targets:
        return 1.0
    covered = sum(
        any(unit.text.casefold() in item.content.casefold() for item in evidence)
        for unit in targets
    )
    return covered / len(targets)
```

这个示例使用简单包含关系，只适合可解释基线。生产实现要保留“规则命中”和“语义 judge”两种来源，避免把 judge 的不确定性伪装成硬事实。

## 补充研究的退出条件

补充研究只在同时满足以下条件时发生：覆盖率低于阈值、仍有未覆盖 target、round 未超过上限、deadline 和成本预算足够、生成的新 query 与已有 query 不重复。任何一个条件不满足，都应进入 claim planning，可能得到“不足证据”。

```python
def should_research(state: AgentState) -> bool:
    return (
        state["coverage"] < state["plan"]["minimum_coverage"]
        and state["research_round"] < state["plan"]["max_rounds"]
        and bool(state["missing_targets"])
        and state["remaining_deadline_ms"] > 800
        and state["model_calls"] < state["plan"]["model_call_budget"]
    )
```

新 query 必须引用 missing target 和允许通道，不能把原始问题无限扩展为全库搜索。每轮记录 `missing_before`、`queries_added`、`coverage_after`，后续 Eval 才能判断回路是否真正提升。

## 证据冲突

来自不同 release、来源类型和时间的证据可能冲突。融合器不应静默选最高分：记录冲突 Claim、来源时间、trust level 和策略。回答契约可选择明确说明冲突、优先指定 release、或拒答。权重是政策，不是向量分数的副作用。

```python
class Conflict(BaseModel):
    unit_id: str
    evidence_ids: tuple[str, ...]
    reason: Literal["value", "freshness", "scope", "source_type"]

def resolve_conflict(conflict: Conflict, policy: Policy) -> str:
    if policy.conflict_mode == "refuse":
        return "insufficient_evidence"
    return policy.preferred_source_type
```

## 部分失败和降级

一个优秀的并行研究不会把所有失败都变成 500：

- dense 分支超时但 sparse 有候选：继续并标记降级；
- 表格解析失败：回答只引用文本证据，不能声称表中关系；
- 某外部工具不可用：不切换到未经授权的替代源；
- 所有分支空：进入拒答 contract，并返回可操作的“需要提供哪些范围/文档”原因。

失败分支仍要进入事件和 trace，不能只打印日志。

## 反重复与预算

Query、候选和模型调用都要去重。为 query 计算规范化签名，分支重试携带 attempt；候选以 chunk ID 去重；模型调用以 `(stage, input_hash, policy_version)` 记录，允许判断是否真的重复。证据 budget 同时限制候选数量、prompt tokens 和引用数量，三者不能只控制一个。

## 测试

```python
async def test_one_branch_timeout_does_not_drop_other_results():
    results = await run_branches(plan_with("slow", "fast"), deadline=monotonic() + 2)
    assert any(item.branch_id == "fast" and item.candidates for item in results)

def test_research_stops_when_no_new_information():
    state = state_with(coverage=.7, missing_targets=[], research_round=0)
    assert should_research(state) is False

def test_fusion_is_diverse():
    result = fuse_results(many_chunks_from_one_doc(), budget=5)
    assert len({item.document_id for item in result}) > 1
```

对照实验要比较串行和并行的首 token、总延迟、模型调用数、候选重复率、coverage gain；并发吞吐变高但质量下降时，不能只看延迟指标。

## 参考资料

- [LangGraph Graph API：Send](https://docs.langchain.com/oss/python/langgraph/graph-api#send)：动态 fan-out 和并行状态更新。
- [Python Task Groups](https://docs.python.org/3/library/asyncio-task.html#task-groups)：结构化并发、异常和取消传播。
- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)：多排名列表融合方法。
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)：稀疏检索与查询重写的实现基础。

