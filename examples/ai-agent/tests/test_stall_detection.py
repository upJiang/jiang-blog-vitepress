from __future__ import annotations

import unittest

from stall_detection import ActionRecord, StallDetector


class StallDetectorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.detector = StallDetector()

    def test_repeated_success_without_state_change_triggers_nudge(self) -> None:
        history = [
            ActionRecord("search.web", {"query": "权限"}, "success", 1, "empty")
            for _ in range(3)
        ]
        decision = self.detector.evaluate(history)
        self.assertEqual(decision.action, "nudge")
        self.assertEqual(decision.reason, "duplicate_success_without_progress")

    def test_nudge_has_a_bound_and_escalates_to_force_stop(self) -> None:
        history = [
            ActionRecord("search.web", {"query": "权限"}, "success", 1, "empty")
            for _ in range(3)
        ]
        self.assertEqual(self.detector.evaluate(history, nudge_count=1).action, "force_stop")

    def test_repeated_errors_have_more_room_than_repeated_success(self) -> None:
        history = [
            ActionRecord(
                "search.web",
                {"query": "权限"},
                "error",
                1,
                error_class="network_timeout",
            )
            for _ in range(4)
        ]
        self.assertEqual(self.detector.evaluate(history).action, "continue")
        history.append(history[-1])
        self.assertEqual(self.detector.evaluate(history).reason, "repeated_same_error")

    def test_validation_error_short_circuits_before_generic_error_budget(self) -> None:
        history = [
            ActionRecord(
                "file.write",
                {"path": "a.md"},
                "error",
                1,
                error_class="validation_error",
            )
            for _ in range(2)
        ]
        self.assertEqual(self.detector.evaluate(history).action, "force_stop")

    def test_pagination_with_new_cursor_and_progress_is_not_a_stall(self) -> None:
        history = [
            ActionRecord(
                "search.page",
                {"query": "权限", "cursor": cursor},
                "success",
                revision,
                f"page:{cursor}",
                progress_units=10,
            )
            for revision, cursor in enumerate(["0", "10", "20", "30", "40"], start=1)
        ]
        self.assertEqual(self.detector.evaluate(history).action, "continue")

    def test_tool_family_without_progress_detects_parameter_churn(self) -> None:
        history = [
            ActionRecord(
                "search.web",
                {"query": f"权限 {index}"},
                "success",
                1,
                "empty",
            )
            for index in range(5)
        ]
        self.assertEqual(self.detector.evaluate(history).reason, "tool_family_without_progress")

    def test_same_call_with_new_state_revision_is_legitimate(self) -> None:
        history = [
            ActionRecord("poll.job", {"id": "job:1"}, "success", revision, f"{revision}")
            for revision in range(1, 4)
        ]
        self.assertEqual(self.detector.evaluate(history).action, "continue")


if __name__ == "__main__":
    unittest.main()
