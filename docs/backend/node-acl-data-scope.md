---
title: "Node ACL 与数据范围控制"
description: "从两条不同归属的数据开始，把权限约束落实到策略、服务、查询与缓存。"
category: backend
tags: ["Node.js", "ACL"]
updated: 2026-08-06
order: 30
depth: core
series: "Node.js 服务安全"
---

# Node ACL 与数据范围控制

假设数据库里有两份文档：文档 A 属于当前用户所在的团队，文档 B 属于另一个团队。用户请求列表时，如果接口先查出全部文档，再由 Controller 隐藏文档 B，越权数据已经进入应用、日志或缓存，安全边界太晚了。

本篇要把“当前用户能看什么”变成数据库查询条件。最终，详情、列表、搜索、导出和缓存都使用同一份范围，权限撤销后也不会继续命中旧结果。

## 认证和授权有什么区别

认证回答“请求者是谁”，授权回答“这个人能对这个对象做什么”。授权通常组合四类信息：主体、动作、资源和环境。主体包括用户、租户和角色；动作例如读取或发布；资源包含归属、状态和范围；环境包含当前时间、认证强度和策略版本。

RBAC 用角色表达粗粒度动作，ACL 记录主体与具体资源关系，ABAC 根据属性组合条件，ReBAC 根据组织或成员关系判断。真实系统可以组合它们，不需要先选择一个缩写覆盖所有问题。

```mermaid
flowchart LR
  R[请求与身份] --> P[Policy 生成范围]
  P --> S[Service 执行业务]
  S --> Q[Repository 下推条件]
  Q --> D[(数据库)]
  D --> O[只返回可见结果]
```

## 步骤一：把范围定义成数据

最简单的 Guard 常返回 `true` 或 `false`，这适合判断“是否拥有进入后台的角色”，却无法告诉列表查询该过滤哪些行。更实用的做法是让 Policy 返回有限、可检查的范围类型。

输入是可信身份上下文，输出可以是“无权限”“租户内全部”“指定范围”或“本人拥有”。下面是根据通用授权行为重写的最小示例，它没有拼接 SQL，也没有把客户端传入的租户当作可信来源。

```ts
type Scope =
  | { kind: 'none' }
  | { kind: 'tenant'; tenantId: string }
  | { kind: 'scopes'; tenantId: string; ids: string[] }
  | { kind: 'owned'; tenantId: string; ownerId: string }

function readableScope(ctx: SecurityContext): Scope {
  if (!ctx.permissions.has('document:read')) return { kind: 'none' }
  if (ctx.permissions.has('document:read:any')) {
    return { kind: 'tenant', tenantId: ctx.tenantId }
  }
  return {
    kind: 'scopes',
    tenantId: ctx.tenantId,
    ids: [...ctx.visibleScopeIds]
  }
}
```

联合类型把策略结果限制在几种已知形态，Repository 可以逐一翻译成 ORM 条件。这样做的原因不是让类型更复杂，而是让“缺少范围”无法悄悄退化为全量查询。

## 步骤二：查询时就过滤

Repository 的安全查询入口要把租户和范围设为必填。单对象查询也同时携带公开 ID、租户和范围，不先 `findUnique(id)` 再比较归属。对于无权知道存在的对象，接口可以统一返回 404，减少资源枚举；内部审计仍记录真实拒绝原因。

列表查询不要读取所有记录后逐条调用 `can()`。那会产生 N+1 查询，分页总数也可能泄露隐藏对象。正确顺序是先把 Scope 编译成数据库条件，再排序和分页。复杂关系可以交给授权引擎计算，但最终范围仍要进入数据查询。

## 步骤三：写操作再检查状态

用户能看到一份文档，不代表可以在任何状态下修改它。发布动作通常有三层判断：Policy 允许 `publish`，Repository 能在当前范围内找到对象，领域规则允许 `draft -> published`。并发修改还需版本条件，避免两个已授权用户互相覆盖。

| 检查 | 回答的问题 | 常见失败 |
| --- | --- | --- |
| 动作权限 | 用户是否拥有发布能力 | 角色不包含 publish |
| 对象范围 | 文档是否属于可见范围 | 跨租户或跨团队 |
| 状态规则 | 当前对象能否进入目标状态 | 已归档文档再次发布 |
| 并发版本 | 读取后是否被别人修改 | expectedVersion 过期 |

这几层不能合并成一个装饰器字符串。Controller 只适配 HTTP，普通 TypeScript Policy 和 Service 才能被队列、WebSocket 或其他入口复用。

## 步骤四：缓存也要认识权限

若缓存键只有 `documentId`，用户 A 生成的详情可能被用户 B 命中。缓存键至少包含租户、范围摘要、策略版本和资源版本。权限变化时发布失效信号；高风险数据还可以在命中后重新检查当前策略版本。

搜索结果、向量召回、对象存储签名地址和 DataLoader 都属于数据通道。只保护 REST Repository，却让搜索全局召回，仍然会越权。返回引用前再做一次范围复核，可以防止旧缓存或异步索引把不可见来源带入结果。

PostgreSQL Row-Level Security 可以作为纵深保护，但它依赖每个事务正确设置租户上下文，并防止连接池复用残留。它不能替代应用层对动作和状态的解释。

## 正常结果和失败结果

| 请求 | 预期结果 |
| --- | --- |
| Reader 读取同范围文档 | 200，返回公共 DTO |
| Reader 读取同租户其他范围 | 404，不暴露对象存在 |
| 相同公开 ID 出现在其他租户 | 仍只查询当前租户 |
| Editor 修改已归档文档 | 状态冲突，不写数据库 |
| 权限撤销后再次读取 | 旧缓存失效或复核后拒绝 |
| 批量传入可见与不可见 ID | 只返回可见集合，不报告隐藏归属 |

权限测试要覆盖详情、列表、搜索、导出、缓存和协议入口，而不是只测一个 Guard。还要准备同租户不同范围、跨租户相同 ID、撤权后的缓存命中和并发更新四类样本。检查数据库查询条件和返回体，确认越权正文从未进入应用结果。

## 当前边界

小型系统用 Policy 与 Repository 组合已经足够。关系网络很复杂时，可以引入专门的关系授权引擎，但迁移前要先回答一致性、缓存撤销、查询下推和故障降级。下一篇进入异步队列，看看请求重试和 Worker 重投为什么会让同一操作执行两次。

## 把权限落实到一次查询

假设资源拥有 `tenantId` 和 `ownerId`，用户可能是租户管理员、成员或只读访客。入口先从可信身份建立主体和作用域，应用服务要求“读取文档”能力，Repository 最终把租户与资源范围写入查询条件。不要先查出全部记录再在 JavaScript 数组中过滤。

| 检查位置 | 负责的问题 |
| --- | --- |
| 身份入口 | 这个请求代表谁，凭证是否有效 |
| 策略层 | 该主体是否拥有读取/修改能力 |
| 应用服务 | 当前用例需要哪种能力与显式范围 |
| Repository | 查询只返回范围内数据 |
| 缓存与下载 | 命中后重新确认资源仍可见 |

列表查询、详情查询、导出、相邻资源和聚合统计使用同一范围表达。只保护详情接口而漏掉导出，仍然会泄露数据。缓存键包含租户、权限版本或范围摘要，权限撤销后主动失效或在读取时二次校验。

使用两个身份和三条不同归属数据做矩阵测试：管理员看到租户内两条，成员只看到授权一条，访客修改得到拒绝。再撤销成员权限后访问旧缓存，确认不可继续读取。错误响应避免暴露“资源存在但你无权查看”的额外信息，具体采用 403 还是 404 应由公开协议一致决定。

## 参考资料

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP API1: Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)
