from __future__ import annotations

import unittest

from persistent_loop import (
    IdempotentDelivery,
    InMemoryCheckpointStore,
    PersistentAgentLoop,
    SimulatedCrash,
)


class PersistentAgentLoopTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = InMemoryCheckpointStore()
        self.delivery = IdempotentDelivery()
        self.loop = PersistentAgentLoop(self.store, self.delivery)

    def test_resume_continues_after_the_last_completed_phase(self) -> None:
        with self.assertRaisesRegex(SimulatedCrash, "evidence_ready"):
            self.loop.start("turn:1", "问题", now=100, crash_after="evidence_ready")
        result = self.loop.resume("turn:1", now=120)
        checkpoint = self.store.load("turn:1")
        self.assertEqual(result.status, "completed")
        self.assertEqual(checkpoint.resume_attempts, 1)  # type: ignore[union-attr]
        self.assertEqual(len(self.delivery.deliveries), 1)

    def test_expired_checkpoint_is_abandoned_without_delivery(self) -> None:
        with self.assertRaises(SimulatedCrash):
            self.loop.start("turn:2", "问题", now=100, ttl=10, crash_after="planned")
        result = self.loop.resume("turn:2", now=111)
        self.assertEqual(result.reason, "resume_window_expired")
        self.assertEqual(self.delivery.deliveries, [])

    def test_disabled_resume_keeps_the_checkpoint_discoverable(self) -> None:
        with self.assertRaises(SimulatedCrash):
            self.loop.start("turn:3", "问题", now=100, crash_after="planned")
        before = self.store.load("turn:3")
        result = self.loop.resume("turn:3", now=110, enabled=False)
        after = self.store.load("turn:3")
        self.assertEqual(result.reason, "resume_disabled")
        self.assertEqual(before, after)

    def test_resume_attempt_is_saved_before_the_next_failing_step(self) -> None:
        with self.assertRaises(SimulatedCrash):
            self.loop.start("turn:4", "问题", now=100, crash_after="planned")
        with self.assertRaises(SimulatedCrash):
            self.loop.resume("turn:4", now=110, crash_after="evidence_ready")
        with self.assertRaises(SimulatedCrash):
            self.loop.resume("turn:4", now=120, crash_after="action_prepared")
        result = self.loop.resume("turn:4", now=130)
        self.assertEqual(result.reason, "resume_attempt_limit")
        self.assertEqual(self.delivery.deliveries, [])

    def test_tool_idempotency_handles_crash_after_external_effect(self) -> None:
        with self.assertRaisesRegex(SimulatedCrash, "after_delivery"):
            self.loop.start("turn:5", "问题", now=100, crash_after="after_delivery")
        result = self.loop.resume("turn:5", now=110)
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(self.delivery.deliveries), 1)
        self.assertEqual(len(self.delivery.receipts), 1)

    def test_cancelled_turn_is_not_revived(self) -> None:
        with self.assertRaises(SimulatedCrash):
            self.loop.start("turn:6", "问题", now=100, crash_after="planned")
        self.loop.cancel("turn:6")
        result = self.loop.resume("turn:6", now=110)
        self.assertEqual(result.status, "cancelled")
        self.assertEqual(self.delivery.deliveries, [])

    def test_recovered_approval_action_requires_a_human_again(self) -> None:
        with self.assertRaises(SimulatedCrash):
            self.loop.start(
                "turn:7",
                "问题",
                now=100,
                requires_approval=True,
                crash_after="planned",
            )
        result = self.loop.resume("turn:7", now=110)
        self.assertEqual(result.reason, "approval_required_for_unattended_resume")
        self.assertEqual(self.delivery.deliveries, [])


if __name__ == "__main__":
    unittest.main()
