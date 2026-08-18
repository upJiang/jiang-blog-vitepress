from __future__ import annotations

import unittest

from knowledge_graph_build import (
    DocumentVersion,
    EvidenceGraph,
    RelationCandidate,
    run_demo,
)


class KnowledgeGraphBuildTests(unittest.TestCase):
    def test_rebuild_is_idempotent_and_rejects_unsupported_relation(self) -> None:
        self.assertEqual(
            run_demo(),
            {"nodes": 4, "edges": 2, "evidence": 2, "active_edges": 2},
        )

    def test_old_evidence_stops_serving_after_version_switch(self) -> None:
        graph = EvidenceGraph("kb-demo")
        old = DocumentVersion(
            "doc-1",
            "version-1",
            "object-1",
            "访问规范",
            "设备需要审批。",
            ("审批",),
        )
        new = DocumentVersion(
            "doc-1",
            "version-2",
            "object-1",
            "访问规范",
            "设备需要复核。",
            (),
        )
        graph.build(old)
        self.assertEqual(len(graph.active_edges()), 1)

        graph.build(new)
        self.assertEqual(len(graph.active_edges()), 0)

    def test_low_confidence_relation_is_not_persisted(self) -> None:
        graph = EvidenceGraph("kb-demo")
        document = DocumentVersion(
            "doc-1", "version-1", "object-1", "规范", "甲依赖乙。"
        )
        graph.build(
            document,
            (RelationCandidate("甲", "乙", "depends_on", "甲依赖乙", 0.5),),
        )

        self.assertEqual(graph.active_edges(), [])


if __name__ == "__main__":
    unittest.main()
