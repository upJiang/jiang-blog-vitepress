from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from math import sqrt
from typing import Iterable


@dataclass(frozen=True)
class Block:
    kind: str
    text: str
    section_path: tuple[str, ...]
    ordinal: int


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    document_id: str
    text: str
    section_path: tuple[str, ...]
    ordinal: int
    vector: tuple[float, ...] = ()


def stable_chunk_id(document_id: str, section_path: tuple[str, ...], text: str) -> str:
    payload = "\x1f".join((document_id, *section_path, text.strip())).encode("utf-8")
    return sha256(payload).hexdigest()[:24]


def chunk_blocks(document_id: str, blocks: Iterable[Block], *, target_chars: int = 180) -> list[Chunk]:
    if target_chars < 40:
        raise ValueError("target_chars is too small")
    chunks: list[Chunk] = []
    buffer: list[str] = []
    current_path: tuple[str, ...] = ()
    start_ordinal = 0

    def flush() -> None:
        nonlocal buffer
        text = "\n".join(buffer).strip()
        if text:
            chunks.append(
                Chunk(
                    stable_chunk_id(document_id, current_path, text),
                    document_id,
                    text,
                    current_path,
                    start_ordinal,
                )
            )
        buffer = []

    for block in blocks:
        path_changed = bool(buffer) and block.section_path != current_path
        would_overflow = bool(buffer) and sum(len(item) for item in buffer) + len(block.text) > target_chars
        if path_changed or would_overflow:
            flush()
        if not buffer:
            current_path = block.section_path
            start_ordinal = block.ordinal
        buffer.append(block.text)
    flush()
    return chunks


def cosine_similarity(left: tuple[float, ...], right: tuple[float, ...]) -> float:
    if len(left) != len(right) or not left:
        raise ValueError("vectors must have the same non-zero dimension")
    denominator = sqrt(sum(value * value for value in left)) * sqrt(sum(value * value for value in right))
    return 0.0 if denominator == 0 else sum(a * b for a, b in zip(left, right, strict=True)) / denominator


def dense_search(query: tuple[float, ...], chunks: list[Chunk], *, scope: set[str], limit: int) -> list[str]:
    visible = [chunk for chunk in chunks if chunk.document_id in scope and chunk.vector]
    ranked = sorted(visible, key=lambda chunk: (-cosine_similarity(query, chunk.vector), chunk.chunk_id))
    return [chunk.chunk_id for chunk in ranked[:limit]]


def reciprocal_rank_fusion(rankings: list[list[str]], *, k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, candidate_id in enumerate(ranking, start=1):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=lambda candidate_id: (-scores[candidate_id], candidate_id))
