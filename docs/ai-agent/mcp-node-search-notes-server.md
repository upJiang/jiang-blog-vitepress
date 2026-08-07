---
title: "Node.js 实战：实现一个只读 search_notes MCP Server"
description: "使用当前 TypeScript SDK 建立 stdio Server，注册带 Schema 的只读工具，并用 Inspector 验证正常、空结果和参数错误。"
category: ai-agent
part: "MCP：连接外部能力"
chapter: 10
tags: ["MCP", "Node.js", "TypeScript", "Zod"]
prerequisites: ["Node.js 20+", "会读 async 函数", "理解 MCP Tool 的输入输出"]
outcomes: ["能实现并运行一个 MCP Server", "能解释 stdout、stderr 和工具错误语义"]
practice:
  type: implementation
  result: "完成一个可由 Inspector 调用的 Node.js MCP Server"
  verify: ["合法查询返回结构化笔记", "越界参数在执行查询前被拒绝"]
evidence: official-guided-operation
updated: 2026-08-07
---
# Node.js 实战：实现一个只读 search_notes MCP Server

这一篇会真正跑起一个 MCP Server。输入是查询词和结果数量，输出是匹配的匿名笔记；Server 不写文件、不访问私有系统，也不让模型自己决定数据范围。

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
| `sourceLocation` | 字符串 | 可供引用的匿名位置 |

空结果不是异常，因为“资料中没有”是一次成功查询的正常业务结果。参数不合法是调用错误，应在进入查询前被 Schema 拒绝。Repository 超时则是工具执行错误，需要与空结果区分。

## 环境和目录

示例使用 Node.js 20 以上、TypeScript SDK v2、Zod v4 和 `tsx`。下面的命令在一个空目录中运行，会创建独立项目，不会改动现有应用。

```bash
mkdir mcp-notes-node
cd mcp-notes-node
npm init -y
npm pkg set type=module
npm install @modelcontextprotocol/server zod tsx
mkdir src
```

第一行创建项目目录，第二行进入目录；`npm init -y` 生成 `package.json`；`type=module` 让 Node 按 ES Module 解析导入；第四行安装 Server SDK、Schema 库和 TypeScript 运行器；最后创建源码目录。预期看到依赖安装成功，并且 `package.json` 中出现 `"type": "module"`。

如果当前 Node 版本低于 20，先切换版本再继续。SDK 的主版本会演进，真实项目应锁定依赖并阅读迁移说明，不要依赖不受控制的全局安装。

## 先写一个与 MCP 无关的查询函数

为什么不直接在工具回调里写 `filter`？因为业务查询和协议适配是两种职责。纯查询函数可以单独测试，未来把内存数组换成数据库时，也不需要改工具契约。

在 `src/notes.ts` 写入下面代码。输入是一组笔记、查询词和数量；输出只保留允许公开的字段。

```ts
export interface Note {
  id: string
  title: string
  body: string
  sourceLocation: string
}

export interface NoteResult {
  id: string
  title: string
  snippet: string
  sourceLocation: string
}

export const notes: Note[] = [
  { id: 'n-1', title: '系统访问', body: '在账号中心提交访问申请。', sourceLocation: 'guide/2' },
  { id: 'n-2', title: '密码重置', body: '先验证邮箱，再设置新密码。', sourceLocation: 'guide/5' },
]

export function searchNotes(query: string, limit: number): NoteResult[] {
  const keyword = query.trim().toLocaleLowerCase()

  return notes
    .filter((note) => `${note.title} ${note.body}`.toLocaleLowerCase().includes(keyword))
    .slice(0, limit)
    .map(({ id, title, body, sourceLocation }) => ({
      id,
      title,
      snippet: body.slice(0, 120),
      sourceLocation,
    }))
}
```

执行顺序是：`searchNotes` 先清理查询词，再把标题和正文合并做大小写无关匹配，然后按 `limit` 截断，最后把内部 `body` 映射为最长 120 字符的 `snippet`。返回类型没有内部字段，调用方也无法借工具修改笔记。

这只是教学用内存搜索，不具备中文分词、全文索引或租户权限。换成数据库时，函数签名可以保持不变，但 Repository 必须接收来自可信连接的身份和范围，不能接受模型自报的用户 ID。

## 注册 MCP Tool

现在建立协议层。`McpServer` 保存能力声明；`registerTool` 把工具名、描述、Schema 和处理函数绑定起来；`serveStdio` 负责从标准输入读取协议消息并把响应写到标准输出。这里使用的是 TypeScript SDK v2 的工厂式 stdio 入口：每条连接由工厂创建一个 Server 实例，生命周期由 SDK 管理。

在 `src/index.ts` 写入：

```ts
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { searchNotes } from './notes.js'

function createServer(): McpServer {
  const server = new McpServer({ name: 'notes-readonly', version: '1.0.0' })

  server.registerTool(
    'search_notes',
    {
      description: 'Search visible read-only notes by title and body',
      inputSchema: z.object({
        query: z.string().trim().min(1).max(100),
        limit: z.number().int().min(1).max(10).default(5),
      }),
    },
    async ({ query, limit }) => {
      const items = searchNotes(query, limit)

      return {
        content: [
          { type: 'text', text: JSON.stringify({ items }, null, 2) },
        ],
      }
    },
  )

  return server
}

void serveStdio(createServer)
console.error('notes-readonly MCP server is waiting on stdio')
```

从调用顺序看，`serveStdio` 等待 Client 发来的 `initialize`；握手完成后调用 `createServer`，工厂创建 Server 并注册 `search_notes`；Client 调用工具时，SDK 先用 Zod 校验 `query` 和 `limit`，校验通过才进入异步处理函数；处理函数调用 `searchNotes`，再把 `{ items }` 序列化成 MCP 文本内容块返回。输入是 JSON-RPC 的工具参数，处理中间状态是过滤后的 `NoteResult[]`，输出是一个内容块数组；Schema、查询函数和协议输出分别失败时，排查位置也分别落在参数层、Repository 层和 transport 层。

`query` 的 `trim()`、长度限制和 `limit` 的整数范围都在 Schema 中。这样 `limit: 20` 不会进入数据查询。工具处理函数虽然是 `async`，当前内存查询没有等待；未来替换为数据库调用时，可以直接 `await repository.search(...)`。

最后一行使用 `console.error`，因为 stdio Server 的 stdout 是协议通道。若改成 `console.log`，日志会混入 JSON-RPC 响应，Client 可能报解析错误。stderr 用于诊断，不参与协议。

## 启动为什么看起来“没有反应”

在项目根目录运行：

```bash
npx tsx src/index.ts
```

预期在终端看到：

```text
notes-readonly MCP server is waiting on stdio
```

随后程序保持运行，没有显示工具列表。这是正常状态：stdio Server 正在等 Client 从 stdin 发起 `initialize`。按 `Ctrl+C` 停止它。真正使用时不需要先手工启动，Inspector 或 Host 会负责创建子进程。

如果出现 `Cannot find package`，先确认命令在项目根目录执行且安装完成；如果出现 ES Module 导入错误，检查 `package.json` 的 `type`；如果 Client 报 JSON 解析错误，检查所有普通日志是否写到了 stderr。若进程启动但 `tools/list` 没有返回，先检查 Server 是否在等待 `initialize`，再检查工厂是否抛出异常；不要先改业务查询，因为此时查询函数还没有被调用。

## 用 Inspector 验证工具

Inspector 是专门连接 MCP Server 的调试客户端。下面的命令会启动 Inspector，再由 Inspector 启动 `npx tsx src/index.ts` 这个 Server。运行前确保刚才手工启动的进程已经关闭。

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

浏览器打开后，先点击连接，再进入 Tools，选择 `search_notes`。工具面板中的 `query` 和 `limit` 来自 Zod Schema，不是 Inspector 猜出来的。

### 正常结果

输入：

```json
{
  "query": "访问",
  "limit": 3
}
```

预期内容块中的文本是：

```json
{
  "items": [
    {
      "id": "n-1",
      "title": "系统访问",
      "snippet": "在账号中心提交访问申请。",
      "sourceLocation": "guide/2"
    }
  ]
}
```

调用先通过 Schema，再进入 `searchNotes`；字符串“访问”命中标题；`slice(0, 3)` 保留结果；映射后不再暴露内部 `body` 字段。结果条数少于 limit 是正常的，limit 表示上限，不是必须补齐的数量。

### 空结果

把查询改成“不存在的术语”，预期返回 `{ "items": [] }`，而不是 `isError: true`。这让 Host 能区分“查询成功但没有资料”和“Server 没有执行成功”。Agent 可以据此安全回答没有找到证据，而不是对基础设施做无意义重试。

### 参数错误

把 `limit` 改成 20。SDK 应返回输入验证错误，`searchNotes` 不会执行。再把 `query` 改成空白字符串，`trim().min(1)` 也应拒绝。参数错误通常可以由模型修正后重试，但要限制重试次数，避免同一错误循环。

## 给查询函数补一个最小测试

协议调试证明 Client 能调用 Server，但业务函数仍应有普通单元测试。Node 自带测试运行器足够验证当前纯函数。

在 `src/notes.test.ts` 写入：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { searchNotes } from './notes.js'

test('returns a visible matching note', () => {
  const result = searchNotes('访问', 5)

  assert.equal(result.length, 1)
  assert.equal(result[0]?.id, 'n-1')
})

test('returns an empty list when no note matches', () => {
  assert.deepEqual(searchNotes('不存在', 5), [])
})
```

第一个测试传入命中标题的词，检查结果数量和稳定 ID；第二个测试确认无结果是空数组。它们没有启动 MCP transport，因此失败时可以直接定位到业务查询。运行命令是 `node --import tsx --test src/notes.test.ts`，预期两个测试通过。

Schema 边界仍需通过 Inspector 或 MCP Client 测试，因为纯函数不知道 `limit` 最大值。分层测试的目的不是重复，而是让失败落到正确层。

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

## 完成后的自测

- 能解释 `McpServer`、`registerTool`、Zod Schema、处理函数和 `serveStdio` 的调用顺序；
- 能说明为什么 stdout 不能打印普通日志；
- 正常查询、空结果、参数错误得到三种不同结果；
- 纯查询函数有独立测试，协议层可以用 Inspector 检查；
- 知道内存搜索缺少中文分词、权限、超时和持久化，不能伪装成完整检索服务。

## 从本地目录到可分发命令

MCP 入门更适合按“介绍 → 原理 → 配置 → 实战 → 发布”推进：先在本机用 Inspector 验证行为，确认工具契约稳定后再考虑让别人用 `npx` 启动。发布不是把未验证的代码上传到 npm。

要让用户执行 `npx -y my-notes-mcp`，项目需要一个构建产物和命令入口。下面只展示关键字段，路径要根据自己的编译目录替换：

```jsonc
{
  "name": "my-notes-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "my-notes-mcp": "./dist/index.js"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "node --import tsx --test src/*.test.ts",
    "prepublishOnly": "npm run test && npm run build"
  }
}
```

`name` 是包的公开标识，`version` 用语义化版本记录契约变化；`type` 保持与源码一致；`bin` 把 npm 命令映射到编译后的入口；`files` 限制发布内容，避免把本地配置和测试数据上传；`prepublishOnly` 在发布前先跑测试和构建。这里使用 `jsonc` 是因为说明中保留了注释语义，真实 `package.json` 必须是严格 JSON。

发布前先在临时目录安装包，验证它能在没有源码的情况下启动：

```bash
npm pack
mkdir /tmp/mcp-notes-smoke
cd /tmp/mcp-notes-smoke
npm init -y
npm install /path/to/my-notes-mcp-0.1.0.tgz
npx my-notes-mcp
```

`npm pack` 生成待发布压缩包；临时项目只安装这个包，验证 `bin`、`files` 和运行时依赖；最后的 `npx` 应能启动 stdio Server。若包在源码目录能运行、打包后不能运行，通常是 `files` 漏了 dist、入口没有执行权限或依赖被错误放进 devDependencies。

真正发布前还要确认包中没有 Token、绝对路径、内部域名和测试数据，并给每次工具契约变化增加版本说明。个人实验可以先使用本地 tarball；公开发布要按 npm 账户、组织策略和许可证要求执行，本文不代替你的发布授权。

下一篇会用当前 Python SDK 实现相同契约。比较重点不是语法长短，而是两种语言如何从类型信息生成 Schema、怎样组织业务函数，以及如何保持跨实现行为一致。
