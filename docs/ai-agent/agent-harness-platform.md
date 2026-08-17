---
title: 怎样把 Agent Harness 做成可治理的平台
description: 将协议适配、运行时、沙箱、策略、评测和可观测性做成可替换的平台层。
category: ai-agent
part: Agent Harness 与前沿开发
stageKey: harness
chapter: 66
sequence: 66
slug: agent-harness-platform
tags:
  - Agent Harness
  - Platform
  - Governance
sourceKey: ai-agent-harness-platform
dependsOn:
  - agent-harness-foundations
  - agent-policy-governance
updated: '2026-08-14'
lastUpdated: false
---
# 怎样把 Agent Harness 做成可治理的平台

当多个团队分别实现模型接入、工具权限、状态和评测，最先出现的不是创新，而是安全旁路与重复故障。平台化 Harness 提供共用控制面，同时允许任务逻辑保持独立。

## 平台接口围绕稳定职责设计

模型网关、Tool/MCP Registry、Context Service、Runtime、Policy、Eval 和 Observability 各有版本化契约。团队组合能力，不直接访问底层凭证与全局数据。

接口返回稳定错误和 Trace Context，供应商细节封装在适配器内。

## 能力注册带所有权和风险

工具登记输入 Schema、输出、负责人、Scope、数据分类、副作用、幂等和审批要求。发布新版本先经过契约测试与安全审查。

发现协议可以使用 MCP，是否向某个 Agent 暴露仍由平台策略决定。

## 策略与租户配置分层

平台基线规定不可绕过的安全、审计和资源上限；产品策略选择模型与工具；租户配置只能在允许范围内收窄或定制。

配置合并产生不可变 Policy Version，Turn 保存最终快照。

## 发布依靠 Eval、Canary 和回滚

模型、Prompt、工具或 Runtime 升级先运行契约和 Agent Eval，再对稳定流量子集灰度。关键安全回归立即阻断，旧版本保留快速回滚。

平台看板分开显示运行、质量、安全和成本，避免一个总分。

## 平台不吞掉业务责任

平台提供护栏和执行能力，业务团队仍定义正确目标、数据来源、终态和人工流程。无法用统一 Prompt 解决所有领域。

成熟度来自接口可替换、事实可追踪和失败可恢复，不来自集成的模型数量。
