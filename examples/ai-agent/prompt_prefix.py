from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass


@dataclass(frozen=True)
class RenderedRequest:
    stable_prefix: bytes
    tail: bytes

    @property
    def wire(self) -> bytes:
        return self.stable_prefix + b"\n" + self.tail

    @property
    def prefix_fingerprint(self) -> str:
        return hashlib.sha256(self.stable_prefix).hexdigest()


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def render_request(
    instructions: str,
    tools: list[dict[str, object]],
    user_message: str,
    request_metadata: dict[str, object],
) -> RenderedRequest:
    ordered_tools = sorted(
        tools,
        key=lambda item: (str(item.get("namespace", "")), str(item.get("name", ""))),
    )
    prefix = _canonical_bytes(
        {
            "instructions": instructions,
            "tools": ordered_tools,
        }
    )
    tail = _canonical_bytes(
        {
            "metadata": request_metadata,
            "user_message": user_message,
        }
    )
    return RenderedRequest(prefix, tail)


def fork_request(parent: RenderedRequest, appended_message: str) -> RenderedRequest:
    tail = _canonical_bytes(
        {
            "parent_tail": parent.tail.decode("utf-8"),
            "appended_message": appended_message,
        }
    )
    return RenderedRequest(parent.stable_prefix, tail)


def first_difference(left: bytes, right: bytes) -> int | None:
    for index, (left_byte, right_byte) in enumerate(zip(left, right)):
        if left_byte != right_byte:
            return index
    if len(left) != len(right):
        return min(len(left), len(right))
    return None
