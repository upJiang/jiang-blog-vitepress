---
title: Tree of Thoughts 怎样搜索多条候选路径
description: 从候选生成、评分、剪枝和回溯理解树搜索，并给出预算耗尽时的终止方式。
category: ai-agent
part: 单 Agent 推理模式
stageKey: single-agent
chapter: 23
sequence: 23
slug: tree-of-thoughts-search
tags:
  - Tree of Thoughts
  - Search
  - Pruning
sourceKey: ai-tree-of-thoughts-search
dependsOn:
  - agent-planner-search-plan
updated: '2026-08-14'
lastUpdated: false
---
# Tree of Thoughts 怎样搜索多条候选路径

线性推理一旦早期选择错误，后面只能沿错误路径继续。Tree of Thoughts，简称 **ToT**，把中间候选当成搜索节点，通过生成、评分、剪枝和回溯探索多条路径。

## 思维树是受预算约束的状态空间

根节点是问题与初始状态，子节点是一种可继续的候选方案。节点保存公开状态、已用预算、父节点和评估结果。深度、每层分支数和总节点数都要有上限。

ToT 适合存在多个可比较方案、早期决策会影响后续结果的问题。单一事实查询没有必要建立搜索树。

## 搜索循环包含生成、评估和选择

运行时从当前节点生成若干候选，用确定性规则或独立评估器打分，保留最有希望的节点继续展开。广度优先探索更均匀，最佳优先先追高分路径，各自消耗不同预算。

```text
frontier -> expand candidates -> validate -> score -> prune -> frontier
```

## 评分必须对应任务结果

代码修复可以用测试通过数和静态检查，研究计划可以用问题覆盖与来源质量，路径规划可以用约束满足和成本。只让同一个模型评价“哪个更好”，评分偏差可能与生成偏差相同。

硬约束先过滤，软指标再排序。越权、循环依赖和超预算节点直接淘汰，不能靠高语言分数保留。

## 剪枝过早与分支爆炸是两端风险

保留太多节点会让调用数快速增长；只留一个节点又退化成线性推理。可以设置每层宽度、重复状态去重、最低改进和全局 Token 预算。

所有剩余节点都不满足硬约束、达到深度或预算上限、找到已验证解，都是明确停止条件。没有通过验证的最高分候选只能作为有限结果。

## ToT 与 Planner 的关系

Planner 通常先生成一份受限计划再执行；ToT 在多个候选计划或中间状态之间搜索。可以用 ToT 选择计划，但执行工具仍由普通运行时完成。

如果候选不能被外部判据比较，树搜索只会把一次不确定生成扩大成多次不确定生成。
