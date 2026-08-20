from __future__ import annotations

import unittest
from types import SimpleNamespace

from openai_responses import (
    ExecutionSpec,
    SdkErrorTypes,
    build_request,
    execute_stream,
    execute_sync,
)


class FakeConnectionError(Exception):
    pass


class FakeTimeoutError(FakeConnectionError):
    pass


class FakeStatusError(Exception):
    def __init__(self, status_code: int, request_id: str) -> None:
        super().__init__(f"status:{status_code}")
        self.status_code = status_code
        self.request_id = request_id


FAKE_SDK_ERRORS = SdkErrorTypes(
    timeout=(FakeTimeoutError,),
    connection=(FakeConnectionError,),
    status=(FakeStatusError,),
)


class FakeResponses:
    def __init__(self, result: object = None, error: BaseException | None = None) -> None:
        self.result = result
        self.error = error
        self.arguments: dict[str, object] = {}

    def create(self, **kwargs: object) -> object:
        self.arguments = kwargs
        if self.error is not None:
            raise self.error
        return self.result


class BreakingStream:
    def __iter__(self):
        yield SimpleNamespace(
            type="response.in_progress",
            response=provider_response("in_progress"),
            sequence_number=3,
        )
        yield SimpleNamespace(
            type="response.output_text.delta",
            delta="partial",
            sequence_number=4,
        )
        raise FakeTimeoutError("slow")


def provider_response(
    status: str,
    *,
    output_text: str | None = None,
    output: list[object] | None = None,
    usage: object | None = None,
    error: object | None = None,
    incomplete_details: object | None = None,
) -> object:
    return SimpleNamespace(
        id="provider-response",
        status=status,
        output_text=output_text,
        output=output or [],
        usage=usage,
        error=error,
        incomplete_details=incomplete_details,
    )


def request():
    return build_request(
        "test-model",
        "为什么申请被拒绝？",
        "远程访问需要设备通过合规检查。",
    )


class OpenAIResponsesContractTests(unittest.TestCase):
    def test_sync_and_stream_share_request_semantics(self) -> None:
        sync = FakeResponses(provider_response("completed", output_text="需要先检查设备。"))
        sync_record = execute_sync(
            sync,
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )
        terminal = SimpleNamespace(
            type="response.completed",
            response=provider_response("completed", output_text="需要先检查设备。"),
            sequence_number=3,
        )
        stream = FakeResponses([terminal])
        stream_record = execute_stream(
            stream,
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(sync.arguments["input"], stream.arguments["input"])
        self.assertNotIn("stream", sync.arguments)
        self.assertTrue(stream.arguments["stream"])
        self.assertEqual(sync_record.outcome, "answer")
        self.assertEqual(stream_record.outcome, "answer")

    def test_completed_response_still_needs_content_classification(self) -> None:
        refusal = SimpleNamespace(
            type="message",
            content=[SimpleNamespace(type="refusal", refusal="无法协助该请求。")],
        )
        samples = [
            (provider_response("completed", output_text="设备未通过检查。"), "answer"),
            (provider_response("completed", output=[refusal]), "refusal"),
            (provider_response("completed"), "completed_without_text"),
        ]

        for response, expected in samples:
            with self.subTest(expected=expected):
                record = execute_sync(
                    FakeResponses(response),
                    request(),
                    ExecutionSpec(mode="sync"),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(record.outcome, expected)
                self.assertTrue(record.terminal_response_observed)

    def test_non_completed_statuses_keep_their_own_evidence(self) -> None:
        incomplete = execute_sync(
            FakeResponses(
                provider_response(
                    "incomplete",
                    incomplete_details=SimpleNamespace(reason="max_output_tokens"),
                )
            ),
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )
        failed = execute_sync(
            FakeResponses(
                provider_response(
                    "failed",
                    error=SimpleNamespace(code="server_error", message="generation failed"),
                )
            ),
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )
        cancelled = execute_sync(
            FakeResponses(provider_response("cancelled")),
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(incomplete.outcome, "incomplete")
        self.assertEqual(incomplete.error, {"reason": "max_output_tokens"})
        self.assertEqual(failed.outcome, "failed")
        self.assertEqual(
            failed.error,
            {"code": "server_error", "message": "generation failed"},
        )
        self.assertEqual(cancelled.outcome, "cancelled")
        self.assertIsNone(cancelled.error)

    def test_pending_requires_background_mode_and_a_retrievable_id(self) -> None:
        for status in ("queued", "in_progress"):
            with self.subTest(status=status, mode="background"):
                pending = execute_sync(
                    FakeResponses(provider_response(status)),
                    request(),
                    ExecutionSpec(mode="sync", background=True),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(pending.outcome, "pending")
                self.assertEqual(pending.response_id, "provider-response")
                self.assertIsNone(pending.error)

            with self.subTest(status=status, mode="foreground"):
                unknown = execute_sync(
                    FakeResponses(provider_response(status)),
                    request(),
                    ExecutionSpec(mode="sync"),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(unknown.outcome, "unknown")
                self.assertEqual(unknown.error, {"reason": "non_terminal_response"})

    def test_sdk_errors_do_not_invent_a_response_status(self) -> None:
        samples = [
            (
                FakeTimeoutError("slow"),
                "transport_unknown",
                {"type": "FakeTimeoutError", "reason": "timeout"},
            ),
            (
                FakeConnectionError("offline"),
                "transport_unknown",
                {"type": "FakeConnectionError", "reason": "connection"},
            ),
            (
                FakeStatusError(429, "provider-request"),
                "provider_http_error",
                {
                    "type": "FakeStatusError",
                    "status_code": 429,
                    "request_id": "provider-request",
                },
            ),
        ]

        for error, expected, expected_error in samples:
            with self.subTest(error=type(error).__name__):
                record = execute_sync(
                    FakeResponses(error=error),
                    request(),
                    ExecutionSpec(mode="sync"),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(record.outcome, expected)
                self.assertIsNone(record.provider_status)
                self.assertFalse(record.terminal_response_observed)
                self.assertEqual(record.error, expected_error)

    def test_terminal_events_do_not_require_a_delta(self) -> None:
        refusal = SimpleNamespace(
            type="message",
            content=[SimpleNamespace(type="refusal", refusal="无法协助该请求。")],
        )
        samples = [
            (
                "response.completed",
                provider_response("completed", output_text="设备未通过检查。"),
                "answer",
            ),
            (
                "response.completed",
                provider_response("completed", output=[refusal]),
                "refusal",
            ),
            (
                "response.completed",
                provider_response("completed"),
                "completed_without_text",
            ),
            (
                "response.failed",
                provider_response(
                    "failed",
                    error=SimpleNamespace(code="server_error", message="generation failed"),
                ),
                "failed",
            ),
            (
                "response.incomplete",
                provider_response(
                    "incomplete",
                    incomplete_details=SimpleNamespace(reason="max_output_tokens"),
                ),
                "incomplete",
            ),
        ]

        for event_type, response, expected in samples:
            with self.subTest(event_type=event_type):
                event = SimpleNamespace(
                    type=event_type,
                    response=response,
                    sequence_number=7,
                )
                record = execute_stream(
                    FakeResponses([event]),
                    request(),
                    ExecutionSpec(mode="stream"),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(record.outcome, expected)
                self.assertFalse(record.partial_output_observed)
                self.assertEqual(record.terminal_event, event_type)

    def test_delta_is_optional_and_never_replaces_the_terminal_response(self) -> None:
        refusal = SimpleNamespace(
            type="message",
            content=[SimpleNamespace(type="refusal", refusal="无法协助该请求。")],
        )
        samples = [
            (
                SimpleNamespace(
                    type="response.output_text.delta",
                    delta="partial",
                    sequence_number=4,
                ),
                SimpleNamespace(
                    type="response.completed",
                    response=provider_response("completed", output_text="完整回答"),
                    sequence_number=5,
                ),
                "answer",
            ),
            (
                SimpleNamespace(
                    type="response.refusal.delta",
                    delta="partial refusal",
                    sequence_number=6,
                ),
                SimpleNamespace(
                    type="response.completed",
                    response=provider_response("completed", output=[refusal]),
                    sequence_number=7,
                ),
                "refusal",
            ),
            (
                SimpleNamespace(
                    type="response.output_text.delta",
                    delta="partial",
                    sequence_number=8,
                ),
                SimpleNamespace(
                    type="response.failed",
                    response=provider_response(
                        "failed",
                        error=SimpleNamespace(code="server_error", message="generation failed"),
                    ),
                    sequence_number=9,
                ),
                "failed",
            ),
            (
                SimpleNamespace(
                    type="response.output_text.delta",
                    delta="partial",
                    sequence_number=10,
                ),
                SimpleNamespace(
                    type="response.incomplete",
                    response=provider_response(
                        "incomplete",
                        incomplete_details=SimpleNamespace(reason="max_output_tokens"),
                    ),
                    sequence_number=11,
                ),
                "incomplete",
            ),
        ]

        for delta, terminal, expected in samples:
            with self.subTest(terminal=terminal.type, expected=expected):
                record = execute_stream(
                    FakeResponses([delta, terminal]),
                    request(),
                    ExecutionSpec(mode="stream"),
                    FAKE_SDK_ERRORS,
                )
                self.assertEqual(record.outcome, expected)
                self.assertTrue(record.partial_output_observed)
                self.assertEqual(record.last_sequence_number, terminal.sequence_number)
                self.assertEqual(record.terminal_event, terminal.type)

    def test_independent_error_and_transport_break_keep_different_evidence(self) -> None:
        provider_error = execute_stream(
            FakeResponses(
                [
                    SimpleNamespace(
                        type="error",
                        code="server_error",
                        message="stream failed",
                        param=None,
                        sequence_number=5,
                    )
                ]
            ),
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )
        transport_break = execute_stream(
            FakeResponses(BreakingStream()),
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(provider_error.outcome, "provider_stream_error")
        self.assertEqual(provider_error.terminal_event, "error")
        self.assertEqual(provider_error.last_sequence_number, 5)
        self.assertEqual(
            provider_error.error,
            {"code": "server_error", "message": "stream failed", "param": None},
        )
        self.assertEqual(transport_break.outcome, "transport_unknown")
        self.assertEqual(transport_break.phase, "stream")
        self.assertEqual(transport_break.response_id, "provider-response")
        self.assertTrue(transport_break.partial_output_observed)
        self.assertEqual(transport_break.last_sequence_number, 4)
        self.assertEqual(
            transport_break.error,
            {"type": "FakeTimeoutError", "reason": "timeout"},
        )

    def test_stream_without_terminal_event_stays_unknown(self) -> None:
        event = SimpleNamespace(
            type="response.in_progress",
            response=provider_response("in_progress"),
            sequence_number=2,
        )
        record = execute_stream(
            FakeResponses([event]),
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(record.outcome, "unknown")
        self.assertEqual(record.response_id, "provider-response")
        self.assertEqual(record.provider_status, "in_progress")
        self.assertFalse(record.terminal_response_observed)
        self.assertEqual(record.last_sequence_number, 2)
        self.assertEqual(
            record.error,
            {"reason": "stream_ended_without_terminal_event"},
        )

    def test_terminal_event_without_a_response_stays_unknown(self) -> None:
        event = SimpleNamespace(
            type="response.completed",
            response=None,
            sequence_number=12,
        )
        record = execute_stream(
            FakeResponses([event]),
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(record.outcome, "unknown")
        self.assertEqual(record.terminal_event, "response.completed")
        self.assertEqual(record.last_sequence_number, 12)
        self.assertEqual(record.error, {"reason": "terminal_event_without_response"})

    def test_stream_creation_error_is_recorded_before_iteration(self) -> None:
        record = execute_stream(
            FakeResponses(error=FakeConnectionError("offline")),
            request(),
            ExecutionSpec(mode="stream"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(record.phase, "create")
        self.assertEqual(record.outcome, "transport_unknown")
        self.assertFalse(record.partial_output_observed)

    def test_usage_can_be_absent_without_inventing_a_count(self) -> None:
        record = execute_sync(
            FakeResponses(provider_response("completed", output_text="需要先检查设备。")),
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(record.outcome, "answer")
        self.assertIsNone(record.usage)

    def test_final_response_usage_is_preserved(self) -> None:
        usage = SimpleNamespace(input_tokens=20, output_tokens=8, total_tokens=28)
        record = execute_sync(
            FakeResponses(
                provider_response(
                    "completed",
                    output_text="需要先检查设备。",
                    usage=usage,
                )
            ),
            request(),
            ExecutionSpec(mode="sync"),
            FAKE_SDK_ERRORS,
        )

        self.assertEqual(
            record.usage,
            {"input_tokens": 20, "output_tokens": 8, "total_tokens": 28},
        )


if __name__ == "__main__":
    unittest.main()
