---
title: MCP 生命周期：从初始化到关闭
description: 沿连接、版本协商、能力发现、调用、进度、取消和关闭理解 JSON-RPC 消息怎样流动。
category: ai-agent
part: 工具与能力扩展
stageKey: tools
chapter: 9
sequence: 9
slug: mcp-protocol-lifecycle
tags:
  - MCP
  - JSON-RPC
  - Lifecycle
sourceKey: ai-mcp-protocol-lifecycle
dependsOn:
  - mcp-foundations-boundaries
updated: '2026-08-14'
lastUpdated: false
---
# MCP 生命周期：从初始化到关闭

理解 MCP 不能只记住 `tools/list` 和 `tools/call`。一次可靠连接还包含版本确认、能力发现、请求关联、取消、补充输入、断线处理和资源释放，这些阶段决定了错误应该在哪里处理。

## 连接先确定传输和协议版本

stdio 通过子进程标准输入输出传递协议消息，适合本地、单用户能力；Streamable HTTP 适合远程服务和多客户端。传输只负责送达字节，JSON-RPC 负责请求、响应、通知和 ID 的对应。

协议在演进，Client 应使用双方支持的版本与能力，不要用 SDK 主版本猜协议版本。现代请求可以携带每请求元数据；遇到只支持旧式初始化握手的 Server 时，兼容逻辑应明确隔离。

## 发现阶段决定可以调用什么

Client 取得 Server 能力后，再列出工具或读取资源。工具列表不是永久配置，Server 可能通知列表变化。Host 更新列表时仍要套用自己的允许名单，不能把新出现的高风险工具直接暴露给模型。

发现失败与业务调用失败要分开记录。前者说明连接或能力协商不可用，后者说明某个已知能力执行失败。

## 调用期间可能出现反向请求

普通调用是 Client 发请求、Server 回结果。有些能力需要进度通知、用户补充信息或抽样请求，消息方向会反过来。Host 必须声明自己支持的能力，并为补充输入设置界面、超时和取消路径。

```text
connect -> negotiate -> discover -> call
                             |-> progress
                             |-> request input
                             |-> result or error
```

## 取消不等于回滚

Client 可以发送取消信号，Server 收到后应尽快停止可中断工作，但消息可能在动作完成后才到达。对写操作而言，取消只代表“不再继续等待或执行后续步骤”，不代表先前副作用已经撤销。

运行时需要保存调用 ID、幂等键和最终查询方式。连接中断后，只读调用可以按策略重试；副作用调用先查询状态，再决定补偿或继续。

## 关闭时释放进程、连接和待处理请求

正常关闭先停止接收新调用，等待或取消在途请求，再释放 HTTP 会话或子进程。stdio Server 若把日志写到协议 stdout，会破坏消息边界，诊断信息应写 stderr。

重连后不要假设旧会话仍有效。Client 重新确认版本和能力，Host 再恢复允许列表；无法确认最终状态的调用保持“未知”，不能伪装成成功或失败。
