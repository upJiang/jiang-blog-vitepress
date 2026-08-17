---
title: Trace 怎样串起模型、检索、工具与验证
description: 设计跨节点 Trace 和指标，区分延迟、错误、质量与资源问题。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 60
sequence: 60
slug: agent-trace-observability
tags:
  - Trace
  - Observability
  - Metrics
sourceKey: ai-agent-trace-observability
dependsOn:
  - agent-production-architecture
updated: '2026-08-14'
lastUpdated: false
---
# Trace 怎样串起模型、检索、工具与验证

一个 Agent 请求跨越多次模型、检索和工具调用。没有统一 Trace，只能看到“接口很慢”或“答案不对”，无法知道时间和质量问题发生在哪个节点。

## Trace 从 Turn 创建开始

入口生成 Trace ID，Turn、任务和事件携带它。每个节点创建 Span，记录父子关系、开始结束时间、状态和稳定属性。异步队列通过上下文载体继续链路。

用户文本、Prompt、Evidence 原文和密钥默认不作为标签，避免高基数与隐私泄漏。

## 模型 Span 记录可比较元数据

记录供应商、模型 ID、策略版本、输入输出 Token、缓存计量、重试、停止原因和延迟。内容需要调试时使用受控采样与脱敏存储。

一次调用失败后切换模型，要形成两个 Span 和一个路由事件，不能覆盖首个错误。

## 检索和工具 Span 保留边界

检索记录 Release、通道、候选数、过滤后数量和 Rerank 状态；工具记录名称、调用 ID、参数摘要、授权结果和错误码。

不要把隐藏文档标题写入跨租户指标。详细证据通过权限受控的 Trace 详情读取。

## 指标分成运行、质量和资源

运行指标包括延迟、错误、队列积压和恢复；质量来自 Eval、引用覆盖和拒答；资源包括 Token、模型并发和存储。三类不能混成一个“成功率”。

线上没有标准答案时，不能把模型自评分当质量真相。

## 从症状回到证据链

答案缺引用时沿 Trace 查 Evidence 是否召回、是否入选上下文、生成是否绑定、验证是否遗漏。延迟上升则按 Span 定位队列、模型或 Rerank。

观测故障不应改变业务结果，但安全审计不可用时，高风险动作可以按策略停止。
