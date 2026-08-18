from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


TurnStatus = Literal[
    "pending",
    "running",
    "cancel_requested",
    "completed",
    "failed",
    "cancelled",
    "expired",
]


@dataclass(frozen=True)
class Message:
    id: str
    role: Literal["user", "assistant"]
    content: str


@dataclass(frozen=True)
class Task:
    id: str
    turn_id: str
    attempt: int


@dataclass(frozen=True)
class Event:
    sequence: int
    event_type: str
    payload: dict[str, object]


@dataclass
class Turn:
    id: str
    idempotency_key: str
    release_id: str
    policy_id: str
    status: TurnStatus = "pending"
    answer: str = ""
    error_code: str = ""
    events: list[Event] = field(default_factory=list)

    def append(self, event_type: str, payload: dict[str, object]) -> Event:
        event = Event(len(self.events) + 1, event_type, payload)
        self.events.append(event)
        return event

    def replay_after(self, sequence: int) -> list[Event]:
        return [event for event in self.events if event.sequence > sequence]

    def start(self) -> bool:
        if self.status != "pending":
            return False
        self.status = "running"
        self.append("turn.started", {"turn_id": self.id})
        return True

    def request_cancel(self) -> bool:
        if self.status == "pending":
            self.status = "cancelled"
            self._append_terminal("turn.cancelled", {})
            return True
        if self.status == "running":
            self.status = "cancel_requested"
            self.append("turn.cancel_requested", {})
            return True
        return False

    def complete(self, answer: str) -> bool:
        if self.status not in {"pending", "running"}:
            return False
        self.status = "completed"
        self.answer = answer
        self._append_terminal("turn.completed", {"answer": answer})
        return True

    def acknowledge_cancel(self) -> bool:
        if self.status != "cancel_requested":
            return False
        self.status = "cancelled"
        self._append_terminal("turn.cancelled", {})
        return True

    def expire(self) -> bool:
        if self.status not in {"pending", "running", "cancel_requested"}:
            return False
        self.status = "expired"
        self.error_code = "deadline_exceeded"
        self._append_terminal("turn.expired", {"error_code": self.error_code})
        return True

    def _append_terminal(self, event_type: str, payload: dict[str, object]) -> Event:
        terminal = {"turn.completed", "turn.failed", "turn.cancelled", "turn.expired"}
        existing = next((event for event in self.events if event.event_type in terminal), None)
        return existing if existing is not None else self.append(event_type, payload)


class TurnStore:
    def __init__(self) -> None:
        self._by_key: dict[str, Turn] = {}

    def create(self, turn: Turn) -> Turn:
        existing = self._by_key.get(turn.idempotency_key)
        if existing is not None:
            return existing
        self._by_key[turn.idempotency_key] = turn
        return turn
