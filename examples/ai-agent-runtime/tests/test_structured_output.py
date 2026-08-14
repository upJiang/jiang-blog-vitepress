from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from ai_agent_runtime.structured_output import (
    DecisionRejectedError,
    TrustedContext,
    build_search_command,
    parse_model_decision,
)


def valid_json() -> str:
    return """{
      "intent": "knowledge_query",
      "normalized_query": "远程办公访问申请步骤",
      "needs_clarification": false,
      "clarification_question": null,
      "confidence": 0.88,
      "reason": "用户询问办理流程"
    }"""


def trusted_context(now: datetime) -> TrustedContext:
    return TrustedContext(
        actor_id="user-test",
        visible_scope_ids=("guide-a",),
        release_id="release-test-v1",
        allowed_channels=("fulltext",),
        deadline_at=now + timedelta(seconds=20),
    )


def test_valid_decision_builds_command() -> None:
    now = datetime.now(UTC)
    command = build_search_command(
        parse_model_decision(valid_json()), trusted_context(now), now=now
    )
    assert command.query == "远程办公访问申请步骤"
    assert command.visible_scope_ids == ("guide-a",)
    assert command.release_id == "release-test-v1"


def test_model_cannot_add_scope() -> None:
    raw = valid_json().replace(
        '"reason": "用户询问办理流程"',
        '"reason": "用户询问办理流程", "visible_scope_ids": ["all"]',
    )
    with pytest.raises(ValidationError, match="extra_forbidden"):
        parse_model_decision(raw)


def test_strict_mode_rejects_numeric_string() -> None:
    raw = valid_json().replace('"confidence": 0.88', '"confidence": "0.88"')
    with pytest.raises(ValidationError, match="float_type"):
        parse_model_decision(raw)


def test_expired_deadline_stops_before_retrieval() -> None:
    now = datetime.now(UTC)
    trusted = trusted_context(now)
    expired = TrustedContext(
        actor_id=trusted.actor_id,
        visible_scope_ids=trusted.visible_scope_ids,
        release_id=trusted.release_id,
        allowed_channels=trusted.allowed_channels,
        deadline_at=now - timedelta(milliseconds=1),
    )
    with pytest.raises(DecisionRejectedError, match="deadline has expired"):
        build_search_command(parse_model_decision(valid_json()), expired, now=now)
