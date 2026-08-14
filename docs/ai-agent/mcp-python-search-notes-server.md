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

MCP Server 是把业务能力适配为 MCP Tool、Resource 或 Prompt 的程序。它位于 Client 与真实数据源之间：对外声明 Schema、校验协议输入、调用业务层并编码结果；对内仍要依赖 Repository、认证和权限策略。Server 不是数据库，也不能把模型传来的 `user_id` 当成可信身份。

这里用 Python SDK 2.0 实现只读 `search_notes`，观察工具注册、参数校验、结构化结果和协议测试怎样落到同一个 Server。完整工程在 `examples/mcp-search-notes/python/`，并与 Node Server 共用 `contracts/search-notes.json` 和 `fixtures/notes.json`。共享的是业务语义，不要求两套 SDK 生成字节完全相同的 JSON Schema。

## 语言无关的 Tool 契约

`search_notes` 只有两个模型可控参数：

```json
{
  "query": "release",
  "limit": 5
}
```

`query` 不能为空，`limit` 是 1 到 20 的整数，默认 5。成功结果始终使用同一外形：

```json
{
  "items": [
    {
      "id": "n-1",
      "title": "Release checklist",
      "excerpt": "Confirm migration and rollback before release."
    }
  ]
}
```

没有命中时返回 `{ "items": [] }`。这仍是成功查询，不是异常。用户身份、租户 Scope、Release 和 Deadline 不在 Tool 参数里，它们应由 Server 从可信调用上下文注入。否则模型只要改一个参数就可能越权。

## 创建可复现的 Python 环境

伴随工程要求 Python 3.10 或更高版本，锁定 `mcp==2.0.0`：

```bash
# 进入已锁定 Python 依赖的伴随工程，再按 uv.lock 创建环境。
cd examples/mcp-search-notes/python
uv sync --frozen
```

`uv.lock` 固定 SDK 与间接依赖。这里的 2.0.0 是 Python 包版本，协议主线是 `2026-07-28`，两者不能互换。升级依赖后先跑契约测试，再更新文章中涉及的导入与行为说明。

## 用 Pydantic 表达公开数据

输入边界和输出模型放在 `src/search_notes/models.py`：

```python
from typing import Annotated

from pydantic import BaseModel, Field


# 输入约束会同时生成 Tool Schema，并在函数执行前拒绝非法值。
Query = Annotated[str, Field(min_length=1)]
Limit = Annotated[int, Field(ge=1, le=20)]


class NoteResult(BaseModel):
    # 公开结果只包含 Client 可以看到的字段，不直接暴露存储记录。
    id: str
    title: str
    excerpt: str


class SearchNotesResult(BaseModel):
    # 命中与空结果都复用同一个输出对象。
    items: list[NoteResult]
```

`Annotated` 约束会进入 Tool 输入 Schema，也会在函数执行前参与参数校验。返回 `SearchNotesResult` 让 SDK 生成输出 Schema，并将结果放进 `structured_content`。

公开结果只有 `id`、`title` 和摘要。fixture 内部仍保存完整 `body`，Repository 显式映射成 `excerpt`，避免不小心把内部记录所有字段透传给 Client。真实项目还应在 Repository 查询层限制可见范围，而不是先读取全部数据再在 Tool 函数里过滤。

## Repository 不需要知道 MCP

Repository 接收已经收窄的业务参数，返回公开结果模型：

```python
class NoteRepository(Protocol):
    # Repository 只接收通过 Tool 校验的业务参数，不依赖 MCP 类型。
    def search(self, query: str, limit: int) -> SearchNotesResult: ...


class FixtureNoteRepository:
    def search(self, query: str, limit: int) -> SearchNotesResult:
        # casefold 统一本示例两端的大小写匹配语义。
        term = query.casefold()
        visible = [
            NoteResult(
                id=note["id"],
                title=note["title"],
                excerpt=note["body"],
            )
            for note in self._notes
            if term in f'{note["title"]} {note["body"]}'.casefold()
        ]
        # 只把裁剪后的公开模型返回给协议适配层。
        return SearchNotesResult(items=visible[:limit])
```

这层没有 MCP 类型、JSON-RPC ID 或 Client 生命周期，因此可以单独替换为 PostgreSQL、搜索引擎或 HTTP Adapter。fixture 只用于说明契约，不能证明真实数据库权限、索引或并发行为。

若将来改成异步数据库驱动，Protocol 和实现可以改为 `async def search(...)`，Tool 再 `await`。不要为了让示例看起来“现代”而把纯内存计算机械改成异步；异步的价值来自真实 I/O 和并发等待。

## 注册 Tool 的代码应该很薄

`src/search_notes/app.py` 负责把业务函数适配为 MCP Tool：

```python
from mcp.server import MCPServer

from .models import Limit, Query, SearchNotesResult
from .repository import NoteRepository


def create_server(repository: NoteRepository) -> MCPServer:
    # factory 让测试替换 Repository，生产入口再注入真实数据源。
    server = MCPServer("search-notes-python", version="1.0.0")

    @server.tool(name="search_notes")
    def search_notes(query: Query, limit: Limit = 5) -> SearchNotesResult:
        """Search notes visible to the authenticated caller."""
        # 参数通过 Pydantic 校验后，业务函数才会进入 Repository。
        return repository.search(query, limit)

    # 调用方拿到已经完成 Tool 注册的 Server。
    return server
```

调用顺序是“SDK 解析请求 -> 校验 `query` 与 `limit` -> 执行 Tool 函数 -> Repository 查询 -> 校验并编码结构化结果”。Tool Adapter 不复制搜索逻辑，也不把错误都吞成空数组。

真实 Server 还会在这一边界取得认证上下文，并构造带 Scope 的 Repository。模型看见的 Schema 仍只有查询词和数量上限。认证失败、权限拒绝和无结果是三种不同状态，不能统一返回 `items: []`，否则 Host 无法判断用户到底没有数据还是没有权限。

## stdio 入口只负责运行

入口文件组装 Repository 并启动 stdio：

```python
from .app import create_server
from .repository import FixtureNoteRepository


def main() -> None:
    # stdio 入口只组装依赖并交给 SDK 运行，不承载搜索逻辑。
    create_server(FixtureNoteRepository()).run("stdio")


if __name__ == "__main__":
    main()
```

直接运行后进程会等待 Client 从 stdin 发来协议消息，因此终端没有业务输出是正常现象：

```bash
# 直接启动后进程等待 stdin；使用 Ctrl+C 结束人工观察。
cd examples/mcp-search-notes/python
uv run python -m search_notes.server
```

不要在 stdout 打启动 banner。stdio 的 stdout 是协议通道，诊断日志应写 stderr。若要让其他 Host 通过命令启动，还需要把模块入口写进包配置并测试安装后的命令；源码目录中能运行不等于 wheel 分发可用。

## 进程内测试证明 Tool 契约

Python v2 的高层 `Client` 可以直接连接 `MCPServer` 对象：

```python
async def test_python_server_contract_in_process() -> None:
    # 计数 Repository 让测试同时观察业务函数是否执行。
    repository = CountingRepository()

    async with Client(create_server(repository)) as client:
        # 先验证 Client 实际发现到的公开 Tool。
        tools = await client.list_tools()
        assert [tool.name for tool in tools.tools] == ["search_notes"]

        hit = await client.call_tool(
            "search_notes",
            {"query": "release", "limit": 2},
        )
        assert hit.is_error is False
        assert hit.structured_content["items"][0]["id"] == "n-1"

        # 合法但未命中时仍返回稳定的成功 Schema。
        empty = await client.call_tool(
            "search_notes",
            {"query": "missing", "limit": 5},
        )
        assert empty.structured_content == {"items": []}
```

这条路径走 Tool 注册、参数模型、业务函数和结果编码。Python v2 对进程内 Server 使用直接 dispatcher，不经过 JSON-RPC framing，也不启动子进程。因此它适合快速契约测试，却不能证明 stdio、PATH、工作目录或关闭行为。

测试还用共享 `outputSchema` 校验 `structured_content`。Python SDK 生成的 Schema 可能带 `title` 与 `$defs`，Node SDK 可能使用内联对象；字段、必填项、数值范围和结果行为必须一致，序列化细节不需要逐字相同。

## 参数拒绝必须发生在 Repository 之前

只断言“返回了错误”还不够。测试注入带计数器的 Repository：

```python
async def test_invalid_limit_never_reaches_repository() -> None:
    # 初始调用次数为 0，非法 limit 应在 SDK 边界被拒绝。
    repository = CountingRepository()

    async with Client(create_server(repository)) as client:
        invalid = await client.call_tool(
            "search_notes",
            {"query": "release", "limit": 21},
        )

        # Tool Error 可读，但 Repository 仍然没有执行。
        assert invalid.is_error is True
        assert repository.calls == 0
```

这个断言证明上限在 Tool 边界生效，不会先执行昂贵查询再报告参数错误。它仍不能证明认证发生在查询前，因为示例没有接入真实认证中间件。生产测试要另外覆盖缺少身份、Scope 越界和跨租户查询。

## 运行测试并理解证据范围

```bash
# 运行 Python Server 契约和 Python Client -> Node stdio 三条测试。
cd examples/mcp-search-notes/python
uv run pytest -q
```

当前工程有三条测试：两条验证 Python Server，一条由 Python Client 启动 Node v2 Server 并通过 stdio 调用同一 Tool。后者验证跨语言传输，不属于 Python Tool 本身的单元边界。

| 测试 | 可以证明 | 不能证明 |
| --- | --- | --- |
| Repository 单元行为 | 过滤、limit、公开字段 | MCP 注册与传输 |
| Python 进程内 Client | Tool 发现、参数拒绝、结构化结果 | stdio 命令和子进程关闭 |
| Python Client -> Node stdio | 现代探测、跨语言调用、关闭 | 远程 HTTP、OAuth、真实数据库 |

把这三层分开后，失败位置会清楚许多。进程内用例失败先查 Schema 或业务代码；只有 stdio 用例失败才查命令、标准流和版本探测。


**类型提示能替代业务校验吗？**

不能。它们适合检查字符串长度、整数范围和输出形状。用户是否可见某条笔记、当前 Release 是否允许读取、查询是否超过租户预算，仍要由可信业务数据判断。测试时分别准备类型错误与跨 Scope 对象：前者应在 Tool 函数前拒绝，后者应在 Repository 查询或授权策略中拒绝，不能用一条 Pydantic 用例代替两层边界。

**为什么不让模型传 `user_id` 或 `scope`？**

因为 Tool 参数是模型候选，不是认证事实。Server 应从请求认证上下文取得身份，再构造最小 Scope；模型只填写 `query` 和 `limit`。即使 Host 已做过滤，直接 Client 仍可能绕过它，所以 Server 每次调用都要重新授权，并用跨租户用例确认越权对象不会进入 Repository 结果。

**空结果为什么不是错误？**

合法查询可能确实没有命中。返回 `items: []` 让 Client 继续按成功 Schema 处理，Host 可以决定换查询词或结束；依赖故障、权限拒绝和参数错误应使用各自失败语义。若所有失败都伪装为空数组，排障时既看不到数据库故障，也无法区分用户没有数据和用户没有权限。

**进程内 Client 能替代 Inspector 吗？**

不能完全替代。进程内测试适合自动回归，Inspector 适合人工观察目录和调用；二者都绕过或简化一部分真实 Host 配置。最终还要让 stdio Client 从目标命令、工作目录和环境启动 Server，完成发现、调用与关闭，并检查 stdout 没有普通日志、退出后没有残留进程。

**Python 和 Node 怎样判断契约一致？**

共用语言无关 Schema 与 fixture，分别验证 Client 实际看到的核心字段、合法结果、空结果和越界参数，再由一个语言的 Client 调另一个语言的 Server。SDK 生成 Schema 的 `title`、`$defs` 或方言标记可以不同；字段、必填项、范围和错误行为若不同，跨语言测试就应失败并阻止发布。

**什么时候优先选择 Python Server？**

业务实现、数据处理或模型工具链已经在 Python 中时，Python Adapter 通常更薄。若能力紧邻 Node 服务或前端工具链，Node 可能更自然。选择语言先看现有业务边界、部署和维护者，不看哪段示例更短。
