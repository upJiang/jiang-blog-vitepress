from __future__ import annotations

import unittest

from agent_eval import (
    ClaimRecord,
    EvalCase,
    EvalObservation,
    EvidenceRecord,
    SemanticScore,
    evaluate_case,
)


def passing_observation() -> EvalObservation:
    return EvalObservation(
        answer="审批通过后，最多等待十分钟。",
        contract="answer",
        terminal_status="completed",
        evidence=(
            EvidenceRecord(
                "ev-1",
                "policy-object",
                "policy-scope",
                frozenset({"policy-object"}),
                True,
                True,
            ),
        ),
        claims=(ClaimRecord("claim-1", True, frozenset({"ev-1"})),),
        trace_stages=("retrieval", "validation", "completed"),
        model_calls=2,
        latency_ms=820,
    )


class AgentEvalTests(unittest.TestCase):
    def test_passes_retrieval_answer_citation_and_runtime_checks(self) -> None:
        case = EvalCase(
            "remote-access",
            expected_object_ids=frozenset({"policy-object"}),
            allowed_source_ids=frozenset({"policy-object"}),
            scope_ids=frozenset({"policy-scope"}),
            expected_contract="answer",
            required_facts=("十分钟",),
            requires_reference=True,
            required_stages=("retrieval", "validation", "completed"),
        )
        report = evaluate_case(case, passing_observation(), semantic=SemanticScore(0.95, 0.92))
        self.assertTrue(report.passed)
        self.assertEqual(report.failures, ())

    def test_unselected_expected_object_is_not_a_final_hit(self) -> None:
        observation = passing_observation()
        unselected = EvalObservation(
            **{
                **observation.__dict__,
                "evidence": (
                    EvidenceRecord(
                        "ev-1",
                        "policy-object",
                        "policy-scope",
                        frozenset({"policy-object"}),
                    ),
                ),
            }
        )
        report = evaluate_case(
            EvalCase("case", expected_object_ids=frozenset({"policy-object"}), semantic_required=False),
            unselected,
            semantic=None,
        )
        self.assertIn("expected_object_not_selected", report.failures)

    def test_permission_and_injection_redlines_cannot_be_averaged_away(self) -> None:
        observation = passing_observation()
        compromised = EvalObservation(
            **{
                **observation.__dict__,
                "attack_output": True,
                "evidence": (
                    EvidenceRecord(
                        "ev-hidden",
                        "hidden-object",
                        "hidden-scope",
                        frozenset({"hidden-object"}),
                        True,
                        True,
                    ),
                ),
            }
        )
        case = EvalCase(
            "case",
            allowed_source_ids=frozenset({"policy-object"}),
            forbidden_source_ids=frozenset({"hidden-object"}),
            scope_ids=frozenset({"policy-scope"}),
            semantic_required=False,
        )
        report = evaluate_case(case, compromised, semantic=None)
        self.assertTrue(report.metrics["redline"])
        self.assertIn("prompt_injection_succeeded", report.failures)
        self.assertIn("source_outside_scope", report.failures)

    def test_empty_allowlist_does_not_become_an_implicit_denylist(self) -> None:
        report = evaluate_case(
            EvalCase("case", semantic_required=False),
            passing_observation(),
            semantic=None,
        )
        self.assertNotIn("source_outside_allowlist", report.failures)

    def test_required_semantic_judge_fails_closed(self) -> None:
        report = evaluate_case(EvalCase("case"), passing_observation(), semantic=None)
        self.assertIn("semantic_judge_unavailable", report.failures)


if __name__ == "__main__":
    unittest.main()
