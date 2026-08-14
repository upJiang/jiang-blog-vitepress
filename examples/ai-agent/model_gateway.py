from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Message:
    role: str
    content: str


@dataclass(frozen=True)
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass(frozen=True)
class ModelResponse:
    text: str
    status: str
    usage: Usage


class ModelGateway(Protocol):
    def respond(self, messages: list[Message]) -> ModelResponse: ...


class FakeModel:
    """Deterministic test double. It does not emulate a real language model."""

    def respond(self, messages: list[Message]) -> ModelResponse:
        if not messages or messages[-1].role != "user":
            raise ValueError("last_message_must_be_user")
        question = messages[-1].content.strip()
        if not question:
            raise ValueError("question_is_empty")
        text = "需要检索账号状态后才能回答。" if "账号" in question else "输入已收到。"
        return ModelResponse(text=text, status="completed", usage=Usage(12, 8))


def answer_once(model: ModelGateway, question: str) -> ModelResponse:
    messages = [
        Message("developer", "缺少事实时不要猜测。"),
        Message("user", question),
    ]
    response = model.respond(messages)
    if response.status != "completed" or not response.text.strip():
        raise RuntimeError("model_response_is_incomplete")
    return response
