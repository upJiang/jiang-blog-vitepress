from __future__ import annotations

from dataclasses import dataclass


class ResourceNotFound(LookupError):
    pass


@dataclass(frozen=True)
class TenantContext:
    tenant_id: str
    user_id: str
    subject_ids: tuple[str, ...]
    permission_revision: str


@dataclass(frozen=True)
class Turn:
    turn_id: str
    tenant_id: str
    user_id: str
    release_id: str
    policy_id: str


@dataclass(frozen=True)
class TaskEnvelope:
    task_id: str
    turn_id: str
    tenant_id: str
    user_id: str
    permission_revision: str


@dataclass(frozen=True)
class Event:
    sequence: int
    tenant_id: str
    turn_id: str
    kind: str


class TenantStore:
    def __init__(self) -> None:
        self.turns: dict[str, Turn] = {}

    def create_turn(
        self,
        context: TenantContext,
        *,
        turn_id: str,
        release_id: str,
        policy_id: str,
    ) -> Turn:
        turn = Turn(turn_id, context.tenant_id, context.user_id, release_id, policy_id)
        self.turns[turn_id] = turn
        return turn

    def load_turn(self, context: TenantContext, turn_id: str) -> Turn:
        turn = self.turns.get(turn_id)
        if turn is None or turn.tenant_id != context.tenant_id:
            raise ResourceNotFound("turn_not_found")
        return turn


def cache_key(
    context: TenantContext,
    *,
    release_id: str,
    query_digest: str,
) -> tuple[str, str, str, str]:
    return (
        context.tenant_id,
        context.permission_revision,
        release_id,
        query_digest,
    )


def build_task(context: TenantContext, turn: Turn, task_id: str) -> TaskEnvelope:
    if turn.tenant_id != context.tenant_id or turn.user_id != context.user_id:
        raise PermissionError("task_scope_mismatch")
    return TaskEnvelope(
        task_id,
        turn.turn_id,
        context.tenant_id,
        context.user_id,
        context.permission_revision,
    )


def authorize_worker_task(context: TenantContext, task: TaskEnvelope) -> None:
    if not task.tenant_id or not task.user_id:
        raise PermissionError("task_scope_missing")
    if (
        task.tenant_id != context.tenant_id
        or task.user_id != context.user_id
        or task.permission_revision != context.permission_revision
    ):
        raise PermissionError("task_scope_stale")


class EventStore:
    def __init__(self) -> None:
        self.events: list[Event] = []

    def append(self, tenant_id: str, turn_id: str, kind: str) -> Event:
        event = Event(len(self.events) + 1, tenant_id, turn_id, kind)
        self.events.append(event)
        return event

    def list_for_turn(self, context: TenantContext, turn_id: str) -> list[Event]:
        return [
            event
            for event in self.events
            if event.tenant_id == context.tenant_id and event.turn_id == turn_id
        ]


class QuotaLedger:
    def __init__(self, limits: dict[str, int]) -> None:
        self.remaining = dict(limits)
        self.reservations: set[tuple[str, str]] = set()

    def reserve(self, tenant_id: str, request_id: str, amount: int) -> None:
        identity = (tenant_id, request_id)
        if identity in self.reservations:
            return
        if amount < 0 or self.remaining.get(tenant_id, 0) < amount:
            raise RuntimeError("tenant_quota_exceeded")
        self.remaining[tenant_id] -= amount
        self.reservations.add(identity)


if __name__ == "__main__":
    context = TenantContext("tenant-a", "user-7", ("team-editor",), "acl-r4")
    store = TenantStore()
    turn = store.create_turn(
        context,
        turn_id="turn-1",
        release_id="release-9",
        policy_id="policy-3",
    )
    print(turn)
    print(cache_key(context, release_id=turn.release_id, query_digest="query-42"))
