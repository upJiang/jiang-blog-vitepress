from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class SeedCandidate:
    object_id: str
    title: str
    score: float


@dataclass(frozen=True)
class Relation:
    source_id: str
    source_name: str
    target_id: str
    target_name: str
    relation_type: str
    label: str
    confidence: float
    release_id: str
    visible_to: frozenset[str]


@dataclass(frozen=True)
class GraphContext:
    seed_object_id: str
    source_name: str
    target_name: str
    relation_type: str
    label: str
    confidence: float


@dataclass(frozen=True)
class RetrievalResult:
    base: tuple[SeedCandidate, ...]
    graph: tuple[GraphContext, ...]
    degraded_reason: str = ""


class GraphTimeout(TimeoutError):
    pass


class RelationGraph:
    def __init__(self, relations: list[Relation]) -> None:
        self.relations = relations

    def expand_one_hop(
        self,
        *,
        seeds: list[str],
        subject: str,
        release_id: str,
        allowed_relations: set[str],
        limit: int,
    ) -> list[GraphContext]:
        contexts: list[GraphContext] = []
        for relation in sorted(
            self.relations,
            key=lambda item: item.confidence,
            reverse=True,
        ):
            if relation.release_id != release_id:
                continue
            if subject not in relation.visible_to:
                continue
            if relation.relation_type not in allowed_relations:
                continue
            seed = next(
                (
                    seed_id
                    for seed_id in seeds
                    if seed_id in {relation.source_id, relation.target_id}
                ),
                "",
            )
            if not seed:
                continue
            contexts.append(
                GraphContext(
                    seed,
                    relation.source_name,
                    relation.target_name,
                    relation.relation_type,
                    relation.label,
                    relation.confidence,
                )
            )
            if len(contexts) >= limit:
                break
        return contexts


def retrieve(
    base_search: Callable[[], list[SeedCandidate]],
    graph_search: Callable[[list[str]], list[GraphContext]],
    *,
    mode: str,
    seed_limit: int = 12,
) -> RetrievalResult:
    base = tuple(sorted(base_search(), key=lambda item: item.score, reverse=True))
    if mode != "deep" or not base:
        return RetrievalResult(base, ())

    seeds = [item.object_id for item in base[:seed_limit] if item.object_id]
    if not seeds:
        return RetrievalResult(base, ())
    try:
        graph = tuple(graph_search(seeds))
    except GraphTimeout:
        return RetrievalResult(base, (), "graph_timeout")
    return RetrievalResult(base, graph)


def run_demo() -> RetrievalResult:
    graph = RelationGraph(
        [
            Relation(
                "policy-remote",
                "远程访问规范",
                "topic-device",
                "设备合规",
                "has_topic",
                "主题",
                0.94,
                "release-7",
                frozenset({"user:reader"}),
            ),
            Relation(
                "policy-remote",
                "远程访问规范",
                "secret-project",
                "未公开项目",
                "references_document",
                "引用文档",
                0.99,
                "release-7",
                frozenset({"role:admin"}),
            ),
        ]
    )
    return retrieve(
        lambda: [SeedCandidate("policy-remote", "远程访问规范", 0.86)],
        lambda seeds: graph.expand_one_hop(
            seeds=seeds,
            subject="user:reader",
            release_id="release-7",
            allowed_relations={"has_topic", "requires"},
            limit=8,
        ),
        mode="deep",
    )


if __name__ == "__main__":
    print(run_demo())
