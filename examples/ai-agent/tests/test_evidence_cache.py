from __future__ import annotations

import asyncio
import unittest

from evidence_cache import (
    Candidate,
    SingleflightEvidenceCache,
    build_cache_key,
    select_evidence,
)


def candidate(
    chunk_id: str,
    document_id: str,
    dimensions: set[str],
    token_cost: int,
    score: float,
) -> Candidate:
    return Candidate(
        chunk_id=chunk_id,
        document_id=document_id,
        source_version_id="release-v3",
        text=chunk_id,
        dimensions=frozenset(dimensions),
        visible_subjects=frozenset({"team-a"}),
        token_cost=token_cost,
        score=score,
    )


class EvidenceSelectionTests(unittest.TestCase):
    def test_selection_prefers_new_coverage_over_repeated_high_score(self) -> None:
        values = [
            candidate("rule-summary", "policy", {"condition"}, 80, 0.98),
            candidate("rule-copy", "policy", {"condition"}, 70, 0.96),
            candidate("approval", "workflow", {"approver"}, 90, 0.72),
            candidate("exception", "exceptions", {"exception"}, 100, 0.68),
        ]

        result = select_evidence(
            values,
            required_dimensions={"condition", "approver", "exception"},
            token_budget=280,
        )

        self.assertEqual(
            [item.chunk_id for item in result.items],
            ["rule-summary", "approval", "exception"],
        )
        self.assertEqual(result.missing_dimensions, frozenset())
        self.assertEqual(result.used_tokens, 270)

    def test_cache_key_changes_with_release_identity_scope_and_recipe(self) -> None:
        base = dict(
            dataset_id="kb-1",
            release_id="release-v3",
            query="远程   访问 条件",
            subject_ids=["team-a", "user-7"],
            scope_ids=["folder-policy"],
            recipe="hybrid-v2",
        )
        first = build_cache_key(**base)
        reordered = build_cache_key(
            **{**base, "subject_ids": ["user-7", "team-a"]}
        )
        changed_release = build_cache_key(**{**base, "release_id": "release-v4"})

        self.assertEqual(first, reordered)
        self.assertNotEqual(first, changed_release)


class SingleflightTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_misses_share_loader_and_hits_recheck_visibility(self) -> None:
        cache = SingleflightEvidenceCache()
        calls = 0
        value = candidate("rule-summary", "policy", {"condition"}, 80, 0.98)

        async def loader() -> list[Candidate]:
            nonlocal calls
            calls += 1
            await asyncio.sleep(0)
            return [value]

        first, second = await asyncio.gather(
            cache.get_or_load("key", loader=loader, can_read=lambda _item: True),
            cache.get_or_load("key", loader=loader, can_read=lambda _item: True),
        )
        revoked = await cache.get_or_load(
            "key", loader=loader, can_read=lambda _item: False
        )

        self.assertEqual(calls, 1)
        self.assertEqual(first, [value])
        self.assertEqual(second, [value])
        self.assertEqual(revoked, [])


if __name__ == "__main__":
    unittest.main()
