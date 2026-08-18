from __future__ import annotations

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class ToolResult:
    result_id: str
    call_id: str
    content: str
    content_type: str = "text"
    self_bounded: bool = False


@dataclass(frozen=True)
class PromptResult:
    result_id: str
    call_id: str
    preview: str
    truncated: bool
    object_ref: str | None
    content_hash: str
    original_characters: int


class MemoryObjectStore:
    def __init__(self) -> None:
        self.objects: dict[str, str] = {}

    def put(self, result: ToolResult) -> str:
        object_ref = f"tool-result://{result.result_id}"
        self.objects[object_ref] = result.content
        return object_ref


def prepare_results(
    results: list[ToolResult],
    store: MemoryObjectStore,
    *,
    per_result_limit: int,
    aggregate_target: int,
    preview_characters: int,
    minimum_spill_size: int,
) -> list[PromptResult]:
    if min(per_result_limit, aggregate_target, preview_characters, minimum_spill_size) <= 0:
        raise ValueError("limits_must_be_positive")

    spilled: set[str] = {
        result.result_id
        for result in results
        if not result.self_bounded and len(result.content) > per_result_limit
    }
    prompt_size = sum(
        min(len(result.content), preview_characters)
        if result.result_id in spilled
        else len(result.content)
        for result in results
    )
    candidates = sorted(
        (
            result
            for result in results
            if not result.self_bounded
            and result.result_id not in spilled
            and len(result.content) >= minimum_spill_size
        ),
        key=lambda result: len(result.content),
        reverse=True,
    )
    for result in candidates:
        if prompt_size <= aggregate_target:
            break
        spilled.add(result.result_id)
        prompt_size -= len(result.content) - min(len(result.content), preview_characters)

    prepared: list[PromptResult] = []
    for result in results:
        digest = hashlib.sha256(result.content.encode()).hexdigest()
        if result.result_id in spilled:
            object_ref = store.put(result)
            preview = result.content[:preview_characters]
            prepared.append(
                PromptResult(
                    result.result_id,
                    result.call_id,
                    preview,
                    True,
                    object_ref,
                    digest,
                    len(result.content),
                )
            )
        else:
            prepared.append(
                PromptResult(
                    result.result_id,
                    result.call_id,
                    result.content,
                    False,
                    None,
                    digest,
                    len(result.content),
                )
            )
    return prepared
