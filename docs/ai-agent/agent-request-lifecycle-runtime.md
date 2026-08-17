---
title: 一次 Agent 请求怎样穿过 API 与 Runtime
description: 从创建 Turn 到异步执行、持久化事件和读取终态，解释每层职责。
category: ai-agent
part: Runtime 与生产架构
stageKey: runtime
chapter: 53
sequence: 53
slug: agent-request-lifecycle-runtime
tags:
  - Request Lifecycle
  - API
  - Runtime
sourceKey: ai-agent-request-lifecycle-runtime
dependsOn:
  - agent-runtime-domain-model
updated: '2026-08-14'
lastUpdated: false
---
# 一次 Agent 请求怎样穿过 API 与 Runtime

HTTP 请求的生命周期很短，研究或入库任务可能运行数分钟。API 应负责认证、创建 Turn 和返回读取位置，Runtime 与 Worker 在请求结束后继续推进状态。

## API 入口只做同步准入

入口校验身份、请求 Schema、幂等键和基础配额，取得当前 Release 与 Policy，创建 pending Turn。长任务不在 Web 进程里一直等待。

响应返回 Turn ID、初始状态和事件地址。重复相同幂等请求返回已有 Turn。

## 队列携带身份引用，不携带大上下文

API 提交包含 Turn ID 的任务。Worker 领取后从数据库重新读取状态、版本和 Scope，再取得执行租约。队列消息可能重复，不能被当成最新事实。

用户文本、文件和 Evidence 存储在专用系统中，任务消息只传稳定引用。

## Runtime 按节点推进并写事件

Runtime 装配上下文，调用模型、检索和工具，每个节点前检查取消与 Deadline，节点后写状态和事件。外部调用使用超时和 Trace。

正常链路是 `create turn -> enqueue -> acquire -> run nodes -> validate -> persist answer -> terminal event`。

## 客户端通过 SSE 或查询读取进度

SSE 推送已持久化事件，断线按序号重放；连接不可用时轮询 Turn 状态。客户端断开不会自动取消任务，取消要调用明确接口。

终态答案从持久化 Message 或结果对象读取，不依赖某个 Worker 的内存。

## 失败在所属层结束

认证失败不创建 Turn，准入失败返回明确错误；Worker 临时失败按幂等策略重试；证据不足成为安全拒答；不可恢复异常写 failed 终态。

每层只承担自己的补偿，API 超时不能直接推断后台任务失败。
