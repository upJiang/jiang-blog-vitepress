---
title: Node.js 实战：实现一个只读 search_notes MCP Server
description: >-
  使用 TypeScript MCP SDK v2 分包和 Zod 4 建立现代 stdio Server，注册输入输出
  Schema，并验证工具发现、参数拒绝与结构化结果。
category: ai-agent
part: Tool、MCP、Skill 与 SubAgent
chapter: 55
tags:
  - MCP
  - Node.js
  - JavaScript
  - Zod
prerequisites:
  - Node.js 20+
  - 会读 JavaScript async 函数
  - 理解 MCP Tool 契约
outcomes:
  - 能实现并运行 Node MCP Server
  - 能解释 SDK 版本与协议版本的区别
practice:
  type: implementation
  result: 完成一个有单元测试和协议契约测试的 Node Server
  verify:
    - 合法与空查询返回结构化结果
    - 越界参数在查询函数前被拒绝
evidence: official-guided-operation
updated: 2026-08-11T00:00:00.000Z
lastUpdated: false
---
# Node.js 实战：实现一个只读 search_notes MCP Server

Node.js MCP Server 是运行在 Client 与业务代码之间的协议适配器。它把 Zod Schema 暴露为 Tool 契约，在调用进入 Repository 前校验参数，再把业务对象编码成 MCP 内容。它适合已有 Node 服务、CLI 或本地开发工具，不因为使用 JavaScript 就改变 Server 的权限责任。

本文使用 TypeScript MCP SDK v2 的分包：`@modelcontextprotocol/server@2.0.0` 负责 Server，`@modelcontextprotocol/client@2.0.0` 用于测试，Zod 锁定 4.4.3。旧教程常见的 `@modelcontextprotocol/sdk` 单包仍属于 v1 线；迁移时要改 import、Server 入口和 Client 版本探测，不能只替换版本号。

完整实现位于 `examples/mcp-search-notes/node/`，与 Python Server 共用同一份 `search_notes` 核心契约和 fixture。

## v2 为什么拆成 Client 与 Server 两个包

Server 进程不需要携带 Host Client 的全部实现，Client 也不需要 Server 路由。v2 通过独立包表达两侧职责：

```json
{
  "dependencies": {
    "@modelcontextprotocol/client": "2.0.0",
    "@modelcontextprotocol/server": "2.0.0",
    "zod": "4.4.3"
  }
}
```

Node.js 最低版本是 20，项目使用 ESM 和严格 TypeScript。安装并运行类型检查：

```bash
# 在伴随工程中安装示例依赖，再检查所有示例与测试的类型。该目录当前没有独立锁文件。
cd examples/mcp-search-notes/node
yarn install
yarn typecheck
```

包版本 2.0.0 和 MCP 规范日期 `2026-07-28` 是两套版本体系。这一组 v2 包明确支持现代规范，也能服务 Legacy Client；是否采用现代请求仍取决于连接如何开场和 Client 的版本模式。

## Zod 同时约束输入和输出

`src/contract.ts` 声明 Tool 的运行时 Schema：

```ts
import * as z from 'zod/v4'

export const noteResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
})

export const searchNotesInputSchema = z.object({
  query: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).default(5),
})

export const searchNotesOutputSchema = z.object({
  items: z.array(noteResultSchema),
})
```

一份 Schema 同时服务三件事：生成 Client 能发现的 JSON Schema、在 Tool handler 前校验参数、给 TypeScript 推导输入输出类型。输出 Schema 还让 Server 和 Client 检查 `structuredContent`，避免 handler 悄悄漏字段或改变类型。

共享的 `contracts/search-notes.json` 锁定语言无关的核心字段与范围。SDK 生成结果可以有表达差异：Python 常带 `title`、`$defs`，Node 可能内联对象；Node SDK 暴露的顶层输入 Schema 也不一定逐字保留手写文件的 `additionalProperties`。跨语言测试比较字段、必填项、范围和行为，不能把序列化字节相同误当成唯一兼容标准。

## Tool 注册只做协议适配

Repository 接口由共享业务契约定义。Node Adapter 只注入这个接口并注册 Tool：

```ts
import { McpServer } from '@modelcontextprotocol/server'
import {
  searchNotesInputSchema,
  searchNotesOutputSchema,
} from './contract.js'
import type { NoteRepository } from './repository.js'

export function createSearchNotesServer(repository: NoteRepository): McpServer {
  const server = new McpServer({
    name: 'search-notes-node',
    version: '1.0.0',
  })

  server.registerTool(
    'search_notes',
    {
      description: 'Search notes visible to the authenticated caller.',
      inputSchema: searchNotesInputSchema,
      outputSchema: searchNotesOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      // SDK 校验通过后才进入 Repository；可信 Scope 不属于模型参数。
      const output = await repository.search(input)
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      }
    },
  )

  return server
}
```

`content` 是 Host 或模型可以读取的内容块，`structuredContent` 是应用继续处理的机器可读结果。两者表达同一事实时应保持一致；Client 不能只校验文字看起来合理，就忽略结构化字段。

`readOnlyHint` 是能力提示，不是安全证明。测试需要观察 Repository 是否写入，生产还要使用只读凭证、只读事务或数据层策略。即使业务不写数据，查询仍可能触发缓存、审计日志或昂贵计算，因此也需要超时和速率限制。

## `serveStdio` 负责现代与 Legacy 开场

v2 的 stdio 入口接收 Server factory：

```ts
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createSearchNotesServer } from './app.js'
import { FixtureNoteRepository } from './repository.js'

void serveStdio(
  () => createSearchNotesServer(new FixtureNoteRepository()),
  {
    onerror(error) {
      // stdout 是协议通道，诊断只能写 stderr。
      console.error(error)
    },
  },
)
```

factory 让入口在确定连接时代后创建并固定一份 Server 实例。`serveStdio` 默认也能服务 `initialize` 型 Legacy Client；若应用只允许现代协议，可以按 SDK 配置拒绝 Legacy 开场，但必须先确认目标 Host 支持现代探测。

启动命令是：

```bash
# 启动真实 stdio Server；进程会等待 Client 从 stdin 发送消息。
yarn --cwd examples/mcp-search-notes/node start
```

进程会等待 stdin。不要用 `console.log` 打启动信息，因为 stdout 承载协议消息。运行日志、异常和调试输出写 stderr，并且不要包含 Token 或完整 Tool 结果。

## Client 看到的才是公开契约

Zod 对象本身不是最终协议证据。测试通过内存 transport 连接真实 `McpServer`，调用 `listTools()` 后比较 Server 实际公开的核心 Schema：

```ts
const { tools } = await client.listTools()
const tool = tools.find((item) => item.name === 'search_notes')

assert.ok(tool?.outputSchema)
assert.deepEqual(commonCore(tool.inputSchema), commonCore(contract.inputSchema))
assert.deepEqual(commonCore(tool.outputSchema), commonCore(contract.outputSchema))
```

这条测试曾经发现一个值得保留的差异：直接调用 Zod `toJSONSchema()` 时，带默认值的 `limit` 必填行为与 MCP SDK 暴露目录不完全相同。业务 Client 使用的是 `tools/list` 结果，因此测试必须站在协议出口，而不是假定中间库转换就是最终外形。

## 参数拒绝要观察业务函数有没有执行

测试 Repository 记录调用次数：

```ts
test('rejects invalid input before repository execution', async () => {
  const repository = new CountingRepository()
  const connection = await connectInMemory(
    createSearchNotesServer(repository),
  )

  try {
    const invalid = await connection.client.callTool({
      name: 'search_notes',
      arguments: { query: 'release', limit: 21 },
    })

    assert.equal(invalid.isError, true)
    assert.equal(repository.calls, 0)
  } finally {
    await connection.close()
  }
})
```

真实运行结果不是抛异常，而是 `CallToolResult` 的 `isError: true`。Server 将输入校验失败作为 Tool 结果返回，Client 可以把受控错误交给 Host。若文章把所有错误都写成 `try/catch`，这条分支会被漏掉。

## 未知 Tool 与错误输出走不同通道

测试额外注册一个故意返回错误类型的 `broken_output`。两条断言得到不同结果：

```ts
await assert.rejects(
  client.callTool({ name: 'missing_tool', arguments: {} }),
  /not found|unknown/i,
)

const broken = await client.callTool({
  name: 'broken_output',
  arguments: {},
})
assert.equal(broken.isError, true)
```

不存在的 Tool 无法建立有效调用，SDK 抛出 Protocol Error；已注册 Tool 返回不符合 `outputSchema` 的结构时，Server 把输出校验失败编码为 Tool Error。Host 处理 MCP 调用至少需要两条通道：检查返回的 `isError`，同时捕获协议与 SDK 异常。

正常命中和空结果则共用成功 Schema：

```ts
const hit = await client.callTool({
  name: 'search_notes',
  arguments: { query: 'release', limit: 2 },
})
assert.equal(
  searchNotesOutputSchema.parse(hit.structuredContent).items[0]?.id,
  'n-1',
)

const empty = await client.callTool({
  name: 'search_notes',
  arguments: { query: 'missing', limit: 5 },
})
assert.deepEqual(
  searchNotesOutputSchema.parse(empty.structuredContent),
  { items: [] },
)
```

## 运行四类契约测试

下面这组命令针对伴随工程的四类边界：先检查 TypeScript 输入输出是否能编译，再验证正常命中、空结果、参数拒绝和错误分层。它们使用固定 fixture，不需要真实 API Key，目标是确认 Server 的协议契约和关闭行为没有被后续改动破坏。

```bash
# 先检查类型，再运行内存契约与真实 stdio 五条测试。
cd examples/mcp-search-notes/node
yarn typecheck
yarn test
```

当前测试覆盖：

- Server 实际公开 Schema 与共享核心契约一致；
- 正常命中与空结果均符合输出 Schema；
- 越界参数不会进入 Repository；
- 未知 Tool 与错误结构化输出分开报告。

内存 transport 仍绕过 PATH 与真实标准流。完整验证还需要由 Python Client 启动 Node Server 子进程，检查现代探测、跨语言 stdio 和关闭行为。内存测试与跨进程测试都通过，才能说明示例既有稳定 Tool 契约，也能被另一个语言的 Client 调用。


**为什么不继续使用 `@modelcontextprotocol/sdk`？**

它是常见的 v1 单包路径。本文需要验证 `2026-07-28` 现代协议和 v2 API，因此使用分包。维护旧项目时先列出 Server、Client、transport 和 Inspector 的现有 import，再按迁移指南逐项替换并跑契约测试；只改包名会漏掉 `serveStdio` factory、版本探测和结果行为变化。

**`registerTool` 会替代业务权限吗？**

不会。它负责 Schema 与 handler 分发。认证身份、租户 Scope、对象状态和成本预算仍由 Server 业务层判断，而且可信字段不应出现在模型参数中。验证时给 Tool 发送合法结构但越权的对象 ID；若请求仍进入数据层并返回对象，Schema 再严格也没有守住授权边界。

**`content` 和 `structuredContent` 为什么都要返回？**

前者供模型或 UI 阅读，后者供程序校验和继续计算。只有文本会迫使 Client 重新解析；只有结构化内容可能让不支持该展示方式的 Host 缺少可读反馈。两者不能表达冲突事实。

**Zod Schema 与 Python Pydantic Schema 必须逐字相同吗？**

不必。`$defs`、`title`、方言标记和对象展开方式可能不同。兼容条件是 Client 实际看到的字段、类型、必填项、范围、默认语义与错误行为一致。测试应读取 `tools/list` 的公开 Schema，并用同一 fixture 运行两端；不要只比较两份手写 JSON 后就宣称协议互通。

**为什么空结果不返回 `isError: true`？**

因为查询完成了，只是没有命中。Client 可以继续用固定输出 Schema 处理，并由 Host 决定是否调整查询；数据库不可用、权限拒绝或参数不合法才属于失败通道。若空结果标成 `isError`，模型可能无意义重试，监控也会把正常零命中统计成 Server 故障。

**内存 transport 测试通过后还缺什么？**

至少缺真实 stdio 启动、版本探测、stdout 纪律和子进程关闭。补测时用正式 command、args 与 cwd 启动，完成 `listTools`、`callTool` 和 `close`，再确认 PID 释放。远程部署还缺 HTTPS、认证、代理和取消测试；每层只认领实际经过的边界，不能拿内存结果证明网络配置。
