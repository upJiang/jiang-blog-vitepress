---
title: SubAgent 怎样隔离上下文并返回可合并结果
description: 用窄任务契约限制资料、工具和输出，处理超时、冲突与父任务取消。
category: ai-agent
part: 多 Agent 编排
stageKey: multi-agent
chapter: 29
sequence: 29
slug: subagent-context-contracts
tags:
  - SubAgent
  - Context Isolation
  - Contract
sourceKey: ai-subagent-context-contracts
dependsOn:
  - multi-agent-handoff-workspace
updated: '2026-08-14'
lastUpdated: false
---
# SubAgent 怎样隔离上下文并返回可合并结果

SubAgent 是父任务临时创建的窄执行单元。它的价值在于隔离资料、工具和 Token 预算，让并行工作不会共同污染一个超长上下文。

## 任务契约从一个可验证问题开始

父任务给出单一目标、输入引用、允许范围、Deadline 和结果 Schema。诸如“研究一下这个主题”无法判断完成，应改成“从指定 Release 找出三条申请条件并绑定引用”。

子任务不继承父 Agent 的全部历史。只传完成目标所需的摘要与原始来源引用。

## 上下文和工具同时隔离

检索 SubAgent 只得到当前 Scope 的只读搜索工具，代码检查 SubAgent 只得到目标目录。凭证和高风险工具按最小权限发放，任务结束即失效。

隔离还包括预算。每个 SubAgent 有独立步数和 Token 上限，父任务维护全局总量，避免并行分支各自认为预算无限。

## 结果使用可合并结构

返回值包含任务 ID、状态、数据项、Evidence、错误和未覆盖部分。父任务按稳定 ID 去重，冲突条目并列保存。自然语言总结可以作为说明，不能是唯一产物。

```json
{"task_id":"branch-a","status":"partial","evidence_ids":["e1"],"gaps":["生效时间"]}
```

## 取消和超时沿父子关系传播

父任务取消后停止派发新子任务，并通知在途任务。子任务到达 Deadline 时返回超时状态，不能自己延长全局时间。迟到结果可供审计，但不再进入最终合并。

执行副作用的子任务需要幂等和补偿。上下文隔离不等于状态隔离，外部写操作仍可能影响同一系统。

## 何时使用 SubAgent

可并行、输入边界明确、结果可独立验证的工作适合 SubAgent。高度依赖连续上下文的推理，拆分后会反复解释背景，收益很小。

衡量结果看父任务能否可靠合并、错误是否被隔离、总预算是否下降，不看创建了多少角色。
