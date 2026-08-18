from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import PurePosixPath
from urllib.parse import urlsplit


class SandboxViolation(RuntimeError):
    pass


@dataclass(frozen=True)
class SandboxPolicy:
    read_roots: tuple[str, ...]
    write_roots: tuple[str, ...]
    allowed_hosts: frozenset[str]
    max_actions: int = 8
    max_output_bytes: int = 4096


@dataclass(frozen=True)
class ActionRequest:
    action: str
    arguments: dict[str, str]
    risk: str = "low"


@dataclass(frozen=True)
class Approval:
    request_fingerprint: str


@dataclass
class SandboxState:
    actions: int = 0
    output_bytes: int = 0
    events: list[str] = field(default_factory=list)


def request_fingerprint(request: ActionRequest) -> str:
    canonical = json.dumps(
        {
            "action": request.action,
            "arguments": request.arguments,
            "risk": request.risk,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def require_approval(request: ActionRequest, approval: Approval | None) -> None:
    if request.risk != "high":
        return
    if approval is None:
        raise SandboxViolation("approval_required")
    if approval.request_fingerprint != request_fingerprint(request):
        raise SandboxViolation("approval_mismatch")


class VirtualFileSystem:
    """A test double for policy checks, not an operating-system sandbox."""

    def __init__(
        self,
        *,
        files: dict[str, str] | None = None,
        symlinks: dict[str, str] | None = None,
    ) -> None:
        self.files = dict(files or {})
        self.symlinks = dict(symlinks or {})

    def resolve(self, raw_path: str) -> str:
        path = _normalize_absolute_path(raw_path)
        for _ in range(8):
            target = self.symlinks.get(path)
            if target is None:
                return path
            path = _normalize_absolute_path(target)
        raise SandboxViolation("symlink_depth_exceeded")


def _normalize_absolute_path(raw_path: str) -> str:
    path = PurePosixPath(raw_path)
    if not path.is_absolute() or any(part == ".." for part in path.parts):
        raise SandboxViolation("invalid_path")
    return "/" + "/".join(part for part in path.parts if part not in {"/", "."})


def _inside(path: str, roots: tuple[str, ...]) -> bool:
    candidate = PurePosixPath(path)
    return any(candidate == PurePosixPath(root) or PurePosixPath(root) in candidate.parents for root in roots)


class CapabilitySandbox:
    def __init__(self, policy: SandboxPolicy, filesystem: VirtualFileSystem) -> None:
        self.policy = policy
        self.filesystem = filesystem
        self.state = SandboxState()

    def execute(
        self,
        request: ActionRequest,
        *,
        approval: Approval | None = None,
        network_fixtures: dict[str, str] | None = None,
    ) -> str:
        if self.state.actions >= self.policy.max_actions:
            raise SandboxViolation("action_budget_exhausted")
        require_approval(request, approval)
        self.state.actions += 1

        if request.action == "read_file":
            result = self._read_file(request.arguments["path"])
        elif request.action == "write_file":
            result = self._write_file(
                request.arguments["path"], request.arguments.get("content", "")
            )
        elif request.action == "fetch_url":
            result = self._fetch_url(
                request.arguments["url"], network_fixtures or {}
            )
        else:
            raise SandboxViolation("action_not_supported")

        size = len(result.encode("utf-8"))
        if self.state.output_bytes + size > self.policy.max_output_bytes:
            raise SandboxViolation("output_budget_exhausted")
        self.state.output_bytes += size
        self.state.events.append(
            f"{request.action}:ok:{request_fingerprint(request)[:12]}"
        )
        return result

    def _read_file(self, raw_path: str) -> str:
        path = self.filesystem.resolve(raw_path)
        if not _inside(path, self.policy.read_roots):
            raise SandboxViolation("read_path_denied")
        if path not in self.filesystem.files:
            raise FileNotFoundError(path)
        return self.filesystem.files[path]

    def _write_file(self, raw_path: str, content: str) -> str:
        path = self.filesystem.resolve(raw_path)
        if not _inside(path, self.policy.write_roots):
            raise SandboxViolation("write_path_denied")
        self.filesystem.files[path] = content
        return f"written:{path}"

    def _fetch_url(self, raw_url: str, fixtures: dict[str, str]) -> str:
        parsed = urlsplit(raw_url)
        host = (parsed.hostname or "").casefold()
        if parsed.scheme != "https" or parsed.username or parsed.password:
            raise SandboxViolation("network_target_denied")
        if host not in self.policy.allowed_hosts:
            raise SandboxViolation("network_target_denied")
        if raw_url not in fixtures:
            raise LookupError("fixture_missing")
        return fixtures[raw_url]


if __name__ == "__main__":
    policy = SandboxPolicy(
        read_roots=("/workspace/input",),
        write_roots=("/workspace/output",),
        allowed_hosts=frozenset({"docs.example.com"}),
        max_actions=3,
        max_output_bytes=256,
    )
    filesystem = VirtualFileSystem(
        files={"/workspace/input/request.txt": "生成审批摘要"}
    )
    sandbox = CapabilitySandbox(policy, filesystem)
    result = sandbox.execute(
        ActionRequest("read_file", {"path": "/workspace/input/request.txt"})
    )
    print(result)
    print(sandbox.state.events)
