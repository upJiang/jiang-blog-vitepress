from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ContextPart:
    name: str
    text: str
    priority: int
    required: bool = False
    source_id: str = ""
    trust: str = "untrusted"


@dataclass(frozen=True)
class Assembly:
    selected: tuple[ContextPart, ...]
    dropped: tuple[ContextPart, ...]
    used_tokens: int
    token_budget: int


def approximate_tokens(text: str) -> int:
    """A deterministic teaching estimate, not a provider tokenizer."""
    ascii_count = sum(character.isascii() for character in text)
    return max(1, (ascii_count + 3) // 4 + len(text) - ascii_count)


def compile_context(parts: list[ContextPart], budget: int) -> Assembly:
    if budget <= 0:
        raise ValueError("budget_must_be_positive")
    selected: list[ContextPart] = []
    dropped: list[ContextPart] = []
    used = 0
    ordered = sorted(parts, key=lambda item: (item.required, item.priority), reverse=True)
    for part in ordered:
        cost = approximate_tokens(part.text)
        if used + cost > budget:
            if part.required:
                raise ValueError(f"required_part_exceeds_budget:{part.name}")
            dropped.append(part)
            continue
        selected.append(part)
        used += cost
    return Assembly(tuple(selected), tuple(dropped), used, budget)


def assemble(parts: list[ContextPart], budget: int) -> list[ContextPart]:
    return list(compile_context(parts, budget).selected)
