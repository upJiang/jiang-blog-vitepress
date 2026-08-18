import asyncio

from mcp import Client

from server import mcp


async def main() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        print([tool.name for tool in tools.tools])

        result = await client.call_tool(
            "search_policy",
            {"query": "remote access", "limit": 2},
        )
        print(result.structured_content)


if __name__ == "__main__":
    asyncio.run(main())
