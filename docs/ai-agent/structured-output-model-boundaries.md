---
title: 结构化输出约束格式，不证明业务事实
description: 用一份 Pydantic 候选合同连接 Responses API 与本地验证，再从认证上下文构造只读命令，分清格式、事实和权限各自的证据边界。
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
updated: '2026-08-20'
lastUpdated: false
---
# 结构化输出约束格式，不证明业务事实

[上一篇](/docs/ai-agent/python-openai-responses-first-call)把一次 Responses API 调用分成了请求、响应终态、流式事件和 SDK 异常。只有完整、可解析的结果才会进入本篇。现在的问题是：模型已经返回一个符合结构的对象，应用为什么还不能直接执行它？

继续使用远程访问申请这个例子。模型不负责判断申请是否真的被拒绝，也不负责决定当前用户能查看哪些资料。它只提出一个搜索候选：

```json
{
  "query": "设备合规要求",
  "limit": 5
}
```

这两个字段即使类型正确，也只表达模型建议搜索什么。事实来自后续检索结果，权限来自认证上下文，执行结果来自搜索组件。结构化输出解决的是候选能否被程序稳定接住，不会把候选自动升级成可信命令。

## 模型只负责提出搜索候选

先从下游需要的输入倒推模型职责。只读搜索需要查询词和返回数量，还需要当前用户、允许范围和知识版本。前两个值可以由模型建议，后三个值必须来自应用维护的可信上下文。

| 字段 | 来源 | 为什么 |
| --- | --- | --- |
| `query` | 模型候选 | 需要从自然语言问题提炼检索表达 |
| `limit` | 模型候选 | 允许模型按任务选择有限结果数 |
| `user_id` | 认证上下文 | 模型不能声明自己代表谁 |
| `scope_ids` | 授权结果 | 模型不能扩大可见范围 |
| `release_id` | 当前知识版本 | 模型不知道哪个版本仍然有效 |

如果把五个字段放进同一个模型输出对象，代码审查很难看出哪些值可以采信。本文因此保留两个类型：`SearchCandidate` 只装模型字段，`SearchCommand` 只在应用完成认证注入后创建。

## 一份 Pydantic 模型连接 SDK 与本地边界

同一组字段如果在服务端 JSON Schema、Pydantic 模型和手写解析器里各声明一次，很快就会出现合同漂移。服务端可能要求 `limit` 必填，本地解析器却在缺失时补成 `5`；只覆盖本地规则的测试依然会通过。

新实现只保留一个候选类型：

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

`extra="forbid"` 拒绝未声明字段，严格模式不把字符串 `"5"` 转成整数。`query` 会先去掉两端空白，再检查长度；`limit` 没有默认值，因此远端和本地都把它当作必填字段。

Python SDK 的结构化解析入口可以直接接收这个类型：

```python
response = client.responses.parse(
    model=model,
    input="为远程访问问题提出一个搜索候选。",
    text_format=SearchCandidate,
)

candidate = response.output_parsed
```

官方 Structured Outputs 指南把这种用法定义为 Python SDK 的解析 helper。SDK 会根据 Pydantic 类型生成用于请求的结构合同，并把成功结果解析回同一个类型。应用不再手写第二份 Schema，也不需要用另一套 `dict` 规则重复解释字段。

`response.output_parsed` 只属于结构化成功分支。拒绝、不完整响应和调用失败仍要先按上一篇的响应语义处理，不能把它们统称为 Pydantic 错误。若应用只拿到 `None`，也不能构造命令。

## Structured Outputs 的保证停在候选对象

Structured Outputs 和 JSON mode 都能产生有效 JSON，保证范围不同。JSON mode 不保证对象符合应用 Schema；Structured Outputs 在受支持模型与 Schema 子集内提供 Schema adherence。

| 能力 | 有效 JSON | 符合指定 Schema | 证明字段为真 |
| --- | --- | --- | --- |
| JSON mode | 是 | 否 | 否 |
| Structured Outputs | 是 | 是 | 否 |
| 权威系统查询 | 不适用 | 不适用 | 只能证明它负责的当前记录 |

Schema adherence 能排除缺失必填字段、错误类型、非法枚举和额外字段。它无法查询审批数据库，也不知道调用者身份。下面的对象完全可能符合某个 Schema：

```json
{"decision":"approved"}
```

如果 Schema 允许 `approved`，结构检查会通过。这个结果仍然不能证明审批发生过，因为模型只是在允许值中选了一个字符串。

### Pydantic 能表达的规则不一定都进入服务端

Pydantic 模型是代码中的单一合同来源，不代表每一段 Python 逻辑都会变成服务端约束。SDK 需要把模型转换成 OpenAI 支持的 JSON Schema 子集；不受支持的 Schema 会使严格请求失败，Python validator 和本地清理逻辑也不会自动在模型服务内部运行。

所以同一个类型要承担两次不同的检查：

1. SDK 用它声明供应商结构化输出合同。
2. 应用收到候选后，再用它执行本地严格验证和规范化。

两次检查复用同一个类型，但证据来源不同。前者需要真实 SDK 与模型集成测试，后者可以用固定输入完成单元测试。

## 四份错误输入在同一合同里失败

候选合同统一以后，可以直接观察不同输入为什么失败。下面每一行都进入 `SearchCandidate.model_validate`，不再经过手写默认值或宽松类型转换。

| 输入变化 | Pydantic 错误 | 应用判断 |
| --- | --- | --- |
| 缺少 `limit` | `missing` | 合同不完整，不能补本地默认值 |
| `limit` 是字符串 `"5"` | `int_type` | 类型不符合严格合同 |
| 增加 `scope_ids` | `extra_forbidden` | 模型尝试提供可信字段，整份候选拒绝 |
| `query` 只有空格 | `string_too_short` | 规范化后没有可执行查询 |

额外权限字段采用“拒绝”策略，不采用“忽略后继续”。若输入带有 `scope_ids`，调用方要停止当前候选并记录校验失败；它不能删除危险字段后假装原对象可信。

缺少 `limit` 也直接失败。Structured Outputs 要求对象字段列入 `required`，本地再补默认值会制造两套协议：真实服务端不会产生的对象，却能通过本地替身。合同测试必须专门锁住这个分支。

## 认证上下文把候选变成命令

候选通过只说明 `query` 和 `limit` 可被应用读取。接下来由认证系统提供当前用户、允许范围和知识版本：

```python
candidate = parse_search_arguments(model_payload)
command = authorize_search(candidate, auth_context)
result = read_only_search(command)
```

`authorize_search` 不接收模型提供的权限字段。它只能从 `AuthContext` 构造命令：

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

这段转换建立的是输入来源边界。即使模型猜中了当前用户的范围，那个值也不能被采信；如果模型通过提示注入换成另一个范围，结果仍然是在候选解析阶段失败。

`SearchCommand` 构造成功也不是搜索成功。执行组件还要把 `scope_ids` 和 `release_id` 落到真实查询条件中，空结果、存储错误和版本失效各有自己的终态。类型只能让责任变得可见，不能替代实际执行。

## 测试锁住同一份合同

专用测试先检查 Pydantic 生成的本地 Schema。`query` 和 `limit` 必须同时出现在 `required`，对象必须关闭额外字段，字符串与整数边界也要保留：

```python
schema = search_candidate_schema()

assert schema["required"] == ["query", "limit"]
assert schema["additionalProperties"] is False
assert schema["properties"]["query"]["minLength"] == 1
assert schema["properties"]["limit"]["maximum"] == 20
```

这条断言能发现候选模型被改成可选字段或宽松对象，却不能证明 SDK 最终发送的 Schema 与真实模型行为。供应商边界仍需要隔离环境中的集成测试。

权限测试分成两步。带 `scope_ids` 的模型对象必须整体拒绝；只有干净候选才能与认证上下文组合：

```python
with self.assertRaises(ValidationError):
    parse_search_arguments({
        "query": "设备合规要求",
        "limit": 5,
        "scope_ids": ["other"],
    })

candidate = parse_search_arguments({
    "query": "设备合规要求",
    "limit": 5,
})
command = authorize_search(candidate, auth_context)

assert command.scope_ids == auth_context.scope_ids
```

上面的短片段只展示断言关系。页面末尾展开的文件是构建时读取的完整实现和测试，覆盖 Schema、缺失字段、额外字段、严格类型、范围、认证注入和认证信息缺失。

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

当前 8 项专用测试和 235 项 AI Agent Python 测试全部通过。这个结果证明当前工作树里的本地合同和控制流一致，不证明真实模型总会产生正确搜索意图，也不证明外部数据可靠。

## 格式通过以后还缺事实与执行结果

回到开头的候选：

```json
{
  "query": "设备合规要求",
  "limit": 5
}
```

结构化输出能证明两个字段符合候选合同。认证上下文能证明应用用哪个身份和范围构造命令。搜索组件执行后返回的、带来源和版本的资料，才可能支持“申请为什么被拒绝”这个事实判断。

```text
结构化结果
→ SearchCandidate
→ 认证上下文注入
→ SearchCommand
→ 范围过滤后的检索结果
→ 有证据的回答
```

这条链路里没有一步可以越级。格式正确不能跳过授权，授权通过不能跳过范围过滤，检索命中也不能跳过证据核验。

下一篇会继续追问：当应用允许模型在多个动作之间选择时，Agent 的自主性究竟来自哪里，哪些决定仍然必须留在运行时。

接着阅读：[Agent 的定义、自主性与责任边界](/docs/ai-agent/agent-essence-autonomy-boundaries)

官方资料：

- [OpenAI Structured Outputs 指南](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)
