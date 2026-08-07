---
title: "pgvector、索引结构、召回率与向量写入"
description: "从精确扫描推进到 HNSW/IVFFlat，理解距离算子、过滤顺序、索引参数、批量写入和召回评测。"
category: ai-agent
part: "第三部分：让 Agent 使用知识"
chapter: 11
tags: ["PostgreSQL", "pgvector"]
prerequisites: ["SQL 基础", "读过第 10 章"]
outcomes: ["为向量列选择距离与索引", "建立 Recall@K 检查"]
practice:
  type: implementation
  result: "设计一张可版本化的向量表与查询"
  verify: ["查询使用兼容算子", "候选结果能与精确基线比较"]
evidence: official-guided-operation
updated: 2026-08-06
---
# pgvector、索引结构、召回率与向量写入

上一章得到了一组固定维度向量。本章把它们存进 PostgreSQL，并回答三个工程问题：SQL 怎样按距离排序；数据变多后怎样使用近似索引；加上租户和版本过滤后为什么可能找不到正确结果。

所有 SQL 使用匿名表名和模拟数据，目的是解释 pgvector 行为，不对应任何私有表结构。

## 先建立可版本化的数据模型

一个教学表可以包含：

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunk (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  source_version text NOT NULL,
  content text NOT NULL,
  embedding_model text NOT NULL,
  embedding vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

`vector(768)` 把维度固定为 768，错误维度在写入时就失败。`tenant_id` 和 `source_version` 用于权限与版本过滤，`embedding_model` 防止不同模型的数据被当作同一空间。

真实系统还会保存结构路径、引用位置、内容哈希和发布状态。本文只保留理解检索所需字段。

## 精确查询是评测基线

假设模型约定使用余弦距离，pgvector 的 `<=>` 返回 cosine distance，越小越接近：

```sql
SELECT id, content, embedding <=> $1::vector AS distance
FROM document_chunk
WHERE tenant_id = $2
  AND source_version = $3
  AND embedding_model = $4
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

`WHERE` 固定租户、知识版本和模型；`ORDER BY` 使用距离算子；`LIMIT` 取 Top 10。相似度若需要展示，可以按模型语义转换，但排序最好直接使用索引支持的距离表达式。

没有近似索引时，数据库计算所有符合过滤条件的向量距离，结果是精确的。数据小时它简单可靠；数据增长后计算量与候选数成正比。

## HNSW 与 IVFFlat 在解决什么

近似最近邻索引用较少计算换取速度和内存，但可能漏掉真实 Top K。

### HNSW

HNSW 构建多层邻接图，查询时从稀疏层逐步接近目标。通常有较好的查询性能和召回，不要求训练阶段，但构建慢、占用内存较多。

```sql
CREATE INDEX document_chunk_embedding_hnsw
ON document_chunk USING hnsw (embedding vector_cosine_ops);
```

`vector_cosine_ops` 必须与余弦距离查询匹配。查询探索范围可通过 `hnsw.ef_search` 调整；更高值通常提高召回并增加查询成本。

### IVFFlat

IVFFlat 先把向量划分到多个列表，查询时只探测部分列表。它构建较快、内存相对可控，但需要已有数据用于聚类，数据分布大幅变化后可能需要重建。

```sql
CREATE INDEX document_chunk_embedding_ivf
ON document_chunk USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

查询时的 `ivfflat.probes` 决定探测列表数量。`lists` 和 `probes` 没有适合所有数据量的固定值，要通过目标数据和评测集选择。

## 过滤条件为什么影响近似召回

查询不仅有向量距离，还有租户、版本、状态和 ACL 过滤。近似索引先找到邻居，再应用过滤时，候选可能大量被排除，最终不足 K 条。

pgvector 新版本为迭代扫描等场景提供了改进，但设计仍要考虑：

- 给高选择性字段建立普通索引；
- 按稳定大粒度范围做部分索引或分区；
- 提高搜索参数以获得更多候选；
- 监控过滤后候选数量；
- 权限过滤必须在 SQL 内完成，不能先全局召回再在应用层删掉敏感内容。

性能和安全发生冲突时，安全过滤优先。不能为了“召回够十条”自动放宽租户或知识范围。

## 用 Recall@K 比较近似结果

对同一查询集运行两次：一次关闭近似索引或使用精确扫描得到基线，一次使用候选索引。计算近似 Top K 覆盖了多少精确 Top K。

```text
exact_top_10  = [A, B, C, D, E, F, G, H, I, J]
approx_top_10 = [A, B, C, D, E, F, G, X, Y, Z]
Recall@10 = 7 / 10 = 0.7
```

这个数字只是单个查询。真实评测对所有查询汇总，还要按短查询、长问题、不同租户和不同文档类型分组。召回率不是答案正确率，它只衡量候选搜索阶段。

## 批量写入怎样避免半批错位

向量服务返回批量结果后，写入前检查：

1. 输出数量与输入数量一致；
2. 每条结果能通过输入 ID 对齐；
3. 维度符合列定义；
4. 所有值为有限数；
5. 模型版本与候选索引一致；
6. 内容哈希仍对应当前片段版本。

写入使用候选版本。重复任务按稳定片段 ID 和向量版本执行 Upsert；旧任务发现目标版本已经过期时停止写入。所有片段完成、数量与质量检查通过后，再把候选版本原子设为 active。

不要边生成向量边直接覆盖在线版本。部分失败会让一个知识版本同时包含新旧模型向量，查询结果难以解释。

## 用 EXPLAIN 检查查询是否符合预期

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM document_chunk
WHERE tenant_id = 'demo'
  AND source_version = 'v2'
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

观察计划是否使用预期向量索引、过滤移除了多少行、实际返回多少候选、缓冲区读取和耗时。示例中的向量需要替换为真实同维查询向量。

测试数据太少时优化器选择顺序扫描可能合理。不要看到 Seq Scan 就立刻强制索引，先核对数据规模、选择性和统计信息。

## 什么时候不用 pgvector

pgvector 适合已经使用 PostgreSQL、需要事务元数据与向量共同管理、规模和延迟目标能够满足的系统。以下情况需要重新评估：

- 向量规模或查询吞吐远超单集群规划；
- 需要专用分布式向量能力；
- 多模态和复杂索引功能超出扩展能力；
- 团队无法承担 PostgreSQL 的索引内存与维护。

选择专用向量数据库并不会消除版本、权限、召回评测和写入一致性问题，只是基础设施边界改变。

## 本章操作清单

- 向量列维度固定并与模型一致；
- 查询和索引使用同一距离算子；
- 租户、状态与知识版本在 SQL 中过滤；
- 保留精确搜索评测基线；
- HNSW/IVFFlat 参数由目标数据实验决定；
- 批量输出按稳定 ID 对齐并校验；
- 候选索引完整后才激活；
- EXPLAIN 与 Recall@K 一起评估，不能只看耗时。

下一章把向量检索与精确、全文和结构化通道组合。向量负责语义近似，不应该承担所有查询类型。

## 参考资料

- [pgvector README](https://github.com/pgvector/pgvector)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

