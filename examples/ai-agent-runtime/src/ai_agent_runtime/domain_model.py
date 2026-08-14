from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from threading import Lock


class TurnStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    CANCEL_REQUESTED = "cancel_requested"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class TurnEvent(StrEnum):
    WORKER_CLAIMED = "worker_claimed"
    CANCEL_REQUESTED = "cancel_requested"
    STOPPED = "stopped"
    ANSWER_VALIDATED = "answer_validated"
    UNRECOVERABLE_ERROR = "unrecoverable_error"
    DEADLINE_HIT = "deadline_hit"


TERMINAL_STATUSES = {
    TurnStatus.COMPLETED,
    TurnStatus.FAILED,
    TurnStatus.CANCELLED,
    TurnStatus.EXPIRED,
}

TRANSITIONS = {
    (TurnStatus.PENDING, TurnEvent.WORKER_CLAIMED): TurnStatus.RUNNING,
    (TurnStatus.PENDING, TurnEvent.CANCEL_REQUESTED): TurnStatus.CANCELLED,
    (TurnStatus.PENDING, TurnEvent.DEADLINE_HIT): TurnStatus.EXPIRED,
    (TurnStatus.RUNNING, TurnEvent.CANCEL_REQUESTED): TurnStatus.CANCEL_REQUESTED,
    (TurnStatus.CANCEL_REQUESTED, TurnEvent.STOPPED): TurnStatus.CANCELLED,
    (TurnStatus.RUNNING, TurnEvent.ANSWER_VALIDATED): TurnStatus.COMPLETED,
    (TurnStatus.RUNNING, TurnEvent.UNRECOVERABLE_ERROR): TurnStatus.FAILED,
    (TurnStatus.RUNNING, TurnEvent.DEADLINE_HIT): TurnStatus.EXPIRED,
}


@dataclass(frozen=True, slots=True)
class Conversation:
    conversation_id: str
    owner_id: str


@dataclass(frozen=True, slots=True)
class Message:
    message_id: str
    conversation_id: str
    turn_id: str
    role: str
    content: str


@dataclass(frozen=True, slots=True)
class TaskAttempt:
    task_id: str
    turn_id: str
    attempt: int
    owner_token: str


@dataclass(frozen=True, slots=True)
class TransitionRecord:
    event: TurnEvent
    previous: TurnStatus
    current: TurnStatus


@dataclass(slots=True)
class Turn:
    turn_id: str
    conversation_id: str
    release_id: str
    status: TurnStatus = TurnStatus.PENDING
    transitions: list[TransitionRecord] = field(default_factory=list)

    def transition(self, event: TurnEvent) -> TransitionRecord:
        previous = self.status
        next_status = TRANSITIONS.get((previous, event))
        if next_status is None:
            raise ValueError(f"invalid transition: {previous} + {event}")
        self.status = next_status
        record = TransitionRecord(event, previous, next_status)
        self.transitions.append(record)
        return record


@dataclass(frozen=True, slots=True)
class RuntimeEvent:
    turn_id: str
    sequence: int
    event_type: str
    payload: dict[str, object]


@dataclass
class EventStream:
    turn_id: str
    next_sequence: int = 1
    events: list[RuntimeEvent] = field(default_factory=list)
    _lock: Lock = field(default_factory=Lock, repr=False)

    def append(self, event_type: str, payload: dict[str, object]) -> RuntimeEvent:
        with self._lock:
            if event_type.startswith("turn.") and event_type.removeprefix("turn.") in {
                status.value for status in TERMINAL_STATUSES
            }:
                if any(
                    event.event_type.startswith("turn.")
                    and event.event_type.removeprefix("turn.")
                    in {status.value for status in TERMINAL_STATUSES}
                    for event in self.events
                ):
                    raise ValueError("a terminal event already exists")
            event = RuntimeEvent(
                self.turn_id,
                self.next_sequence,
                event_type,
                dict(payload),
            )
            self.next_sequence += 1
            self.events.append(event)
            return event

    def replay_after(self, sequence: int) -> list[RuntimeEvent]:
        return [event for event in self.events if event.sequence > sequence]


def main() -> None:
    turn = Turn("turn-demo", "conversation-demo", "release-v1")
    stream = EventStream(turn.turn_id)
    for event, event_type in [
        (TurnEvent.WORKER_CLAIMED, "turn.started"),
        (TurnEvent.ANSWER_VALIDATED, "turn.completed"),
    ]:
        record = turn.transition(event)
        stream.append(event_type, {"status": record.current.value})
    print(turn.status, [(event.sequence, event.event_type) for event in stream.events])


if __name__ == "__main__":
    main()
