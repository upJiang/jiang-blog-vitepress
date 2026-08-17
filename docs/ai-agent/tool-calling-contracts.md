---
title: Tool Calling：模型提议调用，程序负责执行
description: 拆开工具定义、调用候选、参数校验、可信上下文、执行结果和回传消息。
category: ai-agent
part: 工具与能力扩展
stageKey: tools
chapter: 7
sequence: 7
slug: tool-calling-contracts
tags:
  - Tool Calling
  - Contract
  - JSON Schema
sourceKey: ai-tool-calling-contracts
dependsOn:
  - python-agent-loop-from-scratch
updated: '2026-08-14'
lastUpdated: false
---
# Tool Calling：模型提议调用，程序负责执行

模型能生成一段看起来像函数参数的 JSON，但这不等于函数已经执行。Tool Calling 的价值，是在模型的语言判断和程序的确定性执行之间建立一份可校验的契约。

## 工具调用包含四个不同对象

工具定义描述名称、用途和参数形状；模型返回的是调用候选；执行器把可信上下文补入业务命令；工具结果再作为观察交回模型。把四者混成一个对象，模型就可能越过权限边界。

| 对象 | 产生者 | 是否可信 | 主要内容 |
| --- | --- | --- | --- |
| Tool Schema | 开发者 | 是 | 名称、说明、参数结构 |
| Tool Call | 模型 | 否 | 工具名、候选参数 |
| Command | 运行时 | 是 | 参数、用户、Scope、版本 |
| Tool Result | 工具适配器 | 部分可信 | 数据或稳定错误 |

## 模型参数要经过两次校验

第一层按 Schema 检查字段类型、必填项和额外字段。第二层检查业务语义，例如 `limit` 的上限、查询是否为空、两个字段能否同时出现。用户身份、租户、可见范围和知识版本不能出现在模型可填写的 Schema 中，它们由服务端会话补入。

<<< ../../examples/ai-agent/contracts.py

## 一次调用怎样回到 Agent 循环

用户询问远程访问规则时，模型可以返回 `search_notes` 和查询词。运行时查找注册表、解析参数、注入当前 Scope，再执行只读检索。结果要带上调用 ID 回传，使模型知道这段观察对应哪次请求。

执行轨迹可以记成：`question -> tool_call(candidate) -> validation -> command -> tool_result -> next_decision`。只有最后一步生成了满足验证条件的回答，Turn 才进入完成状态。

## 错误应该稳定而且可供程序判断

未知工具、参数不合法、权限拒绝、超时、外部依赖失败和空结果不是同一种失败。执行器应返回稳定的错误码和可公开说明，详细堆栈留在服务端日志。模型可以根据“空结果”改写查询，却不能在“权限拒绝”后换一个工具绕过限制。

有副作用的工具还要携带幂等键。客户端超时不能证明服务端没有执行，盲目重试可能重复发消息或重复扣款。

## Tool Calling 的边界

Tool Calling 解决模型如何表达动作候选，不负责工具发现、网络传输、审批、事务和审计。普通函数表只有少量本地能力时已经够用；需要让不同 Host 连接不同工具服务时，才有必要引入 MCP。

无论工具来自本地注册表还是 MCP Server，最终执行权都在应用运行时。这个边界不会因为模型更强或工具说明更详细而改变。
