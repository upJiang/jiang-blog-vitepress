---
title: Agent 策略怎样版本化、灰度与回滚
description: 将模型、提示、工具、预算和质量门禁保存为不可变策略版本。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 48
sequence: 48
slug: agent-policy-governance
tags:
  - Policy
  - Governance
  - Canary
sourceKey: ai-agent-policy-governance
dependsOn:
  - validation-repair-refusal
updated: '2026-08-14'
lastUpdated: false
---
# Agent 策略怎样版本化、灰度与回滚

Agent 行为由模型、Prompt、工具、预算、检索和验证规则共同决定。若这些配置各自在线修改，一次 Turn 可能使用互相不匹配的版本，问题也无法复现。

## Policy 是不可变配置快照

策略版本记录模型选择、Prompt 哈希、工具允许列表、预算、验证器和安全规则引用。发布后不原地修改，变更生成新版本。

密钥不放进策略正文，只保存凭证引用。知识内容使用独立 Release，Turn 同时固定 Policy 与 Release。

## 发布前先经过离线门禁

候选策略运行固定 Eval，检查检索、回答、引用、拒答、注入和运行时终态。门禁比较具体回归，不用一个总分掩盖安全失败。

候选未通过时保持草稿，不能因为模型输出偶尔更漂亮而跳过。

## Canary 限制新策略影响面

按稳定用户或请求哈希把少量流量分配给候选策略，记录策略版本和对照组。多租户系统先限制租户范围，不跨边界混合反馈。

观察错误、拒答、引用覆盖、延迟和资源，不只看用户点赞。

## 回滚切换指针，不改历史

出现门禁或运行异常时，把新 Turn 的策略指针切回已验证版本；已开始 Turn 继续使用自己的快照，或按明确安全规则取消。

历史 Trace 保留当时版本，便于复现。删除失败策略会破坏审计链。

## 治理规则不能由模型改写

模型可以提出优化建议，策略服务负责校验、审批和发布。用户反馈先进入评测数据，不直接拼进生产 Prompt。

策略治理的目标是每次行为变更有来源、有验证、有影响范围和回滚点。
