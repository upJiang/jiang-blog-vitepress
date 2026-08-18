from __future__ import annotations

import unittest

from hybrid_retrieval import (
    Candidate,
    ChannelResult,
    fuse_candidates,
    reciprocal_rank_fusion,
    rerank_with_fallback,
    run_demo,
)


class HybridRetrievalTests(unittest.TestCase):
    def test_rrf_deduplicates_and_preserves_channel_identity(self) -> None:
        fused = reciprocal_rank_fusion(
            [
                ChannelResult("exact", ("a", "b")),
                ChannelResult("fulltext", ("b", "a")),
            ]
        )

        self.assertEqual(set(fused), {"a", "b"})
        self.assertEqual(fused["a"][1], ("exact", "fulltext"))

    def test_fusion_filters_acl_and_release_before_delivery(self) -> None:
        catalog = {
            "allowed": Candidate("allowed", "A", "A", "release-7"),
            "old": Candidate("old", "B", "B", "release-6"),
            "hidden": Candidate("hidden", "C", "C", "release-7", allowed=False),
        }
        result = fuse_candidates(
            catalog,
            [ChannelResult("exact", ("allowed", "old", "hidden"))],
            release_id="release-7",
        )
        self.assertEqual([item.candidate_id for item in result], ["allowed"])

    def test_rerank_timeout_preserves_fusion_order(self) -> None:
        candidates = [
            Candidate("first", "A", "A", "release-7", fusion_score=0.2),
            Candidate("second", "B", "B", "release-7", fusion_score=0.1),
        ]

        def timeout(_query: str, _documents: list[str]) -> list[tuple[int, float]]:
            raise TimeoutError("rerank timeout")

        ranked, degraded = rerank_with_fallback("query", candidates, timeout, limit=2)
        self.assertTrue(degraded)
        self.assertEqual([item.candidate_id for item in ranked], ["first", "second"])

    def test_demo_keeps_partial_channels_and_applies_rerank(self) -> None:
        ranked, degraded = run_demo()

        self.assertFalse(degraded)
        self.assertEqual([item.candidate_id for item in ranked], ["policy", "request"])
        self.assertNotIn("hidden", [item.candidate_id for item in ranked])


if __name__ == "__main__":
    unittest.main()
