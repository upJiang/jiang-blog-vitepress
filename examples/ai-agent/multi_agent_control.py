from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass, field
from typing import Literal

TaskStatus = Literal["pending", "running", "succeeded", "failed", "blocked"]
HandoffStatus = Literal["offered", "accepted", "cancelled", "returned"]


@dataclass(frozen=True)
class TaskSpec:
    task_id: str
    objective: str
    depends_on: tuple[str, ...] = ()
    required: bool = True
    allowed_tools: frozenset[str] = frozenset()
    token_budget: int = 1_000


@dataclass(frozen=True)
class TaskResult:
    task_id: str
    status: TaskStatus
    output: str = ""
    evidence_ids: tuple[str, ...] = ()
    error_code: str = ""


@dataclass(frozen=True)
class HandoffPackage:
    handoff_id: str
    task_id: str
    sender: str
    receiver: str
    objective: str
    context_refs: tuple[str, ...]
    allowed_tools: frozenset[str]
    workspace_revision: int
    return_when: str


@dataclass(frozen=True)
class WorkspaceEvent:
    revision: int
    author: str
    key: str
    value: str


class WorkspaceConflict(RuntimeError):
    pass


@dataclass(frozen=True)
class HandoffState:
    package: HandoffPackage
    status: HandoffStatus = "offered"
    accepted_revision: int | None = None
    result_ref: str = ""


def accept_handoff(
    state: HandoffState,
    *,
    receiver: str,
    current_workspace_revision: int,
) -> HandoffState:
    if state.status != "offered":
        raise ValueError("only an offered handoff can be accepted")
    if receiver != state.package.receiver:
        raise PermissionError("the receiver does not match the handoff contract")
    if current_workspace_revision != state.package.workspace_revision:
        raise WorkspaceConflict("the handoff context is stale")
    return HandoffState(
        package=state.package,
        status="accepted",
        accepted_revision=current_workspace_revision,
    )


def return_handoff(state: HandoffState, *, result_ref: str) -> HandoffState:
    if state.status != "accepted":
        raise ValueError("only an accepted handoff can return a result")
    if not result_ref:
        raise ValueError("a returned handoff needs a stable result reference")
    return HandoffState(
        package=state.package,
        status="returned",
        accepted_revision=state.accepted_revision,
        result_ref=result_ref,
    )


@dataclass
class VersionedWorkspace:
    _events: list[WorkspaceEvent] = field(default_factory=list)

    @property
    def revision(self) -> int:
        return len(self._events)

    def append(self, *, author: str, key: str, value: str, expected_revision: int) -> int:
        if expected_revision != self.revision:
            raise WorkspaceConflict(
                f"expected revision {expected_revision}, current revision {self.revision}"
            )
        event = WorkspaceEvent(self.revision + 1, author, key, value)
        self._events.append(event)
        return event.revision

    def read_since(self, revision: int) -> tuple[WorkspaceEvent, ...]:
        return tuple(event for event in self._events if event.revision > revision)


def validate_dag(tasks: Iterable[TaskSpec]) -> dict[str, TaskSpec]:
    task_list = list(tasks)
    task_map = {task.task_id: task for task in task_list}
    if not task_map:
        raise ValueError("the task graph cannot be empty")
    if len(task_map) != len(task_list):
        raise ValueError("task ids must be unique")

    for task in task_map.values():
        missing = set(task.depends_on) - task_map.keys()
        if missing:
            raise ValueError(f"{task.task_id} has missing dependencies: {sorted(missing)}")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(task_id: str) -> None:
        if task_id in visiting:
            raise ValueError(f"cycle detected at {task_id}")
        if task_id in visited:
            return
        visiting.add(task_id)
        for dependency in task_map[task_id].depends_on:
            visit(dependency)
        visiting.remove(task_id)
        visited.add(task_id)

    for task_id in task_map:
        visit(task_id)
    return task_map


async def execute_dag(
    tasks: list[TaskSpec],
    worker: Callable[[TaskSpec, dict[str, TaskResult]], Awaitable[TaskResult]],
    *,
    max_concurrency: int = 3,
) -> dict[str, TaskResult]:
    task_map = validate_dag(tasks)
    results: dict[str, TaskResult] = {}
    pending = set(task_map)
    semaphore = asyncio.Semaphore(max_concurrency)

    async def run(task: TaskSpec) -> TaskResult:
        async with semaphore:
            return await worker(task, {key: results[key] for key in task.depends_on})

    while pending:
        blocked = [
            task_map[task_id]
            for task_id in pending
            if any(results.get(dep, TaskResult(dep, "pending")).status in {"failed", "blocked"}
                   for dep in task_map[task_id].depends_on)
        ]
        for task in blocked:
            results[task.task_id] = TaskResult(
                task.task_id, "blocked", error_code="dependency_failed"
            )
            pending.remove(task.task_id)

        ready = [
            task_map[task_id]
            for task_id in pending
            if all(results.get(dep, TaskResult(dep, "pending")).status == "succeeded"
                   for dep in task_map[task_id].depends_on)
        ]
        if not ready:
            if pending:
                raise RuntimeError(f"no runnable task remains: {sorted(pending)}")
            break

        completed = await asyncio.gather(*(run(task) for task in ready))
        for result in completed:
            if result.task_id not in {task.task_id for task in ready}:
                raise ValueError(f"worker returned unexpected task id: {result.task_id}")
            results[result.task_id] = result
            pending.remove(result.task_id)

    return results


@dataclass(frozen=True)
class SwarmProposal:
    agent_id: str
    task_id: str
    action: str
    target_agent: str = ""
    tool: str = ""
    estimated_cost: int = 0

    @property
    def signature(self) -> tuple[str, str, str]:
        return self.task_id, self.action, self.target_agent


@dataclass
class SwarmGate:
    remaining_budget: int
    allowed_tools: frozenset[str]
    max_handoffs: int = 3
    seen: set[tuple[str, str, str]] = field(default_factory=set)
    handoffs_by_task: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def admit(self, proposal: SwarmProposal) -> tuple[bool, str]:
        if proposal.tool and proposal.tool not in self.allowed_tools:
            return False, "tool_not_allowed"
        if proposal.signature in self.seen:
            return False, "duplicate_proposal"
        if proposal.estimated_cost > self.remaining_budget:
            return False, "budget_exhausted"
        if proposal.target_agent:
            if self.handoffs_by_task[proposal.task_id] >= self.max_handoffs:
                return False, "handoff_limit"
            self.handoffs_by_task[proposal.task_id] += 1
        self.seen.add(proposal.signature)
        self.remaining_budget -= proposal.estimated_cost
        return True, "accepted"
