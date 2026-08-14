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
updated: 2026-08-11T00:00:00.000Z
---
# Docker Compose：组织本地 AI 服务栈

API 容器已经显示 `running`，第一次请求仍报数据库连接失败；重建 PostgreSQL 后，原来的任务记录全部消失；Worker 使用 `localhost:6379`，却始终连不上 Redis。这些不是三个孤立问题，它们暴露了就绪、持久化和容器网络没有被明确设计。

Compose 适合在一台开发机或小型验证环境中描述多容器关系。它不是生产调度器，但能把服务名、网络、卷、健康检查、资源和配置写成可复查契约。

## 业务服务链与 Compose 配置

```mermaid
flowchart LR
  C[Client] --> A[API]
  A --> P[(PostgreSQL)]
  A --> R[(Redis)]
  W[Worker] --> R
  W --> P
  A --> O[(Object Storage)]
  W --> O
```

PostgreSQL 保存用户、任务和知识版本；Redis 保存短期缓存、限流或任务通知；对象存储保存文档与模型制品；Worker 处理解析、Embedding 或评测。API 不应把长任务留在请求进程里等待，也不应把 Redis 当作唯一业务记录。

## 一个可审查的 Compose 骨架

下面示例只展示基础设施关系，镜像版本和密码都需要按目标环境替换。`DATABASE_URL` 使用服务名 `postgres`，因为每个容器都有自己的 `localhost`。示例的目标是观察网络、持久卷和就绪依赖怎样表达，不代表可直接作为生产配置。

```yaml
services:
  api:
    image: example/ai-api:replace-with-digest
    environment:
      DATABASE_URL: postgresql://app:replace-me@postgres:5432/ai
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    restart: unless-stopped

  worker:
    image: example/ai-api:replace-with-digest
    command: ["python", "-m", "app.worker"]
    environment:
      DATABASE_URL: postgresql://app:replace-me@postgres:5432/ai
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: replace-me
      POSTGRES_DB: ai
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d ai"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

volumes:
  postgres-data:
```

Compose 读取这份配置后创建默认网络，服务名成为网络内 DNS 名称。`ports` 只把 API 暴露给宿主机，数据库和 Redis 不需要为容器间通信发布端口。Named Volume 持有 PostgreSQL 数据，因此重建容器不会自动删除数据；删除 Volume 则是破坏性操作，必须有明确授权和备份。

`depends_on` 的健康条件可以减少明显的启动竞态，但不能替代应用重连。数据库在某次启动时健康，不代表运行期间永远可用；API 和 Worker 仍要设置连接超时、有限退避与错误终态。

## 健康检查应验证哪一层

Liveness 回答“进程是否需要重启”，Readiness 回答“实例能否接流量”。在 Compose 中通常只有统一 healthcheck，但仍要避免把两种语义混在一个昂贵检查里。检查接口不应每秒调用外部模型，也不应因为供应商短时失败就重启本地 API。

数据库的 `pg_isready` 证明服务器接受连接，不证明 Schema 已迁移；Redis 的 `PING` 证明实例响应，不证明目标队列和持久化策略正确。业务启动应单独检查迁移版本与必要配置，并在失败时给出可定位日志。

## 配置、Secret 与镜像版本

普通配置可以来自环境变量或只读文件，Secret 不应写进 Compose、镜像 Layer 或版本库。开发环境可用本地未跟踪的 env 文件，正式环境应由 Secret 管理系统注入，并限制日志输出。

镜像标签便于阅读，Digest 才能保证内容不变。API 与 Worker 如果共享代码，最好使用同一镜像 Digest、不同启动命令，避免两套依赖悄悄分叉。模型文件很大时，应明确由镜像携带、启动下载还是挂载缓存，每种方式的发布速度和回滚边界不同。

## 日志、停止与恢复

容器日志优先写标准输出，由运行平台收集；业务持久状态写数据库或对象存储。停止时先阻止新请求和新任务，再等待在途工作到 Deadline，最后退出。Worker 只有在任务已完成且结果持久化后才能 ACK，重启后才有机会恢复未确认任务。

验证 Compose 设计时，应检查解析后的配置、服务网络、健康状态、Volume 归属和停止顺序。由于本机 Docker daemon 未运行，当前没有启动这套栈；YAML 只用于解释结构和边界，实际使用前还要替换镜像、Secret、资源限制并在隔离环境执行配置检查。
