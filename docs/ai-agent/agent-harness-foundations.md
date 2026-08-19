---
title: Agent Harness 的职责与接口
description: 用一次可回放的 Agent Run 说明模型、工具、上下文、状态和权限怎样分工。
category: ai-agent
part: Harness 与交互式 Agent
stageKey: harness
chapter: 87
sequence: 87
slug: agent-harness-foundations
tags:
  - Agent Harness
  - Runtime
  - Platform
sourceKey: ai-agent-harness-foundations
dependsOn:
  - agent-production-architecture
updated: '2026-08-19'
lastUpdated: false
---
# Agent Harness 的职责与接口

编码助手收到一个任务：读取仓库，修改一个文件，并运行测试。它不能访问工作区以外的路径，也不能在测试失败时把任务标成完成。这个例子看起来像一次模型调用，真正需要管理的却是身份、工作区版本、工具权限、文件差异、测试结果和终态。

**Agent Harness** 是承载这条控制链的应用层。它把模型的候选动作接到确定性的校验、执行、记录和恢复上。Harness 不替模型决定业务答案，也不把“模型说可以”当成权限证明。

本文只回答一个问题：怎样设计一个最小 Harness，让一次 Run 可以被检查、拒绝、重试和回放。平台化、灰度发布和多租户治理会在下一篇继续展开。

::: info 贯穿案例

用户 u-17 在工作区 repo-42@commit-a1 中请求修复一个测试。允许的能力只有读取仓库、编辑 src/parser.ts 和运行指定测试。工作区外路径、网络访问和未验证差异都必须拒绝。

:::

## Harness 先划清模型和程序的职责

模型擅长从当前观察提出候选动作，例如“读取 src/parser.ts”或“运行 pnpm test parser”。程序掌握可信身份、工作区根目录、策略版本和测试终态。两者职责混在一起，就会出现模型把用户输入里的路径当成授权范围，或把测试输出里的“通过”当成真实进程结果。

一条安全的边界是：

~~~text
模型候选 -> Schema 校验 -> 权限与范围检查 -> 执行器 -> 观察回执
~~~

Schema 只验证字段形状。路径是否在工作区内、命令是否在白名单、当前提交是否仍是 commit-a1，要由程序使用可信状态检查。执行器返回的退出码和文件差异再作为新的观察，交给下一轮模型。

### Run、Session 和 Workspace 不是同一个对象

一次 Run 有明确的开始、终态和资源预算。Model Session 保存模型看到的消息与工具回合。Workspace 指向一个具体版本和根目录。三者分开保存，才能在用户断线时恢复 Run，在模型切换时保留工作区约束，也能在版本变化时拒绝旧候选。

能力目录（Capability Registry）描述本次 Run 可以提出哪些动作。它不是工具文档的简单列表，还需要记录参数 Schema、风险级别、所需权限和可撤销性。目录版本变化后，旧的动作候选必须重新校验。

### 观察要保留来源和状态

Harness 不能只把工具输出拼成一段文本。每次观察至少要带 call_id、来源、状态、时间和工作区版本：

~~~json
{
  "call_id": "call-8",
  "kind": "process",
  "status": "failed",
  "exit_code": 1,
  "workspace_revision": "commit-a1",
  "summary": "parser test: expected 3, received 2"
}
~~~

summary 供模型阅读，原始 stdout、stderr、差异和凭证留在受控存储。成功传输不代表动作满足业务不变量，Harness 仍需在交付前重新验证。

## 用输入合同决定一次 Run 能做什么

入口合同先收集用户目标、可信身份、工作区版本、能力目录和 Deadline。缺少任一硬字段时，Run 在入口结束，后续模型和工具调用次数应为零。

可以把合同分成三类字段：

| 字段 | 所有者 | 缺失或改变时的处理 |
| --- | --- | --- |
| actor、租户和权限 | 认证与策略服务 | 拒绝创建或撤销 Run |
| workspace_revision、根目录 | 工作区服务 | 旧候选失效，要求重新观察 |
| goal、当前文件和测试命令 | 用户与任务解析 | 澄清或限制能力范围 |
| capability_version | Harness | 重新校验动作 Schema |
| deadline、预算和取消信号 | Runtime | 停止新增动作并清理资源 |

目标描述可以很自然，权限字段必须来自可信服务。用户说“顺便读一下家目录”不会扩展工作区范围，模型提出的 user_id 也不能覆盖认证身份。

## 一次 Run 如何推进状态

Harness 的控制流可以压缩成五个阶段：

1. **创建**：写入 run_id、身份、策略和工作区版本。
2. **观察**：读取任务所需的文件、测试状态和可用能力。
3. **提议**：模型输出结构化动作候选，保留原始版本。
4. **执行**：程序校验权限后调用工具，并保存回执与差异。
5. **验收**：按测试、范围和版本不变量写入终态。

状态迁移必须单调。completed 不能被迟到的旧事件改回 running，取消后到达的工具结果只能进入审计记录。失败重试要从拥有该边界的阶段继续，不能重新创建一份拥有相同副作用的 Run。

下面是案例的事件顺序：

~~~mermaid
sequenceDiagram
    participant H as Harness
    participant M as Model
    participant T as Tool
    H->>H: create run-17
    H->>M: observe workspace commit-a1
    M-->>H: edit src/parser.ts
    H->>T: check path and apply diff
    T-->>H: diff + revision commit-a2
    H->>T: run parser tests
    T-->>H: exit 0
    H->>H: verify and complete
~~~

图中的 commit-a2 是状态变化的关键。编辑动作成功后，测试必须针对新版本运行；如果用户在此期间提交了新代码，旧候选的版本检查会阻止覆盖。

## 让接口围绕命令、事件和终态设计

对外接口不要暴露某个供应商 SDK 的完整响应。Harness 可以使用稳定的命令与事件：

~~~json
{
  "command": "propose_action",
  "run_id": "run-17",
  "capability_version": "cap-3",
  "action": {
    "name": "read_file",
    "arguments": {"path": "src/parser.ts"}
  }
}
~~~

处理顺序是固定的：解析命令，检查 Run 是否仍可写，验证能力版本，再检查身份、路径和资源预算。任何检查失败都写入带原因码的 rejected 事件，不能只返回一段自然语言错误。

事件应携带递增序号和状态修订。客户端重连时按 Last-Event-ID 读取事件，服务端依据已持久化的 Run 状态决定是否需要继续执行。事件流断开只影响交付通道，不能成为重复执行的理由。

## 共享示例只证明控制逻辑

仓库中的示例实现了一个内存 Harness：它固定动作 Schema、路径校验、状态迁移和测试结果，便于测试本地控制逻辑。

<<< ../../examples/ai-agent/harness.py

示例没有连接真实模型、文件系统或沙箱。接入生产环境还需要鉴权、持久化、进程隔离、资源配额、事件重放和真实依赖契约测试。Fake Adapter 证明不了供应商的取消语义，也不能证明操作系统隔离有效。

## 故障要能归属到具体边界

同一个“任务失败”可能来自不同层：

| 现象 | 责任边界 | 可重试动作 |
| --- | --- | --- |
| 路径不在工作区 | 策略拒绝 | 询问用户或结束 Run |
| 工具 Schema 无法解析 | 能力适配 | 修正候选，不执行副作用 |
| 进程退出码非零 | 执行器 | 读取日志，允许有限修复 |
| 工作区版本变化 | 并发控制 | 重新观察后再提议 |
| 测试通过但差异未审查 | 验收规则 | 保留未确认状态 |

Harness 记录阶段、责任对象、状态版本、调用 ID 和清理结果。这样回放时能回答“谁在什么版本下作了什么决定”，不需要让模型重新解释过程。

## 用事件回放验证 Harness 契约

单元测试用 Fake Model 固定动作序列，检查权限拒绝、调用顺序、状态修订和资源释放。契约测试覆盖合法与非法路径、过期能力版本、重复提交和取消竞态。

集成测试连接隔离工作区和真实进程执行器，确认序列化、超时、差异收集和事件持久化。测试应断言“测试失败不能完成”“工作区外路径调用次数为零”等性质，不能只检查返回对象非空。

回归报告要按拒绝、超时、权限错误、空结果、恢复失败和资源泄漏分组。总体成功率无法替代这些行为不变量。

## 从最小 Harness 走向平台

到这里，Harness 已经能保证一次 Run 的身份、能力、状态和终态一致。多个产品共享它时，还要处理能力注册、策略版本、租户灰度和适配器兼容矩阵。下一篇将沿“新工具只对部分租户开放”的发布过程，说明 Harness 怎样成为可治理的平台。
