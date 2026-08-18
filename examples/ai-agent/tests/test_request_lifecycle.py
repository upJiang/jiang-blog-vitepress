from __future__ import annotations

import unittest

from request_lifecycle import (
    CreateRequest,
    InMemoryLifecycleStore,
    ScriptedDispatcher,
    create_turn,
)


class RequestLifecycleTests(unittest.TestCase):
    def request(self) -> CreateRequest:
        return CreateRequest("user-1", "kb-1", "远程访问多久生效？", "request-123")

    def test_first_request_persists_then_dispatches(self) -> None:
        store = InMemoryLifecycleStore()
        dispatcher = ScriptedDispatcher()
        result = create_turn(self.request(), store, dispatcher)
        self.assertTrue(result.created)
        self.assertEqual(result.turn.events, ["turn.created"])
        self.assertEqual(dispatcher.sent, [result.turn.turn_id])

    def test_duplicate_request_returns_existing_turn_without_dispatch(self) -> None:
        store = InMemoryLifecycleStore()
        dispatcher = ScriptedDispatcher()
        first = create_turn(self.request(), store, dispatcher)
        second = create_turn(self.request(), store, dispatcher)
        self.assertFalse(second.created)
        self.assertIs(first.turn, second.turn)
        self.assertEqual(dispatcher.sent, [first.turn.turn_id])

    def test_admission_rejection_does_not_create_a_turn(self) -> None:
        store = InMemoryLifecycleStore()
        with self.assertRaisesRegex(RuntimeError, "admission_rejected"):
            create_turn(self.request(), store, ScriptedDispatcher(), admitted=False)
        self.assertEqual(store.by_key, {})

    def test_dispatch_failure_leaves_a_durable_failed_turn(self) -> None:
        store = InMemoryLifecycleStore()
        with self.assertRaisesRegex(ConnectionError, "queue_unavailable"):
            create_turn(self.request(), store, ScriptedDispatcher(fail=True))
        turn = store.find(self.request())
        self.assertIsNotNone(turn)
        assert turn is not None
        self.assertEqual(turn.status, "failed")
        self.assertIn("turn.failed:dispatch_failed", turn.events)


if __name__ == "__main__":
    unittest.main()
