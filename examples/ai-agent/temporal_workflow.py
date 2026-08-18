from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


EventKind = Literal[
    "workflow.started",
    "approval.waiting",
    "approval.accepted",
    "cancel.requested",
    "activity.completed",
    "workflow.completed",
    "workflow.cancelled",
    "continue_as_new",
]


@dataclass(frozen=True)
class HistoryEvent:
    kind: EventKind
    payload: dict[str, str]


@dataclass
class ActivityLedger:
    receipts: dict[str, str] = field(default_factory=dict)
    effect_count: int = 0

    def execute_once(self, action_id: str, result: str) -> str:
        if action_id in self.receipts:
            return self.receipts[action_id]
        self.effect_count += 1
        self.receipts[action_id] = result
        return result


@dataclass
class WorkflowState:
    phase: str = "new"
    status: str = "running"
    activity_result: str | None = None
    cancel_requested: bool = False


def replay(history: list[HistoryEvent]) -> WorkflowState:
    state = WorkflowState()
    for event in history:
        if event.kind == "approval.waiting":
            state.phase = "waiting_approval"
        elif event.kind == "approval.accepted":
            state.phase = "retrieving"
        elif event.kind == "cancel.requested":
            state.cancel_requested = True
        elif event.kind == "activity.completed":
            state.activity_result = event.payload["result"]
            state.phase = "ready_to_complete"
        elif event.kind == "workflow.completed":
            state.status = "completed"
            state.phase = "done"
        elif event.kind == "workflow.cancelled":
            state.status = "cancelled"
            state.phase = "done"
        elif event.kind == "continue_as_new":
            state = WorkflowState(phase=event.payload.get("phase", "new"))
    return state


def handle_signal(history: list[HistoryEvent], kind: Literal["approve", "cancel"]) -> None:
    if kind == "approve":
        history.append(HistoryEvent("approval.accepted", {}))
    else:
        history.append(HistoryEvent("cancel.requested", {}))


def run_next_step(history: list[HistoryEvent], ledger: ActivityLedger) -> str:
    state = replay(history)
    if state.status != "running":
        return state.status
    if state.cancel_requested:
        history.append(HistoryEvent("workflow.cancelled", {}))
        return "cancelled"
    if state.phase == "new":
        history.extend(
            [
                HistoryEvent("workflow.started", {}),
                HistoryEvent("approval.waiting", {}),
            ]
        )
        return "waiting_approval"
    if state.phase == "retrieving":
        result = ledger.execute_once("turn:1:retrieve", "evidence:1")
        history.append(HistoryEvent("activity.completed", {"result": result}))
        return "ready_to_complete"
    if state.phase == "ready_to_complete":
        history.append(HistoryEvent("workflow.completed", {}))
        return "completed"
    return state.phase


def continue_as_new(history: list[HistoryEvent], phase: str) -> None:
    history.clear()
    history.append(HistoryEvent("continue_as_new", {"phase": phase}))


if __name__ == "__main__":
    history: list[HistoryEvent] = []
    ledger = ActivityLedger()
    run_next_step(history, ledger)
    handle_signal(history, "approve")
    print(run_next_step(history, ledger))
