---
title: 一次 Agent 请求怎样穿过 API 与 Runtime
description: 从创建 Turn 到异步执行、事件持久化、流式读取和终态查询，解释每层职责。
category: ai-agent
part: Runtime 与异步执行
stageKey: runtime
chapter: 70
sequence: 70
slug: agent-request-lifecycle-runtime
tags:
  - Request Lifecycle
  - API
  - Runtime
sourceKey: ai-agent-request-lifecycle-runtime
dependsOn:
  - agent-runtime-domain-model
updated: '2026-08-17'
lastUpdated: false
---
# 一次 Agent 请求怎样穿过 API 与 Runtime

用户点击发送后，页面很快拿到 `turn_id`，答案却要过一会儿才出现。中间不只是“把问题放进队列”：API 要确认身份和知识库权限，避免重复请求，分配并发容量，准备 Conversation 与 Message，固定知识 Release、Policy 和 ACL，写入首个 Event，提交数据库事务，再把 Turn 交给 Worker。任何一步失败，都要能说明请求有没有被受理、是否可能继续执行、客户端下一步该读取什么。

这条生命周期可以分成五段：**入口准备**决定请求能否创建；**持久化受理**生成可恢复 Turn；**异步调度**把稳定 ID 交给 Worker；**运行时执行**产生 Evidence、Claim 和 Event；**结果交付**通过状态查询、SSE 或轮询把同一终态交给客户端。每段有自己的成功条件，HTTP 200、队列 ACK 和模型返回都不能替代 Turn Completed。

```mermaid
flowchart LR
    A[Client Request] --> B[Auth 与 KB Permission]
    B --> C[Idempotency Lookup]
    C --> D[Admission]
    D --> E[Conversation 与 Message]
    E --> F[ACL / Release / Policy Snapshot]
    F --> G[Turn + turn.created]
    G --> H[Commit]
    H --> I[Dispatch turn_id]
    I --> J[Worker 领取]
    J --> K[Agent Runtime 执行]
    K --> L[Evidence / Claim / Validation]
    L --> M[Terminal State + Event]
    M --> N[SSE Replay 或 Status Query]
```

## 请求契约先给 Runtime 足够的确定性输入

创建请求包含知识库 ID、问题、幂等键、请求模式和 Deadline。已有 Conversation 时还带 Conversation ID 与 Nonce；页面选定文档范围时，提交 Scope Node、范围来源和修订。问题可以表达目标，身份、角色、知识权限和当前活动版本不能从问题文本推断。

幂等键由调用方为一次用户动作生成，同一次点击的网络重试沿用原值，新问题使用新值。它的作用域至少包含知识库和用户，避免不同租户碰巧使用相同字符串后共享 Turn。键需要足够长度并限制最大长度，空字符串不能绕过唯一约束。

Deadline 是从受理时刻计算的绝对执行期限。客户端提交的是允许区间内的秒数，Turn 保存 `deadline_at`。排队、重试、模型等待和恢复都消耗这段时间；Worker 不能在每次重试时重新得到完整期限。

请求模式只是候选偏好。`auto`、`fast`、`standard` 或 `deep` 经过 Policy 和问题特征后得到 Resolved Mode，用户不能通过模式字段扩大研究轮数、工具权限或 Token 预算。Scope 同样经过服务端权限求交，传入的文档 ID 不会直接成为检索授权。

入口返回契约需要明确 `created`。首次受理返回 Turn、Conversation Nonce、固定 Release、Policy、当前 Status 和 Event URL；重复请求返回原 Turn，并把 `created=false`。客户端据此复用事件连接，不再启动第二个进度面板。

若接口使用 202，它只表示 Turn 已经持久化并进入调度链。模型尚未返回，检索和验证也可能失败；客户端要以 Event 或状态查询确认业务终态。

## 鉴权与权限检查发生在任何持久化之前

API 先验证用户身份，再确认对目标知识库的访问权限。失败时不创建 Conversation、Message、Turn、Event 或队列任务，也不消耗模型配额。外部响应可以统一隐藏资源存在性，审计日志保留是身份无效还是知识库拒绝。

权限检查分两层。知识库访问决定能否创建请求，检索访问解析当前用户的 Subject 与 Group，并与页面范围求交，形成 ACL Snapshot。服务身份可能负责执行 Worker，但 Snapshot 仍记录原用户的有效范围，不能把后台权限当作检索范围。

如果请求引用已有 Conversation，Conversation 还要属于当前用户和知识库，Nonce 与修订满足并发条件。一个合法用户不能把自己的新 Turn 挂到别人的会话，也不能用旧页面状态覆盖对话中后来出现的 Message。

输入校验失败与依赖暂时不可用要分开。问题为空、幂等键过短和 Deadline 越界返回不可重试的 4xx；权限服务超时或数据库不可用可能返回 5xx，但服务端只有在确认没有持久化 Turn 时，调用方才能安全重发。无法确认时，先按幂等键查询。

## 幂等快速路径在准入之前返回

入口先按知识库、用户和幂等键查询已存在 Turn。命中后直接返回原状态，不再次申请并发额度，不新建 Message，也不重复投递 Worker。Completed、Failed、Cancelled 和 Expired 都按原样返回，幂等不等于“失败后自动再试”。

这条快速路径还解决客户端超时后的不确定性。第一次请求可能已经提交数据库，只是响应丢失；第二次请求查到原 Turn，就能继续读取。若每次都先做准入，重复请求可能因用户并发额度已被原 Turn 占用而返回 429，客户端反而找不到正在运行的任务。

快速查询不是唯一保护。两个首次请求可以同时查到空，因此事务内还要锁定幂等作用域，并在取得锁后再次查询。数据库使用部分唯一约束处理最后竞态，冲突事务重新读取已有 Turn。三层保护分别优化常见路径、串行化并发和保证最终一致性。

幂等重放不能接受冲突输入。同一键再次提交不同知识库或用户会落在不同作用域；同一作用域下问题、模式或 Scope 明显不同，应返回原 Turn 并提示键已使用，或记录请求摘要冲突。不能用新内容静默修改已经固定版本的 Turn。

## 准入控制只预留容量，不创建业务结果

没有现有 Turn 后，API 为一个预生成的 Turn ID 申请用户级和系统级容量。用户进行中的任务达到上限，返回用户限额；全局容量不足，返回系统繁忙。准入拒绝发生在 Conversation 与 Turn 创建之前，数据库不会留下半条聊天记录。

预生成 ID 让准入 Lease 与稍后持久化的 Turn 使用同一身份。创建事务失败时立即释放；幂等二次查询发现并发请求已经创建 Turn，也释放本次预留。成功后 Lease 由 Worker 定期续期，在终态、Dispatch 失败或 Pending Cancel 时释放。

准入服务不可用时采用哪种策略取决于风险和容量。高成本模型通常失败关闭，避免失控并发；低成本只读任务可以有受限降级。无论选择哪种，数据库中的活动 Turn 数与准入存储都需要恢复校准，不能把 Redis Lease 当成唯一业务事实。

准入成功不代表任务已经受理。此时还没有持久化 Turn，API 进程退出后预留会过期，客户端可以重试。只有数据库事务提交后，系统才向外承诺这个 `turn_id` 可查询。

## 一个事务创建 Conversation、Message、Turn 与首个 Event

Conversation Service 先准备已有或新会话，验证 Nonce、Scope 与归属。随后创建 User Message、占位 Assistant Message 和 Trace 身份。显式记忆提取只处理用户明确表达的偏好或约束，并使用当前用户与知识库范围；失败策略要明确，不能让非关键记忆功能破坏核心问答而不留原因。

Runtime 在事务内取得幂等锁并二次查询。仍未命中时，解析检索权限，把身份、角色、Subject、Group、文档 Scope、范围来源和修订写入 ACL Snapshot。新 Conversation 也作为快照字段记录，方便后续判断上下文装配方式。

接着选择活动知识 Release 和 Policy。Policy 若处于灰度，按知识库、用户和幂等键做稳定分桶。Turn 写入问题、Conversation、Message、Trace、Deadline 和这三类快照，Status 初始为 Pending。任何一个版本不存在或不属于当前知识库，事务失败。

首个 `turn.created` Event 与 Turn 在同一事务中持久化。Payload 包含 Conversation、Nonce、Assistant Message、Release 和 Policy ID，事件序号来自 Turn 的原子计数。此时不包含问题正文、ACL 列表或凭证，避免事件流扩大敏感数据范围。

事务提交使 Conversation、Message、Turn 和 Event 一起可见。提交失败时全部回滚并释放准入，客户端不会看到只有 Message 没有 Turn 的半成品。提交成功后，API 发布一个轻量事件序号通知；通知失败不回滚权威数据，SSE 仍可通过数据库轮询补到 Event。

## 组件职责和状态所有者不能重叠

API Controller 的职责是解析协议、鉴权、调用领域服务和返回受理结果。它不在请求协程里运行 Agent Graph，也不直接拼装管理员权限。Conversation Service 拥有会话、Message 和 Nonce；Runtime Repository 拥有 Turn 状态、版本快照和 Event Sequence；Admission Controller 拥有临时容量 Lease；Worker 只在有效执行权内推进一次 Turn。

| 组件 | 读取 | 写入 | 失败后保留什么 |
| --- | --- | --- | --- |
| API Controller | 认证上下文、Create Request | 无长期业务状态 | HTTP 错误与 Trace ID |
| Conversation Service | 会话、Nonce、页面 Scope | Conversation、Message | 事务回滚或冲突原因 |
| Runtime Repository | Release、Policy、ACL | Turn、Event、Artifact | 状态修订与错误码 |
| Admission Controller | 用户与系统容量 | Lease、取消信号 | 拒绝原因或过期 Lease |
| Dispatcher | 已提交的 `turn_id` | Queue Message | Dispatch 结果 |
| Worker Runtime | 固定执行上下文 | Evidence、Claim、终态候选 | Checkpoint 与阶段错误 |
| Event Delivery | Event Cursor、通知序号 | 无权威 Turn 状态 | 重连游标与回退状态 |

状态所有者通过接口协作。API 可以请求 Runtime 创建 Turn，不能绕过状态条件把它改成 Completed；Worker 可以提交答案，不能修改 Release 与 ACL；SSE 只读 Event，不能因为客户端断开而取消 Turn。职责分开后，页面、队列和 Worker 可以独立重启。

事务边界也跟所有权一致。Conversation、Message、Turn 和首个 Event 在同一数据库事务中创建，因为它们共同定义“已受理”；Admission Lease 与数据库不在同一事务，通过过期时间和补偿释放协调；Queue 与数据库通过 Dispatch 补偿或 Outbox 协调。试图用一个分布式事务包住所有系统，会增加锁持有时间和故障面。

审查调用链时可以问三遍“谁有权写”。谁能修改 Turn Status，谁能改变 Policy Allocation，谁能确认工具副作用。答案如果是“任何拿到数据库 Session 的服务”，领域边界还没有建立，重复投递和迟到结果迟早会覆盖彼此。

## 数据库提交后才投递 Worker

队列 Payload 只需要 `turn_id`。Worker 从数据库读取执行上下文，避免把 ACL、Policy 配置和问题复制进一条可能长期滞留的消息。消息中的快照容易过期，也增加泄露面；稳定 ID 让恢复任务和正常任务使用同一入口。

Celery Task ID 可以由 Turn ID 派生，便于观测和减少明显重复。队列仍然可能至少一次投递，Task ID 不能取代 Runtime 的状态条件。两个 Worker 收到相同 Turn 时，只有一个能从 Pending 进入执行。

Dispatch 发生在数据库提交之后，因此存在“Turn 已受理，队列发送失败”的窗口。API 捕获错误，开启新事务把 Turn 标为 Failed，错误码为 `dispatch_failed`，追加唯一 `turn.failed` Event，发布事件通知并释放准入。客户端收到 503 后再按幂等键查询，会看到同一个 Failed Turn。

直接删除 Dispatch 失败的 Turn 会制造歧义。调用方不知道第一次有没有产生 Message 和版本快照，也无法区分安全重试与重复执行。保留失败 Turn 后，产品可以提供显式“重新运行”动作，它使用新幂等键创建新 Turn，并关联原失败原因。

更严格的实现可以使用 Transactional Outbox，把待投递记录与 Turn 同事务提交，再由投递器重复发送直到成功。这样 API 不需要同步依赖队列，代价是增加 Outbox 表、扫描器、延迟和清理。无论采用哪种方案，数据库状态是事实来源，通知与队列负责唤醒。

## Worker 先重新读取状态和快照

Worker 收到 `turn_id` 后创建独立数据库 Session，读取 Turn、Conversation、知识库 Dataset、Policy Config、Quality Gates 与 ACL Snapshot。Turn 不存在或已经终态时直接结束；Deadline 已到则写 Expired；Pending 或可恢复 Running 才进入 Runtime。

执行开始时取得执行 Lease，并用条件更新记录 Started At。主循环装配问题、历史 Message、记忆与权限范围，选择 Resolved Mode 和 Search Plan。状态进入 Running 后，每个阶段在模型或工具调用前检查 Deadline、取消信号和剩余预算。

检索生成 Candidate，证据预算选出进入 Prompt 的 Evidence；模型产生候选答案，验证器生成 Claim、Citation 与 Validation Issue。有限修复完成后，Runtime 把最终 Evidence 和 Claim 结构化持久化，再更新 Assistant Message 与 Turn。依赖返回成功只表示调用完成，不能提前标记 Completed。

运行事件使用短事务单独持久化：先追加 Event 并提交数据库，再发布 Redis 序号。Redis 只通知 SSE 有新序号，不保存权威 Event。事件持久化记录 Append、Commit、Publish 各阶段耗时，某一阶段变慢时能定位数据库与通知层。

流式 Delta 需要节流或批量写入，阶段、引用就绪、答案替换和终态单独保存。高风险答案可以先发内部候选事件，验证完成后再对客户端发布 Replace 或最终内容。不能为了流畅先输出受限 Evidence，再用删除事件假装没有泄露。

### 预处理和主循环怎样交接

Worker 进入 Graph 前可以并行准备会话历史、用户记忆、模型配置和知识访问参数。每个预处理结果带 Kind、状态、耗时和错误，合并时按身份取值，不能依赖完成顺序。必要输入失败就终止，非关键记忆不可用可以降级为空，但 Event 和 Trace 要记录降级。

预处理读取的是 Turn 固定快照。会话历史可以截止到创建本轮 User Message，后来追加的 Message 不会自动混入；知识访问使用 ACL Snapshot 与 Release；模型路由使用 Policy。若主循环再次读取活动指针，预处理与执行会在同一 Turn 中使用两套版本。

主循环接收一个结构化初始状态：`turn_id`、用户、问题、请求模式、Release、Policy、ACL、Deadline、Conversation 和预处理结果。模型只能在其中生成 Search Plan、Tool Call 和候选答案。Runtime 在每个节点前后执行取消、Deadline、状态修订和事件持久化。

恢复路径读取 Checkpoint 时，Graph Input 可以为空，让引擎从原 Thread 恢复；首次运行才传完整 Initial State。恢复后先发答案重置或修订事件，避免客户端把上次未完成 Delta 和新输出拼接。已经完成的节点不重放，仍要重新确认权限、租约与剩余期限。

### Artifact 完成先于终态

Evidence、Claim 与关系写入可以在一个产物事务中替换本 Turn 的候选集合。稳定 Evidence Key 映射到持久 Row ID，重复对象去重；Claim 按 Index 排序，再写支持关系。某条 Claim 引用不存在的 Evidence 时，关系不能凭字符串补造。

Assistant Message、Answer 与 Validation Summary 要指向同一修订。若先发 Completed Event 再写 Message，客户端会在终态后读到空答案；若先写 Message 而状态提交失败，查询可能展示一条尚未验证的结果。提交顺序和事务根据数据库模型设计，但对外可见条件必须同时满足。

## 完成、失败、取消和过期各走不同终点

正常路径先持久化 Evidence、Claim、Validation Summary 和最终 Message，再把 Turn 从 Pending 或 Running 更新为 Completed，最后追加 `turn.completed`。状态更新失败说明取消或其他终态先发生，迟到答案不会覆盖当前事实。

依赖异常按稳定错误类型写 Failed。错误消息限制长度并脱敏，完整堆栈留在内部 Trace。Runtime 追加 `turn.failed`，释放 Lease 和准入。可以恢复的 Worker 丢失不立即写 Failed，恢复扫描器先判断 Lease 与 Deadline，再重新投递同一 Turn。

Pending Turn 被用户取消时可以直接进入 Cancelled，追加终态事件并释放容量。Running Turn 先进入 Cancel Requested，同时向快速控制通道写取消信号。Worker 在阶段边界确认后清理资源、写 Cancelled；Redis 不可用时，从数据库状态读取取消请求。

Deadline 到达后，过期任务把非终态 Turn 更新为 Expired，保存 `deadline_exceeded`，追加 `turn.expired` 并释放容量。过期与取消都不是普通模型错误，重试不会自动获得新 Deadline。用户决定重新运行时创建新 Turn。

终态 Event 使用幂等锁保护。Worker 异常处理、恢复扫描器和 API 补偿可能同时尝试写失败或过期事件，持久层只返回已有终态序号。客户端最终只看到一个业务终点。

## 事务外故障窗口需要明确补偿

数据库 Commit 成功、Redis 通知失败时，不回滚 Turn。通知层记录失败，SSE 定期读数据库；下一条 Event 通知也会让客户端发现最新序号。权威 Event 没丢，故障只增加交付延迟。

Commit 成功、Queue Dispatch 失败时，补偿事务写 Failed。若补偿事务也失败，恢复扫描器会发现 Pending Turn 没有活动执行 Lease，再次投递或标记失败。监控需要单独统计“已创建但从未开始”的年龄，不能只看队列长度。

Queue 已接收、API 响应丢失时，客户端重发同一幂等键，返回原 Turn。Queue 重复投递时，状态条件拦住第二个 Worker。Worker 在模型成功后、产物 Commit 前退出，恢复可以重做模型调用；在工具副作用后退出，则依赖动作幂等记录查询原结果。

终态 Commit 成功、Redis 通知失败时，客户端轮询能看到完成，SSE 的数据库回退也会读到终态 Event。终态状态成功但 Event 缺失属于数据不变量错误，由修复 Job 追加同类型 Event；不能重新执行整个 Turn 来“补一条流消息”。

Admission Release 失败不会改变终态。Lease 有 TTL，后台校准以非终态 Turn 为准清理孤儿；释放错误进入容量告警。反过来，Lease 提前丢失也不授权另一个 Worker 重做副作用，新的执行者还要通过数据库状态和执行锁。

这些窗口适合用故障注入验证。测试在每个 Commit、Publish、Send、Tool Result 与 Terminal Write 之后主动退出进程，再检查可观察状态。只测试函数抛异常，覆盖不到“外部已经成功、调用方没收到确认”的不确定结果。

## 客户端用状态查询和 SSE 读取同一事实

状态查询先验证 Turn 属于当前用户，再检查知识库权限，返回持久化记录。它适合页面恢复、SSE 不可用时轮询和终态确认。查询不触发模型重跑，也不刷新 Deadline。

SSE 连接使用 `Last-Event-ID` 作为游标。服务从数据库读取大于游标的 Event，按 Sequence 输出 `id`、`event` 和 JSON `data`。终态已经重放后关闭连接；没有新事件时发送注释 Heartbeat，代理不会把它当业务消息。

Redis 提供“最新序号变了”的提示，减少数据库高频轮询。Redis 失败后，SSE 按受限间隔直接查询数据库；即使 Redis 丢掉通知，定期数据库检查仍能发现新 Event。把 Redis Pub/Sub 当唯一事件存储，会让断线期间的消息无法重放。

客户端收到 Delta 后只更新当前答案修订，收到 Replace 时替换未验证内容，收到 References Ready 后绑定 Citation。Completed、Failed、Cancelled 与 Expired 都结束当前流。网络断开再连接时沿用同一 Turn 和最后游标，不重新提交问题。

## 用一个真实时序检查各层责任

用户第一次提交“远程访问多久生效”，幂等键为 `request-123`。鉴权和知识库权限通过，快速查询未命中，准入预留 `turn-1`。Conversation Service 创建 User Message 与占位 Assistant Message；Runtime 固定 Release 7、Policy 3 和员工范围，写入 Turn 与 Event 1，事务提交。

队列成功接收 `turn-1`，API 返回 Pending 与 Event URL。Worker 把状态改为 Running，Event 2 表示开始；检索与验证产生 Event 3 到 6。用户断开后又带 `Last-Event-ID: 2` 重连，SSE 从数据库补发 3 到 6，不影响 Worker。

模型答案缺少审批前提，验证器执行一次有限修复。Evidence、Claim 和修订答案持久化后，Turn 进入 Completed，Event 7 关闭流。用户刷新页面，Status Query 和 Message 都返回同一答案；同一幂等键再次 POST 只返回 `turn-1`，Dispatcher 不再发送任务。

若队列在首个请求中不可用，事务已经保存 `turn-1`，补偿事务把它标成 Failed 并写 Dispatch Failed Event。客户端重试相同键得到原失败记录。产品要重新执行时生成 `request-124`，新 Turn 可以沿用同一 Conversation，但拥有新的 Deadline、Release 与 Policy 快照。

## 最小示例验证入口的四条分支

示例把持久 Store 和 Dispatcher 分开。第一次请求先创建可查询 Turn，再发送 `turn_id`；相同幂等键返回原对象；准入拒绝不创建记录；Dispatch 失败保留 Failed Turn 与错误 Event。

<<< ../../examples/ai-agent/request_lifecycle.py

运行示例和测试：

```bash
python3 examples/ai-agent/request_lifecycle.py

PYTHONPATH=examples/ai-agent \
  python3 -m unittest examples/ai-agent/tests/test_request_lifecycle.py
```

内存 Store 没有事务锁和数据库唯一约束，Dispatcher 也不实现 Celery ACK、Lease 与恢复。四条测试只验证入口控制顺序。生产验证还要并发提交相同键、让进程在 Commit 后和 Dispatch 前退出、关闭 Redis 通知、让 Worker 在终态前崩溃，并确认客户端仍能从持久状态恢复。

## 故障定位沿生命周期逐段检查

没有 Turn 的 4xx 查看认证、权限和输入 Schema；没有 Turn 的 429 查看用户或系统准入；已经有 Turn 且 Pending 无 Task，查看 Dispatch、Outbox 和队列路由；Running 长时间无 Event，查看 Lease、Worker 当前阶段和下游调用。

有 Event 但 SSE 不更新，比较数据库最新 Sequence、Redis 通知和客户端 Cursor。数据库没有新 Event，问题在 Runtime 持久化；数据库有而 Redis 没有，SSE 应通过回退读到；服务已输出而浏览器没显示，再查代理缓冲、连接和前端解析。

Turn Completed 但答案缺 Citation，检查 Evidence、Claim 与 Message 完成事务；答案正确却出现两次工具副作用，检查动作幂等和 Worker 恢复；取消后继续产生新调用，对照取消时间与动作创建时间，定位 Worker 是否漏掉控制检查。

每条告警带 `turn_id`、阶段、Release、Policy、状态修订、Event Sequence 和错误类。问题正文、ACL 详情、Evidence 内容与凭证不进入普通指标标签，需要排查时通过受控权限读取。

## 指标要对应生命周期中的动作

入口指标区分 Auth Rejected、Permission Rejected、Idempotent Replay、Admission Rejected、Created 和 Dispatch Failed。它们的分母是创建请求，不能与 Agent 答案成功率混在一起。Idempotent Replay 增多可能来自客户端网络重试，不等于业务请求增长。

队列与 Worker 观察 Pending Age、Queue Wait、Running Duration、Lease Renew Failure、Recovery Queued 和 Attempt Count。Pending Age 高而 Queue Depth 低，可能是 Dispatch 或路由问题；Queue Depth 高且 Worker Saturated 才指向容量。Running Duration 还要按 Resolved Mode 和当前阶段拆分。

Event 交付记录 Append、Commit、Publish 和总耗时，SSE 记录活跃连接、重放数量、数据库回退与 Cursor Lag。Redis 错误增加但 Cursor Lag 稳定，说明回退生效；Event 已写而 Lag 持续扩大，再检查轮询与代理缓冲。

终态按 Completed、Failed、Cancelled 和 Expired 分开，Failed 再按稳定错误类聚合。质量指标读取 Agent Eval 与反馈，不用 HTTP 2xx 或 Celery Success 代替。安全拒答可以是正确 Completed Contract，权限泄露即使返回流畅答案也是质量失败。

告警必须有处理动作。Pending Age 超限触发恢复扫描，Lease 续期失败检查活动执行，SSE Lag 触发数据库回退，Dispatch Failed 检查队列并保留 Turn。只有一条“Agent Success Rate 下降”无法决定该扩 Worker 还是修 Citation。

## 发布前怎样验证完整请求链

单元测试覆盖输入 Schema、幂等快速路径、准入释放、状态条件和 Event 编码。数据库集成测试并发创建同一键，检查 Conversation、Message、Turn 与首个 Event 是否原子出现，并验证终态 Event 唯一。

队列测试使用隔离 Broker，确认 Queue Name、Task ID、重复投递和 Worker 丢失后的行为。故障用例在 Dispatch 前后退出，验证 Failed 补偿或恢复投递；工具适配器记录 Action Fingerprint，证明重试不会执行两次。

浏览器测试创建 Turn，断开 SSE 后用 Last Event ID 重连，检查只补缺失事件；随后触发取消，确认页面最终显示 Cancelled，状态查询一致。禁用 Redis 后重复同一流程，数据库回退仍应完成交付。

安全测试用两个用户访问同一 `turn_id`，非所有者得到统一拒绝，Event 与 Status 都不泄露对象存在。页面 Scope 超出权限时，Turn Snapshot 只保存求交结果；Worker、恢复和 Eval 一直使用该范围。

测试证据记录环境、依赖版本和注入位置。Fake Queue 与内存 Store 只证明控制顺序，真实数据库、Redis 和 Broker 测试才覆盖事务与协议。外部模型未调用时，报告不能写“端到端答案已验证”。

## 同步调用、队列与工作流引擎怎样取舍

任务能在普通请求时限内完成，没有断线恢复、取消和外部副作用时，同步调用减少数据库与队列成本。仍应保留请求级幂等和错误分类，但不必为了统一架构强行创建大量 Event。

队列适合把 API 与耗时 Worker 解耦，提供并发控制和至少一次投递。应用需要自己实现 Turn 状态、动作幂等、Deadline、恢复扫描和事件交付。Celery Task 成功不等于业务答案合格。

工作流引擎适合跨小时或跨天、等待人工信号和多 Activity 的流程，能持久化事件历史并重放。它增加确定性代码、版本演进和运维约束；面向产品的 Conversation、Turn、Message、Evidence 和 Policy 仍需单独建模。

选择依据来自执行时长、失败代价、控制需求和恢复证据，不是框架流行度。无论采用哪种基础设施，请求生命周期都要回答四个问题：何时算受理，哪个稳定 ID 代表任务，失败后怎样确认是否执行，客户端怎样读到同一终态。

## 受理、执行和交付是三个时刻
请求通过认证和幂等检查后才算受理，Worker 取得执行 Lease 才算开始，答案被持久化并可按权限读取才算交付。HTTP 连接断开只影响通知，不应让业务状态回到未知。

接口返回稳定的 `turn_id`、状态和重试提示。重复创建返回同一 Turn，终态查询不重新触发模型，事件流只是状态的一个投影。
