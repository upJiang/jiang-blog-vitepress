---
title: MCP 客户端、测试、认证与安全边界
description: 从 listTools 和 callTool 走到超时、取消、OAuth、权限、返回值校验、日志审计与远程部署检查。
category: ai-agent
part: 工具与能力扩展
chapter: 13
tags:
  - MCP Client
  - OAuth
  - Security
prerequisites:
  - 理解 MCP 生命周期
  - 完成任一 MCP Server 示例
outcomes:
  - 能实现最小 MCP Client
  - 能设计远程 MCP 的权限与审计边界
practice:
  type: implementation
  result: 用客户端调用并验证 search_notes
  verify:
    - 连接会正确关闭
    - 不可信返回值不会直接变成系统指令
evidence: official
updated: 2026-08-07T00:00:00.000Z
lastUpdated: false
---
# MCP 客户端、测试、认证与安全边界

## MCP Client 是什么

MCP Client 是 Host 内部连接一个 Server 的协议组件。它负责版本探测、能力发现、请求发送、结果校验、超时、取消和关闭，位于 Agent 的工具选择与外部 Server 之间。Client 不等于整个 Host：用户授权、工具暴露策略和模型上下文仍由 Host 管理，业务数据权限由 Server 重新判断。

一条可用的 Client 路径不是“能发 `callTool`”就结束。它至少要完成：连接 Server、取得工具目录、把当前允许的 Schema 交给 Host、执行受控调用、区分 Tool Error 与协议异常、校验结构化结果，最后释放连接和子进程。

本文先跑通 Node 与 Python 两个 Client，再进入远程认证和不可信结果。所有代码来自 `examples/mcp-search-notes/` 的已执行测试。

## Node Client 先建立真实 stdio 连接

Node v2 Client 使用独立包和 stdio transport：

```ts
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { searchNotesOutputSchema } from './contract.js'

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--import', 'tsx', 'src/server.ts'],
  cwd: nodeProject,
  stderr: 'inherit',
})

const client = new Client(
  { name: 'search-notes-cli', version: '1.0.0' },
  { versionNegotiation: { mode: 'auto' } },
)
```

`mode: 'auto'` 很重要。TypeScript Client v2 默认仍保持 Legacy 连接姿态；显式 auto 后，它会先用 `server/discover` 判断 Server 时代，再选择现代请求或旧握手。`command`、`args` 与 `cwd` 共同决定启动哪个 Server，不能依赖开发机器碰巧正确的当前目录。

连接、发现和调用分成三步：

```ts
try {
  await client.connect(transport)

  const { tools } = await client.listTools()
  if (!tools.some((tool) => tool.name === 'search_notes')) {
    throw new Error('Server did not expose search_notes')
  }

  const result = await client.callTool({
    name: 'search_notes',
    arguments: { query: 'release', limit: 5 },
  })

  if (result.isError) {
    throw new Error(JSON.stringify(result.content))
  }
  const output = searchNotesOutputSchema.parse(result.structuredContent)
  console.log(output)
} finally {
  await client.close()
}
```

`listTools()` 不只是为了展示名称。Client 会取得输入和输出 Schema，后续 `callTool()` 可据此验证结构化结果。Host 还要把目录按当前用户与任务过滤，不能把 Server 声明的所有能力原样交给模型。

## 连接关闭与资源释放

stdio transport 会启动子进程，Client 因此拥有它的生命周期。伴随测试在连接后确认 `transport.pid` 存在，`finally` 关闭 Client，稍后再断言 PID 为 `null`：

```ts
try {
  await client.connect(transport)
  assert.ok(transport.pid)
  // 发现并调用 search_notes
} finally {
  await client.close()
}

await delay(50)
assert.equal(transport.pid, null)
```

只测返回值会漏掉进程泄漏。长时间运行的 IDE 或桌面 Host 若反复重连，却没有回收旧 Server，最终会积累文件句柄、内存和后台任务。HTTP Client 同样要关闭响应流、订阅和连接资源。

## Python Client 证明跨语言 stdio

Python SDK 2.0 的高层 `Client` 默认 `mode="auto"`。要连接 Node Server，先创建 stdio transport，再把它交给 Client：

```python
from pathlib import Path

from mcp import Client, StdioServerParameters, stdio_client


# command、args 和 cwd 共同锁定要启动的 Node stdio Server。
node_project = Path("examples/mcp-search-notes/node")
params = StdioServerParameters(
    command="node",
    args=["--import", "tsx", "src/server.ts"],
    cwd=node_project,
)

async with Client(stdio_client(params), mode="auto") as client:
    # 先探测协议并获取公开目录，不能凭旧 Tool 名直接调用。
    tools = await client.list_tools()
    assert [tool.name for tool in tools.tools] == ["search_notes"]

    # 跨语言调用仍使用共享参数和结构化结果契约。
    result = await client.call_tool(
        "search_notes",
        {"query": "release", "limit": 2},
    )
    assert result.is_error is False
    assert [
        item["id"] for item in result.structured_content["items"]
    ] == ["n-1", "n-3"]
```

这条测试实际启动 Node v2 Server，经现代 stdio 协议发现并调用 Tool，退出上下文时回收子进程。它证明协议和业务核心结构可以跨语言互通，不证明远程 HTTP、OAuth 或真实数据库。

## 两个错误通道都要处理

真实测试得到的行为是：

| 情况 | Client 看到什么 | Host 动作 |
| --- | --- | --- |
| 正常或空结果 | 成功 `CallToolResult` | 校验 `structuredContent` |
| 参数越界 | `result.isError === true` | 记录 Tool Error，可向模型返回受控说明 |
| 输出不符合 Schema | `result.isError === true` | 拒绝进入业务上下文，记录 Server 缺陷 |
| Tool 不存在 | 抛出 Protocol Error | 停止本次调用，刷新目录或报告兼容错误 |
| 超时、连接关闭 | 抛出 SDK/transport 错误 | 判断重试与未知终态 |

因此下面的写法不完整：

```ts
const result = await client.callTool(request)
return result.structuredContent
```

它既没检查 `isError`，也没捕获协议异常，更没验证结构化结果。Client Adapter 应把错误转换成 Host 自己的联合类型，例如 `ok`、`tool_error`、`protocol_error`、`timeout` 和 `outcome_unknown`，不要用一个空字符串吞掉差异。

## 超时与取消需要 Host 的总 Deadline

每次 MCP 调用都应消费 Host Run 的总 Deadline，而不是为每个 Tool 重新获得完整超时时间。Client 发出请求前计算剩余预算，超时后执行传输相关取消并锁定本地终态。

```text
Run deadline
  -> 模型已用时间
  -> 排队与版本探测
  -> tools/call 剩余预算
  -> 结果校验与下一轮模型调用
```

stdio 现代取消使用 `notifications/cancelled`，Streamable HTTP 通过关闭本次响应流。取消只代表调用方不再等待，不证明 Server 底层操作未提交。只读查询可以有限重试；写 Tool 必须依赖业务幂等键和状态查询，无法确认时返回 `outcome_unknown`。

## 本地 stdio 的信任边界

本地 Server 通常以 Host 用户身份运行，这并不意味着可以继承 Host 的全部环境变量和文件权限。配置时应最小化：

- 使用明确命令、绝对或受控工作目录和固定包版本；
- 只传 Server 必需的环境变量，不继承无关云凭证；
- 校验 Server 来源与更新渠道，避免任意路径替换；
- stdout 只承载协议，stderr 日志脱敏；
- 为文件、网络和子进程设置沙箱或系统权限。

恶意本地 Server 与任意本地程序风险相近。MCP 的 Schema 不会限制进程实际能读哪些文件；OS 权限、容器或沙箱才是强边界。

## 远程 HTTP 需要认证和 Server 端授权

远程 MCP 通常通过 HTTPS 和明确认证机制建立调用者身份。OAuth 可以处理授权流程与 Access Token，但 Token 有效只证明某个身份获得了某些授权，不代表每个 Tool、对象和字段都可访问。

Server 端至少重新判断：

1. Token 的签名、issuer、audience、时效与撤销状态；
2. 当前身份能否看到这个 Tool；
3. Tool 参数涉及的对象是否在 Scope 内；
4. 当前 Release、状态与策略是否允许操作；
5. 输出字段是否需要脱敏或裁剪。

不要把 Access Token 放进 Tool 参数、Prompt 或模型上下文。Client 从受保护凭证存储取得 Token，通过传输认证字段发送；日志只记录 Token 指纹或凭证 ID，不能打印正文。

## 工具目录也要按权限过滤

如果用户无权调用某个高风险 Tool，最小暴露原则是让 Server 或 Host 的当前目录不包含它，而不是等模型选中后再拒绝。目录过滤与调用时授权仍需同时存在：前者减少误选和信息暴露，后者防止目录过期或绕过 Host 的直接请求。

进行中的 Run 固定目录或 Schema 指纹。收到工具列表变化通知时，新 Run 可以刷新；当前 Run 若继续执行，应使用已验证版本，安全紧急下线则明确返回 `tool_unavailable`。

## Server 结果的信任边界

`search_notes` 的 `excerpt` 可能包含“忽略之前规则”之类文本。即使 Schema 正确，这仍只是数据，不是系统指令。Client 和 Host 应执行四层处理：

| 检查 | 目的 |
| --- | --- |
| Schema | 防字段和类型漂移 |
| Scope/来源 | 确认结果来自本轮允许的 Server 与版本 |
| 大小预算 | 限制字节、条数和 Token，防上下文挤占 |
| 信任标记 | 作为 Tool observation/外部证据，不提升为 System Prompt |

结构化输出不会自动消除提示注入。若文本字段进入模型上下文，Host 仍要清楚标记其来源，并在模型提出后续高风险动作时重新授权。

## 审计日志记录决策，不保存秘密

一次 Client 调用建议关联以下字段：

```text
run_id / turn_id / tool_call_id
server_id / transport / negotiated_protocol
tool_name / tool_schema_fingerprint
principal_id / scope_id / policy_version
started_at / duration_ms / deadline_remaining_ms
tool_status / protocol_error_code / retry_count
result_count / truncated / result_digest
```

不要默认记录 Tool 完整参数、Access Token、Cookie、私有正文和整个结果。需要排障时保存最小脱敏证据，并设置访问控制与保留期。日志字段必须区分 Tool Error、协议错误、超时、取消和未知终态，否则指标会把完全不同的问题混在一起。

## 分层测试矩阵

| 层 | 正常路径 | 失败路径 | 证据边界 |
| --- | --- | --- | --- |
| 业务函数 | 命中、空结果、limit | 数据依赖失败 | 不证明 MCP |
| 进程内 MCP | list/call、Schema | 参数拒绝、错误输出、未知 Tool | 不证明 stdio |
| stdio 子进程 | 现代探测、跨语言调用、关闭 | 命令错误、stdout 污染、退出 | 不证明 HTTP/OAuth |
| Streamable HTTP | HTTPS、认证、请求级 JSON/SSE | Token 过期、代理超时、断流 | 不证明业务授权正确 |
| Host 集成 | 模型只看允许 Tool、结果进 evidence 区 | 注入、越权候选、目录变化 | 才证明完整 Agent 边界 |

伴随工程已经自动覆盖前三层中的核心用例。接入远程 Server 后，要在隔离环境补 Token 过期、Scope 越界、SSE 取消和断线后未知终态；不能用本地 fixture 的通过结果替代。

## 运行伴随测试

```bash
# 从仓库根目录分别运行 Node 与 Python 的伴随测试。
yarn --cwd examples/mcp-search-notes/node typecheck
yarn --cwd examples/mcp-search-notes/node test

# Python 套件还会启动 Node stdio Server，验证跨语言调用与关闭。
cd examples/mcp-search-notes/python
uv run pytest -q
```

Node 套件包含真实 stdio Client 和 PID 回收测试；Python 套件包含 Python Server 契约与 Python Client -> Node Server 跨语言调用。所有结果都来自固定 fixture，不连接在线服务，也没有宣称生产权限或性能。


**为什么 Client 必须先 `listTools()` 再调用？**

Client 需要当前工具目录与输出 Schema，Host 也需要按用户和任务过滤。直接凭旧名称调用容易遇到过期 Schema，还会失去结构化结果校验依据。极简固定集成可以缓存目录，但仍要有刷新和版本策略。

**Tool Error 和异常应该统一成一个错误吗？**

可以在 Host 边界统一为联合类型，但不能丢失来源。参数拒绝、未知 Tool、网络超时和业务未知终态需要不同重试、提示和告警策略；只保留 `message` 会让恢复逻辑失真。Adapter 至少保存 `kind`、稳定错误码、是否可重试和业务操作 ID，测试再逐类断言，避免所有失败落进同一个异常字符串。

**Python Client 为什么不调用 `ClientSession.initialize()`？**

那是旧式低层用法。Python SDK v2 高层 `Client` 默认 auto，会处理现代探测和 Legacy 兼容。排查现有代码时先确认导入的是高层 `Client` 还是 `ClientSession`，再查看 mode 与锁定版本；使用低层 API 也要按当前 SDK 选择生命周期，不能从 v1 示例复制 `initialize()` 后与现代请求混用。

**OAuth 完成后为什么还要做 Tool 授权？**

OAuth 建立身份和授权范围，具体 Tool、对象、状态和字段仍是业务决策。Token 可以有效，但用户依然可能无权读取某个租户的笔记；Server 每次调用都要根据 principal、Scope 和对象状态重新判断。回归测试应覆盖“Token 有效但对象越界”，确认目录过滤和调用时授权都会拒绝。

**`structuredContent` 通过 Schema 后可以直接交给模型吗？**

不可以。Schema 只证明形状，不证明内容可信、相关或没有提示注入。Host 还要检查结果来自哪个 Server 和版本、是否属于当前 Scope、是否超过条数或 Token 预算，并把文本放在外部证据区。用含“忽略系统规则”的 fixture 回归，确认它只作为引用内容出现，不能改变工具权限。

**什么时候可以自动重试？**

只读、幂等且剩余 Deadline 足够时可以有限重试，并设置次数上限与抖动。写操作还要有业务幂等键与状态查询：先查原操作是否已经提交，再决定是否重发。连接断开后无法确认结果时返回未知终态，自动重放只会把传输故障升级成重复副作用。

**为什么一个 Host 通常为每个 Server 建一个 Client？**

不同 Server 有各自的传输、认证、协议判定、工具目录和故障状态。独立 Client 能隔离请求、取消与关闭，避免一个本地子进程退出时清空远程 Server 的 pending 调用。Host 再在更高层合并允许交给模型的工具视图，并用稳定别名处理同名 Tool，而不是合并底层连接状态。
