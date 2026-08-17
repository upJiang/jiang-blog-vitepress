---
title: Token 预算与模型路由怎样共同控制成本
description: 按任务阶段分配输入输出预算，再根据能力、时限和风险选择模型与降级路径。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 61
sequence: 61
slug: agent-token-budget-model-routing
tags:
  - Token Budget
  - Model Routing
  - Cost
sourceKey: ai-agent-token-budget-model-routing
dependsOn:
  - agent-router-mode-selection
  - agent-trace-observability
updated: '2026-08-14'
lastUpdated: false
---
# Token 预算与模型路由怎样共同控制成本

控制 Agent 成本不能只选一个便宜模型。上下文、并行分支、修复轮次和输出长度都会消耗 Token，模型路由需要在任务阶段、能力和总预算内做决定。

## 预算从 Turn 总量向节点分配

总预算包含输入、输出和预留恢复空间。Planner、检索摘要、最终生成和修复各有上限，子任务从父预算领取额度，不能各自使用完整总量。

预算是硬约束，接近上限时停止扩展或返回有限结果。

## 路由先检查能力再比较成本

节点声明需要结构化输出、工具调用、视觉或长上下文等能力，候选模型必须满足。再按延迟、价格类别、可靠性与数据边界选择。

价格和模型列表会变化，使用版本化配置与供应商实际 usage，不在业务代码硬编码教程数字。

## 不同阶段可以使用不同模型

轻量模型处理分类和简单抽取，复杂规划或最终综合使用更强模型。验证失败时可以升级一次，但升级原因和额外预算要记录。

切换模型后仍使用相同的结构化契约与安全校验，不能因为接口差异退回自由文本命令。

## 并发容量也属于预算

除了 Token，还要限制模型并发和请求速率。运行时取得资源 Lease，饱和时排队、降级或在 Deadline 前失败，不能无限并发压垮依赖。

租约释放失败不能掩盖已得到的模型结果，但要记录并依靠过期机制回收。

## 用 Trace 和 Eval 验证路由

按任务类型比较质量门禁、Token、延迟和升级率。成本下降但拒答错误增加不是成功；质量相同却分支数翻倍也需要定位。

Prompt Cache、上下文裁剪和结果复用是独立优化，先保证边界正确，再观察真实计量。
