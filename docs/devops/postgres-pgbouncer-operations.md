---
title: PostgreSQL、JSONB、pgvector、索引与连接池
description: 从用户、Prompt、Agent 状态和 Embedding 四类数据进入关系约束、JSONB、向量索引、事务和 PgBouncer。
category: devops
part: 第二部分：AI Backend 基础设施
chapter: 10
tags:
  - PostgreSQL
  - pgvector
  - PgBouncer
prerequisites:
  - SQL 基础
outcomes:
  - 设计 AI 平台数据边界
  - 计算连接预算并诊断慢查询
practice:
  type: implementation
  result: 完成一张 AI 数据与连接模型
  verify:
    - 权限过滤进入 SQL
    - 应用池、PgBouncer 和数据库上限一致
evidence: official-guided-operation
updated: 2026-08-11T00:00:00.000Z
---
# PostgreSQL、JSONB、pgvector、索引与连接池

Agent 回答引用了已经下线的文档。向量相似度没有错，问题是查询没有固定知识版本；文档元数据已经更新，旧向量仍在索引中。AI 数据库设计必须同时表达业务实体、版本、权限、异步状态和向量来源，不能只加一列 `embedding`。

PostgreSQL 适合保存需要事务、约束和可查询历史的状态。JSONB 承载变化较快但仍需查询的结构，pgvector 保存与具体模型和维度绑定的向量，连接池则控制应用并发怎样进入有限的数据库后端进程。

## 关系列、JSONB 与对象存储怎样分工

经常过滤、连接、排序或承担约束的字段应使用明确列，例如 `tenant_id`、`release_id`、`status` 和时间。JSONB 适合供应商参数、解析统计等可选元数据，但仍要定义 Schema 版本和允许键。大型原文件与模型权重放对象存储，数据库只保存对象键、校验和、大小和状态。

把所有数据塞进 JSONB 会失去类型、外键和清晰索引；把供应商每个可选字段都变成列，又会让迁移频繁。判断依据是查询与不变量，而不是“JSON 更灵活”。

## 一份最小知识版本模型

下面 SQL 以 pgvector 为例。输入是一组已解析片段，目标是让每个向量都能回到租户、知识 Release、文档对象和 Embedding 模型。维度 `1536` 只是占位，必须与实际 Embedding 模型一致。

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_releases (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id bigint NOT NULL,
    version text NOT NULL,
    status text NOT NULL CHECK (status IN ('building', 'active', 'failed', 'retired')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, version)
);

CREATE TABLE document_chunks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id bigint NOT NULL,
    release_id bigint NOT NULL REFERENCES knowledge_releases(id),
    object_key text NOT NULL,
    chunk_index integer NOT NULL CHECK (chunk_index >= 0),
    content text NOT NULL,
    embedding_model text NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (release_id, object_key, chunk_index)
);

CREATE INDEX document_chunks_scope_idx
    ON document_chunks (tenant_id, release_id);

CREATE INDEX document_chunks_embedding_hnsw_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 先固定租户和知识版本，再按向量距离排序。
SELECT id, object_key, chunk_index, content,
       embedding <=> :query_embedding AS distance
FROM document_chunks
WHERE tenant_id = :tenant_id
  AND release_id = :release_id
ORDER BY embedding <=> :query_embedding
LIMIT :limit;
```

第一张表管理候选、激活、失败和退役版本；第二张表让 Chunk 唯一键具有幂等性。查询把租户与 Release 放入 SQL，而不是先召回所有租户再在应用过滤。HNSW 是近似索引，结果应与无索引精确查询建立 Recall 基线；过滤条件、数据分布和参数都会影响召回。

激活新 Release 时，应先完成文件、片段、向量数量和抽样质量校验，再用短事务改变激活指针。在线请求在开始时固定 Release ID，避免执行过程中切换到另一版本。

## 索引要服务真实查询

B-Tree 适合等值、范围和排序，GIN 常用于 JSONB 包含查询与全文结构，向量索引用于近似邻居。索引并非越多越好：每个索引增加写入、存储和维护成本，也可能因为选择性不足而不被计划器采用。

使用 `EXPLAIN (ANALYZE, BUFFERS)` 时要在隔离环境执行，因为它真的运行查询。观察实际与估算行数、扫描方式、过滤掉的行、Buffer 命中和各节点时间。慢查询也可能来自锁等待、连接排队或磁盘，而不是缺索引。

## 事务保护什么

一次文档导入可能写文档记录、任务状态和 Outbox 事件。需要共同成立的不变量应放在同一数据库事务内；外部对象上传和 Embedding 调用无法直接加入本地事务，应使用状态机、幂等键和补偿清理。

长事务会保留旧版本、增加锁和 Vacuum 压力。不要在事务里等待模型或网络调用。先完成外部计算，再用短事务提交结果，并校验任务仍属于当前候选版本。

## 连接池是容量门，不是加速开关

PostgreSQL 每个后端连接都有成本。应用实例数乘以每实例池上限，再加 Worker、迁移、监控和管理员连接，才是总预算。实例扩容时若不缩小单实例池，数据库可能先被连接打满。

PgBouncer 的 session pooling 保留整个客户端会话，兼容性高；transaction pooling 在事务结束后复用后端连接，连接效率更高，但依赖会话状态、临时表或某些 prepared statement 行为的应用需要谨慎。连接池只能减少后端连接，不会修复慢事务和缺少范围的查询。

## 运行态从哪里读证据

`pg_stat_activity` 显示连接状态、查询与等待事件；锁视图帮助找到阻塞链；`pg_stat_statements` 聚合规范化查询性能；数据库日志记录死锁、慢查询和检查点。排查前先确认观察窗口、数据库和应用名称，避免把空闲连接误认为泄漏。

最终数据模型要回答：哪张表是真相源，谁能改变状态，向量由哪个模型生成，权限在哪一层过滤，知识何时激活，失败如何重跑，连接上限怎样随实例数变化。能够回答这些问题，PostgreSQL 才从“存数据的组件”变成 AI Platform 的一致性核心。
