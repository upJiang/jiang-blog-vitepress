from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Tier = Literal["full", "summary", "stub"]
Method = Literal["none", "semantic", "deterministic", "metadata"]


@dataclass(frozen=True)
class ToolObservation:
    observation_id: str
    tool_name: str
    calls_after: int
    content: str
    active_reference: bool = False
    content_bearing: bool = False


@dataclass(frozen=True)
class CompressionDecision:
    observation_id: str
    tier: Tier
    method: Method


def classify_observations(
    observations: list[ToolObservation],
    *,
    recent_distance: int,
    stub_distance: int,
    semantic_attempt_limit: int,
) -> list[CompressionDecision]:
    if recent_distance < 0 or stub_distance <= recent_distance:
        raise ValueError("invalid_distance_thresholds")
    semantic_attempts = 0
    decisions: list[CompressionDecision] = []
    for observation in observations:
        if observation.active_reference or observation.calls_after <= recent_distance:
            decisions.append(CompressionDecision(observation.observation_id, "full", "none"))
            continue
        if observation.content_bearing or observation.calls_after < stub_distance:
            if semantic_attempts < semantic_attempt_limit:
                semantic_attempts += 1
                method: Method = "semantic"
            else:
                method = "deterministic"
            decisions.append(CompressionDecision(observation.observation_id, "summary", method))
            continue
        decisions.append(CompressionDecision(observation.observation_id, "stub", "metadata"))
    return decisions
