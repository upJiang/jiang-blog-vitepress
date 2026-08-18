from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    namespace: str
    description: str
    parameters: dict[str, object]
    required: bool = False
    required_scope: str | None = None

    @property
    def fingerprint(self) -> str:
        payload = json.dumps(
            {
                "name": self.name,
                "namespace": self.namespace,
                "description": self.description,
                "parameters": self.parameters,
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @property
    def schema_cost(self) -> int:
        payload = json.dumps(self.parameters, ensure_ascii=False, sort_keys=True)
        return max(1, len(payload) // 4)


@dataclass(frozen=True)
class CatalogPlan:
    immediate: tuple[ToolDefinition, ...]
    deferred: tuple[ToolDefinition, ...]
    used_schema_tokens: int


@dataclass
class WorkingSet:
    session_id: str
    loaded_fingerprints: dict[str, str] = field(default_factory=dict)

    def load(self, tools: list[ToolDefinition]) -> None:
        for tool in tools:
            self.loaded_fingerprints[tool.name] = tool.fingerprint

    def contains_current(self, tool: ToolDefinition) -> bool:
        return self.loaded_fingerprints.get(tool.name) == tool.fingerprint


def plan_catalog(tools: list[ToolDefinition], schema_budget: int) -> CatalogPlan:
    if schema_budget <= 0:
        raise ValueError("schema_budget_must_be_positive")

    immediate: list[ToolDefinition] = []
    deferred: list[ToolDefinition] = []
    used = 0

    for tool in tools:
        if not tool.required:
            continue
        if used + tool.schema_cost > schema_budget:
            raise ValueError(f"required_tools_exceed_budget:{tool.name}")
        immediate.append(tool)
        used += tool.schema_cost

    for tool in tools:
        if tool.required:
            continue
        if used + tool.schema_cost <= schema_budget:
            immediate.append(tool)
            used += tool.schema_cost
        else:
            deferred.append(tool)

    return CatalogPlan(tuple(immediate), tuple(deferred), used)


def search_deferred_tools(
    query: str,
    deferred: tuple[ToolDefinition, ...],
    allowed_scopes: set[str],
) -> list[ToolDefinition]:
    normalized_terms = {term.casefold() for term in query.split() if term.strip()}
    matches: list[ToolDefinition] = []

    for tool in deferred:
        if tool.required_scope and tool.required_scope not in allowed_scopes:
            continue
        searchable = f"{tool.namespace} {tool.name} {tool.description}".casefold()
        if normalized_terms and all(term in searchable for term in normalized_terms):
            matches.append(tool)

    return matches


def authorize_execution(tool: ToolDefinition, allowed_scopes: set[str]) -> None:
    if tool.required_scope and tool.required_scope not in allowed_scopes:
        raise PermissionError(f"tool_scope_denied:{tool.name}")
