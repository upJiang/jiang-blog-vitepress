---
title: Handoff 怎样移交任务、上下文和责任
description: 设计移交包、工作区和回收控制，让接收方知道目标、权限、进度与返回条件。
category: ai-agent
part: 多 Agent 编排
stageKey: multi-agent
chapter: 28
sequence: 28
slug: multi-agent-handoff-workspace
tags:
  - Handoff
  - Workspace
  - Context
sourceKey: ai-multi-agent-handoff-workspace
dependsOn:
  - multi-agent-orchestration
updated: '2026-08-14'
lastUpdated: false
---
# Handoff 怎样移交任务、上下文和责任

Handoff 发生在一个 Agent 把未完成任务交给另一个 Agent 时。有效移交不是转发整段聊天，而是一份带目标、证据、权限和返回条件的任务包。

## 移交包先说明为什么交接

包内包含原始目标、当前子任务、已完成工作、未决问题、输入引用、允许工具、剩余预算和期望输出。接收方应能只看这份包就知道自己负责什么。

原始用户消息继续以只读引用保存，防止摘要改写关键限制。敏感材料只有在接收方具备同等 Scope 时才加入。

## 工作区保存产物，不保存隐式心智

共享工作区适合 Evidence、代码差异、测试结果和结构化计划。角色的长篇内部思路不应作为下一个角色必须相信的事实。

每个产物带作者角色、版本、状态和来源。接收方可以质疑结果，不能静默覆盖已经确认的证据。

## 责任随移交状态变化

编排器先创建 `pending_handoff`，接收方确认后才成为当前责任方。拒绝、超时或接收方不存在时，控制权回到原角色或父编排器。

Handoff 不等于父任务放弃控制。全局 Deadline、ACL 和取消状态始终由父运行时拥有。

## 一次移交轨迹

研究角色发现两份规则冲突，生成移交包：冲突 Claim、两条 Evidence、固定 Release、要求审查生效时间。审查角色只获得只读证据工具，返回冲突原因和裁决状态。

若接收方尝试扩大 Release 或修改用户范围，运行时拒绝该候选并记录策略事件。

## 移交失败要能恢复

接收方超时后，任务包保持未完成，可由另一实例领取；重复领取使用同一幂等键。接收方完成但网络断开时，编排器先查产物状态，不盲目重做。

移交的目标是缩小上下文和明确责任。若每次都附带全部历史、全部工具和无限返回条件，它只是在多个 Agent 之间复制混乱。
