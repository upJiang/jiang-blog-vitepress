from __future__ import annotations

import unittest

from runtime_control import RuntimeController, ScriptedDelivery


class RuntimeControlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.controller = RuntimeController("run:1", "message:1")

    def test_acceptance_does_not_commit_the_message(self) -> None:
        result = self.controller.accept("message:2", "补充问题")
        self.assertEqual(result, "accepted")
        self.assertEqual(self.controller.messages["message:2"].status, "accepted")
        self.assertEqual(self.controller.state.transcript, [])

    def test_decision_boundary_commits_before_the_next_action(self) -> None:
        self.controller.accept("message:2", "补充权限范围")
        committed = self.controller.commit_at_decision_boundary()
        self.assertEqual(committed, ["message:2"])
        self.assertEqual(self.controller.state.latest_user_text, "补充权限范围")
        self.assertEqual(self.controller.state.current_reply_to, "message:2")

    def test_withdraw_only_removes_an_uncommitted_message(self) -> None:
        self.controller.accept("message:2", "撤回内容")
        self.assertTrue(self.controller.withdraw("message:2"))
        self.assertEqual(self.controller.commit_at_decision_boundary(), [])
        self.controller.accept("message:3", "已经提交")
        self.controller.commit_at_decision_boundary()
        self.assertFalse(self.controller.withdraw("message:3"))

    def test_final_drain_either_commits_or_closes_the_route(self) -> None:
        self.controller.accept("message:2", "最后一刻到达")
        self.assertEqual(self.controller.final_drain(), "continue")
        self.assertEqual(self.controller.messages["message:2"].status, "committed")
        self.assertEqual(self.controller.final_drain(), "completed")
        self.assertEqual(
            self.controller.accept("message:3", "关闭后到达"),
            "start_new_run",
        )

    def test_cancel_is_checked_outside_the_prompt(self) -> None:
        self.controller.request_cancel()
        with self.assertRaisesRegex(RuntimeError, "run_cancelled"):
            self.controller.ensure_running()

    def test_delivery_ack_is_written_only_after_success(self) -> None:
        self.controller.accept("message:2", "补充问题")
        self.controller.commit_at_decision_boundary()
        delivery = ScriptedDelivery(failures=1)
        self.assertFalse(
            self.controller.deliver_reply("message:2", "第一次回答", delivery)
        )
        self.assertFalse(self.controller.messages["message:2"].acknowledged)
        self.assertTrue(
            self.controller.deliver_reply("message:2", "第一次回答", delivery)
        )
        self.assertTrue(self.controller.messages["message:2"].acknowledged)
        self.assertEqual(delivery.sent, [("message:2", "第一次回答")])

    def test_each_reply_uses_the_committed_message_address(self) -> None:
        self.controller.accept("message:2", "问题二")
        self.controller.commit_at_decision_boundary()
        delivery = ScriptedDelivery()
        self.controller.deliver_reply("message:2", "回答二", delivery)
        self.controller.accept("message:3", "问题三")
        self.controller.commit_at_decision_boundary()
        self.controller.deliver_reply("message:3", "回答三", delivery)
        self.assertEqual(
            delivery.sent,
            [("message:2", "回答二"), ("message:3", "回答三")],
        )


if __name__ == "__main__":
    unittest.main()
