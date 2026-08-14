---
title: "Dockerfile 与 Compose：搭建可重复的 MySQL 后端栈"
description: "从镜像在另一台机器启动失败开始，解释构建上下文、多阶段构建、环境变量、健康检查、依赖就绪和数据卷。"
category: backend
part: "容器"
chapter: 42
tags:
  - "Dockerfile"
  - "Compose"
  - "MySQL"
prerequisites:
  - "理解 OCI 镜像和网络"
outcomes:
  - "能写可复现的 API 镜像"
  - "能把配置、数据和代码生命周期分开"
practice:
  type: implementation
  result: "为三套 API 共用栈设计 Compose 配置"
  verify:
    - "compose config 可展开"
    - "健康检查表达服务可用而非仅进程存在"
evidence: official-guided-operation
updated: 2026-08-12
---

# Dockerfile 与 Compose：搭建可重复的 MySQL 后端栈

`docker compose up` 显示 API started，但 API 立刻因 MySQL connection refused 退出。Compose 的启动顺序只说明容器进程已创建，数据库完成初始化和接受连接是另一状态。可复现本地栈需要正确 Dockerfile、健康检查、依赖就绪和持久卷。

## Dockerfile 把构建依赖与运行依赖分开

多阶段构建在 builder 安装依赖、编译和测试，在 runtime 只复制生产产物与必要依赖。固定基础镜像版本/digest，设置非 root 用户、明确 WORKDIR 和 ENTRYPOINT，并让 PID 1 接收信号。

构建上下文由 `.dockerignore` 排除 node_modules、Git、日志、测试数据和本地 Secret。环境相关配置在运行时注入，同一镜像依次进入候选和生产，不能为每个环境重新编译。

下面是 Node API 的多阶段骨架。版本和包管理命令应与仓库锁文件一致，示例使用仓库现有 Yarn。

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn test && yarn build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

真实项目可用生产依赖裁剪进一步缩小镜像。测试失败时构建应停止；Secret 不通过 ARG/ENV 写入镜像，BuildKit secret 也要确认不会复制进产物。

## Compose 服务名就是本地 DNS 名称

同一 Compose Network 内，API 连接 `mysql:3306`、`redis:6379`、`rabbitmq:5672`、`minio:9000`。宿主端口只为浏览器或本机工具发布，服务间连接不绕宿主映射。

Volume 保存 MySQL/MinIO 数据；Redis 是否持久化由本地实验目标决定。开发栈的默认密码只能用于隔离本机，并用 `.env.example` 说明变量，不把真实凭证提交。

以下 Compose 片段只展示 MySQL 就绪条件和 API 依赖。完整仓库还包含 Redis、RabbitMQ 与 MinIO。

```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: backend
      MYSQL_USER: backend
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?required}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?required}
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MYSQL_ROOT_PASSWORD"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - mysql-data:/var/lib/mysql

  node-api:
    build: ./node
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      DATABASE_URL: mysql://backend:${MYSQL_PASSWORD}@mysql:3306/backend
```

`depends_on` 只帮助启动顺序，运行中 MySQL 仍可能重启。API 需要有限连接重试、readiness 和错误响应，不能把 Compose 当高可用编排器。

已有连接在 MySQL 重启后会失效，应用不能只在启动阶段重试一次。连接池应丢弃坏连接、按总 deadline 有限重连；readiness 反映是否还能接受依赖数据库的新请求。否则 Compose 看似所有容器都在 running，业务仍会持续返回 500。

## 迁移属于一次性作业，不属于每个 API 启动

三个 API 副本同时启动并自动迁移会竞争锁，也把结构变更隐藏在进程日志。Compose 中用独立 migrate 服务执行共享 SQL，成功后再启动 API；生产则使用受控 Job。

健康检查分存活与就绪：容器自身 HEALTHCHECK 可证明进程接口响应，应用 `/health/ready` 再检查能否接新请求。不要每秒执行深度全表查询作为健康检查。

```mermaid
flowchart LR
  UP[docker compose up] --> INFRA[MySQL/Redis/MQ/MinIO]
  INFRA --> HEALTH{关键依赖 ready}
  HEALTH --> MIGRATE[Migration Job]
  MIGRATE --> API[Node/Python/Go API]
  API --> REACT[React dev server]
```

基础设施健康不代表迁移成功，迁移成功也不代表业务可用。启动脚本应分别报告每个阶段的失败。

## 本地数据重置必须明确目标

`docker compose down` 不默认删除 Named Volume；加 `-v` 会删除栈数据，属于破坏性操作。开发脚本应显示将删除的 Compose project 与 Volume 名称，只对明确的隔离数据执行。

排查先运行 `docker compose config` 查看变量展开，再看 ps、logs、health 与网络。不要因为一个服务失败就删除所有 Volume，数据库初始化错误与已有数据版本不兼容需要分别处理。

## Compose 环境的就绪与部署边界

**为什么 healthcheck 中要写 `$$MYSQL_ROOT_PASSWORD`？**

Compose 会在宿主解析单 `$` 变量，双 `$` 保留给容器 Shell 在运行时读取。先用 `docker compose config` 检查最终命令，避免密码被错误展开或为空。

**开发时修改代码是否每次重建镜像？**

可用 Bind Mount 和框架热更新提高效率，但生产验证必须用最终镜像。开发 override 不应改变数据库地址、认证或文件路径等关键语义。

**为什么不要把 `sleep 10` 当就绪等待？**

不同机器和已有数据初始化时间不同，固定睡眠既可能过短也浪费时间。轮询真实健康条件并设总超时，失败时输出依赖日志。

**Compose 能否直接当生产编排？**

小型单机部署可以，但滚动更新、自愈、调度、Secret、权限和多机高可用能力有限。是否使用取决于规模与运维要求，不能把本地栈原样称为企业生产方案。
