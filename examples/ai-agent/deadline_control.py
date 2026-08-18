from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Literal


Status = Literal[
    "pending",
    "running",
    "cancel_requested",
    "completed",
    "cancelled",
    "expired",
    "failed",
]


@dataclass
class Turn:
    turn_id: str
    deadline_at: float
    status: Status = "pending"
    phase: str = "created"
    revision: int = 0
    checkpoints: list[str] = field(default_factory=list)
    cleanup_errors: list[str] = field(default_factory=list)
    stop_reason: str = ""


class ManualClock:
    def __init__(self, now: float = 0) -> None:
        self.now = now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class TurnStore:
    def __init__(self) -> None:
        self.turns: dict[str, Turn] = {}

    def save(self, turn: Turn) -> Turn:
        stored = replace(
            turn,
            checkpoints=list(turn.checkpoints),
            cleanup_errors=list(turn.cleanup_errors),
            revision=turn.revision + 1,
        )
        self.turns[turn.turn_id] = stored
        return self.load(turn.turn_id)

    def load(self, turn_id: str) -> Turn:
        turn = self.turns[turn_id]
        return replace(
            turn,
            checkpoints=list(turn.checkpoints),
            cleanup_errors=list(turn.cleanup_errors),
        )


class DeadlineRuntime:
    def __init__(self, store: TurnStore, clock: ManualClock) -> None:
        self.store = store
        self.clock = clock

    def create(self, turn_id: str, total_seconds: float) -> Turn:
        return self.store.save(Turn(turn_id, self.clock.now + total_seconds))

    def remaining(self, turn: Turn) -> float:
        return max(0.0, turn.deadline_at - self.clock.now)

    def stage_budget(
        self,
        turn: Turn,
        *,
        stage_limit: float,
        cleanup_reserve: float = 1.0,
    ) -> float:
        return max(0.0, min(stage_limit, self.remaining(turn) - cleanup_reserve))

    def request_cancel(self, turn_id: str) -> Turn:
        turn = self.store.load(turn_id)
        if turn.status == "pending":
            turn.status = "cancelled"
            turn.stop_reason = "cancelled_before_start"
        elif turn.status == "running":
            turn.status = "cancel_requested"
            turn.stop_reason = "cancel_requested"
        return self.store.save(turn)

    def run_stage(
        self,
        turn_id: str,
        phase: str,
        *,
        duration: float,
        stage_limit: float,
    ) -> Turn:
        turn = self.store.load(turn_id)
        self._ensure_active(turn)
        if turn.status == "pending":
            turn.status = "running"
        budget = self.stage_budget(turn, stage_limit=stage_limit)
        if budget <= 0 or duration > budget:
            turn.status = "expired"
            turn.stop_reason = f"stage_timeout:{phase}"
            return self.store.save(turn)

        self.clock.advance(duration)
        turn.phase = phase
        turn.checkpoints.append(phase)
        return self.store.save(turn)

    def resume(self, turn_id: str) -> Turn:
        turn = self.store.load(turn_id)
        self._ensure_active(turn)
        if self.remaining(turn) <= 0:
            turn.status = "expired"
            turn.stop_reason = "deadline_exceeded_before_resume"
        return self.store.save(turn)

    def finish(self, turn_id: str) -> Turn:
        turn = self.store.load(turn_id)
        self._ensure_active(turn)
        turn.status = "completed"
        turn.stop_reason = "completed"
        return self.store.save(turn)

    def cleanup(self, turn_id: str, *, fail: bool = False) -> Turn:
        turn = self.store.load(turn_id)
        if fail:
            turn.cleanup_errors.append("resource_release_failed")
        return self.store.save(turn)

    def _ensure_active(self, turn: Turn) -> None:
        if turn.status in {"cancel_requested", "cancelled"}:
            if turn.status == "cancel_requested":
                turn.status = "cancelled"
                turn.stop_reason = "cancelled_at_safe_point"
                self.store.save(turn)
            raise RuntimeError(turn.stop_reason)
        if turn.status in {"completed", "expired", "failed"}:
            raise RuntimeError(f"turn_terminal:{turn.status}")


if __name__ == "__main__":
    clock = ManualClock(100)
    store = TurnStore()
    runtime = DeadlineRuntime(store, clock)
    runtime.create("turn:1", total_seconds=10)
    runtime.run_stage("turn:1", "planned", duration=2, stage_limit=4)
    print(runtime.run_stage("turn:1", "retrieved", duration=3, stage_limit=4))
