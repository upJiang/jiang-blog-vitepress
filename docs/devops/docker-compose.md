---
title: Docker Compose 启动 API、PostgreSQL、Redis 与 Worker
description: 从四个独立容器组成系统，讲清网络、卷、健康检查、依赖、日志、停止和恢复。
category: devops
part: 第二部分：容器与入口
chapter: 5
tags:
  - Docker Compose
prerequisites:
  - 读过第 4 章
outcomes:
  - 编写多服务 Compose
  - 排查依赖与持久化
practice:
  type: implementation
  result: 启动并验证一套匿名服务栈
  verify:
    - 服务通过名称互访
    - 重建容器后数据库数据仍在
evidence: anonymized-practice
updated: 2026-08-06T00:00:00.000Z
---

# Docker Compose：把 API、数据库、Redis 和 Worker 跑成一个系统

我们要启动的不是“四个互不相干的容器”，而是一条完整任务链：浏览器把任务交给 API，API 将任务写入 PostgreSQL，再把任务编号放进 Redis，Worker 取走任务并更新结果。

读完后，你应该能独立回答这些问题：容器为什么不该用 `localhost` 访问另一个容器？数据库容器删掉以后，数据为什么还在？`depends_on` 为何无法代替应用重试？看到 `running` 又为什么不代表服务已经可用？

## 最终要跑通的结果

假设用户提交一项“生成文档摘要”的任务，系统按下面的顺序处理：

```mermaid
flowchart LR
  U[浏览器] -->|POST /tasks| A[API]
  A -->|保存任务| P[(PostgreSQL)]
  A -->|放入任务编号| R[(Redis)]
  W[Worker] -->|取任务编号| R
  W -->|更新结果| P
  U -->|GET /tasks/:id| A
```

这张图先帮我们划清职责：PostgreSQL 持久保存任务状态；Redis 在这个练习中承担临时队列；Worker 负责耗时处理；API 只负责接收请求和查询结果。生产系统会使用更完整的消息队列与投递语义，本篇先把容器协作讲透。

开始前需要安装 Docker Desktop，或在 Linux 上安装 Docker Engine 与 Compose 插件。执行 `docker version` 和 `docker compose version` 都能返回版本信息，才继续后面的实验。

## 先别写 Compose：弄懂它管理的五种对象

很多 Compose 问题，其实不是 YAML 问题，而是没有区分镜像、容器和数据。

### 镜像是可重复使用的运行包

镜像包含只读文件系统和默认启动配置。`postgres:17` 是一个镜像；它还没有进程，也不会占用端口。镜像通常由 Dockerfile 构建，同一个镜像可以创建多个容器。

### 容器是镜像的一次运行

容器有自己的进程、网络空间和可写层。删除容器会删除这层临时改动，所以业务数据不应只存在容器可写层。更新应用时常见的操作正是删除旧容器，再从新镜像创建新容器。

### 网络让服务名变成地址

Compose 会为项目创建默认网络，并为每个服务注册 DNS 名称。API 访问数据库时写 `postgres:5432`，其中 `postgres` 是服务名。

容器里的 `localhost` 永远指向容器自己。API 容器使用 `localhost:5432`，等于在 API 容器内寻找 PostgreSQL，自然连接失败。

### Volume 保存需要跨容器存在的数据

命名卷由 Docker 管理生命周期。把 PostgreSQL 的数据目录挂到命名卷后，数据库容器被替换，数据仍然存在。卷不是备份：误删除、逻辑错误和数据损坏也会写进卷，备份还要单独设计。

### 健康检查回答“现在是否能工作”

容器进程存在，只能得到 `running`。健康检查会执行一条探针，进一步得到 `healthy` 或 `unhealthy`。数据库探针可以检查是否接受连接；API 探针可以请求就绪接口。不同探针回答的问题不同，不要把“HTTP 端口能连通”理解成所有依赖都正常。

## 准备最小项目

练习目录只保留理解 Compose 所需的文件：

```text
compose-lab/
├── app/
│   ├── api.py
│   └── worker.py
├── Dockerfile
├── requirements.txt
└── compose.yaml
```

API 与 Worker 使用同一个应用镜像，只是启动命令不同。这种做法可以保证两边使用相同的 Python 依赖和业务代码，也便于理解“镜像相同，容器职责可以不同”。

### 构建应用镜像

`requirements.txt` 固定本次实验需要的库。教程中的版本是示例基线，实际项目应通过依赖更新工具和测试决定升级时间。

```text
fastapi==0.116.1
uvicorn==0.35.0
psycopg[binary]==3.2.9
redis==6.4.0
```

Dockerfile 负责把依赖和源码装进镜像：

```dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

CMD ["uvicorn", "app.api:api", "--host", "0.0.0.0", "--port", "8000"]
```

按执行顺序理解这段配置：`FROM` 选择 Python 运行环境；`WORKDIR` 固定容器内工作目录；第一次 `COPY` 和 `RUN` 安装依赖；第二次 `COPY` 才复制经常变化的源码，这样源码变化时更容易复用依赖层；`CMD` 给镜像设置默认启动命令。

`EXPOSE` 没有出现在这里也不影响容器监听。真正决定进程监听地址的是 Uvicorn 参数，决定宿主机能否访问的是稍后的 `ports`。

### API 和 Worker 各做什么

为了不让代码抢走文章主线，这里只列职责，不展开完整业务实现：

| 文件 | 输入 | 处理 | 输出 |
| --- | --- | --- | --- |
| `api.py` | HTTP 请求 | 写任务记录，将任务 ID 放入 Redis | `202` 与任务 ID |
| `worker.py` | Redis 中的任务 ID | 执行模拟任务，更新数据库 | `succeeded` 状态 |

你可以先把处理函数写成等待一秒并更新状态。这个实验要观察的是进程、连接和数据生命周期，不是实现可靠队列。Redis List 没有完善的 ACK、可见性超时和死信能力，生产任务系统应选用合适的消息队列或任务框架。

## 第一步：先启动数据服务

先写 PostgreSQL 和 Redis，减少一次引入的概念。创建 `compose.yaml`：

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7.4-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres_data:
  redis_data:
```

`environment` 初始化练习数据库。密码不直接写在 Compose 文件中，而是从宿主机环境读取；真实项目还应使用 Secret 管理方案，避免密码进入 shell 历史、构建层和日志。

两个 `volumes` 左侧是卷名，右侧是镜像约定的数据目录。Redis 开启 AOF 只是为了演示进程重启后的数据恢复，不代表它拥有与 PostgreSQL 相同的一致性和恢复语义。

先设置练习密码并检查最终配置：

```bash
export POSTGRES_PASSWORD='local-demo-only'
docker compose config
docker compose up -d postgres redis
docker compose ps
```

`config` 会解析变量、合并配置并暴露 YAML 错误；它成功后，`up -d` 在后台创建网络、卷和两个容器；`ps` 显示容器状态。预期是健康状态从 `starting` 变为 `healthy`，这个过程可能需要几秒。

不要把包含真实密钥的 `docker compose config` 输出贴到工单或公开日志，因为变量替换后的结果可能含有敏感信息。

## 第二步：接入 API 与 Worker

现在把下面两项加到 `services` 下。示例没有给数据库发布宿主机端口，因为 API 和 Worker 可以通过 Compose 网络访问它；只把 API 的 `8000` 暴露给宿主机。

```yaml
  api:
    build: .
    ports:
      - "8000:8000"
    environment: &app_environment
      DATABASE_URL: postgresql://app:${POSTGRES_PASSWORD}@postgres:5432/app
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=2)"]
      interval: 5s
      timeout: 3s
      retries: 10

  worker:
    build: .
    command: ["python", "-m", "app.worker"]
    environment: *app_environment
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

先看 `api`：`build: .` 用当前 Dockerfile 构建镜像；`8000:8000` 左边是宿主机端口，右边是容器端口；连接串中的 `postgres` 和 `redis` 都是服务名。YAML 锚点 `&app_environment` 只是减少重复，Worker 通过 `*app_environment` 获得同一组连接配置。

再看 `worker`：它复用相同镜像，但 `command` 覆盖 Dockerfile 的默认命令，因此启动的是后台消费者。它不接收宿主机请求，不需要 `ports`。

`depends_on.condition` 会让 Compose 等依赖健康后再创建应用容器。运行过程中数据库仍可能断开，所以应用代码仍要设置连接超时、处理异常并进行有限重试。Compose 只帮助安排启动，不替业务代码保证依赖永远可用。

## 第三步：观察一次完整启动

先构建，再启动全部服务：

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=80 api worker
```

`build` 失败时应先修 Dockerfile、依赖下载或平台架构问题；`up` 失败再查容器配置与运行期依赖。把两个阶段分开执行，日志更容易读。

预期状态可以这样判断：

| 对象 | 期望 | 它证明了什么 |
| --- | --- | --- |
| PostgreSQL | `healthy` | 数据库探针可以建立连接 |
| Redis | `healthy` | Redis 能响应 `PING` |
| API | `healthy` | API 就绪路由返回成功 |
| Worker | `running` | Worker 进程仍在运行，但还需用任务验证 |

如果 API 返回健康，Worker 却无法处理任务，系统仍然不完整。后台进程的就绪最好结合 Worker 心跳、队列消费或一条低成本测试任务判断，而不是只检查 PID。

## 第四步：验证网络和配置，不靠猜

先在 API 容器里解析服务名：

```bash
docker compose exec api python -c \
  "import socket; print(socket.gethostbyname('postgres')); print(socket.gethostbyname('redis'))"
docker compose exec postgres pg_isready -U app -d app
docker compose exec redis redis-cli ping
```

第一条命令的输入是两个 Compose 服务名，输出应是项目网络里的容器 IP。后两条分别从服务内部验证数据库和 Redis。容器 IP 可能在重建后变化，应用应保存服务名，不要把本次输出写死到配置。

需要从宿主机检查 API 时，再执行：

```bash
curl -i http://127.0.0.1:8000/health/ready
docker compose port api 8000
```

执行顺序是先从宿主机请求 API，再读取 Compose 的端口映射；`curl` 验证 HTTP 状态和响应体，`port` 告诉你容器端口实际发布到了哪里。若 `ps` 显示正常而 `curl` 失败，检查 Uvicorn 是否监听 `0.0.0.0`、端口映射是否正确，以及宿主机端口是否已被占用。返回 200 只证明入口可达，仍要继续检查 API 到数据库的健康状态。

## 第五步：亲手证明数据是否持久

不要只背“Volume 会持久化”。向 PostgreSQL 写一条记录，删除容器，再重新创建：

```bash
docker compose exec postgres psql -U app -d app \
  -c "create table if not exists checks(id bigserial primary key, note text not null);" \
  -c "insert into checks(note) values ('volume-survives-container');"

docker compose down
docker compose up -d
docker compose exec postgres psql -U app -d app \
  -c "select id, note from checks order by id desc limit 1;"
```

第一次命令创建表并写入练习数据；`down` 删除本项目的容器和默认网络，但默认保留命名卷；第二次 `up` 创建全新容器；最后查询仍应看到刚才的记录。你验证的是“数据独立于容器”，不是“数据已经有备份”。

`docker compose down -v` 会连命名卷一起删除。它适合确认过范围的隔离练习，不适合当作日常清理命令，在包含重要数据的环境尤其要避免使用。

## 第六步：理解停止、重启和重建的差别

这几个命令看起来相似，影响并不相同：

| 命令 | 容器 | 网络 | 命名卷 | 适用场景 |
| --- | --- | --- | --- | --- |
| `stop` | 保留 | 保留 | 保留 | 暂停进程，稍后继续 |
| `restart api` | 原容器重启 | 保留 | 保留 | 仅验证进程重启行为 |
| `up -d --build api` | 必要时重建 API | 保留 | 保留 | 应用代码或镜像更新 |
| `down` | 删除 | 删除 | 保留 | 结束整套本地环境 |
| `down -v` | 删除 | 删除 | 删除 | 销毁明确的临时实验数据 |

应用收到停止信号后，还要停止接收新任务、等待正在处理的任务到达安全点，再退出。Dockerfile 使用 exec 形式的 `CMD`，并在需要时设置合理的 `stop_grace_period`，能让信号更可靠地到达应用进程。

## 故障排查：按层收集证据

遇到“服务起不来”，先判断问题在哪一层。直接反复 `restart` 会冲掉现场，也不会修正配置。

### 第一层：Compose 配置是否成立

```bash
docker compose config --quiet
docker compose images
docker compose ps -a
```

依次检查 YAML 与变量、服务实际使用的镜像、已退出容器的状态。若容器从未创建，重点看配置和构建；若创建后退出，进入日志层。

### 第二层：进程为什么退出或不健康

```bash
docker compose logs --tail=120 api
docker compose logs --tail=120 postgres
docker inspect --format '{{json .State.Health}}' "$(docker compose ps -q api)"
```

前两条查看标准输出与错误；最后一条读取 API 健康检查的最近结果。日志里的 `connection refused` 说明目标地址可解析但没有服务接受连接；`name resolution` 类错误通常指向服务名或网络；认证失败则要核对用户、密码和数据库名。

### 第三层：网络路径是否正确

在发起连接的容器里做检查，因为宿主机能连通不代表容器也能连通：

```bash
docker compose exec api python -c \
  "import socket; print(socket.create_connection(('postgres', 5432), timeout=2))"
```

这段命令的输入是 Compose 网络中的服务名和端口，Python 先解析 `postgres`，再创建 TCP 连接，成功后打印连接对象并由进程退出关闭连接。成功只证明网络和端口，不证明账号正确、SQL 可执行或业务事务正常；解析失败、连接拒绝和超时分别对应不同排查层。排障要一层层增加验证强度。

## 三个常见误解

### `depends_on` 等于依赖永不出错

它只影响 Compose 的创建/启动顺序。数据库在运行十分钟后重启，API 仍然要正确处理连接中断。连接超时、重连、事务重试属于应用和数据库客户端的职责。

### 健康检查失败会自动修复业务

健康检查主要提供状态信号。是否重启、摘除流量或触发告警，要看运行平台和发布策略。探针本身还应轻量、确定，不要每几秒执行昂贵的完整业务流程。

### 有 Volume 就不需要备份

Volume 解决容器替换，不解决磁盘损坏、误删、错误迁移和跨机器恢复。可靠备份必须明确备份内容、频率、保留时间、校验方式，并在隔离环境恢复验证。

## 从本地 Compose 走向可交付环境

Compose 很适合单机开发、集成测试和小规模服务编排。真正上线前，还要补齐这些能力：

- 镜像使用不可变版本或摘要，不依赖浮动的 `latest`。
- 数据库迁移作为显式步骤运行，避免每个 API 实例同时改表。
- API 与 Worker 设置资源上限、优雅停止和可观测信号。
- 密钥由部署环境注入，不进入镜像、仓库和日志。
- 先启动候选版本，通过健康与业务验证后再切换流量。
- PostgreSQL、Redis 和对象存储分别制定备份与恢复方案。

Compose 能描述“服务怎样组成系统”，不会自动提供跨主机调度、弹性扩缩、零停机切流和数据恢复。是否进入 Kubernetes，要由部署规模、故障边界和团队运维能力决定。

## 可以带到工作的排查清单

1. 用 `docker compose config` 确认变量和最终配置。
2. 用 `ps -a` 区分未创建、已退出、运行中和不健康。
3. 用服务日志确认进程退出原因，不先重启。
4. 在调用方容器内检查 DNS、端口、认证和业务请求。
5. 核对数据目录是否挂到预期卷，确认没有误用 `down -v`。
6. 用真实的低成本请求验证 API，再用测试任务验证 Worker。
7. 更新前记录镜像版本、数据备份和回滚动作。

完成练习后，试着再加一个只读管理工具，但不要立即发布数据库端口。让它加入 Compose 网络，通过服务名访问 PostgreSQL。这个小改动可以检验你是否真正理解了网络、端口与依赖的边界。
