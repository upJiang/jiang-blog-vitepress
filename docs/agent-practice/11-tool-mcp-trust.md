---
title: "11｜通过 MCP 暴露只读知识能力"
description: "从 initialize 到 tools/call，逐步实现认证、只读工具、权限复用和不可信结果处理。"
category: agent-practice
tags: ["MCP", "Read-only Tools"]
updated: 2026-08-05
order: 110
depth: core
series: "知识 Agent 分步实践"
---
# 11｜通过 MCP 暴露只读知识能力

管理端已经能查询知识。如果另一个 Agent 客户端也需要这份能力，是复制一套搜索逻辑，还是通过统一协议调用？复制会让权限、检索和评测逐渐分叉。

本篇使用 MCP 暴露只读工具。外部客户端可以搜索和提问，但不能新增、修改或删除知识；所有请求继续复用同一认证、权限和 Agent Runtime。

## MCP 解决什么问题

MCP 是 Model Context Protocol，用于让客户端发现和调用服务器提供的上下文与工具。它定义消息与能力协商，不自动提供业务权限，也不会保证工具返回内容可信。

```mermaid
sequenceDiagram
  participant C as MCP 客户端
  participant S as MCP 服务
  participant R as Agent Runtime
  C->>S: initialize
  S-->>C: 协议版本与能力
  C->>S: tools/list
  S-->>C: 只读工具 Schema
  C->>S: tools/call + 参数
  S->>R: 认证后执行
  R-->>S: 答案与引用
  S-->>C: JSON-RPC 结果
```

## 第一步：先完成协议初始化

客户端先发送 `initialize`，双方确认协议版本与能力，再发送 initialized 通知。未初始化会话不直接调用业务工具。

JSON-RPC 的请求 ID、方法、参数和错误结构都要校验。协议错误与业务“没有结果”使用不同错误，便于客户端正确处理。

## 第二步：工具清单保持最小

当前实践只注册查询类工具，例如搜索可见文档、查看可见目录和向知识 Runtime 提问。没有写工具、审批流程或 mutation 协议。

工具 Schema 说明字段类型、是否必填和范围上限。模型返回的参数仍是不可信输入，服务端会重新校验字符串长度、集合大小和资源范围。

## 第三步：认证与管理端共用权限逻辑

MCP 凭证解析为同一种服务端认证上下文，再执行第 07 篇的主体展开和查询前过滤。客户端不能通过参数指定另一个用户，也不能把一个只读 Token 提升为管理权限。

提问工具复用相同 Runtime，Eval 因此能够覆盖管理端和 MCP 的共同执行链。MCP 调用默认不偷偷写入用户长期记忆，避免外部客户端改变个人状态。

## 第四步：工具返回内容仍是不可信数据

文档可能包含“忽略之前指令”一类文本，远程工具也可能返回格式错误或超大数据。Runtime 会把工具结果放在明确的数据边界中，限制长度，检查提示注入特征，并且不把结果提升为系统指令。

只读工具减少破坏面，却不能消除数据泄露。权限过滤、日志脱敏和输出验证仍然需要执行。

## 故意读取不可见文档

| 请求 | 当前身份 | 预期结果 |
| --- | --- | --- |
| 列出公开目录 | 普通用户 | 返回可见节点 |
| 搜索团队私密文档 | 非成员 | 空结果或无权访问 |
| 伪造资源 ID 直接读取 | 非成员 | 服务端再次拒绝 |
| 调用不存在写工具 | 任意用户 | method/tool not found |
| 参数超过上限 | 任意用户 | invalid params |

测试还确认凭证只在生成时返回一次，持久化侧保存不可直接使用的表示；日志记录工具名、耗时和结果数量，不记录明文凭证与完整敏感正文。

## 当前实现的边界

本篇只讲只读 MCP。需要写操作的系统应另行设计授权、人工确认、幂等和补偿，不能把这里的查询工具简单改成写数据库。

下一篇处理多轮对话，把历史、摘要和显式记忆装进有限 Token 预算。

## 参考资料

- [Model Context Protocol：Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Model Context Protocol：Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
