from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from typing import Iterable, Literal, Protocol


class ResponsesResource(Protocol):
    def create(self, **kwargs: object) -> object: ...


@dataclass(frozen=True)
class RequestSpec:
    model: str
    instructions: str
    input: str
    max_output_tokens: int


@dataclass(frozen=True)
class ExecutionSpec:
    mode: Literal["sync", "stream"]
    background: bool = False
    timeout_seconds: float | None = None
    max_retries: int | None = None


@dataclass(frozen=True)
class SdkErrorTypes:
    timeout: tuple[type[BaseException], ...]
    connection: tuple[type[BaseException], ...]
    status: tuple[type[BaseException], ...]

    @property
    def handled(self) -> tuple[type[BaseException], ...]:
        return self.timeout + self.status + self.connection


@dataclass(frozen=True)
class CallRecord:
    request: dict[str, object]
    execution: dict[str, object]
    phase: Literal["create", "stream", "complete"]
    outcome: str
    terminal_response_observed: bool
    provider_status: str | None = None
    response_id: str | None = None
    terminal_event: str | None = None
    observed_error_event: str | None = None
    last_sequence_number: int | None = None
    text: str | None = None
    usage: dict[str, int | None] | None = None
    error: dict[str, object] | None = None
    partial_output_observed: bool = False


def build_request(model: str, question: str, evidence: str) -> RequestSpec:
    if not model.strip():
        raise ValueError("model_must_not_be_empty")
    if not question.strip():
        raise ValueError("question_must_not_be_empty")
    if not evidence.strip():
        raise ValueError("evidence_must_not_be_empty")

    return RequestSpec(
        model=model,
        instructions="只根据当前证据回答；证据不足时说明缺口。",
        input=f"当前证据：{evidence}\n用户问题：{question}",
        max_output_tokens=300,
    )


def request_payload(request: RequestSpec, execution: ExecutionSpec) -> dict[str, object]:
    payload: dict[str, object] = {
        "model": request.model,
        "instructions": request.instructions,
        "input": request.input,
        "max_output_tokens": request.max_output_tokens,
    }
    if execution.mode == "stream":
        payload["stream"] = True
    if execution.background:
        payload["background"] = True
    return payload


def openai_sdk_error_types() -> SdkErrorTypes:
    from openai import APIConnectionError, APIStatusError, APITimeoutError

    return SdkErrorTypes(
        timeout=(APITimeoutError,),
        connection=(APIConnectionError,),
        status=(APIStatusError,),
    )


def create_openai_client(execution: ExecutionSpec) -> object:
    from openai import OpenAI

    options: dict[str, object] = {}
    if execution.timeout_seconds is not None:
        options["timeout"] = execution.timeout_seconds
    if execution.max_retries is not None:
        options["max_retries"] = execution.max_retries
    return OpenAI(**options)


def _record(
    request: RequestSpec,
    execution: ExecutionSpec,
    *,
    phase: Literal["create", "stream", "complete"],
    outcome: str,
    terminal_response_observed: bool,
    provider_status: str | None = None,
    response_id: str | None = None,
    terminal_event: str | None = None,
    observed_error_event: str | None = None,
    last_sequence_number: int | None = None,
    text: str | None = None,
    usage: dict[str, int | None] | None = None,
    error: dict[str, object] | None = None,
    partial_output_observed: bool = False,
) -> CallRecord:
    return CallRecord(
        request=asdict(request),
        execution=asdict(execution),
        phase=phase,
        outcome=outcome,
        terminal_response_observed=terminal_response_observed,
        provider_status=provider_status,
        response_id=response_id,
        terminal_event=terminal_event,
        observed_error_event=observed_error_event,
        last_sequence_number=last_sequence_number,
        text=text,
        usage=usage,
        error=error,
        partial_output_observed=partial_output_observed,
    )


def refusal_text(response: object) -> str | None:
    for item in getattr(response, "output", []) or []:
        if getattr(item, "type", None) != "message":
            continue
        for content in getattr(item, "content", []) or []:
            if getattr(content, "type", None) != "refusal":
                continue
            refusal = getattr(content, "refusal", None)
            if isinstance(refusal, str) and refusal.strip():
                return refusal
    return None


def usage_record(response: object) -> dict[str, int | None] | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None
    return {
        "input_tokens": getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "output_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
    }


def response_error(response: object) -> dict[str, object] | None:
    error = getattr(response, "error", None)
    if error is None:
        return None
    return {
        "code": getattr(error, "code", None),
        "message": getattr(error, "message", None),
    }


def incomplete_details(response: object) -> dict[str, object] | None:
    details = getattr(response, "incomplete_details", None)
    if details is None:
        return None
    return {"reason": getattr(details, "reason", None)}


def record_response(
    request: RequestSpec,
    execution: ExecutionSpec,
    response: object,
    *,
    terminal_event: str | None = None,
    last_sequence_number: int | None = None,
    partial_output_observed: bool = False,
) -> CallRecord:
    status = getattr(response, "status", None)
    response_id = getattr(response, "id", None)
    common = {
        "phase": "complete",
        "provider_status": status,
        "response_id": response_id,
        "terminal_event": terminal_event,
        "last_sequence_number": last_sequence_number,
        "usage": usage_record(response),
        "partial_output_observed": partial_output_observed,
    }

    if status == "completed":
        refusal = refusal_text(response)
        if refusal is not None:
            return _record(
                request,
                execution,
                outcome="refusal",
                terminal_response_observed=True,
                text=refusal,
                **common,
            )
        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return _record(
                request,
                execution,
                outcome="answer",
                terminal_response_observed=True,
                text=text,
                **common,
            )
        return _record(
            request,
            execution,
            outcome="completed_without_text",
            terminal_response_observed=True,
            **common,
        )

    if status == "incomplete":
        return _record(
            request,
            execution,
            outcome="incomplete",
            terminal_response_observed=True,
            error=incomplete_details(response),
            **common,
        )
    if status == "failed":
        return _record(
            request,
            execution,
            outcome="failed",
            terminal_response_observed=True,
            error=response_error(response),
            **common,
        )
    if status == "cancelled":
        return _record(
            request,
            execution,
            outcome="cancelled",
            terminal_response_observed=True,
            **common,
        )
    if status in {"queued", "in_progress"}:
        can_poll = execution.background and isinstance(response_id, str) and bool(response_id)
        return _record(
            request,
            execution,
            outcome="pending" if can_poll else "unknown",
            terminal_response_observed=False,
            error=None if can_poll else {"reason": "non_terminal_response"},
            **common,
        )
    return _record(
        request,
        execution,
        outcome="unknown",
        terminal_response_observed=False,
        error={"reason": "unknown_response_status"},
        **common,
    )


def _record_sdk_exception(
    request: RequestSpec,
    execution: ExecutionSpec,
    exc: BaseException,
    errors: SdkErrorTypes,
    *,
    phase: Literal["create", "stream"],
    provider_status: str | None = None,
    response_id: str | None = None,
    last_sequence_number: int | None = None,
    partial_output_observed: bool = False,
) -> CallRecord:
    if isinstance(exc, errors.timeout):
        outcome = "transport_unknown"
        detail: dict[str, object] = {"type": type(exc).__name__, "reason": "timeout"}
    elif isinstance(exc, errors.status):
        outcome = "provider_http_error"
        detail = {
            "type": type(exc).__name__,
            "status_code": getattr(exc, "status_code", None),
            "request_id": getattr(exc, "request_id", None),
        }
    elif isinstance(exc, errors.connection):
        outcome = "transport_unknown"
        detail = {"type": type(exc).__name__, "reason": "connection"}
    else:
        raise exc

    return _record(
        request,
        execution,
        phase=phase,
        outcome=outcome,
        terminal_response_observed=False,
        provider_status=provider_status,
        response_id=response_id,
        last_sequence_number=last_sequence_number,
        error=detail,
        partial_output_observed=partial_output_observed,
    )


def execute_sync(
    responses: ResponsesResource,
    request: RequestSpec,
    execution: ExecutionSpec,
    errors: SdkErrorTypes,
) -> CallRecord:
    if execution.mode != "sync":
        raise ValueError("execution_mode_must_be_sync")
    try:
        response = responses.create(**request_payload(request, execution))
    except errors.handled as exc:
        return _record_sdk_exception(request, execution, exc, errors, phase="create")
    return record_response(request, execution, response)


def _stream_error(event: object) -> dict[str, object]:
    return {
        "code": getattr(event, "code", None),
        "message": getattr(event, "message", None),
        "param": getattr(event, "param", None),
    }


def execute_stream(
    responses: ResponsesResource,
    request: RequestSpec,
    execution: ExecutionSpec,
    errors: SdkErrorTypes,
) -> CallRecord:
    if execution.mode != "stream":
        raise ValueError("execution_mode_must_be_stream")
    try:
        stream = responses.create(**request_payload(request, execution))
    except errors.handled as exc:
        return _record_sdk_exception(request, execution, exc, errors, phase="create")

    if not isinstance(stream, Iterable):
        raise TypeError("stream_response_must_be_iterable")

    last_sequence_number: int | None = None
    last_response_id: str | None = None
    last_provider_status: str | None = None
    partial_output_observed = False
    try:
        for event in stream:
            sequence_number = getattr(event, "sequence_number", None)
            if isinstance(sequence_number, int):
                last_sequence_number = sequence_number

            event_type = getattr(event, "type", None)
            response = getattr(event, "response", None)
            if response is not None:
                candidate_response_id = getattr(response, "id", None)
                if isinstance(candidate_response_id, str) and candidate_response_id:
                    last_response_id = candidate_response_id
                status = getattr(response, "status", None)
                if isinstance(status, str):
                    last_provider_status = status

            if event_type in {"response.output_text.delta", "response.refusal.delta"}:
                partial_output_observed = True
                continue
            if event_type in {
                "response.completed",
                "response.failed",
                "response.incomplete",
            }:
                if response is None:
                    return _record(
                        request,
                        execution,
                        phase="stream",
                        outcome="unknown",
                        terminal_response_observed=False,
                        response_id=last_response_id,
                        terminal_event=event_type,
                        last_sequence_number=last_sequence_number,
                        error={"reason": "terminal_event_without_response"},
                        partial_output_observed=partial_output_observed,
                    )
                return record_response(
                    request,
                    execution,
                    response,
                    terminal_event=event_type,
                    last_sequence_number=last_sequence_number,
                    partial_output_observed=partial_output_observed,
                )
            if event_type == "error":
                return _record(
                    request,
                    execution,
                    phase="stream",
                    outcome="provider_stream_error",
                    terminal_response_observed=False,
                    response_id=last_response_id,
                    observed_error_event="error",
                    provider_status=last_provider_status,
                    last_sequence_number=last_sequence_number,
                    error=_stream_error(event),
                    partial_output_observed=partial_output_observed,
                )
    except errors.handled as exc:
        return _record_sdk_exception(
            request,
            execution,
            exc,
            errors,
            phase="stream",
            provider_status=last_provider_status,
            response_id=last_response_id,
            last_sequence_number=last_sequence_number,
            partial_output_observed=partial_output_observed,
        )

    return _record(
        request,
        execution,
        phase="stream",
        outcome="unknown",
        terminal_response_observed=False,
        response_id=last_response_id,
        provider_status=last_provider_status,
        last_sequence_number=last_sequence_number,
        error={"reason": "stream_ended_without_terminal_event"},
        partial_output_observed=partial_output_observed,
    )


def main() -> None:
    model = os.environ.get("OPENAI_MODEL", "").strip()
    if not model:
        raise RuntimeError("OPENAI_MODEL_is_missing")

    request = build_request(
        model,
        "为什么我的远程访问申请被拒绝？",
        "远程访问需要设备通过合规检查。",
    )
    execution = ExecutionSpec(mode="sync")
    client = create_openai_client(execution)
    record = execute_sync(
        client.responses,
        request,
        execution,
        openai_sdk_error_types(),
    )
    print(
        json.dumps(
            {
                "outcome": record.outcome,
                "phase": record.phase,
                "provider_status": record.provider_status,
                "response_id": record.response_id,
                "terminal_event": record.terminal_event,
                "usage": record.usage,
                "error": record.error,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
