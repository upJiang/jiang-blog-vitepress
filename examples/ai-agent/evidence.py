from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Evidence:
    id: str
    text: str
    visible: bool


@dataclass(frozen=True)
class Claim:
    text: str
    evidence_ids: tuple[str, ...]
    status: Literal["supported", "unsupported", "conflict"]


def validate_claim(claim: Claim, evidence: list[Evidence]) -> list[str]:
    by_id = {item.id: item for item in evidence}
    issues: list[str] = []
    if claim.status != "supported":
        issues.append(f"claim_status:{claim.status}")
    for evidence_id in claim.evidence_ids:
        item = by_id.get(evidence_id)
        if item is None:
            issues.append(f"missing_evidence:{evidence_id}")
        elif not item.visible:
            issues.append(f"hidden_evidence:{evidence_id}")
    if not claim.evidence_ids:
        issues.append("claim_has_no_evidence")
    return issues
