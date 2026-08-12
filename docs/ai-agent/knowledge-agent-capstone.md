---
title: 知识 Agent 工程实践：从文档进入系统到可审计回答
description: 把导入、版本、权限、检索、工具、证据、事件、取消、恢复、评测和观测串成一条匿名工程实现。
category: ai-agent
part: 答案质量与运行
chapter: 70
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
updated: 2026-08-07T00:00:00.000Z
lastUpdated: false
---
# 知识 Agent 工程实践：从文档进入系统到可审计回答

前面的文章分别讲了 Agent、状态图、工具、MCP、Skill、文档解析、切片、Embedding、检索和证据。真正开始工作时，问题不是“每个概念会不会背”，而是这些能力能否沿一条请求链正确协作：用户提问后，系统如何确认范围，如何找到资料，如何证明答案，用户断开或 Worker 重启时又怎么办。

这篇把这些能力串成一个匿名的只读知识 Agent 蓝图。它不是私有项目源码，也不把未验证的组件写成现状。你会得到三件可以带走的工程产物：一张分阶段架构图、一张状态表和一份验收清单。

## 先看用户真正看到的结果

用户问：

> “生产环境访问申请需要谁审批？有效期多久？”

一个可信回答至少要带出两个事实和对应位置。如果只有一个“看起来合理”的句子，没有版本、范围和证据，它仍然是不合格的。系统应能给出三类**终态**：

```text
completed  找到可见证据，回答并引用
no_evidence  在允许范围内没有足够证据，明确说明缺口
rejected  用户没有访问该范围，拒绝透露越界内容
```

`no_evidence` 与 `rejected` 不应混成“没找到”。前者是资料覆盖或查询表达的问题，后者是权限边界，处理动作完全不同。

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

用户输入和授权范围进入系统后，先创建一个有稳定 ID 的回合。回合固定知识版本、策略版本和截止时间，避免运行期间混用不同快照。理解阶段把问题拆成检索计划；检索阶段在 SQL 和搜索通道中执行权限过滤；证据阶段把候选转换成可引用的 **Evidence** 和 Claim；回答阶段只使用被选中的证据；验证失败时不应直接把草稿当成答案。

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

幂等键不应只放在内存字典中。两个 API 实例同时收到相同请求时，只有数据库约束才能保证只创建一个回合。另一个请求应读取已存在记录，而不是重新消耗模型和检索资源。

## 阶段二：理解问题，但不让模型接管权限

模型适合把自然语言转换成结构化意图，例如：


理解节点只产出检索意图、实体和字段需求。Scope、Release 与用户身份继续保留在 Runtime 的可信状态中，不会出现在这个模型候选对象里。
```jsonc
{
  // intent 是模型对问题类型的候选判断，程序只允许预先定义的枚举值。
  "intent": "lookup_policy",
  "entities": ["生产环境", "访问申请"],
  "requested_fields": ["审批人", "有效期"],
  // 精确标记表示必须核对结构化事实，不能只依赖语义相似片段。
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

SQL 或搜索请求先过滤知识库、已激活版本、状态和 **ACL**，再执行精确、全文、向量或表格通道。缓存键必须包含用户范围和版本，否则一个用户的结果可能被另一个用户命中。

检索完成后还要做一次可见性复核。原因是回合执行可能跨过权限撤销；创建时快照决定版本语义，但当前权限策略可能要求在输出前再次阻止已撤销对象。系统要明确采用哪一种策略，并把结果写入观测。

## 阶段四：Evidence 和 Claim 是两个对象

Evidence 是系统看到的来源片段，**Claim** 是回答准备表达的事实。一个 Evidence 可以支持多个 Claim，一个 Claim 也可能需要多个 Evidence。不要把一段长上下文直接作为“引用”。

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

## 串起一个最小只读 Runtime

下面的实现只依赖标准库，不访问真实数据库或模型。它通过 Protocol 把 Retriever、Generator 和 EventSink 放在边界外，核心 Runtime 只负责可信 Scope/Release、Evidence 复核、Claim 引用和唯一终态。输入是一份 `TurnContext` 与问题，输出是 `RunResult` 和有序事件。

```python
# Runtime 依次创建 Turn、固定快照、检索、绑定 Claim、验证并原子提交终态，适配器保持可替换。
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class Terminal(StrEnum):
    COMPLETED = "completed"
    NO_EVIDENCE = "no_evidence"
    REJECTED = "rejected"


@dataclass(frozen=True)
class TurnContext:
    turn_id: str
    release_id: str
    visible_scope_ids: frozenset[str]
    deadline_ms: int
# Evidence 保存可追溯来源、稳定标识和可见范围，供 Claim 绑定与引用校验。


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    text: str
    release_id: str
    scope_id: str
    source_locator: str
# ClaimDraft 表示一个可单独核查的事实单元，后续必须为它找到证据或明确拒绝。


@dataclass(frozen=True)
class ClaimDraft:
    text: str
    evidence_ids: tuple[str, ...]


@dataclass(frozen=True)
class RunResult:
    terminal: Terminal
    answer: str
    evidence_ids: tuple[str, ...]


class Retriever(Protocol):
    # 查询函数只接收业务查询参数；可信 Scope、版本和上限由调用侧一并传入。
    def search(
        self, question: str, *, release_id: str, scope_ids: frozenset[str]
    ) -> tuple[Evidence, ...]: ...


class Generator(Protocol):
    def generate(
        self, question: str, evidence: tuple[Evidence, ...]
    ) -> tuple[ClaimDraft, ...]: ...


# EventSink 保存可排序、可重放的事件状态，让断线恢复仍能重建相同执行轨迹。
class EventSink(Protocol):
    def append(self, turn_id: str, event_type: str, payload: str) -> None: ...


class ReadOnlyRuntime:
    def __init__(
        self,
        retriever: Retriever,
        generator: Generator,
        events: EventSink,
    ) -> None:
        self._retriever = retriever
        self._generator = generator
        self._events = events

    # 入口函数按固定顺序编排各步骤，具体校验和副作用仍由各自函数负责。
    def run(self, context: TurnContext, question: str) -> RunResult:
        self._events.append(context.turn_id, "retrieval.started", "")
        # 用当前查询和可信范围执行检索；返回候选会继续接受去重、排序或证据校验。
        evidence = self._retriever.search(
            question,
            release_id=context.release_id,
            scope_ids=context.visible_scope_ids,
        )
        if not evidence:
            return self._finish(context, Terminal.NO_EVIDENCE, "没有找到可见证据", ())

        for item in evidence:
            if item.release_id != context.release_id:
                return self._finish(context, Terminal.REJECTED, "证据版本不一致", ())
            if item.scope_id not in context.visible_scope_ids:
                return self._finish(context, Terminal.REJECTED, "证据超出可见范围", ())
            if not item.source_locator or not item.text.strip():
                return self._finish(context, Terminal.NO_EVIDENCE, "证据无法定位", ())

        self._events.append(
            context.turn_id,
            "evidence.selected",
            ",".join(item.evidence_id for item in evidence),
        )
        claims = self._generator.generate(question, evidence)
        evidence_by_id = {item.evidence_id: item for item in evidence}
        for claim in claims:
            if not claim.evidence_ids:
                return self._finish(context, Terminal.NO_EVIDENCE, "Claim 缺少引用", ())
            if any(item_id not in evidence_by_id for item_id in claim.evidence_ids):
                return self._finish(context, Terminal.NO_EVIDENCE, "Claim 引用了未知证据", ())

        answer = "\n".join(
            f"{claim.text} [{' '.join(claim.evidence_ids)}]"
            for claim in claims
        )
        used_ids = tuple(
            dict.fromkeys(
                evidence_id
                for claim in claims
                # 逐项保留正文之外的来源和稳定标识，后续引用才能回到原始位置。
                for evidence_id in claim.evidence_ids
            )
        )
        return self._finish(context, Terminal.COMPLETED, answer, used_ids)

    def _finish(
        self,
        context: TurnContext,
        terminal: Terminal,
        answer: str,
        evidence_ids: tuple[str, ...],
    ) -> RunResult:
        self._events.append(context.turn_id, f"turn.{terminal}", answer)
        return RunResult(terminal, answer, evidence_ids)
```

`TurnContext` 保存入口已经确定的版本、Scope 和 Deadline；示例没有调用时钟，生产节点要在每次外部调用前使用它计算剩余预算。`Retriever` 接收可信过滤，返回 Evidence；Runtime 仍逐条复核 Release、Scope、定位和正文，防止适配器或缓存错误。

`Generator` 只产生 Claim 和候选 Evidence ID，不能修改权限或终态。Runtime 检查每个 Claim 至少有引用且引用存在，然后才拼装教学用答案。生产生成器应返回结构化对象，Citation 渲染器使用 Reference 与 source locator，不直接拼字符串。

`_finish` 是唯一提交终态的位置，保证每条路径都会产生终态事件。这个内存实现没有数据库条件更新；真实 Repository 用 `WHERE status NOT IN terminal` 和 owner token 保证并发 Worker 只能提交一次。Deadline、取消、**有限修复**和 Trace 由前面文章定义的组件围绕该核心状态机扩展。

## 用 Fake Adapter 验证三条关键路径

下面的测试直接复用前文实现。下面的测试不需要 API Key。Fake Retriever 决定返回哪条 Evidence，Fake Generator 只引用第一条，ListEvents 保存事件；输入分别覆盖公开证据、空证据和越权证据。


为了验证“用 Fake Adapter 验证三条关键路径”，下面的测试把“Fake Adapter 提供可控检索与模型结果，测试正常、无证据和越权路径而不依赖外部服务”变成可执行断言。每个用例自己构造输入，并用断言固定返回值或失败状态；某条测试失败时，可以从用例名直接定位到被破坏的契约。

```python
# Fake Adapter 提供可控检索与模型结果，测试正常、无证据和越权路径而不依赖外部服务。
from knowledge_runtime import (
    ClaimDraft,
    Evidence,
    ReadOnlyRuntime,
    Terminal,
    TurnContext,
)


class FakeRetriever:
    def __init__(self, result: tuple[Evidence, ...]) -> None:
        self.result = result

    # 查询函数只接收业务查询参数；可信 Scope、版本和上限由调用侧一并传入。
    def search(self, question: str, *, release_id: str, scope_ids: frozenset[str]):
        return self.result


class FakeGenerator:
    def generate(self, question: str, evidence: tuple[Evidence, ...]):
        return (ClaimDraft("申请由负责人审批", (evidence[0].evidence_id,)),)


class ListEvents:
    def __init__(self) -> None:
        self.items: list[tuple[str, str, str]] = []

    def append(self, turn_id: str, event_type: str, payload: str) -> None:
        self.items.append((turn_id, event_type, payload))


# CONTEXT 来自服务端可信上下文，不能被用户文本或模型输出覆盖。
CONTEXT = TurnContext("turn-1", "r8", frozenset({"public"}), 10_000)
PUBLIC = Evidence("e1", "提交后由负责人审批", "r8", "public", "page:3")


# 构造函数把已验证字段组装成下游对象，不在这里引入新的权限或业务决策。
def make_runtime(evidence: tuple[Evidence, ...]):
    events = ListEvents()
    return ReadOnlyRuntime(FakeRetriever(evidence), FakeGenerator(), events), events


# 这个用例固定权限边界：越权字段不能进入结果，也不能触达受保护的数据访问。
def test_visible_evidence_completes_with_a_reference() -> None:
    runtime, events = make_runtime((PUBLIC,))
    result = runtime.run(CONTEXT, "谁审批？")
    assert result.terminal is Terminal.COMPLETED
    assert result.evidence_ids == ("e1",)
    assert events.items[-1][1] == "turn.completed"


# 空输入或空命中属于独立业务路径；这个用例确认它不会越过校验边界触发多余调用。
def test_empty_retrieval_does_not_ask_the_model_to_guess() -> None:
    runtime, events = make_runtime(())
    result = runtime.run(CONTEXT, "有效期多久？")
    assert result.terminal is Terminal.NO_EVIDENCE
    assert events.items[-1][1] == "turn.no_evidence"


def test_invisible_evidence_is_rejected_before_generation() -> None:
    private = Evidence("e2", "私有流程", "r8", "private", "page:9")
    runtime, events = make_runtime((private,))
    result = runtime.run(CONTEXT, "私有流程是什么？")
    assert result.terminal is Terminal.REJECTED
    assert result.evidence_ids == ()
    assert events.items[-1][1] == "turn.rejected"
```

执行 `python -m pytest -q`，预期三条通过。正常路径产生 Evidence ID 和 `turn.completed`；空结果在调用 Fake Generator 前结束；越权 Evidence 也在生成前被拒绝。进一步练习应添加旧 Release、未知引用、显式取消、Deadline 到期、Worker 迟到终态和 SSE 重放测试。

这套 Fake 测试验证控制语义，不验证真实检索质量或模型表达。集成测试要把 Retriever 换成隔离数据库，把 Generator 换成固定脚本模型或真实候选模型，并继续复用同一个 Runtime 入口。

## 五条验收路径

### 正常回答

准备有明确表头和版本的资料，确认答案中的每个字段都有引用，事件序号连续，终态为 `completed`。

### 没有证据

提问资料中不存在的字段。系统应保留检索记录，回答缺口，不凭常识填充。

### 无权限

准备用户只能看到预发范围但问题指向生产。召回 SQL 和输出复核都应阻止越界，终态为 `rejected`，不能用“未找到”掩盖权限拒绝。

### 客户端断线和显式取消

在回答流式输出时关闭连接，确认事件继续持久化，重新连接可以从序号继续或看到明确终态；随后单独调用取消接口，确认持久化取消标记传播到可取消调用并进入 `cancelled`。断线本身不自动等于业务取消，除非产品策略明确如此。

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

## 常见问题

### 一个企业知识 Agent 的最小完整链路有哪些阶段？

至少包括认证与请求校验、**Turn** 幂等创建与版本快照、资源准入和任务派发、结构化理解与有限计划、多路检索和权限过滤、Evidence/Claim 绑定、生成与流式事件、五类验证、终态持久化与重放。小项目可以同步执行或减少通道，但这些责任仍要有明确归属。只完成“向量检索后调用模型”能做演示，却无法解释重复请求、越权、断线和错误恢复。

### 为什么 API 创建 Turn 后不直接在请求线程跑完整 Agent？

完整执行可能跨模型、检索、工具和验证，耗时受外部依赖影响。API 用短事务完成身份、幂等、快照、事件与 Outbox，快速返回 Turn ID；Worker 再取得 Lease 执行，同一事实状态可供 SSE 与轮询读取。这样客户端断线不会让业务状态丢失，重复请求也不会创建多个执行单元。短任务可选择同步优化，但仍应复用同一 Runtime 与终态语义。

### 模型在这条链路中到底控制什么？

模型可以结构化理解问题、提出 SearchPlan、选择允许工具候选、生成和有限修复文本；身份、Scope、Release、资源预算、状态转移、工具白名单、执行、权限验证和终态锁由确定性程序控制。模型输出先进入 Schema 与编译器，不能直接变数据库命令。这样的边界允许模型处理不确定语言，又让安全、成本和恢复可测试。把 Planner 换成规则时，其他 Runtime 责任仍保持不变。

### 没有检索到 Evidence 时，系统为什么不能让模型先回答再说？

只读知识 Agent 的承诺是答案来自当前用户可见的指定资料。模型预训练知识可能过期、与内部版本冲突，也无法生成真实引用。无 Evidence 时可以进行有限改写、其他允许通道或澄清；仍不足则进入 `insufficient`，说明缺少什么。Eval 用无资料样本检查错误成功为零。若产品另外允许通用知识，必须明确标识来源和边界，不能伪装成知识库证据。

### 流式输出已经发给用户后，验证发现错误怎么办？

不要把未验证候选当最终事实永久展示。可以流式发送受控阶段事件或标记为 provisional 的文本，最终通过验证后发 `finalized`；发现硬失败时发撤销/拒答终态，前端替换候选。高风险场景甚至等验证完成再流正文。数据库只有一次 Finalize 条件更新，迟到 token 不能覆盖。产品体验与可信边界要共同设计，不能为了 TTFT 提前承诺未验证答案。

### Worker 在模型返回后、终态提交前崩溃会怎样恢复？

Checkpoint 保存步骤、输入 hash、已完成副作用与事件序号，模型或工具调用使用稳定 attempt/request ID。新 Worker 取得 fencing token 后先查询是否已有候选结果或终态；已完成则继续验证/Finalize，未知再按幂等与 Deadline 决定重试。旧 Worker 迟到提交被条件更新拒绝。测试应专门在“外部完成、数据库未写”和“数据库写、事件未发”两个窗口注入故障。

### SSE 断线是否会影响 Agent 执行？

通常不会。Agent 状态和事件先持久化，Redis 只唤醒 SSE；连接断开后 Worker 继续，用户重连用 Last-Event-ID 补发，过窗口则查询状态快照。只有用户显式取消或产品定义“断线即取消”时才传播取消，而且终态写入数据库。这样传输层故障不等于业务失败，也不会因为一个慢浏览器长期占住 Runtime 内存。

### 为什么 Eval 必须走同一个 Runtime？

若 Eval 绕过准入、快照、缓存、工具权限、验证和恢复，只测试一个 Prompt，就无法发现真实系统的状态与安全回归。评测入口可以注入 Fake 模型、Retriever 和时钟以获得可重复结果，但应调用相同领域状态机和执行器。逐样本保存 runId、traceId、版本、Evidence 与终态，候选通过硬门禁后才进入旁路或 Canary。测试的是系统，不是另一个简化脚本。

### 完整 Agent 应该先从哪些测试开始？

先固定五条业务路径：正常有证据、无证据、无权限、客户端断线/取消和 Worker 中断恢复；再补幂等重复、Deadline、工具超时、提示注入、引用过期与模型格式错误。断言不仅看答案，还看 Turn 状态、事件序号、Evidence Scope、工具副作用和资源释放。外部服务用 Fake Adapter 做单元与图测试，再在隔离环境做数据库、队列和 SSE 集成。

### 怎样判断系统已经达到可以上线的程度？

没有单一“生产级”标签。需要代码与测试证明权限、版本、幂等、取消、恢复和拒答语义；RAG 与 Agent Eval 通过预先定义的硬门禁；Trace、指标和 Runbook 能定位失败；容量和 Deadline 在隔离压测中满足目标；候选经过旁路验证并有回滚点。任何未验证能力明确标记为待验证，不用架构图替代运行证据。上线后仍通过反馈与 Trace 扩充回归集。
