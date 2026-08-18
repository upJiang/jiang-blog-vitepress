from mcp.server import MCPServer


mcp = MCPServer("policy-search-demo")


@mcp.tool()
def search_policy(query: str, limit: int = 3) -> dict[str, object]:
    """Search a fixed, public policy sample for the requested words."""
    if not query.strip():
        raise ValueError("query must not be empty")
    if not 1 <= limit <= 10:
        raise ValueError("limit must be between 1 and 10")

    rows = [
        {
            "source_id": "policy-remote-access",
            "title": "Remote access policy",
            "text": "Remote access requires an approved account and multi-factor authentication.",
        },
        {
            "source_id": "policy-device",
            "title": "Managed device policy",
            "text": "Only managed devices may connect to protected services.",
        },
    ]
    words = {word.lower() for word in query.split() if word.strip()}
    matched = [
        row
        for row in rows
        if not words
        or any(word in f"{row['title']} {row['text']}".lower() for word in words)
    ]
    return {"items": matched[:limit], "total": len(matched)}


if __name__ == "__main__":
    mcp.run(transport="stdio")

