---
title: "13｜持久化回合、幂等与并发准入"
description: "先持久化再执行，用唯一键、租约和所有权锁保证一次回合只被一个执行者推进。"
category: agent-practice
tags: ["Idempotency", "Concurrency"]
updated: 2026-08-04
order: 130
depth: core
series: "生产级知识 Agent 实战"
---
# 13｜持久化回合、幂等与并发准入

前端点一次发送，网络却可能重试三次；消息队列可能重复投递；Worker 进程可能在模型返回后、数据库提交前崩溃。Agent 入口必须把“用户意图已经创建”与“执行正在进行”分开。最稳的顺序是：校验权限和版本，事务创建 Turn，提交，再派发执行；所有重试使用同一幂等键。

## 幂等键的范围

幂等键不能只在客户端生成 UUID 后全局唯一。它的语义通常是 `(space_id, user_id, idempotency_key)`，防止不同用户误共享，也让同一用户可以在不同知识空间复用字符串。

```sql
CREATE UNIQUE INDEX uq_turn_request
ON agent_turns(space_id, user_id, idempotency_key)
WHERE idempotency_key <> '';
```

创建接口遇到冲突时返回原 Turn 的 ID、状态和事件游标，而不是 409 让客户端自行猜测。若原请求的 payload 与重试 payload 不一致，应返回 `idempotency_key_reused`，避免同一个 key 静默改变问题。

## 创建事务的顺序

```python
async def create_turn(request: CreateTurnRequest, auth: AuthContext) -> Turn:
    async with session.begin():
        access = await policy.snapshot(auth, request.space_id)
        release = await release_repo.active(request.space_id)
        policy_version = await policy_repo.select(request.space_id, auth, request.idempotency_key)
        existing = await turn_repo.by_idempotency(request.space_id, auth.user_id, request.idempotency_key)
        if existing:
            return assert_same_payload(existing, request)
        turn = await turn_repo.insert(
            request=request,
            access=access,
            release_id=release.id,
            policy_version_id=policy_version.id,
        )
    await outbox.publish("agent.turn.created", {"turn_id": turn.id})
    return turn
```

事务提交前不能把消息交给 Worker，因为 Worker 可能先读不到 Turn；提交后直接 publish 又存在消息丢失窗口。可靠方案是同事务写 outbox，relay 投递并按消息 ID 幂等；最小实现至少有 pending 扫描器和投递状态。

## 执行所有权和租约

数据库状态 `running` 不能阻止第二个 Worker，因为进程可能崩溃。执行层使用带 TTL 的 owner lock：获得锁的 Worker 定期续租，失联后锁过期，reaper 才允许新 Worker 接管。

```lua
-- Redis Lua：只有 owner 仍匹配时才续租
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return 0
end
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return 1
```

租约不是绝对互斥证明。模型请求或网络分区可能超过 TTL，旧 Worker 续租失败后仍在运行。因此每个副作用写入还要带 owner/attempt token，数据库条件更新只接受当前 owner；纯读节点可以安全重复，写节点必须二次确认。

## 全局和用户准入

Agent 的并发控制需要两个维度：全局正在执行数量和单用户正在执行数量。Redis sorted set 以过期时间为 score，Lua 脚本在一次原子操作中清理过期、检查已有 turn、检查两个上限并写入 lease。不能先 `ZCARD` 再 `ZADD`，否则并发请求会突破上限。

```python
@dataclass(frozen=True)
class AdmissionDecision:
    allowed: bool
    reason: Literal["", "global_limit", "user_limit"] = ""
```

lease 续期失败时要区分 Redis 暂时不可用与真正失去所有权。高风险方案宁可停止新执行，不能让多个 Worker 同时推进同一 Turn。

## 终态只写一次

完成、失败、取消和过期都是 terminal event。使用数据库 advisory lock 或唯一部分索引，保证“重复 finish”只产生一个终态事件；状态更新也必须满足当前状态仍可转换。

```sql
UPDATE agent_turns
SET status = :next, completed_at = CASE WHEN :next = 'completed' THEN now() END
WHERE id = :turn_id
  AND status IN ('pending', 'running', 'cancel_requested')
RETURNING id;
```

如果返回 0，读取既有终态并让调用者幂等返回；不要覆盖已经 completed 的答案，也不要把 cancel_requested 强行改为 failed。

## Deadline 与 reaper

请求级 deadline 写入 Turn。Worker 和每个外部调用使用同一个绝对时间；reaper 定期领取超过 deadline 或心跳 stale 的非终态 Turn。reaper 不能直接删除运行任务，而应先获得 owner lock，写 expired 事件，再释放准入。

```python
async def remaining_seconds(deadline: datetime) -> float:
    return max(0.0, (deadline - datetime.now(UTC)).total_seconds())
```

客户端 HTTP 超时只影响连接，不影响后台 Turn；用户主动取消则写 `cancel_requested`，由 Worker 在安全点响应。

## 事件序列

每个 Turn 维护 `next_event_sequence`，数据库原子递增后写 `turn.created`、`stage.completed`、`answer.delta` 和 terminal event。事件 payload 只包含客户端需要和审计允许的字段，完整证据正文不应在普通事件中无限重复。

```python
async def append_event(turn_id: str, event_type: str, payload: dict) -> int:
    sequence = await repo.allocate_sequence(turn_id)
    await repo.insert_event(turn_id, sequence, event_type, payload)
    return sequence
```

序列是重放游标，不等于时间戳；客户端应按 sequence 去重。事件缺失或序列不连续时，客户端重新拉取快照或数据库回放，而不是自行拼接答案。

## 测试

```python
async def test_duplicate_create_returns_same_turn():
    first, second = await gather(create("k"), create("k"))
    assert first.id == second.id

async def test_only_owner_can_renew(lock):
    assert await lock.renew("owner-a") is True
    assert await lock.renew("owner-b") is False

async def test_reaper_does_not_expire_completed_turn(repo):
    await repo.finish(turn_id, "completed")
    await repo.reap_expired(now=future())
    assert await repo.status(turn_id) == "completed"
```

故障注入要覆盖数据库提交后进程退出、outbox relay 重复投递、租约过期、Redis 不可用、Worker 双启动、取消与完成竞态。正确性不能靠“队列通常只投递一次”的假设。

## 边界演练

幂等键的唯一性、租约过期和客户端重试要通过并发测试验证；恢复时根据业务状态和执行记录判断是否可以继续，而不是重新发送未知副作用。

每次演练都保存请求 ID、版本、状态变化、错误分类和恢复结果，确认监控信号与用户可见状态一致。

## 参考资料

- [PostgreSQL INSERT ON CONFLICT](https://www.postgresql.org/docs/current/sql-insert.html)：数据库级幂等插入。
- [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)：锁、租约与失效语义。
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)：事务状态与消息投递的一致性。
- [Celery tasks](https://docs.celeryq.dev/en/stable/userguide/tasks.html)：任务重试、确认和幂等实践。

