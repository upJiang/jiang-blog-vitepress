from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from context_budget import approximate_tokens


@dataclass(frozen=True)
class Message:
    message_id: str
    group_id: str
    role: str
    content: str
    required: bool = False


@dataclass(frozen=True)
class Window:
    messages: tuple[Message, ...]
    omitted_message_ids: tuple[str, ...]
    used_tokens: int
    token_budget: int


@dataclass(frozen=True)
class FocusRef:
    kind: str
    object_id: str
    title: str


@dataclass(frozen=True)
class ConversationState:
    conversation_id: str
    owner_id: str
    focus: FocusRef | None = None
    revision: int = 0


@dataclass(frozen=True)
class FollowUp:
    question: str
    focus: FocusRef
    state_revision: int


class ConversationNotFound(LookupError):
    pass


class InMemoryConversationStore:
    """只验证所有者隔离和版本检查，不代表生产持久化方案。"""

    def __init__(self) -> None:
        self._states: dict[str, ConversationState] = {}

    def create(self, conversation_id: str, owner_id: str) -> ConversationState:
        state = ConversationState(conversation_id, owner_id)
        self._states[conversation_id] = state
        return state

    def load(self, conversation_id: str, owner_id: str) -> ConversationState:
        state = self._states.get(conversation_id)
        if state is None or state.owner_id != owner_id:
            # 对不存在和无权访问返回同一种结果，避免泄露会话是否存在。
            raise ConversationNotFound("conversation_not_found")
        return state

    def set_focus(
        self,
        conversation_id: str,
        owner_id: str,
        focus: FocusRef,
        *,
        expected_revision: int,
    ) -> ConversationState:
        current = self.load(conversation_id, owner_id)
        if current.revision != expected_revision:
            raise RuntimeError("conversation_revision_conflict")
        updated = ConversationState(
            current.conversation_id,
            current.owner_id,
            focus,
            current.revision + 1,
        )
        self._states[conversation_id] = updated
        return updated


def bind_follow_up(
    question: str,
    state: ConversationState,
    *,
    visible_object_ids: set[str],
) -> FollowUp:
    if not question.strip():
        raise ValueError("question_must_not_be_empty")
    if state.focus is None:
        raise LookupError("focus_missing")
    if state.focus.object_id not in visible_object_ids:
        raise PermissionError("focus_not_visible")
    return FollowUp(question.strip(), state.focus, state.revision)


def title_once(
    existing_title: str,
    first_question: str,
    generate: Callable[[str], str],
    *,
    fallback_length: int = 18,
) -> str:
    if existing_title.strip():
        return existing_title.strip()
    try:
        generated = generate(first_question).strip()
    except Exception:
        generated = ""
    return generated or first_question.strip()[:fallback_length] or "新对话"


def _message_cost(message: Message) -> int:
    return 4 + approximate_tokens(message.role) + approximate_tokens(message.content)


def select_window(messages: list[Message], budget: int) -> Window:
    if budget <= 0:
        raise ValueError("budget_must_be_positive")

    groups: dict[str, list[Message]] = {}
    group_order: list[str] = []
    for message in messages:
        if message.group_id not in groups:
            groups[message.group_id] = []
            group_order.append(message.group_id)
        groups[message.group_id].append(message)

    costs = {
        group_id: sum(_message_cost(message) for message in group)
        for group_id, group in groups.items()
    }
    required = [
        group_id
        for group_id in group_order
        if any(message.required for message in groups[group_id])
    ]
    used = sum(costs[group_id] for group_id in required)
    if used > budget:
        raise ValueError("required_messages_exceed_budget")

    selected = set(required)
    for group_id in reversed(group_order):
        if group_id in selected:
            continue
        if used + costs[group_id] > budget:
            continue
        selected.add(group_id)
        used += costs[group_id]

    kept = tuple(message for message in messages if message.group_id in selected)
    omitted = tuple(message.message_id for message in messages if message.group_id not in selected)
    return Window(kept, omitted, used, budget)
