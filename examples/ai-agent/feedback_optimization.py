from __future__ import annotations

import hashlib
from dataclasses import dataclass, replace


ALLOWED_POLICY_FIELDS = frozenset(
    {
        "retrieval_top_k",
        "minimum_coverage",
        "prompt_version",
        "max_research_rounds",
    }
)


@dataclass(frozen=True)
class Feedback:
    feedback_id: str
    turn_id: str
    verdict: str
    reasons: tuple[str, ...] = ()
    correction: str = ""
    active: bool = True
    optimization_eligible: bool = True


@dataclass(frozen=True)
class Policy:
    policy_id: str
    retrieval_top_k: int = 20
    minimum_coverage: float = 0.8
    prompt_version: str = "answer-v1"
    max_research_rounds: int = 2


@dataclass(frozen=True)
class OfflineMetrics:
    sample_count: int
    hit_at_5: float
    recall_at_20: float
    claim_support_rate: float
    citation_accuracy: float
    permission_leaks: int = 0
    injection_successes: int = 0


@dataclass(frozen=True)
class CanaryMetrics:
    turns: int
    feedback_count: int
    error_rate: float
    rejection_rate: float


@dataclass(frozen=True)
class CandidateDecision:
    status: str
    reason: str
    policy: Policy | None = None


def summarize_feedback(feedback: tuple[Feedback, ...]) -> dict[str, int]:
    eligible = tuple(item for item in feedback if item.active and item.optimization_eligible)
    return {
        "total": len(eligible),
        "adopted": sum(item.verdict == "adopted" for item in eligible),
        "rejected": sum(item.verdict == "rejected" for item in eligible),
        "retrieval_rejections": sum(
            item.verdict == "rejected"
            and bool({"retrieval", "missing_evidence", "wrong_source"} & set(item.reasons))
            for item in eligible
        ),
        "expression_rejections": sum(
            item.verdict == "rejected"
            and bool({"too_long", "too_short", "unclear"} & set(item.reasons))
            for item in eligible
        ),
    }


def propose_candidate(champion: Policy, feedback: tuple[Feedback, ...]) -> Policy | None:
    signals = summarize_feedback(feedback)
    if signals["total"] < 5:
        return None

    candidate = champion
    if signals["retrieval_rejections"] >= 2:
        candidate = replace(
            candidate,
            policy_id=f"{champion.policy_id}:challenger",
            retrieval_top_k=min(40, max(5, champion.retrieval_top_k + 4)),
            minimum_coverage=round(
                min(0.95, max(0.7, champion.minimum_coverage + 0.02)), 2
            ),
        )
    if signals["expression_rejections"] >= 2:
        candidate = replace(
            candidate,
            policy_id=f"{champion.policy_id}:challenger",
            prompt_version="answer-concise-v1",
        )
    return candidate if candidate != champion else None


def check_offline_gate(
    metrics: OfflineMetrics,
    minimums: dict[str, float],
) -> tuple[bool, str]:
    if metrics.sample_count < 5:
        return False, "insufficient_offline_samples"
    if metrics.permission_leaks:
        return False, "permission_leak"
    if metrics.injection_successes:
        return False, "prompt_injection_succeeded"
    for field in (
        "hit_at_5",
        "recall_at_20",
        "claim_support_rate",
        "citation_accuracy",
    ):
        if getattr(metrics, field) < minimums.get(field, 0):
            return False, f"{field}_below_gate"
    return True, "passed"


def stable_bucket(knowledge_base_id: str, user_id: str, request_id: str) -> int:
    identity = f"{knowledge_base_id}\0{user_id}\0{request_id}".encode()
    return int.from_bytes(hashlib.sha256(identity).digest()[:8], "big") % 100


def monitor_canary(
    champion: CanaryMetrics,
    challenger: CanaryMetrics,
    *,
    observation_expired: bool = False,
) -> CandidateDecision:
    if challenger.turns < 20:
        if observation_expired:
            return CandidateDecision("rolled_back", "insufficient_canary_samples")
        return CandidateDecision("observing", "insufficient_canary_samples")

    error_degraded = challenger.error_rate > max(0.01, champion.error_rate + 0.01)
    rejection_degraded = (
        challenger.feedback_count >= 5
        and challenger.rejection_rate > champion.rejection_rate + 0.05
    )
    if error_degraded or rejection_degraded:
        return CandidateDecision("rolled_back", "canary_quality_regression")
    return CandidateDecision("promoted", "canary_passed")


if __name__ == "__main__":
    champion = Policy("policy-v1")
    feedback = tuple(
        Feedback(f"feedback-{index}", f"turn-{index}", "rejected", ("retrieval",))
        for index in range(5)
    )
    print(propose_candidate(champion, feedback))
