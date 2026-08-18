from __future__ import annotations

import unittest

from runtime import Turn, TurnStore


class RuntimeDomainTests(unittest.TestCase):
    def new_turn(self, key: str = "request-123") -> Turn:
        return Turn("turn-1", key, "release-7", "policy-3")

    def test_duplicate_create_returns_the_same_logical_turn(self) -> None:
        store = TurnStore()
        first = store.create(self.new_turn())
        second = store.create(Turn("turn-2", "request-123", "release-8", "policy-4"))
        self.assertIs(first, second)
        self.assertEqual(second.id, "turn-1")

    def test_running_turn_accepts_cancel_then_worker_acknowledges_it(self) -> None:
        turn = self.new_turn()
        self.assertTrue(turn.start())
        self.assertTrue(turn.request_cancel())
        self.assertEqual(turn.status, "cancel_requested")
        self.assertTrue(turn.acknowledge_cancel())
        self.assertEqual(turn.status, "cancelled")

    def test_late_completion_cannot_overwrite_cancelled_terminal_state(self) -> None:
        turn = self.new_turn()
        turn.start()
        turn.request_cancel()
        turn.acknowledge_cancel()
        self.assertFalse(turn.complete("late answer"))
        self.assertEqual(turn.answer, "")
        self.assertEqual(turn.status, "cancelled")

    def test_deadline_creates_one_terminal_event(self) -> None:
        turn = self.new_turn()
        turn.start()
        self.assertTrue(turn.expire())
        self.assertFalse(turn.expire())
        terminal = [event for event in turn.events if event.event_type == "turn.expired"]
        self.assertEqual(len(terminal), 1)

    def test_replay_returns_only_events_after_cursor(self) -> None:
        turn = self.new_turn()
        turn.start()
        turn.append("answer.delta", {"text": "审批"})
        turn.complete("审批通过后生效")
        self.assertEqual(
            [event.sequence for event in turn.replay_after(1)],
            [2, 3],
        )


if __name__ == "__main__":
    unittest.main()
