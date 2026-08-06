---
title: "13｜让重复请求只执行一次"
description: "从一次网络重试开始，加入幂等键、提交后派发、并发准入和执行所有权租约。"
category: agent-practice
tags: ["Idempotency", "Concurrency"]
updated: 2026-08-05
order: 130
depth: core
series: "知识 Agent 分步实践"
---
# 13｜让重复请求只执行一次

用户只点击一次发送，浏览器却因超时重试；任务已经进入队列，消息代理又重复投递。若每次都创建新回合，用户会收到两份答案，模型成本也被重复消耗。

本篇用幂等键识别同一次业务请求，再用准入名额和所有权租约控制并发。当前实现是数据库提交后直接派发 Celery，派发失败会把回合写成失败；没有把 Transactional Outbox 描述成现有能力。

## 先分清三个问题

**幂等**解决重复请求是否产生重复业务效果。**准入**限制系统和单个用户同时运行多少任务。**所有权租约**确保同一回合某一时刻只有一个 Worker 推进。

```mermaid
flowchart LR
  A[请求 + 幂等键] --> B[并发准入]
  B --> C[事务内创建回合]
  C --> D[提交数据库]
  D --> E[派发 Celery]
  E --> F[Worker 领取租约]
  F --> G[执行并续租]
```

## 第一步：定义幂等键的范围

幂等键不能全系统共用。它通常与用户、会话和操作类型组成唯一范围。同一范围再次提交相同键时，返回原回合；相同键却携带不同问题时，返回冲突，避免误复用。

```text
第一次：user=u1，conversation=c1，key=k9，question=如何申请权限
  -> 创建 turn-1

重试：同范围、同 key、同问题
  -> 返回 turn-1

冲突：同范围、同 key、不同问题
  -> idempotency_conflict
```

## 第二步：准入发生在创建重任务之前

系统先检查全局和用户并发名额，再创建回合。拿不到名额时返回明确的忙碌结果，不先创建大量 pending 回合占用数据库和队列。

准入名额有租期，Worker 运行中续租，进入终态后释放。进程崩溃时名额最终过期，停滞扫描还能进一步清理。

## 第三步：提交数据库后再派发队列

回合与初始事件先在数据库事务中提交，随后调用 Celery 派发。这样 Worker 不会抢先读取一个尚未提交的回合。

派发失败时，服务端把已创建回合更新为失败并写终态事件，客户端不会永远停在“排队中”。这里仍存在提交成功与派发之间的间隙；当前方案依靠明确失败与恢复扫描，不宣称具有 Outbox 的原子交付语义。

## 第四步：Worker 领取执行所有权

队列重复投递后，多个 Worker 可能同时拿到同一个 turn ID。开始执行前，Worker 通过带过期时间的 owner lease 竞争所有权；只有持有者能够推进状态和写运行结果。

执行期间同时续租所有权与准入名额。续租失败表示运行基础已经不可靠，Worker 停止继续调用昂贵工具，并进入可恢复或失败路径。

## 第五步：终态只写一次

完成、失败、取消和过期都属于终态。数据库条件更新和唯一约束保证只有第一个合法终态成功，晚到的重复任务读回现有结果。

这条规则比在 Worker 内检查一个布尔值可靠，因为并发进程可能同时读到旧值。

## 故意制造两类失败

| 故障 | 预期行为 |
| --- | --- |
| Celery 派发抛错 | 回合进入 failed，产生唯一终态事件 |
| 同一任务投递两次 | 一个 Worker 获得租约，另一个退出 |
| 客户端重复提交 | 返回同一回合，不重复派发 |
| 幂等键复用不同问题 | 返回冲突，不覆盖原问题 |
| Worker 停止续租 | 租约过期，交给恢复流程判断 |

这些测试可以使用假的消息客户端和并发数据库操作，不依赖在线模型。

## 当前实现的边界

当前没有 Transactional Outbox，因此数据库提交与队列派发不是一个分布式事务。若业务要求更强投递保证，可以在后续演进中引入 Outbox，但需要额外发布器、幂等消费和积压监控。

下一篇处理 Worker 已经执行一部分后中断，怎样结合 Deadline、取消和 Checkpoint 恢复。

## 参考资料

- [Celery：Tasks](https://docs.celeryq.dev/en/stable/userguide/tasks.html)
- [PostgreSQL：Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [AWS Builders Library：Making retries safe](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
