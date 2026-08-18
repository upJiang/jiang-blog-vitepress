from __future__ import annotations

import unittest

from claim_evidence import Claim, Evidence, citations_for_answer, run_demo, validate_claims


class ClaimEvidenceTests(unittest.TestCase):
    def test_demo_blocks_hidden_claim_and_cites_delivered_claim(self) -> None:
        issues, citations = run_demo()

        self.assertEqual(issues, {"claim-2": ("hidden_evidence:hidden",)})
        self.assertEqual(
            [(item.claim_id, item.evidence_id) for item in citations],
            [("claim-1", "policy")],
        )

    def test_wrong_release_cannot_support_claim(self) -> None:
        issues = validate_claims(
            [Claim("claim", "规则为旧值。", ("old",), "supported")],
            [Evidence("old", "release-6", "规则为旧值。", "policy.md#rule")],
            release_id="release-7",
        )
        self.assertEqual(issues, {"claim": ("wrong_release:old",)})

    def test_structured_fields_can_support_equivalent_claim(self) -> None:
        claim = Claim("claim", "状态：已拒绝；原因：设备不合规", ("row",), "supported")
        evidence = Evidence(
            "row",
            "release-7",
            "申请记录",
            "requests.csv#row-14",
            fields=(("状态", "已拒绝"), ("原因", "设备不合规")),
        )
        self.assertEqual(validate_claims([claim], [evidence], release_id="release-7"), {})

    def test_omitted_claim_does_not_create_citation(self) -> None:
        claims = [Claim("claim", "缓存有效期是 15 分钟。", ("faq",), "supported")]
        evidence = [Evidence("faq", "release-7", "缓存有效期是 15 分钟。", "faq.md#cache")]

        self.assertEqual(
            citations_for_answer("这里只回答其他内容。", claims, evidence, release_id="release-7"),
            [],
        )


if __name__ == "__main__":
    unittest.main()
