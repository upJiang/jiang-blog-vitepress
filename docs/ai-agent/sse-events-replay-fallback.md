---
title: SSE 事件怎样支持断线重放与轮询降级
description: 用递增序号持久化事件，按 Last-Event-ID 重放，并在流式连接失败时查询终态。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 57
sequence: 57
slug: sse-events-replay-fallback
tags:
  - SSE
  - Replay
  - Event
sourceKey: ai-sse-events-replay-fallback
dependsOn:
  - agent-request-lifecycle-runtime
updated: '2026-08-14'
lastUpdated: false
---
# SSE 事件怎样支持断线重放与轮询降级

Server-Sent Events，简称 **SSE**，适合服务器向浏览器持续发送 Agent 进度。网络连接会断，可靠体验依赖持久化事件和单调序号，而不是保持一条永不断开的连接。

## 事件先持久化再推送

Runtime 写入 `sequence`、`type`、时间和脱敏 payload，事务成功后通知流服务。SSE 只是读取通道，连接断开不会丢掉已保存事件。

序号在一个 Turn 内单调递增，不能用 Worker 本地计数，恢复后也要继续。

## 客户端用游标恢复

每个 SSE 事件设置 `id`。浏览器重连携带 `Last-Event-ID`，服务端校验用户拥有 Turn 后，查询大于该序号的事件并按序发送。

<<< ../../examples/ai-agent/runtime.py

## 事件类型与终态分开设计

进度事件可以丢弃或合并，终态事件与最终 Message 必须可查询。客户端收到 delta 只更新临时文本，收到 completed 后再以服务端最终结果为准。

错误事件说明执行失败，不等于 SSE 网络错误。界面要区分任务失败和连接中断。

## 轮询是读取降级

代理不支持长连接或重连窗口过期时，客户端轮询 Turn 状态和最后序号。轮询不启动第二个任务，也不重新生成答案。

终态后停止心跳和轮询，但保留结果查询。

## 慢客户端与数据泄漏要处理

限制单连接缓冲和事件载荷，大内容保存外部引用。每次连接与重放都重新授权，不能仅凭不可猜测 Turn ID 访问。

测试断线、重复事件、序号缺口、终态重连和跨用户访问。前端按序号去重，使至少一次推送不会重复渲染。
