from __future__ import annotations

import unittest

from acl_release_retrieval import (
    AccessSnapshot,
    CandidateCache,
    Chunk,
    SecureReleaseRetriever,
    run_demo,
)


class AclReleaseRetrievalTests(unittest.TestCase):
    def test_release_cache_rechecks_revocation(self) -> None:
        self.assertEqual(
            run_demo(),
            {
                "first": ["chunk-v7"],
                "cached": ["chunk-v7"],
                "after_revoke": [],
                "search_calls": 1,
            },
        )

    def test_scope_does_not_expand_after_empty_result(self) -> None:
        retriever = SecureReleaseRetriever(
            [Chunk("chunk-1", "doc-1", "node-1", "release-1", "目标制度")],
            CandidateCache(),
        )
        access = AccessSnapshot(
            "reader-1",
            frozenset({"user:reader-1"}),
            frozenset(),
            frozenset({"node-other"}),
        )

        self.assertEqual(
            retriever.search(query="目标", release_id="release-1", access=access),
            [],
        )

    def test_group_constraint_is_separate_from_subject_acl(self) -> None:
        chunk = Chunk(
            "chunk-1",
            "doc-1",
            "node-1",
            "release-1",
            "组内制度",
            "group",
            frozenset({"dept:security"}),
            frozenset({"group:owners"}),
        )
        retriever = SecureReleaseRetriever([chunk], CandidateCache())
        without_group = AccessSnapshot(
            "reader-1",
            frozenset({"dept:security"}),
            frozenset(),
            frozenset(),
        )

        self.assertEqual(
            retriever.search(query="制度", release_id="release-1", access=without_group),
            [],
        )


if __name__ == "__main__":
    unittest.main()
