---
title: "06｜混合检索、查询规划与重排"
description: "组合精确标识、全文、向量、表格和范围检索，并为失败设计降级。"
category: agent-practice
tags: ["Retrieval", "Rerank"]
updated: 2026-08-04
order: 60
depth: core
series: "生产级知识 Agent 实战"
---
# 06｜混合检索、查询规划与重排

知识 Agent 的问题分布很不均匀：`REQ-2026-017` 需要精确标识命中；“如何恢复失败任务”适合全文和向量；“比较两个方案的权限差异”需要多个主题分支；表格中的字段值可能只有结构化过滤才能找出。单一向量召回会漏掉标识符，单一全文又无法处理同义表达。混合检索不是把几个分数相加，而是让每个通道承担明确职责，并保留可解释的候选来源。

## 先建立通道契约

```python
Channel = Literal["exact", "sparse", "dense", "table", "scope"]

class SearchBranch(BaseModel):
    id: str
    channel: Channel
    query: str
    scope_ids: tuple[str, ...] = ()
    top_k: int = 20
    deadline_ms: int = 5000

class Candidate(BaseModel):
    chunk_id: str
    source_version_id: str
    content: str
    title: str
    score: float
    channels: tuple[Channel, ...]
    structured_fields: dict[str, str] = {}
```

任何分支都必须带 release、ACL 和超时上下文，不能因为是“精确查询”就绕过权限。通道返回原始 rank、score 和 query，后续融合记录来源；否则只剩一个不可解释的最终分数。

## 查询预处理不是关键词特判

预处理应完成结构化理解：标准化 Unicode、提取业务标识、识别日期和枚举、拆分多目标、保留原问题。不能为一条回归用例增加“如果包含某个标题就查这个表”的硬编码。

```python
class QueryFeatures(BaseModel):
    original: str
    normalized: str
    identifiers: tuple[str, ...] = ()
    quoted_phrases: tuple[str, ...] = ()
    targets: tuple[str, ...] = ()
    asks_comparison: bool = False
```

标识符提取只用于增加 exact 分支，不应改变用户问题的事实含义。日期标准化要保存原文与规范化值，避免把“2025 年 3 月”误当成精确日期。

## 精确、稀疏、稠密各自解决什么

| 通道 | 优势 | 失败模式 | 适合验证 |
| --- | --- | --- | --- |
| exact | 编号、URL、字段值精确 | 拼写变体、无标识问题 | 命中率、误匹配 |
| sparse/全文 | 术语、否定词、代码 | 同义改写、语言差异 | Recall、query parser |
| dense/vector | 语义相似、跨表达 | 数字/专名、权限过滤后空 | Recall@K、ANN 延迟 |
| table | 表头字段与关系 | 跨行、脏表结构 | relation accuracy |
| scope | 目录/组织范围 | 路径陈旧、权限变更 | 越界数必须为 0 |

PostgreSQL `tsvector` 的词法归一化、中文分词扩展、向量距离和 SQL 过滤都属于不同机制。用一种通道的分数直接和另一种通道相加没有统计意义，先做 rank fusion 或各通道归一化，再重排。

## 稀疏查询要有保守降级

精确问题应先 strict sparse：要求标识/短语尽量完整。无结果时可以去掉低信息停用词、拆出 relaxed phrase，再尝试 source-scoped fallback；只有明确允许时才 broad fallback，否则会把无关文档误召回。

```python
def sparse_queries(features: QueryFeatures) -> list[str]:
    values = [features.normalized]
    if features.identifiers:
        values.insert(0, " ".join(features.identifiers))
    relaxed = " ".join(
        token for token in features.normalized.split()
        if len(token) > 1
    )
    if relaxed and relaxed not in values:
        values.append(relaxed)
    return list(dict.fromkeys(values))
```

每次 fallback 要产生 event：命中了哪个规则、返回多少候选、是否跨 source。否则线上只能看到“检索没命中”，无法判断索引坏了还是查询过严。

## 向量通道的过滤顺序

向量近邻查询不能先从全库取 top 20 再在应用层过滤权限，这会造成漏召回和越权缓存。SQL 应在同一查询中加入 release、scope、subject、group 和状态条件。近似索引的过滤效率还取决于表设计和参数，应以 explain 和真实数据验证。

```sql
SELECT c.id, c.content,
       1 - (e.embedding <=> :query_vector) AS score
FROM chunk_embeddings e
JOIN chunks c ON c.id = e.chunk_id
JOIN release_chunks rc ON rc.chunk_id = c.id
WHERE e.release_id = :release_id
  AND rc.visible = TRUE
  AND (
    c.visibility_scope = 'public'
    OR c.subject_id = ANY(:subject_ids)
  )
ORDER BY e.embedding <=> :query_vector
LIMIT :limit;
```

这里的 `visible` 仍只是示例字段；真实权限通常需要祖先范围、组、显式节点和版本修订的联合条件，必须在第 07 篇继续展开。

## Rank fusion 与文档去重

不同通道的原始分数不可直接比较。Reciprocal Rank Fusion（RRF）用 rank 而不是绝对分数合并：

```python
def rrf(rank: int, k: int = 60) -> float:
    return 1.0 / (k + rank)

def fuse(ranked_lists: dict[str, list[Candidate]]) -> list[Candidate]:
    by_chunk: dict[str, Candidate] = {}
    scores: dict[str, float] = defaultdict(float)
    for channel, candidates in ranked_lists.items():
        for rank, candidate in enumerate(candidates, 1):
            by_chunk.setdefault(candidate.chunk_id, candidate)
            scores[candidate.chunk_id] += rrf(rank)
            by_chunk[candidate.chunk_id].channels = tuple(
                sorted(set(by_chunk[candidate.chunk_id].channels) | {channel})
            )
    return sorted(by_chunk.values(), key=lambda item: scores[item.chunk_id], reverse=True)
```

chunk 去重后还要限制同一文档的 chunk 数。否则一篇长文占满 top K，多个独立来源没有机会进入回答。文档多样性是召回质量的一部分，不能只优化单点相似度。

## 重排输入需要上下文但不能越权扩展

Reranker 接收 query 和候选文本，通常比向量距离更能判断相关性。输入可以包含父标题和有限相邻块，但必须已经通过 ACL/release 过滤。重排失败时用可解释 fallback（融合分、词法覆盖和文档多样性），不能返回未排序的数据库顺序。

```python
def fallback_score(candidate: Candidate, lexical: float, maximum: float) -> float:
    retrieval = candidate.score / maximum if maximum > 0 else 0.0
    return lexical * 0.65 + retrieval * 0.35
```

模型分数需要裁剪和版本化，不能跨模型直接比较。评测报告同时保存 `retrieval_score`、`rerank_score`、`final_score` 和通道集合，方便分析“召回了但被重排错杀”。

## 查询规划与多目标问题

一个问题可能包含两个独立目标。把整句一次 embedding 往往只覆盖其中一个。Planner 输出 SearchPlan：目标、分支、最大研究轮数、证据预算和最低覆盖率。分支 ID 唯一，执行结果可以并行合并。

```python
plan = SearchPlan(
    objective="分别比较两个策略的缓存失效和回滚条件",
    branches=(
        SearchBranch(id="target:a", channel="sparse", query="策略 A 缓存失效"),
        SearchBranch(id="target:b", channel="sparse", query="策略 B 缓存失效"),
        SearchBranch(id="relation", channel="table", query="策略 回滚 条件"),
    ),
    max_research_rounds=1,
    evidence_budget=20,
)
```

规划结果必须经过确定性校验：分支上限、每支 deadline、query 非空、scope 不扩张、总预算不超过模式配额。模型不能自行添加“查整个知识库”的分支。

## 缓存与 single-flight

确定性 exact/sparse 查询可做 release-pinned cache。缓存值只存候选元数据，不存未经验证的最终答案；命中后重新做可见性检查。并发 miss 通过带 TTL 的分布式锁 single-flight，锁持有者失败时其他请求应安全重算而不是永久等待。

## 实验设计

建立分层 query 集：精确标识、同义改写、数字和日期、表格关系、多目标、无答案、权限边界。对每个 query 记录各通道的 Recall@5/20、MRR、文档多样性、P95 延迟和成本。对比：仅向量、仅全文、RRF、RRF+rerank；不能只拿最容易的 20 条样本证明方案有效。

```python
def assert_retrieval_budget(trace: dict[str, object]) -> None:
    assert trace["branch_count"] <= 6
    assert trace["candidate_count"] <= 100
    assert trace["scope_expanded"] is False
    assert trace["release_id"]
```

## 失败路径

- embedding 服务超时：保留 sparse/exact，记录 dense disabled，不把空向量写入索引；
- rerank 服务失败：使用融合分 fallback，并降低质量置信度；
- Redis cache 不可用：直接查询数据库，不能阻断正确性；
- strict sparse 无结果：按有限、可审计顺序降级；
- 全部通道无结果：进入 `insufficient_evidence`，而不是让模型自由回答。

## 用实验校准分数而不是凭感觉调权重

RRF 的 `k`、同文档上限、dense/sparse 候选比例和 rerank top N 都应通过固定数据集网格实验选择。实验报告至少记录 Recall@K、MRR、独立文档数、P95 查询时间、数据库扫描行数和模型重排成本。一个参数若只改善某类精确编号问题，却让自然语言问题下降，应按问题类型分层配置，而不是寻找一个“全局最佳值”。

```python
def report_variant(name: str, cases: list[EvalCase], results: list[RetrievalResult]) -> dict:
    return {
        "variant": name,
        "recall_at_20": mean(item.hit_at_20 for item in results),
        "mrr": mean(item.reciprocal_rank for item in results),
        "p95_ms": percentile([item.latency_ms for item in results], 95),
        "unique_documents": mean(item.unique_documents for item in results),
    }
```

实验输入必须固定 release 和权限主体，否则不同候选看到的文档集合不同，权重结论没有可比性。线上缓存和 ANN 随机性还要在报告里标记，不能把一次冷缓存结果与一次热缓存结果直接比较。

## 查询重写的证据约束

模型提出的 query 不能成为新的事实来源。重写器保留原问题、提取出的 target 和范围，不允许加入原问题没有出现且没有别名证据支持的实体；每个生成 query 写入 trace，便于审查“为什么搜了这个词”。如果重写失败，使用确定性 normalize 后的原问题。

```python
def safe_rewrite(original: QueryFeatures, proposed: str) -> str:
    original_anchors = set(original.identifiers) | set(original.quoted_phrases)
    proposed_anchors = extract_identifiers(proposed)
    if not proposed_anchors.issubset(original_anchors | known_aliases(original)):
        return original.normalized
    return proposed
```

## 从召回到回答的可观测链

检索 trace 应能按 `branch_id` 查看 query、通道、候选数、过滤数、top chunk、rerank score 和 fallback。只保留最终 top 5 会丢掉“正确候选被哪一步过滤”的信息；可以保留 ID、分数和原因，正文按隐私策略脱敏。质量问题必须能定位到 query planner、SQL filter、融合器还是 reranker。

## 实施细节与失败路径

检索规划应先识别查询约束，再选择通道：精确标识走过滤，概念问题走向量，术语和版本号走全文，关系问题可以补图或结构化查询。每个分支输出命中原因、范围和失败类型，融合器再按可解释特征去重、归一化和排序。没有足够证据时宁可返回缺口，也不要用重排分数掩盖召回失败。

实现时把关键不变量写成可执行约束：输入状态必须包含版本、权限和截止时间；节点输出必须能被序列化；外部副作用必须有幂等键和结果记录；终态必须同时写入业务状态与可重放事件。对每一条约束准备一个正常样例、一个边界样例和一个故障样例，并在 CI 中运行。

| 关注点 | 正常路径 | 故障路径 | 验收证据 |
| --- | --- | --- | --- |
| 数据版本 | 使用固定 release | 发布中途失败 | 回合可复现 |
| 权限范围 | 查询带范围快照 | 范围被撤销 | 越界证据为零 |
| 外部依赖 | 在 deadline 内完成 | 超时或限流 | 分类错误与重试记录 |
| 终态 | 答案、引用、事件一致 | Worker 崩溃 | 重放后状态一致 |

```text
请求 -> 持久化事实 -> 执行节点 -> 验证产物 -> 写入终态 -> 事件重放
```

## 参考资料

- [PostgreSQL：Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)：全文检索、tsvector 与 tsquery。
- [pgvector](https://github.com/pgvector/pgvector)：向量距离、近似索引和过滤查询。
- [LangChain：Retrieval](https://python.langchain.com/docs/concepts/retrieval/)：检索增强生成的组件边界。
- [RRF 原论文](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)：以 rank 合并多个检索列表的依据。
