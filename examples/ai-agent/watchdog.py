from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Progress:
    phase: str
    now: float
    last_activity_at: float
    deadline_at: float
    repeated_action_count: int = 0
    state_revision: int = 0
    previous_state_revision: int = 0


def watchdog_decision(progress: Progress, *, idle_seconds: float = 30.0) -> str:
    if progress.now >= progress.deadline_at:
        return "cancel_deadline"
    if progress.repeated_action_count >= 3 and progress.state_revision == progress.previous_state_revision:
        return "stop_stalled_loop"
    if progress.now - progress.last_activity_at >= idle_seconds:
        return "probe_worker"
    return "continue"
