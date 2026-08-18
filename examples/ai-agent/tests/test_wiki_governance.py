from __future__ import annotations

import unittest

from wiki_governance import AliasConflict, AliasRegistry, normalize_alias, run_demo


class WikiGovernanceTests(unittest.TestCase):
    def test_alias_normalization_handles_width_spacing_and_punctuation(self) -> None:
        self.assertEqual(normalize_alias("ＡＩ ６６ 活动"), "ai66活动")
        self.assertEqual(normalize_alias("AI-66【活动】"), "ai66活动")

    def test_alias_conflict_does_not_use_latest_write_wins(self) -> None:
        registry = AliasRegistry()
        registry.bind("六六活动", "policy-66")

        with self.assertRaises(AliasConflict):
            registry.bind("六六活动", "project-66")

    def test_locked_fields_and_release_snapshot_survive_regeneration(self) -> None:
        result = run_demo()

        self.assertEqual(
            result,
            {
                "resolved": ["policy-66"],
                "current_summary": "验收前先核对发布范围。",
                "released_version": "version-7",
                "released_summary": "验收前先核对发布范围。",
            },
        )


if __name__ == "__main__":
    unittest.main()
