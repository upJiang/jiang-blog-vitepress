import asyncio

from mcp import Client

from server import mcp


async def _discover_and_call() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        assert [tool.name for tool in tools.tools] == ["search_policy"]

        result = await client.call_tool(
            "search_policy",
            {"query": "remote access", "limit": 2},
        )

    assert result.is_error is False
    assert result.structured_content == {
        "items": [
            {
                "source_id": "policy-remote-access",
                "title": "Remote access policy",
                "text": "Remote access requires an approved account and multi-factor authentication.",
            }
        ],
        "total": 1,
    }


def test_client_discovers_and_calls_tool() -> None:
    asyncio.run(_discover_and_call())


async def _call_invalid_limit() -> None:
    async with Client(mcp) as client:
        result = await client.call_tool(
            "search_policy",
            {"query": "remote access", "limit": 0},
        )

    assert result.is_error is True


def test_invalid_limit_returns_tool_error() -> None:
    asyncio.run(_call_invalid_limit())
