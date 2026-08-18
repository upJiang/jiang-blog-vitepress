from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class ResearchQuestion:
    topic_id: str
    question: str
    required: bool = True


@dataclass(frozen=True)
class ResearchEvidence:
    evidence_id: str
    topic_ids: tuple[str, ...]
    source_id: str
    claim: str
    stance: Literal["supports", "contradicts", "context"]
    accessible: bool = True


@dataclass(frozen=True)
class CoverageReport:
    covered_topics: tuple[str, ...]
    missing_required_topics: tuple[str, ...]
    conflicting_topics: tuple[str, ...]
    independent_sources: int

    @property
    def complete(self) -> bool:
        return not self.missing_required_topics and not self.conflicting_topics


def evaluate_coverage(
    questions: list[ResearchQuestion], evidence: list[ResearchEvidence]
) -> CoverageReport:
    accessible = [item for item in evidence if item.accessible]
    topic_stances: dict[str, set[str]] = {item.topic_id: set() for item in questions}
    for item in accessible:
        for topic_id in item.topic_ids:
            if topic_id in topic_stances:
                topic_stances[topic_id].add(item.stance)

    covered = tuple(
        topic_id
        for topic_id, stances in topic_stances.items()
        if "supports" in stances or "contradicts" in stances
    )
    missing = tuple(
        item.topic_id
        for item in questions
        if item.required and item.topic_id not in covered
    )
    conflicts = tuple(
        topic_id
        for topic_id, stances in topic_stances.items()
        if {"supports", "contradicts"}.issubset(stances)
    )
    return CoverageReport(
        covered_topics=covered,
        missing_required_topics=missing,
        conflicting_topics=conflicts,
        independent_sources=len({item.source_id for item in accessible}),
    )


def validate_citations(
    claim_citations: dict[str, tuple[str, ...]], evidence: list[ResearchEvidence]
) -> dict[str, str]:
    evidence_map = {item.evidence_id: item for item in evidence}
    issues: dict[str, str] = {}
    for claim_id, evidence_ids in claim_citations.items():
        if not evidence_ids:
            issues[claim_id] = "missing_citation"
            continue
        if any(item_id not in evidence_map for item_id in evidence_ids):
            issues[claim_id] = "unknown_evidence"
            continue
        if any(not evidence_map[item_id].accessible for item_id in evidence_ids):
            issues[claim_id] = "inaccessible_evidence"
    return issues


def decide_stop(
    report: CoverageReport,
    *,
    round_number: int,
    max_rounds: int,
    remaining_seconds: float,
    new_evidence_count: int,
) -> tuple[bool, str]:
    if report.complete:
        return True, "coverage_complete"
    if remaining_seconds <= 0:
        return True, "deadline_reached"
    if round_number >= max_rounds:
        return True, "round_limit"
    if new_evidence_count == 0:
        return True, "no_marginal_evidence"
    return False, "continue_for_missing_topics"
