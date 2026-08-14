---
title: pgvector、索引结构、召回率与向量写入
description: 从精确扫描推进到 HNSW/IVFFlat，理解距离算子、过滤顺序、索引参数、批量写入和召回评测。
category: ai-agent
part: 知识怎样进入 Agent
chapter: 43
tags:
  - PostgreSQL
  - pgvector
prerequisites:
  - SQL 基础
  - 理解 Embedding 与距离函数
outcomes:
  - 为向量列选择距离与索引
  - 建立 Recall@K 检查
practice:
  type: implementation
  result: 设计一张可版本化的向量表与查询
  verify:
    - 查询使用兼容算子
    - 候选结果能与精确基线比较
evidence: official-guided-operation
updated: 2026-08-06T00:00:00.000Z
lastUpdated: false
---
# pgvector、索引结构、召回率与向量写入

pgvector 是 PostgreSQL 的扩展，为关系表增加向量列、距离算子和近似最近邻索引。它位于 Embedding 投影和 Retriever 之间：负责把带有 Release、模型版本和范围字段的向量存起来并参与候选召回，不负责生成向量、决定权限，也不自动证明 Recall 合格。

索引实验从 PostgreSQL 精确扫描开始，再比较 HNSW、IVFFlat、过滤顺序和 Recall@K。向量写入只使用与实验相关的最小数据模型；Release 激活和并发写入仍按前文投影契约实现。

前面的 Embedding 处理得到了一组固定维度向量。这里把它们存进 PostgreSQL，并回答三个工程问题：SQL 怎样按距离排序；数据变多后怎样使用近似索引；加上租户和版本**过滤**后为什么可能找不到正确结果。

所有 SQL 使用匿名表名和模拟数据，目的是解释 **pgvector** 行为，不对应任何私有表结构。

## 可版本化的向量数据模型

先在安装了 PostgreSQL 与 pgvector 的隔离数据库执行建表，不要直接改线上业务库。输入是已经通过维度与有限数检查的 768 维片段向量；目标是让内容、租户、知识版本、模型版本和向量留在同一条可过滤记录中。执行后应该能从系统目录看到 `vector` 扩展和 `document_chunk` 表；若扩展未安装或向量维度不符，数据库会明确拒绝。

这个用于理解字段职责的教学表可以包含：

```sql
-- vector 扩展提供向量列、距离算子和 HNSW/IVFFlat 索引访问方法。
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunk (
  -- 片段 ID 作为主键，重复导入同一片段时必须走更新或幂等写入。
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

下面的 SQL 把“精确查询是评测基线”落到数据库操作。执行前确认连接的是隔离环境、筛选条件和事务范围，执行后同时观察结果行与计划；异常时先保留原错误而不是改成空结果。
```sql
SELECT id, content, embedding <=> $1::vector AS distance
FROM document_chunk
-- 先按权限、知识版本和模型版本过滤，避免在不可见或不兼容向量中近邻搜索。
WHERE tenant_id = $2
  AND source_version = $3
  AND embedding_model = $4
-- 按与索引一致的距离算子升序排列，数值越小表示越相近。
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

`WHERE` 固定租户、知识版本和模型；`ORDER BY` 使用**距离算子**；`LIMIT` 取 Top 10。相似度若需要展示，可以按模型语义转换，但排序最好直接使用索引支持的距离表达式。

没有近似索引时，数据库计算所有符合过滤条件的向量距离，结果是精确的。数据小时它简单可靠；数据增长后计算量与候选数成正比。

## HNSW 与 IVFFlat 在解决什么

近似最近邻索引用较少计算换取速度和内存，但可能漏掉真实 Top K。

### HNSW

**HNSW** 构建多层邻接图，查询时从稀疏层逐步接近目标。通常有较好的查询性能和召回，不要求训练阶段，但构建慢、占用内存较多。

下面的 SQL 把“HNSW”落到数据库操作。执行前确认连接的是隔离环境、筛选条件和事务范围，执行后同时观察结果行与计划；异常时先保留原错误而不是改成空结果。
```sql
-- vector_cosine_ops 必须与查询使用的余弦距离算子 <=> 保持一致。
CREATE INDEX document_chunk_embedding_hnsw
ON document_chunk USING hnsw (embedding vector_cosine_ops);
```

数据库按 `CREATE` 对应的语句执行“HNSW”。结果不仅要看是否返回行，还要检查过滤范围、受影响行数和事务状态；锁等待、计划退化或零行更新都应作为可诊断结果处理。

`vector_cosine_ops` 必须与余弦距离查询匹配。查询探索范围可通过 `hnsw.ef_search` 调整；更高值通常提高召回并增加查询成本。

### IVFFlat

**IVFFlat** 先把向量划分到多个列表，查询时只探测部分列表。它构建较快、内存相对可控，但需要已有数据用于聚类，数据分布大幅变化后可能需要重建。

以下 SQL 需要在已经安装 pgvector、已有代表性向量数据并完成 `ANALYZE` 的隔离数据库执行。输入是 `document_chunk.embedding` 列，目标是建立一个使用余弦距离的 IVFFlat 候选索引；`lists = 100` 只是演示值，不是通用配置。

```sql
-- lists 决定聚类桶数量，100 只是实验起点，需根据数据量和召回实验调整。
CREATE INDEX document_chunk_embedding_ivf
ON document_chunk USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

数据库执行时先按现有向量训练 100 个聚类列表，再把每条向量放入对应列表。查询仍要使用 `<=>` 与 `vector_cosine_ops` 匹配；会话参数 `ivfflat.probes` 决定一次搜索多少个列表。索引构建完成不代表召回合格，应该用同一查询集比较精确 Top K 与近似 Top K。数据不足、列表过多或分布大幅变化都可能降低质量，届时需要重新选参或重建。`lists` 和 `probes` 没有适合所有数据量的固定值。

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

在隔离数据库准备与线上规模接近的样本，更新统计信息后再执行下面的只读计划分析。输入是租户、版本和一条真实 768 维查询向量；目标是同时观察过滤、排序、候选数量、缓冲区和实际耗时。`ANALYZE` 会真正执行 SELECT，因此不要对带写入副作用的语句照搬。

```sql
-- ANALYZE 会实际执行查询；BUFFERS 同时显示命中缓存和读取磁盘的数据块。
EXPLAIN (ANALYZE, BUFFERS)
-- 查询返回稳定标识和距离，正文可在确认权限后再按 ID 读取。
SELECT id
FROM document_chunk
WHERE tenant_id = 'demo'
  AND source_version = 'v2'
-- 按与索引一致的距离算子升序排列，数值越小表示越相近。
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

PostgreSQL 先按 `tenant_id` 与 `source_version` 过滤，再按余弦距离排序并返回 10 条。输出中的节点类型说明是否使用向量索引，`Rows Removed by Filter` 显示过滤损失，`Buffers` 区分缓存命中与磁盘读取，actual rows/time 显示实际候选和耗时。示例中的 `[...]` 必须替换为真实同维向量，否则 SQL 无法执行。测试数据太少、统计信息过期或过滤选择性很高时，优化器选择顺序扫描可能合理；不要看到 Seq Scan 就立刻强制索引。

计划只说明这次 SQL 怎样执行，不证明召回质量。索引参数仍要用 **Recall@K** 等评测核对；在生产环境直接使用 `ANALYZE` 还会产生真实负载，先在候选环境复现，再用低风险查询观察线上计划。

## 什么时候不用 pgvector

pgvector 适合已经使用 PostgreSQL、需要事务元数据与向量共同管理、规模和延迟目标能够满足的系统。以下情况需要重新评估：

- 向量规模或查询吞吐远超单集群规划；
- 需要专用分布式向量能力；
- 多模态和复杂索引功能超出扩展能力；
- 团队无法承担 PostgreSQL 的索引内存与维护。

选择专用向量数据库并不会消除版本、权限、召回评测和写入一致性问题，只是基础设施边界改变。

## 操作检查表

- 向量列维度固定并与模型一致；
- 查询和索引使用同一距离算子；
- 租户、状态与知识版本在 SQL 中过滤；
- 保留精确搜索评测基线；
- HNSW/IVFFlat 参数由目标数据实验决定；
- 批量输出按稳定 ID 对齐并校验；
- 候选索引完整后才激活；
- EXPLAIN 与 Recall@K 一起评估，不能只看耗时。

向量负责语义近似，不应该承担精确标识、全文词项和结构化字段等所有查询类型。索引验收也必须同时包含召回质量和实际查询计划。


**为什么建立 HNSW 或 IVFFlat 前要保留精确扫描基线？**

近似索引用速度和资源换取可能的召回损失，没有精确结果就无法知道漏了哪些正确片段。先在固定数据与查询集上使用同一距离算子做精确 Top-K，保存结果 ID；再运行 ANN，计算 Recall@K 并观察延迟。基线可以只在候选环境或离线小集运行，不必承受在线流量。参数调优若只看耗时，很容易得到快速但缺失关键证据的索引。

**HNSW 和 IVFFlat 的机制差异是什么？**

HNSW 构建多层近邻图，查询从稀疏高层逐步靠近目标，通常召回好、查询快，但构建和内存成本较高；IVFFlat 先把向量分到若干列表，查询只扫描最接近的部分列表，构建相对简单，但需要合适训练数据与 probes。两者参数都依赖规模、维度、更新率和过滤。不能把一个数据集的参数复制到另一个库，必须用**精确基线**和容量实验选择。

**`EXPLAIN` 显示 Seq Scan 是否说明索引失效？**

不一定。数据量小、过滤选择性高、统计信息或成本估算使顺序扫描更便宜时，优化器可能合理选择 Seq Scan。使用 `EXPLAIN (ANALYZE, BUFFERS)` 查看实际行数、过滤移除、缓存和耗时，再结合生产相近的数据量判断。即使计划使用向量索引，也只能证明 SQL 执行路径，不能证明 Recall 合格；查询计划与离线召回必须一起验收。

**tenant 和 Release 过滤为什么会影响 ANN 召回？**

如果 ANN 先从全局向量取少量候选，再在外层过滤，其他租户和版本可能占满 Top-K，最终可见结果不足。解决方式可能是索引内过滤、分区、按高选择性字段拆索引或受控过采样，但每种都会影响内存与延迟。测试集要包含不同过滤选择性和禁止 ID，确认结果数量、Recall 与隔离。权限条件必须进入 SQL，不能依赖返回后再丢弃越权行。

**批量插入向量时最危险的错位问题是什么？**

供应商或上游批次返回向量数组时，如果只按位置与 Chunk 对齐，部分失败、乱序或重试可能把 A 的向量写到 B 的 ID。写入前校验返回数量、维度与有限值，最好使用稳定请求项 ID 建立映射；事务中按唯一键写入，并保存内容 hash 和模型 revision。对账不只数行，还要抽样重新计算与查询，证明向量确实对应正确文本。

**pgvector 表上的距离算子和索引 operator class 不一致会怎样？**

查询可能无法使用预期索引，或者更严重地按另一种度量排序，离线评测与线上结果不一致。例如余弦距离、负内积和欧氏距离各有对应运算符与索引配置。Schema、建索引 SQL、Retriever 和评测代码应共享明确的距离类型，并在迁移检查中核对。更换模型归一化方式时也重新验证，不能只改查询运算符就假设旧索引仍适用。
