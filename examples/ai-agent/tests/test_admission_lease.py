from __future__ import annotations

import unittest

from admission_lease import InMemoryAdmission


class AdmissionLeaseTests(unittest.TestCase):
    def test_user_and_global_limits_return_different_reasons(self) -> None:
        admission = InMemoryAdmission(global_limit=2, user_limit=1)
        self.assertTrue(
            admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100).allowed
        )
        self.assertEqual(
            admission.acquire_capacity("turn:2", "user:1", now=0, deadline_at=100).reason,
            "user_limit",
        )
        admission.acquire_capacity("turn:3", "user:2", now=0, deadline_at=100)
        self.assertEqual(
            admission.acquire_capacity("turn:4", "user:3", now=0, deadline_at=100).reason,
            "global_limit",
        )

    def test_same_turn_reacquire_renews_without_double_counting(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1, lease_seconds=10)
        admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100)
        decision = admission.acquire_capacity("turn:1", "user:1", now=5, deadline_at=100)
        self.assertTrue(decision.allowed)
        self.assertEqual(len(admission.capacity), 1)
        self.assertEqual(admission.capacity["turn:1"].expires_at, 15)

    def test_expired_capacity_is_reclaimed_before_counting(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1, lease_seconds=10)
        admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100)
        decision = admission.acquire_capacity("turn:2", "user:2", now=11, deadline_at=100)
        self.assertTrue(decision.allowed)
        self.assertNotIn("turn:1", admission.capacity)

    def test_only_owner_can_renew_and_release_execution_lease(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1)
        admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100)
        admission.acquire_execution("turn:1", "worker:a", now=0)
        self.assertFalse(admission.renew_execution("turn:1", "worker:b", now=1))
        admission.release_execution("turn:1", "worker:b")
        self.assertIn("turn:1", admission.execution)
        self.assertIn("turn:1", admission.capacity)
        self.assertTrue(admission.renew_execution("turn:1", "worker:a", now=1))
        self.assertTrue(admission.renew_capacity("turn:1", "user:1", now=1))

    def test_capacity_and_execution_are_released_by_separate_owners(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1)
        admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100)
        admission.acquire_execution("turn:1", "worker:a", now=0)

        admission.release_execution("turn:1", "worker:a")
        self.assertNotIn("turn:1", admission.execution)
        self.assertIn("turn:1", admission.capacity)

        admission.release_capacity("turn:1", "user:1")
        self.assertNotIn("turn:1", admission.capacity)

    def test_fencing_rejects_old_worker_after_lease_takeover(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1, lease_seconds=10)
        admission.acquire_capacity("turn:1", "user:1", now=0, deadline_at=100)
        first = admission.acquire_execution("turn:1", "worker:a", now=0)
        second = admission.acquire_execution("turn:1", "worker:b", now=11)
        self.assertIsNotNone(first)
        self.assertIsNotNone(second)
        self.assertFalse(
            admission.can_commit("turn:1", "worker:a", first.generation, now=11)  # type: ignore[union-attr]
        )
        self.assertTrue(
            admission.can_commit("turn:1", "worker:b", second.generation, now=11)  # type: ignore[union-attr]
        )

    def test_expired_turn_is_rejected_before_capacity_allocation(self) -> None:
        admission = InMemoryAdmission(global_limit=1, user_limit=1)
        decision = admission.acquire_capacity("turn:1", "user:1", now=10, deadline_at=10)
        self.assertEqual(decision.reason, "deadline_expired")
        self.assertEqual(admission.capacity, {})


if __name__ == "__main__":
    unittest.main()
