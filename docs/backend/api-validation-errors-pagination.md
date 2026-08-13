---
title: "请求校验、错误结构与游标分页"
description: "从一条 422 和一页重复数据开始，解释边界校验、字段错误、requestId、排序稳定性和游标编码。"
category: backend
part: "API 设计"
chapter: 11
tags:
  - "Validation"
  - "Errors"
  - "Pagination"
prerequisites:
  - "会设计 JSON API"
outcomes:
  - "能返回可定位的错误结构"
  - "能实现不会漏项或重复的游标分页"
practice:
  type: implementation
  result: "设计项目列表和创建接口的错误与分页契约"
  verify:
    - "跨租户资源返回 404"
    - "游标包含稳定排序字段且不可篡改"
evidence: official
updated: 2026-08-12
---

# 请求校验、错误结构与游标分页

同一个无效请求在三个服务里分别返回字符串、数组和 HTML，前端只能写三套错误处理。统一错误结构后，表单错误、requestId 和重试策略才有稳定输入。

## 校验要在副作用前完成

解析 JSON、校验类型、长度、格式和跨字段关系应先于数据库写入。校验失败返回字段错误；数据库唯一约束失败再映射为冲突。**校验通过不代表有权限**，租户和对象范围仍需在 Service/Repository 查询中执行。

下面的片段只负责展示边界和执行顺序。先确认输入，再执行副作用，最后把结果映射为协议错误；不要把它当成可以绕过鉴权的完整服务。

```ts
type ApiError = { status: number; code: string; detail: string; requestId: string; fields?: Record<string, string[]> }

function assertName(name: unknown): asserts name is string {
  if (typeof name !== "string" || name.trim().length < 2) {
    throw { status: 422, code: "invalid_field", detail: "name is invalid", requestId: crypto.randomUUID(), fields: { name: ["至少 2 个字符"] } }
  }
}
```

异常对象要经过统一过滤器序列化。不要把数据库堆栈、SQL 或 Secret 直接放进 detail。

## 游标分页依赖稳定排序

用 `created_at DESC, id DESC` 排序时，游标必须同时保存两个字段。下一页条件是 `(created_at, id) < (:createdAt, :id)`，不能只保存时间，否则同一微秒内的记录会重复或漏掉。游标应签名或编码，避免客户端篡改范围。

先在隔离数据库执行下面的 SQL，观察影响行数和错误消息。代码的观察目标是把“业务动作”对应到数据库真实状态，而不是只看接口返回 200。

```sql
SELECT id, name, created_at
FROM projects
WHERE tenant_id = :tenant
  AND (created_at, id) < (:cursor_time, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT :limit_plus_one;
```

多取一条用于判断是否还有下一页，再返回去掉的那条记录。分页查询和范围过滤必须使用同一事务视图或同一版本语义。

## 错误结构要能指导动作

`401` 触发刷新或重新登录，`403` 表示身份存在但权限不足，`404` 在跨租户场景也可表示资源不可见，`409` 用于版本或幂等冲突，`429` 应带 `Retry-After`。客户端不应根据 detail 文案猜测状态。

| 状态 | 代码 | 客户端动作 |
| --- | --- | --- |
| 422 | invalid_field | 标记字段并停止提交 |
| 401 | unauthenticated | 单飞刷新或退出 |
| 409 | version_conflict | 重新读取并合并 |
| 429 | rate_limited | 按 Retry-After 退避 |

## 用 requestId 对齐代理、应用和数据库错误

| 现象 | 先确认 | 处理顺序 |
| --- | --- | --- |
| 错误响应是 HTML | 检查代理层是否拦截异常，再让 API 统一返回 application/json。 | 先区分代理错误和应用异常 |
| 分页翻页出现重复 | 检查排序是否唯一、游标是否包含全部排序字段。 | 固定排序和数据快照再复现 |
| 为什么跨租户返回 404 | 避免通过 403 暴露资源存在性。 | 内部审计保留真实拒绝原因 |

代理生成的 413/502、框架生成的 422 和业务生成的 409 都要返回同一种媒体类型与 requestId。应用日志记录公开 code 和内部 cause，数据库错误按约束名映射。这样客户端不必解析文案，值班人员也能从一个 requestId 找到错误究竟在哪一层产生。代理无法复用应用 ID 时，应生成并向 upstream 透传。

## 校验与分页再往下推

### 为什么还需要数据库约束，应用校验不够吗？

两个并发请求可能同时通过应用校验，只有数据库唯一约束能在提交点裁决。应用校验负责友好错误，数据库约束负责最终事实，两者要分别处理。

### 游标分页比 offset 更复杂，什么时候值得用？

数据量大、列表持续写入或需要稳定翻页时值得用。后台小表可以用 offset，但也要固定排序，否则页码本身没有稳定含义。

## 字段校验、领域校验和数据库裁决分三层

字段长度和格式可在协议边界判断；“结束时间晚于开始时间”属于跨字段规则；“同租户名称唯一”最终由数据库唯一约束裁决。三层错误都映射到统一 Problem，但 code 应稳定区分，日志中保留原始数据库错误而不泄露给客户端。

游标还要绑定查询条件。用户先按 status=active 获取游标，再把同一游标用于 status=archived，若服务端不校验，分页位置就失去含义。可把排序字段、筛选哈希和过期时间编码并签名；验签失败返回 400，而不是从第一页悄悄继续。

### 列表正在写入时，游标分页能否保证完全不变？

普通游标保证相对稳定，不保证跨多次请求的完整快照。需要审计导出这类严格一致结果时，应固定快照版本或先生成导出任务；日常滚动列表通常接受新记录出现在顶部。
