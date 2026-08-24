from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Callable, Literal, Protocol, Sequence, TypeAlias

Scalar: TypeAlias = str | int | bool
Arguments: TypeAlias = tuple[tuple[str, Scalar], ...]
RunStatus: TypeAlias = Literal[
    "running",
    "waiting_approval",
    "completed",
    "failed",
    "exhausted",
]
ObservationStatus: TypeAlias = Literal[
    "success",
    "empty",
    "denied",
    "timeout",
    "unknown",
    "completion_rejected",
]
ToolStatus: TypeAlias = Literal["success", "empty", "denied", "unknown"]


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: Arguments = ()


@dataclass(frozen=True)
class RequestApproval:
    action: str
    arguments: Arguments = ()


@dataclass(frozen=True)
class Finish:
    answer: str


Decision: TypeAlias = ToolCall | RequestApproval | Finish


@dataclass(frozen=True)
class Observation:
    action: str
    status: ObservationStatus
    data: tuple[tuple[str, str], ...] = ()
    error: str | None = None


@dataclass(frozen=True)
class AgentState:
    goal: str
    observations: tuple[Observation, ...] = ()
    steps: int = 0
    status: RunStatus = "running"
    stop_reason: str | None = None
    final_answer: str | None = None
    pending_approval: RequestApproval | None = None


@dataclass(frozen=True)
class ModelInput:
    goal: str
    observations: tuple[Observation, ...]


class DecisionModel(Protocol):
    def decide(self, model_input: ModelInput) -> Decision: ...


@dataclass(frozen=True)
class ToolResult:
    status: ToolStatus
    data: tuple[tuple[str, str], ...] = ()
    error: str | None = None


Tool: TypeAlias = Callable[[Arguments], ToolResult]


@dataclass(frozen=True)
class CompletionCheck:
    accepted: bool
    missing_evidence: tuple[str, ...] = ()


CompletionValidator: TypeAlias = Callable[[AgentState, Finish], CompletionCheck]


@dataclass(frozen=True)
class Continue:
    observation: Observation


@dataclass(frozen=True)
class Pause:
    request: RequestApproval


@dataclass(frozen=True)
class Complete:
    answer: str


@dataclass(frozen=True)
class Fail:
    reason: str


StepOutcome: TypeAlias = Continue | Pause | Complete | Fail


def handle_decision(
    state: AgentState,
    decision: Decision,
    tools: dict[str, Tool],
    completion_validator: CompletionValidator,
    approval_actions: frozenset[str],
) -> StepOutcome:
    if isinstance(decision, Finish):
        check = completion_validator(state, decision)
        if check.accepted:
            return Complete(decision.answer)
        return Continue(
            Observation(
                action="finish",
                status="completion_rejected",
                data=tuple(
                    ("missing_evidence", item) for item in check.missing_evidence
                ),
                error="completion_evidence_missing",
            )
        )

    action = decision.name if isinstance(decision, ToolCall) else decision.action
    arguments = decision.arguments
    argument_names = [name for name, _value in arguments]
    if len(argument_names) != len(set(argument_names)):
        return Continue(Observation(action, "denied", error="duplicate_argument"))

    if isinstance(decision, RequestApproval):
        if action not in approval_actions:
            return Continue(
                Observation(action, "denied", error="approval_not_configured")
            )
        return Pause(decision)

    if action in approval_actions:
        return Pause(RequestApproval(action, arguments))

    tool = tools.get(action)
    if tool is None:
        return Continue(Observation(action, "denied", error="tool_not_available"))

    try:
        result = tool(arguments)
    except TimeoutError:
        return Continue(Observation(action, "timeout", error="tool_timeout"))
    except ValueError:
        return Continue(Observation(action, "denied", error="invalid_arguments"))
    except Exception as error:  # noqa: BLE001 - unexpected tool failures stop the run
        return Fail(f"tool_execution_failed:{type(error).__name__}")

    return Continue(Observation(action, result.status, result.data, result.error))


def advance(state: AgentState, outcome: StepOutcome) -> AgentState:
    if state.status != "running":
        raise ValueError("only a running state can advance")

    next_step = state.steps + 1
    if isinstance(outcome, Continue):
        return replace(
            state,
            observations=state.observations + (outcome.observation,),
            steps=next_step,
        )
    if isinstance(outcome, Pause):
        return replace(
            state,
            steps=next_step,
            status="waiting_approval",
            stop_reason="approval_required",
            pending_approval=outcome.request,
        )
    if isinstance(outcome, Complete):
        return replace(
            state,
            steps=next_step,
            status="completed",
            stop_reason="completion_verified",
            final_answer=outcome.answer,
        )
    return replace(
        state,
        steps=next_step,
        status="failed",
        stop_reason=outcome.reason,
    )


def run_agent(
    model: DecisionModel,
    tools: dict[str, Tool],
    initial_state: AgentState,
    completion_validator: CompletionValidator,
    *,
    approval_actions: frozenset[str] = frozenset(),
    max_steps: int = 6,
) -> AgentState:
    if max_steps <= 0:
        raise ValueError("max_steps must be positive")

    state = initial_state
    while state.status == "running" and state.steps < max_steps:
        model_input = ModelInput(state.goal, state.observations)
        decision = model.decide(model_input)
        outcome = handle_decision(
            state,
            decision,
            tools,
            completion_validator,
            approval_actions,
        )
        state = advance(state, outcome)

    if state.status == "running":
        return replace(
            state,
            status="exhausted",
            stop_reason="step_limit_reached",
        )
    return state


class ScriptedModel:
    """A deterministic test double; it does not simulate language understanding."""

    def __init__(self, decisions: Sequence[Decision]) -> None:
        self._decisions = tuple(decisions)
        self.calls = 0
        self.inputs: list[ModelInput] = []

    def decide(self, model_input: ModelInput) -> Decision:
        if self.calls >= len(self._decisions):
            raise RuntimeError("scripted decisions exhausted")
        self.inputs.append(model_input)
        decision = self._decisions[self.calls]
        self.calls += 1
        return decision
