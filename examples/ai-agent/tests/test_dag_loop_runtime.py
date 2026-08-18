from __future__ import annotations

import unittest

from dag_loop_runtime import Decision, ScriptedModel, run_hybrid_runtime


class DagLoopRuntimeTests(unittest.TestCase):
    def test_deterministic_input_rejection_does_not_call_the_model(self) -> None:
        model = ScriptedModel([])
        with self.assertRaisesRegex(ValueError, "question_required"):
            run_hybrid_runtime("", frozenset({"guide"}), model)
        self.assertEqual(model.calls, 0)

    def test_empty_scope_stops_in_the_outer_shell(self) -> None:
        model = ScriptedModel([Decision("answer", answer="guess")])
        result = run_hybrid_runtime("问题", frozenset(), model)
        self.assertEqual(result.stop_reason, "scope_empty")
        self.assertEqual(model.calls, 0)

    def test_observation_can_choose_the_next_runtime_action(self) -> None:
        model = ScriptedModel(
            [Decision("search", query="guide"), Decision("answer", answer="审批后生效")]
        )
        result = run_hybrid_runtime("问题", frozenset({"guide"}), model)
        self.assertEqual(result.stop_reason, "completed")
        self.assertEqual(result.observations, ["evidence:guide"])
        self.assertEqual(model.calls, 2)

    def test_model_cannot_expand_the_deterministic_scope(self) -> None:
        model = ScriptedModel([Decision("search", query="admin-guide")])
        result = run_hybrid_runtime("问题", frozenset({"employee-guide"}), model)
        self.assertEqual(result.stop_reason, "source_outside_scope")

    def test_iteration_limit_is_a_failure_boundary_not_completion(self) -> None:
        model = ScriptedModel([Decision("search", query="guide")] * 5)
        result = run_hybrid_runtime("问题", frozenset({"guide"}), model)
        self.assertEqual(result.stop_reason, "iteration_limit")
        self.assertEqual(result.answer, "")


if __name__ == "__main__":
    unittest.main()
