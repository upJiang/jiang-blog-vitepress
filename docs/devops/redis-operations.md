---
title: Redis 在 AI 系统中的缓存、Session、限流与任务角色
description: 比较缓存、会话、令牌桶、Broker 和调度状态的读写模式，解释 TTL、淘汰、持久化与故障边界。
category: devops
part: 第二部分：AI Backend 基础设施
chapter: 9
tags:
  - Redis
  - Cache
  - Rate Limit
prerequisites:
  - 理解键值操作
outcomes:
  - 为不同状态选择 Redis 数据结构
  - 避免缓存和队列争抢同一资源预算
practice:
  type: decision
  result: 完成一张 Redis 场景决策表
  verify:
    - 业务真相保留在持久存储
    - 每类键都有 TTL、所有者和失效策略
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# Redis 在 AI 系统中的缓存、Session、限流与任务角色

同一个用户连续点击发送，第一条请求还没完成，第二条却被当成新会话；限流计数也在重启后突然归零。Redis 很快，但“快”不等于适合保存所有状态。先判断数据能否丢、谁负责重建、何时过期，再选择数据结构。

## 缓存、Session 和队列不是同一种数据

| 用途 | 推荐状态 | 丢失后的处理 |
| --- | --- | --- |
| 缓存 | 可由数据库或模型服务重建的结果 | 回源或重新计算 |
| Session/Checkpoint 索引 | 短期对话指针、版本和过期时间 | 拒绝继续执行或从持久层恢复 |
| 限流 | 窗口计数、租户和规则版本 | 按保守策略限流，不能放开 |
| 队列协调 | 任务 ID、租约、幂等键 | 从持久任务表重投，不靠内存猜 |

如果 Redis 里存的是唯一的扣费事实，故障时就会失去对账依据。把持久事实放在 PostgreSQL 或事件日志，Redis 只保存加速和协调状态，恢复路径会清楚很多。

## 一个带租约的任务状态

```text
task:{id} -> {status: running, owner: worker-7, lease_until: 12:30:05, attempt: 2}
idempotency:{tenant}:{request_key} -> task-id
rate:{tenant}:{minute} -> counter (EXPIRE 120)
```

Worker 领取任务后写入 owner 和 lease_until，续租失败就不能继续产生副作用。幂等键把客户端重试映射到同一个任务，限流 key 使用短 TTL。字段设计要说明时钟来源、续租竞争和过期后的处理，不能只写“用 Redis 存状态”。

## 限流的原子性与误差

INCR 加 EXPIRE 分开执行会留下没有 TTL 的 key，多个命令也可能被并发插入。Lua 或事务可以让计数与过期保持原子，但脚本本身不能无限执行。固定窗口简单，滑动窗口更平滑，Token Bucket 更接近预算模型，选择要和业务的突发流量、成本风险匹配。

## 故障时先看什么

```bash
redis-cli --latency-history   # 仅作本地诊断示例
redis-cli INFO memory
redis-cli INFO clients
redis-cli TTL rate:tenant:minute
```

命令展示延迟、内存、连接和 TTL 这些证据维度。生产环境应使用受控的只读诊断入口，不能凭扫描结果推断敏感 key。看到命中率下降时，还要核对版本、序列化和失效广播，不能只调大内存。

## 把 Redis 放回请求链

网关可以用 Redis 做快速限流，Agent 可以用它做短期事件索引，Worker 可以用租约防止重复执行，但最终状态仍应能从数据库、对象存储或事件中重建。下一篇进入 PostgreSQL，解释哪些 AI 数据应该成为持久事实，以及 pgvector 的索引为什么不能代替权限。

## 过期不是业务完成

TTL 到期表示 Redis 不再保证这条短期状态存在，不表示任务已完成、用户已登出或限流窗口一定按业务定义结束。过期事件也不应成为唯一的业务触发器，因为通知可能丢失、实例可能重启，key 也可能被提前删除或覆盖。

对需要可靠推进的流程，数据库中的 expires_at 和状态转换才是事实，Redis TTL 用于加速清理和限制内存。把两者混用时，最常见的后果是任务已经过期但 Worker 仍在运行，或者缓存失效后用户被误判为没有权限。

## 缓存键需要表达版本，而不只是对象 ID

如果模型 Revision、知识 release 或权限策略变化，旧缓存即使 TTL 未到也可能不再正确。缓存 key 或值元数据应包含影响结果的版本，并在发布时选择精确失效或自然过期。只按 user_id 缓存一段回答，会让新策略命中旧结果。

缓存穿透、击穿和雪崩也不是三个孤立术语。它们分别意味着无效输入不断回源、热点失效时并发回源、许多 key 同时过期。解决方案要和可接受的陈旧度、回源成本和租户公平性匹配。
