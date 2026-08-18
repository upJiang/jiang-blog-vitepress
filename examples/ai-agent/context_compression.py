from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Message:
    message_id: str
    role: str
    content: str


@dataclass(frozen=True)
class CompressionPlan:
    source_messages: tuple[Message, ...]
    recent_messages: tuple[Message, ...]
    covered_until_message_id: str


@dataclass(frozen=True)
class SummaryRecord:
    text: str
    covered_until_message_id: str
    revision: int


def plan_compression(messages: list[Message], keep_recent: int) -> CompressionPlan | None:
    if keep_recent <= 0:
        raise ValueError("keep_recent_must_be_positive")
    if len(messages) <= keep_recent:
        return None
    source = tuple(messages[:-keep_recent])
    return CompressionPlan(source, tuple(messages[-keep_recent:]), source[-1].message_id)


def accept_summary(
    plan: CompressionPlan,
    candidate: str,
    *,
    protected_facts: tuple[str, ...],
    previous_revision: int = 0,
) -> SummaryRecord:
    summary = candidate.strip()
    if not summary:
        raise ValueError("empty_summary")
    missing = [fact for fact in protected_facts if fact not in summary]
    if missing:
        raise ValueError(f"summary_missing_protected_facts:{','.join(missing)}")
    return SummaryRecord(summary, plan.covered_until_message_id, previous_revision + 1)
