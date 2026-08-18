from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Literal


MessageStatus = Literal["accepted", "committed", "completed", "withdrawn"]
RouteResult = Literal["accepted", "start_new_run"]
DrainResult = Literal["continue", "completed"]


@dataclass
class InboundMessage:
    message_id: str
    text: str
    status: MessageStatus = "accepted"
    reply: str = ""
    acknowledged: bool = False


@dataclass
class RunState:
    run_id: str
    primary_message_id: str
    active: bool = True
    injection_open: bool = True
    cancel_requested: bool = False
    latest_user_text: str = ""
    current_reply_to: str = ""
    transcript: list[str] = field(default_factory=list)


class ScriptedDelivery:
    def __init__(self, failures: int = 0) -> None:
        self.failures = failures
        self.sent: list[tuple[str, str]] = []

    def send(self, message_id: str, reply: str) -> bool:
        if self.failures > 0:
            self.failures -= 1
            return False
        self.sent.append((message_id, reply))
        return True


class RuntimeController:
    def __init__(self, run_id: str, primary_message_id: str) -> None:
        self.state = RunState(
            run_id=run_id,
            primary_message_id=primary_message_id,
            current_reply_to=primary_message_id,
        )
        self.messages: dict[str, InboundMessage] = {
            primary_message_id: InboundMessage(
                primary_message_id,
                "",
                status="committed",
            )
        }
        self._route_lock = Lock()

    def accept(self, message_id: str, text: str) -> RouteResult:
        with self._route_lock:
            if not self.state.active or not self.state.injection_open:
                return "start_new_run"
            existing = self.messages.get(message_id)
            if existing is not None:
                return "accepted"
            self.messages[message_id] = InboundMessage(message_id, text)
            return "accepted"

    def withdraw(self, message_id: str) -> bool:
        with self._route_lock:
            message = self.messages.get(message_id)
            if message is None or message.status != "accepted":
                return False
            message.status = "withdrawn"
            return True

    def commit_at_decision_boundary(self) -> list[str]:
        with self._route_lock:
            return self._commit_pending_locked()

    def final_drain(self) -> DrainResult:
        with self._route_lock:
            committed = self._commit_pending_locked()
            if committed:
                return "continue"
            self.state.injection_open = False
            self.state.active = False
            return "completed"

    def request_cancel(self) -> None:
        self.state.cancel_requested = True

    def ensure_running(self) -> None:
        if self.state.cancel_requested:
            raise RuntimeError("run_cancelled")

    def deliver_reply(
        self,
        message_id: str,
        reply: str,
        delivery: ScriptedDelivery,
    ) -> bool:
        message = self.messages[message_id]
        if message.status != "committed":
            raise RuntimeError("message_not_committed")
        message.reply = reply
        if not delivery.send(message_id, reply):
            return False
        message.status = "completed"
        message.acknowledged = True
        return True

    def _commit_pending_locked(self) -> list[str]:
        pending = [
            message
            for message in self.messages.values()
            if message.status == "accepted"
        ]
        if not pending:
            return []
        for message in pending:
            message.status = "committed"
        combined = "\n".join(message.text for message in pending if message.text.strip())
        if combined:
            self.state.transcript.append(combined)
            self.state.latest_user_text = combined
        self.state.current_reply_to = pending[-1].message_id
        return [message.message_id for message in pending]


if __name__ == "__main__":
    controller = RuntimeController("run:1", "message:1")
    controller.accept("message:2", "还要检查权限边界")
    controller.commit_at_decision_boundary()
    delivery = ScriptedDelivery()
    controller.deliver_reply("message:2", "已检查权限边界。", delivery)
    print(controller.state)
    print(delivery.sent)
