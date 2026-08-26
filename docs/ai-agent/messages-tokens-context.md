---
title: Message、Token、Context 与 Context Window：模型输入如何组织、计量和限容
description: 用同一个 OpenAI Responses 请求拆开 Message、Token、Context 与 Context Window，说明输入如何装配、Token 如何计数，以及容量和回放证据的边界。
category: ai-agent
part: 模型、调用与 Agent 基础
stageKey: foundations
chapter: 2
sequence: 2
slug: messages-tokens-context
tags:
  - Message
  - Token
  - Context
  - Context Window
sourceKey: ai-messages-tokens-context
dependsOn:
  - llm-workflow-rag-agent
updated: '2026-08-24'
lastUpdated: false
---

# Message、Token、Context 与 Context Window：模型输入如何组织、计量和限容

应用里有申请状态、制度文档和历史对话，并不等于模型本轮能看到它们。模型只能处理本次请求按协议提交、再由服务端纳入有效输入的内容。

要排查“模型到底看到了什么”，先要把四个经常混在一起的词拆开。

本文只讨论 OpenAI Responses API 的一次文本请求。我们固定一个模型和一组请求参数，用三个只改变一个字段值的请求做对照。

读完后，你应该能回答四个问题：内容按什么结构提交，哪些材料属于本轮 Context，输入和输出占用了多少 Token，以及 Context Window 是否容得下预留的输出。

## 先把四个名词放在不同层级

**Message（消息）** 是一种协议结构。它用 `role` 和 `content` 组织一段输入，或者在响应里表示 assistant 的一个 output item。

Message 只覆盖对话内容的一部分，不能代表顶层 `instructions`、工具定义或完整 Context。

**Token（编码单位）** 是模型编码文本和生成结果时使用的基本单位。`input_tokens`、`output_tokens` 和 `usage` 不是 Token 本身，而是对 Token 数量的测量结果。

Token 数能告诉我们规模，不能反推出消息边界、来源和语义。

**Context（有效上下文）** 是服务端按本次请求合同供模型生成使用的有效输入集合。应用数据库里的材料只是候选来源。

只有被装配进支持的请求字段，并通过模板解析、会话合并或截断规则，材料才可能成为本轮 Context。

**Context Window（上下文窗口）** 是具体模型对本轮输入和生成可使用的总 Token 容量边界。它不是输入内容，也不是 Message 数量。

四个词描述的是同一请求的四个角度，不能排成 `Message → Token → Context → Context Window` 的先后流水线。

把层级分清后，接下来要解决的是集合问题：应用准备的材料，哪一部分真正进入了请求？

## 从应用材料到有效 Context

假设应用保存了申请状态、远程访问制度、过去的对话和工具目录。这些对象先属于应用材料池。

应用要根据权限、版本和相关性选择材料，把它们放入 `instructions`、`input`、`tools`、`prompt` 或会话相关字段。服务端随后按 Responses 合同解析这些字段，才形成本轮有效 Context。

这个过程有两个容易漏掉的边界。

第一，`previous_response_id` 是续接指针，不是历史内容。带上它并不能让应用直接知道哪些旧 item 进入了本轮，必须读取指定 Response 的 input items 或等价证据。

第二，`conversation`、模板变量和 `truncation: "auto"` 可能让服务端加入或删除项目。应用保存的候选历史不能代替本次请求的输入回放。

因此，Context 不是“应用里所有可用材料”的别名。它是一次请求经过装配和服务端处理后的有效集合。

我们先用一个固定模型，把这个集合变化变成可观察的对照。

## 先固定模型和容量

下面三份教学请求都使用精确的 `gpt-4.1`。OpenAI 模型详情页列出它的 Context Window 为 `1,047,576` Token，最大输出为 `32,768` Token。

三份请求还固定 `max_output_tokens: 512`、`truncation: "disabled"` 和 `store: true`。

`512` 是本例为了让容量判断可以代入公式而选的请求参数。它不是模型的最大输出，也不是实测生成数量。

`store: true` 只提供查询指定 Response 的前提，不能替代实际的 input items 回放。

## A 只有用户问题

A 的 `instructions` 为空，`input` 中只有一个 user Message。这里的 JSON 是可发送的请求形状，省略了 SDK 对象写法，方便观察字段层级。

```json
{
  "model": "gpt-4.1",
  "instructions": "",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "为什么远程访问申请被拒绝？"
        }
      ]
    }
  ],
  "max_output_tokens": 512,
  "truncation": "disabled",
  "store": true
}
```

A 建立的是显式输入基线。应用数据库里即使有申请状态和制度，也不能因为材料存在就把它们算进 A 的 Context。要让模型使用它们，应用必须在请求中提交这些材料。

这个基线只告诉我们“问题提交了什么”，还没有回答“规则和证据放在哪一层”。下一步只改变顶层指令。

## B 增加 instructions，不增加 Message

B 保留 A 的 `model`、`input`、Message 数、角色、content 形状、预算、截断策略和存储策略，只把 `instructions` 的值改成：

```text
只根据当前材料回答；材料不足时指出缺口。
```

B 没有新增 Message。这个变化说明顶层 `instructions` 和 user Message 处在不同的输入层。

前者约束本轮生成，后者承载用户问题。一次请求里两者可以同时存在，不能把它们压成一个“消息列表”来解释所有输入。

这个对照只支持结构判断，不支持“指令一定让答案更好”的因果结论。要观察证据如何进入同一个 Message，还要再固定其它字段。

## C 在同一个 input_text 中加入证据

C 保留 B 的所有字段，只把同一个 `input_text.text` 改成下面的教学材料：

```text
为什么远程访问申请被拒绝？

当前证据：
申请状态：已拒绝，原因为设备未通过合规检查。
当前制度：远程访问设备必须通过合规检查。
```

C 没有增加角色，也没有增加 Message。变化发生在同一个 content part 的文本值里。

证据文本是为了演示输入装配，不是真实数据库记录。请求快照只能证明这些字节被提交，不能证明模型已经理解、采信或正确引用证据。

A 到 B、B 到 C 的变量可以写成一张表：

| 对照 | 唯一改变 | 保持不变 |
| --- | --- | --- |
| A → B | `instructions` 的值 | 模型、input 结构、Message、预算和策略 |
| B → C | `input_text.text` 的值 | 模型、instructions、Message、预算和策略 |

这里的“预算和策略”具体指 `max_output_tokens: 512`、`truncation: "disabled"` 和 `store: true`。完整请求仍应逐字段比较，短表格只负责呈现实验变量。

到这里，Context 的变化已经有了具体载体：A 只有问题，B 增加顶层指令，C 在同一个 Message 中增加证据。

接下来需要把 Message、input item 和 content part 的协议边界说准，否则对照会被错误地解释成“多了一个消息”。

## Message、input item 和 content part 的边界

Responses 的 `input` 可以是字符串，也可以是 input item 数组。输入 Message 的 `content` 又可以是字符串，或由 `input_text`、`input_image`、`input_file` 等 part 组成的数组。

下面的文本树只是教学示意，不是可以直接导入 SDK 的 TypeScript 类型，也不是官方 schema 的完整枚举。

```text
Responses 请求的 input
  可以是字符串，或 input item 数组

input item 数组中的一项
  可以是输入 Message
  可以是手动回放的完整 output item
  可以是应用 function calling 的 function_call_output
  也可以是当前 API 支持的其他 input item

输入 Message
  用 role 和 content 组织内容

content
  可以是字符串
  也可以是 input_text、input_image、input_file 等输入 part 数组
```

因此，`input_text` 是 Message 内的 content part，不是另一个 Message。顶层 `instructions` 也有自己的协议位置，不能改写成 user content 来掩盖装配过程。

响应侧的 `response.output` 是 output item 数组，assistant Message 只是其中一种。手动维护下一轮状态时，应追加完整的 output item 集合。

只抽取可见文本，会丢掉工具调用等 item。output Message 的 `output_text` 也不能未经说明就改成新的 user `input_text`。

协议层级解决了“材料怎样排列”，但工具调用还涉及谁负责执行。应用函数和平台托管工具必须分开看。

## 应用 function calling 和托管工具不是一条回传链

### 应用管理的 function calling

在应用管理的 function calling 中，模型先返回一个 `function_call` output item。应用读取参数、执行自己的函数，然后在后续请求提交同一个 `call_id` 对应的 `function_call_output` input item。

下面只展示一个教学字符串结果。字符串里的 JSON 是函数结果内容，不是名为 `structured_value` 的字段：

```json
{
  "type": "function_call_output",
  "call_id": "同一次 function_call 的 call_id",
  "output": "{\"status\":\"approved\"}"
}
```

按照当前 Responses 合同，`output` 也可以是由 `input_text`、`input_image` 或 `input_file` 组成的输出内容列表。

`call_id` 只负责关联调用和回执，不能证明函数结果真实、有权限，或已经被模型正确采用。

### OpenAI 托管工具

Web search、file search、code interpreter 等托管工具由 OpenAI 平台按各自合同执行。

它们在 Response 中使用工具专用 output item，例如 `web_search_call`、`file_search_call` 等，不应统一改写成应用回传的 `function_call_output`。

拿不到某个托管工具的官方 schema 或回放证据时，结果结构保持 `unknown`。

本文的 A/B/C 没有启用工具，所以它们不参与本例的输入计数。扩展到工具请求时，必须把具体工具定义和计数接口支持的形状一起核对。

工具边界清楚后，才有可能讨论 Token。这里要先防止一个常见混淆：创建请求、计数请求和 Response 不是同一份 JSON。

## 创建请求、计数请求和 Response 各自证明什么

创建请求是要执行的 payload。输入计数请求是为 `/responses/input_tokens` 重建的 payload。

计数接口返回 `input_tokens` 数量，Response 对象返回 `output` 与 `usage`。四者的证明能力不同，不能互相冒充。

计数请求至少要使用同一个 `gpt-4.1`，并复现与创建请求等价的 `instructions` 和 `input`。

`max_output_tokens`、`store` 等执行配置不应机械复制到计数请求。若模板、会话或服务端动态加入的项目无法等价重建，计数值和容量判断都只能写 `unknown`。

调用前看到的是输入数量：

```json
{
  "input_tokens": "由计数接口返回的整数"
}
```

调用后从 Response 的 `usage` 读取实际用量：

```json
{
  "usage": {
    "input_tokens": "该 Response 返回的输入数量",
    "output_tokens": "该 Response 返回的生成数量",
    "output_tokens_details": {
      "reasoning_tokens": "可能存在的输出细分"
    }
  }
}
```

`output_tokens` 包含全部生成 Token，不只包含可见文字。`reasoning_tokens` 如果返回，是输出总数的细分，不能再与 `output_tokens` 或 `max_output_tokens` 相加。

字段缺失、为 `null` 或无法取得时，只能记为 `unknown`，不能推断没有不可见生成。

现在已有输入数量，下一步就是把它放进 `gpt-4.1` 的容量公式。

## 用 Context Window 计算容量余量

本例的模型限制是：

```text
model = gpt-4.1
model_context_window = 1,047,576
model_output_limit = 32,768
request_max_output_tokens = 512
```

只有在 count payload 与 create payload 等价，并且计数结果代表同一有效输入集合时，才可以使用下面的保守准入计算：

```text
input_tokens = count_result.input_tokens
window_remaining = 1,047,576 - input_tokens
allowed_output = min(window_remaining, 32,768)
request_admitted = 512 <= allowed_output
```

这个公式只说明固定请求的预算没有超过模型窗口和独立最大输出上限。它不保证服务端一定生成 512 Token，也不证明模型会使用哪段证据。

会话续接、模板解析或自动截断无法被等价计数时，整个准入结论恢复为 `unknown`。

容量公式回答“装不装得下”，还没有回答“哪些输入可以被回放”。最后把证据层级收拢起来。

## 证据能回放到哪一层

不同证据只能支持不同强度的判断：

| 证据 | 可以支持 | 不能支持 |
| --- | --- | --- |
| 应用装配快照 | 哪些材料准备写入请求 | 请求已经发出，或服务端一定使用了材料 |
| 创建请求快照加字段合同 | 哪些字段按合同供本轮生成 | 模型理解、遵循、注意力和答案正确性 |
| 指定 Response 的 input items | 该 Response 可回放的 item 层输入 | 顶层指令、工具定义和 prompt 解析的全部细节 |
| `count_result` | 服务端返回的输入 Token 数量 | 完整 item 清单、来源、真假和回答质量 |
| `response_object.usage` | 该 Response 暴露的输入和输出数量 | 模型关注了哪一段，或回答是否正确 |

`store: true` 只是让 Response 具备后续查询的前提。

响应不可检索、已过期、权限不足，或者 input items 接口不可用时，不能拿字段名称和响应 ID 猜测历史归属。

同样，`previous_response_id` 只证明请求携带了续接指针。某个历史 item 是否属于指定 Response，要由该 Response 的 input items 或等价供应商证据证明。没有证据，就写 `unknown`。

## 回到开头的问题

“模型一次调用看到了什么”不能靠猜应用数据库里有什么来回答。

需要沿着四个层级核对同一份请求。Message 说明内容怎样组织，Context 说明哪些材料按合同成为有效输入。

Token 说明输入和生成的数量，Context Window 说明这些数量是否落在精确模型的容量边界内。

A、B、C 让这条关系变得可回放：A 只有问题，B 增加顶层指令，C 在同一 Message 中加入教学证据。

计数请求给出输入数量，Response usage 给出调用后的用量，input items 在可查询时补足 item 层回放。它们仍然不能证明模型关注了哪一段，也不能替答案做事实担保。

下一篇会把这套证据分层落到 Python 请求日志和测试：如何保存 create payload、等价 count result、Response usage 和 input items。

文章还会处理请求失败或上下文不可回放的情况，保留 `unknown`，而不是写一个看似精确的内部 ID。

## 接口边界变化时怎样重新核对

本文把 Message、Token、Context 与 Context Window 落到了具体的 Responses 请求上，这些字段会随 API 和模型版本变化。实现前要按判断对象回到对应事实源：

- 模型容量与独立输出上限查 [GPT-4.1 模型详情](https://developers.openai.com/api/docs/models/gpt-4.1)。更换模型后，旧数值不能继续沿用。
- `instructions`、`input`、`store` 与 `truncation` 的请求形状查 [Responses Create](https://developers.openai.com/api/reference/resources/responses/methods/create)。
- 调用前的输入数量按 [Token counting 指南](https://developers.openai.com/api/docs/guides/token-counting) 构造 `POST /v1/responses/input_tokens` 请求，调用后的实际用量读取 Response `usage`。
- 指定 Response 能回放哪些 item，查 [Responses Input Items](https://developers.openai.com/api/reference/resources/responses/subresources/input_items/methods/list)。这个接口不能补出顶层字段，也不能证明模型注意了哪段内容。
- 续接与工具输入分别按 [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state)、[Token counting](https://developers.openai.com/api/docs/guides/token-counting) 和 [Function calling](https://developers.openai.com/api/docs/guides/function-calling) 核对，不能用一个通用“消息历史”模型覆盖它们。

核对后的字段合同、计数请求与回放结果要绑定同一个模型和请求版本。任一环节无法等价重建时，容量或历史归属保持 `unknown`。
