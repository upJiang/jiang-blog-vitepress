---
title: "MySQL 连表、聚合与子查询：从多张表得到一个列表"
description: "从项目列表需要负责人和任务数量开始，推演 JOIN、NULL、GROUP BY、HAVING、子查询和重复行。"
category: backend
part: "MySQL 查询"
chapter: 18
tags:
  - "MySQL"
  - "JOIN"
  - "Aggregation"
prerequisites:
  - "会写 CRUD SQL"
outcomes:
  - "能判断连接类型和基数"
  - "能解释聚合前后行数变化"
practice:
  type: implementation
  result: "写出带负责人和任务统计的游标查询"
  verify:
    - "空关联不丢失主表"
    - "统计结果不会因多对多连接重复"
evidence: official
updated: 2026-08-12
---

# MySQL 连表、聚合与子查询：从多张表得到一个列表

项目列表原本有 12 行，连上成员表后突然出现 47 行。SQL 没有“随机复制”项目，而是一对多连接把每个项目与它的每个成员组合成一行。理解连表的第一步不是背 `JOIN` 语法，而是先预测结果集的粒度。

## 连接前先写出左右两边的基数

`projects` 一行代表一个项目，`project_members` 一行代表一个项目与一个用户的成员关系。连接结果的一行代表“项目 × 匹配成员”。一个项目有四个成员，它就会出现四次。

`INNER JOIN` 只保留匹配行；`LEFT JOIN` 保留左表行，无匹配时右侧列为 NULL。筛选右表的条件如果写进 `WHERE`，可能把 LEFT JOIN 重新变成只保留匹配行。

先分别执行项目查询和成员查询，记录各自行数，再执行连接。观察同一 `p.id` 出现几次，以及没有成员的项目是否仍保留。

```sql
SELECT p.id, p.name, pm.user_id
FROM projects AS p
LEFT JOIN project_members AS pm
  ON pm.tenant_id = p.tenant_id
 AND pm.project_id = p.id
WHERE p.tenant_id = :tenant_id
ORDER BY p.created_at DESC, p.id DESC;
```

租户条件同时进入项目查询和关联条件，避免只凭 project_id 连接错误租户数据。排序追加唯一 ID，保证分页顺序稳定。
## 聚合会把多行折叠成新的粒度

`GROUP BY p.id` 后，一行重新代表一个项目；`COUNT(pm.user_id)` 表示该项目匹配到的非 NULL 成员数。所有非聚合列都应能由分组键确定，开启 `ONLY_FULL_GROUP_BY` 可以阻止含糊查询。

先连接多个一对多表再聚合容易产生乘法：一个项目有 4 个成员、3 个标签，连接后得到 12 行，直接 COUNT 会重复。应先在各子表按项目聚合，再把聚合结果连接回来。

这段 SQL 的观察目标是“先恢复一项目一行，再连接”。实际表若使用 `id` 而不是 `project_id`，不要照抄 USING，应明确写 ON 条件。

```sql
WITH member_counts AS (
  SELECT tenant_id, project_id, COUNT(*) AS member_count
  FROM project_members
  WHERE tenant_id = :tenant_id
  GROUP BY tenant_id, project_id
), tag_counts AS (
  SELECT tenant_id, project_id, COUNT(*) AS tag_count
  FROM project_tags
  WHERE tenant_id = :tenant_id
  GROUP BY tenant_id, project_id
)
SELECT p.id, p.name,
       COALESCE(m.member_count, 0) AS member_count,
       COALESCE(t.tag_count, 0) AS tag_count
FROM projects p
LEFT JOIN member_counts m USING (tenant_id, project_id)
LEFT JOIN tag_counts t USING (tenant_id, project_id);
```

两个 CTE 各自只返回一项目一行，因此最终连接不会把成员数和标签数相乘。`COALESCE` 把无关联记录的 NULL 转成 0。
## 相关子查询会按外层行反复工作

子查询不是天然慢。非相关子查询可以先执行一次，优化器也可能改写；相关子查询引用外层行，逻辑上可能为每个项目重新计算。用 `EXPLAIN ANALYZE` 看实际循环次数，而不是仅凭语法定性。

列表接口还要警惕 ORM 产生的 N+1：先查 100 个项目，再为每个项目查一次成员。它与 SQL 相关子查询表现不同，但共同问题是工作量随外层行数增加。

| 需求 | 常见写法 | 检查重点 |
| --- | --- | --- |
| 只保留有成员的项目 | `EXISTS` | 是否命中 tenant_id + project_id 索引 |
| 返回成员数量 | 预聚合后 JOIN | 是否出现多表乘法 |
| 返回少量成员详情 | 一次 JOIN 或批量 IN | 结果去重与内存组装 |
| 分页项目列表 | 先分页项目再加载关联 | 不能让 JOIN 重复行破坏 LIMIT |
## 结果不对时先检查行代表什么

总数过大先查连接基数和重复键；数据缺失先查 INNER/LEFT 选择与 WHERE 条件；分页跳项先查排序唯一性及 LIMIT 作用在连接前还是连接后。不要先加 DISTINCT，它可能掩盖错误连接，并引入排序去重成本。

验证查询时准备四类数据：无关联、一条关联、多条关联、其他租户同 ID 或同名数据。只用一条“刚好匹配”的测试数据无法暴露连接错误。
## 连接、聚合与分页的取舍

**什么时候 `EXISTS` 比 JOIN 更贴近需求？**

只需要判断关联是否存在、不需要返回右表字段时，EXISTS 直接表达半连接语义，也避免一对多重复左表行。最终性能仍看索引和执行计划。

**COUNT(*)、COUNT(column) 有什么差别？**

COUNT(*) 统计分组中的行；COUNT(column) 忽略该列为 NULL 的行。LEFT JOIN 统计子表数量时常用 COUNT（子表主键），否则没有子记录的左表行也会因保留行被 COUNT(*) 计为 1。

**为什么分页列表通常先查主表 ID？**

一对多 JOIN 会扩大行数，LIMIT 可能截断关联行而不是项目。先按稳定顺序确定一页项目 ID，再批量加载关联，页面边界更容易推理。

**应用层拼装和数据库 JSON 聚合怎么选？**

数据库 JSON 聚合减少往返，但 SQL 更复杂，单行可能很大；应用批量查询更清晰，也容易缓存。根据结果规模、复用需求和执行计划选择，两种方式都要避免 N+1。
