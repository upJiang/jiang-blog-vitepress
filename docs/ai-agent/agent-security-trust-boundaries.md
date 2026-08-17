---
title: Agent 安全从信任边界开始
description: 区分系统策略、用户输入、记忆、检索内容和工具结果的信任等级。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 46
sequence: 46
slug: agent-security-trust-boundaries
tags:
  - Security
  - Trust Boundary
  - Prompt Injection
sourceKey: ai-agent-security-trust-boundaries
dependsOn:
  - context-pollution-injection
  - tool-calling-contracts
updated: '2026-08-14'
lastUpdated: false
---
# Agent 安全从信任边界开始

Agent 同时接触系统策略、用户输入、长期记忆、检索文档和工具结果。它们都会变成文本，却不具有相同信任等级。安全设计从区分来源开始，再限制每类内容能影响什么。

## 五类输入拥有不同权力

系统策略由受控发布，决定权限和工具边界；用户输入表达目标；记忆提供经过确认的历史；检索内容和工具结果提供外部事实。后四类都不能修改系统策略。

来源标签贯穿解析、存储、检索和上下文装配，不能在进入 Prompt 前丢失。

## 模型输出始终是候选

无论是文本、JSON、工具调用还是计划，都经过 Schema、业务规则和授权。模型不能提供自己的用户 ID、Scope、Release、策略版本或审批结论。

这个原则把提示注入限制在候选层，即使模型遵循恶意文字，执行器也会拒绝越权命令。

## 秘密与不可信内容分离

API 密钥保存在服务端凭证层，只在具体适配器需要时使用，不进入模型上下文和工具结果。日志、Trace 与错误消息做脱敏。

访问令牌不能因为文档要求“用于验证”就交给模型。外部内容没有资格请求秘密。

## 威胁沿完整链路建模

攻击可能从上传文件、网页重定向、记忆写入、MCP Server、缓存或事件界面进入。逐层检查输入准入、ACL、工具副作用、输出泄漏和审计。

只在系统 Prompt 写一句“忽略恶意指令”没有覆盖这些通道。

## 安全失败默认收窄能力

身份不明、策略服务不可用或 Scope 缺失时拒绝执行，不能回退到全局默认。观测组件故障可以降级记录，授权组件故障则应失败关闭。

测试目标是越界动作无法发生，而不是模型从不生成越界候选。
