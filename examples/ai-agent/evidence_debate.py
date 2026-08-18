from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Decision = Literal["automatic", "manual", "limited_pilot"]
ResolutionStatus = Literal["resolved", "insufficient_evidence", "unresolved"]


@dataclass(frozen=True)
class DebateEvidence:
    evidence_id: str
    text: str
    active: bool = True


@dataclass(frozen=True)
class DebatePosition:
    position_id: str
    role: str
    decision: Decision
    claim: str
    evidence_ids: tuple[str, ...]
    answered_position_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class PositionAssessment:
    position: DebatePosition
    valid_evidence_ids: tuple[str, ...]
    unknown_evidence_ids: tuple[str, ...]
    inactive_evidence_ids: tuple[str, ...]
    required_coverage: float

    @property
    def eligible(self) -> bool:
        return not self.unknown_evidence_ids and not self.inactive_evidence_ids


@dataclass(frozen=True)
class DebateResolution:
    status: ResolutionStatus
    decision: Decision | None
    selected_position_id: str | None
    stop_reason: str
    assessments: tuple[PositionAssessment, ...]
    minority_concerns: tuple[str, ...]


def assess_position(
    position: DebatePosition,
    evidence: tuple[DebateEvidence, ...],
    required_evidence_ids: tuple[str, ...],
) -> PositionAssessment:
    evidence_by_id = {item.evidence_id: item for item in evidence}
    claimed_ids = set(position.evidence_ids)
    unknown = tuple(sorted(claimed_ids - evidence_by_id.keys()))
    inactive = tuple(
        sorted(
            evidence_id
            for evidence_id in claimed_ids & evidence_by_id.keys()
            if not evidence_by_id[evidence_id].active
        )
    )
    valid = tuple(
        sorted(
            evidence_id
            for evidence_id in claimed_ids & evidence_by_id.keys()
            if evidence_by_id[evidence_id].active
        )
    )
    required = set(required_evidence_ids)
    coverage = len(set(valid) & required) / len(required) if required else 1.0
    return PositionAssessment(position, valid, unknown, inactive, coverage)


def resolve_debate(
    positions: tuple[DebatePosition, ...],
    evidence: tuple[DebateEvidence, ...],
    *,
    required_evidence_ids: tuple[str, ...],
) -> DebateResolution:
    if not positions:
        raise ValueError("positions_must_not_be_empty")
    ids = [position.position_id for position in positions]
    if len(ids) != len(set(ids)):
        raise ValueError("position_ids_must_be_unique")

    active_ids = {item.evidence_id for item in evidence if item.active}
    missing_required = tuple(sorted(set(required_evidence_ids) - active_ids))
    assessments = tuple(
        assess_position(position, evidence, required_evidence_ids)
        for position in positions
    )
    if missing_required:
        return DebateResolution(
            "insufficient_evidence",
            None,
            None,
            "missing_required_evidence:" + ",".join(missing_required),
            assessments,
            (),
        )

    eligible = [assessment for assessment in assessments if assessment.eligible]
    if not eligible:
        return DebateResolution(
            "unresolved",
            None,
            None,
            "all_positions_reference_invalid_evidence",
            assessments,
            (),
        )

    # 证据覆盖率优先，其次看回应了多少对立立场；多数票不参与事实裁决。
    eligible.sort(
        key=lambda item: (
            -item.required_coverage,
            -len(item.position.answered_position_ids),
            item.position.position_id,
        )
    )
    selected = eligible[0]
    if selected.required_coverage < 1:
        return DebateResolution(
            "unresolved",
            None,
            None,
            "no_position_covers_required_evidence",
            assessments,
            tuple(item.position.claim for item in eligible),
        )

    concerns = tuple(
        item.position.claim
        for item in eligible[1:]
        if item.position.decision != selected.position.decision
    )
    return DebateResolution(
        "resolved",
        selected.position.decision,
        selected.position.position_id,
        "evidence_coverage_satisfied",
        assessments,
        concerns,
    )
