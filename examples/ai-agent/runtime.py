from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


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
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    events: list[Event] = field(default_factory=list)

    def append(self, event_type: str, payload: dict[str, object]) -> Event:
        event = Event(len(self.events) + 1, event_type, payload)
        self.events.append(event)
        return event

    def replay_after(self, sequence: int) -> list[Event]:
        return [event for event in self.events if event.sequence > sequence]


class TurnStore:
    def __init__(self) -> None:
        self._by_key: dict[str, Turn] = {}

    def create(self, turn: Turn) -> Turn:
        existing = self._by_key.get(turn.idempotency_key)
        if existing is not None:
            return existing
        self._by_key[turn.idempotency_key] = turn
        return turn
