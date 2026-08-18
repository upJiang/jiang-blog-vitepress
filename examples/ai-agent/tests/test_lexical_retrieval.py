from __future__ import annotations

import unittest

from lexical_retrieval import Record, identifiers, lexical_units, run_demo, search


class LexicalRetrievalTests(unittest.TestCase):
    def test_identifier_keeps_business_key_intact(self) -> None:
        self.assertEqual(identifiers("查询 RA-2026-0142 和普通文本"), ("ra-2026-0142",))
        self.assertNotIn("2026", lexical_units("RA-2026-0142"))

    def test_demo_combines_channels_without_leaking_release_or_acl(self) -> None:
        matches = run_demo()

        self.assertEqual([item.record_id for item in matches], ["row-1"])
        self.assertEqual(matches[0].channels, ("exact", "fulltext", "structured"))

    def test_fulltext_requires_multiple_terms(self) -> None:
        records = [Record("row-1", "release-7", "登录说明", "登录失败后刷新凭证。")]

        self.assertEqual(search("登录", records, release_id="release-7"), [])
        self.assertEqual(
            [item.record_id for item in search("登录失败", records, release_id="release-7")],
            ["row-1"],
        )

    def test_structured_filter_is_not_fuzzy_text(self) -> None:
        records = [
            Record("denied", "release-7", "远程访问", "申请记录", fields={"状态": "已拒绝"}),
            Record("approved", "release-7", "远程访问", "申请记录", fields={"状态": "已通过"}),
        ]

        result = search(
            "远程访问申请",
            records,
            release_id="release-7",
            field_filters={"状态": "已拒绝"},
        )
        self.assertEqual([item.record_id for item in result], ["denied"])


if __name__ == "__main__":
    unittest.main()
