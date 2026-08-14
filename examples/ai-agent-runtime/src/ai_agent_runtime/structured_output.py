from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Intent = Literal["knowledge_query", "greeting", "unsafe", "unclear"]


class ModelDecision(BaseModel):
    """Semantic fields the model may propose."""

    model_config = ConfigDict(extra="forbid", strict=True)

    intent: Intent
    normalized_query: str | None
    needs_clarification: bool
    clarification_question: str | None
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(min_length=1, max_length=160)

    @model_validator(mode="after")
    def validate_field_relationships(self) -> ModelDecision:
        if self.needs_clarification and not self.clarification_question:
            raise ValueError(
                "clarification_question is required when clarification is needed"
            )
        if not self.needs_clarification and self.clarification_question is not None:
            raise ValueError(
                "clarification_question must be null when clarification is not needed"
            )
        if self.intent == "knowledge_query" and not self.normalized_query:
            raise ValueError("knowledge_query requires normalized_query")
        if self.intent in {"greeting", "unsafe"} and self.normalized_query is not None:
            raise ValueError("greeting and unsafe decisions must not create a search query")
        return self


@dataclass(frozen=True, slots=True)
class TrustedContext:
    actor_id: str
    visible_scope_ids: tuple[str, ...]
    release_id: str
    allowed_channels: tuple[str, ...]
    deadline_at: datetime


@dataclass(frozen=True, slots=True)
class SearchCommand:
    query: str
    actor_id: str
    visible_scope_ids: tuple[str, ...]
    release_id: str
    allowed_channels: tuple[str, ...]
    deadline_at: datetime


class DecisionRejectedError(ValueError):
    """The candidate is well formed but cannot enter retrieval."""


def parse_model_decision(raw_json: str) -> ModelDecision:
    return ModelDecision.model_validate_json(raw_json, strict=True)


def build_search_command(
    decision: ModelDecision,
    trusted: TrustedContext,
    *,
    now: datetime,
) -> SearchCommand:
    if decision.intent != "knowledge_query":
        raise DecisionRejectedError(f"intent {decision.intent!r} does not enter retrieval")
    if decision.needs_clarification:
        raise DecisionRejectedError("the user must clarify the question before retrieval")
    if trusted.deadline_at <= now:
        raise DecisionRejectedError("the turn deadline has expired")
    if not trusted.visible_scope_ids:
        raise DecisionRejectedError("the authenticated user has no visible knowledge scope")
    if not trusted.allowed_channels:
        raise DecisionRejectedError("the runtime policy allows no retrieval channel")

    assert decision.normalized_query is not None
    return SearchCommand(
        query=decision.normalized_query,
        actor_id=trusted.actor_id,
        visible_scope_ids=trusted.visible_scope_ids,
        release_id=trusted.release_id,
        allowed_channels=trusted.allowed_channels,
        deadline_at=trusted.deadline_at,
    )
