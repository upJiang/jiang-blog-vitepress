---
title: 怎样从重复工作中识别 MCP 机会
description: 从跨系统复制、实时查询和标准操作判断普通 API、CLI、Skill 或 MCP。
category: ai-practice
part: MCP 实践
stageKey: mcp-practice
chapter: 3
sequence: 3
slug: mcp-opportunity-analysis
tags:
  - MCP
  - Opportunity Analysis
  - Tool
sourceKey: practice-mcp-opportunity
dependsOn:
  - ai-capability-selection
updated: '2026-08-17'
lastUpdated: false
---
# 怎样从重复工作中识别 MCP 机会

“这件事每天都做”只能证明动作重复，不能直接推出需要 MCP。MCP 解决 Host 与外部能力之间的发现和调用协议；脚本、HTTP API 或函数库已经足够时，增加 Server 会多出生命周期、传输和权限管理。

判断机会要从真实调用记录开始。谁在什么环境发起动作，输入是否稳定，数据从哪里来，结果怎样被后续步骤使用，失败能否重试。多个 Agent Host 需要共享同一能力，而且调用合同已经稳定，MCP 才有明确位置。

## 把重复工作写成领域动作

假设开发者经常在编辑器和桌面 Agent 中查询软件包的许可证、最新稳定版本和废弃状态。人工流程包含打开网站、复制包名和比对页面。可以抽象的动作是“按规范化包名读取版本与许可元数据”，不是“模拟人点击网页”。

领域动作需要固定输入和结果：

```json
{
  "input": { "package": "example-lib", "registry": "public" },
  "result": {
    "package": "example-lib",
    "version": "1.2.3",
    "license": "MIT",
    "deprecated": false,
    "source": "registry-response"
  }
}
```

示例只说明协议形状。版本和许可必须来自允许访问的 Registry，Server 不能让模型补全缺失字段。

## MCP 是否比普通 API 更合适

普通 API 面向业务客户端，认证、资源路径和响应由服务定义。MCP Server 还要支持初始化、能力协商、工具发现和调用，让 Host 能把能力交给模型使用。

已有稳定 API 时，MCP Server 可以做薄适配，负责把领域操作映射成 Tool Schema。它不应复制业务数据库或重新实现认证。调用方只是后端服务或固定流水线时，直接使用 API 或 SDK 更简单。

试点前至少确认两个真实 Host、基本一致的动作合同，以及明确的维护者。否则先保留脚本或 API。

## 工具合同要比自然语言稳定

工具名称说明动作，输入 Schema 只暴露模型可以填写的字段。租户、用户身份、访问范围和凭证由 Host 或 Server 的可信上下文补入，不能让模型通过参数切换身份。

输出要区分合法空结果、参数错误、权限拒绝、上游超时和协议故障。把所有失败都返回一段文字，Agent 可能把权限拒绝理解成“没有数据”，随后尝试范围更宽的工具。

只读也有成本和风险。批量查询会消耗上游配额，包名可能带有内部项目线索，返回内容还可能包含不可信文本。Server 应限制 Registry、结果大小、并发和缓存时间，并保留外部内容的来源标签。

## 最小试点只验证一条链路

试点可以只做一个只读工具，让两个客户端完成初始化、发现、合法调用和非法参数调用。测试保存协议事件与领域结果，检查同一个调用 ID 是否始终对应同一个结果，连接中断后是否留下未知状态，以及取消后 Server 是否停止新工作。

缓存键包含规范化输入和数据源版本。缓存命中仍要重新检查调用者权限，不能因为第一次请求有权访问，就把结果交给后续任意会话。

## 把协议成功和领域成功分开

MCP 初始化、工具发现和 `tools/call` 成功，只证明 Client 与 Server 按协议交换了消息。领域工具还要返回稳定的业务结果类型，让 Host 区分正常数据、合法空结果、权限拒绝、上游不可用和参数版本不支持。

```ts
type LookupResult<T> =
  | { status: 'ok'; data: T; sourceVersion: string }
  | { status: 'empty'; sourceVersion: string }
  | { status: 'denied'; reasonCode: string }
  | { status: 'unavailable'; retryAfterMs?: number }
```

若 Server 把权限拒绝返回成空数组，Agent 可能转向范围更宽的工具；把上游超时包装成普通文本，Host 也无法应用重试预算。协议层错误用于消息形状、方法和传输故障，领域终态留在工具的结构化内容中，两层日志通过 `call_id` 关联。

试点还要验证 Schema 演进。新增可选字段保持旧 Client 可调用，删除或改义需要新工具版本或协商能力。Server 发布新版本后重放旧请求与新请求，确认默认值、错误码和授权结果没有漂移。

## 出现哪些信号时停止抽象

动作每周都在改、不同客户端需要完全不同的字段，说明领域合同还没稳定。只有一个调用方，函数库或脚本更容易测试。操作包含高风险写入却没有幂等键、审批和回执，也不适合先通过 MCP 暴露给模型。

试点结束时，把接入前后的代码量、失败类型、维护责任和真实复用次数放在一起比较。协议接通只证明客户端能调用 Server，业务结果是否正确仍由领域测试和上游证据确认。
