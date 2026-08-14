from __future__ import annotations

import unittest

from agent_loop import ScriptedModel, run_agent
from context_budget import ContextPart, assemble
from contracts import AuthContext, authorize_search, parse_search_arguments
from evidence import Claim, Evidence, validate_claim
from model_gateway import FakeModel, answer_once
from openai_responses import create_response
from runtime import Turn, TurnStore


class ExampleTests(unittest.TestCase):
    def test_openai_adapter_passes_model_and_input(self) -> None:
        class FakeResponses:
            def __init__(self) -> None:
                self.arguments: dict[str, object] = {}

            def create(self, **kwargs: object) -> object:
                self.arguments = kwargs
                return object()

        import os

        previous = os.environ.get("OPENAI_MODEL")
        os.environ["OPENAI_MODEL"] = "test-model"
        try:
            client = FakeResponses()
            create_response(client, "什么是 Agent？")
            self.assertEqual(client.arguments["model"], "test-model")
            self.assertEqual(client.arguments["input"], "什么是 Agent？")
        finally:
            if previous is None:
                os.environ.pop("OPENAI_MODEL", None)
            else:
                os.environ["OPENAI_MODEL"] = previous

    def test_model_gateway_rejects_empty_question(self) -> None:
        with self.assertRaises(ValueError):
            answer_once(FakeModel(), " ")

    def test_agent_loop_reaches_final_answer(self) -> None:
        state, answer = run_agent(
            ScriptedModel(),
            {"search_notes": lambda arguments: f"找到 {arguments['limit']} 条记录"},
            "远程访问需要什么权限？",
        )
        self.assertEqual(state.status, "completed")
        self.assertEqual(state.steps, 2)
        self.assertIn("找到 2 条记录", answer)

    def test_model_cannot_supply_trusted_scope(self) -> None:
        with self.assertRaisesRegex(ValueError, "untrusted_fields"):
            parse_search_arguments({"query": "访问权限", "scope_ids": ["other"]})
        arguments = parse_search_arguments({"query": "访问权限", "limit": 3})
        command = authorize_search(arguments, AuthContext("u-1", ("team-a",), "r-4"))
        self.assertEqual(command.scope_ids, ("team-a",))

    def test_context_assembly_keeps_high_priority_parts(self) -> None:
        parts = [
            ContextPart("policy", "只能使用可见证据", 100),
            ContextPart("evidence", "账号当前状态为停用", 90),
            ContextPart("old_history", "很久以前的一段闲聊" * 20, 10),
        ]
        self.assertEqual([part.name for part in assemble(parts, 40)], ["policy", "evidence"])

    def test_hidden_evidence_cannot_support_public_answer(self) -> None:
        claim = Claim("账号已停用", ("e-1",), "supported")
        self.assertEqual(
            validate_claim(claim, [Evidence("e-1", "内部记录", False)]),
            ["hidden_evidence:e-1"],
        )

    def test_turn_creation_is_idempotent_and_events_replay(self) -> None:
        store = TurnStore()
        first = store.create(Turn("t-1", "request-1", "release-2", "policy-3"))
        second = store.create(Turn("t-2", "request-1", "release-9", "policy-9"))
        self.assertIs(first, second)
        first.append("turn.started", {})
        first.append("turn.completed", {"answer": "ok"})
        self.assertEqual([event.sequence for event in first.replay_after(1)], [2])


if __name__ == "__main__":
    unittest.main()
