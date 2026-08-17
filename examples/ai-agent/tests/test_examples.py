from __future__ import annotations

import unittest
from pathlib import Path

from agent_loop import ScriptedModel, run_agent
from context_budget import ContextPart, assemble
from contracts import AuthContext, authorize_search, parse_search_arguments
from evidence import Claim, Evidence, validate_claim
from model_gateway import FakeModel, answer_once
from openai_responses import create_response
from harness import Action, Capability, authorize_action
from memory_store import Memory, MemoryStore
from rag_pipeline import Block, Chunk, chunk_blocks, dense_search, reciprocal_rank_fusion
from runtime import Turn, TurnStore
from tool_runtime import ToolCall, execute_parallel
from watchdog import Progress, watchdog_decision


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

    def test_parallel_tool_results_keep_call_identity_and_request_order(self) -> None:
        calls = [
            ToolCall("c-1", "lookup", {"value": "first"}),
            ToolCall("c-2", "lookup", {"value": "second"}),
        ]
        results = execute_parallel(calls, {"lookup": lambda args: str(args["value"])})
        self.assertEqual([result.call_id for result in results], ["c-1", "c-2"])
        self.assertEqual([result.output for result in results], ["first", "second"])

    def test_memory_recall_enforces_owner_and_forget_is_versioned(self) -> None:
        store = MemoryStore()
        store.put(Memory("m-1", "u-1", "Python 项目使用 uv", "turn-1"))
        self.assertEqual([item.memory_id for item in store.recall("u-1", "Python")], ["m-1"])
        self.assertEqual(store.recall("u-2", "Python"), [])
        forgotten = store.forget("u-1", "m-1")
        self.assertFalse(forgotten.active)
        self.assertEqual(forgotten.revision, 2)

    def test_chunk_identity_scope_filter_and_fusion(self) -> None:
        blocks = [
            Block("heading", "权限策略", ("安全",), 0),
            Block("paragraph", "下载前必须重新检查资源范围。", ("安全",), 1),
            Block("paragraph", "Release 决定知识版本。", ("版本",), 2),
        ]
        chunks = chunk_blocks("doc-1", blocks, target_chars=40)
        self.assertEqual(len(chunks), 2)
        vectors = [
            Chunk(chunks[0].chunk_id, "doc-1", chunks[0].text, chunks[0].section_path, 0, (1.0, 0.0)),
            Chunk("hidden", "doc-2", "不可见", (), 0, (1.0, 0.0)),
        ]
        self.assertEqual(dense_search((1.0, 0.0), vectors, scope={"doc-1"}, limit=5), [chunks[0].chunk_id])
        self.assertEqual(reciprocal_rank_fusion([["a", "b"], ["b", "c"]])[0], "b")

    def test_watchdog_distinguishes_deadline_idle_and_stall(self) -> None:
        self.assertEqual(watchdog_decision(Progress("tool", 10, 9, 10)), "cancel_deadline")
        self.assertEqual(watchdog_decision(Progress("model", 50, 10, 100)), "probe_worker")
        self.assertEqual(watchdog_decision(Progress("loop", 20, 19, 100, 3, 4, 4)), "stop_stalled_loop")

    def test_harness_requires_approval_and_rejects_out_of_scope_read(self) -> None:
        capabilities = {
            "read": Capability("read", False, (Path("/tmp/allowed"),)),
            "write": Capability("write", True, (Path("/tmp/allowed"),)),
        }
        self.assertEqual(authorize_action(Action("write", Path("/tmp/allowed/a.txt")), capabilities), "require_approval")
        self.assertEqual(authorize_action(Action("read", Path("/tmp/private.txt")), capabilities), "deny_outside_scope")


if __name__ == "__main__":
    unittest.main()
