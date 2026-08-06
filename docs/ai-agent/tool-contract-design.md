---
title: "Tool Calling 与工具契约设计"
description: "从 Schema、权限、幂等和错误语义设计模型可安全调用的工具。"
category: ai-agent
tags: ["Tool Calling", "Schema"]
updated: 2026-08-06
order: 40
depth: core
series: "Agent 工具系统"
---
# Tool Calling 与工具契约设计

模型输出“查询订单 42”并不等于它已经查过数据库。Tool Calling 的作用是让模型生成结构化调用请求，应用验证并执行，再把结果作为新输入交回模型。

本篇从一个只读天气工具开始，理解工具名称、参数 Schema、执行边界、错误和结果。写操作还需要额外授权与幂等，不在最小示例中假装自动解决。

## 一次工具调用经历什么

```mermaid
flowchart LR
  A[用户问题] --> B[模型选择工具与参数]
  B --> C[程序校验]
  C --> D[执行真实函数]
  D --> E[结构化结果]
  E --> F[模型继续回答]
```

模型只提出调用，程序掌握执行权。工具名、参数和后续解释都属于不可信模型输出。

## 第一步：一个工具只承担一个明确动作

工具名称和描述应说明它做什么、何时使用、不会做什么。`manage_everything` 很难授权和测试；`get_weather` 或 `search_documents` 更容易建立契约。

参数 Schema 用枚举、长度、格式和必填字段限制输入。业务权限、资源所有权和数据库状态仍要在执行时检查，Schema 不能代替鉴权。

## 第二步：先展示最小只读工具

```ts
type WeatherInput = {
  city: string
  unit: 'celsius' | 'fahrenheit'
}

async function getWeather(input: WeatherInput) {
  if (input.city.length > 80) throw new Error('invalid_city')
  const data = await weatherClient.lookup(input.city)
  return {
    temperature: convert(data.temperature, input.unit),
    observedAt: data.observedAt,
    source: data.source,
  }
}
```

输入是经过结构校验的城市与单位，输出是精简的结构化数据和观测时间。函数不会接收任意 URL，也不会把供应商完整响应直接塞回上下文。

## 第三步：错误要告诉 Agent 下一步能做什么

错误可以分为参数错误、无权限、不存在、可重试依赖失败、超时和不可重试业务冲突。只返回“something went wrong”，模型无法决定改参数、询问用户还是停止。

错误结果不应包含堆栈、密钥和内部地址。给模型的是稳定错误代码和安全说明，详细诊断进入受控日志。

## 第四步：写工具为什么更难

创建、修改和删除会产生副作用。除了 Schema，还需要身份、最小授权、幂等键、确认或审批、审计和失败补偿。模型生成的“用户已经同意”不能代替真实确认记录。

高风险操作可以把 Agent 限制在准备草稿或计划，由确定性程序和人完成最终执行。

## 正常结果和失败结果

正常调用先验证 `unit` 枚举和城市长度，再执行受控客户端；供应商超时返回可重试错误，Agent 在预算内重试或说明暂不可用。

失败调用允许模型传入任意命令或 URL，工具直接执行，并把完整异常返回上下文。这同时扩大了注入、越权和敏感信息风险。

## 把一个模糊能力改成可用契约

假设产品提出“让 Agent 查文档”。这个描述还不能实现，因为“查”可能包含搜索、读取全文、导出和修改。第一版可以只提供 `search_documents`：输入查询词和最多返回条数，输出证据 ID、标题、摘要和更新时间。它不接受用户 ID，因为身份应来自服务端会话，也不接受任意过滤表达式，避免调用方绕过范围控制。

| 契约部分 | 初学者容易漏掉的内容 |
| --- | --- |
| 名称与描述 | 说明何时调用，也说明它不会修改文档 |
| 输入 | 类型、长度、枚举、默认值以及未知字段处理 |
| 权限上下文 | 从可信会话注入，不相信模型自报身份 |
| 输出 | 只返回完成当前任务所需字段，并标记来源 |
| 错误 | 区分参数错误、无权限、无结果、超时和依赖故障 |
| 预算 | 最大结果数、执行时间、正文体积和调用频率 |

先分别测试五个情况：合法查询、空查询、超长查询、无权限范围、检索服务超时。测试不只看函数是否抛错，还要确认错误码能指导调用方采取下一步动作，而且日志中没有把敏感正文和认证信息原样记录。

如果以后要增加“更新文档”，应建立新的写工具，而不是给只读工具加一个 `action` 参数。写操作要额外回答谁确认、重复调用是否只执行一次、结果未知时怎样查询、失败后能否补偿。工具越小，权限和故障语义越容易讲清。

## 参考资料

- [OpenAI：Function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI：Using tools](https://developers.openai.com/api/docs/guides/tools)
- [JSON Schema](https://json-schema.org/learn/getting-started-step-by-step)
