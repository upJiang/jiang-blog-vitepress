from __future__ import annotations

import json
from dataclasses import dataclass, field


TERMINAL_TYPES = {"turn.completed", "turn.failed", "turn.cancelled", "turn.expired"}


@dataclass(frozen=True)
class Event:
    sequence: int
    event_type: str
    payload: dict[str, object]


@dataclass
class EventLog:
    events: list[Event] = field(default_factory=list)
    next_sequence: int = 1

    def append(self, event_type: str, payload: dict[str, object]) -> Event:
        if event_type in TERMINAL_TYPES:
            terminal = next((event for event in self.events if event.event_type in TERMINAL_TYPES), None)
            if terminal is not None:
                return terminal
        event = Event(self.next_sequence, event_type, payload)
        self.next_sequence += 1
        self.events.append(event)
        return event

    def append_batch(self, items: list[tuple[str, dict[str, object]]]) -> list[Event]:
        if any(event_type in TERMINAL_TYPES for event_type, _ in items):
            raise ValueError("terminal events must be appended individually")
        return [self.append(event_type, payload) for event_type, payload in items]

    def replay(self, after_sequence: int = 0) -> list[Event]:
        if after_sequence < 0:
            raise ValueError("cursor must not be negative")
        return [event for event in self.events if event.sequence > after_sequence]


@dataclass
class ClientProjection:
    last_sequence: int = 0
    answer: str = ""
    status: str = "running"

    def apply(self, event: Event) -> str:
        if event.sequence <= self.last_sequence:
            return "duplicate"
        if event.sequence != self.last_sequence + 1:
            return "gap"
        if event.event_type == "answer.delta":
            self.answer += str(event.payload["content"])
        elif event.event_type == "answer.replaced":
            self.answer = str(event.payload["content"])
        elif event.event_type in TERMINAL_TYPES:
            self.status = event.event_type.removeprefix("turn.")
        self.last_sequence = event.sequence
        return "applied"


def encode_sse(event: Event) -> bytes:
    payload = json.dumps(event.payload, ensure_ascii=False, separators=(",", ":"))
    return (
        f"id: {event.sequence}\nevent: {event.event_type}\ndata: {payload}\n\n"
    ).encode()


def events_ready(log: EventLog, cursor: int, notified_sequence: int | None) -> list[Event]:
    if notified_sequence is not None and notified_sequence <= cursor:
        return []
    return log.replay(cursor)


if __name__ == "__main__":
    log = EventLog()
    log.append("turn.created", {})
    log.append("answer.delta", {"content": "第一段"})
    for item in log.replay(0):
        print(encode_sse(item).decode(), end="")
