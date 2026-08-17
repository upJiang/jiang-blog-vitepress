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

开发者执行 `docker compose up` 后，五个容器都显示 Started，API 仍然不断重启。日志里写着 PostgreSQL connection refused；几秒后数据库已可连接，API 却因为达到重启上限停住了。问题不在启动顺序，而在把“进程已创建”误当成“服务已经能正确回答请求”。


<InfraFigure src="/images/ai-infra/docker-compose/hero.png" alt="API、数据库、缓存、Worker 与对象存储组成的本地 AI 服务栈插画"
  icon="layers" caption="Compose 的价值不是一条启动命令，而是把多服务依赖写成可复现的运行关系。" />


## Compose 实际为本地服务栈管理哪些状态

先把术语放回系统位置。只记名字，遇到故障时仍然不知道应该去哪个进程或存储找证据。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Project | 一组由 Compose 文件共同定义的服务、网络和卷，名称通常成为资源前缀。它提供本地编排边界，不是生产集群控制面。 |
| Service | 容器运行模板，包括镜像、命令、环境、挂载、网络和健康检查；一次 service 可有一个或多个容器实例。 |
| Healthcheck | 容器内部周期执行的就绪探针，返回 healthy/unhealthy。它应检查服务能力，而不是只检查进程存在。 |
| Named Volume | 由容器引擎管理生命周期的持久存储引用。容器重建不删除卷，但 `down -v` 会删除，应明确备份边界。 |

::: tip 判断原则
定义一个组件时，同时说清它不负责什么。能回答输入从哪里来、状态存在哪里、输出交给谁，才算理解。
:::

## API 启动前为什么要等待能力而不是容器

```mermaid
flowchart LR
  S0["创建网络"]
  S1["启动依赖"]
  S2["确认就绪"]
  S3["启动应用"]
  S4["停止恢复"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
  S3 --> S4
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 1. 创建网络：Compose 持有当前状态

为 Project 建立默认网络并注册服务名 DNS。

可以从这些位置确认结果：`docker network inspect`、服务名解析。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 启动依赖发生时，先看 数据库与存储容器

进程初始化数据目录、执行恢复或迁移并开始监听。

这里不靠猜测，优先读取 健康检查、初始化日志、持久卷。

### 从 确认就绪 留下的证据回到 Healthcheck

用真实协议执行最小能力检查并形成状态。

决定下一步前需要看到 `docker compose ps` 的 health 状态。

### 4. API 与 Worker 怎样完成启动应用

解析服务名连接依赖，建立连接池并注册任务处理能力。

这一动作的可观察结果是 启动日志、连接池、队列 consumer。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 5. 停止恢复：Compose 与服务 持有当前状态

按信号退出并在下次启动重用持久数据。

可以从这些位置确认结果：退出码、卷清单、恢复日志。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

## 一份能表达就绪关系的解释性 Compose 配置

这段 YAML 用于说明字段语义，需结合实际镜像、Secret 和迁移策略后才能运行。输入是 API、PostgreSQL 和 Redis 三个服务；输出是一个只在数据库健康后启动的 API。

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
  api:
    image: local/ai-api@sha256:REPLACE_ME
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
volumes: { pgdata: {} }
secrets: { db_password: { file: ./secrets/db_password } }
```

`depends_on` 的健康条件只影响启动协调，不会在运行期间自动保证数据库永不失效；API 仍需连接超时、重试上限和熔断。`pg_isready` 证明数据库接受连接，不证明目标 schema 已迁移。镜像 digest 用于说明不可变引用，`REPLACE_ME` 不能直接运行。Secret 文件也应排除版本控制。

## 看起来相似，故障边界却不同

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| localhost 连接数据库失败 | 容器内 localhost 指向自身，不是另一个 service | 使用 `db:5432` 并确认位于同一网络 |
| 容器 Started | 依赖进程可能仍在初始化、恢复 WAL 或加载模型 | 为真实能力设计 healthcheck |
| 重建后数据消失 | 数据写在容器可写层，或误执行了删除卷操作 | 核对 Mounts、卷名称和备份 |
| 不断 restart | 重启策略掩盖确定性配置错误，日志被快速滚动 | 先关闭自动重启复现首个退出原因 |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

Compose 很适合本地开发、集成测试和单机演示，但不会提供跨节点调度、声明式滚动发布或集群级资源隔离。不要把开发用明文密码、宽松端口和 bind mount 原样带入生产。

服务栈在本地网络中就绪后，还需要一个稳定入口把 TLS、普通 API 与流式响应交给正确后端。下一篇从“模型在生成，浏览器却看不到 Token”进入 Nginx。
