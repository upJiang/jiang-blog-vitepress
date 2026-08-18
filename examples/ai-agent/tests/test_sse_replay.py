from __future__ import annotations

import unittest

from sse_replay import ClientProjection, Event, EventLog, encode_sse, events_ready


class SseReplayTests(unittest.TestCase):
    def test_sequences_are_monotonic_and_replay_is_cursor_exclusive(self) -> None:
        log = EventLog()
        log.append("turn.created", {})
        log.append("answer.delta", {"content": "前半"})
        log.append("references.ready", {"ids": ["evidence:1"]})

        self.assertEqual([event.sequence for event in log.events], [1, 2, 3])
        self.assertEqual([event.sequence for event in log.replay(1)], [2, 3])

    def test_batch_reserves_a_contiguous_range(self) -> None:
        log = EventLog()
        log.append("turn.created", {})
        batch = log.append_batch(
            [
                ("answer.delta", {"content": "A"}),
                ("answer.delta", {"content": "B"}),
                ("references.ready", {"ids": []}),
            ]
        )
        self.assertEqual([event.sequence for event in batch], [2, 3, 4])

    def test_terminal_event_is_idempotent_and_unique(self) -> None:
        log = EventLog()
        completed = log.append("turn.completed", {"answer": "完成"})
        late_cancel = log.append("turn.cancelled", {})
        self.assertIs(late_cancel, completed)
        self.assertEqual(len(log.events), 1)

    def test_notification_loss_does_not_remove_persisted_events(self) -> None:
        log = EventLog()
        log.append("turn.created", {})
        log.append("answer.delta", {"content": "内容"})
        self.assertEqual([event.sequence for event in events_ready(log, 0, None)], [1, 2])

    def test_stale_notification_does_not_repeat_events(self) -> None:
        log = EventLog()
        log.append("turn.created", {})
        self.assertEqual(events_ready(log, 1, 1), [])

    def test_client_ignores_duplicates_and_detects_gaps(self) -> None:
        client = ClientProjection()
        first = Event(1, "answer.delta", {"content": "A"})
        third = Event(3, "answer.delta", {"content": "C"})
        self.assertEqual(client.apply(first), "applied")
        self.assertEqual(client.apply(first), "duplicate")
        self.assertEqual(client.apply(third), "gap")
        self.assertEqual(client.answer, "A")

    def test_answer_replacement_and_terminal_update_projection(self) -> None:
        client = ClientProjection()
        client.apply(Event(1, "answer.delta", {"content": "草稿"}))
        client.apply(Event(2, "answer.replaced", {"content": "验证后的答案"}))
        client.apply(Event(3, "turn.completed", {}))
        self.assertEqual(client.answer, "验证后的答案")
        self.assertEqual(client.status, "completed")

    def test_encoding_preserves_chinese_json_and_frame_separator(self) -> None:
        encoded = encode_sse(Event(7, "answer.delta", {"content": "结论"})).decode()
        self.assertEqual(
            encoded,
            'id: 7\nevent: answer.delta\ndata: {"content":"结论"}\n\n',
        )

    def test_negative_cursor_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "cursor"):
            EventLog().replay(-1)


if __name__ == "__main__":
    unittest.main()
