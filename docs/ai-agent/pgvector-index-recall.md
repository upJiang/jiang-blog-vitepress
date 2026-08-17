---
title: pgvector 索引怎样影响召回率
description: 从精确扫描建立基线，再比较 HNSW、IVFFlat、过滤条件和索引参数。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 37
sequence: 37
slug: pgvector-index-recall
tags:
  - pgvector
  - HNSW
  - Recall
sourceKey: ai-pgvector-index-recall
dependsOn:
  - embedding-batch-idempotency
updated: '2026-08-14'
lastUpdated: false
---
# pgvector 索引怎样影响召回率

pgvector 让向量与业务数据保存在 PostgreSQL 中。建立索引可以降低大数据集的查询成本，但近似搜索可能漏掉真实近邻，过滤条件还会改变可用候选。

## 先用精确搜索建立基线

不使用近似索引时，数据库对满足条件的向量计算距离并排序，结果可作为 Recall 对照。基线查询必须包含与生产相同的租户、Release 和状态过滤。

距离算子要与 Embedding 的度量一致，例如余弦距离或内积。模型文档、向量归一化和索引 operator class 必须配套。

## HNSW 和 IVFFlat 的取舍不同

HNSW 构建图结构，通常查询性能和召回较好，但构建时间与内存开销更高。IVFFlat 先聚类为列表，需要足够数据训练，查询时探测列表数影响召回和速度。具体参数应以当前 pgvector 文档与本地数据实验为准。

索引名称本身不保证效果。同一参数在数据量、维度和过滤分布变化后可能表现不同。

## 过滤会缩小近似候选

查询先从近似索引得到候选，再应用某些过滤时，最终条数可能不足。多租户 ACL、知识版本和文档状态都可能造成这种现象。

可以提高搜索参数、迭代扫描或采用分区与更合适索引，但任何调整都要保持过滤条件，不能为了补足 Top-K 放宽权限。

## 用查询集计算 Recall

对每个查询分别运行精确基线和候选索引，比较候选结果是否包含基线相关项。记录 K、过滤条件、参数、耗时和数据快照。

`Recall@K = 候选结果命中的基线相关项数 / 基线相关项数`。它衡量召回，不代表最终答案正确。一次验证轨迹应能从查询、基线结果、索引结果回放到指标。

## 索引变更属于可回滚发布

先在影子索引或隔离环境构建，运行固定查询集，再切换查询计划。监控结果数不足、延迟和召回回归。

数据分布会变化，定期重跑基线。只看 `EXPLAIN` 确认用了索引，不能证明检索质量。
