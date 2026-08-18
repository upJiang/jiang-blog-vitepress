from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Literal


@dataclass(frozen=True)
class EvidenceFact:
    fact_id: str
    text: str


@dataclass(frozen=True)
class AnswerCandidate:
    text: str
    claimed_fact_ids: tuple[str, ...]


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    message: str
    fact_ids: tuple[str, ...]
    repairable: bool


@dataclass(frozen=True)
class ReflectionResult:
    answer: AnswerCandidate
    issues: tuple[ValidationIssue, ...]
    repair_attempts: int
    stop_reason: Literal[
        "passed",
        "blocked",
        "repair_limit_reached",
        "repair_rejected",
        "repair_unavailable",
    ]


Repairer = Callable[
    [AnswerCandidate, tuple[ValidationIssue, ...], tuple[EvidenceFact, ...]],
    AnswerCandidate,
]


def validate_answer(
    candidate: AnswerCandidate,
    evidence: Iterable[EvidenceFact],
    required_fact_ids: Iterable[str],
) -> tuple[ValidationIssue, ...]:
    evidence_ids = {fact.fact_id for fact in evidence}
    required_ids = set(required_fact_ids)
    claimed_ids = set(candidate.claimed_fact_ids)
    issues: list[ValidationIssue] = []

    unknown_ids = tuple(sorted(claimed_ids - evidence_ids))
    if unknown_ids:
        issues.append(
            ValidationIssue(
                code="unsupported_claim",
                message="回答声明了没有证据绑定的事实",
                fact_ids=unknown_ids,
                repairable=False,
            )
        )

    missing_ids = tuple(sorted(required_ids - claimed_ids))
    if missing_ids:
        issues.append(
            ValidationIssue(
                code="missing_required_fact",
                message="回答遗漏了任务要求且已有证据支持的事实",
                fact_ids=missing_ids,
                repairable=True,
            )
        )

    if not candidate.text.strip():
        issues.append(
            ValidationIssue(
                code="empty_answer",
                message="回答正文为空",
                fact_ids=(),
                repairable=True,
            )
        )
    return tuple(issues)


def run_reflection(
    initial: AnswerCandidate,
    evidence: Iterable[EvidenceFact],
    required_fact_ids: Iterable[str],
    repairer: Repairer,
    *,
    max_repairs: int = 1,
) -> ReflectionResult:
    if max_repairs < 0:
        raise ValueError("max_repairs_must_be_non_negative")

    facts = tuple(evidence)
    required_ids = tuple(required_fact_ids)
    current = initial
    issues = validate_answer(current, facts, required_ids)
    if not issues:
        return ReflectionResult(current, (), 0, "passed")
    if any(not issue.repairable for issue in issues):
        return ReflectionResult(current, issues, 0, "blocked")

    attempts = 0
    while attempts < max_repairs:
        attempts += 1
        try:
            candidate = repairer(current, issues, facts)
        except Exception:
            return ReflectionResult(current, issues, attempts, "repair_unavailable")

        # 修复不能静默丢掉原答案已经绑定的事实。
        previous_ids = set(current.claimed_fact_ids)
        candidate_ids = set(candidate.claimed_fact_ids)
        if not previous_ids.issubset(candidate_ids):
            return ReflectionResult(current, issues, attempts, "repair_rejected")

        current = candidate
        issues = validate_answer(current, facts, required_ids)
        if not issues:
            return ReflectionResult(current, (), attempts, "passed")
        if any(not issue.repairable for issue in issues):
            return ReflectionResult(current, issues, attempts, "blocked")

    return ReflectionResult(current, issues, attempts, "repair_limit_reached")


def append_missing_facts(
    candidate: AnswerCandidate,
    issues: tuple[ValidationIssue, ...],
    evidence: tuple[EvidenceFact, ...],
) -> AnswerCandidate:
    facts_by_id = {fact.fact_id: fact for fact in evidence}
    missing_ids = [
        fact_id
        for issue in issues
        if issue.code == "missing_required_fact"
        for fact_id in issue.fact_ids
    ]
    additions = [facts_by_id[fact_id].text for fact_id in missing_ids]
    text = candidate.text.rstrip()
    if additions:
        text += "\n\n补充：\n" + "\n".join(f"- {value}" for value in additions)
    claimed_ids = tuple(dict.fromkeys((*candidate.claimed_fact_ids, *missing_ids)))
    return AnswerCandidate(text=text, claimed_fact_ids=claimed_ids)
