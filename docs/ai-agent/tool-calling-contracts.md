---
title: Tool Calling 的提议、校验与执行契约
description: 拆开工具描述、参数 Schema、模型候选、可信上下文、执行结果和错误回传。
category: ai-agent
part: 工具、MCP 与 Skill
stageKey: tools
chapter: 8
sequence: 8
slug: tool-calling-contracts
tags:
  - Tool Calling
  - Contract
  - JSON Schema
sourceKey: ai-tool-calling-contracts
dependsOn:
  - python-agent-loop-from-scratch
updated: '2026-08-17'
lastUpdated: false
---
# Tool Calling 的提议、校验与执行契约

模型可以提出“查询远程访问制度”，程序才决定这次查询能不能发生。**Tool Calling（工具调用）** 是模型候选和外部能力之间的交接协议，包含工具目录、参数 Schema、调用身份、可信上下文、执行回执和错误状态。

把函数名写进提示词，或者拿到一段 JSON 就直接调用，都缺少关键边界。模型返回的 `user_id` 可能越权，工具超时后可能已经产生副作用，迟到结果还可能覆盖用户刚刚取消的任务。

## 一次调用有哪些状态

```text
candidate → validated → approved → executing → succeeded
                                      ↘ failed / unknown
```

`candidate` 来自模型，之后的状态由运行时推进。`unknown` 特别重要，它表示传输层没有确认外部动作是否发生，重试前必须先查询幂等回执。

一个调用至少带上这些身份：

| 身份 | 作用 |
| --- | --- |
| `run_id` | 关联整次 Agent 执行 |
| `call_id` | 将模型候选和工具结果配对 |
| `tool_version` | 还原当时的 Schema 与实现 |
| `state_version` | 防止迟到写入覆盖新状态 |
| `scope_snapshot` | 固定可见对象与权限 |

只记录工具名和返回文本，出现并行、重试或恢复时就无法判断结果属于哪一次执行。

## 目录描述影响模型选择

工具描述要说明动作、输入、结果和限制，避免把权限承诺写成自然语言。例如 `search_policy` 的描述应明确只读、返回制度片段、不能查询个人申请状态。描述越含糊，模型越容易在错误场景选择它。

目录按任务过滤比把所有工具都交给模型更稳。研究问题只展示搜索和读取，代码任务再暴露文件工具，写操作要单独经过策略。目录变化会改变模型的选择分布，因此目录版本也要写入 Turn 快照。

## 参数先做结构校验，再做业务校验

Schema 检查类型、必填项、枚举和范围，业务校验检查对象存在、状态允许、用户可见和资源版本匹配。两者不应合并成一个模糊的 `validate()`，否则审计时看不出越权发生在哪一层。

```python
candidate = SearchPolicyArgs.model_validate(raw_args)
command = AuthorizedSearch(
    query=candidate.query,
    limit=candidate.limit,
    user_id=auth.user_id,
    scope_ids=auth.scope_ids,
    release_id=runtime.release_id,
)
authorize(command, policy)
```

可信字段从认证和运行时快照取得。模型即使返回另一个 `scope_ids`，转换函数也不读取它；未知字段在解析阶段被拒绝，防止未来代码偶然采用。

## 结果必须返回结构化状态

工具适配器不应只返回字符串。建议至少包含状态、调用 ID、来源、摘要和原始回执引用：

```json
{
  "call_id": "call-42",
  "status": "success",
  "source": "policy-service",
  "payload": [{"title": "设备合规", "text": "..."}]
}
```

返回给模型的 `payload` 可以是裁剪后的预览，原始响应放在受控存储。空结果和权限拒绝不能用同一个空数组表示，后续规划需要知道是“没有资料”还是“没有权限”。

## 超时与重试要看副作用

只读查询超时，经过有限退避后可以重试；写工具超时先查回执。未知状态下再次执行，可能造成重复发送或重复扣款。幂等键应由运行时生成并贯穿重试，不能让模型每次重写一个随机键。

工具错误回传给模型时，隐藏内部凭证、SQL 和堆栈，只提供可行动的分类，例如参数错误、权限拒绝、暂时不可用和结果未知。模型可以基于“参数范围无效”修正一次，不应根据“权限拒绝”尝试换用户或扩大范围。

## 最小执行入口

仓库示例把目录、候选、授权执行和结构化结果拆开，便于对每个边界测试：

<<< ../../examples/ai-agent/tool_runtime.py

测试替身只证明本地控制流。真实工具还要验证认证、超时、限流、数据范围、响应大小和撤销能力，不能因为单元测试返回成功就把写工具上线。

## 失败状态要影响下一轮

模型收到 `success` 观察，可以补充回答或继续查询；收到 `empty`，可能改写查询；收到 `denied`，应停止该路径并说明范围；收到 `unknown`，需要回执查询；收到 `timeout`，只能在剩余预算内决定重试。状态不完整时，模型只能猜。

无进展检测可以比较规范化工具名、参数和观察摘要。相同候选连续出现时，运行时给一次具体反馈并扣除预算，仍无变化就停止。让模型自由生成“再试一次”不是进展策略。

## Tool Calling 与相邻机制的边界

普通 API 是应用代码主动决定调用，工具调用允许模型提出候选。MCP 规定跨进程或跨服务发现、协商和调用的协议，Tool Calling 仍负责本地模型与工具目录的交接。Skill 保存任务知识与操作步骤，不能凭文本获得权限。工作流固定控制图，Agent 循环在运行中选择路径。

一个系统可以同时采用这些机制：MCP Server 提供工具，Skill 告诉模型何时使用，运行时按 Tool Calling Schema 解析候选，工作流负责审批与发布。边界清楚后，出现错误时才知道该查协议、策略、模型还是工具实现。

## 契约测试要断言状态，不只断言文本

测试应覆盖合法候选、未知工具、额外字段、越权范围、边界参数、权限拒绝、超时、未知副作用、重复提交、迟到回执和取消竞态。每条用例同时检查调用次数、状态版本、幂等键、审计事件和终态。

一次成功返回只证明适配器完成了传输。真正的契约要求：未经授权的候选永远不会执行，结果永远能找到所属调用，失败不会伪装成完成，恢复不会扩大权限。
