from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CreateRequest:
    user_id: str
    knowledge_base_id: str
    question: str
    idempotency_key: str


@dataclass
class LifecycleTurn:
    turn_id: str
    request: CreateRequest
    release_id: str
    policy_id: str
    status: str = "pending"
    events: list[str] = field(default_factory=lambda: ["turn.created"])


class InMemoryLifecycleStore:
    def __init__(self) -> None:
        self.by_key: dict[tuple[str, str, str], LifecycleTurn] = {}

    def find(self, request: CreateRequest) -> LifecycleTurn | None:
        return self.by_key.get(
            (request.knowledge_base_id, request.user_id, request.idempotency_key)
        )

    def create(self, request: CreateRequest, turn_id: str) -> LifecycleTurn:
        key = (request.knowledge_base_id, request.user_id, request.idempotency_key)
        existing = self.by_key.get(key)
        if existing is not None:
            return existing
        turn = LifecycleTurn(turn_id, request, "release-7", "policy-3")
        self.by_key[key] = turn
        return turn


class ScriptedDispatcher:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.sent: list[str] = []

    def send(self, turn_id: str) -> None:
        if self.fail:
            raise ConnectionError("queue_unavailable")
        self.sent.append(turn_id)


@dataclass(frozen=True)
class CreateResult:
    turn: LifecycleTurn
    created: bool


def create_turn(
    request: CreateRequest,
    store: InMemoryLifecycleStore,
    dispatcher: ScriptedDispatcher,
    *,
    admitted: bool = True,
) -> CreateResult:
    existing = store.find(request)
    if existing is not None:
        return CreateResult(existing, False)
    if not admitted:
        raise RuntimeError("admission_rejected")

    turn = store.create(request, f"turn-{len(store.by_key) + 1}")
    try:
        dispatcher.send(turn.turn_id)
    except ConnectionError:
        turn.status = "failed"
        turn.events.append("turn.failed:dispatch_failed")
        raise
    return CreateResult(turn, True)


if __name__ == "__main__":
    store = InMemoryLifecycleStore()
    dispatcher = ScriptedDispatcher()
    request = CreateRequest("user-1", "kb-1", "远程访问多久生效？", "request-123")
    print(create_turn(request, store, dispatcher))
