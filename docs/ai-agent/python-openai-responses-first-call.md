---
title: Python 调用 Responses API：一次请求如何变成可判断结果
description: 沿同一份请求观察 Responses API 的 Response、流式事件和 SDK 异常，建立可回放的调用结果分类。
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
updated: '2026-08-24'
lastUpdated: false
---
# Python 调用 Responses API：一次请求如何变成可判断结果

[上一篇](/docs/ai-agent/messages-tokens-context)确定了模型本轮能看到哪些输入。把这些输入交给 Python 之后，问题就换了一个角度：调用结束时，程序究竟拿到了什么证据？

仍然使用远程访问申请这个例子。用户问：“为什么我的申请被拒绝？”应用已经准备好一段当前制度材料。

程序需要区分几种情况：服务端完成了普通文本，模型输出了拒绝内容，生成被截断，服务端报告失败，流式连接中途断开，或者客户端根本没有拿到可判断的响应。

本文只讨论一次 Responses API 调用。后台恢复、跨请求幂等、Agent 循环和业务审批属于后续问题。

这里要做的事情很具体：把一份请求按同步或流式方式提交，把观察到的证据归一化成一条 `CallRecord`，再决定它能不能交给下一层验证。

## 一次调用需要留下哪些证据

调用开始前，应用已经有一份经过权限筛选的 Context。它包含用户问题和当前制度材料。

把这份材料写入 `model`、`instructions`、`input` 和输出预算，得到 `RequestSpec`。它回答“这次让模型处理什么”。

同步或流式、是否后台执行、客户端超时和 SDK 重试属于 `ExecutionSpec`。它们回答“怎样提交和等待”，不会改变 `RequestSpec` 中的输入材料。

调用返回以后，程序面对的不是一个统一的“成功或失败”字段。完整 Response 有服务端状态，流式调用还有事件序列，Python SDK 可能直接抛出异常。

应用需要把这些不同层级的观察收进一条记录，才能知道哪里已经确定，哪里仍然未知。

下面的关系先固定下来：

```text
已授权 Context
    ↓ 编译
RequestSpec + ExecutionSpec
    ↓ SDK 方法调用
Response / 流式事件 / SDK 异常
    ↓ 证据归一化
CallRecord
    ↓ 业务层继续验证
可提交或暂缓
```

图中的 `CallRecord` 和“可提交”是应用层建模，不是 Responses API 的固定返回类型。它们的作用是把协议观察和业务判断隔开。

## 同一份请求语义，为什么要单独保存执行方式

先看请求规格。`build_request` 只接收模型名、用户问题和证据。权限检查、证据筛选和脱敏应在它之前完成，不能把这些职责藏在 SDK 调用里。

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
```

这段代码只负责形成请求语义。它没有判断用户是否有权读取制度，也没有把问题里的任何文字升级成系统指令。

`RequestSpec` 生成后可以被两种执行方式复用，这正是把输入一致性变成可测试条件的前提。

执行方式再单独转成请求参数：

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

同步和流式分支都从同一个 `RequestSpec` 生成 `input`。只有 `stream` 等执行字段变化，才可以把两种结果的差异归因于观察方式，而不是归因于悄悄变掉的提示词。

`timeout` 和 `max_retries` 是 SDK 的客户端配置。SDK 可能在一次方法调用内部发起多个 HTTP attempt，应用记录时仍把外层方法调用看成一次调用。

是否允许重试，还要看请求有没有副作用以及应用的总截止时间，本文不展开重试策略。

## 拿到 Response 以后，status 还不够

同步调用拿到完整 Response，第一步是读取 `status`。状态描述服务端生成进度或终止情况，不能直接当成业务结果。

### `completed` 仍要检查输出内容

`completed` 只说明生成过程已经结束。Response 可能包含普通文本，也可能包含拒绝内容，或者没有可提交的文本。

拒绝内容位于 `output` 的独立内容类型，不能只检查 `output_text` 是否为空。

适配器的分类顺序应该是：先读拒绝，再读普通文本，最后记录“完成但没有文本”。完整实现中的 `record_response` 负责保存响应 ID、状态、usage 和错误字段，核心判断可以概括为：

```python
if response.status == "completed":
    refusal = refusal_text(response)
    if refusal is not None:
        return record(outcome="refusal", text=refusal)

    text = response.output_text
    if isinstance(text, str) and text.strip():
        return record(outcome="answer", text=text)

    return record(outcome="completed_without_text")
```

这段是说明控制流的简化片段，真实字段读取和记录组装见页面末尾的完整实现。`answer` 只代表拿到一段普通文本，它还没有证明远程访问申请符合制度。

### 其他状态要保留自己的证据

`incomplete` 应保存 `incomplete_details`，`failed` 应保存 Response 的 `error`，`cancelled` 至少保留服务端状态。把它们统称为“模型失败”会丢掉后续排查需要的责任边界。

`queued` 和 `in_progress` 是非终态。只有后台响应同时提供了可检索的响应 ID，应用才可以把它记录为 `pending` 并交给轮询流程。

普通前台调用收到非终态响应，没有后续查询合同时，只能记录 `unknown`。

| 服务端观察 | 应用分类 | 现在能提交普通文本吗 |
| --- | --- | --- |
| `completed`，有普通文本 | `answer` | 只能进入下一层校验 |
| `completed`，有拒绝内容 | `refusal` | 不能 |
| `completed`，无可用文本 | `completed_without_text` | 不能 |
| `incomplete` | `incomplete` | 不能 |
| `failed` | `failed` | 不能 |
| `cancelled` | `cancelled` | 不能 |
| 后台 `queued/in_progress` 且有 ID | `pending` | 等待查询 |
| 前台非终态或未知状态 | `unknown` | 不能 |

表格只列短分类，完整响应中的 `error`、`incomplete_details`、响应 ID 和 usage 必须原样进入受控记录。

分类完成以后，仍然存在一个缺口：流式调用没有一次性 Response，它的证据会分散在事件里。

## 流式调用为什么不能把 delta 当成完成

流式响应把调用过程拆成事件。`response.output_text.delta` 和 `response.refusal.delta` 表示暂时看到了一段内容，不能证明服务端已经结束。

没有任何 delta，也不代表流失败，终止事件可能直接带着完整 Response 到达。

### 终止 Response 才能提交分类

当事件类型是 `response.completed`、`response.failed` 或 `response.incomplete` 时，事件应携带最终 Response。

适配器把这个 Response 交回前面的 `record_response`，这样同步和流式最终使用同一套状态分类。

流式事件可能出现这条路径：

```text
response.in_progress
    ↓ 可选
response.output_text.delta
    ↓ 可选
response.completed / response.failed / response.incomplete
    ↓
record_response(Response)
```

这里的“可选”很重要。终止事件可以在没有 delta 时到达，终止 Response 才是提交分类的证据。完整实现还记录 `sequence_number` 和 `response.id`，用来回放已经观察到的最后位置。

### 独立 `error` 和断流属于另一层

流里单独出现的 `error` 事件带有错误信息，却没有最终 Response。它应该记录为 `provider_stream_error`，不能伪造成 Response 的 `failed`。

因此，`CallRecord` 用 `observed_error_event="error"` 保存这次观察，`terminal_event` 只保留携带最终 Response 的终止事件。

字段名称本身也要反映证据含义，避免下游把协议错误当成完成信号。

如果迭代器在终止事件前抛出超时或连接异常，应用可能已经看到部分文本，也可能已经拿到响应 ID。

这些信息要保留，但结果仍是 `transport_unknown`。正常结束却没有终止事件，同样只能是 `unknown`。

这条边界决定了业务提交规则：任何只看到 delta 的路径，都不能把部分文本写入审批系统。

需要继续处理时，应另行设计有合同的后台查询或幂等恢复，而不是在本次调用记录里猜一个成功状态。

## 没有 Response 时，异常只能说明客户端观察

Python SDK 的异常类型对应不同的观察事实。`APITimeoutError` 和 `APIConnectionError` 说明客户端没有取得可判断的服务端终态，适配器可以记录 `transport_unknown`。

`APIStatusError` 说明客户端取得了 HTTP 层错误，可保留状态码和请求 ID，但它仍然不是 Response 的 `status`。

不要只捕获内置 `TimeoutError`。SDK 使用自己的异常类，测试替身也应通过同一组类型注入：

```python
def openai_sdk_error_types() -> SdkErrorTypes:
    from openai import APIConnectionError, APIStatusError, APITimeoutError

    return SdkErrorTypes(
        timeout=(APITimeoutError,),
        connection=(APIConnectionError,),
        status=(APIStatusError,),
    )
```

创建阶段抛错时，事件流还没有建立，记录 `phase="create"`。

迭代阶段抛错时，记录 `phase="stream"`、最后事件序号、是否观察到部分输出和已知的响应 ID。未知的编程异常应继续抛出，不能为了“保证有记录”而把程序错误吞成网络失败。

## `CallRecord` 要把确定和未知分开

到这里，适配器已经处理三类输入：完整 Response、事件流和 SDK 异常。它们最终写进一条应用层记录。记录至少需要保存：

- 请求语义和执行配置，确认这次调用处理的材料与模式。
- `phase`、供应商 `status`、终止事件和响应 ID，说明观察发生在哪个阶段。
- 应用 `outcome`、普通文本或拒绝内容、usage 和错误详情。
- `observed_error_event`、`partial_output_observed` 与 `last_sequence_number`，让独立错误和断流可以回放。

这些字段帮助程序回答“现在能提交什么”。它们不能回答“用户是否有权限”“制度是否最新”或“申请是否已经成功”。

这些问题属于业务系统的验证器，不能由模型文本或 HTTP 状态代替。

## 测试要证明到哪一层

Fake 客户端适合验证本地归一化器。测试可以构造 `completed`、`incomplete`、`failed`、独立 `error`、终止前断流和 SDK 异常，检查每条记录的分类与字段。

它不能证明真实 SDK 的序列化、网络重试、事件顺序或模型质量。

专用测试至少覆盖以下对照：

| 测试观察 | 应验证的结论 |
| --- | --- |
| 同一请求的同步与流式 | `input` 相同，只有执行字段不同 |
| `completed` 有文本、拒绝、无文本 | status 与内容结果分层 |
| delta 后收到终止 Response | 终止 Response 决定分类 |
| 没有 delta 直接终止 | delta 不是必需前置步骤 |
| 独立 `error` | 流协议错误不冒充 Response.failed |
| 创建或迭代时超时 | 分别保留阶段，结果保持未知 |
| usage 缺失 | 不按字符数伪造 Token 数量 |

本仓库的实现和测试可以直接展开查看：

::: details 展开完整 Responses API 适配器
<<< ../../examples/ai-agent/openai_responses.py
:::

::: details 展开本篇专用状态矩阵测试
<<< ../../examples/ai-agent/tests/test_openai_responses_contract.py
:::

本地运行合同测试：

```bash
PYTHONPATH=examples/ai-agent python3 -m unittest \
  examples/ai-agent/tests/test_openai_responses_contract.py -q
```

测试通过只说明本地控制流和记录字段符合预期。真实 SDK 和供应商行为仍需要隔离的集成测试，不能用 Fake 结果替代。

## 把同步入口接到真实 SDK

真实调用时，模型名和 API Key 从环境变量或密钥系统读取。下面的值是占位符，不应写入脚本、日志或仓库：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install openai
export OPENAI_API_KEY="replace-with-a-secret-from-your-secret-store"
export OPENAI_MODEL="replace-with-a-supported-model"
python examples/ai-agent/openai_responses.py
```

入口只输出脱敏后的 `outcome`、阶段、服务端状态、响应 ID、终止事件、usage 和错误字段，不打印原始输入。

客户端初始化发生在请求归一化之前。没有凭证或客户端配置错误时，应由应用启动边界显式处理；本文的 `CallRecord` 只覆盖已经进入 SDK invocation 的同步/流式请求观察。

Responses API 的创建字段以[创建响应文档](https://developers.openai.com/api/reference/resources/responses/methods/create)为准。

流式事件以[流式事件文档](https://developers.openai.com/api/reference/resources/responses/streaming-events)为准。

Python 异常以[错误类型文档](https://developers.openai.com/api/docs/guides/error-codes#python-library-error-types)为准。

官方文档版本变化时，先核对协议，再更新适配器和测试。

## 一次调用仍不等于业务事实

回到远程访问申请。`answer` 表示服务端完成了普通文本生成，`refusal`、`incomplete` 和 `unknown` 表示当前记录不能直接提交。

即使拿到 `answer`，程序仍要验证用户身份、制度版本、申请状态和允许的副作用。

本文解决的是“调用后能证明什么”。下一篇继续追问“如何让结果满足可解析的结构，以及结构正确为什么仍不能证明业务事实”，进入结构化输出的边界。

接着阅读：[结构化输出约束格式，不证明业务事实](/docs/ai-agent/structured-output-model-boundaries)
