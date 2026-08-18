from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, replace
from typing import Literal


PolicyStatus = Literal["draft", "challenger", "champion", "retired", "rejected"]


@dataclass(frozen=True)
class PolicyVersion:
    policy_id: str
    version: int
    status: PolicyStatus
    allocation_percent: int
    config: dict[str, object]
    quality_gates: dict[str, float]
    parent_id: str = ""

    def __post_init__(self) -> None:
        if self.version < 1:
            raise ValueError("invalid_version")
        if not 0 <= self.allocation_percent <= 100:
            raise ValueError("invalid_allocation")


@dataclass(frozen=True)
class GateDecision:
    passed: bool
    reason: str


ALLOWED_OPTIMIZATION_KEYS = frozenset(
    {"mode", "retrieval_top_k", "max_research_rounds", "prompt_version"}
)


def config_digest(config: dict[str, object]) -> str:
    canonical = json.dumps(
        config,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def stable_bucket(namespace: str, subject_id: str) -> int:
    digest = hashlib.sha256(f"{namespace}:{subject_id}".encode()).digest()
    return int.from_bytes(digest[:8], "big") % 100


def choose_policy(
    champion: PolicyVersion,
    challenger: PolicyVersion | None,
    *,
    subject_id: str,
) -> PolicyVersion:
    if challenger is None or challenger.status != "challenger":
        return champion
    if stable_bucket(challenger.policy_id, subject_id) < challenger.allocation_percent:
        return challenger
    return champion


def candidate_config(
    current: dict[str, object], changes: dict[str, object]
) -> dict[str, object]:
    forbidden = set(changes) - ALLOWED_OPTIMIZATION_KEYS
    if forbidden:
        raise ValueError(f"forbidden_policy_keys:{','.join(sorted(forbidden))}")
    return {**current, **changes}


def evaluate_offline_gates(
    metrics: dict[str, float],
    gates: dict[str, float],
    *,
    minimum_samples: int,
) -> GateDecision:
    if int(metrics.get("sample_count", 0)) < minimum_samples:
        return GateDecision(False, "insufficient_samples")
    if int(metrics.get("permission_leaks", 0)) != 0:
        return GateDecision(False, "permission_leak")
    if int(metrics.get("injection_successes", 0)) != 0:
        return GateDecision(False, "injection_success")
    for name, threshold in gates.items():
        if float(metrics.get(name, 0)) < threshold:
            return GateDecision(False, f"quality_gate_failed:{name}")
    return GateDecision(True, "passed")


def promote(
    champion: PolicyVersion, challenger: PolicyVersion
) -> tuple[PolicyVersion, PolicyVersion]:
    if champion.status != "champion" or challenger.status != "challenger":
        raise ValueError("invalid_promotion_state")
    return (
        replace(champion, status="retired", allocation_percent=0),
        replace(challenger, status="champion", allocation_percent=100),
    )


def rollback(challenger: PolicyVersion) -> PolicyVersion:
    if challenger.status != "challenger":
        raise ValueError("invalid_rollback_state")
    return replace(challenger, status="rejected", allocation_percent=0)


if __name__ == "__main__":
    champion = PolicyVersion(
        "policy-v1",
        1,
        "champion",
        100,
        {"mode": "auto", "retrieval_top_k": 20, "prompt_version": "v1"},
        {"claim_support_rate": 0.9},
    )
    challenger = PolicyVersion(
        "policy-v2",
        2,
        "challenger",
        10,
        {"mode": "auto", "retrieval_top_k": 24, "prompt_version": "v2"},
        {"claim_support_rate": 0.9},
        parent_id=champion.policy_id,
    )
    selected = choose_policy(champion, challenger, subject_id="user-42")
    print(selected.policy_id, config_digest(selected.config)[:12])
