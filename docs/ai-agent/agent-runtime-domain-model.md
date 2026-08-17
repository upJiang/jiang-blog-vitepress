---
title: Agent Runtime 的领域模型怎样拆分
description: 区分 Conversation、Turn、Message、Event、Task、Release 和 Policy 的状态与所有权。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 52
sequence: 52
slug: agent-runtime-domain-model
tags:
  - Runtime
  - Turn
  - Domain Model
sourceKey: ai-agent-runtime-domain-model
dependsOn:
  - python-agent-loop-from-scratch
updated: '2026-08-14'
lastUpdated: false
---
# Agent Runtime 的领域模型怎样拆分

单机 Demo 可以用一个字典保存全部状态。进入异步执行、多轮对话和恢复后，需要区分 Conversation、Turn、Message、Event 与 Task，否则一个“状态”字段会同时承担产品、执行和审计责任。

## Conversation 保存会话容器

Conversation 关联用户、租户、标题和当前焦点，不表示某次执行正在运行。它可以包含多个 Turn，也可以在没有任务时继续存在。

删除或归档会话要定义 Message、Turn 和长期记忆的处理关系。

## Turn 表示一次可终止的执行

Turn 从用户请求创建，固定幂等键、Release、Policy、Scope 和 Deadline，状态在 pending、running、waiting、completed、failed、cancelled 等终态间转换。

一个 Turn 只能由受控状态机改变，迟到 Worker 不能把 cancelled 改回 completed。

## Message 与 Event 服务不同读者

Message 是对话中可见的用户、助手或工具内容；Event 是执行事实，例如节点开始、检索完成和验证失败。流式文本可以由事件驱动形成最终 Message。

界面读取 Message 展示对话，重放与观测读取 Event，不从文本猜运行状态。

## Task 和 Checkpoint 负责执行恢复

Task 是队列工作单元，可能重复投递；Checkpoint 保存图状态和下一节点。它们都引用 Turn，但生命周期更短。

<<< ../../examples/ai-agent/runtime.py

## Release 与 Policy 固定事实和行为

Knowledge Release 决定可检索内容，Policy Version 决定模型、工具和验证规则。两者在 Turn 创建时固定，使任务可以复现。

领域模型拆开后，每个对象的所有者、并发规则和删除策略才有清晰位置。
