from __future__ import annotations

import unittest

from watchdog import PhaseTracker, Progress, StageWatchdog


class StageWatchdogTests(unittest.TestCase):
    def setUp(self) -> None:
        self.watchdog = StageWatchdog(soft_idle=10, hard_idle=30, stream_gap=5)

    def test_soft_idle_is_reported_once_per_phase_revision(self) -> None:
        progress = Progress("awaiting_model", 11, 0, 100, turn_id="turn:1")
        self.assertEqual(self.watchdog.evaluate(progress).action, "soft_alert")
        self.assertEqual(self.watchdog.evaluate(progress).action, "continue")
        progress.phase_revision = 2
        self.assertEqual(self.watchdog.evaluate(progress).action, "soft_alert")

    def test_hard_idle_cancels_only_a_model_owned_wait(self) -> None:
        model = Progress("awaiting_model", 31, 0, 100)
        tool = Progress("executing_tool", 31, 0, 100)
        self.assertEqual(self.watchdog.evaluate(model).action, "hard_cancel")
        self.assertEqual(self.watchdog.evaluate(tool).action, "delegate")
        self.assertEqual(self.watchdog.evaluate(tool).owner, "tool_timeout")

    def test_stream_gap_uses_the_last_chunk_instead_of_phase_start(self) -> None:
        active = Progress(
            "streaming_model",
            20,
            0,
            100,
            last_stream_chunk_at=18,
        )
        stalled = Progress(
            "streaming_model",
            20,
            0,
            100,
            last_stream_chunk_at=14,
        )
        self.assertEqual(self.watchdog.evaluate(active).action, "continue")
        self.assertEqual(self.watchdog.evaluate(stalled).action, "stream_cancel")

    def test_invalid_tracker_disables_stage_based_actions(self) -> None:
        progress = Progress("awaiting_model", 50, 0, 100, tracker_valid=False)
        decision = self.watchdog.evaluate(progress)
        self.assertEqual(decision.action, "watchdog_disabled")
        self.assertEqual(decision.owner, "operator")

    def test_nested_model_call_borrows_and_restores_phase_ownership(self) -> None:
        tracker = PhaseTracker("compacting")
        token = tracker.enter_transient("awaiting_model")
        self.assertEqual(tracker.phase, "awaiting_model")
        tracker.restore(token)
        tracker.restore(token)
        self.assertEqual(tracker.phase, "compacting")
        self.assertTrue(tracker.valid)

    def test_overlapping_transient_phases_invalidate_the_tracker(self) -> None:
        tracker = PhaseTracker("compacting")
        tracker.enter_transient("awaiting_model")
        tracker.enter_transient("streaming_model")
        self.assertFalse(tracker.valid)

    def test_deadline_has_priority_over_stage_idle(self) -> None:
        progress = Progress("executing_tool", 100, 99, 100)
        self.assertEqual(self.watchdog.evaluate(progress).action, "deadline_expired")


if __name__ == "__main__":
    unittest.main()
