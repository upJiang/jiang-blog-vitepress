---
title: 本地 Compose 部署：FastAPI、PostgreSQL/pgvector、Redis、Celery、MinIO 与 SSE
description: 把此前的模型、图、检索和 Runtime 适配器连接到本地基础设施，解释容器、网络、健康检查、迁移和清理。
category: ai-agent
part: 可信运行与完整系统
chapter: 69
tags:
  - Docker Compose
  - FastAPI
  - pgvector
  - Celery
  - SSE
prerequisites:
  - 理解完整 Agent Runtime
  - 会使用 Docker 和环境变量
outcomes:
  - 能启动并检查本地 Agent 基础设施
  - 能沿 API、队列、数据库和事件定位启动失败
practice:
  type: implementation
  result: 得到可校验的 compose.yaml 和端到端健康检查
  verify:
    - docker compose config 通过
    - 服务健康、任务执行和 SSE 可观察
evidence: official-guided-operation
updated: 2026-08-12
lastUpdated: false
---
# 本地 Compose 部署：FastAPI、PostgreSQL/pgvector、Redis、Celery、MinIO 与 SSE

这篇搭建的是一套单机多容器的 Agent 验证环境。Docker Compose 负责声明 API、数据库、Broker/Worker、对象存储和网络关系，让此前的 Runtime 契约能跨进程验证；它不替应用实现权限、幂等、Lease、终态或引用。

[Agent Trace](/docs/ai-agent/agent-trace-observability) 已经把模型、检索、工具、队列和验证阶段串到同一条运行记录；此前的模型网关、LangGraph、Retriever、Turn、Worker 和事件也都有稳定接口。如果它们仍然只存在于一个 Python 进程，Worker 重启无法证明恢复，API 与后台任务也无法验证所有权。现在把同一个 `agent-demo` 连接到本地基础设施：

```text
POST /turns
→ PostgreSQL 创建 Turn 与 Outbox
→ Celery Worker 领取任务
→ LangGraph 调用模型与 pgvector 检索
→ 事件写入 PostgreSQL，Redis 发送唤醒
→ GET /turns/{id}/events 通过 SSE 展示
```

Compose 不是企业 Runtime 本身。它只提供可重复的本地拓扑，让进程、网络、健康检查、持久化和恢复能够实际验证。权限、幂等、Lease、终态和引用仍由应用代码负责。

## 六个服务各自保存什么

```mermaid
flowchart LR
  U[浏览器或测试客户端] --> A[FastAPI<br/>创建 Turn / SSE]
  A --> P[(PostgreSQL + pgvector<br/>事实、事件、向量)]
  A --> R[(Redis<br/>Broker 与轻量唤醒)]
  R --> W[Celery Worker<br/>执行 LangGraph]
  W --> P
  W --> M[(MinIO<br/>原文件与解析制品)]
  W --> G[模型 API<br/>生成与 Embedding]
  P --> A
  R -.唤醒.-> A
```

PostgreSQL 是 Turn、事件、Release、Evidence 与向量的事实存储；Redis 在本地同时承担 Celery Broker 和 SSE 轻量唤醒，但不能成为唯一终态；Worker 执行耗时图；MinIO 保存原文件和可重建制品；FastAPI 用短事务提交请求并提供状态与事件；模型服务仍是外部依赖。

开发环境可以复用一个 Redis 实例，但 Broker key、缓存和 Pub/Sub 要使用独立命名空间。生产环境是否拆实例取决于故障隔离和容量，不能从这份本地 Compose 直接得出结论。

## 目录和配置边界

此时 `agent-demo` 增加：

```text
agent-demo/
  app/
    api.py
    runtime.py
    worker.py
    db.py
  migrations/
  tests/
  compose.yaml
  Dockerfile
  .env.example
```

`.env.example` 只保存变量名和安全占位：数据库 DSN、Redis URL、MinIO 端点、Bucket、模型名。真实 API Key 和对象存储密码放在本地 `.env` 或 Secret 中，不能提交。Compose 中服务间地址使用服务名，例如 `postgres:5432`，容器里的 `localhost` 只指向容器自己。

## 一份可解释的 Compose 拓扑

下面配置假设项目已有一个会启动 FastAPI 或 Celery 的 `Dockerfile`。输入是本地 Docker、`.env` 和应用镜像构建上下文；目标是启动依赖与两个应用进程。示例使用开发凭证，只能用于本机隔离环境。

```yaml
name: agent-demo

services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      # 开发凭证只服务本地网络；生产必须由 Secret 注入并限制网络。
      POSTGRES_DB: agent_demo
      POSTGRES_USER: agent
      POSTGRES_PASSWORD: local_only_password
    healthcheck:
      # pg_isready 只证明数据库接受连接，迁移状态由 API 启动检查负责。
      test: ["CMD-SHELL", "pg_isready -U agent -d agent_demo"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7.4-alpine
    command: ["redis-server", "--appendonly", "yes"]
    healthcheck:
      # redis-cli ping 检查进程响应，不代表 Celery 队列已经有 Worker 消费。
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio:RELEASE.2025-07-23T15-54-02Z
    command: ["server", "/data", "--console-address", ":9001"]
    environment:
      MINIO_ROOT_USER: local-agent
      MINIO_ROOT_PASSWORD: local_only_minio_password
    healthcheck:
      # MinIO 自带探针验证服务可用，Bucket 是否存在由初始化步骤单独确认。
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 3s
      retries: 20
    volumes:
      - minio-data:/data

  api:
    build: .
    command: ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
    env_file: .env
    environment:
      DATABASE_URL: postgresql+psycopg://agent:local_only_password@postgres:5432/agent_demo
      CELERY_BROKER_URL: redis://redis:6379/0
      EVENT_WAKEUP_URL: redis://redis:6379/1
      MINIO_ENDPOINT: http://minio:9000
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      # 应用探针还要检查迁移版本和必要配置，不能只返回固定 200。
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready')"]
      interval: 5s
      timeout: 3s
      retries: 20

  worker:
    build: .
    command: ["celery", "-A", "app.worker:celery_app", "worker", "--loglevel=INFO", "--concurrency=2"]
    env_file: .env
    environment:
      DATABASE_URL: postgresql+psycopg://agent:local_only_password@postgres:5432/agent_demo
      CELERY_BROKER_URL: redis://redis:6379/0
      EVENT_WAKEUP_URL: redis://redis:6379/1
      MINIO_ENDPOINT: http://minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    stop_grace_period: 30s

volumes:
  postgres-data:
  redis-data:
  minio-data:
```

Compose 先启动三个有状态依赖，健康后再启动 API 和 Worker。`depends_on` 只管理容器启动条件，不能证明数据库迁移完成、Bucket 已创建或 Worker 已注册正确队列。API 就绪探针应检查迁移版本和配置；Worker 则需要通过 Celery inspect、测试任务或业务心跳验证。

端口只把 API 绑定到本机回环地址。PostgreSQL、Redis 和 MinIO 不发布到宿主公网，应用通过 Compose 网络服务名访问。生产凭证、备份、TLS 和资源限制不在这份开发配置中，不能直接拿它上线。

## 启动前先验证配置，不要直接拉起

```bash
# 展开变量和合并配置；失败时不会创建容器。
docker compose config --quiet

# 先构建应用镜像，再启动；--wait 等待带 healthcheck 的服务就绪。
docker compose build api worker
docker compose up -d --wait

# 查看容器状态和最近日志，不用反复重启掩盖根因。
docker compose ps
docker compose logs --tail=100 api worker
```

`config --quiet` 能发现 YAML、缺失变量和依赖引用错误。构建与启动分开后，依赖下载失败不会留下部分新容器。`up --wait` 依赖镜像和 Compose 版本支持；如果环境不支持，就用 `ps` 与各探针逐个检查。

## 数据库迁移和扩展必须显式执行

启动业务前运行迁移，迁移中显式创建 `vector` 扩展、Turn/事件表和索引。不要让每个 API/Worker 启动时并发 `CREATE TABLE IF NOT EXISTS`，这会绕过迁移版本和回滚审查。

```bash
# 由单独一次命令执行迁移；成功后再确认当前版本。
docker compose run --rm api alembic upgrade head
docker compose run --rm api alembic current

# 只读确认 pgvector 扩展存在。
docker compose exec postgres \
  psql -U agent -d agent_demo -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

第一条在临时 API 容器中执行迁移；第二条输出当前 revision；第三条查询扩展版本。若迁移失败，修复迁移并重新在空数据库演练，不要手工改表后把版本标成成功。

## FastAPI 提交请求时只做短事务

`POST /turns` 不应在 HTTP Handler 内等待完整 Agent。它完成身份验证、幂等查询、版本快照、Turn 与 Outbox 写入，然后提交事务。后台派发器或事务提交后的安全路径将任务送到 Celery。

```python
from fastapi import FastAPI, Header, status
from pydantic import BaseModel, Field

from app.runtime import TurnService

app = FastAPI()
turn_service = TurnService()

class CreateTurnRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

@app.post("/turns", status_code=status.HTTP_202_ACCEPTED)
def create_turn(payload: CreateTurnRequest, idempotency_key: str = Header()) -> dict[str, str]:
    # 身份与 Scope 应来自认证依赖；示例省略认证实现，但不从 payload 接收权限字段。
    turn = turn_service.create_and_dispatch(
        question=payload.question,
        idempotency_key=idempotency_key,
    )
    # API 返回稳定 Turn ID，客户端通过状态或 SSE 继续观察。
    return {"turn_id": turn.turn_id, "status": turn.status}
```

Pydantic 只验证用户问题与幂等 Header 的请求形状；可信身份应由认证依赖注入。`TurnService` 内部使用数据库唯一约束去重，不能只靠 Redis 锁。返回 202 表示任务已接受，不表示回答完成。

## Redis 唤醒与数据库事件谁是真相

Worker 产生事件时，先在 PostgreSQL 事务中写入 `(turn_id, seq)` 唯一事件和状态，再向 Redis 发布轻量唤醒。SSE API 收到唤醒后仍按数据库游标读取。

如果 Redis 短暂不可用，事件已经保存，SSE 可以轮询数据库；如果先 publish 后写库，客户端会被唤醒却查不到事件。Celery Broker 的 ACK 也不能替代业务终态：消息已确认不代表 `turn.completed` 已原子提交。

## 跑一条真正的端到端请求

有模型 Key 时，在 `.env` 注入 `OPENAI_API_KEY`。没有 Key 时可以验证基础设施、Fake Adapter 和错误路径，但最终端到端模型运行必须明确标记未执行。

```bash
# 创建 Turn；幂等键用于重复提交返回同一执行单元。
curl -sS -X POST http://127.0.0.1:8000/turns \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-turn-001' \
  -d '{"question":"发布后怎样确认服务已经切换成功？"}'

# 把返回的匿名 Turn ID 放入路径，观察事件序号直到唯一终态。
curl -N -H 'Last-Event-ID: 0' \
  http://127.0.0.1:8000/turns/turn_demo/events
```

第一条应返回 202 和 Turn ID。重复相同幂等键不应创建第二个 Turn。第二条应依次看到创建、检索、验证和 completed/no_evidence/failed 等事件；事件序号单调递增，断开后用最后 ID 重连只补缺失事件。

把 `turn_demo` 当占位符，实际使用第一条返回值。文章不能给出虚构的模型回答或延迟；验收记录只保存真实运行看到的状态、事件、引用和 usage。

## 做一次 Worker 中断恢复

当测试 Turn 进入 running 后，停止 Worker，再重新启动：

```bash
# 停止执行进程但保留数据库、Redis 和对象存储。
docker compose stop worker

# 检查 Turn 仍在数据库且 Lease 最终过期，再启动 Worker。
docker compose start worker
docker compose logs --tail=100 worker
```

正确结果不是“任务一定从头再跑”。恢复扫描器要检查终态、Lease、Deadline、取消和 Checkpoint；新 Worker 获得所有权后从安全位置继续。模型调用等外部动作要有 attempt 和幂等记录，失去 Lease 的旧 Worker 不能提交迟到终态。

Compose 只让故障可复现。若应用尚未实现 Lease/Checkpoint，这个实验应失败并暴露缺口，不能用重启后碰巧回答成功冒充恢复语义。

## 清理：停容器与删数据是两种操作

```bash
# 停止并删除本次 Compose 容器与网络，命名卷仍保留数据。
docker compose down

# 只有确认本地演示数据无需保留时，才显式删除本项目命名卷。
docker compose down --volumes
```

第一条可恢复：下次启动继续使用命名卷。第二条会删除 PostgreSQL、Redis 和 MinIO 演示数据，属于破坏性清理；执行前用 `docker compose ls` 和 `docker volume ls` 确认项目名与目标卷。不要使用会波及其他项目的全局 prune 命令。


**为什么不用一个容器运行 API 和 Worker？**

两者生命周期和扩缩容不同。API 处理短请求与 SSE，Worker 处理长任务；分开后可以独立重启、限制并发和观察故障。共享镜像仍可复用代码，容器命令决定进程角色。

故障边界也不同：API 重启不应终止已提交 Turn，Worker 崩溃则要依靠 ACK、Lease 和 Checkpoint 恢复。若两者塞进一个进程，健康检查很难区分“HTTP 可用但任务不消费”和“Worker 正常但长连接拥塞”，资源限制也会互相影响。

**`depends_on: service_healthy` 是否保证应用已经可用？**

只保证声明的依赖探针通过。数据库接受连接不代表迁移完成，MinIO 存活不代表 Bucket 已创建，Redis PING 不代表 Worker 正确消费。应用 Readiness 要检查自身必要条件，端到端测试再验证整条链。

因此就绪检查至少分两层：服务层检查连接、迁移和配置版本；业务层提交一个低成本 Turn，观察它是否产生递增事件并到达唯一终态。前一层失败时不用发业务请求，后一层失败则沿 API、Outbox、Broker、Worker 和数据库事件逐段定位。

**Redis 同时做 Broker 和 SSE 通知是否可靠？**

适合本地开发，但职责仍要分命名空间。Redis Pub/Sub 只做低延迟唤醒，事实事件写 PostgreSQL；Broker 负责任务投递，业务幂等和终态也在数据库。生产是否拆实例取决于容量和故障隔离。

验证方法是短暂停止 Redis 通知或断开一个 SSE 连接：数据库事件仍应持续增加，重连后能够按序号补发。若 Redis 故障导致终态丢失，说明应用把缓存或 Pub/Sub 错当成事实存储；若只导致页面更新变慢，则降级边界符合设计。

**为什么 MinIO 不直接保存解析后的所有业务状态？**

对象存储适合原文件、大制品和按对象读取；Turn、Release、Block 元数据、ACL 和事件需要事务、查询与约束，更适合数据库。MinIO 对象通过稳定 ID 和校验和与数据库记录关联。

对账时从数据库对象记录读取期望 key 与 SHA-256，再到 MinIO 检查对象是否存在、大小和校验和是否匹配。孤立对象进入延迟清理队列，数据库引用存在但对象缺失则关闭候选 Release，不能让解析器把缺文件解释成空文档。

**本地没有 OpenAI Key，还能完成哪些验证？**

可以验证 Compose、迁移、健康检查、幂等提交、队列、Fake Model、事件、取消和恢复控制。不能验证真实模型认证、usage、流式供应商事件和回答质量。报告必须把两类结果分开。

无 Key 的结果应写成“基础设施与确定性 Runtime 已通过，在线模型 Gate 未执行”。等有 Key 后再用短输入检查真实 Response ID、usage 和流式完成事件，并确认计量写回同一 Turn；不要拿 Fake 的固定 Token 数冒充供应商账单。

**为什么 API 返回 202，而不是等回答后返回 200？**

长任务跨模型、检索和验证，HTTP 连接可能先断开。202 表示已创建稳定 Turn；客户端通过 SSE 或状态接口继续观察。很短的直接回答可以做同步优化，但仍应复用同一终态和事件语义。

**如何确认请求真的被 Worker 消费，而不是只进入 Redis？**

同时查看数据库 Task/Turn 状态、Worker 日志或心跳、事件序号和 Celery 队列。只有 Broker 队列长度下降不足以证明成功，消息也可能被 ACK 后业务提交失败。

最有用的证据是同一个 `turn_id`：提交后应看到任务进入 queued，Worker 获得 attempt/Lease，事件序号递增，最后由条件更新写入终态。若队列已经清空但状态停在 queued，检查 ACK 时机、Worker 异常和派发补偿，而不是直接重发用户请求。

**`docker compose down --volumes` 为什么要单独强调？**

它会删除本项目命名卷中的数据库、Redis 和对象存储数据。普通 `down` 只删除容器与网络，数据仍可恢复。清理前必须确认项目名和卷，避免把其他本地环境的数据当演示数据删除。
