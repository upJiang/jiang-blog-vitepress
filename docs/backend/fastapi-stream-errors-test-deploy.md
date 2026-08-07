---
title: "FastAPI 流式响应、错误契约、测试与部署"
description: "从 StreamingResponse 进入客户端断开、事件格式、错误映射、依赖替换测试和 ASGI 部署。"
category: backend
part: "第三部分：Python / FastAPI"
chapter: 16
tags: ["FastAPI", "Streaming", "Testing"]
prerequisites: ["读过第 8、13-15 章"]
outcomes: ["实现可取消流式接口", "建立测试金字塔"]
practice:
  type: implementation
  result: "完成 Python 服务发布 Runbook"
  verify: ["断开连接触发取消", "错误响应与 OpenAPI 一致"]
evidence: anonymized-practice
updated: 2026-08-06
---
# FastAPI 流式响应、错误契约、测试与部署

Python 项目最后一章把长任务结果送回客户端。普通 JSON 接口可以在执行完后选择状态码；StreamingResponse 一旦发送响应头，后续错误只能写进流内协议。因此，流式接口先定义事件和终态，再写生成器。

## 两种流式场景

第一种是在线模型或查询边生成边返回，连接断开时通常取消上游以节省成本。第二种是后台任务事件流，断开后任务继续，客户端重连补发。

本文实现第二种 SSE。在线流的取消传播可以复用相同 Context/AnyIO 取消原则，但持久事件模型不同。

## 事件协议

```text
id: 12
event: progress
data: {"taskId":"demo","percent":60}

```

事件类型、Data Schema、序号和终态写入 API 文档。流内错误示例：

```text
event: failed
data: {"code":"task_failed","requestId":"r-demo"}

```

失败事件的输入是服务端捕获并脱敏后的业务错误，输出只保留稳定错误码和请求 ID，不返回堆栈。不能在已经返回 200 后再试图改成 500；客户端以唯一终态事件判断业务结果。

## FastAPI StreamingResponse

```python
from collections.abc import AsyncIterator
from fastapi import Request
from fastapi.responses import StreamingResponse

async def event_stream(request: Request, task_id: str, after: int) -> AsyncIterator[str]:
    cursor = after
    while True:
        if await request.is_disconnected():
            return
        events = await event_service.list_after(task_id, cursor)
        for event in events:
            cursor = event.id
            yield encode_sse(event)
        if events and events[-1].terminal:
            return
        await event_service.wait_for_change(task_id, cursor, timeout=15)

@router.get('/tasks/{task_id}/events')
async def stream_task(request: Request, task_id: str, after: int = 0):
    await task_service.require_visible(task_id, request.state.actor)
    return StreamingResponse(
        event_stream(request, task_id, after),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )
```

生成器检查断开；按游标从数据库读取；终态后退出；`wait_for_change` 只负责等待通知，超时后继续查数据库。真实实现还要在每次读取验证权限或策略版本。

`request.is_disconnected()` 是协作检查，底层调用也要可取消。不要吞掉 `CancelledError` 后继续运行无限循环。

## 错误映射集中在协议层

应用服务抛可判断错误，例如 `TaskNotFound`、`ScopeDenied`、`VersionConflict`、`DependencyUnavailable`。FastAPI Exception Handler 映射成 Problem Details。

Pydantic 请求校验、认证错误和应用错误都使用统一外壳，但保留不同 `code`。日志记录内部 cause 与 Trace，响应不返回 SQL、文件路径和堆栈。

流开始前的错误正常使用 401/403/404/503；流开始后的错误保存业务事件。避免一个错误既写 HTTP 又重复写终态事件。

## 测试依赖替换和真实边界

### 单元测试

直接调用应用服务，使用 Fake Repository/UoW/Queue，验证事务顺序、错误和幂等。

### API 测试

FastAPI 的 `dependency_overrides` 替换认证和服务，使用 TestClient/AsyncClient 验证路由、Schema 和错误映射。测试结束清除 overrides，防止用例串扰。

### 数据库与 Redis 集成

使用隔离 PostgreSQL，跑真实迁移；验证事务、锁、事件序号和缓存失效。不要把生产数据库 URL 带入测试默认值。

### 流式集成

启动真实 ASGI Server，因为内存测试客户端可能缓冲完整响应。连接后读取两条事件、断开、追加事件、带游标重连，确认无重复。

### Worker 集成

Celery eager 模式适合部分逻辑测试，但不能证明 Broker ACK、重投和 Worker 生命周期。关键用例启动真实测试 Broker 与 Worker。

## ASGI 进程模型

Uvicorn 运行 ASGI 应用。开发环境可使用 reload；生产使用受控 Worker 数量或进程管理器。每个进程有独立内存，不能用进程内字典保存共享任务状态或全局连接列表。

Worker 数量由 CPU、I/O、数据库连接和内存共同决定。四个进程各建 20 个连接就是 80 个连接，还要给 Celery、迁移和管理任务留预算。

阻塞库不能直接在 async 路径运行。使用线程池隔离短阻塞调用，CPU 密集或长任务交给进程/Worker。线程池也有上限，不能把阻塞隐藏成“异步”。

## 健康检查

- `/health/live`：事件循环可响应；
- `/health/ready`：关键配置有效、数据库可短时获得连接；
- 迁移由独立一次性任务执行，不让每个 API Worker 并发改 Schema；
- 模型、OCR 等慢依赖不放进 liveness。

Readiness 结果短缓存，避免健康探针本身打满数据库。失败返回结构化摘要，不暴露连接信息。

## 优雅停止

接收 SIGTERM 后，服务停止接新连接，SSE 发送可识别重连提示或直接关闭，等待短请求完成，关闭数据库 Engine、Redis 和遥测 Exporter。

后台 Worker 独立排空：停止取新任务，等待当前 Attempt 到安全节点，无法完成则让 Broker 重投。API 进程和 Worker 不应共用一个容器进程管理生命周期。

## 发布 Runbook

1. 锁定 Python 与依赖；
2. 运行 ruff、mypy、pytest；
3. 在隔离库运行迁移和回退/恢复检查；
4. 构建不可变镜像和 SBOM；
5. 候选启动并检查 live/ready；
6. 验证创建、查询、错误契约和 SSE 重放；
7. 发送 SIGTERM 验证排空；
8. 切流后观察错误、连接池、SSE 重连和 Worker 队列；
9. 异常只切回旧应用，数据库迁移保持兼容；
10. 稳定后再清理过期字段与制品。

## Python 服务验收表

- DTO 与领域对象分离；
- 应用服务拥有事务；
- AsyncSession 不跨并发共享；
- 阻塞和 CPU 工作被隔离；
- SSE 有事件 ID、终态和断线恢复；
- 流前/流后错误语义分开；
- 单元、API、数据库、流式和 Worker 测试分层；
- 迁移只有一个执行者；
- live/ready 职责不同；
- SIGTERM 与连接/任务排空已验证。

下一章进入 Go。Go 项目强调显式依赖、Context 传播和可判断错误，不会把 Python 的依赖注入照搬一遍。

## 参考资料

- [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [FastAPI Testing Dependencies](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
- [Uvicorn Deployment](https://www.uvicorn.org/deployment/)
- [Starlette Applications and Lifespan](https://www.starlette.io/lifespan/)
