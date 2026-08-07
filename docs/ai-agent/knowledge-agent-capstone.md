---
title: 知识 Agent 工程实践：从文档进入系统到可审计回答
description: 把导入、版本、权限、检索、工具、证据、事件、取消、恢复、评测和观测串成一条匿名工程实现。
category: ai-agent
part: 答案质量与运行
chapter: 28
tags:
  - Agent
  - RAG
  - State Machine
  - Evidence
prerequisites:
  - 理解 Agent 生命周期
  - 了解文档导入、检索与证据验证
outcomes:
  - 画出知识 Agent 完整执行链
  - 区分当前实现、设计建议与可选演进
practice:
  type: implementation
  result: 完成一份知识 Agent 架构图、状态表和验收清单
  verify:
    - 正常、无证据、无权限、取消和恢复均有终态
    - 每个事实结论能追溯到可见证据
evidence: anonymized-practice
updated: 2026-08-07
---
# 知识 Agent 工程实践：从文档进入系统到可审计回答

前面的文章分别讲了 Agent、状态图、工具、MCP、Skill、文档解析、切片、Embedding、检索和证据。真正开始工作时，问题不是“每个概念会不会背”，而是这些能力能否沿一条请求链正确协作：用户提问后，系统如何确认范围，如何找到资料，如何证明答案，用户断开或 Worker 重启时又怎么办。

这篇把这些能力串成一个匿名的只读知识 Agent 蓝图。它不是私有项目源码，也不把未验证的组件写成现状。你会得到三件可以带走的工程产物：一张分阶段架构图、一张状态表和一份验收清单。

## 先看用户真正看到的结果

用户问：

> “生产环境访问申请需要谁审批？有效期多久？”

一个可信回答至少要带出两个事实和对应位置。如果只有一个“看起来合理”的句子，没有版本、范围和证据，它仍然是不合格的。系统应能给出三类终态：

```text
completed  找到可见证据，回答并引用
no_evidence  在允许范围内没有足够证据，明确说明缺口
rejected  用户没有访问该范围，拒绝透露越界内容
```

`no_evidence` 与 `rejected` 不能混成“没找到”。前者是资料覆盖或查询表达的问题，后者是权限边界，处理动作完全不同。

## 把系统拆成六个阶段

```mermaid
flowchart LR
  U[问题与用户范围] --> Q[创建回合并固定版本]
  Q --> I[理解问题和安全准入]
  I --> R[按权限执行混合检索]
  R --> E[整理 Evidence 和 Claim]
  E --> A[生成回答、引用和事件]
  A --> V{验证是否通过}
  V -->|是| D[完成并记录观测]
  V -->|否| X[拒答、有限修复或失败]

  classDef input fill:#DDF8F2,stroke:#0F766E,color:#134E4A;
  classDef program fill:#DBEAFE,stroke:#2563EB,color:#1E3A8A;
  classDef model fill:#F3E8FF,stroke:#9333EA,color:#581C87;
  classDef tool fill:#FFEDD5,stroke:#EA580C,color:#7C2D12;
  classDef data fill:#FEF3C7,stroke:#CA8A04,color:#713F12;
  classDef success fill:#DCFCE7,stroke:#16A34A,color:#14532D;
  classDef failure fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D;
  class U input;
  class Q,I,V program;
  class R,E tool;
  class A model;
  class D data;
  class X failure;
```

用户输入和授权范围进入系统后，先创建一个有稳定 ID 的回合。回合固定知识版本、策略版本和截止时间，避免运行期间混用不同快照。理解阶段把问题拆成检索计划；检索阶段在 SQL 和搜索通道中执行权限过滤；证据阶段把候选转换成可引用的 Evidence 和 Claim；回答阶段只使用被选中的证据；验证失败时不能直接把草稿当成答案。

## 阶段一：创建回合，而不是只接收 HTTP 请求

HTTP 连接可能中断，用户也可能重复点击。系统需要一个比连接更稳定的业务对象，可以叫 `Turn` 或“回合”。它至少保存：

| 字段 | 作用 |
| --- | --- |
| `turn_id` | 关联事件、答案、引用和观测 |
| `conversation_id` | 找到会话级上下文 |
| `user_id` | 由认证层提供，不接受模型自报 |
| `knowledge_version` | 固定本次检索可见版本 |
| `policy_version` | 固定安全、预算和路由规则 |
| `scope_snapshot` | 固定用户被授予的范围 |
| `deadline_at` | 整轮截止时间 |
| `status` | 当前状态和终态 |
| `idempotency_key` | 防止重复创建 |

创建流程：验证用户身份和知识库权限 → 按幂等键查询已有回合 → 固定快照和 Deadline → 写入 `turn.created` 事件 → 投递执行任务。数据库唯一约束和锁负责最终去重，Redis 等短期协调工具不能成为最终事实。

幂等键不能只放在内存字典中。两个 API 实例同时收到相同请求时，只有数据库约束才能保证只创建一个回合。另一个请求应读取已存在记录，而不是重新消耗模型和检索资源。

## 阶段二：理解问题，但不让模型接管权限

模型适合把自然语言转换成结构化意图，例如：

```json
{
  "intent": "lookup_policy",
  "entities": ["生产环境", "访问申请"],
  "requested_fields": ["审批人", "有效期"],
  "needs_exact": true
}
```

程序随后检查 `intent`、字段枚举、用户范围和允许的数据源。模型不能把 `scope`、租户、角色或“管理员”写进输出就自动获得权限。

如果问题只是固定状态查询，确定性工作流可能已经足够；如果需要多轮检索、根据证据缺口选择下一步，才有 Agent 循环的价值。不要为了把每个查询都包装成 Agent 而增加不可控的步骤。

## 阶段三：检索前后都做范围过滤

检索应该返回候选证据，而不是直接返回“最像的文字”。一个候选至少包含：

```text
chunk_id
document_id
knowledge_version
section_path
chunk_type
content
source_location
acl_scope
retrieval_channel
retrieval_score
```

SQL 或搜索请求先过滤知识库、已激活版本、状态和 ACL，再执行精确、全文、向量或表格通道。缓存键必须包含用户范围和版本，否则一个用户的结果可能被另一个用户命中。

检索完成后还要做一次可见性复核。原因是回合执行可能跨过权限撤销；创建时快照决定版本语义，但当前权限策略可能要求在输出前再次阻止已撤销对象。系统要明确采用哪一种策略，并把结果写入观测。

## 阶段四：Evidence 和 Claim 是两个对象

Evidence 是系统看到的来源片段，Claim 是回答准备表达的事实。一个 Evidence 可以支持多个 Claim，一个 Claim 也可能需要多个 Evidence。不要把一段长上下文直接作为“引用”。

```mermaid
flowchart LR
  E1[表格行：生产 | 业务负责人 | 7 天] --> C1[Claim：生产审批人为业务负责人]
  E1 --> C2[Claim：生产访问有效期为 7 天]
  C1 --> A[回答草稿]
  C2 --> A
  A --> V[引用、权限和字段验证]

  classDef data fill:#FEF3C7,stroke:#CA8A04,color:#713F12;
  classDef model fill:#F3E8FF,stroke:#9333EA,color:#581C87;
  classDef success fill:#DCFCE7,stroke:#16A34A,color:#14532D;
  class E1 data;
  class C1,C2,A model;
  class V success;
```

验证器至少检查：Claim 是否能在 Evidence 中找到直接支持，引用位置是否与展示文本一致，Evidence 是否仍在用户范围内，答案是否加入了没有证据的程度副词或推测。没有支持的 Claim 要么删除，要么标记为不确定并说明缺口。

## 阶段五：生成回答时保留事件

用户看到的流式文字不是唯一事实。系统还要持久化关键事件，便于断线重放和排障：

```text
turn.created
query.interpreted
retrieval.started
evidence.selected
claim.created
answer.delta
answer.validated
turn.completed / turn.failed / turn.cancelled
```

事件有单调序号和 `turn_id`。SSE 断开后，客户端带最后序号重新连接，服务端重放缺失事件，再继续推送。若事件只存在于进程内队列，Worker 重启后客户端无法知道回答进行到哪里。

事件内容要分级保存。日志可以记录阶段、耗时、结果数量和错误类型；完整文档正文、Token 和凭证不应进入普通日志。回答、Claim、Evidence 和引用存储在具备访问控制的持久层。

## 阶段六：验证、有限修复和终态

验证失败不是无限调用模型。可以把动作限制成：

1. 删除没有证据的 Claim；
2. 对明确缺字段的问题补做一次定向检索；
3. 对格式错误的结构化结果做一次修复；
4. 超过修复次数后安全拒答或失败。

如果权限验证失败，不能通过换一个检索通道绕过；如果版本冲突，不能随机选一个来源；如果 Deadline 已过，不能开始一轮新的模型调用。

一个可推演的状态表如下：

| 状态 | 进入条件 | 允许动作 | 终态条件 |
| --- | --- | --- | --- |
| `pending` | 回合已创建 | 等待派发 | Worker 获得所有权或派发失败 |
| `running` | 获得执行租约 | 执行图和工具 | 完成、失败、取消或过期 |
| `cancel_requested` | 用户取消 | 停止可取消工作 | `cancelled` 或已完成的不可逆操作记录 |
| `waiting_retry` | 依赖暂时失败 | 在剩余预算内有限重试 | 重试成功或 `failed` |
| `completed` | 验证通过 | 只读展示和反馈 | 保持终态 |
| `no_evidence` | 检索完成但证据不足 | 解释缺口，不猜测 | 保持终态 |
| `rejected` | 权限或安全检查不通过 | 安全拒答 | 保持终态 |
| `failed` | 不可恢复错误或超时 | 记录原因和重试建议 | 保持终态 |

状态转换由确定性代码控制。模型输出可以影响“建议走哪个检索通道”，但不能直接写 `completed`、修改 ACL 或跳过验证节点。

## Worker 重启、租约和恢复

长任务不应依赖某个进程的内存。执行 Worker 领取回合时申请短租约，并定期续期；失去租约的 Worker 停止写入。Checkpoint 保存执行图已经完成的节点和必要状态，重启后从可恢复节点继续。

恢复时要重新检查：回合是否已进入终态、租约是否仍属于当前 Worker、Deadline 是否已过、快照版本是否可用、取消标记是否存在。恢复不是从头无条件重跑，否则可能重复工具调用和重复写入事件。

只读查询重复执行的风险较低，但模型调用、外部 API 和写操作仍要有幂等键。事件写入也要使用 `(turn_id, sequence)` 唯一约束，防止恢复重放产生重复序号。

## 同一 Runtime 怎样做 Eval

评测不应该另写一套“看起来差不多”的流程。准备带期望证据的匿名用例，调用与真实请求相同的理解、检索、验证和回答 Runtime，记录：

- 正确证据是否进入 Top K；
- Claim 是否被直接支持；
- 引用是否指向正确位置；
- 越权问题是否拒答；
- 无证据问题是否没有编造；
- 取消和 Deadline 是否进入正确终态；
- Token、调用次数、延迟和成本是否在预算内。

评测结果按模型、Prompt、检索版本、切片版本和代码版本关联。只保存一个总分，无法知道是解析、召回、生成还是权限出了问题。

## 一次完整请求的纸面推演

| 步骤 | 输入 | 处理 | 输出 |
| --- | --- | --- | --- |
| 创建 | 问题、用户、幂等键 | 验证权限并固定快照 | `turn_id`、`pending` |
| 理解 | 用户文字 | 生成意图和字段 | 查询计划 |
| 召回 | 计划、范围、版本 | 多路检索、融合、重排 | 候选 Evidence |
| 选择 | 候选 Evidence | 预算和权限复核 | 选中 Evidence |
| 规划 | Evidence | 拆 Claim | Claim 列表 |
| 生成 | Claim、Evidence | 生成回答和引用 | 草稿事件 |
| 验证 | 草稿与状态 | 支持、引用、权限、格式检查 | 通过或修复 |
| 完成 | 验证结果 | 写终态和观测 | `completed`/`no_evidence`/`rejected` |

读者可以拿任意一个内部问答需求替换“生产访问”场景，检查每一步是否有明确输入和输出。只要其中一步只能用“模型自己判断”解释，就应该补一个结构化状态或程序校验。

## 五条验收路径

### 正常回答

准备有明确表头和版本的资料，确认答案中的每个字段都有引用，事件序号连续，终态为 `completed`。

### 没有证据

提问资料中不存在的字段。系统应保留检索记录，回答缺口，不凭常识填充。

### 无权限

准备用户只能看到预发范围但问题指向生产。召回 SQL 和输出复核都应阻止越界，终态为 `rejected`，不能用“未找到”掩盖权限拒绝。

### 客户端断线和取消

在回答流式输出时关闭客户端，确认事件持久化、后端收到取消、可取消调用停止，重新连接可以从序号继续或看到明确终态。

### Worker 中断

在检索或验证之间停止隔离 Worker，确认租约过期后不会有两个 Worker 同时写入；恢复任务读取 Checkpoint，跳过已完成的幂等阶段。

这些是操作指南和设计验证，不是对某个私有系统已经上线结果的声明。真实部署前还要在隔离环境运行对应测试和容量检查。

## 你应该带走的三个产物

### 架构图

画出 API、回合存储、Agent Runtime、检索、工具、Evidence、事件、Worker 和观测的边界。每个箭头标明数据和所有者。

### 状态表

列出状态、进入条件、允许动作、终态和恢复策略。禁止把模型返回值直接当作状态转换。

### 验收清单

```text
[ ] 用户、租户、范围和知识版本在回合开始时可解释
[ ] 幂等键和唯一约束能阻止重复执行
[ ] 检索前后都有权限/版本复核
[ ] 表格、代码、PDF 和网页证据能回到原文位置
[ ] Claim 与 Evidence 一对一或多对一关系可检查
[ ] 流式事件有序号，断线可以重放或得到终态
[ ] 取消、Deadline、租约和 Checkpoint 的语义已验证
[ ] 无证据、越权、工具错误和模型格式错误不会编造成成功
[ ] Eval 使用与真实请求相同的 Runtime
[ ] Trace、日志、指标和成本能关联到 turn_id 和版本
[ ] 当前实现、设计建议和未来演进在文档中分开
```

如果这份清单无法由代码、测试、配置或隔离实验回答，结论应写成“待验证”，而不是用架构名词填空。知识 Agent 的可靠性来自每个边界都可观察、可解释和可恢复。
