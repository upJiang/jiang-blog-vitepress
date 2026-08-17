---
title: Background Agent 怎样调度长时间任务
description: 为后台任务定义身份、触发器、幂等、预算、取消、过期和通知。
category: ai-agent
part: Agent Harness 与前沿开发
stageKey: harness
chapter: 65
sequence: 65
slug: background-agent-scheduling
tags:
  - Background Agent
  - Scheduling
  - Worker
sourceKey: ai-background-agent-scheduling
dependsOn:
  - agent-harness-foundations
  - celery-worker-ack-lease
updated: '2026-08-14'
lastUpdated: false
---
# Background Agent 怎样调度长时间任务

Background Agent 在用户离开页面后继续执行定时或长任务。它没有持续的人机对话兜底，因此身份、触发器、幂等、预算、过期和通知必须在开始前确定。

## 触发器只产生任务意图

定时器、Webhook 或事件创建带触发 ID 的请求，Runtime 再做身份与策略准入。触发器重复投递使用同一幂等键，不能产生多个相同任务。

计划任务保存时区和错过执行策略，避免服务重启后集中补跑所有过期任务。

## 后台身份使用最小服务权限

任务绑定创建者、租户和服务身份，权限在每次运行时重新确认。用户离职或授权撤回后，旧计划不能继续使用缓存凭证。

高风险动作仍进入审批，不能因为任务无人在线就自动放行。

## 长任务共享总预算和 Deadline

每次运行固定 Token、分支、工具调用、并发和截止时间。子任务从总预算领取，过期后停止派发并取消可中断工作。

任务等待外部事件时持久化状态并释放 Worker，而不是占用进程睡眠。

## 恢复和重复执行按操作键处理

队列重投或 Worker 崩溃后从 Checkpoint 恢复。每个副作用使用由计划、运行批次和步骤组成的操作键，先查询状态再重试。

迟到结果不能覆盖已取消或已过期运行。

## 通知只报告已持久化结果

完成、部分完成、失败和需要审批分别通知，链接指向受权的 Turn 详情。通知发送失败不改变任务终态，可独立重试。

后台 Agent 的价值是可靠推进，不是隐藏执行。用户应能查看、取消、暂停和审计每次运行。
