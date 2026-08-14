from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ContextPart:
    name: str
    text: str
    priority: int


def approximate_tokens(text: str) -> int:
    """A deterministic teaching estimate, not a provider tokenizer."""
    ascii_count = sum(character.isascii() for character in text)
    return max(1, (ascii_count + 3) // 4 + len(text) - ascii_count)


def assemble(parts: list[ContextPart], budget: int) -> list[ContextPart]:
    if budget <= 0:
        raise ValueError("budget_must_be_positive")
    selected: list[ContextPart] = []
    used = 0
    for part in sorted(parts, key=lambda item: item.priority, reverse=True):
        cost = approximate_tokens(part.text)
        if used + cost > budget:
            continue
        selected.append(part)
        used += cost
    return selected
