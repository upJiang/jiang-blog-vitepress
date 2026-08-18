from __future__ import annotations

import unittest

from idempotency_snapshot import SnapshotStore, TurnInput, VersionSnapshot


class IdempotencySnapshotTests(unittest.TestCase):
    def request(self, **changes: object) -> TurnInput:
        values: dict[str, object] = {
            "knowledge_base_id": "kb-1",
            "user_id": "user-1",
            "idempotency_key": "request-123",
            "question": "访问多久生效？",
            "requested_mode": "auto",
            "scope_ids": ("doc-2", "doc-1"),
        }
        values.update(changes)
        return TurnInput(**values)  # type: ignore[arg-type]

    def snapshot(self, release: str = "release-7") -> VersionSnapshot:
        return VersionSnapshot(release, "policy-3", "model-2", "acl-9", 1_800)

    def test_same_scope_key_and_payload_return_the_same_turn(self) -> None:
        store = SnapshotStore()
        first = store.create_or_get(self.request(), self.snapshot())
        second = store.create_or_get(self.request(scope_ids=("doc-1", "doc-2")), self.snapshot())
        self.assertIs(first, second)

    def test_same_key_with_a_different_question_is_a_conflict(self) -> None:
        store = SnapshotStore()
        store.create_or_get(self.request(), self.snapshot())
        with self.assertRaisesRegex(ValueError, "idempotency_conflict"):
            store.create_or_get(self.request(question="改成另一个问题"), self.snapshot())

    def test_same_key_in_a_different_user_scope_is_independent(self) -> None:
        store = SnapshotStore()
        first = store.create_or_get(self.request(), self.snapshot())
        second = store.create_or_get(self.request(user_id="user-2"), self.snapshot())
        self.assertNotEqual(first.turn_id, second.turn_id)

    def test_resume_keeps_the_original_snapshot_after_active_release_changes(self) -> None:
        store = SnapshotStore()
        store.create_or_get(self.request(), self.snapshot("release-7"))
        active_now = self.snapshot("release-8")
        self.assertNotEqual(store.resume(self.request()), active_now)
        self.assertEqual(store.resume(self.request()).release_id, "release-7")


if __name__ == "__main__":
    unittest.main()
