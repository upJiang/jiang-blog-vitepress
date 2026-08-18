from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Mode = Literal["blocked", "fast", "standard", "deep"]
RequestedMode = Literal["auto", "fast", "standard", "deep"]


@dataclass(frozen=True)
class TaskFeatures:
    question: str
    scope_count: int
    atomic_fact: bool
    comprehensive_answer: bool
    cross_source_comparison: bool
    security_blocked: bool = False


@dataclass(frozen=True)
class RouteDecision:
    mode: Mode
    reason_codes: tuple[str, ...]
    max_research_rounds: int
    evidence_budget: int
    checkpoint_required: bool
    revision: int = 0


_MODE_LIMITS: dict[Mode, tuple[int, int, bool]] = {
    "blocked": (0, 0, False),
    "fast": (0, 12, False),
    "standard": (1, 20, True),
    "deep": (2, 30, True),
}


def _decision(mode: Mode, *reasons: str, revision: int = 0) -> RouteDecision:
    rounds, evidence_budget, checkpoint = _MODE_LIMITS[mode]
    return RouteDecision(mode, tuple(reasons), rounds, evidence_budget, checkpoint, revision)


def choose_mode(requested: RequestedMode, features: TaskFeatures) -> RouteDecision:
    if not features.question.strip():
        raise ValueError("question_must_not_be_empty")
    if features.scope_count < 0:
        raise ValueError("scope_count_must_not_be_negative")
    if features.security_blocked:
        return _decision("blocked", "security_policy_blocked")
    if requested != "auto":
        return _decision(requested, "explicit_request")
    if features.scope_count > 5 or features.cross_source_comparison:
        return _decision("deep", "broad_scope_or_comparison")
    if features.comprehensive_answer:
        return _decision("standard", "complete_explanation_required")
    if features.atomic_fact:
        return _decision("fast", "single_fact_lookup")
    return _decision("standard", "default_safe_mode")


def escalate_once(
    decision: RouteDecision,
    *,
    evidence_coverage: float,
    remaining_ms: int,
) -> RouteDecision:
    if not 0 <= evidence_coverage <= 1:
        raise ValueError("coverage_out_of_range")
    if decision.revision > 0 or decision.mode in {"blocked", "deep"}:
        return decision
    if evidence_coverage >= 0.8 or remaining_ms < 2_000:
        return decision
    next_mode: Mode = "standard" if decision.mode == "fast" else "deep"
    return _decision(
        next_mode,
        *decision.reason_codes,
        "insufficient_evidence_coverage",
        revision=decision.revision + 1,
    )
