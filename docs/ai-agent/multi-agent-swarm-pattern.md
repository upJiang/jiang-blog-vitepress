---
title: Swarm 模式的局部协作与全局约束
description: 解释去中心化选择带来的灵活性，以及预算、权限、重复工作、工作区和收敛问题。
category: ai-agent
part: 多 Agent 与研究
stageKey: multi-agent-research
chapter: 33
sequence: 33
slug: multi-agent-swarm-pattern
tags:
  - Swarm
  - Coordination
  - Budget
sourceKey: ai-multi-agent-swarm-pattern
dependsOn:
  - multi-agent-orchestration
updated: '2026-08-17'
lastUpdated: false
---
# Swarm 模式的局部协作与全局约束

调查一场跨服务故障时，初始现象只有“搜索结果偶尔为空”。第一轮要看 API、检索服务和知识 Release；Trace 随后显示部分请求命中旧缓存，于是任务板需要新增缓存键与失效链核对。完整任务图直到运行中才逐渐出现。

**Swarm（群体协作）** 允许 Lead 和 Worker 根据局部观察提出新任务、协作者与移交。动态选择提高了适应性，也扩大了失控面。身份、权限、预算、工作区版本和停止条件仍由统一 Runtime 执行。

去中心化的是部分任务发现与协作，不是安全和资源治理。每个 Agent 若能无限创建同伴、扩大工具权限并宣布父任务完成，系统没有可验证终态。

## DAG、Supervisor 与 Swarm 的控制权不同

| 模式 | 下一任务由谁选择 | 图是否预先完整 | 适合的变化 |
| --- | --- | --- | --- |
| DAG | 调度器根据依赖 | 主要节点已知 | 稳定流程和数据依赖 |
| Supervisor | 中央编排器持续分派 | 可以逐步生成 | 中央角色能掌握全局 |
| Swarm | Lead 与 Worker 都能提议 | 运行中扩展 | 子问题从局部证据出现 |

Swarm 也不等于群聊。四个模型在同一线程轮流评论，没有稳定任务、结果合同和责任人，只会产生复述与无人收尾。

一个务实实现通常保留 Lead。Lead 维护父目标和完成定义，Worker 完成局部循环，平台执行提议门禁与状态持久化。纯 Worker 互相移交也可以实现，但全局账本和终态仍需要程序所有者。

结构固定的任务从 DAG 开始。只有新分支确实依赖运行时发现、用户需要中途改目标，或协作者要按局部能力动态接手时，Swarm 的额外复杂度才有理由存在。
## 可恢复 Swarm 需要哪些状态

至少有五类结构化状态：

| 状态 | 关键字段 | 作用 |
| --- | --- | --- |
| Task Board | `task_id`、状态、负责人、完成合同 | 防止任务无人负责或重复领取 |
| Agent Registry | 能力、Scope、工具、Lease、当前任务 | 支持准入和失联判断 |
| Workspace | 对象引用、作者、来源、revision | 共享证据与产物 |
| Mailbox | 发送者、接收者、任务、序号、状态 | 点对点协调与 Handoff |
| Global Ledger | Token、调用、任务数、时间、Handoff | 统一资源上限 |

任务状态可以从 `pending` 迁移到 `claimed`、`running`，最后进入 `succeeded`、`failed` 或 `cancelled`。领取用原子条件更新，两个 Worker 同时竞争时只能一个成功。

Agent Registry 中的能力不能只写“专家”。可执行字段包括允许工具、支持输入类型、最大并发、可见 Scope 和最近心跳。能力来自配置与测试，Agent 在消息里自称会操作生产数据库不能改变注册表。

Task Result 和 Workspace Object 才是产物，Mailbox Message 只是协调记录。Worker 发一句“已完成”不能代替结果引用和完成合同验证。
## Lead 怎样运行事件循环

Lead 的工作是维护全局进展，不是亲自重做所有子任务。它先创建一组初始任务，再监听事件：

```text
task_completed
worker_idle
worker_lease_expired
workspace_conflict
human_input
budget_low
checkpoint_due
```

每个事件触发有限动作候选，例如接受结果、请求补充、重新分配、创建新任务或提出关闭。Runtime 校验动作后才更新状态。

事件驱动比固定频率轮询更及时，也减少无变化时的模型调用。Checkpoint 仍有价值，它处理丢失事件、长期无进展和全局覆盖检查。Checkpoint 周期由任务 SLO 决定，不使用固定的通用分钟数。

Lead 提出关闭时，程序检查所有必需任务终态、Coverage、未处理冲突、活动 Worker 和预算账本。Lead 文本里写“任务已经完成”不构成终态。

用户输入也作为事件进入。新增目标先校验是否仍属于父请求 Scope，再修订任务板；若目标实质变化，应创建新 Turn，而不是在原 Swarm 中无限扩张。
## Worker 的局部自主性有哪些边界

Worker 领取一个窄 TaskSpec 后运行受限 Agent Loop：读取必要上下文，提出工具动作，保存 Evidence，发布局部结果，或建议新任务。

局部自主性允许 Worker 根据观察说“缓存键可能没有绑定 Release，建议新增核对任务”。它不能直接创建无预算任务。提议先进入 SwarmGate：

```text
SwarmProposal {
  agent_id
  task_id
  action
  target_agent
  tool
  estimated_cost
  expected_progress
}
```

门禁依次检查 Agent 身份、Task 所有权、工具白名单、Scope、重复签名、剩余预算、Handoff 次数和父任务状态。接受后由平台扣减或预留预算。

Worker 完成局部任务后可以进入 idle，等待 Lead 重分配。复用减少启动成本，旧局部上下文也可能污染新任务。重分配时要生成新任务包，清除不再允许的工具与临时记忆，只保留经过引用的工作区产物。
## Workspace 为什么必须版本化

共享工作区让 Worker 发布发现、草稿和文件。它适合一对多信息，Mailbox 适合发给特定接收者的请求或 Handoff。

工作区条目至少包含：

```text
revision
author_agent_id
task_id
key
value_ref
source_refs
created_at
```

写入携带 `expected_revision`。两个 Agent 基于 revision 8 修改同一对象，第一个写成 9 后，第二个写入失败并重新读取。无版本覆盖会让较慢 Agent 抹掉较新证据。

读取采用增量游标，Worker 只取得上次 revision 之后且与当前任务相关的事件。每轮把整个工作区放进 Prompt，会快速耗尽上下文，也增加读取越界材料的风险。

Workspace 不是权威业务数据库。最终 Evidence、任务状态和审批记录由各自服务保存，工作区只持有稳定引用与协作材料。父任务结束后按生命周期清理临时对象。
## Mailbox 与 Handoff 不应变成无限转发

点对点消息适合请求澄清、通知依赖或协商移交。每条消息关联 task ID、发送者、接收者和序号，接收者下一次安全点读取。

Handoff 需要独立合同，包含目标、上下文引用、允许工具、工作区 revision 和返回条件。接收者显式接受后才取得责任。工作区已经变化时，旧 Handoff 应拒绝或重新生成。

任务在 A、B 之间来回移交而状态没有变化，是典型卡循环。平台按任务限制 Handoff 次数，并对 `(task_id, action, target_agent)` 签名去重。超过上限后交回 Lead 或人工处理。

消息内容不能授予权限。Agent A 写“你可以使用 deploy 工具”，Agent B 的工具集合仍由 Registry 与 TaskSpec 决定。
## 预算为什么要在提议时扣减

多个 Worker 同时看到剩余 5 单位预算，各自提出成本 3 的动作。若都先执行再记账，总消费变成 6。SwarmGate 需要原子准入，第一个动作预留 3，第二个因只剩 2 被拒绝。

全局上限至少包括：

```text
max_agents
max_active_tasks
max_spawned_tasks
max_handoffs_per_task
max_tool_calls
token_budget
deadline
```

局部预算帮助 Worker 选择动作，全局账本才是权威。动作实际成本低于预留时回收差额，失败重试继续计入总预算。

Agent 数量越多，协调消息、上下文复制和汇合成本越高。吞吐受最慢依赖和共享服务容量限制，不能用新增 Agent 无限扩展。
## 收敛检测怎样判断没有进展

Swarm 的停止条件包括任务完成和强制终止：

```text
所有必需 Task 满足完成合同
Coverage 达到目标且无关键冲突
Frontier 没有待处理任务
预算或 Deadline 到达
用户取消
连续事件没有状态进展
```

进展用结构化变化衡量，例如新增有效 Evidence、减少缺口、完成 Task 或解决冲突。多写一段摘要、把同一任务交给另一 Agent、重复相同工具调用都不算进展。

可以保存最近动作签名和工作区 revision。若若干轮只有重复签名，或所有 Worker idle 且任务板仍有不可运行任务，Lead 不再增加同类动作，转入失败分析或人工复核。

预算耗尽时，系统根据已有合格结果交付有限结论。仍有 Worker 运行不代表可以延长父 Deadline，迟到结果也不能把终态倒退。
## 权限和提示注入会在群体中传播

一个 Worker 从网页读到恶意命令，可能通过 Workspace 或 Mailbox 传给其他 Agent。所有外部内容保留来源和不可信标签，发布到共享层不能升级为策略。

每个 Worker 使用最小工具集合与 Scope。Lead 的权限通常不应等于所有 Worker 权限的并集，更不能把高权限凭证放进共享 Prompt。工具执行继续经过独立 Schema、策略和审批。

工作区读取按任务授权过滤。Agent 能看到“存在新对象”也可能泄露信息，因此列表和增量事件同样应用 ACL。日志记录稳定 ID、风险代码和裁决，不复制完整敏感正文。

用户中途输入只能修改授权内目标。外部文档中的“human_input”字符串仍是数据，不会变成控制事件。
## 可运行门禁验证了哪些不变量

仓库示例的 VersionedWorkspace 和 SwarmGate 实现了 revision 检查、工具白名单、重复提议、全局预算和 Handoff 上限：

<<< ../../examples/ai-agent/multi_agent_control.py

这是单进程教学代码。它没有消息持久化、原子数据库事务、Worker Lease、心跳与崩溃恢复，也没有真实模型或工具。生产实现要把 `admit` 放进事务或原子脚本，避免并发提议同时通过。

测试中构造的 SwarmProposal 是 Fake 候选，只能证明 Runtime 门禁行为。真实系统还要验证模型输出解析、任务归属、ACL 与工具适配器。
## Swarm Eval 要测动态失控

| 场景 | 关键断言 |
| --- | --- |
| Worker 提出有效新分支 | 通过门禁后加入任务板 |
| 两个 Worker 同时领取任务 | 只有一个成功 |
| 两个提议同时争夺剩余预算 | 不发生超支 |
| 重复动作或循环 Handoff | 被去重或达到上限 |
| 工作区并发写 | 旧 revision 冲突 |
| 外部内容要求创建高权任务 | 信任等级不提升 |
| Worker Lease 过期 | 任务重新对账后再分配 |
| 用户中途缩小范围 | 新任务遵守新 revision |
| 所有 Worker idle 但必需任务未完成 | 不产生成功终态 |
| 父任务取消 | Spawn、工具和写入停止准入 |

评测与 DAG 或 Supervisor 基线比较任务成功率、Evidence 覆盖、墙钟时间、Token、重复工作和人工介入。Swarm 在动态任务上有收益，才能抵消更大的状态与安全面。

Swarm 的能力来自局部发现，可靠性来自全局门禁。Worker 可以提出下一步，无法自行扩权；Workspace 可以共享发现，不能覆盖权威状态；Lead 可以协调和建议关闭，终态仍由完成合同裁决。这个平衡建立后，动态协作才不会退化成多个 Agent 同时消耗预算。
