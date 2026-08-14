from pathlib import Path

from mcp import Client, StdioServerParameters, stdio_client


async def test_python_client_calls_node_v2_over_stdio() -> None:
    node_project = Path(__file__).parents[2] / "node"
    params = StdioServerParameters(
        command="node",
        args=["--import", "tsx", "src/server.ts"],
        cwd=node_project,
    )

    # auto 先用 server/discover 探测现代协议；退出上下文时回收 Server 子进程。
    async with Client(stdio_client(params), mode="auto") as client:
        tools = await client.list_tools()
        assert [tool.name for tool in tools.tools] == ["search_notes"]

        result = await client.call_tool("search_notes", {"query": "release", "limit": 2})
        assert result.is_error is False
        assert [item["id"] for item in result.structured_content["items"]] == ["n-1", "n-3"]
