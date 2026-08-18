from __future__ import annotations

import re
from dataclasses import dataclass, field


IDENTIFIER_PATTERN = re.compile(
    r"(?<![A-Za-z0-9_.-])(?=[A-Za-z0-9_.-]*[A-Za-z])"
    r"(?=[A-Za-z0-9_.-]*\d)[A-Za-z0-9_.-]{3,}(?![A-Za-z0-9_.-])"
)
LEXICAL_PATTERN = re.compile(r"[\u4e00-\u9fff]+|[A-Za-z0-9_.-]+")


@dataclass(frozen=True)
class Record:
    record_id: str
    release_id: str
    title: str
    body: str
    exact_terms: tuple[str, ...] = ()
    fields: dict[str, str] = field(default_factory=dict)
    allowed: bool = True


@dataclass(frozen=True)
class Match:
    record_id: str
    channels: tuple[str, ...]
    matched_terms: tuple[str, ...]


def identifiers(query: str) -> tuple[str, ...]:
    return tuple(
        dict.fromkeys(
            value.casefold().strip(".-_")
            for value in IDENTIFIER_PATTERN.findall(query)
        )
    )


def lexical_units(value: str) -> tuple[str, ...]:
    units: list[str] = []
    for run in LEXICAL_PATTERN.findall(value.casefold()):
        if all("\u4e00" <= character <= "\u9fff" for character in run):
            units.extend(
                [run] if len(run) <= 2 else [run[index : index + 2] for index in range(len(run) - 1)]
            )
        elif len(run) >= 2:
            units.append(run)
    return tuple(dict.fromkeys(units))


def search(
    query: str,
    records: list[Record],
    *,
    release_id: str,
    field_filters: dict[str, str] | None = None,
    minimum_lexical_terms: int = 2,
) -> list[Match]:
    query_identifiers = identifiers(query)
    units = lexical_units(query)
    filters = field_filters or {}
    matches: list[Match] = []

    for record in records:
        if not record.allowed or record.release_id != release_id:
            continue
        if any(record.fields.get(key) != value for key, value in filters.items()):
            continue

        searchable = " ".join(
            [record.title, record.body, *record.exact_terms, *record.fields.values()]
        ).casefold()
        exact_hits = tuple(value for value in query_identifiers if value in searchable)
        lexical_hits = tuple(value for value in units if value in searchable)
        channels: list[str] = []
        if exact_hits:
            channels.append("exact")
        if len(lexical_hits) >= minimum_lexical_terms:
            channels.append("fulltext")
        if filters:
            channels.append("structured")
        if channels:
            matches.append(
                Match(
                    record.record_id,
                    tuple(channels),
                    tuple(dict.fromkeys((*exact_hits, *lexical_hits))),
                )
            )

    return sorted(
        matches,
        key=lambda item: (
            "exact" not in item.channels,
            -len(item.matched_terms),
            item.record_id,
        ),
    )


def run_demo() -> list[Match]:
    records = [
        Record(
            "row-1",
            "release-7",
            "远程访问申请 RA-2026-0142",
            "设备完成整改后，可以重新提交远程访问申请。",
            ("ra-2026-0142", "设备合规"),
            {"状态": "已拒绝", "原因": "设备不合规"},
        ),
        Record(
            "row-hidden",
            "release-7",
            "内部处置流程",
            "仅安全管理员可查看。",
            allowed=False,
        ),
        Record(
            "row-old",
            "release-6",
            "远程访问旧版规范",
            "旧版处理方式。",
        ),
    ]
    return search(
        "RA-2026-0142 因设备不合规被拒绝后怎样处理？",
        records,
        release_id="release-7",
        field_filters={"状态": "已拒绝"},
    )


if __name__ == "__main__":
    print(run_demo())
