---
title: 结构化输出只能约束格式，不能证明事实
description: 从 JSON Schema 和 Pydantic 校验走到权限、版本、证据与业务字段的服务端确认。
category: ai-agent
part: 模型与 Agent 基础
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
  - messages-tokens-context
updated: '2026-08-14'
lastUpdated: false
---
# 结构化输出只能约束格式，不能证明事实

模型返回一段合法 JSON 后，程序终于可以解析它，但这只是第一层检查。`{"status":"active"}` 语法正确、字段也符合 Schema，仍然不能证明某个账号真的处于启用状态。

## JSON、Schema 和业务命令是三层对象

JSON 解决序列化，保证文本能被解析成对象。JSON Schema 或 Pydantic 继续约束字段、类型、枚举和是否允许额外属性。业务命令还要合并可信身份、权限范围、知识版本和截止时间。

这三层不能合并成一个“模型输出”。模型可以提供查询词和候选分类，服务端必须拥有 `user_id`、`scope_ids` 和 `release_id`。否则模型只要生成一个额外字段，就可能把语言候选变成越权请求。

## 模型只填写不可信字段

下面的例子允许模型候选提供 `query` 和 `limit`。解析函数拒绝额外字段，授权函数再从当前请求的可信上下文生成 `SearchCommand`。

<<< ../../examples/ai-agent/contracts.py

如果候选包含 `scope_ids`，`parse_search_arguments` 会在查询发生前拒绝。即使候选碰巧写出了正确范围，也不应该接受，因为下一次生成可能不同，字段所有权也会变得无法审计。

## 结构化输出怎样进入程序

OpenAI 的[结构化输出说明](https://developers.openai.com/cookbook/examples/structured_outputs_intro)区分了普通 JSON 与按 Schema 约束的输出。严格 Schema 能减少缺字段、错误类型和额外属性，适合把模型候选交给确定性代码。

正常路径是：应用提交 Schema，模型返回候选对象，SDK 或解析器验证结构，服务端做跨字段检查，再合并可信上下文。任何一层失败，都不应继续执行工具。

```text
模型候选 {query, limit}
  -> Schema 校验
  -> 跨字段校验
  -> 服务端注入 {user_id, scope_ids, release_id}
  -> 权限检查
  -> SearchCommand
```

## 跨字段规则仍要写在代码里

单字段类型正确，不代表组合有效。比如 `mode="deep"` 可能要求更长 Deadline，导出操作可能要求人工审批，查询范围也可能受用户角色限制。这些规则依赖当前业务状态，通常不适合交给模型判断。

数据库唯一性、资源是否存在、版本是否仍有效，也只能在相应系统中核对。Schema 不访问数据库，它无法替代事务和并发控制。

## 拒答和解析失败不是一回事

模型可能因为安全策略拒绝请求，也可能返回不符合 Schema 的内容。前者是有意义的模型结果，后者是协议或生成失败。程序应分别记录 `refusal`、解析错误和业务校验错误，不能统一显示成“系统异常”。

对于用户可修复的输入问题，可以返回字段级说明；对于模型连续违反 Schema 的情况，只允许有限重试。每次重试都消耗预算，且无法保证下一次一定正确。

## 结构化成功后的验证清单

解析成功后，继续检查来源是否可见、版本是否固定、目标资源是否存在、动作是否允许，以及请求有没有超过 Deadline。涉及写操作时还要有幂等键和审计记录。

结构化输出最适合做窄接口：意图、查询参数、路由候选和展示数据。让模型生成完整数据库对象、权限上下文或付款命令，会把它推到无法证明真实性的位置。
