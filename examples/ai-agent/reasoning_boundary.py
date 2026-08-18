from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Iterable, Literal


@dataclass(frozen=True)
class EvidenceRef:
    evidence_id: str
    version: str


@dataclass(frozen=True)
class PublicStep:
    step_id: str
    kind: Literal["given", "calculation", "conclusion"]
    statement: str
    premise_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class StepIssue:
    step_id: str
    code: str


@dataclass(frozen=True)
class DecisionRecord:
    request_id: str
    input_digest: str
    action_names: tuple[str, ...]
    evidence_refs: tuple[EvidenceRef, ...]
    decision_summary: str
    final_answer: str
    stop_reason: str


def validate_public_steps(
    steps: Iterable[PublicStep],
    evidence: Iterable[EvidenceRef],
) -> tuple[StepIssue, ...]:
    ordered_steps = tuple(steps)
    known_evidence = {item.evidence_id for item in evidence}
    seen_steps: set[str] = set()
    issues: list[StepIssue] = []

    for step in ordered_steps:
        if step.step_id in seen_steps:
            issues.append(StepIssue(step.step_id, "duplicate_step_id"))
            continue

        missing_premises = set(step.premise_ids) - seen_steps
        if missing_premises:
            issues.append(StepIssue(step.step_id, "unknown_or_forward_premise"))

        missing_evidence = set(step.evidence_ids) - known_evidence
        if missing_evidence:
            issues.append(StepIssue(step.step_id, "unknown_evidence"))

        if step.kind == "given" and not step.evidence_ids:
            issues.append(StepIssue(step.step_id, "given_without_evidence"))
        if step.kind != "given" and not step.premise_ids:
            issues.append(StepIssue(step.step_id, "derived_step_without_premise"))
        if not step.statement.strip():
            issues.append(StepIssue(step.step_id, "empty_statement"))

        seen_steps.add(step.step_id)

    if not ordered_steps or ordered_steps[-1].kind != "conclusion":
        issues.append(StepIssue("", "missing_final_conclusion"))
    return tuple(issues)


def build_decision_record(
    *,
    request_id: str,
    user_input: str,
    action_names: Iterable[str],
    evidence_refs: Iterable[EvidenceRef],
    decision_summary: str,
    final_answer: str,
    stop_reason: str,
) -> DecisionRecord:
    # 审计记录保存输入摘要，不复制用户正文或模型私有推理。
    digest = hashlib.sha256(user_input.encode("utf-8")).hexdigest()
    return DecisionRecord(
        request_id=request_id,
        input_digest=digest,
        action_names=tuple(action_names),
        evidence_refs=tuple(evidence_refs),
        decision_summary=decision_summary,
        final_answer=final_answer,
        stop_reason=stop_reason,
    )
