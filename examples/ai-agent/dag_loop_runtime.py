from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


Action = Literal["search", "answer", "stop"]


@dataclass(frozen=True)
class Decision:
    action: Action
    query: str = ""
    answer: str = ""


@dataclass
class LoopState:
    question: str
    allowed_sources: frozenset[str]
    observations: list[str] = field(default_factory=list)
    answer: str = ""
    iterations: int = 0
    stop_reason: str = ""


class ScriptedModel:
    def __init__(self, decisions: list[Decision]) -> None:
        self.decisions = list(decisions)
        self.calls = 0

    def decide(self, _state: LoopState) -> Decision:
        self.calls += 1
        if not self.decisions:
            return Decision("stop")
        return self.decisions.pop(0)


def run_adaptive_kernel(
    state: LoopState,
    model: ScriptedModel,
    *,
    max_iterations: int = 4,
) -> LoopState:
    while state.iterations < max_iterations:
        state.iterations += 1
        decision = model.decide(state)
        if decision.action == "search":
            if decision.query not in state.allowed_sources:
                state.stop_reason = "source_outside_scope"
                return state
            state.observations.append(f"evidence:{decision.query}")
            continue
        if decision.action == "answer":
            if not state.observations:
                state.stop_reason = "answer_without_evidence"
                return state
            state.answer = decision.answer
            state.stop_reason = "completed"
            return state
        state.stop_reason = "model_stopped"
        return state
    state.stop_reason = "iteration_limit"
    return state


def run_hybrid_runtime(
    question: str,
    allowed_sources: frozenset[str],
    model: ScriptedModel,
) -> LoopState:
    if not question.strip():
        raise ValueError("question_required")
    if not allowed_sources:
        return LoopState(question, allowed_sources, stop_reason="scope_empty")

    state = LoopState(question, allowed_sources)
    result = run_adaptive_kernel(state, model)
    if result.stop_reason == "completed" and not result.answer.strip():
        result.stop_reason = "empty_answer"
    return result


if __name__ == "__main__":
    model = ScriptedModel(
        [Decision("search", query="employee-guide"), Decision("answer", answer="审批后生效")]
    )
    print(run_hybrid_runtime("远程访问何时生效？", frozenset({"employee-guide"}), model))
