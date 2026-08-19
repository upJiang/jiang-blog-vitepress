---
title: 卡循环检测的信号、裁决与修复
description: 组合重复动作、无状态变化、错误循环和进度信号，避免探测器替代根因修复。
category: ai-agent
part: Runtime 与异步执行
stageKey: runtime
chapter: 77
sequence: 77
slug: agent-loop-stall-detection
tags:
  - Agent Loop
  - Stall Detection
sourceKey: ai-agent-loop-stall-detection
dependsOn:
  - agent-watchdog-timeouts
updated: '2026-08-17'
lastUpdated: false
---
# 卡循环检测的信号、裁决与修复

模型不断返回 Tool Call，工具也不断响应，Event 流看起来十分活跃，答案却迟迟没有形成。这样的 Run 不是空闲，而是**忙碌但没有进展**。上一章的 Watchdog 依靠沉默时间无法识别它，因为每次调用都在刷新 Activity。

卡循环检测观察的是一段动作历史：模型选择了什么、参数是否相同、工具返回成功还是错误、状态是否推进、结果是否带来新证据，以及相同模式出现了多少次。单看“工具调用重复”会误杀分页、轮询和分块处理；单看状态 Revision 又会被无意义字段变化骗过。

::: info Idle 与 Stall 的区别

- **Idle**：当前所有者长时间没有活动，由阶段 Watchdog 处理。
- **Stall**：活动持续发生，但目标状态、证据或可交付结果没有进展。
- **Deadline**：无论 Idle 还是 Stall，都不能超过整条 Turn 的绝对终点。

:::

本文用一个搜索循环贯穿：模型连续改写“权限规则”查询，搜索工具每次都成功返回空列表。参数看起来在变化，网络也正常，Evidence 和 State Revision 却没有推进。探测器需要在误杀合法探索之前，给出带证据的有限裁决。

## 卡循环会出现哪些可观察现象

**工具调用次数持续增加，答案状态不变**是最直观的现象。Trace 中可以看到多个 Tool Result，但 Evidence 数量、Coverage、Plan Revision 和 Answer Revision 长时间不变化。

**相同成功动作重复发生**时，工具返回 200 或 `success=true`，输出指纹也完全一致。模型没有从结果中学习，又选择同一动作。这通常比重复错误更可疑，因为成功已经提供了可解释结果。

**相同错误反复出现**时，模型只修改无关参数，Error Class 与失败字段不变。例如缺少必填 Scope，却不断改写 Query。错误可能值得有限重试，但同一验证错误没有外部不确定性，重复多次没有意义。

**参数不断变化，结果始终为空**时，精确重复签名不会命中。工具族无进展、查询升级和 Evidence 增量信号可以发现这种“看起来不同”的循环。

**状态 Revision 增长，业务进度不增长**时，系统可能每轮写时间戳、日志或调用计数，让状态表面变化。Progress 需要使用业务字段，例如新增 Evidence、缩小 Missing Topics、完成 Plan Step，而不是任意 JSON 变化。

**停止后立即被恢复器重新启动**说明终止原因和可恢复状态没有对齐。Stalled 应是明确终态或人工审查状态，不能仍保留 Running Marker，让恢复扫描再次执行同一历史。

**探测器频繁误杀分页或轮询**说明动作签名和进度定义过粗。合法分页会改变 Cursor 并产生新结果，Job 轮询会让状态从 Pending 走向 Running、Completed。只按工具名计数会把正常协议当循环。

这些现象要与模型慢、流间隙、工具 Timeout 和 Worker 失联分开。卡循环通常有有效 Lease、连续 Event 和短调用延迟，区别在于业务状态没有朝终点推进。

## 进度必须围绕目标定义

“有变化”不等于“有进展”。进度是任务距离终止条件更近的可观察变化。不同 Agent 类型使用不同信号，Runtime 不能只提供一个全局布尔值。

研究型 Agent 的进度可以是新 Evidence、Coverage 增长、Missing Topic 减少、研究轮次完成或 Claim 获得支持。代码 Agent 可以使用测试失败数减少、文件 Diff 变化、编译阶段推进或用户验收项完成。审批 Agent 可以使用待审批项减少和状态迁移。

每个信号有稳定身份。相同 Evidence 重复加入不算进展；重新排序同一候选不算进展；把错误文案换一种写法也不算。进度计算在确定性程序中完成，模型可以报告“我有进展”，但不能自行增加 Progress Score。

状态可以分成三类：

| 类别 | 示例 | 是否重置无进展窗口 |
| --- | --- | --- |
| 业务进度 | 新 Evidence、Step Completed、缺口减少 | 是 |
| 控制进度 | 进入有限重试、降级或人工审查 | 视策略而定 |
| 观测变化 | 时间戳、日志数、Token 数、Heartbeat | 否 |

控制进度需要边界。第一次进入 Retry Policy 表示状态发生了有意义变化，但连续在 Retry 和 Execute 之间往返不能无限重置窗口。Runtime 保存 Research Round、Repair Attempted 和最大动作数，把探索、修复和停止写进显式状态机。

Progress Revision 只在业务不变量满足后提交。例如检索返回候选，经过 Scope、去重和版本检查后确实新增 Evidence，才增加 Revision。工具返回成功但产物被全部过滤，记录 Activity 和 Empty Result，不增加 Progress。

## 动作签名识别同一意图

动作签名由工具名、规范化参数和必要 Scope 计算。JSON 键排序，集合字段按协议排序去重，路径和 URL 做安全规范化，忽略 Trace ID、当前时间等传输字段。签名算法带版本，历史 Trace 才能重放。

```text
signature = hash(
  tool_name,
  normalized_arguments,
  scope_revision,
  tool_contract_version
)
```

签名不能只用工具名，否则 `search(page=1)` 与 `search(page=2)` 被合并。也不能把所有随机字段都保留，否则模型每次添加一个无意义 Nonce 就能绕过检测。哪些字段影响业务语义，由工具 Schema 声明。

输出也保存指纹。相同调用连续得到相同输出，比相同调用产生新状态更可疑。大结果只计算稳定摘要，不把敏感正文写进指标。空列表、相同错误类和相同业务对象 ID 都可以形成受控 Output Fingerprint。

Action Record 至少包含 Action Index、Signature、Outcome、Error Class、State Revision Before/After、Progress Units、Output Fingerprint、Attempt ID 和耗时。探测器返回命中的记录索引，停止原因可以回到具体证据，不只写“检测到重复”。

签名比较使用滑动窗口。背靠背相同动作抓紧密重复，窗口内分散相同动作抓“读、改、读、改”的回环。窗口不能无限增长，否则早期合法调用会在很久后误触发；Checkpoint 保存必要摘要，恢复不必加载完整历史。

## 单一重复规则不足以判断卡住

无进展有多种形状，至少需要几类互补信号。信号数量不是目标，每一类都应对应可复现故障和明确误报边界。

**连续相同成功**检查最近若干动作的 Signature、Output 和 State Revision。三者都不变化，说明模型在重复已经完成的动作。

**窗口内精确重复**允许中间穿插其他调用，用来识别循环回到相同状态。它要确认中间动作也没有产生 Progress，不能仅因签名重新出现就停止。

**相同错误重复**按 Tool 与 Error Class 聚合。网络 Timeout、限流和验证错误采用不同预算；Error Message 中的时间或 Request ID 不参与分类。

**工具族无进展**识别参数漂移。多个 `search.*` 调用 Query 不同，但始终没有 Evidence、State Revision 不变，就可能在同一策略上打转。

**查询升级无结果**观察检索路径是否不断扩大范围、降低阈值或更换改写，却没有新增候选。达到分支预算后停止，不让模型无限发明搜索词。

**空推理或空计划**识别模型持续返回结构合法但内容为空的 Decision。Structured Output 解析通过不代表动作有效，空 Action 应由 Schema 或业务校验尽早拒绝。

**成功后重复确认**识别动作已经获得可验证成功，模型仍反复读取同一对象或截图确认。是否允许二次确认由风险策略决定，不能全局禁止。

这些信号按优先级评估，先命中的规则形成 Decision 和 Evidence。多个规则同时命中时保存全部诊断标签，但只能有一个控制动作，避免一个 Nudge 与一个 Force Stop 同时写入上下文。

## 重复成功与重复错误使用不同预算

一次网络错误后重试成功，是正常恢复。重复错误可能来自瞬时依赖，应该允许有限退避和替代路径。相同动作连续成功，结果和状态都不变化，再做一次通常没有价值。

因此错误预算通常比重复成功预算更宽，但不是所有错误都一样。网络 Timeout 可以重试，认证拒绝要先刷新凭证或停止，权限拒绝不能通过换 Query 绕过，Schema Validation Error 应立即修正参数。相同必填字段连续缺失时可以快速 Force Stop。

错误恢复后要清空或衰减对应计数。历史里出现过错误，最近一次调用成功且带来 Progress，探测器不应在模型刚走出失败时惩罚它。计数按 Rule、Tool、Signature 和 Phase Revision 分桶，不能用一个全局次数。

成功预算也允许协议例外。轮询同一个 Job ID 可以合法重复，但 Status 必须推进或间隔符合策略；幂等写重放可能返回相同 Receipt，Runtime 识别它是恢复对账，不计为模型自主重复。豁免要绑定工具与明确 Progress，不按工具名整类关闭检测。

阈值是 Policy，不写死在 Prompt。不同模式、工具风险和任务类型可以分层配置，Turn 创建时固定版本。阈值调整要对照误报、漏报和成本，不从一条事故直接推广到全站。

## Continue、Nudge 与 Force Stop 是三种裁决

**Continue** 表示当前证据不足或仍有 Progress。Decision 仍可记录观察标签，但不改变模型上下文。

**Nudge** 给模型一次改换策略的机会。它说明命中的动作模式、禁止再次执行的 Signature 或工具族，以及剩余预算。Nudge 不是泛泛的“请不要重复”，而是结构化控制事件，并写入 Nudge Count。

**Force Stop** 阻止后续工具调用，保存 Trace 和部分产物，必要时进行一次无工具总结。总结模型只能读取已有 Evidence、动作历史和 Stop Reason，不能再产生 Tool Call。它向用户说明完成了什么、缺少什么、为什么停止。

Nudge 必须有上限和时间窗口。模型忽略一次后再次命中，同一规则升级为 Force Stop；没有上限的 Nudge 只是循环里新增的一条重复消息。升级由 Runtime 决定，模型不能通过承诺“下一次会不同”重置计数。

Force Stop 与 User Cancel、Deadline Expired、Tool Timeout 分开。终态可以是 Failed Stalled 或 Partial Stalled，取决于是否已有通过质量门禁的结果。停止后移除可恢复 Marker，恢复器读取终态，不再启动同一循环。

::: warning 停止总结不能继续调用工具

最后说明只整理已经确认的事实。若允许总结阶段继续搜索、读文件或执行命令，它会重新打开刚刚关闭的循环。

:::

## 并行分支按计划身份归并进度

Fan-out 会在同一阶段启动多个相似工具。五个搜索分支可能使用同一工具、相近参数，并以不同顺序完成。若探测器按全局完成顺序检查“连续相同工具”，会把合法并行误判成模型重复。

Action Record 要保存 `plan_step_id`、`branch_id` 和 `dispatch_batch_id`。同一批次的兄弟动作由 Planner 一次性声明，Detector 在分支内部检查重复，在 Fan-in 后计算整个批次的 Evidence 增量。模型在批次执行中途追加的相同调用不属于原计划，需要重新通过预算和去重。

并行完成顺序不能决定 Progress。分支 A 后启动先完成，分支 B 先启动后完成，Fan-in 按 Branch ID 和 Candidate ID 稳定合并。重复 Evidence 去重后只有第一份增加 Progress，其他分支记录 Duplicate Contribution，不因此判为循环。

一批分支全部成功但没有新候选时，Batch Progress 为零，工具族无进展窗口增加一次，而不是按五个分支增加五次。否则并发度越高，越容易一轮触发 Force Stop。相反，某个分支卡住由 Tool Timeout 或 Watchdog 处理，不能让其他分支的 Activity 替它证明有进展。

研究轮次也使用显式上限。第一轮零 Evidence 可以进入一次 Query Rewrite，第二轮仍无结果就按 Search Budget 停止。轮次推进是控制进度，但只允许有限次数；每轮都把 Round 加一，却没有新 Evidence，不得无限重置 Stall Window。

多 Agent 编排采用相同原则。SubAgent 各自拥有 Action Window，Orchestrator 观察 Task Completion、Artifact 和 Coverage。一个 SubAgent 卡循环不应让其他已完成任务回滚；Orchestrator 可以取消该分支，使用已有结果决定部分交付或失败。

部分交付记录三组分支：已经完成且通过验证、已经失败或卡住、尚未执行。Orchestrator 只能引用第一组产物，并在结果中列出缺口和停止原因；第二组保留错误证据，第三组明确标为未运行。这样用户不会把“某个分支停止”误解成整项研究已经覆盖。

Force Stop 到达时先关闭新的 Dispatch，再等待已经产生不可取消副作用的分支进入安全点。可取消的只读分支立即结束，已完成分支提交稳定 Artifact ID。汇合节点使用 Turn 终态做上限，迟到结果不能让 Stalled 回到 Running。

## Detector 状态必须跨 Checkpoint 恢复

Action Window、Nudge Count、Rule Counters、Policy Version 和最后 Progress Revision 属于运行状态。Worker 在 Nudge 后崩溃，新 Worker 若从空 Detector 开始，同一循环会重新获得完整预算，反复恢复就能永久运行。

Checkpoint 保存受控摘要：最近动作签名、Outcome、Error Class、Progress Revision、分支身份和每条规则计数。大参数与工具正文仍在 Trace，快照只保留哈希和稳定引用。恢复时验证 Signature Schema 与 Detector Policy 兼容，不用新算法重新解释一半旧窗口。

Detector Decision 与 Turn 状态在同一修订提交。Force Stop 已写 Event，但 Turn 仍 Running，会被恢复扫描重新领取；Turn 已 Stalled，Decision Event 未发布，则由 Outbox 补发。终态条件更新保证迟到工具结果不能把 Stalled 改回 Running。

配置升级可以让旧 Turn 沿用旧 Detector 直到结束，新 Turn 使用新版本。需要迁移窗口时，迁移函数明确转换哪些计数；无法兼容就清空窗口并减少剩余动作预算，而不是静默给出更多尝试。

历史 Action Record 存在隐私与安全边界。签名输入包含路径、查询或业务 ID，指标只保留 Tool Family、Rule 和版本，原参数进入受控存储。用户无法通过 Prompt 读取 Signature、阈值或其他分支的动作历史，也不能要求 Runtime 清空计数。

## 工具契约是第一道防线

探测器只能在动作历史出现后判断模式。第一次错误工具调用已经可能造成破坏，因此检测不能替代输入校验、权限、事务和幂等。

工具对必填字段、类型、范围和空值做确定性校验，在任何文件写入、子进程、GUI 或外部请求之前失败。错误返回稳定 `error_class`、字段路径和可重试性，不能用 `success=true` 包装“什么都没做”。

如果写入工具收到空内容却返回成功，探测器也许在第三次相同成功后停止，但第一次调用已经截断文件。正确修复是在工具入口拒绝空内容，并用契约测试遍历所有 Required Field。Stall Detector 只是第二道防线。

工具输出要诚实表达 Empty、No Change、Partial、Conflict 和 Unknown。`success` 只表示协议调用成功过于粗糙，模型无法区分没有结果与完成目标。Runtime 根据结构化 Outcome 计算 Progress。

工具适配器还要提供稳定幂等身份。恢复导致的重复动作返回原 Receipt，Action Record 标记 `replayed=true`，探测器不把它当模型循环。外部结果 Unknown 时停在人工对账，不能让检测器通过多次重试猜答案。

每次新增探测规则，都要先问能否在上游契约消除根因。能通过 Schema、状态机或唯一约束拒绝的问题，应先修上游；探测规则用于跨多步才可观察的模式，而不是补一个可在第一步发现的输入 Bug。

## 用最小探测器观察信号组合

下面的示例实现 Action Record、稳定签名和三类核心规则：重复成功无进展、同类错误重复、工具族参数漂移。它使用内存历史，不调用模型或工具，只验证裁决逻辑。

<<< ../../examples/ai-agent/stall_detection.py

相同成功需要 Signature、State Revision 和 Output Fingerprint 同时稳定才触发。分页改变 Cursor、State Revision 和 Progress Units，因此即使工具族相同也继续。

普通错误允许更大预算，连续验证错误则快速 Force Stop。工具族窗口捕捉不同 Query 但零 Progress 的搜索。第一次命中返回 Nudge，Nudge Count 达上限后相同证据升级为 Force Stop。

示例没有实现语义相似 Query、跨进程历史和无工具总结。生产实现把规则配置、Action Record 和 Decision 持久化，使用受控字段做指标，敏感参数正文留在 Trace 存储。

## 沿一次空搜索循环推演

用户询问“远程访问的管理员权限规则”。模型第一次调用 `search.web(query="管理员权限")`，工具成功返回空列表。State Revision 保持 1，Evidence 为 0，记录 Output Fingerprint `empty`。

第二次调用改成“管理员远程访问权限”，Signature 不同，仍返回空列表。精确重复没有命中，工具族无进展窗口开始累计。第三、第四、第五次继续改写，Progress Units 始终为 0，State Revision 仍为 1。

第五次后，Detector 返回 Nudge：规则是 `tool_family_without_progress`，证据索引指向五次搜索，剩余 Nudge 为 0。Runtime 把结构化提示加入下一次决策：当前搜索策略没有产生 Evidence，不能继续同类改写，应使用已有资料回答缺口、切换已批准检索通道或停止。

模型再次选择 `search.web`，只是换了同义词。相同窗口再次命中，Detector 返回 Force Stop。Runtime 禁止工具，保存五次空结果和最后一次动作，执行无工具总结。最终状态是 Partial Stalled，答案只说明当前范围没有找到证据，不编造权限规则。

若第二次调用实际返回一条新 Evidence，Progress Revision 增加，工具族窗口被打断；若五次调用分别翻页并每页获得新结果，Cursor、Output 和 Progress 都变化，不触发；若前四次是网络错误，第五次成功并新增 Evidence，错误计数结束，Run 继续。

这条轨迹说明参数变化不足以证明探索有效，重复工具名也不足以证明卡住。裁决依赖 Outcome、业务 Progress 和状态修订的组合。

## 诊断从动作历史与状态差分开始

发现卡循环时，固定 Turn ID、Attempt ID、Plan Revision、Action Index、Signature Version、Tool Contract Version、State Before/After、Progress Units、Outcome 和 Nudge Count。按时间排序，不先读模型的自我解释。

**合法分页被误杀**时，检查 Cursor 是否进入签名、Page Result 是否计入 Progress，以及去重后是否确实有新对象。修复后用多页有结果与多页空结果做对照。

**状态持续变化仍被判无进展**时，确认变化字段是否属于业务进度。若只是 Token、时间戳或日志，探测器判断正确；若 Missing Topics 减少却没有增加 Progress，修复进度计算。

**明显重复没有被检测**时，检查模型是否通过随机 Nonce、参数顺序或同义 Query 绕开签名。Nonce 应排除，集合排序，语义漂移交给工具族与结果信号，不用不透明向量相似度直接 Force Stop。

**同一验证错误重试过多**时，确认 Tool 是否返回稳定 Error Class。手写自然语言错误会让分类漂移，探测器只能走宽泛预算。修工具契约比降低所有错误阈值更安全。

**停止后再次运行**时，检查终态、恢复 Marker 和队列任务。Stalled Event 写入成功但 Turn 仍 Running，说明终态提交不原子；恢复任务应在领取后再次检查终态。

**Nudge 没有效果**时，检查 Nudge Count 是否持久化、相同规则是否升级，以及 Prompt 是否被上下文压缩丢弃。控制事件进入稳定状态，不依赖一段随时被裁剪的系统提示。

## 探测器要随证据演进

探测规则不是越多越好。每条规则登记对应故障、必要信号、误报样本、替代防线、负责人和版本。没有可复现事故或无法说明 Progress 的规则先以 Shadow 运行。

Shadow Detector 只记录 Decision，不执行 Nudge 或 Stop。离线回放人工标记的正常迭代和卡循环，统计规则精度、召回、触发时机与节省动作数。误报代价通常高于晚停几轮，尤其是代码修改和高成本研究任务。

规则可以删除。删除前证明原故障已经由工具校验、另一条更精确规则或阶段 Watchdog 覆盖，并回放历史样本。保留误报频繁的规则会让团队忽略所有 Stall 告警。

阈值变化采用 Canary，Turn 固定 Detector Policy Version。新旧规则并行记录同一 Action History，比较 Decision，不让运行中的 Turn 中途切换阈值。安全紧急规则可以立即收紧，但要产生治理事件。

豁免也版本化。允许 Poll 工具重复，不代表关闭它的全部检测；只豁免参数相同且 Job Status 推进的记录。工具更换协议后，旧豁免自动失效或经过重新评审。

跨文章和跨服务使用同一 Outcome、Error Class 与 Progress 词汇。工具、Runtime、Trace 和 Eval 对字段含义不一致时，探测器会在观测层制造第二套事实。

## 测试区分合法迭代与无进展

新增单元测试覆盖七条行为：重复成功无进展触发 Nudge；Nudge 达上限升级 Force Stop；普通错误比成功拥有更多次数；验证错误快速停止；分页有新 Cursor 和结果时继续；参数漂移但工具族无进展时命中；同一调用推进 State Revision 时继续。

运行命令如下：

```bash
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=examples/ai-agent \
  python3 -m unittest examples/ai-agent/tests/test_stall_detection.py
```

性质测试随机改变 JSON 键顺序、集合顺序和忽略字段，合法等价参数得到相同签名；改变 Scope、Cursor 和业务字段必须得到不同签名。签名升级保留 Fixture，避免发布后历史窗口全部失效。

集成测试用脚本化模型生成动作序列，Fake Tool 返回成功、空结果、错误和新 Evidence。断言调用次数、Decision、Event、终态、无工具总结和清理，不只断言 Detector 函数返回字符串。

故障测试让 Tool 第一次收到非法参数，确认它在副作用之前返回 Validation Error；Detector 随后能快速停止相同错误。测试不能只从第二次重复开始，否则会漏掉第一道防线。

恢复测试在 Nudge 后写 Checkpoint，再启动新 Worker。Nudge Count、Action Window 和 Policy Version 必须恢复，不能重新获得一套空白预算。Stalled 终态不得重新进入队列。

回归集包含正常分页、有限轮询、错误后成功、重新检索、新旧文件对比、并行工具和实际无进展序列。每次规则调整同时看误报和漏报，不能只增加卡循环样本。

## 生产观测与容量边界

指标按 Rule、Decision、Tool Family、Mode 和 Policy Version 聚合，观察 Nudge、Force Stop、误报回滚、平均节省动作、停止前成本和 Partial 交付率。Signature、Query 和文件路径不进入标签。

Trace 保存命中 Evidence Indices、State Diff 摘要、Progress 变化和 Threshold。运维可以从 Decision 回到动作历史，用户界面只展示可理解的停止原因，不暴露内部 Prompt 与敏感参数。

Detector 每轮计算要有明确复杂度。滑动窗口固定长度，签名在动作写入时计算，工具族计数增量维护。不要每次把整条长对话交给另一个模型判断是否循环，这会增加成本、延迟和新的不确定性。

动作历史有保留策略。运行中保留精确窗口，终态后保存受控摘要和必要审计；敏感参数按隐私策略处理。Checkpoint 只保存恢复 Detector 所需状态，不复制全部 Tool Result。

卡循环停止释放模型和工具配额，取消未开始分支，保留已发生副作用回执。若 Stop Summary 模型也失败，Runtime 仍写 Stalled 终态，使用确定性模板列出已完成步骤和缺口，不重新开放工具。

验收时既要让无进展序列在预算内停止，也要让分页、轮询和错误后恢复继续；停止结果必须带动作证据和缺口，Checkpoint 恢复后不得重置 Nudge 与规则计数。四项有任一失败，规则都不能进入全量处置。

设计评审时，分别推演重复成功、重复错误、不同 Query 空结果和合法分页。每条轨迹都能说明 Signature、Progress、预算、Decision、用户结果和根因修复位置，卡循环检测才不是一个粗暴的“调用次数上限”。
## 停止信号必须能解释“为什么”
卡循环检测不是给 Agent 设置一个粗略的调用次数上限。它要比较动作签名、状态差异、错误类别和有效进度，并把命中的窗口与阈值写入运行记录。这样合法分页和重复失败可以分别处理，恢复时也能继续使用已保存的计数。

最小回归集包含成功无变化、失败重试、分页推进和同一工具不同参数四种轨迹。探测器只负责停止，根因修复仍属于工具、检索或计划模块。
