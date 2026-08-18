from __future__ import annotations

import unittest

from rag_metrics import RankedItem, evaluate_ranking, run_demo


class RagMetricsTests(unittest.TestCase):
    def test_recall_mrr_and_ndcg_share_the_same_ranking(self) -> None:
        result = run_demo()

        self.assertAlmostEqual(result.recall_at_k or 0, 2 / 3)
        self.assertAlmostEqual(result.reciprocal_rank, 0.5)
        self.assertAlmostEqual(result.ndcg_at_k or 0, 0.574141409, places=6)

    def test_permission_and_release_failures_are_separate_gates(self) -> None:
        result = evaluate_ranking(
            [
                RankedItem("hidden", "release-7", allowed=False),
                RankedItem("future", "release-8"),
            ],
            {"expected": 3},
            release_id="release-7",
            k=2,
        )

        self.assertEqual(result.permission_leaks, ("hidden",))
        self.assertEqual(result.wrong_release, ("future",))
        self.assertEqual(result.recall_at_k, 0)
        self.assertEqual(result.reciprocal_rank, 0)

    def test_empty_gold_does_not_report_fake_perfect_recall(self) -> None:
        result = evaluate_ranking(
            [RankedItem("noise", "release-7")],
            {},
            release_id="release-7",
            k=1,
        )

        self.assertIsNone(result.recall_at_k)
        self.assertIsNone(result.ndcg_at_k)


if __name__ == "__main__":
    unittest.main()
