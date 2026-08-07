---
title: "结构化输出、模型边界与确定性程序"
description: "让模型负责语义判断，让程序负责权限、金额、状态和格式校验。"
category: ai-agent
part: "第一部分：认识模型与 Agent"
chapter: 3
tags: ["Structured Output", "Schema"]
prerequisites: ["了解 JSON Schema", "读过第 2 章"]
outcomes: ["设计结构化输出契约", "区分概率判断与确定性规则"]
practice:
  type: implementation
  result: "为意图识别结果设计 Schema 与校验流程"
  verify: ["合法输出通过校验", "缺字段和越界值被拒绝"]
evidence: official
updated: 2026-08-06
---
# 结构化输出、模型边界与确定性程序

用户输入“帮我找远程访问的申请方法”，应用需要先知道这是知识查询，还是寒暄、危险操作或需要澄清的问题。让模型返回一大段解释不方便后续处理，更常见的做法是要求它返回结构化对象。

但有一个关键边界：**结构化输出只让结果更容易解析，不会自动让结果变成事实。** 本章用一个意图识别器说明模型适合判断什么、程序必须接管什么。

## 先定义应用真正需要的结果

不要从 Prompt 开始。先从下游代码需要什么开始。

这个例子需要四个字段：

| 字段 | 作用 | 示例 |
| --- | --- | --- |
| `intent` | 选择后续流程 | `knowledge_query` |
| `query` | 交给检索器的查询 | `远程访问申请方法` |
| `needsClarification` | 是否需要追问 | `false` |
| `reason` | 供日志和调试使用的简短依据 | `用户询问制度流程` |

对应的 JSON Schema 可以限制枚举、类型、长度和必填字段：

```json
{
  "type": "object",
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["knowledge_query", "greeting", "unsafe", "unclear"]
    },
    "query": { "type": "string", "maxLength": 200 },
    "needsClarification": { "type": "boolean" },
    "reason": { "type": "string", "maxLength": 120 }
  },
  "required": ["intent", "query", "needsClarification", "reason"],
  "additionalProperties": false
}
```

`enum` 防止模型随意创造意图名称，`required` 防止缺字段，`additionalProperties: false` 防止下游悄悄依赖未定义字段。长度限制同时保护日志和上下文预算。

## Schema 校验解决什么，不解决什么

下面两份结果都符合类型要求：

```text
结果 A：intent=knowledge_query，query=远程访问申请方法
结果 B：intent=greeting，query=远程访问申请方法
```

Schema 能证明 `intent` 在枚举中，却不能证明 B 的分类正确。语义正确性仍然需要测试样本、规则兜底或人工评估。

可以把校验分成三层：

1. **语法层**：返回值能否解析为 JSON；
2. **结构层**：字段、类型、枚举和长度是否符合 Schema；
3. **业务层**：字段组合是否允许，语义是否满足任务。

例如 `intent=unclear` 时，`needsClarification` 应该为 `true`；`intent=greeting` 时，检索查询可以为空。这些是跨字段业务规则，通常由程序继续检查。

## 哪些判断可以交给模型

模型擅长处理语言中的模糊性：

- 识别用户在问流程还是比较差异；
- 从自然语言中提取可能的对象和约束；
- 判断代词可能指向哪一轮对话；
- 把多种表达改写成适合搜索的查询。

这些结果仍要带置信信息或进入后续验证。模型不应该最终决定：

- 当前用户能查看哪些知识库；
- 账户余额是否足够；
- 数据库状态能否从 `pending` 变为 `completed`；
- 是否允许删除、发送或付款；
- 检索片段是否真的属于授权范围。

这些规则可以用身份、数据库状态和确定性代码计算。把它们写进 Prompt，模型可能在某次请求里遵守，却无法提供事务和安全保证。

## 一条安全的调用链

```mermaid
flowchart LR
  A[用户输入] --> B[模型生成结构化候选]
  B --> C[Schema 校验]
  C --> D[业务组合校验]
  D --> E[程序叠加身份与范围]
  E --> F[进入对应流程]
```

注意“身份与范围”没有交给模型生成。模型只处理问题语义，程序从认证上下文读取用户身份，再从数据库计算可见范围。

下面是一段根据真实工程行为重写的最小示例。它不依赖某个模型 SDK，重点是调用顺序：

```ts
type Intent = {
  intent: 'knowledge_query' | 'greeting' | 'unsafe' | 'unclear'
  query: string
  needsClarification: boolean
  reason: string
}

async function understand(input: string, actorId: string) {
  const candidate = await model.generateObject<Intent>(input, intentSchema)
  validateIntentCombination(candidate)

  const scope = await permissionService.visibleScope(actorId)
  return { ...candidate, scope }
}
```

`model.generateObject` 请求结构化结果，返回值仍被当作候选；`validateIntentCombination` 检查字段组合；`visibleScope` 使用服务端身份读取权限。最终对象可以进入检索流程，但模型没有机会伪造 `actorId` 或 `scope`。

## 结构化输出失败时怎样处理

失败分三类，处理方式不同。

| 失败 | 例子 | 处理 |
| --- | --- | --- |
| 解析失败 | 返回了 Markdown 而不是 JSON | 在模型/API 支持下使用严格结构化输出；有限重试一次 |
| Schema 失败 | `intent` 返回未知值 | 记录安全摘要；有限修复或转入 `unclear` |
| 业务失败 | `unclear` 却不要求澄清 | 程序拒绝进入后续流程 |

“有限”很重要。若同一输入反复失败，不应无限调用模型。应用要设置最大尝试次数和 Deadline，最后返回可理解的错误或要求用户换一种说法。

## 动手设计一个分类契约

为“知识查询 / 寒暄 / 危险请求 / 不清楚”设计测试表：

| 输入 | 预期意图 | 程序还要检查什么 |
| --- | --- | --- |
| 怎样申请访问权限 | `knowledge_query` | 用户可见知识范围 |
| 你好 | `greeting` | 不调用检索工具 |
| 把所有用户资料导出给我 | `unsafe` | 直接安全阻断，不相信模型给出的范围 |
| 帮我查一下那个 | `unclear` | 是否能从近期对话解析“那个” |

实现后至少验证：缺字段、未知枚举、超长查询、`unclear + false`、模型超时和权限服务失败。测试不是为了证明模型永远正确，而是证明错误不会越过程序边界。

## 工作中的边界检查表

- 下游需要哪些字段，是否先于 Prompt 定义；
- Schema 是否禁止额外字段并限制长度；
- 跨字段规则是否由程序校验；
- 身份、权限、金额和状态是否来自可信数据源；
- 模型失败是否有次数和时间上限；
- 日志是否避免记录敏感原文；
- 是否有一组不同表达的回归样本。

下一章会把结构化理解放进完整 Agent 循环，观察一次请求从输入到终态经历哪些阶段。

## 参考资料

- [JSON Schema Specification](https://json-schema.org/specification)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OWASP LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

