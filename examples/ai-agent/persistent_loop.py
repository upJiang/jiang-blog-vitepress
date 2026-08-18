from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Literal


Phase = Literal[
    "created",
    "planned",
    "evidence_ready",
    "action_prepared",
    "completed",
    "cancelled",
    "abandoned",
    "manual_review",
]


class SimulatedCrash(RuntimeError):
    pass


@dataclass
class Checkpoint:
    turn_id: str
    question: str
    phase: Phase = "created"
    revision: int = 0
    expires_at: int = 0
    resume_attempts: int = 0
    max_resume_attempts: int = 2
    schema_version: int = 1
    unattended: bool = False
    requires_approval: bool = False
    evidence: list[str] = field(default_factory=list)
    answer: str = ""
    pending_action_id: str = ""
    stop_reason: str = ""


class InMemoryCheckpointStore:
    def __init__(self) -> None:
        self._items: dict[str, Checkpoint] = {}

    def load(self, turn_id: str) -> Checkpoint | None:
        item = self._items.get(turn_id)
        return replace(item, evidence=list(item.evidence)) if item else None

    def save(self, checkpoint: Checkpoint) -> Checkpoint:
        previous = self._items.get(checkpoint.turn_id)
        expected_revision = previous.revision if previous else 0
        if checkpoint.revision != expected_revision:
            raise RuntimeError("checkpoint_revision_conflict")
        stored = replace(
            checkpoint,
            evidence=list(checkpoint.evidence),
            revision=checkpoint.revision + 1,
        )
        self._items[checkpoint.turn_id] = stored
        return replace(stored, evidence=list(stored.evidence))


class IdempotentDelivery:
    def __init__(self) -> None:
        self.receipts: dict[str, str] = {}
        self.deliveries: list[str] = []

    def send(self, action_id: str, content: str) -> str:
        if action_id in self.receipts:
            return self.receipts[action_id]
        self.deliveries.append(content)
        receipt = f"receipt:{action_id}"
        self.receipts[action_id] = receipt
        return receipt


@dataclass(frozen=True)
class ResumeResult:
    status: Phase
    reason: str


class PersistentAgentLoop:
    def __init__(
        self,
        store: InMemoryCheckpointStore,
        delivery: IdempotentDelivery,
    ) -> None:
        self.store = store
        self.delivery = delivery

    def start(
        self,
        turn_id: str,
        question: str,
        *,
        now: int,
        ttl: int = 300,
        requires_approval: bool = False,
        crash_after: str = "",
    ) -> Checkpoint:
        checkpoint = Checkpoint(
            turn_id=turn_id,
            question=question,
            expires_at=now + ttl,
            requires_approval=requires_approval,
        )
        checkpoint = self.store.save(checkpoint)
        return self._run(checkpoint, crash_after=crash_after)

    def resume(
        self,
        turn_id: str,
        *,
        now: int,
        enabled: bool = True,
        authorized: bool = True,
        crash_after: str = "",
    ) -> ResumeResult:
        checkpoint = self.store.load(turn_id)
        if checkpoint is None:
            return ResumeResult("abandoned", "checkpoint_not_found")
        if checkpoint.phase in {"completed", "cancelled", "abandoned", "manual_review"}:
            return ResumeResult(checkpoint.phase, checkpoint.stop_reason or "terminal")
        if not enabled:
            return ResumeResult(checkpoint.phase, "resume_disabled")
        if now > checkpoint.expires_at:
            checkpoint.phase = "abandoned"
            checkpoint.stop_reason = "resume_window_expired"
            self.store.save(checkpoint)
            return ResumeResult("abandoned", checkpoint.stop_reason)
        if checkpoint.schema_version != 1:
            checkpoint.phase = "abandoned"
            checkpoint.stop_reason = "unsupported_checkpoint_schema"
            self.store.save(checkpoint)
            return ResumeResult("abandoned", checkpoint.stop_reason)
        if checkpoint.resume_attempts >= checkpoint.max_resume_attempts:
            checkpoint.phase = "manual_review"
            checkpoint.stop_reason = "resume_attempt_limit"
            self.store.save(checkpoint)
            return ResumeResult("manual_review", checkpoint.stop_reason)

        checkpoint.resume_attempts += 1
        checkpoint.unattended = True
        checkpoint = self.store.save(checkpoint)

        if not authorized:
            checkpoint.phase = "abandoned"
            checkpoint.stop_reason = "authorization_revoked"
            self.store.save(checkpoint)
            return ResumeResult("abandoned", checkpoint.stop_reason)
        if checkpoint.requires_approval:
            checkpoint.phase = "manual_review"
            checkpoint.stop_reason = "approval_required_for_unattended_resume"
            self.store.save(checkpoint)
            return ResumeResult("manual_review", checkpoint.stop_reason)

        resumed = self._run(checkpoint, crash_after=crash_after)
        return ResumeResult(resumed.phase, resumed.stop_reason or "resumed")

    def cancel(self, turn_id: str) -> Checkpoint:
        checkpoint = self.store.load(turn_id)
        if checkpoint is None:
            raise LookupError("checkpoint_not_found")
        if checkpoint.phase != "completed":
            checkpoint.phase = "cancelled"
            checkpoint.stop_reason = "cancelled_by_user"
            checkpoint = self.store.save(checkpoint)
        return checkpoint

    def _run(self, checkpoint: Checkpoint, *, crash_after: str) -> Checkpoint:
        if checkpoint.phase == "created":
            checkpoint.phase = "planned"
            checkpoint = self.store.save(checkpoint)
            self._crash_if_requested("planned", crash_after)

        if checkpoint.phase == "planned":
            checkpoint.evidence = ["员工手册：远程访问须经管理员审批"]
            checkpoint.phase = "evidence_ready"
            checkpoint = self.store.save(checkpoint)
            self._crash_if_requested("evidence_ready", crash_after)

        if checkpoint.phase == "evidence_ready":
            checkpoint.answer = "远程访问在管理员审批后生效。"
            checkpoint.pending_action_id = f"{checkpoint.turn_id}:deliver-answer"
            checkpoint.phase = "action_prepared"
            checkpoint = self.store.save(checkpoint)
            self._crash_if_requested("action_prepared", crash_after)

        if checkpoint.phase == "action_prepared":
            self.delivery.send(checkpoint.pending_action_id, checkpoint.answer)
            self._crash_if_requested("after_delivery", crash_after)
            checkpoint.phase = "completed"
            checkpoint.stop_reason = "completed"
            checkpoint = self.store.save(checkpoint)
        return checkpoint

    @staticmethod
    def _crash_if_requested(position: str, crash_after: str) -> None:
        if position == crash_after:
            raise SimulatedCrash(position)


if __name__ == "__main__":
    store = InMemoryCheckpointStore()
    delivery = IdempotentDelivery()
    loop = PersistentAgentLoop(store, delivery)
    try:
        loop.start("turn:1", "远程访问什么时候生效？", now=100, crash_after="evidence_ready")
    except SimulatedCrash:
        print(loop.resume("turn:1", now=120))
        print(delivery.deliveries)
