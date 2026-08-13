---
title: Python 实战：实现同一份 search_notes MCP Server
description: 使用 Python、MCP 2.0、Annotated 约束和进程内 Client 实现同一工具契约。
category: ai-agent
part: Tool、MCP、Skill 与 SubAgent
chapter: 54
tags:
  - MCP
  - Python
  - Pydantic
prerequisites:
  - Python
  - 会读函数和类型提示
  - 理解 MCP Tool 契约
outcomes:
  - 能实现 Python MCP Server
  - 能保持 Node 与 Python 行为一致
practice:
  type: implementation
  result: 完成并验证 Python 版只读 MCP Server
  verify:
    - 同一输入得到同结构输出
    - 参数错误和无结果具有稳定语义
evidence: official-guided-operation
updated: 2026-08-11T00:00:00.000Z
lastUpdated: false
---
# Python 实战：实现同一份 search_notes MCP Server

这一篇不用换业务题目。我们仍然实现 `search_notes(query, limit)`：输入查询词，输出可见笔记列表。这样可以专注比较 Python 与 Node.js 的 SDK 写法，而不是被两套业务规则干扰。

Python 版会使用类型提示和 Pydantic 约束生成工具 Schema，使用普通函数完成内存查询，再用官方 CLI 和一个进程内 Client 验证。最终行为要与 Node 版一致：正常查询返回列表、没有命中返回空数组、越界参数在查询前被拒绝。

## 先确认契约没有偷偷变化

| 项目 | Node 版 | Python 版 |
| --- | --- | --- |
| 工具名 | `search_notes` | `search_notes` |
| `query` | 去空格后 1～100 字符 | 去空格后 1～100 字符 |
| `limit` | 整数 1～10，默认 5 | 整数 1～10，默认 5 |
| 无结果 | `items: []` | `items: []` |
| 数据权限 | 示例只有匿名内存数据 | 示例只有匿名内存数据 |
| 写操作 | 无 | 无 |

跨语言实现最容易出现的错误是只对齐工具名。若一边把空结果当成功，另一边抛异常；一边限制 10 条，另一边不限制，Host 和模型就无法稳定处理。**工具契约**应有独立版本和契约测试。

## 创建隔离环境

示例固定 Python、`mcp==2.0.0`，并使用 `uv` 管理虚拟环境。固定版本是为了让导入路径、结构化结果字段和现代/Legacy 协议行为可以被复现；以后升级时先跑契约测试，再改文章和生产依赖。

```bash
# 虚拟环境隔离示例依赖；锁定 MCP SDK 版本后，工具 Schema 和测试结果才可复现。
mkdir mcp-notes-python
cd mcp-notes-python
uv init --python 3
uv add "mcp[cli]==2.0.0" "pydantic>=2.13,<3"
```

第一行创建目录，第二行进入目录；`uv init` 建立 Python 项目和隔离环境；`uv add` 安装 MCP 2.0 SDK、调试 CLI 和 Pydantic 2。`mcp[cli]` 的 extra 提供 `mcp dev` 等命令，若部署环境只运行 `server.py`，可以评估是否移除 CLI extra。

运行 `uv run python --version` 应输出 `Python.x`，`uv run python -c "from importlib.metadata import version; print(version('mcp'))"` 应输出 `2.0.0`。项目会生成 `pyproject.toml` 和锁文件。真实项目要提交锁文件；SDK v1 与 v2 API 和协议支持范围不同，不能让环境在无审查时自动跨主版本升级。

## 用类型定义公开数据

创建对应测试文件。`Note` 表示内部数据，`NoteResult` 表示工具允许返回的数据。将两者分开，能防止未来给内部模型增加敏感字段时被自动序列化出去。

下面把“用类型定义公开数据”落成最小实现。代码关注“Note 表示内部记录，NoteResult 只保留允许通过工具返回的公开字段”；输入从函数参数或上文定义的状态对象进入，关键分支负责校验或修改状态，返回值再交给后续调用。

```python
# Note 表示内部记录，NoteResult 只保留允许通过工具返回的公开字段。
from typing import TypedDict

class Note(TypedDict):
    id: str
    title: str
    body: str
    source_location: str

class NoteResult(TypedDict):
    id: str
    title: str
    snippet: str
    location: str

NOTES: list[Note] = [
    {"id": "note-1", "title": "访问申请", "body": "在账号中心提交申请。", "source_location": "guide/2"},
    {"id": "note-2", "title": "密码重置", "body": "验证邮箱后设置新密码。", "source_location": "guide/5"},
]

# 查询函数只接收业务查询参数；可信 Scope、版本和上限由调用侧一并传入。
def search_visible_notes(query: str, limit: int) -> list[NoteResult]:
    # 去除首尾空白并统一大小写，标题和正文使用同一种匹配规则。
    keyword = query.strip().casefold()
    # 先在标题与正文中完成不区分大小写的匹配，空命中保留为空列表。
    matched = [
        note
        for note in NOTES
        if keyword in f"{note['title']} {note['body']}".casefold()
    ]

    # 只返回 Tool 契约允许的字段，并限制正文摘要长度；内部 body 不直接暴露。
    return [
        {
            "id": note["id"],
            "title": note["title"],
            "snippet": note["body"][:120],
            "location": note["source_location"],
        }
        for note in matched[:limit]
    ]
```

`TypedDict` 只描述字典形状，不会在运行时创建 ORM 或数据库表。`search_visible_notes` 先用 `strip` 去掉首尾空白，再用 `casefold` 做更稳妥的大小写归一；第一段列表推导找出命中标题或正文的内部对象；第二段只取前 `limit` 条，并映射为公开字段。

输入校验还没有发生在这个函数里，因为它属于协议边界。这个函数假设调用方已经保证 query 非空、limit 合法，因此可以直接单元测试。真实 Repository 应在 SQL 或搜索服务中完成范围过滤，而不是先把所有数据读入内存再用 Python 过滤。

## 用 MCPServer 暴露工具

创建对应测试文件。当前 Python SDK v2 使用 `MCPServer`，装饰器会读取函数名称、Docstring、参数类型和约束，生成工具描述与输入 Schema。

下面把“用 MCPServer 暴露工具”落成最小实现。代码关注“Annotated 约束先生成输入 Schema；参数通过校验后，工具函数才调用**只读**查询”；输入从函数参数或上文定义的状态对象进入，关键分支负责校验或修改状态，返回值再交给后续调用。

```python
# Annotated 约束先生成输入 Schema；参数通过校验后，工具函数才调用只读查询。
from typing import Annotated, TypedDict

from mcp.server.mcpserver import MCPServer
from pydantic import Field, StringConstraints

from notes import NoteResult, search_visible_notes

Query = Annotated[
    str,
    # SDK 会把这些约束写入 Tool 输入 Schema，调用函数前先完成校验。
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
Limit = Annotated[int, Field(ge=1, le=10)]

class SearchResult(TypedDict):
    items: list[NoteResult]

# Server 名称会出现在初始化信息中，Host 可以据此识别当前实现。
mcp = MCPServer("notes-readonly")

# 装饰器把普通函数注册为 MCP Tool，并从 Annotated 类型生成参数 Schema。
@mcp.tool(structured_output=True)
def search_notes(query: Query, limit: Limit = 5) -> SearchResult:
    """Search visible read-only notes by title and body."""
    # 只读查询返回公开结果列表，结构化输出不会包含内部记录对象。
    items = search_visible_notes(query, limit)
    return {"items": items}

if __name__ == "__main__":
    # stdio 模式从标准输入读取 JSON-RPC，并把协议响应写回标准输出。
    mcp.run(transport="stdio")
```

模块加载时先创建两个带约束的类型别名，再创建 `MCPServer`。装饰器注册 `search_notes`，函数名成为工具名，Docstring 成为描述，`Query` 和 `Limit` 生成参数 Schema，`SearchResult` 描述返回形状；`structured_output=True` 要求 SDK提供机器可读结果。最后的主程序保护只在直接执行文件时占用 **stdio**，测试导入模块时不会启动阻塞服务。

调用链是 Client 参数 -> Pydantic/类型约束 -> `search_visible_notes` -> `SearchResult` -> MCP 内容与结构化结果。每一层只做一件事，读者可以单独替换内存数据而不改协议契约。

Client 调用时，SDK 先验证并清理参数。`query` 的首尾空格会被移除，空字符串和超过 100 字符的输入被拒绝；`limit` 必须是 1～10。校验通过后才执行函数，函数调用业务查询并返回 `{ "items": ... }`。

当前实现是同步函数，因为内存查询不会等待 I/O。连接异步数据库或 HTTP 服务时可以把它改成 `async def` 并 `await repository.search(...)`，但不要在异步函数里直接运行耗时 OCR 或同步网络库；那会阻塞事件循环，应改用异步客户端或受控线程池。

## 用 Inspector 启动和调用

官方 CLI 可以加载 `server.py` 中的 MCPServer，并启动 Inspector：

下面的命令接收本节“用 Inspector 启动和调用”已经说明的目录、依赖或参数，并按出现顺序执行。运行前先确认当前路径，观察每一步退出码和后文列出的可见结果；前一步失败时不要继续。
```bash
# 开发命令加载 server.py，并启动 Inspector 观察工具 Schema 与结构化返回值。
uv run mcp dev server.py
```

这些命令从 `uv` 开始按顺序运行，输出用于确认“用 Inspector 启动和调用”是否成立。任何命令返回非零退出码都表示当前步骤没有完成，应先检查路径、环境和参数；不要把后续输出当成成功证据。

CLI 会启动开发连接和 Inspector。进入 Tools 后，应看到 `search_notes`，以及从类型约束生成的 `query`、`limit` Schema。调用：

```jsonc
{
  // query 是需要检索的业务文本，协议层会先检查非空与长度限制。
  "query": "访问",
  // limit 控制本次最多返回多少条，不能依赖查询函数事后截断非法值。
  "limit": 3
}
```

Inspector 把这两个 JSON 字段作为 `search_notes` 的参数发送。SDK 先确认 `query` 和 `limit` 满足生成的 Schema，再调用 Python 函数。预期结构化结果包含一条 `note-1`；若参数不合法，查询函数不会执行。工具的 MCP 内容表示可能由 SDK 包装，业务字段仍应能还原为：

```jsonc
{
  // items 只包含公开结果字段；内部权限、存储路径和原始对象不会透出。
  "items": [
    {
      // id 是公开记录的稳定标识，客户端可用它去重并回查来源。
      "id": "note-1",
      "title": "访问申请",
      "snippet": "在账号中心提交申请。",
      "location": "guide/2"
    }
  ]
}
```

结果中的 `items` 对应 `SearchResult`，数组元素对应 `NoteResult`；`location` 是可回查位置，`snippet` 是允许公开的正文摘要。SDK 负责协议内容块和结构化结果的编码，业务函数只返回有类型的 Python 对象。Host 侧应读取 SDK 提供的结构化字段，不要依赖调试界面里某段展示文本的排版。若结果缺少字段或类型错误，应将它视为 Server 契约故障，不让未知对象直接进入模型上下文。

## 用进程内 Client 做契约验证

Inspector 适合人工观察，自动测试可以绕过 stdio，直接把 Server 对象交给 Client。这类测试仍会经过 MCP 的工具注册、Schema 和结果编码，但不受子进程和 PATH 干扰。

创建对应测试文件：

为了验证“用进程内 Client 做契约验证”，下面的测试把“进程内 Client 仍经过工具注册、**参数校验**和结果编码，但排除了 PATH 与子进程干扰”变成可执行断言。每个用例自己构造输入，并用断言固定返回值或失败状态；某条测试失败时，可以从用例名直接定位到被破坏的契约。

```python
# 进程内 Client 仍经过工具注册、参数校验和结果编码，但排除了 PATH 与子进程干扰。
import asyncio

from mcp.client.client import Client

from server import mcp

# 进程内 Client 先发现工具再调用同一 Server，用于验证注册、Schema 和结构化结果。
async def main() -> None:
    async with Client(mcp) as client:
        # 先读取对端实际公开的能力，部署版本不一致会在真正调用前暴露。
        tools = await client.list_tools()
        print([tool.name for tool in tools.tools])

        # 通过协议边界发起调用；返回值还要检查错误标记和结构化字段。
        result = await client.call_tool(
            "search_notes",
            {"query": "访问", "limit": 3},
        )
        print(result.structured_content)

asyncio.run(main())
```

`Client(mcp)` 创建进程内连接；进入 `async with` 时把 Client 直接接到 Server dispatcher，不启动子进程，也不经过网络 JSON-RPC 帧或 `initialize`。`list_tools` 仍会经过工具注册处理器，`call_tool` 仍会执行输入 Schema、工具回调和输出编码；离开上下文时自动关闭连接。命令 `uv run python check_client.py` 应先打印包含 `search_notes` 的工具名列表，再打印结构化结果。

这个测试证明“Server 契约和处理器正确”，不能证明 stdio 命令、PATH 或远程 HTTP/TLS 正确。前者用进程内 Client 快速回归，后者再用 Inspector 或独立进程冒烟测试；两者不是重复测试同一层。

如果 `call_tool` 方法或结果字段因 SDK 小版本变化而不同，应以锁定版本的 API 文档和类型提示为准，不要用 `getattr` 静默兼容未知形状。迁移应让测试明确失败，才能发现契约变化。调试时先确认 `list_tools()` 能列出工具，再确认 `call_tool()` 是否发送参数，最后查看 `structured_content`；若工具列表为空，问题在注册或初始化；若列表正常而调用失败，才进入 Schema、业务函数和 Repository。

## 三种结果必须分别测试

### 正常命中

`query="访问", limit=3` 应返回一条结果，字段与 Node 版一致。测试重点是公开字段和稳定 ID，不要把整段序列化文本做快照，否则空格变化也会造成无意义失败。

### 无结果

`query="不存在"` 应返回 `items: []`。这证明业务查询完成，只是没有证据。Host 可以据此回答“未找到”，不应自动重试同一请求。

### 参数拒绝

`limit=20` 或 `query="   "` 应被 Schema 拒绝，`search_visible_notes` 不执行。错误属于可修正调用错误。若 Repository 超时，则应该返回工具执行错误或抛出被 SDK转换的异常，并在服务端日志中保留关联 ID。

## 为什么不能只依赖类型提示

类型提示和 Pydantic 约束解决的是外部输入形状，解决不了：

- 当前用户能看哪些数据；
- 一次调用最多消耗多少数据库与模型资源；
- 返回片段是否包含敏感字段；
- 下游服务超时后是否重试；
- 日志是否泄露查询内容；
- 工具结果是否含提示注入。

这些仍要在认证中间件、Repository、Deadline、结果映射和审计中实现。类型正确的 `tenant_id: str` 仍然可能是攻击者伪造的，因此身份不能来自模型参数。

## Node 和 Python 怎样选择

| 考量 | Node.js | Python |
| --- | --- | --- |
| 现有服务栈 | TypeScript 服务可直接复用类型和 Repository | AI、数据和 Python 服务更容易复用 |
| Schema | Zod 等 Standard Schema | 类型提示与 Pydantic |
| 异步 I/O | Promise、AbortSignal | asyncio、取消与超时上下文 |
| 阻塞风险 | 同步 CPU 工作阻塞事件循环 | 同步 CPU/I/O 同样会阻塞事件循环 |
| 协议能力 | 取决于 SDK 与锁定版本 | 取决于 SDK 与锁定版本 |

不要因为“AI 常用 Python”就复制一套新的权限逻辑。最稳妥的选择通常是复用已有业务服务与测试。若 Node 和 Python 都需要暴露同一工具，应共享契约样例和期望结果，而不是共享无法跨语言运行的内部实现。

## 完成后的检查表

- `search_notes` 的名称、参数、默认值、字段和失败语义与 Node 版一致；
- 能说明类型约束在业务函数之前执行；
- 能区分同步纯函数和异步数据访问；
- Inspector 能看到工具 Schema，进程内 Client 能列出并调用工具；
- 无结果返回空数组，参数错误不会进入 Repository；
- 知道类型提示不承担认证、权限、超时和审计。

## 从脚本运行到 uvx 分发

本地 `uv run mcp dev server.py` 适合开发和 Inspector 调试；如果要让别人安装后直接运行，Python 项目还需要明确入口、构建产物和包元数据。`uvx` 只是从包索引创建隔离环境并执行命令，不会替你检查工具权限。

分发前先做一次不依赖源码目录的验证：构建 wheel，在临时目录创建全新环境，安装 wheel，再使用 CLI 启动。验证结果应包含工具列表、正常查询和参数错误三类用例。不要在个人机器上直接把带密钥的开发目录打包。

Python 版与 Node 版的发布差异主要在运行时入口和依赖管理，工具契约不应该因此变化。用户最终看到的仍然是 `search_notes(query, limit)`，而不是某个语言内部的函数名。

## 常见问题

### 类型提示会在运行时自动保护工具吗？

普通类型提示主要服务静态分析，是否生成运行时校验取决于 SDK 如何读取 `Annotated`、Pydantic 约束和返回类型。本文使用带长度与范围的类型生成输入 Schema，Client 参数先通过校验才进入工具函数。但认证、租户 Scope、知识版本和资源预算不属于类型系统，仍需服务端注入并在 Repository 执行。最可靠的证据是契约测试证明非法输入没有调用查询函数，而不是只看编辑器没有报错。

### 为什么业务查询函数使用同步 `def`，工具以后能改成 `async def` 吗？

内存列表没有等待操作，使用同步函数更直接。接入异步数据库或 HTTP 客户端后，工具可以改为 `async def` 并等待 Repository；但同步 OCR、CPU 密集解析或阻塞网络库不能直接塞进事件循环，否则一个调用会拖住所有连接。此类工作应放到受控线程池、进程池或后台任务，并传播 Deadline 与取消。函数是否异步取决于依赖行为，不取决于“Agent 项目都应该 async”。

### 进程内 Client 测试能替代 Inspector 和 stdio 冒烟吗？

不能。进程内 Client 覆盖工具注册、参数 Schema、处理函数和结果编码，运行快且失败容易定位；它绕过了子进程启动、工作目录、PATH、stdin/stdout framing 和进程关闭。Inspector 适合观察真实工具列表和手工错误，独立进程冒烟则证明 Host 能按配置启动 Server。三者覆盖不同层，至少保留契约测试和一个真实 transport 测试，避免出现“函数正确但配置无法启动”的假通过。

### Python 与 Node 实现如何证明契约一致？

不要比较源码长短，应共享一组语言无关的输入输出样例：正常命中、空结果、空白 query、limit 越界、未知工具、结果缺字段和依赖超时。两边都断言工具名、默认值、字段类型、最大数量和错误类别。若某个 SDK 用异常表示参数错误，另一个用 `isError`，Host 适配层可以归一化，但业务语义必须一致。契约变化应有独立版本，不依赖语言包的内部版本号推断。

### 为什么空结果应返回 `items: []` 而不是抛异常？

查询成功但当前范围没有匹配项是正常业务状态，Host 可以选择改写查询、继续其他检索或说明证据不足。异常表示参数、权限、依赖或执行过程没有正常完成，需要不同的恢复策略。若把空结果抛成错误，重试器可能反复查询同一内容；若把超时伪装成空数组，模型又会错误断言资料不存在。测试中应分别制造无匹配数据与 Repository 超时，确保两条路径不会合并。

### `uvx` 能让一个脚本自动变成可分发 MCP 吗？

不能。`uvx` 负责在隔离环境安装包并运行它声明的命令，项目仍需要正确的包元数据、入口、依赖、许可证和构建产物。分发前要构建 wheel，在不含源码的临时目录安装，再验证工具发现与调用；同时扫描包内容，避免带入密钥、绝对路径或测试数据。若只在源码目录用 `uv run` 成功，尚未证明其他用户能通过包入口启动。

### 什么时候应该选择 Python 版而不是 Node 版？

优先复用已有业务栈、Repository 和测试。AI 数据处理、Python 服务或 Pydantic 契约已经成熟时，Python 能减少跨语言适配；工具本来就在 TypeScript 服务中时，Node 更自然。不要为了语言偏好复制一套认证与权限逻辑。若团队确实维护双实现，应把工具契约样例和行为测试设为共同边界，让语言差异只停留在 SDK 与部署层。
