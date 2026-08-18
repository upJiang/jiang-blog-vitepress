from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


TurnStatus = Literal["pending", "running", "completed", "failed", "expired"]


@dataclass
class Delivery:
    delivery_id: str
    turn_id: str
    acknowledged: bool = False


@dataclass
class Turn:
    turn_id: str
    deadline_at: float
    status: TurnStatus = "pending"
    attempts: int = 0
    result: str | None = None
    error: str | None = None


@dataclass
class ActionLedger:
    receipts: dict[str, str] = field(default_factory=dict)
    effect_count: int = 0

    def run_once(self, action_id: str) -> str:
        if action_id in self.receipts:
            return self.receipts[action_id]
        self.effect_count += 1
        receipt = f"receipt:{self.effect_count}"
        self.receipts[action_id] = receipt
        return receipt


class ExecutionLeases:
    def __init__(self) -> None:
        self.owners: dict[str, str] = {}

    def acquire(self, turn_id: str, owner_token: str) -> bool:
        if turn_id in self.owners:
            return False
        self.owners[turn_id] = owner_token
        return True

    def release(self, turn_id: str, owner_token: str) -> None:
        if self.owners.get(turn_id) == owner_token:
            self.owners.pop(turn_id, None)


class SimulatedCrash(RuntimeError):
    pass


class AtLeastOnceWorker:
    def __init__(self, turns: dict[str, Turn], actions: ActionLedger, leases: ExecutionLeases) -> None:
        self.turns = turns
        self.actions = actions
        self.leases = leases

    def process(
        self,
        delivery: Delivery,
        *,
        owner_token: str,
        now: float,
        crash_after_action: bool = False,
        crash_after_terminal: bool = False,
        deterministic_error: str | None = None,
    ) -> str:
        turn = self.turns[delivery.turn_id]
        if turn.status in {"completed", "failed", "expired"}:
            delivery.acknowledged = True
            return turn.status
        if now >= turn.deadline_at:
            turn.status = "expired"
            delivery.acknowledged = True
            return "expired"
        if not self.leases.acquire(turn.turn_id, owner_token):
            return "lease_busy"

        try:
            turn.status = "running"
            turn.attempts += 1
            if deterministic_error is not None:
                turn.status = "failed"
                turn.error = deterministic_error
                delivery.acknowledged = True
                return "failed"

            action_id = f"{turn.turn_id}:create-ticket"
            receipt = self.actions.run_once(action_id)
            if crash_after_action:
                raise SimulatedCrash("worker exited after the external action")

            turn.result = receipt
            turn.status = "completed"
            if crash_after_terminal:
                raise SimulatedCrash("worker exited before ACK")

            delivery.acknowledged = True
            return "completed"
        finally:
            self.leases.release(turn.turn_id, owner_token)


if __name__ == "__main__":
    turns = {"turn:1": Turn("turn:1", deadline_at=60)}
    actions = ActionLedger()
    leases = ExecutionLeases()
    worker = AtLeastOnceWorker(turns, actions, leases)
    message = Delivery("delivery:1", "turn:1")
    print(worker.process(message, owner_token="worker:a", now=0))
    print(turns["turn:1"], message)
