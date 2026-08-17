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
updated: 2026-08-17T00:00:00.000Z
---
# PostgreSQL、JSONB、pgvector、索引与连接池

API 只有 30 个并发请求，PostgreSQL 却出现 300 个连接，偶发查询还报 prepared statement 不存在。扩容 API Worker 后问题更严重。数据库没有“突然变小”，而是每个进程都创建了独立连接池，PgBouncer 又使用 transaction pooling，客户端会话状态在下一次事务时换到了另一条服务器连接。


<InfraFigure src="/images/ai-infra/postgres-pgbouncer-operations/hero.png" alt="AI 请求经过 PgBouncer 连接池进入 PostgreSQL 表与向量索引的插画"
  icon="database" caption="连接池控制连接成本，事务与索引控制数据正确性和查询路径。" />


## 一次知识检索怎样占用连接并选择索引

```mermaid
flowchart LR
  S0["借连接"]
  S1["建立事务"]
  S2["选择计划"]
  S3["提交归还"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

先看完整路径，再进入局部配置。这样即使组件名字变化，也能知道失败发生在交接之前还是之后。

### 借连接发生时，先看 应用连接池/PgBouncer

请求在截止时间内获得客户端槽位和服务器连接。

这里不靠猜测，优先读取 pool wait、active/idle、server connections。

### 从 建立事务 留下的证据回到 PostgreSQL

设置事务范围并执行租户、知识版本与状态过滤。

决定下一步前需要看到 txid、锁等待、statement timeout。

### 3. Planner 怎样完成选择计划

根据统计信息选择普通索引、向量索引或顺序扫描。

这一动作的可观察结果是 `EXPLAIN (ANALYZE, BUFFERS)`。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 4. 提交归还：数据库与连接池 持有当前状态

提交/回滚后释放连接，清理会话状态。

可以从这些位置确认结果：事务时长、rollback、pool release。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

## 表、索引、事务和连接池分别解决什么

这里先暂停操作，把容易混用的概念拆开。定义的价值在于划清责任，而不是增加名词数量。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Transaction | 把一组读写作为一个原子一致性边界提交或回滚。它不自动替你选择业务幂等键。 |
| JSONB | PostgreSQL 可索引的二进制 JSON 类型，适合结构有变化的附属元数据，不适合逃避稳定字段建模。 |
| pgvector | 提供向量类型和距离运算/索引的扩展。相似度查询仍需租户、版本和权限过滤。 |
| PgBouncer | 在客户端与 PostgreSQL 之间复用服务器连接。session、transaction 和 statement 模式保留的会话状态不同。 |

::: tip 判断原则
不要从产品名推断能力。把可观察输入、持久状态、失败终态和下游交接点写出来。
:::

## 别让表面现象替你下结论

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 连接数很多 | 进程数乘以单进程 pool 上限，或连接泄漏 | 同时看应用 pool 和 `pg_stat_activity` |
| 查询慢 | 可能在等连接、锁或 I/O，不只是 SQL 计算慢 | 拆开 pool wait、lock wait 与 execution time |
| transaction pooling 报错 | 代码依赖临时表、SET 或会话级 prepared statement | 声明兼容模式或改用 session pooling |
| 有向量索引 | 过滤选择性、统计信息或数据量可能让 planner 选择其他路径 | 用实际参数查看执行计划和召回 |

::: warning 先保留现场
如果先重启、扩容或删除对象，最早失败可能被覆盖。先确认对象身份、版本和时间线，再决定处理动作。
:::

## 让租户范围和发布状态进入同一条查询

SQL 是结构示例，假设已安装 pgvector。输入为 tenant、已发布知识版本和 query embedding；输出是权限范围内最接近的片段。向量维度与索引参数必须按实际模型确定。

```sql
SELECT chunk_id, document_id, content,
       embedding <=> $3::vector AS distance
FROM knowledge_chunks
WHERE tenant_id = $1
  AND knowledge_version = $2
  AND publish_status = 'published'
ORDER BY embedding <=> $3::vector
LIMIT 20;
```

距离运算符必须与索引 operator class 和语义匹配。先过滤租户和发布版本，才能避免把相似但不可见的数据交给后续重排。`EXPLAIN` 显示索引被使用也不代表召回质量足够；近似索引需要在同一数据版本上比较延迟与 recall。



## 把结论限制在证据范围内

不要把连接池调大当作吞吐优化：连接本身消耗内存，过多并发会放大锁和 I/O 竞争。JSONB 不能替代主键、外键、唯一约束和高频过滤列。pgvector 负责距离搜索，不负责文档解析、权限和回答引用。

数据库能可靠保存状态，但不适合让 HTTP 请求一直等待长任务完成。下一篇把耗时工作交给消息队列与 Worker，并讨论 ack、lease、幂等与重试。
