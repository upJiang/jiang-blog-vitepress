from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Literal


Outcome = Literal["success", "error"]
DecisionAction = Literal["continue", "nudge", "force_stop"]


@dataclass(frozen=True)
class ActionRecord:
    tool: str
    arguments: dict[str, object]
    outcome: Outcome
    state_revision: int
    output_fingerprint: str = ""
    error_class: str = ""
    progress_units: int = 0

    @property
    def signature(self) -> str:
        payload = json.dumps(
            {"tool": self.tool, "arguments": self.arguments},
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(payload.encode()).hexdigest()[:16]


@dataclass(frozen=True)
class StallDecision:
    action: DecisionAction
    reason: str
    evidence_indices: tuple[int, ...] = ()


class StallDetector:
    def __init__(
        self,
        *,
        duplicate_success_limit: int = 3,
        repeated_error_limit: int = 5,
        validation_error_limit: int = 2,
        family_no_progress_limit: int = 5,
        max_nudges: int = 1,
    ) -> None:
        self.duplicate_success_limit = duplicate_success_limit
        self.repeated_error_limit = repeated_error_limit
        self.validation_error_limit = validation_error_limit
        self.family_no_progress_limit = family_no_progress_limit
        self.max_nudges = max_nudges

    def evaluate(
        self,
        history: list[ActionRecord],
        *,
        nudge_count: int = 0,
    ) -> StallDecision:
        if not history:
            return StallDecision("continue", "no_actions")

        last = history[-1]
        same_signature = [
            index
            for index, action in enumerate(history)
            if action.signature == last.signature
        ]
        same_error = [
            index
            for index, action in enumerate(history)
            if action.tool == last.tool
            and action.outcome == "error"
            and action.error_class == last.error_class
        ]

        if (
            last.outcome == "error"
            and last.error_class == "validation_error"
            and len(same_error) >= self.validation_error_limit
        ):
            return StallDecision(
                "force_stop",
                "repeated_validation_error",
                tuple(same_error[-self.validation_error_limit :]),
            )

        if last.outcome == "success" and len(same_signature) >= self.duplicate_success_limit:
            window = [history[index] for index in same_signature[-self.duplicate_success_limit :]]
            no_progress = len({action.state_revision for action in window}) == 1
            same_output = len({action.output_fingerprint for action in window}) == 1
            if no_progress and same_output:
                return self._escalate(
                    "duplicate_success_without_progress",
                    tuple(same_signature[-self.duplicate_success_limit :]),
                    nudge_count,
                )

        if (
            last.outcome == "error"
            and last.error_class
            and len(same_error) >= self.repeated_error_limit
        ):
            return self._escalate(
                "repeated_same_error",
                tuple(same_error[-self.repeated_error_limit :]),
                nudge_count,
            )

        family_window = history[-self.family_no_progress_limit :]
        if len(family_window) == self.family_no_progress_limit:
            same_family = len({action.tool.split(".", 1)[0] for action in family_window}) == 1
            no_progress = sum(action.progress_units for action in family_window) == 0
            unchanged = len({action.state_revision for action in family_window}) == 1
            if same_family and no_progress and unchanged:
                indices = tuple(range(len(history) - len(family_window), len(history)))
                return self._escalate(
                    "tool_family_without_progress",
                    indices,
                    nudge_count,
                )

        return StallDecision("continue", "progress_or_budget_available")

    def _escalate(
        self,
        reason: str,
        indices: tuple[int, ...],
        nudge_count: int,
    ) -> StallDecision:
        action: DecisionAction = "nudge" if nudge_count < self.max_nudges else "force_stop"
        return StallDecision(action, reason, indices)


if __name__ == "__main__":
    detector = StallDetector()
    records = [
        ActionRecord("search.web", {"query": "权限"}, "success", 1, "empty")
        for _ in range(3)
    ]
    print(detector.evaluate(records))
