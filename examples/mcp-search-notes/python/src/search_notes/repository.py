import json
from pathlib import Path
from typing import Protocol

from .models import NoteResult, SearchNotesResult


class NoteRepository(Protocol):
    def search(self, query: str, limit: int) -> SearchNotesResult: ...


class FixtureNoteRepository:
    def __init__(self) -> None:
        fixture_path = Path(__file__).parents[3] / "fixtures" / "notes.json"
        self._notes: list[dict[str, str]] = json.loads(fixture_path.read_text())

    def search(self, query: str, limit: int) -> SearchNotesResult:
        term = query.casefold()
        visible = [
            NoteResult(id=note["id"], title=note["title"], excerpt=note["body"])
            for note in self._notes
            if term in f'{note["title"]} {note["body"]}'.casefold()
        ]
        return SearchNotesResult(items=visible[:limit])
