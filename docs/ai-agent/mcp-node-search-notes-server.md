---
title: Node.js 实战：实现一个只读 search_notes MCP Server
description: >-
  使用 Node.js SDK 1.30.0 建立 stdio Server，注册同时约束输入与输出的只读工具，并用进程内 Client
  验证正常、空结果和参数错误。
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

这一篇会真正跑起一个 **MCP Server**。输入是查询词和结果数量，输出是匹配的匿名笔记；Server 不写文件、不访问私有系统，也不让模型自己决定数据范围。

完成后，你可以用 MCP Inspector 看到 `search_notes` 的参数 Schema，传入“访问”，得到一条结果；把 `limit` 改成 20，SDK 会在查询函数执行前拒绝参数。

## 先固定工具契约

动手前先把输入、输出和失败语义写清楚。否则 Node 版和后面的 Python 版很容易“名字一样，行为不同”。

| 字段 | 约束 | 含义 |
| --- | --- | --- |
| `query` | 去首尾空格后 1～100 字符 | 在标题和正文中查询 |
| `limit` | 整数，1～10，默认 5 | 最多返回多少条 |
| `items` | 数组 | 匹配结果；无结果时是空数组 |
| `id` | 字符串 | 公开稳定标识 |
| `title` | 字符串 | 笔记标题 |
| `snippet` | 字符串 | 受长度限制的摘要 |
| `location` | 字符串 | 可供引用的匿名位置 |

空结果不是异常，因为“资料中没有”是一次成功查询的正常业务结果。参数不合法是调用错误，应在进入查询前被 Schema 拒绝。Repository 超时则是工具执行错误，需要与空结果区分。

## 环境和目录

示例使用 Node.js 20 以上、`@modelcontextprotocol/sdk` 1.30.0 和 Zod 4.4.3。这里锁定精确版本，是因为 SDK 包版本和 MCP 协议日期不是同一件事：本文实测的 Node SDK 仍执行 `initialize` 型 Legacy 生命周期；`2026-07-28` 现代无状态协议应使用明确支持它的 SDK 验证，不能看到“最新 npm 包”就自行推断。

下面的命令在一个空目录中运行，会创建独立项目，不需要 TypeScript 编译器或 `tsx`：

```bash
# 创建独立示例目录并锁定 SDK 与 Schema 依赖，避免全局包影响复现结果。
mkdir mcp-notes-node
# 进入刚创建的目录，后续依赖和配置都只写在这个示例中。
cd mcp-notes-node
npm init -y
npm pkg set type=module
# 安装并锁定示例依赖，SDK 或 Schema 版本变化时可以复现差异。
npm install @modelcontextprotocol/sdk@1.30.0 zod@4.4.3
mkdir src
```

第一行创建项目目录，第二行进入目录；`npm init -y` 生成 `package.json`；`type=module` 让 Node 按 ES Module 解析 `.mjs` 中的 `import`；第四行安装官方 SDK 和 Schema 库；最后创建源码目录。预期看到依赖安装成功，并且 `package.json` 中出现 `"type": "module"`、两个被锁定的依赖版本。

如果当前 Node 版本低于 20，先切换版本再继续。SDK 的主版本会演进，真实项目应锁定依赖并阅读迁移说明，不要依赖不受控制的全局安装。

## 先写一个与 MCP 无关的查询函数

为什么不直接在工具回调里写 `filter`？因为业务查询和协议适配是两种职责。纯查询函数可以单独测试，未来把内存数组换成数据库时，也不需要改**工具契约**。

在 `src/notes.mjs` 写入下面代码。输入是查询词和数量；输出只保留允许公开的字段。JSDoc 可以让编辑器补全对象形状，但运行时仍由普通 JavaScript 执行。

```js
// 数据筛选先写成普通函数，MCP 层只负责协议注册、参数校验和结果编码。
const notes = [
  { id: 'note-1', title: '访问申请', body: '在账号中心提交申请。', location: 'guide/2' },
  { id: 'note-2', title: '密码重置', body: '验证邮箱后设置新密码。', location: 'guide/5' },
]

export function searchNotes(query, limit) {
  const keyword = query.trim().toLocaleLowerCase()

  return notes
    // 先在标题和正文中做不区分大小写的匹配，空结果仍返回空数组。
    .filter((note) => `${note.title} ${note.body}`.toLocaleLowerCase().includes(keyword))
    .slice(0, limit)
    // 映射阶段只输出工具契约允许的字段，并把正文裁剪为有限长度摘要。
    .map(({ id, title, body, location }) => ({
      id,
      title,
      snippet: body.slice(0, 120),
      location,
    }))
}
```

执行顺序是：`searchNotes` 先清理查询词，再把标题和正文合并做大小写无关匹配，然后按 `limit` 截断，最后把内部 `body` 映射为最长 120 字符的 `snippet`。返回类型没有内部字段，调用方也无法借工具修改笔记。

这只是教学用内存搜索，不具备中文分词、全文索引或租户权限。换成数据库时，函数签名可以保持不变，但 Repository 必须接收来自可信连接的身份和范围，不能接受模型自报的用户 ID。

## 注册 MCP Tool

现在建立协议层。`McpServer` 保存能力声明；`registerTool` 把名称、说明、输入 Schema、输出 Schema 和处理函数绑在一起；`StdioServerTransport` 负责读写 stdin/stdout；`server.connect` 把协议处理器接到 transport。它们是四个不同职责，排错时不要混成一句“Server 没启动”。

先在 `src/mcp.mjs` 写 Server 工厂。工厂只注册能力，不占用 stdin/stdout，这样测试可以把同一个 Server 接到内存 transport：

```js
// createNotesServer 注册只读工具，并允许契约测试注入查询替身。
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod/v4'
import { searchNotes } from './notes.mjs'

const noteResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string().max(120),
  location: z.string(),
})

export function createNotesServer(search = searchNotes) {
  const server = new McpServer({ name: 'notes-readonly', version: '1.0.0' })

  // 注册时同时声明工具名、输入 Schema 和输出 Schema，Host 只能发现这里公开的能力。
  server.registerTool(
    'search_notes',
    {
      description: 'Search visible read-only notes by title and body',
      // 输入 Schema 先限制字段、类型和长度，非法参数不会进入查询函数。
      inputSchema: {
        query: z.string().trim().min(1).max(100),
        limit: z.number().int().min(1).max(10).default(5),
      },
      // 输出 Schema 固定公开结果形状，客户端不需要猜测字段是否存在。
      outputSchema: { items: z.array(noteResultSchema).max(10) },
    },
    async ({ query, limit }) => {
      // 结构化结果供客户端直接读取；文本副本只用于兼容只消费 content 的 Host。
      const structuredContent = { items: search(query, limit) }
      return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
        structuredContent,
      }
    },
  )

  return server
}
```

`createNotesServer` 每次创建独立 Server，再注册同一份工具契约。参数 `search` 默认指向真实纯函数，测试时可以注入计数替身，观察非法参数有没有越过 Schema。Client 调用时，SDK 用 `inputSchema` 校验 `query` 和 `limit`，校验通过才进入回调；回调调用查询函数，得到 `items`，同时返回机器可读的 `structuredContent` 和便于旧 Client 展示的文本 `content`。SDK 再用 `outputSchema` 检查结构化结果，防止 Server 自己返回缺字段或超长列表。

然后在 `src/server.mjs` 写真正的进程入口。它只决定使用哪个 transport，不重复业务契约：

```js
// 启动文件只创建 Server、绑定 stdio 传输并进入协议读取循环。
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createNotesServer } from './mcp.mjs'

// 先完成工具注册，再把 Server 绑定到具体传输方式。
const server = createNotesServer()
// stdio 传输把标准输入输出当作协议通道，业务日志必须写 stderr，不能污染 JSON-RPC。
const transport = new StdioServerTransport()

// 建立传输连接后才开始能力协商；连接未完成时不能调用或发现工具。
await server.connect(transport)
console.error('notes-readonly MCP server is waiting on stdio')
```

执行顺序是“创建 Server -> 注册工具 -> 创建 **stdio** transport -> 连接”。本文锁定的 SDK 在 `connect` 时执行 Legacy `initialize` 协商；这与 Node SDK 1.30.0 的当前行为一致，却不是 `2026-07-28` 现代协议的通用结论。协议升级时要同时更新 Server、Client 和契约测试。

`query` 的 `trim()`、长度限制和 `limit` 的整数范围都在 Schema 中。这样 `limit: 20` 不会进入数据查询。工具处理函数虽然是 `async`，当前内存查询没有等待；未来替换为数据库调用时，可以直接 `await repository.search(...)`。

最后一行使用 `console.error`，因为 stdio Server 的 stdout 是协议通道。若改成 `console.log`，日志会混入 JSON-RPC 响应，Client 可能报解析错误。stderr 用于诊断，不参与协议。

## 启动为什么看起来“没有反应”

在项目根目录运行：


下面的命令接收本节“启动为什么看起来“没有反应””已经说明的目录、依赖或参数，并按出现顺序执行。运行前先确认当前路径，观察每一步退出码和后文列出的可见结果；前一步失败时不要继续。
```bash
# 直接启动后进程会等待 Host 从 stdin 发来协议消息；没有业务输出是正常现象。
node src/server.mjs
```

这些命令从 `node` 开始按顺序运行，输出用于确认“启动为什么看起来“没有反应””是否成立。任何命令返回非零退出码都表示当前步骤没有完成，应先检查路径、环境和参数；不要把后续输出当成成功证据。


预期在终端看到：

```text
notes-readonly MCP server is waiting on stdio
```

随后程序保持运行，没有显示工具列表。这是正常状态：stdio Server 正在等 Client 从 stdin 发起 `initialize`。按 `Ctrl+C` 停止它。真正使用时不需要先手工启动，Inspector 或 Host 会负责创建子进程。

如果出现 `Cannot find package`，先确认命令在项目根目录执行且安装完成；如果出现 ES Module 导入错误，检查 `package.json` 的 `type` 和 `.mjs` 路径；如果 Client 报 JSON 解析错误，检查所有普通日志是否写到了 stderr。若进程启动但 `tools/list` 没有返回，先检查 Server 是否还在等待 Legacy `initialize`，再检查模块加载或 `server.connect` 是否抛出异常；不要先改业务查询，因为此时查询函数还没有被调用。

## 用 Inspector 验证工具

Inspector 是专门连接 MCP Server 的调试客户端。下面的命令会启动 Inspector，再由 Inspector 启动 `node src/server.mjs` 这个 Server。运行前确保刚才手工启动的进程已经关闭。


下面的命令接收本节“用 Inspector 验证工具”已经说明的目录、依赖或参数，并按出现顺序执行。运行前先确认当前路径，观察每一步退出码和后文列出的可见结果；前一步失败时不要继续。
```bash
# Inspector 作为 Host 启动子进程，并让我们观察工具发现、参数校验和调用结果。
npx @modelcontextprotocol/inspector node src/server.mjs
```

这些命令从 `npx` 开始按顺序运行，输出用于确认“用 Inspector 验证工具”是否成立。任何命令返回非零退出码都表示当前步骤没有完成，应先检查路径、环境和参数；不要把后续输出当成成功证据。


浏览器打开后，先点击连接，再进入 Tools，选择 `search_notes`。工具面板中的 `query` 和 `limit` 来自 Zod Schema，不是 Inspector 猜出来的。

### 正常结果

输入：


Inspector 调用时只提交工具 Schema 允许的两个字段。输入中的 `query` 是检索文本，`limit` 是本次最大返回数；目标是先观察合法参数怎样通过 Zod 校验并进入**只读**查询，再用后面的越界参数确认查询不会被调用。身份和可见范围仍由 Server 的可信上下文决定，不能混进这两个模型可控字段。
```jsonc
{
  // query 进入只读检索函数，空白或超长值会在执行前被拒绝。
  "query": "访问",
  // limit 必须落在 Schema 声明的范围内，不能用负数或超大值绕过资源预算。
  "limit": 3
}
```

这份对象的阅读入口是 `query`、`limit`。调用方先校验字段形状，再注入或核对可信上下文，最后把结果交给下一层；缺字段、额外字段与业务拒绝要保留不同错误，不能统一转换成空对象。


Server 校验参数并执行只读查询后，预期返回下面的公开结果对象。输入是查询得到的内部记录，目标是只输出稳定 ID、标题、摘要和可回查位置；读取时还要确认内部权限字段、存储路径和原始对象都没有进入响应：

```jsonc
{
  // items 只包含公开结果字段；内部权限、存储路径和原始对象不会透出。
  "items": [
    {
      // id 是公开记录的稳定标识，用于客户端去重和回查来源。
      "id": "note-1",
      "title": "访问申请",
      "snippet": "在账号中心提交申请。",
      "location": "guide/2"
    }
  ]
}
```

这份对象的阅读入口是 `items`、`id`、`title`、`snippet`。调用方先校验字段形状，再注入或核对可信上下文，最后把结果交给下一层；缺字段、额外字段与业务拒绝要保留不同错误，不能统一转换成空对象。


调用先通过 Schema，再进入 `searchNotes`；字符串“访问”命中标题；`slice(0, 3)` 保留结果；映射后不再暴露内部 `body` 字段。结果条数少于 limit 是正常的，limit 表示上限，不是必须补齐的数量。

### 空结果

把查询改成“不存在的术语”，预期返回 `{ "items": [] }`，而不是 `isError: true`。这让 Host 能区分“查询成功但没有资料”和“Server 没有执行成功”。Agent 可以据此安全回答没有找到证据，而不是对基础设施做无意义重试。

### 参数错误

把 `limit` 改成 20。SDK 应返回输入验证错误，`searchNotes` 不会执行。再把 `query` 改成空白字符串，`trim().min(1)` 也应拒绝。参数错误通常可以由模型修正后重试，但要限制重试次数，避免同一错误循环。

## 给查询函数补一个最小测试

协议调试证明 Client 能调用 Server，但业务函数仍应有普通单元测试。Node 自带测试运行器足够验证当前纯函数。

在 `src/notes.test.mjs` 写入：


下面的代码把“给查询函数补一个最小测试”落到可观察行为。输入沿上文契约进入，关键分支改变状态，返回值再交给调用方；阅读时同时留意失败怎样向外传播。
```js
// 纯函数测试固定正常命中和成功空结果，不依赖 MCP 进程。
import assert from 'node:assert/strict'
import test from 'node:test'
import { searchNotes } from './notes.mjs'

// 正常查询必须返回唯一可见记录，并保留稳定 ID 供后续引用。
test('returns a visible matching note', () => {
  const result = searchNotes('访问', 5)

  assert.equal(result.length, 1)
  assert.equal(result[0]?.id, 'note-1')
})

// 无匹配是成功空结果，调用方不需要用异常表示“没有找到”。
test('returns an empty list when no note matches', () => {
  assert.deepEqual(searchNotes('不存在', 5), [])
})
```

第一个测试传入命中标题的词，检查结果数量和稳定 ID；第二个测试确认无结果是空数组。它们没有启动 MCP transport，因此失败时可以直接定位到业务查询。运行命令是 `node --test src/notes.test.mjs`，预期两个测试通过。

Schema 边界仍需通过 MCP Client 测试，因为纯函数不知道 `limit` 最大值。使用 `InMemoryTransport` 可以保留协议发现、调用和 Schema 校验，又不依赖子进程和浏览器。

在 `src/contract.test.mjs` 中建立一对相连的内存 transport。输入是同一个 Server 工厂；目标是验证正常、空结果和非法参数三种协议结果，并观察查询函数调用次数：

```js
// 契约测试通过内存传输连接 Client 与 Server，覆盖发现、调用、空结果和参数拒绝。
import assert from 'node:assert/strict'
import test from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createNotesServer } from './mcp.mjs'
import { searchNotes } from './notes.mjs'

test('keeps the search_notes contract at the MCP boundary', async () => {
  let repositoryCalls = 0
  const countedSearch = (query, limit) => {
    repositoryCalls += 1
    return searchNotes(query, limit)
  }

  const server = createNotesServer(countedSearch)
  const client = new Client({ name: 'contract-check', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ])

  try {
    // 先读取 Server 实际公开的工具列表，验证部署版本和客户端预期一致。
    const listed = await client.listTools()
    assert.deepEqual(listed.tools.map((tool) => tool.name), ['search_notes'])

    // 通过 MCP 边界调用工具，参数先过 Schema，结果再按不可信外部输入检查。
    const found = await client.callTool({
      name: 'search_notes',
      arguments: { query: '访问', limit: 3 },
    })
    assert.equal(found.structuredContent.items.length, 1)

    // 通过 MCP 边界调用工具，参数先过 Schema，结果再按不可信外部输入检查。
    const empty = await client.callTool({
      name: 'search_notes',
      arguments: { query: '不存在', limit: 3 },
    })
    assert.deepEqual(empty.structuredContent, { items: [] })

    const callsBeforeInvalid = repositoryCalls
    // 通过 MCP 边界调用工具，参数先过 Schema，结果再按不可信外部输入检查。
    const invalid = await client.callTool({
      name: 'search_notes',
      arguments: { query: '访问', limit: 20 },
    })
    assert.equal(invalid.isError, true)
    assert.equal(repositoryCalls, callsBeforeInvalid)
  // 无论断言成功还是失败都关闭两端连接，避免测试进程残留句柄。
  } finally {
    await client.close()
    await server.close()
  }
})
```

测试先连接 Client/Server 两端，再用 `listTools` 验证发现结果。两次合法调用让计数变为 2；第三次把 `limit` 设为 20，SDK 返回 `isError=true`，计数保持 2，证明请求没有触达查询函数。`finally` 无论断言是否失败都关闭两端，避免测试进程挂住。

运行 `node --test src/*.test.mjs`，预期三个测试全部通过。若工具列表失败，先查 Server 注册和连接；若列表正常但结构化结果失败，查 handler 与 `outputSchema`；若非法调用使计数增加，说明输入校验没有处在业务边界之前。分层测试的目的不是重复，而是让失败落到正确层。

## 换成真实 Repository 时要增加什么

当前示例只适合学习协议，不能直接当多用户知识服务。真实只读查询至少还要补：

1. 从可信连接或认证上下文取得用户身份；
2. 在查询层加入租户、范围、状态和版本过滤；
3. 为数据库或 HTTP 调用设置 Deadline 和取消；
4. 限制候选数量、单条长度和总响应字节；
5. 对日志脱敏，只记录工具名、耗时、状态和必要关联 ID；
6. 把外部内容标记为数据，防止提示注入被当成系统指令；
7. 记录 SDK 主版本、协议版本和工具契约版本。

一个简单判断是：删除所有模型调用后，这个 Server 的权限和错误语义仍应成立。若权限只写在 Prompt 里，说明边界放错了。

## 从本地目录到可分发命令

MCP 入门更适合按“介绍 → 原理 → 配置 → 实战 → 发布”推进：先在本机用 Inspector 验证行为，确认工具契约稳定后再考虑让别人用 `npx` 启动。发布不是把未验证的代码上传到 npm。

要让用户执行 `npx -y my-notes-mcp`，项目需要一个命令入口。输入是已经通过本地契约测试的 Server 源码，目标是把 npm 包名映射到可执行文件，同时限制发布内容并在发布前阻断失败测试。当前示例直接发布 `.mjs`，因此不需要虚构一个尚未配置的 TypeScript 构建步骤；下面的注释用于解释发布字段，实际 `package.json` 要移除注释：

```jsonc
{
  "name": "my-notes-mcp",
  "version": "0.1.0",
  // type=module 让 Node 按 ESM 加载 .mjs 入口，与源码模块语义保持一致。
  "type": "module",
  "bin": {
    "my-notes-mcp": "./src/server.mjs"
  },
  // 发布包只收录运行所需文件，避免把测试数据、凭证或本地缓存一起发布。
  "files": ["src", "README.md"],
  "scripts": {
    "test": "node --test src/*.test.mjs",
    "prepublishOnly": "npm test"
  }
}
```

`name` 是包的公开标识，`version` 用语义化版本记录契约变化；`type` 保持与源码一致；`bin` 把 npm 命令映射到入口；`files` 限制发布内容；`prepublishOnly` 在发布前先跑测试。真实入口文件还要带 `#!/usr/bin/env node` 并具有执行权限。这里使用 `jsonc` 只是为了让字段更容易讲解，真正的 `package.json` 必须是严格 JSON。

发布前先在临时目录安装包，验证它能在没有源码的情况下启动：

```bash
# 先打包，再在空目录安装压缩包；这样能发现 bin、files 或运行时依赖遗漏。
npm pack
mkdir /tmp/mcp-notes-smoke
# 进入刚创建的目录，后续依赖和配置都只写在这个示例中。
cd /tmp/mcp-notes-smoke
npm init -y
# 安装并锁定示例依赖，SDK 或 Schema 版本变化时可以复现差异。
npm install /path/to/my-notes-mcp-0.1.0.tgz
npx my-notes-mcp
```

`npm pack` 生成待发布压缩包；临时项目只安装这个包，验证 `bin`、`files` 和运行时依赖；最后的 `npx` 应能启动 stdio Server。若包在源码目录能运行、打包后不能运行，通常是 `files` 漏了 dist、入口没有执行权限或依赖被错误放进 devDependencies。

真正发布前还要确认包中没有 Token、绝对路径、内部域名和测试数据，并给每次工具契约变化增加版本说明。个人实验可以先使用本地 tarball；公开发布要按 npm 账户、组织策略和许可证要求执行，本文不代替你的发布授权。

## 常见问题

### 为什么要先写与 MCP 无关的 `searchNotes`？

协议适配和业务查询的变化速度不同。`searchNotes` 只负责“输入查询词和数量，返回允许公开的结果”，可以用普通单元测试快速验证；`registerTool` 负责 Schema、工具描述和协议结果。未来把内存数组换成 PostgreSQL 或搜索服务时，只需替换 Repository，不必重写 MCP 契约。若所有逻辑都堆进工具回调，参数错误、协议错误和数据查询错误会混在同一测试里，定位成本很高。

### `inputSchema` 已经校验参数，业务层还需要检查什么？

Schema 只证明字段形状符合约定，例如 query 非空、limit 在 1 到 10 之间。它不知道当前用户身份、可见范围、知识版本、查询成本和数据敏感级别。业务层仍要从可信上下文取得 Scope，在真正查询中加入过滤，为依赖设置 Deadline，并把内部对象映射成公开字段。返回后还要用输出 Schema、字节上限和权限复核阻止错误 Repository 泄露额外内容。

### Server 手工启动后一直不退出，是不是死锁了？

通常不是。stdio Server 启动后会等待 Host 从 stdin 发送握手和能力调用，因此没有 Client 时保持运行属于正常状态。可以用 Inspector 或测试 Client 连接验证；按 `Ctrl+C` 才会结束手工进程。若连接后仍无响应，先看 stderr 是否有模块加载错误，再检查 stdout 是否被日志污染和 SDK 生命周期是否匹配。此时不要通过在 stdout 添加 `console.log` 排查，因为那会破坏协议通道。

### 为什么同时返回 `content` 和 `structuredContent`？

`structuredContent` 给支持结构化结果的 Client 做稳定解析和 Schema 校验，`content` 则可供兼容客户端或界面展示。两者应表达同一业务结果，不能一边空数组、一边写“发生错误”。Host 应优先消费结构化字段，并对数组数量、字符串长度和来源位置再次校验。若只能收到文本内容，可以解析后验证，但不能把一段看似 JSON 的文本直接当作可信对象交给模型。

### Inspector 点通一次后，为什么还要写契约测试？

Inspector 证明当前机器上可以人工完成一次连接，却不能稳定覆盖空结果、非法参数、输出缺字段和升级回归。进程内 Client 测试会固定工具名、Schema、结构化结果以及“非法参数不会触达 Repository”这些行为；普通单元测试则隔离业务查询。两层测试一起使用，失败时才能判断是业务函数、工具注册还是 transport。发布前再补打包后的真实子进程冒烟，覆盖 `bin`、PATH 和依赖文件。

### 工具名称或字段变化时，什么时候需要升级版本？

删除字段、改变默认值、收紧参数范围、把空结果改成错误都可能影响 Host 的规划和结果解析，应视为契约变化。Server 自身版本、npm 包版本和 MCP 协议日期应分别记录；不要只改包版本却没有契约样例。兼容变更可以先同时提供新旧字段并标记废弃，破坏性变更则需要明确迁移窗口和契约测试。发布前用 tarball 在空目录安装，可以发现源码目录中的隐式依赖。

### 这个内存搜索为什么不能直接用于真实知识问答？

它只做子串匹配，没有中文分词、全文排序、租户 ACL、知识版本、连接超时和持久化，也没有控制总响应大小。真实实现至少要在查询层过滤 Scope 与 Release，使用合适的全文或向量索引，限制候选数量，并区分空结果、依赖失败和取消。教学示例的价值是看清 MCP 边界，而不是给出一个可直接上线的检索引擎；删除模型调用后，权限和错误语义仍然成立才是合格基础。
