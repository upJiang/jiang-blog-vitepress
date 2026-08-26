---
title: 结构化输出能约束什么，为什么仍不能证明业务事实
description: 从一个搜索候选拆开 Structured Outputs、JSON Schema、Pydantic 与认证上下文，说明格式正确为什么仍不能直接执行。
category: ai-agent
part: 模型、调用与 Agent 基础
stageKey: foundations
chapter: 4
sequence: 4
slug: structured-output-model-boundaries
tags:
  - Structured Outputs
  - JSON Schema
  - Pydantic
sourceKey: ai-structured-output-model-boundaries
dependsOn:
  - python-openai-responses-first-call
updated: '2026-08-24'
lastUpdated: false
---
# 结构化输出能约束什么，为什么仍不能证明业务事实

[上一篇](/docs/ai-agent/python-openai-responses-first-call)把一次 Responses API 调用归一化成了 `answer`、`refusal`、`incomplete` 或 `unknown`。

现在假设调用得到的是一段可以交给程序处理的结果，新的问题随之出现：对象结构正确，应用为什么仍然不能直接执行它？

继续看远程访问申请。用户问：“为什么我的申请被拒绝？”模型提出一个搜索候选：查询“设备合规要求”，最多返回 5 条结果。

这个候选需要稳定的字段形状，但它不应该自己携带用户身份、可见范围或知识版本。

本文沿着一个候选对象走完四层边界：结构合同、本地验证、可信上下文和领域命令。

最后还要接到权威检索结果，因为“申请被拒绝”是业务事实，不能从模型选出的字符串推出来。

## 稳定字段是程序接住模型的前提

如果模型只返回自然语言，程序要从句子里猜查询词和数量。字段缺失、类型变化或混入权限参数时，错误会在更晚的执行阶段暴露。

结构化输出把这一步提前成一个候选合同。本文的候选只包含两个字段：

```json
{
  "query": "设备合规要求",
  "limit": 5
}
```

这两个字段有明确的局限。`query` 是模型对问题的检索表达，`limit` 是它建议的数量。`user_id`、`scope_ids` 和 `release_id` 不属于模型候选，它们要从认证和发布系统读取。

| 字段 | 来源 | 责任 |
| --- | --- | --- |
| `query` | 模型候选 | 提炼检索表达，仍需验证 |
| `limit` | 模型候选 | 选择有限结果数，仍需限界 |
| `user_id` | 认证上下文 | 指定当前主体 |
| `scope_ids` | 授权结果 | 指定可见范围 |
| `release_id` | 知识发布状态 | 指定有效版本 |

字段来源先分开，后面的结构验证和权限注入才有清晰责任。如果把它们全部放进一个模型输出，代码很难看出哪些值可以采信。

## JSON mode 和 Structured Outputs 约束的范围不同

JSON mode 关注结果是否是可解析 JSON。它不能保证对象有 `query` 和 `limit`，也不能保证 `limit` 是整数。

Structured Outputs 在受支持的模型和 JSON Schema 子集内进一步要求结果符合指定结构。它可以排除缺少必填字段、错误类型、额外字段和越界值，但它没有访问审批数据库的能力。

如果 Responses API 返回 refusal 或 incomplete，应用拿到的是调用结果分支，不存在可以授权的候选对象。结构合同不会把拒绝或截断结果转换成 `SearchCandidate`。

| 能力 | 可解析 JSON | 符合指定 Schema | 证明字段描述的现实状态 |
| --- | --- | --- | --- |
| JSON mode | 是 | 不保证 | 否 |
| Structured Outputs | 是 | 在支持范围内保证 | 否 |
| 权威系统查询 | 不负责 | 不负责 | 只能证明它拥有的记录 |

因此，Structured Outputs 的结果应该叫“候选对象”。候选通过合同后，才能进入应用自己的身份、范围和事实校验。

## 用一个 Pydantic 类型保存候选合同

同一组字段如果分别写在远端 Schema、Pydantic 模型和手写 `dict` 解析器里，合同很容易分叉。

比如服务端把 `limit` 设为必填，本地解析器却在缺失时补成 5，Fake 测试就会掩盖真实请求的错误。

当前实现只保留一个 `SearchCandidate`：

```python
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class SearchCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    query: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
    ]
    limit: Annotated[int, Field(ge=1, le=20)]
```

`extra="forbid"` 会拒绝未声明字段，`strict=True` 不会把字符串 `"5"` 偷换成整数。`query` 去掉两端空白后检查长度，`limit` 没有默认值，所以缺字段会直接失败。

Python SDK 的 `responses.parse` 可以把这个模型交给结构化输出入口：

```python
response = client.responses.parse(
    model=model,
    input="为远程访问问题提出一个搜索候选。",
    text_format=SearchCandidate,
)

candidate = response.output_parsed
```

这段调用说明 SDK 与 Pydantic 的连接方式。它不能替代上一篇对 Response 状态的处理。

拒绝、不完整、失败或没有结构化结果时，没有可授权的 `SearchCandidate`，应用不能因为读取了 `output_parsed` 就跳过状态判断。

## Pydantic 的本地规则不会自动变成服务端规则

Pydantic 模型可以生成 JSON Schema，也可以在本地执行校验。

SDK 还要把这份 Schema 转成供应商支持的子集。模型配置、Python validator 或自定义清理逻辑，不会因为写在同一个类里就自动在服务端运行。

这意味着同一个类型承担两次检查：

1. SDK 用它声明服务端要遵守的结构合同。
2. 应用收到候选后，用它验证本地输入并做有限的规范化。

两次检查共享类型，证据来源却不同。前者需要真实 SDK 和供应商集成测试，后者可以用固定输入做单元测试。不要用本地 `model_validate` 的通过结果，替代真实模型 adherence 的证据。

## 失败输入要在候选边界被拒绝

合同真正有用的地方在失败分支。下面的输入都不应进入命令构造：

| 输入变化 | 本地错误 | 为什么停止 |
| --- | --- | --- |
| 缺少 `limit` | `missing` | 服务端和本地不能各自补默认值 |
| `limit` 为字符串 `"5"` | `int_type` | 严格合同拒绝隐式转换 |
| 增加 `scope_ids` | `extra_forbidden` | 模型不能声明可信范围 |
| `query` 只有空格 | `string_too_short` | 规范化后没有查询内容 |
| `limit` 为 0 或 21 | 范围错误 | 数量超出应用合同 |

额外权限字段采用整体拒绝，而不是删除后继续。删除字段会让程序看起来像是“修复”了一个候选，实际上掩盖了模型试图越过输入边界的事实。

缺少 `limit` 也不能由本地默认值补齐。否则供应商合同和本地合同就出现差异，生产环境可能永远收不到一个本地测试中允许的对象。

## 通过候选以后，可信上下文才进入命令

候选通过只说明 `query` 和 `limit` 可以被应用读取。身份、范围和知识版本需要由认证系统和发布系统提供：

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str


@dataclass(frozen=True)
class SearchCommand:
    query: str
    limit: int
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str
```

命令构造函数只接受已经解析的候选和认证上下文：

```python
def authorize_search(
    candidate: SearchCandidate,
    auth: AuthContext,
) -> SearchCommand:
    if not auth.user_id or not auth.scope_ids or not auth.release_id:
        raise PermissionError("search_scope_is_missing")

    return SearchCommand(
        query=candidate.query,
        limit=candidate.limit,
        user_id=auth.user_id,
        scope_ids=auth.scope_ids,
        release_id=auth.release_id,
    )
```

`authorize_search` 没有读取模型提供的 `user_id` 或 `scope_ids`。即使模型猜中的范围恰好与认证结果相同，也不能改变字段的可信来源。

`SearchCommand` 构造成功仍然不是搜索成功。执行组件需要把范围和版本落实到查询条件里，存储错误、空结果和版本失效分别记录。类型让输入责任可见，不能替代真实执行。

## 测试要把合同和权限分开证明

第一组测试检查 Pydantic 生成的本地 Schema：`query` 和 `limit` 都是必填，额外字段被关闭，字符串长度和数量范围存在。

第二组测试逐一提交失败输入，确保解析器不会补默认值或吞掉权限字段。

第三组测试只检查认证注入：干净候选可以构造成命令，缺少任一认证值就抛出 `PermissionError`。

这三组测试分别证明结构、输入边界和可信上下文，没有一组能证明真实模型或业务事实。

```python
schema = search_candidate_schema()

assert schema["required"] == ["query", "limit"]
assert schema["additionalProperties"] is False
assert schema["properties"]["limit"]["maximum"] == 20

candidate = parse_search_arguments({
    "query": "设备合规要求",
    "limit": 5,
})
command = authorize_search(candidate, auth_context)
assert command.scope_ids == auth_context.scope_ids
```

上面只展示断言关系，完整实现和测试由构建时从当前工作树引入：

::: details 展开候选合同与命令构造
<<< ../../examples/ai-agent/contracts.py
:::

::: details 展开本篇合同测试
<<< ../../examples/ai-agent/tests/test_contracts.py
:::

运行专用测试：

```bash
PYTHONPATH=examples/ai-agent \
  uv run --with 'pydantic==2.13.4' \
  python -m unittest examples/ai-agent/tests/test_contracts.py -v
```

这些测试证明当前工作树里的合同和控制流一致。它们不证明真实模型总能提炼正确查询，也不证明检索结果足以回答申请原因。

## 事实证据来自候选以外的系统

把候选、认证上下文和命令放回远程访问问题：

```text
模型候选
    ↓ 结构合同与本地验证
SearchCandidate
    ↓ 注入认证身份、范围和版本
SearchCommand
    ↓ 范围过滤后的只读查询
带来源和版本的检索证据
```

只有最后一层的权威记录，才可能支持“申请为什么被拒绝”。候选查询词帮助系统找到材料，却不能证明材料内容；认证上下文决定谁能读取，也不能制造制度条款。

最小反例是：在另一个明确允许 `decision` 字段的 Schema 中，模型返回 `{"decision":"approved"}`。结构检查只能证明值在允许集合里，无法证明审批系统真的保存过这条决定。

这就是本文的边界。结构化输出解决程序如何稳定接收候选，认证系统解决候选能否在当前范围内运行。

权威数据和执行结果解决事实是否成立。下一篇继续追问，当模型可以在多个动作之间选择时，选择空间和责任边界如何构成 Agent。

接着阅读：[什么是 AI Agent：自主性从哪里来，责任边界怎么划分](/docs/ai-agent/agent-essence-autonomy-boundaries)

参考资料：[OpenAI Structured Outputs 指南](https://developers.openai.com/api/docs/guides/structured-outputs)；[Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)。
