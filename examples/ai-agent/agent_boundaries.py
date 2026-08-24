from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypeAlias

ArgumentValue: TypeAlias = str | int | bool
DecisionStatus: TypeAlias = Literal["execute", "pause", "reject", "complete"]

TRUSTED_ARGUMENTS = frozenset({"actor", "scope", "approved"})


@dataclass(frozen=True)
class ActionProposal:
    name: str
    arguments: tuple[tuple[str, ArgumentValue], ...] = ()


@dataclass(frozen=True)
class ApprovalGrant:
    proposal: ActionProposal
    actor: str
    scope: tuple[str, ...]


@dataclass(frozen=True)
class RuntimeContext:
    actor: str
    scope: tuple[str, ...]
    allowed_actions: frozenset[str]
    write_actions: frozenset[str] = frozenset()
    approvals: frozenset[ApprovalGrant] = frozenset()
    required_evidence: frozenset[str] = frozenset()
    observed_evidence: frozenset[str] = frozenset()


@dataclass(frozen=True)
class ExecutionCommand:
    name: str
    arguments: tuple[tuple[str, object], ...]


@dataclass(frozen=True)
class RuntimeDecision:
    status: DecisionStatus
    reason: str
    command: ExecutionCommand | None = None


def evaluate_proposal(
    proposal: ActionProposal,
    context: RuntimeContext,
) -> RuntimeDecision:
    keys = [key for key, _ in proposal.arguments]
    if len(keys) != len(set(keys)):
        return RuntimeDecision("reject", "duplicate_argument")
    if TRUSTED_ARGUMENTS.intersection(keys):
        return RuntimeDecision("reject", "trusted_context_is_model_controlled")

    if proposal.name == "finish":
        missing = context.required_evidence - context.observed_evidence
        if missing:
            return RuntimeDecision("reject", "completion_evidence_missing")
        return RuntimeDecision("complete", "completion_verified")

    if proposal.name not in context.allowed_actions:
        return RuntimeDecision("reject", "action_not_allowed")
    if not context.actor or not context.scope:
        return RuntimeDecision("reject", "trusted_context_is_missing")
    if proposal.name in context.write_actions:
        expected_approval = ApprovalGrant(
            proposal=proposal,
            actor=context.actor,
            scope=context.scope,
        )
        if expected_approval not in context.approvals:
            return RuntimeDecision("pause", "approval_required")

    command = ExecutionCommand(
        name=proposal.name,
        arguments=proposal.arguments
        + (
            ("actor", context.actor),
            ("scope", context.scope),
        ),
    )
    return RuntimeDecision("execute", "action_allowed", command)
