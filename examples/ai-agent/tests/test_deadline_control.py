from __future__ import annotations

import unittest

from deadline_control import DeadlineRuntime, ManualClock, TurnStore


class DeadlineControlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.clock = ManualClock(100)
        self.store = TurnStore()
        self.runtime = DeadlineRuntime(self.store, self.clock)

    def test_stage_budget_uses_the_smaller_remaining_limit(self) -> None:
        turn = self.runtime.create("turn:1", total_seconds=10)
        self.assertEqual(
            self.runtime.stage_budget(turn, stage_limit=30, cleanup_reserve=2),
            8,
        )

    def test_stage_timeout_does_not_write_a_success_checkpoint(self) -> None:
        self.runtime.create("turn:2", total_seconds=5)
        turn = self.runtime.run_stage(
            "turn:2",
            "retrieved",
            duration=5,
            stage_limit=10,
        )
        self.assertEqual(turn.status, "expired")
        self.assertEqual(turn.checkpoints, [])

    def test_resume_keeps_the_original_absolute_deadline(self) -> None:
        turn = self.runtime.create("turn:3", total_seconds=10)
        original_deadline = turn.deadline_at
        self.runtime.run_stage("turn:3", "planned", duration=2, stage_limit=4)
        self.clock.advance(9)
        resumed = self.runtime.resume("turn:3")
        self.assertEqual(resumed.deadline_at, original_deadline)
        self.assertEqual(resumed.status, "expired")

    def test_pending_cancel_is_terminal_without_running_work(self) -> None:
        self.runtime.create("turn:4", total_seconds=10)
        turn = self.runtime.request_cancel("turn:4")
        self.assertEqual(turn.status, "cancelled")
        self.assertEqual(turn.checkpoints, [])

    def test_running_cancel_stops_at_the_next_safe_point(self) -> None:
        self.runtime.create("turn:5", total_seconds=10)
        self.runtime.run_stage("turn:5", "planned", duration=1, stage_limit=3)
        self.runtime.request_cancel("turn:5")
        with self.assertRaisesRegex(RuntimeError, "cancelled_at_safe_point"):
            self.runtime.run_stage("turn:5", "retrieved", duration=1, stage_limit=3)
        self.assertEqual(self.store.load("turn:5").checkpoints, ["planned"])

    def test_cleanup_failure_does_not_replace_the_primary_terminal_status(self) -> None:
        self.runtime.create("turn:6", total_seconds=10)
        self.runtime.run_stage("turn:6", "planned", duration=1, stage_limit=3)
        self.runtime.finish("turn:6")
        cleaned = self.runtime.cleanup("turn:6", fail=True)
        self.assertEqual(cleaned.status, "completed")
        self.assertEqual(cleaned.cleanup_errors, ["resource_release_failed"])


if __name__ == "__main__":
    unittest.main()
