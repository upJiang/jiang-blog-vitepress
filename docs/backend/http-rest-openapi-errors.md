---
title: "HTTP、REST、OpenAPI、错误结构与接口版本"
description: "用一个资源接口讲清方法语义、状态码、幂等、分页、错误码、契约和兼容演进。"
category: backend
part: "第一部分：后端共同基础"
chapter: 2
tags: ["HTTP", "OpenAPI"]
prerequisites: ["读过第 1 章"]
outcomes: ["设计稳定接口契约", "区分业务错误与传输错误"]
practice:
  type: implementation
  result: "编写一份最小 OpenAPI 契约"
  verify: ["请求响应能被校验", "新增字段保持兼容"]
evidence: official
updated: 2026-08-06
---
# HTTP、REST、OpenAPI、错误结构与接口版本

客户端创建任务，服务端返回 `200` 和一句“失败了”。人能猜，程序却不知道请求是否成功、该不该重试、错误字段是否稳定。接口契约的价值就是让双方在没有阅读服务端源码的情况下正确交互。

本章围绕 `Task` 资源设计创建、查询和列表接口，再加入幂等键、分页、结构化错误与 OpenAPI。

## 从资源和用例开始，不从 URL 风格开始

我们需要三个用例：创建任务、读取任务、分页列出任务。一个基础接口可以是：

```text
POST /v1/tasks
GET  /v1/tasks/{taskId}
GET  /v1/tasks?cursor=...&limit=20
```

REST 不是“所有 URL 都用名词”这么简单。更重要的是使用 HTTP 统一语义：方法、状态码、表示、缓存和条件请求。复杂业务动作无法自然表达为 CRUD 时，可以使用清晰子资源或动作端点，但要保持契约一致。

## 方法语义与幂等

RFC 9110 把 GET、HEAD、OPTIONS、TRACE 定义为 safe：意图是读取，不应产生用户请求的状态变更；PUT、DELETE 和 safe 方法具有幂等语义：重复同一请求的预期效果等同于一次。

POST 通常不幂等，但应用可以通过幂等键为特定创建操作提供去重：

```http
POST /v1/tasks HTTP/1.1
Content-Type: application/json
Idempotency-Key: 9a02c6d8-...

{"title":"生成月度报告"}
```

服务端按认证主体、端点和幂等键保存请求摘要与结果。相同键、相同请求返回原结果；相同键、不同 Body 返回 409，防止客户端误复用。

幂等不等于无限安全重试。客户端还要判断连接失败发生在发送前还是结果未知，服务端副作用是否都被幂等保护。

## 创建接口的成功契约

同步创建资源可返回 `201 Created`，`Location` 指向新资源。长任务只创建任务记录并异步执行时，也可以返回 202，关键是文档明确。

```json
{
  "id": "task_demo_01",
  "status": "pending",
  "title": "生成月度报告",
  "createdAt": "2026-08-06T10:00:00Z"
}
```

时间使用带时区的标准格式；状态使用受控枚举；ID 被当作不透明字符串，客户端不猜内部编码。

## 错误结构要让人和程序都能用

RFC 9457 定义 Problem Details，可以使用 `application/problem+json`：

```json
{
  "type": "https://example.com/problems/task-title-invalid",
  "title": "任务标题不合法",
  "status": 422,
  "detail": "title 不能为空且最多 120 个字符",
  "instance": "/v1/tasks",
  "code": "task_title_invalid",
  "requestId": "r-demo-01"
}
```

`status` 对应 HTTP；`code` 供客户端稳定分支；`detail` 给人阅读；`requestId` 供排障。内部 SQL、堆栈和凭证不返回。

### 错误映射表

| 领域结果 | HTTP | 客户端动作 |
| --- | ---: | --- |
| 输入不符合契约 | 400/422 | 修正请求，不重试原内容 |
| 凭证缺失或失效 | 401 | 重新认证 |
| 无权执行 | 403 | 不通过重试绕过 |
| 资源不存在 | 404 | 检查 ID 或刷新列表 |
| 状态/版本冲突 | 409 | 读取最新状态后决定 |
| 限流 | 429 | 遵守 `Retry-After` |
| 暂时不可用 | 503 | 有限退避重试 |

同一 `code` 不应在不同状态下表达不同含义。错误文案可以变化，机器逻辑依赖稳定 code。

## 分页为何优先考虑游标

Offset 分页简单：`page=10&pageSize=20`，但数据插入或删除时容易重复或漏项，大 Offset 也可能扫描大量记录。

游标分页使用稳定排序键，例如 `(created_at, id)`：

```text
GET /v1/tasks?limit=20&cursor=<opaque>
```

响应：

```json
{
  "items": [],
  "nextCursor": "opaque-next-cursor",
  "hasMore": false
}
```

游标应是服务端生成的不透明值，包含排序位置和必要签名，不把可随意篡改的 SQL 条件暴露给客户端。排序字段要有唯一补充键，否则同一时间戳会造成不稳定。

## OpenAPI 把契约变成可检查文档

下面只展示创建接口的关键部分：

```yaml
openapi: 3.1.0
info:
  title: Example Task API
  version: 1.0.0
paths:
  /v1/tasks:
    post:
      operationId: createTask
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTask'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Invalid input
components:
  schemas:
    CreateTask:
      type: object
      required: [title]
      additionalProperties: false
      properties:
        title: { type: string, minLength: 1, maxLength: 120 }
```

OpenAPI 描述协议形状，可生成文档、客户端和契约测试。它不能表达所有业务不变量，例如“completed 状态不能再次执行”，这些规则仍需文字说明和服务端测试。

## 版本兼容怎样判断

通常兼容的变化：新增可选响应字段、增加新端点、放宽输入枚举要谨慎评估客户端。通常破坏性变化：删除或改名字段、改变类型、把可选改必填、改变状态码语义。

响应新增字段虽然常被认为兼容，但客户端若使用严格反序列化或穷举检查，也可能失败。契约测试要包含真实客户端行为。

版本可以放在路径、Header 或媒体类型。选择一种后保持一致。不要每次小改动都创建新大版本；先使用兼容演进和弃用窗口。

### 弃用流程

1. 发布新字段或新端点；
2. 记录旧接口调用量；
3. 通知消费者和截止时间；
4. 在测试环境验证迁移；
5. 调用归零后移除；
6. 保留回滚与变更记录。

## 契约测试覆盖什么

- 正常请求与响应通过 Schema；
- 缺字段、额外字段、边界长度；
- 401、403、404、409、422、429、503 的结构；
- 幂等键重复与冲突；
- 游标非法、过期和最后一页；
- 旧客户端读取新响应；
- OpenAPI 与运行路由一致。

契约测试不替代应用服务单元测试和数据库集成测试。它只保证协议双方的可见约定。

## 接口设计卡

```text
用例与资源：
方法和路径：
认证与权限：
请求 Schema：
成功响应和状态码：
错误 code 与客户端动作：
幂等语义：
分页/排序：
缓存与条件请求：
兼容策略与弃用窗口：
```

下一章进入认证和授权。接口知道“请求长什么样”后，还要知道“是谁在请求，以及他能看到哪一行数据”。

## 参考资料

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)

