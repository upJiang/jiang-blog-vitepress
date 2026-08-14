from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str


@dataclass(frozen=True)
class SearchArguments:
    query: str
    limit: int


@dataclass(frozen=True)
class SearchCommand:
    query: str
    limit: int
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str


def parse_search_arguments(candidate: dict[str, object]) -> SearchArguments:
    allowed = {"query", "limit"}
    unknown = set(candidate) - allowed
    if unknown:
        raise ValueError(f"untrusted_fields:{','.join(sorted(unknown))}")
    query = str(candidate.get("query", "")).strip()
    limit = candidate.get("limit", 5)
    if not query:
        raise ValueError("query_is_empty")
    if not isinstance(limit, int) or not 1 <= limit <= 20:
        raise ValueError("limit_out_of_range")
    return SearchArguments(query=query, limit=limit)


def authorize_search(arguments: SearchArguments, auth: AuthContext) -> SearchCommand:
    if not auth.scope_ids or not auth.release_id:
        raise PermissionError("search_scope_is_missing")
    return SearchCommand(
        query=arguments.query,
        limit=arguments.limit,
        user_id=auth.user_id,
        scope_ids=auth.scope_ids,
        release_id=auth.release_id,
    )
