from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, datetime


@dataclass(frozen=True)
class Memory:
    memory_id: str
    owner_id: str
    text: str
    source_turn_id: str
    revision: int = 1
    active: bool = True
    expires_at: datetime | None = None
    memory_type: str = "preference"
    scope: str = "user"
    fact_key: str = ""
    conflict_status: str = "clear"

    def visible_at(self, owner_id: str, now: datetime) -> bool:
        return (
            self.active
            and self.owner_id == owner_id
            and self.conflict_status == "clear"
            and (self.expires_at is None or self.expires_at > now)
        )


class MemoryStore:
    def __init__(self) -> None:
        self._items: dict[str, Memory] = {}

    def put(self, memory: Memory, *, supersede_conflicts: bool = False) -> Memory:
        current = self._items.get(memory.memory_id)
        if current is not None and memory.revision <= current.revision:
            raise ValueError("revision must increase")
        if memory.fact_key:
            conflicts = [
                item
                for item in self._items.values()
                if item.active
                and item.owner_id == memory.owner_id
                and item.scope == memory.scope
                and item.memory_type == memory.memory_type
                and item.fact_key == memory.fact_key
                and item.text != memory.text
            ]
            if conflicts and not supersede_conflicts:
                memory = replace(memory, conflict_status="conflicted")
                for item in conflicts:
                    self._items[item.memory_id] = replace(item, conflict_status="conflicted")
            elif conflicts:
                for item in conflicts:
                    self._items[item.memory_id] = replace(item, conflict_status="superseded")
        self._items[memory.memory_id] = memory
        return memory

    def get(self, memory_id: str) -> Memory:
        return self._items[memory_id]

    def recall(self, owner_id: str, query: str, *, limit: int = 5) -> list[Memory]:
        terms = {term for term in query.lower().split() if term}
        now = datetime.now(UTC)
        ranked: list[tuple[int, Memory]] = []
        for memory in self._items.values():
            if not memory.visible_at(owner_id, now):
                continue
            score = sum(term in memory.text.lower() for term in terms)
            if score:
                ranked.append((score, memory))
        ranked.sort(key=lambda pair: (-pair[0], pair[1].memory_id))
        return [memory for _, memory in ranked[:limit]]

    def forget(self, owner_id: str, memory_id: str) -> Memory:
        current = self._items[memory_id]
        if current.owner_id != owner_id:
            raise PermissionError("memory owner mismatch")
        forgotten = replace(current, active=False, revision=current.revision + 1)
        self._items[memory_id] = forgotten
        return forgotten
