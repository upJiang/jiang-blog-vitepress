---
title: Tree of Thoughts：候选路径如何搜索
description: 把 Tree of Thoughts 拆成状态、候选生成、评分、剪枝、回溯与预算控制，并用可运行的 Best-first 搜索验证停止条件。
category: ai-agent
part: 单 Agent 推理
stageKey: single-agent
chapter: 29
sequence: 29
slug: tree-of-thoughts-search
tags:
  - Tree of Thoughts
  - Search
  - Pruning
sourceKey: ai-tree-of-thoughts-search
dependsOn:
  - agent-planner-search-plan
updated: '2026-08-17'
lastUpdated: false
---
# Tree of Thoughts：候选路径如何搜索

知识 Agent 要回答“远程访问是否需要二次审批”。检索当前策略是一条路径，查通用手册是另一条路径，归档库里也有一份同名旧规则。若系统沿第一条看似相关的结果直接生成，可能把旧版本或缺少生效状态的文字当成答案。

这类任务需要暂时保留多个候选方向，比较每条路径已经获得的证据和仍缺少的事实，再决定扩展哪一支。

**Tree of Thoughts（思维树）** 把中间候选表示为可搜索状态，使用生成、评分、剪枝和停止条件探索解空间。“Thought”在工程实现中是一种外显任务状态，不代表应用读取了模型完整的内部思维。

## 哪类问题值得使用搜索树

ToT 的成本来自分支。它适合同时满足这些条件的任务：

1. 存在多条合理路径，初始无法确定哪一条有效。
2. 早期路径选择会显著影响后续结果。
3. 中间状态能够被程序或受控评估器比较。
4. 错误路径可以在产生最终副作用前停止。

复杂故障排查、约束规划、候选方案搜索和多来源验证可能满足这些条件。原子事实、确定公式、已有唯一错误栈和固定业务工作流通常不需要 ToT。

如果状态无法评分，搜索树只是在批量生成文字。如果每条路径最终都调用不可逆工具，回溯也无法撤销已发生的副作用。ToT 更适合先在只读信息和候选方案上探索，确定路径后再进入独立审批与执行。
## 线性推导的失败发生在哪里

单路径推导每一步只保留一个后继。第一步把归档策略选为当前规则，后续即使逻辑完整，结论仍建立在失效证据上。再次生成一条线性路径也可能重复同一高概率选择。

ToT 会同时保留几种状态：

```text
路径 A: 找到当前策略正文，缺少活动 Release
路径 B: 找到通用手册，缺少具体审批条件和版本
路径 C: 找到归档规则，已确认不活动
```

路径 C 可以因非活动证据被剪枝。路径 A 更接近目标，优先扩展“验证活动 Release”。路径 B 暂留在 Frontier，若 A 失败还可继续探索。

ToT 的收益来自可恢复的早期选择，不来自把一条解释画成树形。
## 节点保存状态，不保存散文

节点至少包含稳定身份、父节点、深度、评分和领域状态：

```text
ThoughtNode {
  node_id
  parent_id
  depth
  score
  state
}

SearchState {
  proposed_action
  evidence_ids
  missing_facts
  conflicts
  inactive_evidence_count
  accumulated_cost
}
```

`proposed_action` 只是下一步候选。真正调用检索或工具时，仍经过 Runtime 的白名单、Scope、预算和参数校验。模型不能通过节点文字直接执行动作。

`evidence_ids` 指向当前 Turn 可见且版本固定的 Evidence。正文留在证据存储，节点保存引用，避免每个分支复制大段文本。`missing_facts` 让评分与目标覆盖建立联系。

状态需要一个规范化签名。例如把排序后的 Evidence ID、缺失事实和冲突状态组合成 Signature。两个节点即使动作描述不同，只要得到的有效状态相同，就没有必要重复扩展。
## 分支因子和深度怎样放大成本

每个节点生成 `b` 个候选，最多展开深度 `d`，完整树节点上界为：

```text
1 + b + b² + ... + bᵈ
```

当 `b=3`、`d=4` 时，上界已经达到 121 个节点。每个节点若包含一次生成和一次模型评分，成本会迅速超过普通 Agent Loop。

因此配置需要同时限制：

```text
max_depth
branching_factor
node_budget
pruning_threshold
deadline
token_budget
```

`node_budget` 是最直接的总上限。深度与分支因子控制搜索形状，不能替代总节点限制。预算按已评估节点扣减，不等到整层生成完再检查。

动态预算还可以考虑节点成本。一次精确索引查询和一次网页抓取消耗不同，SearchState 保存累计成本后，评分可以惩罚高成本但没有新增覆盖的路径。
## Best-first Search 怎样推进

**Best-first Search（最佳优先搜索）** 每次从 Frontier 取当前分数最高的节点扩展。基本流程是：

```text
创建根状态并评分
while Frontier 非空:
    检查总预算与 Deadline
    取最高分节点
    若满足 Goal，返回 solution_found
    若达到深度上限，跳过扩展
    生成有限候选
    对每个新状态去重、评分、剪枝
Frontier 为空或预算耗尽，返回明确停止原因
```

分数相同时需要稳定规则，例如优先较浅节点，再按节点 ID 排序。没有确定的平局处理，同一输入并发完成顺序不同就可能选择不同路径，测试和回放会变得困难。

Best-first 不保证全局最优。评分函数有偏差、剪枝阈值过高或预算太小时，真正可行路径可能尚未展开。返回结果必须携带停止原因和探索统计，不能只给一个 `best_path`。
## 评分函数必须对应任务进展

用“出现 therefore 加分、文字更长加分”很容易被表面格式欺骗。知识任务的评分可以围绕已验证状态：

```text
score = required_fact_coverage
      - inactive_evidence_penalty
      - unresolved_conflict_penalty
      - repeated_action_penalty
      - normalized_cost_penalty
```

必需事实覆盖来自 Coverage Matrix。非活动 Evidence 和权限外 Evidence 不计入覆盖，并触发硬惩罚或直接剪枝。成本惩罚用于在同等覆盖时偏好更短路径，不能让便宜但错误的路径超过完整证据。

评分最好拆成硬门禁与软排序。越权、未知版本、非法工具和结构无效属于硬失败；覆盖、成本和新信息量用于合格节点之间排序。把所有条件揉成一个浮点数，可能让高覆盖分抵消权限违规。

模型评分适合判断开放方案的可行性或新颖性，仍要返回分项理由，并在标注集上校准。高风险事实与权限不交给模型分数裁决。
## 剪枝、去重与回溯各解决什么

**剪枝**停止扩展明显不合格的状态。阈值太低会保留大量噪声，阈值太高会在早期信息不足时错杀潜在路径。可以按深度设置阈值，浅层允许适度探索，越接近终点越要求完整证据。

**去重**避免不同措辞到达同一状态。例如“按标题查当前策略”和“按别名查策略”都得到相同 Evidence 与缺口时，只保留一个签名。去重键不能只有动作文本，也不能忽略 Release 与 Scope。

**回溯**表示当前最好路径无法继续时，从 Frontier 选择次优候选。Best-first 的 Frontier 本身已经保留备选，通常不需要把“回溯”实现成重新生成整棵树。副作用动作没有天然回溯能力，必须在搜索完成后另行执行，或使用可补偿事务。

被剪枝节点可保留 ID、分数和原因用于诊断，正文与大型中间材料按生命周期清理。不要把所有失败分支永久塞进后续 Prompt。
## Goal Test 要比关键词终止可靠

看到候选里出现“最终答案”就宣布成功，属于文本启发式。知识问题的 Goal Test 可以是：

```text
所有必需事实已有当前有效 Evidence
没有未解决的关键冲突
Evidence 全部属于当前用户 Scope
计划要求的引用位置可用
候选没有触发安全阻断
```

Goal Test 由程序读取 SearchState，不依赖模型自称完成。若任务是 24 点或路径规划，Goal Test 可以用确定性求值器验证结果；若任务是架构方案，可能需要约束校验和人工评审，不能声称存在客观唯一解。

负向终止也要具体。`frontier_exhausted` 表示所有可探索节点都已处理，`budget_exhausted` 表示还有 Frontier 但资源不足，`deadline_exceeded` 表示时间边界到达。它们都不等同于 `solution_found`。
## 预算耗尽时怎样交付

搜索停止后，系统可以返回当前最佳状态，但要检查它是否具有交付资格。

若最佳状态已覆盖部分事实，回答可以明确列出已确认内容和缺失项。若核心问题完全没有可见 Evidence，应安全拒答。若最佳路径含失效证据或权限问题，不能因为分数最高就交付。

响应可以带稳定元数据：

```json
{
  "stop_reason": "budget_exhausted",
  "goal_satisfied": false,
  "covered_facts": ["current_policy"],
  "missing_facts": ["active_release"],
  "explored_nodes": 8,
  "pruned_nodes": 3
}
```

用户看到的是有范围的自然语言结论，内部元数据支持界面进度和诊断。不能显示“研究完成”后又在正文末尾含糊说资料可能不全。
## 可运行示例怎样实现搜索控制

仓库示例使用确定性 Expand、Evaluate 和 Goal 函数，实现可回放的 Best-first Search：

<<< ../../examples/ai-agent/thought_search.py

示例能验证节点预算、深度、剪枝、状态签名去重、稳定排序和三种停止原因。它的 `knowledge_search_branches` 是脚本化生成器，`score_knowledge_state` 是教学评分函数；两者不能证明真实模型会提出有效分支，也不能代表线上检索质量。

生产系统把 Expand 接到受限 Planner 或模型候选，把动作执行交给 Runtime，把 Evaluate 接到领域验证器。真实检索适配器还要处理超时、ACL、Release、缓存和 Evidence 去重。
## ToT 与 Planning、Reflection 的边界

Planning 先生成一张有限依赖图，适合已知任务结构。ToT 在运行时搜索多个候选状态，适合路径本身不确定。生产系统可以让 Planner 规定允许的搜索阶段，再在其中一个复杂节点使用 ToT。

Reflection 检查已有候选并进行有限修复。方向正确但答案漏写一条证据时用 Reflection；多个方向都可能成立且需要探索时才用 ToT。用 ToT 修标点或用 Reflection 重建整个路径，都会增加不必要成本。

普通 Agent Loop 每轮根据观察选择一个动作，也是一种在线搜索。ToT 的特殊之处在于显式保留多个 Frontier 状态并比较。若系统始终只保留一个节点，名字叫 ToT 也仍是单路径循环。
## 回归测试要故意让搜索失败

| 场景 | 关键断言 |
| --- | --- |
| 第一条路径使用旧版本 | 被硬门禁剪枝 |
| 两种动作到达同一状态 | 第二个状态不再扩展 |
| Goal 在浅层满足 | 立即停止并返回正确路径 |
| 所有节点低于阈值 | 返回 `frontier_exhausted` |
| Frontier 尚有节点但预算到达 | 返回 `budget_exhausted` |
| 评分相同 | 路径选择可重放 |
| 候选提出越权工具 | 执行前拒绝 |
| 迟到结果来自旧 Scope | 不写入当前节点 |
| 取消或 Deadline 到达 | 不生成新分支 |
| 最佳状态仍缺核心事实 | 不伪装成成功答案 |

离线评测比较 ToT 与单路径基线的任务成功率、严重错误、节点数、Token 和延迟。只报告“最优路径分数”无法判断评分器是否与真实成功一致。

ToT 的工程核心是一套有边界的搜索算法：状态可序列化，进展可评分，重复可识别，失败可停止。满足这些条件后，多路径才提供恢复早期错误的能力；缺少它们，树只会把模型调用量按分支数放大。
