from __future__ import annotations

import base64
import binascii
import re
import unicodedata
from dataclasses import dataclass
from typing import Literal


TrustLevel = Literal["policy", "user_input", "memory", "retrieved", "tool_result"]


@dataclass(frozen=True)
class ContextItem:
    item_id: str
    source: str
    trust: TrustLevel
    content: str


@dataclass(frozen=True)
class ScanResult:
    risk_codes: tuple[str, ...]


@dataclass(frozen=True)
class CompiledContext:
    instructions: tuple[ContextItem, ...]
    data: tuple[ContextItem, ...]
    scan_results: dict[str, ScanResult]


_INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions", re.I),
    re.compile(r"(?:reveal|print|return).{0,24}(?:system|developer)\s+prompt", re.I),
    re.compile(r"(?:绕过|忽略).{0,12}(?:权限|系统提示词|之前的指令)"),
)
_BASE64_TOKEN = re.compile(r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{24,}={0,2}(?![A-Za-z0-9+/])")
_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\ufeff"), None)


def _candidates(value: str) -> tuple[str, ...]:
    normalized = unicodedata.normalize("NFKC", value).translate(_ZERO_WIDTH)
    candidates = [normalized]
    for token in _BASE64_TOKEN.findall(normalized)[:8]:
        try:
            padded = token + "=" * (-len(token) % 4)
            decoded = base64.b64decode(padded, validate=True).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError, ValueError):
            continue
        if decoded.isprintable():
            candidates.append(unicodedata.normalize("NFKC", decoded))
    return tuple(dict.fromkeys(candidates))


def scan_content(value: str) -> ScanResult:
    candidates = _candidates(value)
    codes = tuple(
        f"injection_pattern_{index + 1}"
        for index, pattern in enumerate(_INJECTION_PATTERNS)
        if any(pattern.search(candidate) for candidate in candidates)
    )
    return ScanResult(codes)


def compile_context(items: list[ContextItem]) -> CompiledContext:
    instructions: list[ContextItem] = []
    data: list[ContextItem] = []
    scans: dict[str, ScanResult] = {}
    for item in items:
        scan = scan_content(item.content)
        scans[item.item_id] = scan
        if item.trust == "policy":
            instructions.append(item)
        else:
            # 用户、记忆、检索和工具结果都保留为数据，不能进入指令区。
            data.append(item)
    return CompiledContext(tuple(instructions), tuple(data), scans)


def authorize_tool_action(
    *,
    action_source: str,
    tool_name: str,
    allowed_tools: set[str],
) -> None:
    if action_source != "model_decision":
        raise PermissionError("untrusted_content_cannot_request_tools")
    if tool_name not in allowed_tools:
        raise PermissionError("tool_not_allowed")


def accept_memory(content: str) -> str:
    scan = scan_content(content)
    if scan.risk_codes:
        raise ValueError("unsafe_memory_content")
    return content.strip()


def answer_violates_injection_gate(answer: str, forbidden_markers: set[str]) -> bool:
    if scan_content(answer).risk_codes:
        return True
    lowered = answer.casefold()
    return any(marker.casefold() in lowered for marker in forbidden_markers)
