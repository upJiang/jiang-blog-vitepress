from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Literal


StopReason = Literal["solution_found", "budget_exhausted", "frontier_exhausted"]


@dataclass(frozen=True)
class SearchState:
    action: str
    evidence_ids: tuple[str, ...]
    missing_facts: tuple[str, ...]
    inactive_evidence_count: int = 0
    cost: int = 0

    @property
    def signature(self) -> tuple[tuple[str, ...], tuple[str, ...], int]:
        return (
            tuple(sorted(self.evidence_ids)),
            tuple(sorted(self.missing_facts)),
            self.inactive_evidence_count,
        )


@dataclass(frozen=True)
class ThoughtNode:
    node_id: str
    parent_id: str | None
    state: SearchState
    depth: int
    score: float


@dataclass(frozen=True)
class SearchConfig:
    max_depth: int
    branching_factor: int
    node_budget: int
    pruning_threshold: float


@dataclass(frozen=True)
class SearchResult:
    stop_reason: StopReason
    best_node: ThoughtNode
    best_path: tuple[ThoughtNode, ...]
    visited_node_ids: tuple[str, ...]
    pruned_node_ids: tuple[str, ...]
    duplicate_node_ids: tuple[str, ...]


Expand = Callable[[SearchState], tuple[SearchState, ...]]
Evaluate = Callable[[SearchState], float]
IsGoal = Callable[[SearchState], bool]


def best_first_search(
    initial: SearchState,
    *,
    expand: Expand,
    evaluate: Evaluate,
    is_goal: IsGoal,
    config: SearchConfig,
) -> SearchResult:
    if config.max_depth < 0:
        raise ValueError("max_depth_must_be_non_negative")
    if config.branching_factor < 1:
        raise ValueError("branching_factor_must_be_positive")
    if config.node_budget < 1:
        raise ValueError("node_budget_must_be_positive")
    if not 0 <= config.pruning_threshold <= 1:
        raise ValueError("pruning_threshold_out_of_range")

    root = ThoughtNode("root", None, initial, 0, evaluate(initial))
    nodes = {root.node_id: root}
    frontier = [root]
    visited: list[str] = []
    pruned: list[str] = []
    duplicates: list[str] = []
    seen_signatures = {initial.signature}
    best = root
    sequence = 0
    evaluated_nodes = 1
    budget_exhausted = False

    while frontier:
        # 分数相同时优先较浅、ID 较小的节点，让测试和重放结果稳定。
        frontier.sort(key=lambda node: (-node.score, node.depth, node.node_id))
        current = frontier.pop(0)
        visited.append(current.node_id)
        if current.score > best.score:
            best = current
        if is_goal(current.state):
            return _result(
                "solution_found", current, nodes, visited, pruned, duplicates
            )
        if current.depth >= config.max_depth:
            continue

        for candidate in expand(current.state)[: config.branching_factor]:
            sequence += 1
            node_id = f"n{sequence}"
            if candidate.signature in seen_signatures:
                duplicates.append(node_id)
                continue
            if evaluated_nodes >= config.node_budget:
                budget_exhausted = True
                break

            seen_signatures.add(candidate.signature)
            score = evaluate(candidate)
            evaluated_nodes += 1
            node = ThoughtNode(node_id, current.node_id, candidate, current.depth + 1, score)
            nodes[node_id] = node
            if score < config.pruning_threshold:
                pruned.append(node_id)
                continue
            frontier.append(node)
            if score > best.score:
                best = node

        if budget_exhausted:
            break

    reason: StopReason = "budget_exhausted" if budget_exhausted else "frontier_exhausted"
    return _result(reason, best, nodes, visited, pruned, duplicates)


def _result(
    reason: StopReason,
    best: ThoughtNode,
    nodes: dict[str, ThoughtNode],
    visited: list[str],
    pruned: list[str],
    duplicates: list[str],
) -> SearchResult:
    path: list[ThoughtNode] = []
    current: ThoughtNode | None = best
    while current is not None:
        path.append(current)
        current = nodes.get(current.parent_id) if current.parent_id else None
    path.reverse()
    return SearchResult(
        reason,
        best,
        tuple(path),
        tuple(visited),
        tuple(pruned),
        tuple(duplicates),
    )


def knowledge_search_branches(state: SearchState) -> tuple[SearchState, ...]:
    if state.action == "start":
        return (
            SearchState("find_current_policy", ("policy:current",), ("release",), cost=1),
            SearchState(
                "find_general_handbook",
                ("handbook:remote-access",),
                ("condition", "release"),
                cost=1,
            ),
            SearchState(
                "find_archived_policy",
                ("policy:archived",),
                ("release",),
                inactive_evidence_count=1,
                cost=1,
            ),
            # 与第一条候选状态相同，用来验证重复分支不会再次扩展。
            SearchState("search_policy_alias", ("policy:current",), ("release",), cost=1),
        )
    if state.action == "find_current_policy":
        return (
            SearchState(
                "verify_active_release",
                ("policy:current", "release:active"),
                (),
                cost=state.cost + 1,
            ),
            SearchState(
                "search_more_policy_pages",
                state.evidence_ids,
                state.missing_facts,
                cost=state.cost + 1,
            ),
        )
    if state.action == "find_general_handbook":
        return (
            SearchState(
                "verify_handbook_release",
                ("handbook:remote-access", "release:active"),
                ("condition",),
                cost=state.cost + 1,
            ),
        )
    return ()


def score_knowledge_state(state: SearchState) -> float:
    required_fact_count = 3
    coverage = (required_fact_count - len(state.missing_facts)) / required_fact_count
    score = coverage - state.inactive_evidence_count * 0.5 - state.cost * 0.02
    return max(0.0, min(1.0, score))


def knowledge_answer_ready(state: SearchState) -> bool:
    return not state.missing_facts and state.inactive_evidence_count == 0
