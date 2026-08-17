---
title: Celery Worker 怎样处理 ACK、Lease 与重复投递
description: 说明队列至少一次投递下，任务领取、续租、确认和幂等如何配合。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 55
sequence: 55
slug: celery-worker-ack-lease
tags:
  - Celery
  - ACK
  - Lease
sourceKey: ai-celery-worker-ack-lease
dependsOn:
  - turn-idempotency-version-snapshot
updated: '2026-08-14'
lastUpdated: false
---
# Celery Worker 怎样处理 ACK、Lease 与重复投递

任务队列通常提供至少一次投递：消息可能因为 Worker 崩溃或 ACK 丢失而再次出现。可靠执行依靠 ACK、业务幂等和运行租约共同工作，不能假设每条消息只执行一次。

## ACK 决定队列何时认为消息完成

提前 ACK 能避免重复，却可能在进程崩溃时丢任务；任务完成后 ACK 能恢复未完成工作，却会产生重复投递。长 Agent 任务通常选择后者，并在业务层保证幂等。

重试策略区分临时依赖错误和永久输入错误，后者进入失败终态或死信。

## Lease 表示当前执行所有权

Worker 领取 Turn 后写入带过期时间的租约，并在执行期间续租。另一个 Worker 只有在租约过期且状态允许恢复时才能接管。

租约拥有者写状态时校验 owner token，失去租约的旧 Worker 即使恢复，也不能覆盖新执行。

## 重复任务先查业务状态

任务消息到达后读取 Turn：已终态直接 ACK，运行中且租约有效则不并发执行，租约丢失则从 Checkpoint 恢复。

队列任务 ID 不能替代业务幂等键，因为重试或重新派发可能生成新消息 ID。

## 崩溃路径需要具体推演

Worker 在工具调用完成后、写 Checkpoint 前崩溃，消息被重投。新 Worker 通过工具操作键查询副作用已完成，写回结果再继续，不能盲目再次调用。

若工具不支持幂等或状态查询，就要限制为可重试的只读操作，或设计补偿和人工处理。

## 监控所有权与积压

记录等待时间、执行时间、续租失败、重复投递、重试和死信。Redis 或队列故障时明确降级策略，不能默认多个 Worker 同时执行。

Celery 负责投递与 Worker 管理，Turn 状态机和业务幂等仍属于应用。
