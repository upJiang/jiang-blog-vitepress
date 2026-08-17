---
title: Docker Compose：组织本地 AI 服务栈
description: 把 API、PostgreSQL、Redis、Worker 和对象存储放入同一可恢复网络，讲清卷、探针、依赖与日志。
category: devops
part: 第一部分：认识 AI Infra 与运行底座
chapter: 5
tags:
  - Docker Compose
  - AI Backend
prerequisites:
  - 理解容器运行模型
outcomes:
  - 设计多服务本地拓扑
  - 区分进程启动和服务就绪
practice:
  type: implementation
  result: 完成一份 AI 服务栈 Compose 设计
  verify:
    - 服务通过名称互访
    - 持久数据不依赖容器可写层
evidence: anonymized-practice
updated: 2026-08-17T00:00:00.000Z
---
# Docker Compose：组织本地 AI 服务栈

本地 AI 服务栈常见的失败是：API 容器启动了，Redis 还没准备好；数据库卷被删后，开发者才发现模型任务状态也在里面；服务之间用 localhost 互访，结果每个容器都在访问自己。Compose 的价值是把这些关系写成可复核的拓扑。

## 先看服务之间的关系

```mermaid
flowchart LR
  API[api] --> PG[(postgres)]
  API --> R[(redis)]
  API --> Q[queue]
  Q --> W[worker]
  API --> O[(minio)]
  W --> O
  PG -.volume.-> V1[(pgdata)]
  O -.volume.-> V2[(objects)]
```

Compose 网络里的服务名才是稳定的 DNS 名称。API 连接 postgres:5432，而不是 localhost:5432。容器可写层适合临时文件，不适合数据库、对象和模型制品；这些数据必须通过卷或外部服务持久化。

## 启动顺序和就绪不是一回事

```yaml
services:
  api:
    image: example/api@sha256:...
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://app:secret@postgres:5432/app
  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
```

这段配置只表达“API 等待数据库健康检查通过”，不代表迁移已完成，也不代表业务查询可用。健康检查要尽量靠近服务真实依赖，但不要把昂贵的模型加载塞进每秒执行的探针。

## 卷、网络与配置各自负责什么

| 对象 | 应该保存 | 不应该保存 |
| --- | --- | --- |
| Volume | PostgreSQL 数据、MinIO 对象、需要恢复的索引 | 一次启动的临时日志 |
| Network | 服务发现和端口连通 | 业务权限和租户隔离 |
| Environment/Secret | 连接地址、运行开关、凭证引用 | 镜像内固定的生产密钥 |
| Healthcheck | 可观察的就绪条件 | 复杂迁移和全量模型评测 |

Compose 能组织本地依赖，却不会自动提供生产级故障转移、备份和多节点调度。它适合把系统边界变得可见，不能被当作 Kubernetes 的缩小版。

## 停机、恢复和对账

执行 down 或重建前，先确认卷是否仍在、任务是否可重试、对象是否有校验。恢复时按数据库、队列、对象、API、Worker 的顺序验证：数据层先健康，应用层再读取，最后确认后台任务没有重复副作用。

::: tip
**下一步**

当多个服务都正常而浏览器仍看不到流式 Token，问题通常在入口代理的缓冲和超时。下一篇把 Compose 的 API 放到 Nginx 后面，继续沿同一请求观察。
:::

## 把本地恢复当成一次小型演练

可以故意停止 Worker，再启动它，观察同一 task_id 是否从持久状态继续，而不是重复写入；可以重建 API 容器，确认数据库与对象卷仍然存在；可以在 Redis 清空的隔离环境中验证缓存失效后系统是否回源。这里的目的不是制造故障，而是确认每种状态有没有明确归属。

Compose 文件还应区分开发便利与生产语义。绑定源码、开放数据库端口、默认密码和单副本依赖适合本地调试，不应被复制成生产配置。把这种差异写在配置和文档里，比让新人从事故中发现更便宜。

## 依赖故障不应被 depends_on 隐藏

depends_on 只控制 Compose 的启动编排，不能替代应用自己的连接重试、退避和降级。数据库在健康检查通过后仍可能因为迁移、锁或连接数暂时不可用，Redis 也可能在运行中重启。API 必须把这些错误映射成可恢复的业务状态。

本地环境可以通过停止单个依赖来验证：API 是否返回明确的 503，Worker 是否暂停领取任务，恢复后连接池是否重建。这样 Compose 不只是“一键启动”，还是理解依赖故障边界的低成本场地。
