---
title: Deadline、取消、Checkpoint 与恢复怎样配合
description: 区分超时、主动取消、进程崩溃和重试，设计可恢复且不重复副作用的路径。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 56
sequence: 56
slug: deadline-cancel-checkpoint-recovery
tags:
  - Deadline
  - Cancellation
  - Checkpoint
sourceKey: ai-deadline-cancel-checkpoint-recovery
dependsOn:
  - celery-worker-ack-lease
updated: '2026-08-14'
lastUpdated: false
---
# Deadline、取消、Checkpoint 与恢复怎样配合

Deadline、取消和故障恢复经常被统称为“超时处理”，实际上它们解决不同问题：Deadline 限制最晚完成时间，取消表达用户意图，Checkpoint 保存可恢复状态。

## Deadline 使用绝对时间贯穿调用链

Turn 创建时保存绝对 Deadline。每个节点计算剩余时间，为模型、检索和工具设置更短超时，预留持久化与清理时间。

各层分别写固定 60 秒会导致内层超时晚于外层，也让重试越过总期限。

## 取消是持久化状态

用户调用取消接口后写 `cancel_requested` 与事件。Worker 在节点前、长调用间隙和写终态前检查，向可取消的下游传播信号。

取消到达时副作用可能已完成，因此终态和工具状态分别记录，不能承诺自动回滚。

## Checkpoint 保存恢复所需最小状态

保存当前节点、结构化状态、已确认 Evidence、工具操作键和版本快照。大文件与原始输出使用引用，避免 Checkpoint 膨胀。

Checkpoint 与事件序号绑定，恢复时先确认没有更新状态。

## 恢复重新取得所有权

新 Worker 在租约过期后领取 Turn，装载最近有效 Checkpoint，查询不确定副作用，再从安全节点继续。恢复过程仍检查 Deadline、取消和 Policy 是否被紧急禁用。

从头重跑最简单，却可能重复模型成本、外部写入和事件。

## 四种终态分别验证

正常完成、Deadline 过期、用户取消和进程崩溃恢复各有测试。重点检查取消后不能被迟到结果改成 completed，恢复后事件序号继续递增，副作用不重复。

Checkpoint 提供恢复材料，不提供正确性；节点必须本身可幂等或可补偿。
