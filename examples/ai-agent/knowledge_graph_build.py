from __future__ import annotations

from dataclasses import dataclass, field
from uuid import NAMESPACE_URL, uuid5


def stable_id(*parts: str) -> str:
    return str(uuid5(NAMESPACE_URL, "\x00".join(parts)))


def normalize_name(value: str) -> str:
    return "".join(value.lower().split())


@dataclass(frozen=True)
class DocumentVersion:
    document_id: str
    version_id: str
    object_id: str
    title: str
    text: str
    topics: tuple[str, ...] = ()


@dataclass(frozen=True)
class RelationCandidate:
    source_name: str
    target_name: str
    relation_type: str
    quote: str
    confidence: float


@dataclass
class GraphEdge:
    id: str
    source_id: str
    target_id: str
    relation_type: str
    method: str
    evidence_ids: set[str] = field(default_factory=set)


@dataclass(frozen=True)
class Evidence:
    id: str
    edge_id: str
    document_id: str
    version_id: str
    quote: str


class EvidenceGraph:
    def __init__(self, namespace: str) -> None:
        self.namespace = namespace
        self.nodes: dict[str, str] = {}
        self.edges: dict[str, GraphEdge] = {}
        self.evidence: dict[str, Evidence] = {}
        self.active_versions: dict[str, str] = {}

    def _node(self, object_type: str, object_id: str, name: str) -> str:
        node_id = stable_id(self.namespace, object_type, object_id)
        self.nodes[node_id] = name
        return node_id

    def _edge(
        self,
        source_id: str,
        target_id: str,
        relation_type: str,
        method: str,
        document: DocumentVersion,
        quote: str,
    ) -> str:
        edge_id = stable_id(self.namespace, source_id, target_id, relation_type)
        edge = self.edges.setdefault(
            edge_id,
            GraphEdge(edge_id, source_id, target_id, relation_type, method),
        )
        evidence_id = stable_id(edge_id, document.version_id, quote)
        self.evidence[evidence_id] = Evidence(
            evidence_id,
            edge_id,
            document.document_id,
            document.version_id,
            quote,
        )
        edge.evidence_ids.add(evidence_id)
        return edge_id

    def build(
        self,
        document: DocumentVersion,
        semantic_candidates: tuple[RelationCandidate, ...] = (),
    ) -> None:
        root_id = self._node("document", document.object_id, document.title)

        for topic in document.topics:
            topic_id = self._node(
                "concept",
                f"topic:{normalize_name(topic)}",
                topic,
            )
            self._edge(
                root_id,
                topic_id,
                "has_topic",
                "deterministic",
                document,
                f"文档主题：{topic}",
            )

        for candidate in semantic_candidates:
            if candidate.confidence < 0.65:
                continue
            if not candidate.quote or candidate.quote not in document.text:
                continue
            source_id = self._node(
                "concept",
                f"semantic:{normalize_name(candidate.source_name)}",
                candidate.source_name,
            )
            target_id = self._node(
                "concept",
                f"semantic:{normalize_name(candidate.target_name)}",
                candidate.target_name,
            )
            self._edge(
                source_id,
                target_id,
                candidate.relation_type,
                "semantic_with_evidence",
                document,
                candidate.quote,
            )

        self.active_versions[document.document_id] = document.version_id

    def active_edges(self) -> list[GraphEdge]:
        result: list[GraphEdge] = []
        for edge in self.edges.values():
            has_active_evidence = any(
                self.active_versions.get(item.document_id) == item.version_id
                for evidence_id in edge.evidence_ids
                if (item := self.evidence.get(evidence_id)) is not None
            )
            if has_active_evidence:
                result.append(edge)
        return result


def run_demo() -> dict[str, int]:
    graph = EvidenceGraph("kb-demo")
    version = DocumentVersion(
        document_id="doc-remote",
        version_id="version-7",
        object_id="policy-remote",
        title="远程访问规范",
        text="受管设备必须通过合规检查后才能建立远程连接。",
        topics=("设备合规",),
    )
    candidates = (
        RelationCandidate(
            "受管设备",
            "合规检查",
            "requires",
            "受管设备必须通过合规检查",
            0.92,
        ),
        RelationCandidate(
            "远程连接",
            "永久权限",
            "grants",
            "原文中不存在的引用",
            0.99,
        ),
    )
    graph.build(version, candidates)
    graph.build(version, candidates)
    return {
        "nodes": len(graph.nodes),
        "edges": len(graph.edges),
        "evidence": len(graph.evidence),
        "active_edges": len(graph.active_edges()),
    }


if __name__ == "__main__":
    print(run_demo())
