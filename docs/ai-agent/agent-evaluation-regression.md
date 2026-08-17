---
title: Agent Eval 怎样覆盖检索、回答与运行时
description: 用固定用例同时检查范围、召回、引用、拒答、终态和恢复。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 50
sequence: 50
slug: agent-evaluation-regression
tags:
  - Agent Eval
  - Regression
  - Quality Gate
sourceKey: ai-agent-evaluation-regression
dependsOn:
  - validation-repair-refusal
  - rag-evaluation-recall-mrr-ndcg
updated: '2026-08-14'
lastUpdated: false
---
# Agent Eval 怎样覆盖检索、回答与运行时

Agent Eval 评估的是一条执行链，不只是最终文本。相同答案可能来自越权证据，不同措辞也可能都正确，因此需要分层记录输入、轨迹和终态。

## 评测样例固定上下文边界

每条样例保存用户问题、身份与 Scope、知识 Release、策略版本、期望终态和相关 Evidence。还要包括无答案、权限拒绝、注入、工具失败和取消。

测试数据不使用真实秘密，Release 固定后才能比较两次运行。

## 检索层与回答层分别评分

检索检查 Recall、排序、ACL 和版本；回答检查 Claim 支持、引用直接性、完整性和拒答；运行时检查步数、停止原因、事件与恢复。

只看最终答案会把“检索漏了但模型猜对”误判为成功。

## 确定性规则先于模型评分器

ID、状态、引用存在、权限和 Schema 用代码检查。只有表达质量、覆盖解释等难以规则化部分才使用人工或模型评分，并保存评分标准。

模型评分器不能裁决安全门禁，它也可能受候选答案影响。

## 回归比较具体能力

候选策略与基线在同一套样例上运行，分别比较安全失败、无答案误答、引用覆盖、检索指标、延迟和预算。任何关键安全回归都阻止发布，不由平均分抵消。

失败样例保存 Trace，定位是路由、检索、生成、验证还是 Runtime。

## Eval 本身需要版本和维护

样例、标注和评分器都版本化。生产反馈进入候选集，经过脱敏、去重和人工确认后才成为回归样例。

评测集不能只包含已知问法，也要加入语义等价表达，防止实现对标题或关键词特判。
