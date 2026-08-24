from __future__ import annotations

import unittest

from agent_loop import (
    AgentState,
    CompletionCheck,
    Finish,
    Observation,
    RequestApproval,
    ScriptedModel,
    ToolCall,
    ToolResult,
    run_agent,
)


def successful_fact(action: str, field: str, value: str) -> Observation:
    return Observation(action, "success", ((field, value),))


def remote_access_completion(
    state: AgentState,
    _finish: Finish,
) -> CompletionCheck:
    facts: dict[tuple[str, str], str] = {}
    for observation in state.observations:
        if observation.status != "success":
            continue
        for field, value in observation.data:
            facts[(observation.action, field)] = value

    requirements = {
        "device_status.compliance": facts.get(("device_status", "compliance"))
        == "compliant",
        "resubmit_request.result": facts.get(("resubmit_request", "result"))
        == "accepted",
        "request_status.status": facts.get(("request_status", "status"))
        == "active",
    }
    missing = tuple(name for name, satisfied in requirements.items() if not satisfied)
    return CompletionCheck(not missing, missing)


def never_complete(_state: AgentState, _finish: Finish) -> CompletionCheck:
    return CompletionCheck(False, ("test_evidence",))


class AgentLoopTests(unittest.TestCase):
    def test_tool_observation_is_visible_to_the_next_decision(self) -> None:
        model = ScriptedModel(
            [
                ToolCall("request_status"),
                Finish("申请当前处于 active 状态。"),
            ]
        )
        initial = AgentState(
            "读取当前申请状态",
            observations=(
                successful_fact("device_status", "compliance", "compliant"),
                successful_fact("resubmit_request", "result", "accepted"),
            ),
        )

        state = run_agent(
            model,
            {
                "request_status": lambda _arguments: ToolResult(
                    "success", (("status", "active"),)
                )
            },
            initial,
            remote_access_completion,
        )

        self.assertEqual(state.status, "completed")
        self.assertEqual(model.calls, 2)
        self.assertEqual(
            model.inputs[1].observations[-1],
            successful_fact("request_status", "status", "active"),
        )

    def test_premature_finish_becomes_an_observation_before_completion(self) -> None:
        model = ScriptedModel(
            [
                Finish("申请已经恢复。"),
                ToolCall("request_status"),
                Finish("申请已经恢复。"),
            ]
        )
        initial = AgentState(
            "确认重新提交后的申请状态",
            observations=(
                successful_fact("device_status", "compliance", "compliant"),
                successful_fact("resubmit_request", "result", "accepted"),
            ),
        )

        state = run_agent(
            model,
            {
                "request_status": lambda _arguments: ToolResult(
                    "success", (("status", "active"),)
                )
            },
            initial,
            remote_access_completion,
        )

        self.assertEqual(state.status, "completed")
        self.assertEqual(model.calls, 3)
        self.assertEqual(state.steps, 3)
        self.assertEqual(state.observations[2].status, "completion_rejected")
        self.assertEqual(
            dict(state.observations[2].data),
            {"missing_evidence": "request_status.status"},
        )
        self.assertEqual(
            model.inputs[1].observations[-1],
            state.observations[2],
        )
        self.assertEqual(
            model.inputs[2].observations[-1],
            successful_fact("request_status", "status", "active"),
        )
        self.assertEqual(
            state.observations[3],
            successful_fact("request_status", "status", "active"),
        )
        self.assertEqual(state.final_answer, "申请已经恢复。")

    def test_request_approval_pauses_without_running_the_write(self) -> None:
        tool_calls = 0

        def resubmit(
            _arguments: tuple[tuple[str, str | int | bool], ...],
        ) -> ToolResult:
            nonlocal tool_calls
            tool_calls += 1
            return ToolResult("success", (("result", "accepted"),))

        proposal = RequestApproval(
            "resubmit_request",
            (("reason", "设备当前已合规"),),
        )
        state = run_agent(
            ScriptedModel([proposal]),
            {"resubmit_request": resubmit},
            AgentState("条件满足时重新提交"),
            never_complete,
            approval_actions=frozenset({"resubmit_request"}),
        )

        self.assertEqual(state.status, "waiting_approval")
        self.assertEqual(state.pending_approval, proposal)
        self.assertEqual(state.stop_reason, "approval_required")
        self.assertEqual(tool_calls, 0)

    def test_tool_call_cannot_bypass_an_approval_boundary(self) -> None:
        call = ToolCall("resubmit_request", (("reason", "设备当前已合规"),))

        state = run_agent(
            ScriptedModel([call]),
            {},
            AgentState("条件满足时重新提交"),
            never_complete,
            approval_actions=frozenset({"resubmit_request"}),
        )

        self.assertEqual(state.status, "waiting_approval")
        self.assertEqual(
            state.pending_approval,
            RequestApproval(call.name, call.arguments),
        )

    def test_unknown_tool_and_duplicate_arguments_are_denied_observations(self) -> None:
        for decision, error in (
            (ToolCall("missing_tool"), "tool_not_available"),
            (
                ToolCall("request_status", (("scope", "a"), ("scope", "b"))),
                "duplicate_argument",
            ),
        ):
            with self.subTest(error=error):
                state = run_agent(
                    ScriptedModel([decision]),
                    {"request_status": lambda _arguments: ToolResult("success")},
                    AgentState("读取状态"),
                    never_complete,
                    max_steps=1,
                )
                self.assertEqual(state.status, "exhausted")
                self.assertEqual(state.observations[-1].status, "denied")
                self.assertEqual(state.observations[-1].error, error)

    def test_timeout_is_distinct_from_an_empty_result(self) -> None:
        def timeout(
            _arguments: tuple[tuple[str, str | int | bool], ...],
        ) -> ToolResult:
            raise TimeoutError("teaching timeout")

        state = run_agent(
            ScriptedModel([ToolCall("request_status")]),
            {"request_status": timeout},
            AgentState("读取状态"),
            never_complete,
            max_steps=1,
        )

        self.assertEqual(state.status, "exhausted")
        self.assertEqual(state.observations[-1].status, "timeout")
        self.assertEqual(state.observations[-1].error, "tool_timeout")

    def test_step_limit_keeps_the_observation_trace(self) -> None:
        model = ScriptedModel([ToolCall("search"), ToolCall("search")])

        state = run_agent(
            model,
            {"search": lambda _arguments: ToolResult("empty")},
            AgentState("查找证据"),
            never_complete,
            max_steps=2,
        )

        self.assertEqual(state.status, "exhausted")
        self.assertEqual(state.stop_reason, "step_limit_reached")
        self.assertEqual(state.steps, 2)
        self.assertEqual(
            [observation.status for observation in state.observations],
            ["empty", "empty"],
        )

    def test_unexpected_tool_failure_has_an_explicit_terminal_reason(self) -> None:
        def fail(
            _arguments: tuple[tuple[str, str | int | bool], ...],
        ) -> ToolResult:
            raise OSError("teaching failure")

        state = run_agent(
            ScriptedModel([ToolCall("request_status")]),
            {"request_status": fail},
            AgentState("读取状态"),
            never_complete,
        )

        self.assertEqual(state.status, "failed")
        self.assertEqual(state.stop_reason, "tool_execution_failed:OSError")

    def test_terminal_state_does_not_call_the_model_again(self) -> None:
        model = ScriptedModel([Finish("不应被调用")])
        completed = AgentState(
            "已完成任务",
            status="completed",
            stop_reason="completion_verified",
            final_answer="已有答案",
        )

        state = run_agent(model, {}, completed, never_complete)

        self.assertIs(state, completed)
        self.assertEqual(model.calls, 0)


if __name__ == "__main__":
    unittest.main()
