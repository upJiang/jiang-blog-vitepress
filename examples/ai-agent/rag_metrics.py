from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class RankedItem:
    item_id: str
    release_id: str
    allowed: bool = True


@dataclass(frozen=True)
class EvaluationResult:
    recall_at_k: float | None
    reciprocal_rank: float
    ndcg_at_k: float | None
    permission_leaks: tuple[str, ...]
    wrong_release: tuple[str, ...]


def dcg(grades: list[int]) -> float:
    return sum(
        (2**grade - 1) / math.log2(rank + 1)
        for rank, grade in enumerate(grades, start=1)
    )


def evaluate_ranking(
    ranking: list[RankedItem],
    relevance: dict[str, int],
    *,
    release_id: str,
    k: int,
) -> EvaluationResult:
    top = ranking[:k]
    permission_leaks = tuple(item.item_id for item in top if not item.allowed)
    wrong_release = tuple(
        item.item_id for item in top if item.release_id != release_id
    )
    eligible = [
        item
        for item in top
        if item.allowed and item.release_id == release_id
    ]

    gold_ids = {item_id for item_id, grade in relevance.items() if grade > 0}
    retrieved_gold = {item.item_id for item in eligible if item.item_id in gold_ids}
    recall = len(retrieved_gold) / len(gold_ids) if gold_ids else None

    first_rank = next(
        (
            rank
            for rank, item in enumerate(ranking, start=1)
            if item.allowed
            and item.release_id == release_id
            and relevance.get(item.item_id, 0) > 0
        ),
        0,
    )
    reciprocal_rank = 1 / first_rank if first_rank else 0.0

    actual_grades = [relevance.get(item.item_id, 0) for item in eligible]
    actual_grades.extend([0] * (k - len(actual_grades)))
    ideal_grades = sorted(relevance.values(), reverse=True)[:k]
    ideal_grades.extend([0] * (k - len(ideal_grades)))
    ideal = dcg(ideal_grades)
    ndcg = dcg(actual_grades) / ideal if ideal > 0 else None

    return EvaluationResult(
        recall,
        reciprocal_rank,
        ndcg,
        permission_leaks,
        wrong_release,
    )


def run_demo() -> EvaluationResult:
    ranking = [
        RankedItem("noise", "release-7"),
        RankedItem("chunk-b", "release-7"),
        RankedItem("chunk-a", "release-7"),
        RankedItem("hidden", "release-7", allowed=False),
        RankedItem("chunk-c", "release-7"),
    ]
    return evaluate_ranking(
        ranking,
        {"chunk-a": 3, "chunk-b": 2, "chunk-c": 1},
        release_id="release-7",
        k=3,
    )


if __name__ == "__main__":
    print(run_demo())
