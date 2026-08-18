from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Callable


@dataclass(frozen=True)
class Candidate:
    candidate_id: str
    title: str
    content: str
    release_id: str
    allowed: bool = True
    channels: tuple[str, ...] = ()
    fusion_score: float = 0.0
    rerank_score: float | None = None


@dataclass(frozen=True)
class ChannelResult:
    channel: str
    candidate_ids: tuple[str, ...]
    error: str = ""


def reciprocal_rank_fusion(
    results: list[ChannelResult],
    *,
    channel_weights: dict[str, float] | None = None,
    rank_constant: int = 60,
) -> dict[str, tuple[float, tuple[str, ...]]]:
    weights = channel_weights or {}
    scores: dict[str, float] = {}
    channels: dict[str, list[str]] = {}
    for result in results:
        if result.error:
            continue
        weight = weights.get(result.channel, 1.0)
        for rank, candidate_id in enumerate(result.candidate_ids, start=1):
            scores[candidate_id] = scores.get(candidate_id, 0.0) + weight / (
                rank_constant + rank
            )
            channels.setdefault(candidate_id, []).append(result.channel)
    return {
        candidate_id: (score, tuple(dict.fromkeys(channels[candidate_id])))
        for candidate_id, score in scores.items()
    }


def fuse_candidates(
    catalog: dict[str, Candidate],
    results: list[ChannelResult],
    *,
    release_id: str,
) -> list[Candidate]:
    fused = reciprocal_rank_fusion(results)
    candidates = [
        replace(candidate, channels=channels, fusion_score=score)
        for candidate_id, (score, channels) in fused.items()
        if (candidate := catalog.get(candidate_id))
        and candidate.allowed
        and candidate.release_id == release_id
    ]
    return sorted(candidates, key=lambda item: (-item.fusion_score, item.candidate_id))


def rerank_with_fallback(
    query: str,
    candidates: list[Candidate],
    scorer: Callable[[str, list[str]], list[tuple[int, float]]],
    *,
    limit: int,
) -> tuple[list[Candidate], bool]:
    if not candidates:
        return [], False
    documents = [f"标题：{item.title}\n正文：{item.content}" for item in candidates]
    try:
        scores = scorer(query, documents)
    except TimeoutError:
        return candidates[:limit], True

    ranked = [
        replace(candidates[index], rerank_score=max(0.0, min(score, 1.0)))
        for index, score in scores
        if 0 <= index < len(candidates)
    ]
    if not ranked:
        return candidates[:limit], True
    return (
        sorted(
            ranked,
            key=lambda item: (
                -(item.rerank_score or 0.0),
                -item.fusion_score,
                item.candidate_id,
            ),
        )[:limit],
        False,
    )


def run_demo() -> tuple[list[Candidate], bool]:
    catalog = {
        "policy": Candidate(
            "policy",
            "设备合规与重新申请",
            "设备完成整改后，可以重新提交远程访问申请。",
            "release-7",
        ),
        "request": Candidate(
            "request",
            "申请 RA-2026-0142",
            "当前状态为已拒绝，原因为设备不合规。",
            "release-7",
        ),
        "hidden": Candidate(
            "hidden",
            "内部处置流程",
            "受限内容。",
            "release-7",
            allowed=False,
        ),
    }
    channel_results = [
        ChannelResult("exact", ("request", "policy")),
        ChannelResult("fulltext", ("policy", "request", "hidden")),
        ChannelResult("dense", (), error="embedding timeout"),
    ]
    fused = fuse_candidates(catalog, channel_results, release_id="release-7")

    def scorer(_query: str, _documents: list[str]) -> list[tuple[int, float]]:
        return [(0, 0.92), (1, 0.35)]

    return rerank_with_fallback("被拒绝后怎样处理", fused, scorer, limit=2)


if __name__ == "__main__":
    print(run_demo())
