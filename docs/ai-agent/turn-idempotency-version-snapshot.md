---
title: Turn 怎样保证幂等并固定版本快照
description: 用幂等键处理重复请求，并在开始时固定知识 Release、Policy 和权限范围。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 54
sequence: 54
slug: turn-idempotency-version-snapshot
tags:
  - Turn
  - Idempotency
  - Snapshot
sourceKey: ai-turn-idempotency-version-snapshot
dependsOn:
  - agent-request-lifecycle-runtime
updated: '2026-08-14'
lastUpdated: false
---
# Turn 怎样保证幂等并固定版本快照

用户重复点击、网关重试和客户端超时都可能发送同一请求。没有幂等控制，系统会创建多个 Agent 执行并重复消耗资源；版本未固定时，同一次执行还可能前后使用不同知识。

## 幂等键标识同一业务意图

客户端为一次提交生成幂等键，服务端在用户或租户范围内建立唯一约束。相同键和相同请求返回已有 Turn；相同键但请求摘要不同则拒绝冲突。

Turn ID 标识服务器资源，幂等键标识客户端重试语义，两者用途不同。

## 创建事务同时保存快照

在一个事务中读取可用 Knowledge Release、Policy Version 和 Scope 摘要，创建 Turn 与初始事件。事务成功后再入队，或使用 Outbox 防止数据库成功而队列丢失。

模型不能提供这些版本字段，它们来自可信服务。

## Worker 只执行快照内容

任务开始后新 Release 发布，新 Turn 使用新版本，旧 Turn 继续原版本。策略被紧急撤回时可以取消受影响 Turn，但不能静默换版本继续。

缓存键、检索、引用和 Trace 都携带同一快照 ID。

## 重复投递不重复副作用

Worker 领取前检查 Turn 终态和节点幂等记录。模型调用可能允许重新执行，但发送消息、写外部系统等副作用使用稳定操作键并查询最终状态。

仅在内存中记录“已经执行”无法跨进程崩溃恢复。

## 用并发测试验证唯一性

同时提交两个相同幂等键，期望数据库只有一个 Turn、一个初始事件和一份有效任务。再在执行中发布新 Release，确认所有 Evidence 仍来自旧快照。

幂等不是永远缓存响应，要定义键的作用域、保留时间和终态查询方式。
