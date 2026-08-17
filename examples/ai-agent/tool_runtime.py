from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class ToolCall:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ToolResult:
    call_id: str
    name: str
    status: str
    output: str = ""
    error: str = ""


Tool = Callable[[dict[str, Any]], str]


def execute_call(call: ToolCall, tools: dict[str, Tool]) -> ToolResult:
    tool = tools.get(call.name)
    if tool is None:
        return ToolResult(call.call_id, call.name, "rejected", error="unknown_tool")
    try:
        return ToolResult(call.call_id, call.name, "completed", output=tool(call.arguments))
    except (KeyError, TypeError, ValueError) as exc:
        return ToolResult(call.call_id, call.name, "failed", error=f"invalid_arguments:{exc}")


def execute_parallel(
    calls: list[ToolCall],
    tools: dict[str, Tool],
    *,
    max_workers: int = 4,
) -> list[ToolResult]:
    if max_workers < 1:
        raise ValueError("max_workers must be positive")
    if len({call.call_id for call in calls}) != len(calls):
        raise ValueError("call_id must be unique")

    results: dict[str, ToolResult] = {}
    with ThreadPoolExecutor(max_workers=min(max_workers, max(1, len(calls)))) as executor:
        futures = {executor.submit(execute_call, call, tools): call.call_id for call in calls}
        for future in as_completed(futures):
            result = future.result()
            results[result.call_id] = result

    # Completion order is nondeterministic. Returning request order keeps the
    # model observation and persisted event sequence stable.
    return [results[call.call_id] for call in calls]
