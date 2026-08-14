from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Literal, Protocol


@dataclass(frozen=True)
class ToolCall:
    name: str
    arguments: dict[str, object]


@dataclass(frozen=True)
class FinalAnswer:
    text: str


Decision = ToolCall | FinalAnswer


class DecisionModel(Protocol):
    def decide(self, question: str, observations: list[str]) -> Decision: ...


@dataclass
class AgentState:
    question: str
    observations: list[str] = field(default_factory=list)
    steps: int = 0
    status: Literal["running", "completed", "failed"] = "running"


Tool = Callable[[dict[str, object]], str]


def run_agent(
    model: DecisionModel,
    tools: dict[str, Tool],
    question: str,
    *,
    max_steps: int = 4,
) -> tuple[AgentState, str]:
    state = AgentState(question=question)
    while state.steps < max_steps:
        decision = model.decide(state.question, list(state.observations))
        state.steps += 1

        if isinstance(decision, FinalAnswer):
            state.status = "completed"
            return state, decision.text

        tool = tools.get(decision.name)
        if tool is None:
            state.status = "failed"
            raise LookupError(f"unknown_tool:{decision.name}")

        try:
            observation = tool(decision.arguments)
        except (TimeoutError, ValueError) as error:
            state.observations.append(f"tool_error:{type(error).__name__}")
            continue
        state.observations.append(observation)

    state.status = "failed"
    raise RuntimeError("step_limit_reached")


class ScriptedModel:
    """A fixed policy for testing the runtime without an API key."""

    def decide(self, question: str, observations: list[str]) -> Decision:
        if not observations:
            return ToolCall("search_notes", {"query": question, "limit": 2})
        if observations[-1].startswith("tool_error:"):
            return FinalAnswer("检索失败，当前无法核对答案。")
        return FinalAnswer(f"根据检索结果：{observations[-1]}")
