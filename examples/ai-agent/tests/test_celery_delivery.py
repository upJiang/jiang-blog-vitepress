from __future__ import annotations

import unittest

from celery_delivery import (
    ActionLedger,
    AtLeastOnceWorker,
    Delivery,
    ExecutionLeases,
    SimulatedCrash,
    Turn,
)


class CeleryDeliveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.turns = {"turn:1": Turn("turn:1", deadline_at=60)}
        self.actions = ActionLedger()
        self.leases = ExecutionLeases()
        self.worker = AtLeastOnceWorker(self.turns, self.actions, self.leases)

    def test_success_commits_terminal_state_before_ack(self) -> None:
        delivery = Delivery("delivery:1", "turn:1")
        result = self.worker.process(delivery, owner_token="worker:a", now=0)

        self.assertEqual(result, "completed")
        self.assertEqual(self.turns["turn:1"].status, "completed")
        self.assertTrue(delivery.acknowledged)
        self.assertEqual(self.actions.effect_count, 1)

    def test_redelivery_reuses_action_after_crash_before_terminal_commit(self) -> None:
        first = Delivery("delivery:1", "turn:1")
        with self.assertRaises(SimulatedCrash):
            self.worker.process(
                first,
                owner_token="worker:a",
                now=0,
                crash_after_action=True,
            )
        self.assertFalse(first.acknowledged)
        self.assertEqual(self.actions.effect_count, 1)

        second = Delivery("delivery:2", "turn:1")
        result = self.worker.process(second, owner_token="worker:b", now=1)
        self.assertEqual(result, "completed")
        self.assertTrue(second.acknowledged)
        self.assertEqual(self.actions.effect_count, 1)

    def test_redelivery_after_terminal_commit_only_acknowledges(self) -> None:
        first = Delivery("delivery:1", "turn:1")
        with self.assertRaises(SimulatedCrash):
            self.worker.process(
                first,
                owner_token="worker:a",
                now=0,
                crash_after_terminal=True,
            )
        self.assertEqual(self.turns["turn:1"].status, "completed")
        self.assertFalse(first.acknowledged)

        second = Delivery("delivery:2", "turn:1")
        self.assertEqual(
            self.worker.process(second, owner_token="worker:b", now=1),
            "completed",
        )
        self.assertTrue(second.acknowledged)
        self.assertEqual(self.actions.effect_count, 1)

    def test_deterministic_error_is_terminal_and_acknowledged(self) -> None:
        delivery = Delivery("delivery:1", "turn:1")
        result = self.worker.process(
            delivery,
            owner_token="worker:a",
            now=0,
            deterministic_error="permission_denied",
        )
        self.assertEqual(result, "failed")
        self.assertTrue(delivery.acknowledged)
        self.assertEqual(self.actions.effect_count, 0)

    def test_busy_execution_lease_does_not_touch_domain_state(self) -> None:
        self.leases.acquire("turn:1", "worker:a")
        delivery = Delivery("delivery:2", "turn:1")
        result = self.worker.process(delivery, owner_token="worker:b", now=0)
        self.assertEqual(result, "lease_busy")
        self.assertEqual(self.turns["turn:1"].status, "pending")
        self.assertFalse(delivery.acknowledged)
        self.assertEqual(self.actions.effect_count, 0)

    def test_expired_turn_is_terminal_without_running_action(self) -> None:
        delivery = Delivery("delivery:1", "turn:1")
        result = self.worker.process(delivery, owner_token="worker:a", now=60)
        self.assertEqual(result, "expired")
        self.assertTrue(delivery.acknowledged)
        self.assertEqual(self.actions.effect_count, 0)


if __name__ == "__main__":
    unittest.main()
