import json
from pathlib import Path

from jsonschema import Draft202012Validator
from mcp import Client

from search_notes import create_server
from search_notes.models import NoteResult, SearchNotesResult


class CountingRepository:
    def __init__(self) -> None:
        self.calls = 0

    def search(self, query: str, limit: int) -> SearchNotesResult:
        self.calls += 1
        if query == "missing":
            return SearchNotesResult(items=[])
        return SearchNotesResult(
            items=[NoteResult(id="n-1", title="Release checklist", excerpt="Confirm rollback.")]
        )


async def test_python_server_contract_in_process() -> None:
    repository = CountingRepository()
    async with Client(create_server(repository)) as client:
        tools = await client.list_tools()
        assert [tool.name for tool in tools.tools] == ["search_notes"]

        hit = await client.call_tool("search_notes", {"query": "release", "limit": 2})
        assert hit.is_error is False
        contract_path = Path(__file__).parents[2] / "contracts" / "search-notes.json"
        output_schema = json.loads(contract_path.read_text())["outputSchema"]
        Draft202012Validator(output_schema).validate(hit.structured_content)
        assert hit.structured_content["items"][0]["id"] == "n-1"

        empty = await client.call_tool("search_notes", {"query": "missing", "limit": 5})
        assert empty.structured_content == {"items": []}


async def test_invalid_limit_never_reaches_repository() -> None:
    repository = CountingRepository()
    async with Client(create_server(repository)) as client:
        invalid = await client.call_tool("search_notes", {"query": "release", "limit": 21})
        assert invalid.is_error is True
        assert repository.calls == 0
