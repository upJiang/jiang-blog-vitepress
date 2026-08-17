from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Capability:
    name: str
    mutates_state: bool
    allowed_roots: tuple[Path, ...] = ()


@dataclass(frozen=True)
class Action:
    capability: str
    target: Path | None = None


def authorize_action(action: Action, capabilities: dict[str, Capability]) -> str:
    capability = capabilities.get(action.capability)
    if capability is None:
        return "deny_unknown_capability"
    if capability.mutates_state:
        return "require_approval"
    if action.target is None:
        return "allow"
    resolved = action.target.resolve()
    if any(resolved.is_relative_to(root.resolve()) for root in capability.allowed_roots):
        return "allow"
    return "deny_outside_scope"
