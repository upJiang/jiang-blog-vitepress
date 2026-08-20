---
title: 用 Python 调用一次 Responses API
description: 从同一份请求语义出发，观察 Responses API 的 Response、流式事件和 SDK 异常，再把一次调用归档为可判断的结果。
category: ai-agent
part: 模型、调用与 Agent 基础
stageKey: foundations
chapter: 3
sequence: 3
slug: python-openai-responses-first-call
tags:
  - Python
  - OpenAI
  - Responses API
sourceKey: ai-python-openai-responses-first-call
dependsOn:
  - messages-tokens-context
updated: '2026-08-20'
lastUpdated: false
---
# 用 Python 调用一次 Responses API

[上一篇](/docs/ai-agent/messages-tokens-context)把 Context 固定成一次调用实际可见的输入。现在把同一份输入交给 Python，问题会从“模型看到了什么”变成“应用拿到了什么证据”。

仍然沿用远程访问申请这个例子。用户问：“为什么我的申请被拒绝？”应用已经准备好一条当前制度材料。调用结束时，程序需要知道它拿到的是回答、拒绝、不完整响应、服务端失败，还是只看到半条流就断开了连接。

这篇文章把一次 SDK 调用拆成四层：请求语义、执行方式、调用观察和应用结果。同步与流式只共享请求语义，后面的执行配置和观察方式不同。正文先拆开关键分支，测试章节再把它们放回同一个调用记录；页面末尾可以展开构建时实际引入的完整实现与专用测试。

## 一次调用要留下什么证据

一次调用从应用准备的材料开始。`model`、`instructions`、`input` 和输出预算组成 **RequestSpec（请求语义）**，它回答“这次要让模型处理什么”。同步还是流式、是否后台执行、客户端超时和 SDK 重试配置组成 **ExecutionSpec（执行配置）**，它回答“用什么方式提交和等待”。

两者分开后，同一个问题可以被同步路径和流式路径消费。完整 Response 和服务端事件属于供应商观察，SDK 异常属于客户端观察，程序再把两类观察翻译成 `CallRecord`。`answer`、`refusal`、`incomplete`、`failed` 和 `unknown` 是应用结果，不是 Responses API 额外增加的状态。

下面的请求对象只保存本次材料的语义。真实应用若要回放，应该把受保护的原始输入放进有权限控制的存储，普通日志只保留必要摘要；示例返回完整请求，是为了让测试能检查输入确实没有被悄悄换掉。

```python
from dataclasses import dataclass
from typing import Literal


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


def build_request(model: str, question: str, evidence: str) -> RequestSpec:
    if not model.strip() or not question.strip() or not evidence.strip():
        raise ValueError("request_material_must_not_be_empty")

    return RequestSpec(
        model=model,
        instructions="只根据当前证据回答；证据不足时说明缺口。",
        input=f"当前证据：{evidence}\n用户问题：{question}",
        max_output_tokens=300,
    )
```

`RequestSpec` 没有权限字段，也没有把用户输入直接当成可信指令。权限检查、证据筛选和脱敏应发生在它被构造之前。`ExecutionSpec` 的超时与重试配置要传给 Python 客户端；它们影响调用行为，却不会改变模型看到的材料。

## 先固定请求语义，再选择执行方式

Responses API 的请求字段把指令、输入和输出上限交给同一次 `responses.create`。流式调用只额外设置 `stream=True`，后台调用才额外设置 `background=True`。下面的载荷函数故意只从两个规格对象生成参数，防止同步和流式分支各自拼出一份略有差异的输入。

```python
def request_payload(
    request: RequestSpec,
    execution: ExecutionSpec,
) -> dict[str, object]:
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
```

同步调用直接得到一个 Response。流式调用得到可迭代的事件序列，只有事件里的最终 Response 才能进入同一个结果分类器。两条路径的区别在观察方式，不在请求材料。

| 执行方式 | 第一个可观察对象 | 进入结果分类的条件 |
| --- | --- | --- |
| 同步 | Response | 拿到 Response 对象 |
| 流式 | Server-Sent Events | 收到带 Response 的终止事件 |

客户端配置也要留在执行记录里。`OpenAI(timeout=..., max_retries=...)` 的参数属于 SDK 行为；SDK 可能在一次方法调用内部重试 HTTP 请求，这里把外层方法调用视为一次 SDK invocation，不把隐藏的 HTTP attempt 当成新的业务调用。

```python
def create_openai_client(execution: ExecutionSpec) -> object:
    from openai import OpenAI

    options: dict[str, object] = {}
    if execution.timeout_seconds is not None:
        options["timeout"] = execution.timeout_seconds
    if execution.max_retries is not None:
        options["max_retries"] = execution.max_retries
    return OpenAI(**options)
```

这段代码只负责把执行配置交给 SDK。它不能证明网络已经连通，也不能证明模型一定会返回普通文本，后面的 Response 和事件仍要单独判断。

## 同步 Response 的完成状态还要继续解释

Responses API 的 `status` 描述服务端生成进度。`completed` 表示生成过程结束，应用仍要检查输出内容。完成响应可能包含普通文本，也可能只有拒绝内容，甚至没有可提交的文本。

状态分类需要把协议字段和应用判断分开：`incomplete` 读取 `incomplete_details`，`failed` 读取 `error`，`cancelled` 只记录服务状态；`queued` 和 `in_progress` 只在后台响应且已有可检索 ID 时映射为 `pending`。普通调用收到非终态响应，却没有后台轮询合同，应用只能保留 `unknown`。

下面只截取分类分支，`_record` 负责把请求、执行方式、状态、响应 ID、usage 和错误字段组装成一条 `CallRecord`。完整函数还会保留流式终止事件和最后事件序号。

```python
status = getattr(response, "status", None)
common = {
    "phase": "complete",
    "provider_status": status,
    "response_id": getattr(response, "id", None),
    "usage": usage_record(response),
}

if status == "completed":
    refusal = refusal_text(response)
    if refusal is not None:
        return _record(
            request, execution,
            outcome="refusal",
            terminal_response_observed=True,
            text=refusal,
            **common,
        )
    text = getattr(response, "output_text", None)
    outcome = "answer" if isinstance(text, str) and text.strip() else "completed_without_text"
    return _record(
        request, execution,
        outcome=outcome,
        terminal_response_observed=True,
        text=text if outcome == "answer" else None,
        **common,
    )

if status == "incomplete":
    return _record(
        request, execution,
        outcome="incomplete",
        terminal_response_observed=True,
        error=incomplete_details(response),
        **common,
    )
if status == "failed":
    return _record(
        request, execution,
        outcome="failed",
        terminal_response_observed=True,
        error=response_error(response),
        **common,
    )
```

这里先把状态分支单独展开，页面末尾的完整实现还会展示 `CallRecord`、`_record` 和内容读取函数怎样保存 `phase`、终止事件与错误字段。`output_text` 只是 SDK 聚合普通文本项的便利属性。拒绝内容位于 `output` 的独立内容类型，必须在空文本判断之前读取，否则拒绝会被误报成“完成但没有文本”。

`usage` 属于最终 Response。调用前可以用估算值做预算检查，调用后只记录服务端返回的计量；拿不到最终 Response 时不根据已经看到的字符数伪造 Token 统计。

```python
def usage_record(response: object) -> dict[str, int | None] | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None
    return {
        "input_tokens": getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "output_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
    }
```

这里的 `answer` 只表示模型完成了普通文本生成。它没有验证远程访问申请是否真的满足制度，也没有把回答变成可执行的业务命令。那属于后续的输出验证和权限边界。

## SDK 异常只告诉你客户端观察到了什么

没有 Response 时，应用缺少服务端终态。Python SDK 的 `APITimeoutError`、`APIConnectionError` 和 `APIStatusError` 需要分开处理。前两者表示客户端没有建立可判断的响应观察，结果应为 `transport_unknown`；后者带有 HTTP 状态，可以记录为 `provider_http_error`。

捕获内置的 `TimeoutError` 并不能覆盖 OpenAI Python SDK 的 `APITimeoutError`。异常类型应该从 SDK 导入，再注入归一化函数，测试替身也使用同一接口。这样不会因为 Fake 恰好抛出一个普通异常，就把真实 SDK 的合同悄悄改掉。

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class SdkErrorTypes:
    timeout: tuple[type[BaseException], ...]
    connection: tuple[type[BaseException], ...]
    status: tuple[type[BaseException], ...]


def openai_sdk_error_types() -> SdkErrorTypes:
    from openai import APIConnectionError, APIStatusError, APITimeoutError

    return SdkErrorTypes(
        timeout=(APITimeoutError,),
        connection=(APIConnectionError,),
        status=(APIStatusError,),
    )
```

归一化函数还要保留错误发生阶段。创建阶段失败说明 SDK 没有建立事件流；迭代阶段失败说明客户端可能已经看到部分增量。两者都不能直接写成 `failed`，因为 `failed` 是服务端 Response 的状态。

```python
def _record_sdk_exception(
    request: RequestSpec,
    execution: ExecutionSpec,
    exc: BaseException,
    errors: SdkErrorTypes,
    *,
    phase: Literal["create", "stream"],
    response_id: str | None = None,
    last_sequence_number: int | None = None,
    partial_output_observed: bool = False,
) -> CallRecord:
    if isinstance(exc, errors.timeout):
        outcome = "transport_unknown"
        detail = {"type": type(exc).__name__, "reason": "timeout"}
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
        response_id=response_id,
        last_sequence_number=last_sequence_number,
        error=detail,
        partial_output_observed=partial_output_observed,
    )
```

遇到未知的编程异常仍然应该抛出，让测试和监控尽快暴露问题。只有明确属于 SDK 合同的异常才进入 `CallRecord`。即使记录了 `transport_unknown`，也不能立刻无条件重放请求。SDK 可能已经在服务端完成了工作，是否重试要结合请求副作用、应用总截止时间和幂等设计。

## 增量是可选观测，终止 Response 才能提交结果

流式生命周期事件可能先报告创建和进行中状态。只有在对应内容产生时，事件流才会出现 `response.output_text.delta` 或 `response.refusal.delta`，这些增量只能暂存，不能当作流一定会出现的前置步骤。`response.completed`、`response.failed` 和 `response.incomplete` 都可以在没有任何 delta 时到达；只要事件携带最终 Response，就把它交给前面的分类器。

独立的 `error` 事件带有错误字段，但没有最终 Response。它属于已知的流协议错误。若进行中事件已经携带 `response.id`，归一化器也要保留这个 ID；终止前断流时，应用至少知道是否存在可检索的响应线索。若迭代器在终止事件之前抛出超时或连接异常，记录已经看到的最后事件序号和“观察到部分输出”，结果仍然是未知。没有 delta 本身也不是失败证据，终止事件才决定能否提交分类结果。

下面是流式分支的核心控制流，记录组装函数的完整字段在本页末尾展开。

```python
def execute_stream(responses, request, execution, errors):
    try:
        stream = responses.create(**request_payload(request, execution))
    except errors.handled as exc:
        return _record_sdk_exception(request, execution, exc, errors, phase="create")

    last_sequence_number = None
    last_response_id = None
    partial_output_observed = False
    try:
        for event in stream:
            last_sequence_number = getattr(event, "sequence_number", last_sequence_number)
            event_type = getattr(event, "type", None)
            response = getattr(event, "response", None)
            if response is not None:
                candidate_response_id = getattr(response, "id", None)
                if candidate_response_id:
                    last_response_id = candidate_response_id

            if event_type in {"response.output_text.delta", "response.refusal.delta"}:
                partial_output_observed = True
                continue
            if event_type in {
                "response.completed",
                "response.failed",
                "response.incomplete",
            }:
                if getattr(event, "response", None) is None:
                    return _record(
                        request, execution,
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
                    request, execution, event.response,
                    terminal_event=event_type,
                    last_sequence_number=last_sequence_number,
                    partial_output_observed=partial_output_observed,
                )
            if event_type == "error":
                return _record(
                    request, execution,
                    phase="stream",
                    outcome="provider_stream_error",
                    terminal_response_observed=False,
                    response_id=last_response_id,
                    terminal_event="error",
                    last_sequence_number=last_sequence_number,
                    error=_stream_error(event),
                    partial_output_observed=partial_output_observed,
                )
    except errors.handled as exc:
        return _record_sdk_exception(
            request, execution, exc, errors, phase="stream",
            response_id=last_response_id,
            last_sequence_number=last_sequence_number,
            partial_output_observed=partial_output_observed,
        )

    return _record(
        request, execution,
        phase="stream",
        outcome="unknown",
        terminal_response_observed=False,
        response_id=last_response_id,
        last_sequence_number=last_sequence_number,
        error={"reason": "stream_ended_without_terminal_event"},
        partial_output_observed=partial_output_observed,
    )
```

正常结束却没有终止事件，也只能记录 `unknown`。流里已经出现的文字不能提交到业务系统，`last_sequence_number` 只能帮助排查或在满足后台模式条件时继续观察。普通 `stream=True` 调用没有自动恢复保证，后台流的续接属于另一篇实现边界。

## 测试要证明每个结论来自哪一层

Fake 客户端可以把每种 Response 和事件排成矩阵，用来验证本地归一化逻辑。它不能证明真实 SDK 的序列化、网络行为、事件顺序或模型质量，所以测试结果必须明确停留在控制流层。

```python
def test_stream_break_is_unknown_not_completed():
    stream = BreakingStream()
    record = execute_stream(
        FakeResponses(stream),
        request(),
        ExecutionSpec(mode="stream"),
        FAKE_SDK_ERRORS,
    )

    assert record.outcome == "transport_unknown"
    assert record.phase == "stream"
    assert record.response_id == "provider-response"
    assert record.partial_output_observed is True
    assert record.last_sequence_number == 4
```

专用状态矩阵覆盖的判断可以压缩成下面这张表。表格只保留短结果，具体错误详情和事件序号在 `CallRecord` 断言里检查。

| 输入观察 | 应用结果 | 可提交普通文本 |
| --- | --- | --- |
| `completed` + 文本 | `answer` | 可以进入下一层校验 |
| `completed` + refusal | `refusal` | 不能当作回答 |
| `completed` + 无文本 | `completed_without_text` | 不能 |
| `incomplete` | `incomplete` | 不能 |
| `failed` | `failed` | 不能 |
| `cancelled` | `cancelled` | 不能 |
| 后台 `queued/in_progress` + ID | `pending` | 等待轮询 |
| 普通非终态或无终止事件 | `unknown` | 不能 |
| SDK 超时、连接异常 | `transport_unknown` | 不能 |
| HTTP 错误或流式 `error` 事件 | 已知供应商错误 | 不能 |

同步和流式测试还要共享同一份 `RequestSpec`，检查输入内容没有因为切换模式而变化。`usage` 同时覆盖存在和缺失两种情况，缺失就记录 `None`。这样测试证明的是归一化器的责任边界，而不是 Fake“模拟出了一个真实模型”。

## 完整代码必须和正文使用同一份来源

正文片段容易漏掉类型和辅助函数，所以完整实现不能交给一条可能滞后的远端分支链接。下面两个折叠区由 VitePress 在构建页面时直接读取当前仓库文件。展开后看到的 `CallRecord`、`record_response`、`execute_stream` 和状态矩阵，就是本次测试运行的代码。

::: details 展开完整 Responses API 适配器
<<< ../../examples/ai-agent/openai_responses.py
:::

::: details 展开本篇专用状态矩阵测试
<<< ../../examples/ai-agent/tests/test_openai_responses_contract.py
:::

本地可用下面的命令只运行这组合同测试。它验证请求语义、状态分类、SDK 异常、无 delta 终止、独立 `error` 和终止前断流，不会访问供应商网络。

```bash
PYTHONPATH=examples/ai-agent python3 -m unittest \
  examples/ai-agent/tests/test_openai_responses_contract.py -q
```

这组 Fake 仍然只能证明本地控制流。真实 SDK 序列化、事件顺序、网络和模型输出需要独立集成测试，不能由页面里的本地状态矩阵代替。

## 真实 SDK 入口和本地边界

要把本文的同步入口接到真实 Python SDK，先在隔离环境安装依赖，并把凭证和模型名放进环境变量。下面的模型名只是占位符，不能直接当作可用模型；API Key 也不应写进脚本、日志或仓库。

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install openai
export OPENAI_API_KEY="replace-with-a-secret-from-your-secret-store"
export OPENAI_MODEL="replace-with-a-supported-model"
python examples/ai-agent/openai_responses.py
```

入口会构造同一个 `RequestSpec`，调用 `client.responses.create`，然后输出脱敏后的 `outcome`、`provider_status`、`response_id`、终止事件、usage 和错误字段。原始输入不进入这段终端输出。没有凭证时它会在创建客户端或请求阶段失败。

页面里的合同测试不需要网络和凭证，只验证归一化器的本地控制流。

协议字段和 Response 状态以 [Responses API 创建响应文档](https://developers.openai.com/api/reference/resources/responses/methods/create) 为准。事件类型以 [Responses 流式事件文档](https://developers.openai.com/api/reference/resources/responses/streaming-events) 为准。

Python SDK 的异常分类以 [错误代码文档中的 Python library error types](https://developers.openai.com/api/docs/guides/error-codes#python-library-error-types) 为准。

## 一次调用仍不回答业务事实

回到远程访问申请。`answer` 只说明服务端完成了文本生成，`refusal` 说明输出内容属于拒绝，`incomplete` 和 `unknown` 则说明结果不能提交。它们都没有替应用确认用户身份、制度版本或申请状态。

本篇把输入和调用观察变成了一条可回放记录，下一步还要处理模型输出的格式。结构化输出能让字段更容易解析，却仍然不能证明 `user_id`、权限和审批状态来自可信系统。下一篇从这个边界开始。

接着阅读：[结构化输出约束格式，不证明业务事实](/docs/ai-agent/structured-output-model-boundaries)
