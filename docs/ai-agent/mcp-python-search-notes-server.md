---
title: "Python 实战：实现同一份 search_notes MCP Server"
description: "使用当前 Python SDK 和类型提示实现同一工具契约，再比较装饰器、Schema 推导、测试与异步数据访问。"
category: ai-agent
part: "MCP：连接外部能力"
chapter: 11
tags: ["MCP", "Python", "Type Hint"]
prerequisites: ["Python 3.10+", "会读函数和类型提示", "理解 MCP Tool 的输入输出"]
outcomes: ["能实现 Python MCP Server", "能保持 Node 与 Python 工具契约一致"]
practice:
  type: implementation
  result: "完成并验证 Python 版只读 MCP Server"
  verify: ["同一输入得到同结构输出", "参数错误和无结果具有稳定语义"]
evidence: official-guided-operation
updated: 2026-08-07
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

跨语言实现最容易出现的错误是只对齐工具名。若一边把空结果当成功，另一边抛异常；一边限制 10 条，另一边不限制，Host 和模型就无法稳定处理。工具契约应有独立版本和契约测试。

## 创建隔离环境

示例要求 Python 3.10 以上，并使用 `uv` 管理虚拟环境。以下命令在空目录执行：

```bash
mkdir mcp-notes-python
cd mcp-notes-python
uv init --python 3.12
uv add "mcp[cli]" pydantic
```

第一行创建目录，第二行进入目录；`uv init` 建立 Python 项目和隔离环境；`uv add` 安装 MCP SDK、调试 CLI 和 Pydantic。`mcp[cli]` 中的 extra 提供 `mcp dev` 等命令，若只部署库可以安装不带 CLI 的 `mcp`。

运行 `uv run python --version` 应输出 3.10 或更高版本。项目应生成 `pyproject.toml` 和锁文件。真实项目要提交锁文件，并为 `mcp` 约束主版本；SDK v1 与 v2 API 不兼容，不能让环境在无审查时自动跨主版本升级。

## 用类型定义公开数据

新建 `notes.py`。`Note` 表示内部数据，`NoteResult` 表示工具允许返回的数据。将两者分开，能防止未来给内部模型增加敏感字段时被自动序列化出去。

```python
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
    sourceLocation: str


NOTES: list[Note] = [
    {"id": "n-1", "title": "系统访问", "body": "在账号中心提交访问申请。", "source_location": "guide/2"},
    {"id": "n-2", "title": "密码重置", "body": "先验证邮箱，再设置新密码。", "source_location": "guide/5"},
]


def search_visible_notes(query: str, limit: int) -> list[NoteResult]:
    keyword = query.strip().casefold()
    matched = [
        note
        for note in NOTES
        if keyword in f"{note['title']} {note['body']}".casefold()
    ]

    return [
        {
            "id": note["id"],
            "title": note["title"],
            "snippet": note["body"][:120],
            "sourceLocation": note["source_location"],
        }
        for note in matched[:limit]
    ]
```

`TypedDict` 只描述字典形状，不会在运行时创建 ORM 或数据库表。`search_visible_notes` 先用 `strip` 去掉首尾空白，再用 `casefold` 做更稳妥的大小写归一；第一段列表推导找出命中标题或正文的内部对象；第二段只取前 `limit` 条，并映射为公开字段。

输入校验还没有发生在这个函数里，因为它属于协议边界。这个函数假设调用方已经保证 query 非空、limit 合法，因此可以直接单元测试。真实 Repository 应在 SQL 或搜索服务中完成范围过滤，而不是先把所有数据读入内存再用 Python 过滤。

## 用 MCPServer 暴露工具

新建 `server.py`。当前 Python SDK v2 使用 `MCPServer`，装饰器会读取函数名称、Docstring、参数类型和约束，生成工具描述与输入 Schema。

```python
from typing import Annotated, TypedDict

from mcp.server import MCPServer
from pydantic import Field, StringConstraints

from notes import NoteResult, search_visible_notes

Query = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
Limit = Annotated[int, Field(ge=1, le=10)]


class SearchResult(TypedDict):
    items: list[NoteResult]


mcp = MCPServer("notes-readonly")


@mcp.tool()
def search_notes(query: Query, limit: Limit = 5) -> SearchResult:
    """Search visible read-only notes by title and body."""
    items = search_visible_notes(query, limit)
    return {"items": items}
```

模块加载时先创建两个带约束的类型别名，再创建 `MCPServer`。装饰器注册 `search_notes`，函数名成为工具名，Docstring 成为描述，`Query` 和 `Limit` 生成参数 Schema，`SearchResult` 描述返回形状。调用链是 Client 参数 -> Pydantic/类型约束 -> `search_visible_notes` -> `SearchResult` -> MCP 内容与结构化结果；每一层都只做一件事，读者可以单独替换内存数据而不改协议契约。

Client 调用时，SDK 先验证并清理参数。`query` 的首尾空格会被移除，空字符串和超过 100 字符的输入被拒绝；`limit` 必须是 1～10。校验通过后才执行函数，函数调用业务查询并返回 `{ "items": ... }`。

当前实现是同步函数，因为内存查询不会等待 I/O。连接异步数据库或 HTTP 服务时可以把它改成 `async def` 并 `await repository.search(...)`，但不要在异步函数里直接运行耗时 OCR 或同步网络库；那会阻塞事件循环，应改用异步客户端或受控线程池。

## 用 Inspector 启动和调用

官方 CLI 可以加载 `server.py` 中的 MCPServer，并启动 Inspector：

```bash
uv run mcp dev server.py
```

CLI 会启动开发连接和 Inspector。进入 Tools 后，应看到 `search_notes`，以及从类型约束生成的 `query`、`limit` Schema。调用：

```json
{
  "query": "访问",
  "limit": 3
}
```

Inspector 把这两个 JSON 字段作为 `search_notes` 的参数发送。SDK 先确认 `query` 和 `limit` 满足生成的 Schema，再调用 Python 函数。预期结构化结果包含一条 `n-1`；若参数不合法，查询函数不会执行。工具的 MCP 内容表示可能由 SDK 包装，业务字段仍应能还原为：

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

结果中的 `items` 对应 `SearchResult`，数组元素对应 `NoteResult`；`sourceLocation` 是可回查位置，`snippet` 是允许公开的正文摘要。SDK 负责协议内容块和结构化结果的编码，业务函数只返回有类型的 Python 对象。Host 侧应读取 SDK 提供的结构化字段，不要依赖调试界面里某段展示文本的排版。若结果缺少字段或类型错误，应将它视为 Server 契约故障，不让未知对象直接进入模型上下文。

## 用进程内 Client 做契约验证

Inspector 适合人工观察，自动测试可以绕过 stdio，直接把 Server 对象交给 Client。这类测试仍会经过 MCP 的工具注册、Schema 和结果编码，但不受子进程和 PATH 干扰。

新建 `check_client.py`：

```python
import asyncio

from mcp import Client

from server import mcp


async def main() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        print([tool.name for tool in tools.tools])

        result = await client.call_tool(
            "search_notes",
            {"query": "访问", "limit": 3},
        )
        print(result.structured_content)


asyncio.run(main())
```

`Client(mcp)` 创建进程内连接；进入 `async with` 时完成 initialize；`list_tools` 检查能力发现；`call_tool` 按工具名发送参数；离开上下文时自动关闭连接。命令 `uv run python check_client.py` 应先打印包含 `search_notes` 的工具名列表，再打印结构化结果。

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

下一篇会站到 Client 和部署侧，解释工具列表怎样交给模型、连接怎样超时和关闭、远程 MCP 怎样认证，以及为什么任何 Server 返回值都要按不可信内容处理。
