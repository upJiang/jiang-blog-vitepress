from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field, replace
from enum import StrEnum


DIGIT_TO_CHINESE = str.maketrans("0123456789", "零一二三四五六七八九")
CHINESE_TO_DIGIT = str.maketrans("零一二三四五六七八九", "0123456789")


def normalize_alias(value: str) -> str:
    """把宽字符、空白和标点差异折叠成可比较的键。"""
    normalized = unicodedata.normalize("NFKC", value)
    return "".join(
        character.lower()
        for character in normalized.strip()
        if not (
            character.isspace()
            or unicodedata.category(character).startswith(("P", "S"))
        )
    )


def alias_match_forms(value: str) -> set[str]:
    normalized = normalize_alias(value)
    return {
        normalized,
        normalized.translate(DIGIT_TO_CHINESE),
        normalized.translate(CHINESE_TO_DIGIT),
    } - {""}


class CardStatus(StrEnum):
    READY = "ready"
    LOCKED = "locked"
    STALE = "stale"


@dataclass(frozen=True)
class WikiCard:
    object_id: str
    title: str
    summary: str
    aliases: tuple[str, ...]
    source_version: str
    generated: dict[str, object] = field(default_factory=dict)
    admin_override: dict[str, object] = field(default_factory=dict)
    locked_fields: frozenset[str] = frozenset()
    status: CardStatus = CardStatus.READY

    @property
    def runtime(self) -> dict[str, object]:
        # 人工值最后合并，自动生成不能覆盖已审核内容。
        return {**self.generated, **self.admin_override}

    def regenerate(self, generated: dict[str, object], source_version: str) -> WikiCard:
        status = CardStatus.LOCKED if self.locked_fields else CardStatus.READY
        return replace(
            self,
            generated=generated,
            source_version=source_version,
            status=status,
        )


class AliasConflict(ValueError):
    pass


class AliasRegistry:
    def __init__(self) -> None:
        self._targets: dict[str, str] = {}

    def bind(self, alias: str, object_id: str) -> None:
        key = normalize_alias(alias)
        current = self._targets.get(key)
        if current is not None and current != object_id:
            raise AliasConflict(f"alias {alias!r} already points to {current}")
        self._targets[key] = object_id

    def resolve(self, query: str) -> set[str]:
        query_forms = alias_match_forms(query)
        return {
            object_id
            for alias, object_id in self._targets.items()
            if alias_match_forms(alias) & query_forms
        }


class ReleaseCatalog:
    def __init__(self) -> None:
        self._snapshots: dict[str, dict[str, WikiCard]] = {}

    def publish(self, release_id: str, cards: list[WikiCard]) -> None:
        # 发布后保存快照；后续草稿变化不会回写这个 Release。
        self._snapshots[release_id] = {card.object_id: card for card in cards}

    def card(self, release_id: str, object_id: str) -> WikiCard:
        return self._snapshots[release_id][object_id]


def run_demo() -> dict[str, object]:
    generated = {
        "title": "六六活动验收规则",
        "summary": "活动验收以已发布版本为准。",
        "aliases": ["66 活动", "六六活动"],
    }
    card = WikiCard(
        object_id="policy-66",
        title="六六活动验收规则",
        summary="活动验收以已发布版本为准。",
        aliases=("66 活动", "六六活动"),
        source_version="version-7",
        generated=generated,
        admin_override={"summary": "验收前先核对发布范围。"},
        locked_fields=frozenset({"summary"}),
        status=CardStatus.LOCKED,
    )

    registry = AliasRegistry()
    registry.bind("ＡＩ ６６ 活动", card.object_id)
    resolved = registry.resolve("ai六六活动")

    catalog = ReleaseCatalog()
    catalog.publish("release-2026-08", [card])
    regenerated = card.regenerate(
        {**generated, "summary": "草稿中的新摘要"},
        source_version="version-8",
    )
    released = catalog.card("release-2026-08", card.object_id)

    return {
        "resolved": sorted(resolved),
        "current_summary": regenerated.runtime["summary"],
        "released_version": released.source_version,
        "released_summary": released.runtime["summary"],
    }


if __name__ == "__main__":
    print(run_demo())
