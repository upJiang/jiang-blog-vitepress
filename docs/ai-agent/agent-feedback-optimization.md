---
title: 用户反馈怎样进入可控优化流程
description: 把采纳、拒绝、原因和纠正转成评测数据，再经过 Challenger、Canary 和回滚。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 51
sequence: 51
slug: agent-feedback-optimization
tags:
  - Feedback
  - Optimization
  - Canary
sourceKey: ai-agent-feedback-optimization
dependsOn:
  - agent-evaluation-regression
  - agent-policy-governance
updated: '2026-08-14'
lastUpdated: false
---
# 用户反馈怎样进入可控优化流程

点赞、点踩和文字意见是信号，不是可直接执行的训练命令。反馈可能来自误解、界面问题或恶意输入，需要与当时的答案、证据和策略版本一起分析。

## 反馈绑定一次具体回答

记录 Turn、答案版本、Claim、Evidence、用户范围和反馈类型。用户可以指出缺失、过时、引用错误或表达问题，避免只有一个无法解释的总评分。

反馈正文按不可信输入处理，不能直接进入系统 Prompt。

## 先判断问题发生在哪一层

找不到资料属于检索，引用不支持属于验证，等待过久属于 Runtime，读不懂可能是结构和表达。不同问题进入不同修复队列。

同一错误多次出现也先查共同根因，不针对某句问法加关键词。

## 把确认问题转成评测样例

脱敏后保存问题、固定 Release、期望 Evidence 和终态，由 Challenger 在候选策略上复现。无法复现或来源已变化的反馈保留记录，不制造虚假标签。

人工纠正必须说明证据，不能只给一个期望句子让模型背诵。

## 优化经过候选、Canary 和回滚

修改可能落在别名、Chunk、检索参数、Prompt 或验证规则。每项形成独立候选，先过全量 Eval，再小范围灰度。

观察相关问题是否改善，同时检查其他任务、安全、成本和延迟。失败时切回旧策略。

## 反馈闭环对用户可解释

采纳、拒绝和待确认有明确状态，处理结果不泄露内部数据。删除反馈时同步处理关联文本和派生训练集引用。

目标是把真实问题沉淀成可重复验证的能力，而不是追逐反馈数量。
