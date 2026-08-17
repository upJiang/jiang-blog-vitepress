---
title: 多 Agent 编排先解决责任和状态归属
description: 从单循环拆出多个角色，明确输入输出、共享状态、预算和失败责任。
category: ai-agent
part: 多 Agent 编排
stageKey: multi-agent
chapter: 25
sequence: 25
slug: multi-agent-orchestration
tags:
  - Multi Agent
  - Orchestration
  - State
sourceKey: ai-multi-agent-orchestration
dependsOn:
  - agent-planner-search-plan
updated: '2026-08-14'
lastUpdated: false
---
# 多 Agent 编排先解决责任和状态归属

把一个 Agent 拆成多个角色，不会自动提高质量。多 Agent 编排先回答三个工程问题：为什么要拆、每个角色拥有哪部分状态、任一角色失败后由谁结束任务。

## 只有职责能独立验证时才拆分

适合拆分的任务通常具有不同输入、工具或质量标准，例如检索、证据审查和答案验证。只是给同一个模型换三个角色名，输入与判据仍然相同，只会增加调用次数。

拆分前先画单 Agent 控制流，找出可以并行、需要隔离权限或必须独立复核的节点。无法指出这些边界，就先保留单循环。

## 角色契约包含输入、输出和禁止事项

每个角色只接收完成任务所需的资料，输出结构化结果和状态。检索角色返回 Evidence，不写最终答案；验证角色读取 Claim 与 Evidence，不重新扩大检索范围。

契约还要写明工具白名单、Token 预算、Deadline 和允许的终态。自然语言角色描述不能替代这些运行时约束。

## 共享状态由编排器拥有

编排器持有原始目标、用户范围、版本快照和总预算。子任务只得到不可变快照或窄视图，不能各自修改全局 ACL。多个结果汇合时，由 Reducer 按稳定 ID 去重并记录冲突。

```text
Orchestrator state
  |-> researcher A -> evidence A
  |-> researcher B -> evidence B
  `-> verifier     -> issues
          merge -> final decision
```

## 失败要区分局部和全局

一个补充检索超时，可以保留其他证据并标记覆盖缺口；负责权限校验的角色失败，则整个任务应停止。父任务取消后，所有子任务都要收到取消信号，迟到结果不能覆盖终态。

重试发生在拥有幂等语义的节点。不要重新启动整个编排，否则已经完成的工具副作用可能重复。

## 编排质量看合并结果

评测除了最终答案，还要检查重复工作、冲突是否保留、预算是否汇总、子任务失败是否传播。多 Agent 只有在覆盖或隔离收益大于通信与合并成本时才值得使用。

DAG、Swarm 和 Handoff 是三种不同协作形态，选择依据是依赖是否稳定、控制权是否集中以及上下文如何移交。
