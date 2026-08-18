from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass


@dataclass(frozen=True)
class TurnInput:
    knowledge_base_id: str
    user_id: str
    idempotency_key: str
    question: str
    requested_mode: str
    scope_ids: tuple[str, ...]

    def fingerprint(self) -> str:
        payload = {
            "question": self.question,
            "requested_mode": self.requested_mode,
            "scope_ids": sorted(set(self.scope_ids)),
        }
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True)
class VersionSnapshot:
    release_id: str
    policy_id: str
    model_id: str
    acl_revision: str
    deadline_at: int


@dataclass(frozen=True)
class SnapshotTurn:
    turn_id: str
    scope_key: tuple[str, str, str]
    request_fingerprint: str
    snapshot: VersionSnapshot


class SnapshotStore:
    def __init__(self) -> None:
        self._turns: dict[tuple[str, str, str], SnapshotTurn] = {}

    def create_or_get(self, request: TurnInput, snapshot: VersionSnapshot) -> SnapshotTurn:
        key = (
            request.knowledge_base_id,
            request.user_id,
            request.idempotency_key,
        )
        fingerprint = request.fingerprint()
        existing = self._turns.get(key)
        if existing is not None:
            if existing.request_fingerprint != fingerprint:
                raise ValueError("idempotency_conflict")
            return existing
        turn = SnapshotTurn(
            turn_id=f"turn-{len(self._turns) + 1}",
            scope_key=key,
            request_fingerprint=fingerprint,
            snapshot=snapshot,
        )
        self._turns[key] = turn
        return turn

    def resume(self, request: TurnInput) -> VersionSnapshot:
        key = (
            request.knowledge_base_id,
            request.user_id,
            request.idempotency_key,
        )
        turn = self._turns[key]
        if turn.request_fingerprint != request.fingerprint():
            raise ValueError("idempotency_conflict")
        return turn.snapshot


if __name__ == "__main__":
    request = TurnInput("kb-1", "user-1", "request-123", "访问多久生效？", "auto", ())
    snapshot = VersionSnapshot("release-7", "policy-3", "model-2", "acl-9", 1_800)
    store = SnapshotStore()
    print(store.create_or_get(request, snapshot))
