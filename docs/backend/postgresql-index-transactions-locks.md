---
title: "SQL、PostgreSQL、索引、执行计划、事务与锁"
description: "从一条慢查询和一次并发更新进入 B-Tree、EXPLAIN、隔离级别、锁和死锁。"
category: backend
part: "第一部分：后端共同基础"
chapter: 4
tags: ["PostgreSQL", "SQL"]
prerequisites: ["关系数据基础"]
outcomes: ["读懂基础执行计划", "设计事务边界"]
practice:
  type: implementation
  result: "创建索引并观察查询计划"
  verify: ["索引与查询条件匹配", "并发异常有明确处理"]
evidence: official-guided-operation
updated: 2026-08-06
---
# SQL、PostgreSQL、索引、执行计划、事务与锁

任务表有一百万行，查询“某租户最近 20 条 pending 任务”越来越慢。加一个 `status` 索引可能仍然扫描大量行，因为查询还包含租户、排序和限制。数据库优化不是看到 WHERE 就给每列建索引。

本章先为一条查询设计联合索引，再用事务处理两个并发 Worker 领取任务，理解 MVCC、锁和死锁。

## 用真实访问模式设计表和索引

教学表：

```sql
CREATE TABLE task (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL
);
```

目标查询：

```sql
SELECT id, status, created_at
FROM task
WHERE tenant_id = $1 AND status = 'pending'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

联合索引可以让等值过滤在前，排序键随后：

```sql
CREATE INDEX task_tenant_status_created_idx
ON task (tenant_id, status, created_at DESC, id DESC);
```

列顺序来自查询模式，不是固定“选择性最高放前”。这个索引服务按租户和状态过滤、按时间排序；若另一个查询只按 `created_at`，不一定能有效使用它。

## EXPLAIN 告诉你数据库准备怎样执行

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, status, created_at
FROM task
WHERE tenant_id = 42 AND status = 'pending'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

先在测试或可控环境使用 `ANALYZE`，因为它会真的执行语句。写操作可以先用普通 EXPLAIN 或包在会回滚的事务中谨慎验证。

关注：

- `Seq Scan`、`Index Scan` 或 `Bitmap Heap Scan`；
- 估算行数与实际行数差异；
- `Rows Removed by Filter`；
- 是否额外 Sort；
- shared hit/read 缓冲；
- 每个节点实际时间和循环次数。

估算严重偏差时检查统计信息、数据倾斜和相关性。不要只盯总耗时；缓存热度会让同一计划的运行时间不同。

## B-Tree 适合什么

PostgreSQL 默认 B-Tree 适合等值、范围和排序。GIN 常用于数组、全文和 JSONB 包含查询；GiST、BRIN 等解决其他访问模式。索引类型必须与操作符和数据分布匹配。

每个索引都会增加写入、存储和维护成本。重复或从未使用的索引不应无限保留。上线前评估查询收益，上线后观察 `pg_stat_user_indexes`，删除前确认完整工作负载和回滚方案。

### Partial Index

若绝大多数任务已完成，在线查询只关心 pending，可建立部分索引：

```sql
CREATE INDEX task_pending_tenant_created_idx
ON task (tenant_id, created_at DESC, id DESC)
WHERE status = 'pending';
```

这个索引只保存 `pending` 行，因此输入查询也要稳定包含相同条件，输出计划才可能选择它。它更小，但只有查询条件能证明满足 predicate 时才可用；参数化查询和复杂表达式要用 EXPLAIN 实测。

## 事务保存业务不变量

两个 Worker 同时领取同一 pending 任务。若先 SELECT 再 UPDATE 且没有锁，两者都可能读到 pending。

一种队列式领取方式：

```sql
BEGIN;

SELECT id
FROM task
WHERE status = 'pending'
ORDER BY created_at, id
FOR UPDATE SKIP LOCKED
LIMIT 1;

UPDATE task
SET status = 'running', version = version + 1
WHERE id = $1;

COMMIT;
```

`FOR UPDATE` 锁住选中行，`SKIP LOCKED` 让其他 Worker 跳过已锁记录，适合数据库队列式分配。它不适合需要严格全局顺序的所有业务，因为跳过锁会改变取出顺序。

事务边界覆盖“读取并确认状态 + 更新所有相关记录”，不要在事务中调用耗时模型或第三方 HTTP。外部调用会延长锁持有，且数据库回滚不能撤销已经发送的请求。

## MVCC 和隔离级别

PostgreSQL 使用 MVCC，让不同事务看到符合其快照的数据版本。常用隔离级别：

- Read Committed：每条语句看到开始时已提交数据，是默认级别；
- Repeatable Read：事务内使用稳定快照，PostgreSQL 防止多类异常；
- Serializable：检测可能违反串行执行的依赖，可能抛出 serialization failure，需要重试整个事务。

更高隔离级别不是免费“更安全”。根据业务不变量选择，并为可重试冲突设计有限重试。外部副作用不放进自动事务重试内部。

## 乐观锁适合短更新冲突

客户端读取 `version=3`，更新时带上版本：

```sql
UPDATE task
SET payload = $1, version = version + 1
WHERE id = $2 AND tenant_id = $3 AND version = 3;
```

检查受影响行数。0 行可能是资源不存在、无权限或版本冲突，应用要用安全查询区分并映射为 404/409。不能忽略 row count 后返回成功。

## 死锁怎样产生

事务 A 先锁任务 1 再锁任务 2，事务 B 先锁 2 再锁 1，双方等待。PostgreSQL 检测后中止其中一个事务。

预防方法：

- 所有用例按同一稳定顺序加锁；
- 事务尽量短；
- 不等待用户输入和外部网络；
- 索引让更新快速定位目标行；
- 捕获死锁错误，只有整个用例可安全重试时有限重试。

排查使用 `pg_stat_activity`、`pg_locks` 和数据库日志，关联 application_name、request ID 或 trace ID。不要在生产环境看到锁就随意终止未知会话。

## 数据库约束是最后防线

应用检查能提供友好错误，数据库约束防止并发和遗漏入口破坏数据：

- `NOT NULL` 保证必填；
- `CHECK` 限制状态和值域；
- `UNIQUE` 保证自然键或幂等键唯一；
- `FOREIGN KEY` 保证引用；
- 排除约束可处理时间区间冲突。

不要把所有规则都写成数据库 Trigger 隐藏执行流程。跨聚合和外部副作用仍由应用服务组织。

## 一次完整实践

1. 生成足够测试数据；
2. 不建联合索引运行 EXPLAIN；
3. 创建索引并 `ANALYZE`；
4. 对比扫描行、排序和缓冲；
5. 开两个事务模拟 `FOR UPDATE SKIP LOCKED`；
6. 交换加锁顺序制造测试死锁；
7. 观察错误并实现有限重试；
8. 删除测试数据和临时索引。

这类实验只在隔离数据库执行。

## 数据库检查表

- 查询从真实访问模式出发；
- 联合索引列顺序与过滤/排序匹配；
- 使用 EXPLAIN 的估算和实际行数；
- 事务覆盖完整业务不变量；
- 外部网络不占用数据库事务；
- 更新检查 row count；
- 锁顺序稳定，死锁有观测；
- 约束承担最后防线；
- 迁移支持兼容窗口和回滚。

下一章进入 Redis。它能加速读取和协调短期状态，但不能因为快就成为所有业务事实的唯一存储。

## 参考资料

- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
