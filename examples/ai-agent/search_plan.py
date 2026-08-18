from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Literal


Channel = Literal["exact", "fulltext", "vector", "table", "graph"]
Status = Literal["pending", "running", "completed", "failed", "cancelled"]


@dataclass(frozen=True)
class BranchCandidate:
    branch_id: str
    channel: str
    query: str
    depends_on: tuple[str, ...] = ()


@dataclass(frozen=True)
class SearchBranch:
    branch_id: str
    channel: Channel
    query: str
    scope_ids: tuple[str, ...]
    top_k: int
    deadline_ms: int
    depends_on: tuple[str, ...] = ()
    status: Status = "pending"


@dataclass(frozen=True)
class SearchPlan:
    objective: str
    branches: tuple[SearchBranch, ...]
    max_research_rounds: int
    evidence_budget: int
    minimum_coverage: float
    revision: int = 0


_ALLOWED_CHANNELS: set[str] = {"exact", "fulltext", "vector", "table", "graph"}


def compile_plan(
    objective: str,
    candidates: list[BranchCandidate],
    *,
    trusted_scope_ids: tuple[str, ...],
    max_branches: int,
    max_research_rounds: int,
    evidence_budget: int,
) -> SearchPlan:
    if not objective.strip():
        raise ValueError("objective_must_not_be_empty")
    if not trusted_scope_ids:
        raise PermissionError("trusted_scope_required")
    if len(candidates) > max_branches:
        raise ValueError("branch_limit_exceeded")

    ids = [candidate.branch_id for candidate in candidates]
    if any(not branch_id for branch_id in ids) or len(ids) != len(set(ids)):
        raise ValueError("branch_ids_must_be_unique")

    known_ids = set(ids)
    branches: list[SearchBranch] = []
    for candidate in candidates:
        if candidate.channel not in _ALLOWED_CHANNELS:
            raise ValueError(f"channel_not_allowed:{candidate.channel}")
        if not candidate.query.strip():
            raise ValueError(f"query_must_not_be_empty:{candidate.branch_id}")
        if not set(candidate.depends_on) <= known_ids:
            raise ValueError(f"unknown_dependency:{candidate.branch_id}")
        branches.append(
            SearchBranch(
                branch_id=candidate.branch_id,
                channel=candidate.channel,  # type: ignore[arg-type]
                query=candidate.query.strip(),
                scope_ids=trusted_scope_ids,
                top_k=min(20, evidence_budget),
                deadline_ms=5_000,
                depends_on=candidate.depends_on,
            )
        )

    _topological_order(tuple(branches))
    return SearchPlan(
        objective.strip(),
        tuple(branches),
        max_research_rounds,
        evidence_budget,
        0.8,
    )


def _topological_order(branches: tuple[SearchBranch, ...]) -> tuple[str, ...]:
    dependencies = {branch.branch_id: set(branch.depends_on) for branch in branches}
    ordered: list[str] = []
    while dependencies:
        ready = sorted(branch_id for branch_id, values in dependencies.items() if not values)
        if not ready:
            raise ValueError("dependency_cycle")
        ordered.extend(ready)
        for branch_id in ready:
            dependencies.pop(branch_id)
        for values in dependencies.values():
            values.difference_update(ready)
    return tuple(ordered)


def runnable_branches(plan: SearchPlan) -> tuple[SearchBranch, ...]:
    completed = {branch.branch_id for branch in plan.branches if branch.status == "completed"}
    return tuple(
        branch
        for branch in plan.branches
        if branch.status == "pending" and set(branch.depends_on) <= completed
    )


def mark_completed(plan: SearchPlan, branch_id: str) -> SearchPlan:
    found = False
    updated: list[SearchBranch] = []
    for branch in plan.branches:
        if branch.branch_id != branch_id:
            updated.append(branch)
            continue
        found = True
        if branch.status != "pending":
            raise ValueError("branch_is_not_pending")
        updated.append(replace(branch, status="completed"))
    if not found:
        raise LookupError("branch_not_found")
    return replace(plan, branches=tuple(updated))


def should_stop(plan: SearchPlan, *, coverage: float, research_round: int) -> bool:
    if not 0 <= coverage <= 1:
        raise ValueError("coverage_out_of_range")
    return coverage >= plan.minimum_coverage or research_round >= plan.max_research_rounds


def add_supplemental_branch(
    plan: SearchPlan,
    candidate: BranchCandidate,
    *,
    research_round: int,
) -> SearchPlan:
    if research_round >= plan.max_research_rounds:
        raise RuntimeError("research_round_limit_reached")
    if any(branch.branch_id == candidate.branch_id for branch in plan.branches):
        raise ValueError("branch_ids_must_be_unique")
    if candidate.channel not in _ALLOWED_CHANNELS:
        raise ValueError(f"channel_not_allowed:{candidate.channel}")
    supplemental = SearchBranch(
        candidate.branch_id,
        candidate.channel,  # type: ignore[arg-type]
        candidate.query.strip(),
        plan.branches[0].scope_ids,
        min(20, plan.evidence_budget),
        5_000,
        candidate.depends_on,
    )
    revised = replace(plan, branches=(*plan.branches, supplemental), revision=plan.revision + 1)
    _topological_order(revised.branches)
    return revised
