---
title: Planner 怎样把目标变成受限 SearchPlan
description: 让计划只描述目标、分支、范围、预算和停止条件，执行仍由运行时负责。
category: ai-agent
part: 单 Agent 推理模式
stageKey: single-agent
chapter: 20
sequence: 20
slug: agent-planner-search-plan
tags:
  - Planning
  - SearchPlan
  - Agent
sourceKey: ai-agent-planner-search-plan
dependsOn:
  - agent-router-mode-selection
updated: '2026-08-14'
lastUpdated: false
---
# Planner 怎样把目标变成受限 SearchPlan

复杂问题往往包含多个事实目标。Planner 的职责是把目标拆成可检查的搜索计划，不是直接检索，更不是获得任意工具执行权。计划越自由，运行时越需要明确边界。

## SearchPlan 描述目标、分支和限制

每个分支至少包含问题、查询词、依赖、允许范围和停止条件。计划还要给出最大分支数、每分支结果数与总 Deadline。用户指定的实体、时间和否定条件属于硬约束，不能在改写时丢失。

```json
{
  "goal": "比较两版访问规则",
  "branches": [
    {"id": "old", "query": "旧版远程访问规则", "depends_on": []},
    {"id": "new", "query": "新版远程访问规则", "depends_on": []}
  ],
  "max_rounds": 2
}
```

## 计划先经过确定性校验

程序检查分支 ID 唯一、依赖存在且无环、数量不超限、查询非空、Scope 没有扩张。Planner 不能填写用户身份、知识 Release 和策略版本，这些从 Turn 快照继承。

校验失败可以有限重试一次，让模型根据具体问题修正。仍不合法就进入失败终态，不把半份计划交给执行器。

## 执行器按照依赖推进

无依赖分支可以并行；后续分支只能读取已完成结果的结构化摘要。每个分支返回证据包、覆盖维度和错误，不直接拼最终答案。

计划是当时的假设。检索发现某个实体不存在时，可以追加受限补充查询，但必须计入分支和轮数预算，并保存计划变更。

## 覆盖判断决定补搜还是停止

系统把用户问题拆成可验证维度，例如生效时间、适用人群和申请步骤。证据包标记每个维度已覆盖、冲突或缺失。补搜只针对缺口，不重复已经足够的分支。

达到 Deadline、分支上限或连续补搜没有新增证据时停止。停止后可以返回带缺口的有限答案，关键结论无证据则拒答。

## 什么时候不用 Planner

单一查询、固定步骤或能用代码枚举的分支不需要模型规划。Planner 增加一次模型调用、计划校验和状态恢复成本，只在任务结构确实依赖输入时使用。

计划质量看执行后是否覆盖目标且没有越界，不看子任务写得是否漂亮。
