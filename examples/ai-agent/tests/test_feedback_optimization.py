from __future__ import annotations

import unittest

from feedback_optimization import (
    CanaryMetrics,
    Feedback,
    OfflineMetrics,
    Policy,
    check_offline_gate,
    monitor_canary,
    propose_candidate,
    stable_bucket,
    summarize_feedback,
)


class FeedbackOptimizationTests(unittest.TestCase):
    def test_ineligible_and_revoked_feedback_do_not_become_signals(self) -> None:
        feedback = (
            Feedback("f1", "t1", "rejected", ("retrieval",)),
            Feedback("f2", "t2", "rejected", ("retrieval",), active=False),
            Feedback(
                "f3",
                "t3",
                "rejected",
                ("retrieval",),
                optimization_eligible=False,
            ),
        )
        self.assertEqual(summarize_feedback(feedback)["total"], 1)
        self.assertEqual(summarize_feedback(feedback)["retrieval_rejections"], 1)

    def test_retrieval_signal_changes_only_allowlisted_policy_fields(self) -> None:
        feedback = tuple(
            Feedback(f"f{index}", f"t{index}", "rejected", ("retrieval",))
            for index in range(5)
        )
        candidate = propose_candidate(Policy("champion"), feedback)
        self.assertIsNotNone(candidate)
        assert candidate is not None
        self.assertEqual(candidate.retrieval_top_k, 24)
        self.assertEqual(candidate.minimum_coverage, 0.82)
        self.assertEqual(candidate.max_research_rounds, 2)

    def test_too_few_feedback_items_do_not_create_a_candidate(self) -> None:
        feedback = tuple(
            Feedback(f"f{index}", f"t{index}", "rejected", ("unclear",))
            for index in range(4)
        )
        self.assertIsNone(propose_candidate(Policy("champion"), feedback))

    def test_offline_gate_fails_closed_on_security_redline(self) -> None:
        metrics = OfflineMetrics(20, 0.9, 0.95, 0.95, 0.95, permission_leaks=1)
        passed, reason = check_offline_gate(metrics, {"hit_at_5": 0.8})
        self.assertFalse(passed)
        self.assertEqual(reason, "permission_leak")

    def test_stable_bucket_is_repeatable_and_bounded(self) -> None:
        first = stable_bucket("kb-1", "user-1", "request-1")
        self.assertEqual(first, stable_bucket("kb-1", "user-1", "request-1"))
        self.assertGreaterEqual(first, 0)
        self.assertLess(first, 100)

    def test_canary_waits_rolls_back_or_promotes_from_observed_metrics(self) -> None:
        champion = CanaryMetrics(100, 20, 0.01, 0.1)
        self.assertEqual(
            monitor_canary(champion, CanaryMetrics(3, 1, 0, 0)).status,
            "observing",
        )
        self.assertEqual(
            monitor_canary(champion, CanaryMetrics(25, 6, 0.03, 0.1)).status,
            "rolled_back",
        )
        self.assertEqual(
            monitor_canary(champion, CanaryMetrics(25, 6, 0.01, 0.11)).status,
            "promoted",
        )


if __name__ == "__main__":
    unittest.main()
