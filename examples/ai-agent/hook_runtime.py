from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Callable, Literal


EventType = Literal[
    "action.proposed",
    "approval.requested",
    "approval.granted",
    "approval.denied",
    "action.started",
    "action.completed",
    "action.failed",
]


@dataclass(frozen=True)
class Action:
    call_id: str
    name: str
    arguments: dict[str, object]
    risk: Literal["read", "write", "irreversible"]

    @property
    def fingerprint(self) -> str:
        body = json.dumps(
            {"name": self.name, "arguments": self.arguments},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(body.encode()).hexdigest()


@dataclass(frozen=True)
class Approval:
    action_fingerprint: str
    decision: Literal["granted", "denied"]
    actor_id: str


@dataclass(frozen=True)
class Event:
    sequence: int
    event_type: EventType
    call_id: str
    payload: dict[str, object]


@dataclass
class EventStore:
    events: list[Event] = field(default_factory=list)

    def append(
        self,
        event_type: EventType,
        action: Action,
        payload: dict[str, object] | None = None,
    ) -> Event:
        event = Event(len(self.events) + 1, event_type, action.call_id, payload or {})
        self.events.append(event)
        return event


Hook = Callable[[Event], None]
Executor = Callable[[dict[str, object]], str]


class ControlledRuntime:
    def __init__(self, store: EventStore, hooks: list[Hook] | None = None) -> None:
        self.store = store
        self.hooks = hooks or []
        self.receipts: dict[str, str] = {}

    def _emit(
        self,
        event_type: EventType,
        action: Action,
        payload: dict[str, object] | None = None,
    ) -> Event:
        event = self.store.append(event_type, action, payload)
        for hook in self.hooks:
            hook(event)
        return event

    def run(
        self,
        action: Action,
        executor: Executor,
        approval: Approval | None = None,
    ) -> str | None:
        if action.call_id in self.receipts:
            return self.receipts[action.call_id]

        self._emit("action.proposed", action, {"fingerprint": action.fingerprint})
        if action.risk != "read":
            if approval is None:
                self._emit(
                    "approval.requested",
                    action,
                    {"fingerprint": action.fingerprint},
                )
                return None
            if approval.action_fingerprint != action.fingerprint:
                raise ValueError("approval_action_mismatch")
            if approval.decision == "denied":
                self._emit("approval.denied", action, {"actor_id": approval.actor_id})
                return None
            self._emit("approval.granted", action, {"actor_id": approval.actor_id})

        self._emit("action.started", action)
        try:
            result = executor(action.arguments)
        except Exception as error:
            self._emit("action.failed", action, {"error_type": type(error).__name__})
            raise
        self.receipts[action.call_id] = result
        self._emit("action.completed", action, {"receipt": result})
        return result
