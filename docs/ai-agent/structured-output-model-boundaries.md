---
title: 结构化输出约束格式，不证明业务事实
description: 说明 JSON Schema 能保证什么，以及身份、权限、版本和证据为何仍由程序确认。
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
  - messages-tokens-context
updated: '2026-08-17'
lastUpdated: false
---
# 结构化输出约束格式，不证明业务事实

模型返回了合法 JSON，字段类型也通过 Pydantic 校验，程序仍然可能必须拒绝它。假设对象里有一个格式正确的 `user_id`，这个 ID 可能属于另一位用户；`approved: true` 符合布尔类型，也无法证明审批真的发生过。

**Structured Outputs（结构化输出）** 解决模型和程序之间的格式契约。它减少缺少字段、枚举漂移和自由文本无法解析等问题。身份、权限、当前版本、账户余额、审批状态和证据真伪来自外部系统，JSON Schema 没有能力核实这些事实。

## 一份输出要经过四道边界

结构化对象从模型进入业务动作时，可以沿四层检查：

| 层 | 检查对象 | 典型失败 |
| --- | --- | --- |
| 响应 | API 调用状态与停止原因 | 拒绝、截断、超时、取消 |
| Schema | 字段、类型、枚举与对象形状 | 缺键、额外字段、非法联合类型 |
| 领域规则 | 字段组合和业务不变量 | 上限小于下限、状态迁移非法 |
| 事实与授权 | 字段来源和当前可见范围 | 越权 ID、过期版本、虚假审批 |

第一层失败时通常没有可用候选。第二层通过后，程序只得到一个形状正确的候选。后两层通过，候选才有资格转换成领域命令。

### JSON mode 与 Schema 约束的能力不同

只要求模型输出 JSON，通常只能保证结果可被 JSON 解析器读取，不能保证固定字段存在，也不能限制枚举和嵌套结构。结构化输出把 Schema 一并交给模型服务，格式稳定性更高。

两者都可能得到业务上无效的值。`{"limit": -1}` 是合法 JSON；若 Schema 只声明整数，它甚至符合类型。应用仍需声明范围或执行领域校验。

## Schema 从消费者的分支开始设计

Schema 服务于下游程序的无歧义分支，无需完整描述现实世界。先看消费者要做什么，再决定字段。

一个知识搜索候选可以写成：

```json
{
  "action": "search",
  "query": "远程访问审批条件",
  "limit": 5
}
```

`action` 用枚举限制控制分支，`query` 是模型负责提出的搜索表达，`limit` 有明确上下限。对象里不需要 `user_id`、`tenant_id`、`release_id` 或 `approved`，这些值由认证上下文和运行时快照注入。

### required 只表示字段必须出现

下面的 Schema 要求 `query` 存在，空字符串依然可能通过基础类型检查：

```json
{
  "type": "object",
  "properties": {
    "query": {"type": "string"}
  },
  "required": ["query"],
  "additionalProperties": false
}
```

若空查询没有业务意义，应加入 `minLength`，并在应用层做规范化后的非空检查。只依赖 Schema 仍可能遇到全空格、控制字符或超出检索系统能力的查询。

### 枚举约束选项，不能证明现实状态

把 `status` 限制为 `pending | approved | rejected`，能阻止模型发明第四种字符串。模型选择 `approved` 时，程序仍要查询审批系统。凡是描述外部世界的字段，都要追问它的权威来源。

### 关闭额外字段可以防止接口悄悄扩张

`additionalProperties: false` 能让意外字段尽早失败。若上游开始返回 `user_id`，程序不会静默接收并在未来某次重构中误用。接口需要扩展时升级 Schema 版本，旧版本仍按原合同处理。

## 候选对象和领域命令要分开

直接让模型生成数据库命令，会把概率输出与可信字段混成一个对象。更清楚的设计保留两个类型：

```python
from pydantic import BaseModel, Field


class SearchCandidate(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(ge=1, le=20)


class AuthorizedSearchCommand(BaseModel):
    query: str
    limit: int
    user_id: str
    scope_ids: tuple[str, ...]
    release_id: str
```

`SearchCandidate` 可以来自模型。`AuthorizedSearchCommand` 只能由应用构造，其中可信字段来自已经认证的不可变快照。类型分开后，代码审查能直接看到信任边界。

下面的仓库示例实现了候选解析、额外字段拒绝、范围注入和领域检查：

<<< ../../examples/ai-agent/contracts.py

Pydantic 默认的额外字段策略、严格类型和错误结构会随版本与配置变化，示例项目应锁定依赖，并显式声明关键配置。将字符串 `"5"` 自动转成整数是否可接受，也应由接口合同决定，不能无意依赖宽松转换。

## 格式正确的越权对象怎样被拦住

考虑模型返回下面这份结果：

```json
{
  "query": "某部门的远程访问申请",
  "limit": 10,
  "scope_ids": ["another-team"]
}
```

响应完整，JSON 可解析，字段类型也都合法。`scope_ids` 不属于模型职责。Schema 若关闭额外字段，会在第二层直接拒绝；若历史接口允许该字段，转换函数也必须忽略模型值，用认证上下文里的范围重新构造命令。

“模型刚好返回了正确范围”也不能成为放行理由。安全依赖字段来源，不能依赖值碰巧相等。攻击者若通过提示注入让模型换成另一个范围，运行时应得到相同拒绝结果。

### 空结果要有独立语义

结构化任务经常把空值误作解析失败。搜索成功但没有候选、模型选择无需工具、API 返回不完整对象，是三种状态。可以用显式枚举表达：

```json
{
  "kind": "no_action",
  "reason": "现有证据已经足够"
}
```

`reason` 供解释和调试，程序是否真的允许结束仍由完成条件判断。模型声称证据足够，不能代替覆盖度或引用校验。

## Schema 也有成本和版本

大型 Schema 会占用输入空间，复杂联合类型还会增加模型选择难度。一个工具对象同时承载查询、写入、审批和最终回答，往往意味着职责已经混乱。按动作拆分窄对象，模型更容易生成，应用也更容易授权。

Schema 变更应与模型、Prompt 和消费者版本一起记录。新增必填字段会让旧响应无法解析，放宽枚举可能让旧消费者遇到未知分支。常见迁移方式是保留 `schema_version`，部署期同时读取两个版本，再逐步停止旧版本生成。

不要把完整原始响应当作普通日志。它可能含用户内容和敏感字段。审计记录通常保留请求 ID、Schema 版本、解析状态、错误位置和脱敏字段摘要，原文进入受控存储并按保留策略清理。

## 测试重点放在越界处

结构化输出测试至少需要这些样本：合法候选、缺少必填字段、未知枚举、额外字段、边界数值、空白字符串、错误联合类型、响应截断，以及格式正确但越权的对象。

单元测试可以用固定 JSON 验证本地解析和命令转换。真实模型测试关注模型能否稳定遵守 Schema，不能替代授权测试。最有价值的一条断言通常是：无论模型给出什么 `user_id` 或范围，最终命令都只使用认证上下文中的值。

结构化输出让候选更容易被程序接住，执行权仍留在应用。这个边界一旦含糊，Schema 越完善，错误对象反而越容易顺利进入后续系统。
