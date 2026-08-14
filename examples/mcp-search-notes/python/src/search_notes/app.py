from mcp.server import MCPServer

from .models import Limit, Query, SearchNotesResult
from .repository import NoteRepository


def create_server(repository: NoteRepository) -> MCPServer:
    server = MCPServer("search-notes-python", version="1.0.0")

    @server.tool(name="search_notes")
    def search_notes(query: Query, limit: Limit = 5) -> SearchNotesResult:
        """Search notes visible to the authenticated caller."""
        # Pydantic 参数校验先于函数执行；Repository 只接收已经收窄的业务参数。
        return repository.search(query, limit)

    return server
