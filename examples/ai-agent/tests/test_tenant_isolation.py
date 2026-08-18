from __future__ import annotations

import unittest

from tenant_isolation import (
    EventStore,
    QuotaLedger,
    ResourceNotFound,
    TaskEnvelope,
    TenantContext,
    TenantStore,
    authorize_worker_task,
    build_task,
    cache_key,
)


class TenantIsolationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tenant_a = TenantContext("tenant-a", "user-7", ("team-a",), "acl-r4")
        self.tenant_b = TenantContext("tenant-b", "user-8", ("team-b",), "acl-r2")

    def test_cross_tenant_turn_is_hidden_as_not_found(self) -> None:
        store = TenantStore()
        store.create_turn(
            self.tenant_a,
            turn_id="turn-1",
            release_id="release-9",
            policy_id="policy-3",
        )
        with self.assertRaisesRegex(ResourceNotFound, "turn_not_found"):
            store.load_turn(self.tenant_b, "turn-1")

    def test_cache_key_contains_tenant_acl_revision_and_release(self) -> None:
        first = cache_key(self.tenant_a, release_id="release-9", query_digest="q1")
        other_tenant = cache_key(self.tenant_b, release_id="release-9", query_digest="q1")
        new_acl = cache_key(
            TenantContext("tenant-a", "user-7", ("team-a",), "acl-r5"),
            release_id="release-9",
            query_digest="q1",
        )
        self.assertNotEqual(first, other_tenant)
        self.assertNotEqual(first, new_acl)

    def test_worker_rechecks_task_scope(self) -> None:
        store = TenantStore()
        turn = store.create_turn(
            self.tenant_a,
            turn_id="turn-1",
            release_id="release-9",
            policy_id="policy-3",
        )
        task = build_task(self.tenant_a, turn, "task-1")
        authorize_worker_task(self.tenant_a, task)
        with self.assertRaisesRegex(PermissionError, "task_scope_stale"):
            authorize_worker_task(self.tenant_b, task)
        with self.assertRaisesRegex(PermissionError, "task_scope_missing"):
            authorize_worker_task(
                self.tenant_a,
                TaskEnvelope("task-2", "turn-1", "", "", "acl-r4"),
            )

    def test_event_subscription_filters_tenant_and_turn(self) -> None:
        events = EventStore()
        events.append("tenant-a", "turn-1", "answer.delta")
        events.append("tenant-b", "turn-1", "answer.delta")
        events.append("tenant-a", "turn-2", "answer.completed")
        visible = events.list_for_turn(self.tenant_a, "turn-1")
        self.assertEqual([(item.tenant_id, item.turn_id) for item in visible], [("tenant-a", "turn-1")])

    def test_quota_is_isolated_and_reservation_is_idempotent(self) -> None:
        quota = QuotaLedger({"tenant-a": 10, "tenant-b": 3})
        quota.reserve("tenant-a", "request-1", 4)
        quota.reserve("tenant-a", "request-1", 4)
        self.assertEqual(quota.remaining, {"tenant-a": 6, "tenant-b": 3})
        with self.assertRaisesRegex(RuntimeError, "tenant_quota_exceeded"):
            quota.reserve("tenant-b", "request-2", 4)


if __name__ == "__main__":
    unittest.main()
