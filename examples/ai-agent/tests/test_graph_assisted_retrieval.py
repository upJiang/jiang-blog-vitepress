from __future__ import annotations

import unittest

from graph_assisted_retrieval import (
    GraphContext,
    GraphTimeout,
    SeedCandidate,
    retrieve,
    run_demo,
)


class GraphAssistedRetrievalTests(unittest.TestCase):
    def test_graph_expansion_keeps_release_acl_and_relation_filter(self) -> None:
        result = run_demo()

        self.assertEqual(len(result.base), 1)
        self.assertEqual(len(result.graph), 1)
        self.assertEqual(result.graph[0].target_name, "设备合规")

    def test_graph_timeout_preserves_base_candidates(self) -> None:
        def timeout(_: list[str]) -> list[GraphContext]:
            raise GraphTimeout

        result = retrieve(
            lambda: [SeedCandidate("policy-1", "规范", 0.8)],
            timeout,
            mode="deep",
        )

        self.assertEqual(len(result.base), 1)
        self.assertEqual(result.graph, ())
        self.assertEqual(result.degraded_reason, "graph_timeout")

    def test_standard_mode_does_not_call_graph(self) -> None:
        calls = 0

        def graph(_: list[str]) -> list[GraphContext]:
            nonlocal calls
            calls += 1
            return []

        result = retrieve(
            lambda: [SeedCandidate("policy-1", "规范", 0.8)],
            graph,
            mode="standard",
        )

        self.assertEqual(calls, 0)
        self.assertEqual(result.graph, ())


if __name__ == "__main__":
    unittest.main()
