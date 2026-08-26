---
title: AI Agent 的自主性从哪里来：模型提议、运行时准入与事实责任
description: 沿远程访问申请的反馈轨迹，区分固定工作流与 Agent，说明模型提议、运行时准入、审批、工具回执和完成验证各自负责什么。
category: ai-agent
part: 模型、调用与 Agent 基础
stageKey: foundations
chapter: 5
sequence: 5
slug: agent-essence-autonomy-boundaries
tags:
  - Agent
  - Autonomy
  - Runtime
sourceKey: ai-agent-essence-autonomy-boundaries
dependsOn:
  - structured-output-model-boundaries
updated: '2026-08-24'
lastUpdated: false
---
# AI Agent 的自主性从哪里来：模型提议、运行时准入与事实责任

[上一篇](/docs/ai-agent/structured-output-model-boundaries)把模型输出限定成了候选对象。候选字段符合结构合同，仍然没有执行权。

现在把候选放进一项多步任务，问题变成：模型如何根据新观察改变下一步，哪些决定仍必须由运行时和业务系统掌握？

用户提出一个目标：“查明我的远程访问申请为什么被拒绝；如果当前条件已经满足，再帮我重新提交。”这句话包含查询、判断和一个可能产生副作用的动作。

系统可以把所有分支写死，也可以让模型在每次回执后提出下一步。

本文只讨论反馈决策和责任边界。模型内部推理、Agent 等级和真实写操作不在范围内。

## 下一步从哪里来，决定系统属于哪一类

先固定观察对象：同一个远程访问申请。三种实现的区别不在于调用了几个工具，而在于下一步由谁产生。

| 实现 | 下一步来源 | 新观察的作用 |
| --- | --- | --- |
| 单次模型调用 | 没有下一步 | 只处理调用前材料 |
| 固定工作流 | 代码预先写好的分支 | 触发既定条件 |
| 反馈 Agent | 模型根据观察提出候选 | 可能改变动作、顺序或停止时机 |

固定工作流也可以有很多分支。只要每个分支条件和路径都由代码写定，模型就没有在运行期间选择下一步。

Agent 的最小差异是反馈后的路径选择。模型看到申请状态后，可以提出读取设备状态，也可以请求用户补材料；运行时仍然要决定这些候选能不能继续。

## Agent 是承载反馈决策的应用系统

本文采用一个系统级定义：Agent 是由运行时承载的反馈决策系统。

模型根据目标、当前状态和新观察，反复提出动作或结束候选；运行时校验候选、执行工具、记录结果，并决定是否继续。

```mermaid
flowchart LR
  S[目标与当前观察] --> P[模型提出候选]
  P --> R{运行时准入}
  R -->|允许| T[工具执行]
  T --> O[写入新观察]
  O --> S
  R -->|暂停或拒绝| X[保留稳定状态]
```

回边是定义的一部分。工具回执成为下一轮输入，模型才有机会因为环境变化调整路径。如果每次回执只触发固定 `if-else`，这个系统依旧可以按工作流理解。

ReAct 论文把行动与环境观察交错作为公开机制。本文只借用“动作产生观察，观察影响下一步”的外部行为，不把模型内部推理当作可审计证据。

## 自主性是一块受约束的选择空间

自主性不是模型天然携带的权限，也不是一个能比较所有 Agent 的等级数字。它描述运行期间委托给模型的选择空间，至少要把以下维度写清楚：

| 维度 | 需要回答的问题 | 远程访问任务的边界 |
| --- | --- | --- |
| 可见观察 | 模型能根据哪些新信息选择 | 申请和设备工具回执 |
| 动作集合 | 模型可以提出哪些动作 | 查询、澄清、重新提交候选 |
| 数据范围 | 动作能触达哪些对象 | 当前认证范围 |
| 持续范围 | 能循环多久、何时停 | 预算、截止时间、终止条件 |
| 升级节点 | 哪些动作要交给别人 | 重新提交前人工审批 |

研究 Agent 可以自由改写查询，却只能读取公开资料；发布助手的路径更固定，但批准后能执行写动作。路径空间和副作用能力是两种维度，不能排成一条高低序列。

模型升级不会自动扩大自主范围。工具目录、数据范围、预算和审批点仍由运行时配置。

## 模型只提议，运行时才决定能否执行

当模型提出重新提交时，返回值应被视为 `ActionProposal`，而不是已执行的命令。提议可以带理由，但不能携带可信身份、范围或批准结果。

```python
proposal = ActionProposal(
    "resubmit_request",
    (("reason", "当前条件已满足"),),
)
```

运行时在模型之外检查动作目录、可信上下文和审批。它把合格候选转换成 `ExecutionCommand`，工具适配器只接收命令。

```python
def evaluate_proposal(proposal, context):
    keys = [key for key, _ in proposal.arguments]
    if len(keys) != len(set(keys)):
        return RuntimeDecision("reject", "duplicate_argument")
    if TRUSTED_ARGUMENTS.intersection(keys):
        return RuntimeDecision("reject", "trusted_context_is_model_controlled")

    if proposal.name == "finish":
        missing = context.required_evidence - context.observed_evidence
        if missing:
            return RuntimeDecision("reject", "completion_evidence_missing")
        return RuntimeDecision("complete", "completion_verified")

    if proposal.name not in context.allowed_actions:
        return RuntimeDecision("reject", "action_not_allowed")
    if not context.actor or not context.scope:
        return RuntimeDecision("reject", "trusted_context_is_missing")

    if proposal.name in context.write_actions:
        expected = ApprovalGrant(proposal, context.actor, context.scope)
        if expected not in context.approvals:
            return RuntimeDecision("pause", "approval_required")

    command = ExecutionCommand(
        name=proposal.name,
        arguments=proposal.arguments + (
            ("actor", context.actor),
            ("scope", context.scope),
        ),
    )
    return RuntimeDecision("execute", "action_allowed", command)
```

函数只负责准入，不调用外部工具。`actor` 和 `scope` 从运行时上下文注入，模型即使猜中相同值，也不能改变可信来源。

## 写动作需要绑定审批和当前上下文

审批不能只绑定工具名称。它至少要绑定动作参数、当前身份和数据范围。参数、身份或范围变化后，旧批准不再匹配。

```python
approval = ApprovalGrant(
    proposal,
    "authenticated_user",
    ("current_user_records",),
)

approved = evaluate_proposal(
    proposal,
    runtime_context(approvals=frozenset({approval})),
)

changed = evaluate_proposal(
    ActionProposal(
        "resubmit_request",
        (("reason", "另一项说明"),),
    ),
    runtime_context(approvals=frozenset({approval})),
)
```

同一个动作名称不代表同一个副作用。审批通过后，工具仍需返回可核验回执，证明实际提交了什么。审批本身不能证明写操作已经成功。

## 工具回执和完成验证各自证明什么

把责任分层后，失败更容易归属：

| 责任 | 最终所有者 | 记录能证明什么 |
| --- | --- | --- |
| 候选生成 | 模型 | 当前观察下提出了哪个动作 |
| 准入与执行 | 运行时、策略和审批者 | 为什么执行、暂停或拒绝 |
| 外部事实 | 工具或领域系统 | 某次查询或写操作的回执 |
| 完成判定 | 完成验证器 | 目标所需证据是否齐全 |

工具拥有它负责的事实。申请接口可以证明申请状态，设备接口可以证明设备状态，通用制度文档不能代替这两项记录。

完成验证器检查整个目标。重新提交工具返回成功，仍要确认申请状态已经改变；原因查清但写动作尚未批准，任务应该停在等待状态。

## 观察变化后，路径才会变化

下面是一条教学轨迹。制度、状态和回执不对应真实系统。

| 当前观察 | 模型候选 | 运行时结果 |
| --- | --- | --- |
| 只有用户目标 | 读取申请状态 | 注入当前范围后执行 |
| 申请状态显示设备不合规 | 读取设备状态 | 只读动作执行 |
| 设备现在已经合规 | 重新提交申请 | 暂停，等待批准 |
| 相同候选得到批准 | 重新提交申请 | 执行并等待工具回执 |
| 回执显示已提交 | 结束任务 | 证据齐全后完成 |

如果第一次回执显示缺少材料，下一步可以变成请求用户补充。路径差异来自观察，执行边界没有因此消失。

## 用不变量测试边界

示例锁住四条不变量：

1. 工具目录外的动作返回 `reject`。
2. 模型填写 `actor`、`scope` 或 `approved` 时整份候选被拒绝。
3. 写动作没有绑定当前候选、身份和范围的批准时返回 `pause`。
4. `finish` 缺少申请状态或设备状态证据时返回 `reject`。

专用测试验证这些规则，不验证在线模型选择、审批服务或真实写入：

::: details 展开动作边界完整实现
<<< ../../examples/ai-agent/agent_boundaries.py
:::

::: details 展开本篇不变量测试
<<< ../../examples/ai-agent/tests/test_agent_boundaries.py
:::

```bash
PYTHONPATH=examples/ai-agent \
  uv run python -m unittest \
  examples/ai-agent/tests/test_agent_boundaries.py -v
```

测试通过证明本地准入逻辑稳定。它不能证明模型会选择正确动作，也不能证明工具回执代表现实世界已经完成。

## 自主性扩大的是提议空间，不是事实所有权

现在可以回到标题。Agent 的定义来自反馈后的路径选择；自主性描述模型可以提出哪些动作、路径、持续时间和升级候选。

责任边界把身份、准入、审批、外部事实和完成裁决交给能够校验并记录它们的组件。

远程访问任务里，模型可以因为设备状态变为合规而提出重新提交，这体现了自主性。它不能自行填写身份、绕过审批或宣布提交成功。

下一篇把这条反馈决策链落成 Python Agent loop，继续处理状态保存、停止条件、异常和完成验证。

接着阅读：[用 Python 写 Agent 循环：模型候选如何推动状态转移](/docs/ai-agent/python-agent-loop-from-scratch)

参考资料：[OpenAI Agent definitions](https://developers.openai.com/api/docs/guides/agents/define-agents)。

[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals) 与 [ReAct](https://arxiv.org/abs/2210.03629)。
