from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


AdmissionReason = Literal["allowed", "global_limit", "user_limit", "deadline_expired"]


@dataclass(frozen=True)
class AdmissionDecision:
    allowed: bool
    reason: AdmissionReason


@dataclass
class CapacityLease:
    turn_id: str
    user_id: str
    expires_at: float


@dataclass
class ExecutionLease:
    turn_id: str
    owner_token: str
    generation: int
    expires_at: float


class InMemoryAdmission:
    def __init__(self, *, global_limit: int, user_limit: int, lease_seconds: float = 10) -> None:
        self.global_limit = global_limit
        self.user_limit = user_limit
        self.lease_seconds = lease_seconds
        self.capacity: dict[str, CapacityLease] = {}
        self.execution: dict[str, ExecutionLease] = {}
        self.generations: dict[str, int] = {}

    def acquire_capacity(
        self,
        turn_id: str,
        user_id: str,
        *,
        now: float,
        deadline_at: float,
    ) -> AdmissionDecision:
        self._reap(now)
        if now >= deadline_at:
            return AdmissionDecision(False, "deadline_expired")
        existing = self.capacity.get(turn_id)
        if existing is not None and existing.user_id == user_id:
            existing.expires_at = now + self.lease_seconds
            return AdmissionDecision(True, "allowed")
        if len(self.capacity) >= self.global_limit:
            return AdmissionDecision(False, "global_limit")
        user_count = sum(lease.user_id == user_id for lease in self.capacity.values())
        if user_count >= self.user_limit:
            return AdmissionDecision(False, "user_limit")
        self.capacity[turn_id] = CapacityLease(turn_id, user_id, now + self.lease_seconds)
        return AdmissionDecision(True, "allowed")

    def acquire_execution(
        self,
        turn_id: str,
        owner_token: str,
        *,
        now: float,
    ) -> ExecutionLease | None:
        self._reap(now)
        if turn_id in self.execution:
            return None
        generation = self.generations.get(turn_id, 0) + 1
        self.generations[turn_id] = generation
        lease = ExecutionLease(
            turn_id,
            owner_token,
            generation,
            now + self.lease_seconds,
        )
        self.execution[turn_id] = lease
        return lease

    def renew_capacity(
        self,
        turn_id: str,
        user_id: str,
        *,
        now: float,
    ) -> bool:
        self._reap(now)
        capacity = self.capacity.get(turn_id)
        if capacity is None or capacity.user_id != user_id:
            return False
        capacity.expires_at = now + self.lease_seconds
        return True

    def renew_execution(
        self,
        turn_id: str,
        owner_token: str,
        *,
        now: float,
    ) -> bool:
        self._reap(now)
        execution = self.execution.get(turn_id)
        if execution is None or execution.owner_token != owner_token:
            return False
        execution.expires_at = now + self.lease_seconds
        return True

    def can_commit(self, turn_id: str, owner_token: str, generation: int, *, now: float) -> bool:
        self._reap(now)
        execution = self.execution.get(turn_id)
        return bool(
            execution
            and execution.owner_token == owner_token
            and execution.generation == generation
        )

    def release_capacity(self, turn_id: str, user_id: str) -> None:
        capacity = self.capacity.get(turn_id)
        if capacity is not None and capacity.user_id == user_id:
            self.capacity.pop(turn_id, None)

    def release_execution(self, turn_id: str, owner_token: str) -> None:
        execution = self.execution.get(turn_id)
        if execution is not None and execution.owner_token == owner_token:
            self.execution.pop(turn_id, None)

    def _reap(self, now: float) -> None:
        self.capacity = {
            turn_id: lease
            for turn_id, lease in self.capacity.items()
            if lease.expires_at > now
        }
        self.execution = {
            turn_id: lease
            for turn_id, lease in self.execution.items()
            if lease.expires_at > now
        }


if __name__ == "__main__":
    admission = InMemoryAdmission(global_limit=2, user_limit=1)
    print(admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100))
    print(admission.acquire_execution("turn:1", "worker:a", now=0))
