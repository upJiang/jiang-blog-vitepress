from typing import Annotated

from pydantic import BaseModel, Field


Query = Annotated[str, Field(min_length=1)]
Limit = Annotated[int, Field(ge=1, le=20)]


class NoteResult(BaseModel):
    id: str
    title: str
    excerpt: str


class SearchNotesResult(BaseModel):
    items: list[NoteResult]
