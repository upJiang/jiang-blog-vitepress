---
title: "14｜Checkpoint、取消、超时与故障恢复"
description: "区分业务状态、图检查点和事件日志，实现不重放已完成副作用的恢复路径。"
category: agent-practice
tags: ["Checkpoint", "Recovery"]
updated: 2026-08-04
order: 140
depth: core
series: "生产级知识 Agent 实战"
---
# 14｜Checkpoint、取消、超时与故障恢复

长运行 Agent 不能把一次调用当作原子函数。它可能在预处理、并行检索、重排、模型流式输出或最终事务中断。恢复设计的关键是分清：哪部分状态已经提交、哪个节点可以重放、哪些副作用已执行、客户端要看到怎样的终态。Checkpoint 只保存图状态，不会自动替你实现幂等或补偿。

## 两种恢复来源

事件日志适合对外重放阶段和 delta；checkpoint 适合从某个节点继续计算；业务 Turn 表是用户可见的当前状态。恢复器先查 Turn terminal status，再决定：

```python
async def resume(turn_id: str) -> ResumeDecision:
    turn = await repo.execution_context(turn_id)
    if turn.status in TERMINAL:
        return ResumeDecision(kind="return_terminal", answer=turn.answer)
    checkpoint = await checkpoint_store.latest(turn_id)
    if checkpoint and checkpoint.release_id == turn.release_id:
        return ResumeDecision(kind="resume_graph", checkpoint=checkpoint)
    return ResumeDecision(kind="restart_from_safe_boundary")
```

不能因为 checkpoint 存在就恢复：策略/release/ACL 不匹配时，旧状态可能把不可见证据带进新执行。恢复决定本身写事件，便于解释为何继续或重新研究。

## 节点边界决定可重放性

将图分成纯计算节点、可重试外部读节点和有副作用节点：

| 节点 | 可重放 | 要求 |
| --- | --- | --- |
| normalize/query plan | 是 | 输入 hash 相同则结果可比较 |
| database retrieval | 通常是 | release/ACL 固定 |
| model generation | 结果可不同 | 记录 model/policy，必要时缓存草稿 |
| write memory | 否 | idempotency key/唯一约束 |
| external mutation | 否 | 远端幂等和状态查询 |
| finalization | 只一次 | terminal lock + transaction |

副作用不要藏在一个“生成并保存”节点里。拆成 prepare、commit、observe，使恢复器能判断是否已经 commit。

## Checkpoint schema

```python
class Checkpoint(BaseModel):
    thread_id: str
    checkpoint_id: str
    graph_node: str
    state: dict[str, object]
    release_id: str
    policy_version_id: str
    created_at: datetime
    parent_id: str | None = None
```

实际由 LangGraph checkpointer 序列化 TypedDict 状态。不要把数据库 Session、HTTP client、模型对象或原始文件放进去；它们无法可靠序列化，也会拖大存储。状态中的 evidence 只保存 ID/摘要，恢复时从固定 release 重新读取并验证。

## 中断与恢复示例

```python
compiled = graph.compile(checkpointer=checkpointer)
config = {"configurable": {"thread_id": turn_id}}

await compiled.ainvoke(initial_state, config=config, interrupt_after=["research"])

# Worker 重新领取后
snapshot = await compiled.aget_state(config)
assert snapshot.values["turn_id"] == turn_id
await compiled.ainvoke(None, config=config)
```

恢复测试要断在每一个关键节点后，而不只断在开头。检查“已完成检索节点没有重复计费/事件”“并行分支合并不重复”“repair 轮数不重置”。

## 取消是协作式的

API 写 cancel request，Worker 在节点边界和外部调用前后检查。不能依赖强制杀进程：模型 SDK、数据库事务或工具远端可能无法安全中断。

```python
async def check_cancel(turn_id: str, deadline: float) -> None:
    if await runtime.cancel_requested(turn_id):
        raise CancelledError
    if time.monotonic() >= deadline:
        raise DeadlineExceeded
```

取消发生在模型流式输出中时，关闭上游 response、停止发布 delta、写 cancelled 终态；已经发给客户端的文本无法收回，UI 需要显示“已取消，内容不完整”。

## Timeout 与有限补偿

超时后先停止新工作，再处理已在途的工具/模型调用。补偿任务不能自动重放未知状态的 write tool；应该查询 mutation status。对可重试 read，使用剩余 deadline 和指数退避，最大尝试次数由 policy 决定。

```python
def next_delay(attempt: int, remaining: float) -> float:
    raw = min(2 ** attempt * 0.2, 3.0)
    return max(0.0, min(raw + random.random() * 0.1, remaining - 0.05))
```

“重试直到成功”不是恢复策略，它会把超时转成成本爆炸和重复副作用。

## Stalled reaper

执行事件记录 heartbeat、当前 stage 和 owner token。reaper 只认领超过 stale threshold 的非终态 Turn，并先比较租约；旧 Worker 如果仍持有锁，reaper 不能抢占。锁过期后，恢复器从最新 checkpoint 或安全边界开始。

```python
async def claim_stalled(limit: int) -> list[str]:
    rows = await repo.find_stale(limit=limit)
    claimed = []
    for row in rows:
        if await lock.acquire(row.turn_id, owner="reaper"):
            claimed.append(row.turn_id)
    return claimed
```

reaper 自身也可能重复运行，所以 claim 操作必须幂等。监控 stale 数量、恢复成功率和重复 stage 事件，不能只看队列深度。

## 数据一致性优先级

恢复过程中可以缺失中间 trace，但不能让用户看到 completed 而数据库没有 answer；不能有 terminal event 却保持 running；不能把新 release 证据写进旧 Turn。最终化事务是唯一可信边界：写答案、claims、references、validation summary、status 和 terminal event。

## 故障演练矩阵

```text
断点                         预期
preprocess 完成后崩溃         从 checkpoint 进入 plan
研究分支写入后崩溃           merge 去重，不重复最终证据
模型生成后提交前崩溃         草稿可重建，不能重复外部写操作
finalize 中途连接断开         事务回滚，下一 Worker 可安全重试
SSE 客户端断开                 Turn 继续，客户端可按序列重放
release 被 retire              既有 Turn 仍可引用，禁止切到新 release
```

演练应真实杀掉测试 Worker、断开 Redis/数据库连接，而不是只 mock 一个异常。每次演练输出事件序列、最终状态和重复副作用计数。

## 边界演练

恢复测试要覆盖进程崩溃、数据库短暂不可用、取消与超时交错，以及事件已经发送但终态尚未写入的情况；每种结果都要有可观测状态和人工处理入口。

每次演练都保存请求 ID、版本、状态变化、错误分类和恢复结果，确认监控信号与用户可见状态一致。

## 故障演练补充

恢复测试不能只杀掉 Worker 后看任务是否“继续跑”。要分别模拟：节点执行前崩溃、外部副作用已成功但结果未写入、checkpoint 写入后事件发送失败、用户主动取消与 deadline 同时到达。每种情况都要定义唯一终态、补偿动作和客户端可见事件。副作用节点使用幂等键查询执行记录，无法确认结果时进入人工复核或安全重试，不能凭空再发一次。

## 参考资料

- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)：checkpoint、thread 和恢复。
- [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution)：副作用、幂等和恢复注意事项。
- [Python asyncio cancellation](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)：协作式取消语义。
- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)：提交、回滚和一致性边界。
