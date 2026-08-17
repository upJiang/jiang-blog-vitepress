---
title: Temporal 怎样执行可恢复的长流程
description: 区分 Workflow 与 Activity，解释事件历史、重试、Signal、Query 和版本演进。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 58
sequence: 58
slug: temporal-workflow-patterns
tags:
  - Temporal
  - Workflow
  - Activity
sourceKey: ai-temporal-workflow-patterns
dependsOn:
  - deadline-cancel-checkpoint-recovery
updated: '2026-08-14'
lastUpdated: false
---
# Temporal 怎样执行可恢复的长流程

Temporal 把长流程的状态变化记录为事件历史。Worker 可以重启，Workflow 通过重放历史恢复决策；外部 I/O 放在 Activity 中，由重试与超时策略管理。

## Workflow 与 Activity 职责不同

Workflow 代码负责编排、等待、分支和状态，不直接访问网络、数据库或随机数。Activity 执行模型调用、检索和工具等外部 I/O。

这条边界保证相同历史重放时得到相同决策。非确定性输入通过参数、事件或 Activity 结果进入。

## 事件历史提供恢复基础

Workflow 调度 Activity、收到结果、计时器触发和 Signal 到达都会写历史。Worker 崩溃后，新 Worker 重放历史恢复到未完成位置，不需要应用手写每个中间状态表。

历史会增长，超长流程可以通过 Continue-As-New 开启新历史，同时传递必要状态。

## 超时和重试按 Activity 配置

模型调用与文件处理的超时、重试条件不同。Activity 设置开始到关闭、心跳和最大尝试，业务参数错误不重试，临时网络错误退避。

Activity 仍需幂等，因为超时后服务端是否完成可能未知。

## Signal、Query 和取消处理外部交互

Signal 改变 Workflow 状态，例如审批结果或取消请求；Query 读取当前状态，不写历史决策；取消向在途 Activity 传播，但已经发生的副作用需要补偿。

审批等待不占 Worker 线程，状态保存在历史中。

## 版本演进必须保持可重放

直接修改正在运行 Workflow 的分支可能让旧历史无法重放。使用官方版本机制或 Worker Versioning，让旧实例完成旧逻辑，新实例使用新逻辑。

Temporal 解决可靠编排，不替代 Agent 的 ACL、Evidence 验证和模型边界。简单短任务使用普通队列可能更合适。
