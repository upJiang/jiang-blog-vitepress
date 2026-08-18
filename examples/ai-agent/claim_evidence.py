from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    release_id: str
    text: str
    locator: str
    visible: bool = True
    fields: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True)
class Claim:
    claim_id: str
    text: str
    evidence_ids: tuple[str, ...]
    status: Literal["supported", "partial", "unsupported", "conflict"]


@dataclass(frozen=True)
class Citation:
    claim_id: str
    evidence_id: str
    locator: str


def normalized(value: str) -> str:
    return re.sub(r"[^\u4e00-\u9fffa-z0-9]+", "", value.casefold())


def directly_supported(claim: Claim, evidence: Evidence) -> bool:
    claim_value = normalized(claim.text)
    if claim_value and claim_value in normalized(evidence.text):
        return True
    field_text = "；".join(f"{key}：{value}" for key, value in evidence.fields)
    return bool(field_text and claim_value == normalized(field_text))


def validate_claims(
    claims: list[Claim],
    evidence: list[Evidence],
    *,
    release_id: str,
) -> dict[str, tuple[str, ...]]:
    by_id = {item.evidence_id: item for item in evidence}
    issues: dict[str, tuple[str, ...]] = {}
    for claim in claims:
        claim_issues: list[str] = []
        if claim.status != "supported":
            claim_issues.append(f"claim_status:{claim.status}")
        if not claim.evidence_ids:
            claim_issues.append("missing_evidence_binding")
        bound: list[Evidence] = []
        for evidence_id in claim.evidence_ids:
            item = by_id.get(evidence_id)
            if item is None:
                claim_issues.append(f"unknown_evidence:{evidence_id}")
            elif not item.visible:
                claim_issues.append(f"hidden_evidence:{evidence_id}")
            elif item.release_id != release_id:
                claim_issues.append(f"wrong_release:{evidence_id}")
            else:
                bound.append(item)
        if bound and not any(directly_supported(claim, item) for item in bound):
            claim_issues.append("unsupported_text")
        if claim_issues:
            issues[claim.claim_id] = tuple(claim_issues)
    return issues


def citations_for_answer(
    answer: str,
    claims: list[Claim],
    evidence: list[Evidence],
    *,
    release_id: str,
) -> list[Citation]:
    issues = validate_claims(claims, evidence, release_id=release_id)
    by_id = {item.evidence_id: item for item in evidence}
    citations: list[Citation] = []
    answer_value = normalized(answer)
    for claim in claims:
        if claim.claim_id in issues or normalized(claim.text) not in answer_value:
            continue
        for evidence_id in claim.evidence_ids:
            item = by_id[evidence_id]
            citations.append(Citation(claim.claim_id, evidence_id, item.locator))
    return citations


def run_demo() -> tuple[dict[str, tuple[str, ...]], list[Citation]]:
    evidence = [
        Evidence(
            "policy",
            "release-7",
            "设备完成整改后，可以重新提交远程访问申请。",
            "remote-access.md#重新提交",
        ),
        Evidence(
            "hidden",
            "release-7",
            "内部处置流程。",
            "internal.md#处置",
            visible=False,
        ),
    ]
    claims = [
        Claim("claim-1", "设备完成整改后，可以重新提交远程访问申请。", ("policy",), "supported"),
        Claim("claim-2", "普通员工可以查看内部处置流程。", ("hidden",), "supported"),
    ]
    answer = "设备完成整改后，可以重新提交远程访问申请。"
    return (
        validate_claims(claims, evidence, release_id="release-7"),
        citations_for_answer(answer, claims, evidence, release_id="release-7"),
    )


if __name__ == "__main__":
    print(run_demo())
