from __future__ import annotations

import unittest

from temporal_workflow import (
    ActivityLedger,
    HistoryEvent,
    continue_as_new,
    handle_signal,
    replay,
    run_next_step,
)


class TemporalWorkflowTests(unittest.TestCase):
    def test_same_history_replays_to_the_same_state(self) -> None:
        history = [
            HistoryEvent("workflow.started", {}),
            HistoryEvent("approval.waiting", {}),
            HistoryEvent("approval.accepted", {}),
            HistoryEvent("activity.completed", {"result": "evidence:1"}),
        ]
        first = replay(history)
        second = replay(history)
        self.assertEqual(first, second)
        self.assertEqual(first.activity_result, "evidence:1")

    def test_activity_result_is_reused_after_worker_restart(self) -> None:
        history = [
            HistoryEvent("workflow.started", {}),
            HistoryEvent("approval.waiting", {}),
            HistoryEvent("approval.accepted", {}),
        ]
        ledger = ActivityLedger()
        self.assertEqual(run_next_step(history, ledger), "ready_to_complete")
        self.assertEqual(run_next_step(history, ledger), "completed")
        self.assertEqual(ledger.effect_count, 1)

        replayed = replay(history)
        self.assertEqual(replayed.status, "completed")
        self.assertEqual(ledger.execute_once("turn:1:retrieve", "other"), "evidence:1")
        self.assertEqual(ledger.effect_count, 1)

    def test_cancel_signal_stops_before_activity(self) -> None:
        history = [
            HistoryEvent("workflow.started", {}),
            HistoryEvent("approval.waiting", {}),
        ]
        handle_signal(history, "cancel")
        ledger = ActivityLedger()
        self.assertEqual(run_next_step(history, ledger), "cancelled")
        self.assertEqual(ledger.effect_count, 0)
        self.assertEqual(replay(history).status, "cancelled")

    def test_approval_signal_allows_the_next_activity(self) -> None:
        history: list[HistoryEvent] = []
        ledger = ActivityLedger()
        self.assertEqual(run_next_step(history, ledger), "waiting_approval")
        handle_signal(history, "approve")
        self.assertEqual(run_next_step(history, ledger), "ready_to_complete")
        self.assertEqual(replay(history).activity_result, "evidence:1")

    def test_continue_as_new_keeps_only_explicit_carry_state(self) -> None:
        history = [
            HistoryEvent("workflow.started", {}),
            HistoryEvent("approval.waiting", {}),
            HistoryEvent("approval.accepted", {}),
        ]
        continue_as_new(history, "retrieving")
        self.assertEqual(len(history), 1)
        self.assertEqual(replay(history).phase, "retrieving")

    def test_terminal_history_does_not_move_back_to_running(self) -> None:
        history = [HistoryEvent("workflow.completed", {})]
        ledger = ActivityLedger()
        self.assertEqual(run_next_step(history, ledger), "completed")
        self.assertEqual(ledger.effect_count, 0)


if __name__ == "__main__":
    unittest.main()
