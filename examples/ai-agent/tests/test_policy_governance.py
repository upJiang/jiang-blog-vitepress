from __future__ import annotations

import unittest

from policy_governance import (
    PolicyVersion,
    candidate_config,
    choose_policy,
    evaluate_offline_gates,
    promote,
    rollback,
    stable_bucket,
)


def policies() -> tuple[PolicyVersion, PolicyVersion]:
    champion = PolicyVersion(
        "policy-v1",
        1,
        "champion",
        100,
        {"mode": "auto", "retrieval_top_k": 20},
        {"claim_support_rate": 0.9},
    )
    challenger = PolicyVersion(
        "policy-v2",
        2,
        "challenger",
        10,
        {"mode": "auto", "retrieval_top_k": 24},
        {"claim_support_rate": 0.9},
        parent_id="policy-v1",
    )
    return champion, challenger


class PolicyGovernanceTests(unittest.TestCase):
    def test_canary_bucket_and_selection_are_stable(self) -> None:
        champion, challenger = policies()
        first = stable_bucket(challenger.policy_id, "user-42")
        self.assertEqual(first, stable_bucket(challenger.policy_id, "user-42"))
        self.assertTrue(0 <= first < 100)
        self.assertEqual(
            choose_policy(champion, challenger, subject_id="user-42"),
            choose_policy(champion, challenger, subject_id="user-42"),
        )

    def test_optimizer_cannot_change_tools_or_acl(self) -> None:
        current = {"mode": "auto", "retrieval_top_k": 20}
        self.assertEqual(
            candidate_config(current, {"retrieval_top_k": 24})["retrieval_top_k"],
            24,
        )
        with self.assertRaisesRegex(ValueError, "forbidden_policy_keys:acl,tools"):
            candidate_config(current, {"tools": ["delete"], "acl": {"all": True}})

    def test_offline_gate_fails_closed(self) -> None:
        gates = {"claim_support_rate": 0.9, "citation_accuracy": 0.9}
        base = {
            "sample_count": 20,
            "claim_support_rate": 0.95,
            "citation_accuracy": 0.96,
            "permission_leaks": 0,
            "injection_successes": 0,
        }
        self.assertTrue(evaluate_offline_gates(base, gates, minimum_samples=10).passed)
        self.assertEqual(
            evaluate_offline_gates(
                {**base, "permission_leaks": 1}, gates, minimum_samples=10
            ).reason,
            "permission_leak",
        )
        self.assertEqual(
            evaluate_offline_gates(
                {**base, "sample_count": 2}, gates, minimum_samples=10
            ).reason,
            "insufficient_samples",
        )

    def test_promotion_and_rollback_have_monotonic_states(self) -> None:
        champion, challenger = policies()
        retired, promoted = promote(champion, challenger)
        self.assertEqual((retired.status, retired.allocation_percent), ("retired", 0))
        self.assertEqual((promoted.status, promoted.allocation_percent), ("champion", 100))
        rejected = rollback(challenger)
        self.assertEqual((rejected.status, rejected.allocation_percent), ("rejected", 0))


if __name__ == "__main__":
    unittest.main()
