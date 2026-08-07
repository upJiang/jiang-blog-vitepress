---
title: "API、应用服务、Agent Runtime、RAG 与基础设施分层"
description: "从职责混杂的函数中拆出协议、用例、编排、检索和适配器。"
category: architecture
part: "AI 系统设计"
chapter: 3
tags: ["Layered Architecture", "Agent Runtime"]
prerequisites: ["读过第 1、2 章"]
outcomes: ["设计依赖方向", "共享 Runtime 而不复制规则"]
practice:
  type: implementation
  result: "重构一段匿名伪代码的模块边界"
  verify: ["领域规则不依赖 HTTP", "评测与 MCP 能复用 Runtime"]
evidence: anonymized-practice
updated: 2026-08-06
---
# API、应用服务、Agent Runtime、RAG 与基础设施分层

一个知识问答功能最初可能只有一个 answer 函数：读请求、查数据库、调用模型、拼引用、写事件全部混在一起。管理端能调用它，评测脚本和只读工具却只能复制一份。一次权限修复改三处，结果很快分叉。

本章按谁拥有哪种决策拆出 API、应用服务、Agent Runtime、RAG 和基础设施适配器。目标不是堆目录，而是让 HTTP、Worker 和 Eval 复用同一条执行规则。

## 先看依赖方向

~~~mermaid
flowchart TB
  A[HTTP/SSE API] --> B[应用服务：创建回合与准入]
  C[Worker] --> B
  D[Eval Runner] --> E[Agent Runtime]
  B --> E
  E --> F[RAG Port]
  E --> G[Tool Port]
  F --> H[检索适配器]
  G --> I[MCP/外部适配器]
  H --> J[(数据库/向量/Redis)]
  I --> K[外部服务]
~~~

API 负责协议，应用服务负责用例状态与准入，Runtime 负责一次 Agent 执行，Port 是能力契约，数据库和协议客户端位于外层适配器。箭头表示调用方向，每一条边都应有输入、输出、超时和错误类别。

## 第一步：给混杂函数标注责任

~~~text
answer(request):
  parse HTTP JSON              # API
  load actor and scope         # 应用服务
  save turn                    # 应用服务
  retrieve visible evidence   # RAG
  call model and tools         # Runtime
  validate citations           # 质量策略
  write events and final state # 事件存储
  format SSE                   # API
~~~

Runtime 可以请求检索证据，却不能绕过应用服务拿全库连接；API 可以把事件转成 SSE，却不能决定 Claim 是否有证据。把每一行责任标出来，才能发现一个函数同时拥有太多外部依赖。

## 第二步：API 只做协议适配

HTTP Handler 读取 Body、认证主体、路径和 Header，调用应用服务，映射稳定错误和事件格式。它不应该知道 ORM 查询、模型供应商请求或提示词细节。SSE Handler 负责心跳、序列号、终态序列化和连接取消，并把取消传给 Runtime。

HTTP 断开不是业务状态自动完成。持久任务仍由 Worker 的任务所有权、Lease 和终态逻辑处理。

## 第三步：应用服务拥有用例状态

创建回合并派发执行是一个用例。应用服务决定主体、范围、会话/回合持久化、幂等键、准入队列和终态事件。数据库事务只包住需要原子的数据库变化；网络模型调用和长检索不应占着创建事务的连接。

数据库提交后派发失败的处理要么有恢复记录与重试，要么明确当前限制。普通 publish 函数不会自动获得跨数据库原子性。

## 第四步：Runtime 接收收敛后的输入

~~~text
RuntimeInput
  actor_scope: 已核对的主体范围
  question: 用户问题
  knowledge_version: 固定版本
  policy_version: 规则版本
  deadline: 绝对截止时间
  event_sink: 受控事件接口
~~~

这些字段是公开的最小示例，不是私有项目类型。Runtime 不从全局状态读取当前用户，也不自行查询所有知识。它接收已验证的范围与版本，执行节点、工具和证据规则，并返回结构化终态或事件。

HTTP、Worker 和 Eval 可以复用 Runtime，但入口仍负责协议和持久状态。评测固定知识/策略版本，不能偷偷读线上最新数据。

## 第五步：用 Port 隔离 RAG 与工具

RAG Port 描述按范围和版本检索候选，不暴露 SQL；Tool Port 描述调用白名单只读能力，不暴露 MCP 会话细节。实现可以是 PostgreSQL、向量库、HTTP、MCP 或测试替身。

端口至少包含输入结构、证据/结果、超时、取消、错误类别和观测字段。只返回任意 JSON，调用方就不知道结果是否带版本、范围和原文位置。

测试 Runtime 时用内存替身返回固定 Evidence；测试适配器时连接隔离数据库；测试 API 时不必启动真实模型。这就是共享 Runtime 的边界。

## 第六步：跨层映射失败

| 来源 | 内部语义 | API/SSE 语义 |
| --- | --- | --- |
| 输入 Schema 失败 | InvalidInput | 400 |
| 主体无范围 | ScopeRequired | 400/403 |
| 范围内无证据 | NoVisibleEvidence | 明确无结果，不越界 |
| 依赖超时 | DependencyTimeout | 可重试错误/取消 |
| Worker 丢失 Lease | OwnershipLost | 停止写入，任务恢复 |
| Runtime 生成失败 | GenerationFailed | 错误终态 |
| 业务已终态 | AlreadyCompleted | 幂等返回原结果 |

API 只映射稳定类别，不把驱动错误、供应商原文和堆栈返回客户端；日志与 Trace 保留关联 ID。

## AI 工程师的分层审查

模型调用是否可替换？供应商响应有没有渗透到领域层？RAG 返回的是带范围、版本和来源的证据吗？Runtime 有没有 Deadline、取消、循环上限和事件序列？Eval 是否调用同一 Runtime，并固定输入版本？成本预算和模型路由是否属于明确的应用/基础设施边界？权限是否在检索前过滤，并在缓存命中和引用生成后再次核对？

发现循环依赖时，先写出谁拥有决策、谁只提供能力，再按 Port 和依赖注入拆解，不要只移动文件名。

## 迁移练习

选一段请求、检索、模型和 SSE 伪代码，画出 API、应用服务、Runtime、RAG Port、适配器、数据库与事件存储。给每条箭头写输入/输出和超时，再写一个内存 RAG 替身，让同一 Runtime 能被评测调用。

下一章会把会话、回合、事件、异步任务与所有权放进这套边界，解决长时间执行怎样查询、取消和恢复。

## 参考资料

- [Martin Fowler: Dependency Injection](https://martinfowler.com/articles/injection.html)
- [Twelve-Factor App](https://12factor.net/)
- [OpenTelemetry tracing concepts](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OWASP LLM applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
