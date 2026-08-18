from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Phase = Literal[
    "init",
    "awaiting_model",
    "retrying_model",
    "compacting",
    "awaiting_approval",
    "executing_tool",
    "streaming_model",
    "force_stop",
    "done",
]


@dataclass
class Progress:
    phase: str
    now: float
    last_activity_at: float
    deadline_at: float
    repeated_action_count: int = 0
    state_revision: int = 0
    previous_state_revision: int = 0
    turn_id: str = "turn:example"
    phase_revision: int = 1
    last_stream_chunk_at: float | None = None
    tracker_valid: bool = True


@dataclass(frozen=True)
class WatchdogDecision:
    action: Literal[
        "continue",
        "soft_alert",
        "hard_cancel",
        "stream_cancel",
        "deadline_expired",
        "delegate",
        "watchdog_disabled",
    ]
    reason: str
    owner: str


class StageWatchdog:
    MODEL_IDLE_PHASES = {"awaiting_model", "force_stop"}

    def __init__(
        self,
        *,
        soft_idle: float = 30,
        hard_idle: float = 90,
        stream_gap: float = 20,
    ) -> None:
        if not 0 < soft_idle < hard_idle:
            raise ValueError("soft_idle_must_be_less_than_hard_idle")
        self.soft_idle = soft_idle
        self.hard_idle = hard_idle
        self.stream_gap = stream_gap
        self._reported: set[tuple[str, int]] = set()

    def evaluate(self, progress: Progress) -> WatchdogDecision:
        if progress.now >= progress.deadline_at:
            return WatchdogDecision("deadline_expired", "turn_deadline", "runtime")
        if not progress.tracker_valid:
            return WatchdogDecision(
                "watchdog_disabled",
                "phase_tracker_invalid",
                "operator",
            )

        if progress.phase == "streaming_model":
            last_chunk = progress.last_stream_chunk_at
            if last_chunk is None:
                last_chunk = progress.last_activity_at
            gap = progress.now - last_chunk
            if gap >= self.stream_gap:
                return WatchdogDecision(
                    "stream_cancel",
                    "model_stream_gap",
                    "model_transport",
                )
            return WatchdogDecision("continue", "stream_active", "model_transport")

        if progress.phase in self.MODEL_IDLE_PHASES:
            idle = progress.now - progress.last_activity_at
            if idle >= self.hard_idle:
                return WatchdogDecision(
                    "hard_cancel",
                    "model_hard_idle",
                    "model_watchdog",
                )
            report_key = (progress.turn_id, progress.phase_revision)
            if idle >= self.soft_idle and report_key not in self._reported:
                self._reported.add(report_key)
                return WatchdogDecision(
                    "soft_alert",
                    "model_soft_idle",
                    "model_watchdog",
                )
            return WatchdogDecision("continue", "model_waiting", "model_watchdog")

        owners = {
            "executing_tool": "tool_timeout",
            "awaiting_approval": "approval_policy",
            "compacting": "local_stage",
            "retrying_model": "retry_policy",
            "init": "runtime",
            "done": "runtime",
        }
        return WatchdogDecision(
            "delegate",
            f"owned_by:{owners.get(progress.phase, 'unknown')}",
            owners.get(progress.phase, "unknown"),
        )


@dataclass(frozen=True)
class PhaseToken:
    previous_phase: Phase
    previous_revision: int
    token_id: int


class PhaseTracker:
    def __init__(self, phase: Phase = "init") -> None:
        self.phase = phase
        self.revision = 1
        self.valid = True
        self._active_token: int | None = None
        self._next_token = 1

    def enter(self, phase: Phase) -> None:
        if self._active_token is not None:
            self.valid = False
            return
        self.phase = phase
        self.revision += 1

    def enter_transient(self, phase: Phase) -> PhaseToken:
        if self._active_token is not None:
            self.valid = False
            return PhaseToken(self.phase, self.revision, -1)
        token = PhaseToken(self.phase, self.revision, self._next_token)
        self._next_token += 1
        self._active_token = token.token_id
        self.phase = phase
        self.revision += 1
        return token

    def restore(self, token: PhaseToken) -> None:
        if token.token_id != self._active_token:
            if self._active_token is None and token.token_id > 0:
                return
            self.valid = False
            return
        self.phase = token.previous_phase
        self.revision += 1
        self._active_token = None


def watchdog_decision(progress: Progress, *, idle_seconds: float = 30.0) -> str:
    """Backward-compatible facade used by the shared example test suite."""
    if progress.now >= progress.deadline_at:
        return "cancel_deadline"
    if progress.repeated_action_count >= 3 and progress.state_revision == progress.previous_state_revision:
        return "stop_stalled_loop"
    if progress.now - progress.last_activity_at >= idle_seconds:
        return "probe_worker"
    return "continue"


if __name__ == "__main__":
    watchdog = StageWatchdog()
    print(watchdog.evaluate(Progress("awaiting_model", 40, 0, 100)))
