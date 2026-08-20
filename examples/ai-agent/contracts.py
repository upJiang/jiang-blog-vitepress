from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Mapping

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class SearchCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    query: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
    ]
    limit: Annotated[int, Field(ge=1, le=20)]


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str


@dataclass(frozen=True)
class SearchCommand:
    query: str
    limit: int
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str


def search_candidate_schema() -> dict[str, object]:
    return SearchCandidate.model_json_schema()


def parse_search_arguments(candidate: Mapping[str, object]) -> SearchCandidate:
    return SearchCandidate.model_validate(candidate)


def authorize_search(candidate: SearchCandidate, auth: AuthContext) -> SearchCommand:
    if not auth.user_id or not auth.scope_ids or not auth.release_id:
        raise PermissionError("search_scope_is_missing")
    return SearchCommand(
        query=candidate.query,
        limit=candidate.limit,
        user_id=auth.user_id,
        scope_ids=auth.scope_ids,
        release_id=auth.release_id,
    )
