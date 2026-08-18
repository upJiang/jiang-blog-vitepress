from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass
from hashlib import sha256


@dataclass(frozen=True)
class Candidate:
    chunk_id: str
    document_id: str
    source_version_id: str
    text: str
    dimensions: frozenset[str]
    visible_subjects: frozenset[str]
    token_cost: int
    score: float


@dataclass(frozen=True)
class EvidenceSelection:
    items: tuple[Candidate, ...]
    covered_dimensions: frozenset[str]
    missing_dimensions: frozenset[str]
    used_tokens: int


def build_cache_key(
    *,
    dataset_id: str,
    release_id: str,
    query: str,
    subject_ids: Iterable[str],
    scope_ids: Iterable[str],
    recipe: str,
) -> str:
    """Build a stable key from every input that can change retrieval output."""

    payload = {
        "dataset_id": dataset_id,
        "release_id": release_id,
        "query": " ".join(query.casefold().split()),
        "subject_ids": sorted(set(subject_ids)),
        "scope_ids": sorted(set(scope_ids)),
        "recipe": recipe,
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return "evidence:" + sha256(raw.encode("utf-8")).hexdigest()


def select_evidence(
    candidates: Iterable[Candidate],
    *,
    required_dimensions: set[str],
    token_budget: int,
    max_chunks_per_document: int = 2,
) -> EvidenceSelection:
    """Prefer new question coverage, then relevance, without exceeding the budget."""

    if token_budget < 0:
        raise ValueError("token_budget must be non-negative")

    selected: list[Candidate] = []
    covered: set[str] = set()
    per_document: dict[str, int] = {}
    used_tokens = 0
    remaining = list(candidates)

    while remaining:
        remaining.sort(
            key=lambda item: (
                len((item.dimensions & required_dimensions) - covered),
                item.score,
                -item.token_cost,
                item.chunk_id,
            ),
            reverse=True,
        )
        candidate = remaining.pop(0)
        new_coverage = (candidate.dimensions & required_dimensions) - covered
        if not new_coverage:
            continue
        if per_document.get(candidate.document_id, 0) >= max_chunks_per_document:
            continue
        if used_tokens + candidate.token_cost > token_budget:
            continue

        selected.append(candidate)
        covered.update(new_coverage)
        used_tokens += candidate.token_cost
        per_document[candidate.document_id] = per_document.get(candidate.document_id, 0) + 1
        if covered >= required_dimensions:
            break

    return EvidenceSelection(
        items=tuple(selected),
        covered_dimensions=frozenset(covered),
        missing_dimensions=frozenset(required_dimensions - covered),
        used_tokens=used_tokens,
    )


class SingleflightEvidenceCache:
    """Coalesce concurrent misses and recheck visibility on every read."""

    def __init__(self) -> None:
        self._values: dict[str, tuple[Candidate, ...]] = {}
        self._inflight: dict[str, asyncio.Future[tuple[Candidate, ...]]] = {}
        self._guard = asyncio.Lock()

    async def get_or_load(
        self,
        key: str,
        *,
        loader: Callable[[], Awaitable[list[Candidate]]],
        can_read: Callable[[Candidate], bool],
    ) -> list[Candidate]:
        async with self._guard:
            cached = self._values.get(key)
            if cached is not None:
                return [item for item in cached if can_read(item)]

            future = self._inflight.get(key)
            owner = future is None
            if future is None:
                future = asyncio.get_running_loop().create_future()
                self._inflight[key] = future

        if not owner:
            values = await asyncio.shield(future)
            return [item for item in values if can_read(item)]

        try:
            values = tuple(await loader())
            async with self._guard:
                self._values[key] = values
            future.set_result(values)
            return [item for item in values if can_read(item)]
        except BaseException as error:
            if not future.done():
                future.set_exception(error)
            raise
        finally:
            async with self._guard:
                if self._inflight.get(key) is future:
                    self._inflight.pop(key, None)
