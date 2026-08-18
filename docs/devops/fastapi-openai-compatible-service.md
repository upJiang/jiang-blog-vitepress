---
title: FastAPI 构建 OpenAI 兼容的 LLM 服务
description: 完整实现请求校验、依赖注入、Middleware、模型路由、普通响应、SSE、Token 用量和错误契约。
category: devops
part: 第二部分：AI Backend 基础设施
chapter: 8
tags:
  - FastAPI
  - Pydantic
  - SSE
prerequisites:
  - Python 类型与 asyncio 基础
outcomes:
  - 实现兼容子集的 Chat Completions 接口
  - 处理流式取消、模型选择和稳定错误
practice:
  type: implementation
  result: 完成一个文内可验证的 LLM API
  verify:
    - 普通与流式响应结构明确
    - 兼容子集和官方 API 的差异被声明
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# FastAPI 构建 OpenAI 兼容的 LLM 服务

客户端把 `messages` 写成字符串，服务端在访问 `message.role` 时抛出 500；另一个请求已经收到三个 Token，上游超时后服务又试图返回 JSON 错误。两个故障都来自边界不清：输入没有在进入业务前完成校验，流开始后也没有定义错误如何表达。



## 一个兼容接口需要兼容哪些可观察行为

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Pydantic Model | 把 JSON 映射为有类型的请求对象，并在业务执行前返回字段级校验错误。它不能替代租户权限和模型能力判断。 |
| Dependency Injection | 由 FastAPI 在请求范围内提供认证主体、数据库 session 和模型适配器，使生命周期和测试替换显式化。 |
| Middleware | 包围整个请求的横切边界，适合 request_id、耗时和统一异常记录；不适合承载必须成功的计费事务。 |
| Compatibility Subset | 明确声明支持的字段、响应、流事件和错误结构。路径相同并不意味着完整兼容所有模型、工具和 usage 细节。 |

## 排障时最容易走错的岔路

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 字段错误返回 500 | 路由接收了未经建模的 dict，异常在业务深处才发生 | 让 Pydantic 在入口返回结构化 422 |
| 流中途改 HTTP 504 | 响应头已发送，状态码不能重新选择 | 发送受约束的流内错误并记录终态 |
| 后台任务负责扣费 | 进程退出会丢失任务，且与响应事务脱节 | 使用事务或可靠队列与幂等记录 |
| 客户端断开仍生成 | 异步生成器没有处理取消或适配器忽略 deadline | 确认 CancelledError 传播并回收上游请求 |

::: warning 不要用重启代替诊断
恢复服务和解释故障是两个目标。紧急止损后仍要回到原始日志、指标与状态转换，避免同类问题重复出现。
:::

## 从 HTTP Body 到第一个 SSE 事件

```mermaid
flowchart LR
  S0["解析校验"]
  S1["建立主体"]
  S2["规范化调用"]
  S3["编码响应"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

### 解析校验：FastAPI/Pydantic

解析 Content-Type 与 JSON，验证 model、messages、stream 等字段。

这一动作的可观察结果是 422 字段路径、request_id。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 建立主体：Auth Dependency

解析 API Key，得到 tenant_id、权限和预算，不信任客户端租户字段。

可以从这些位置确认结果：401/403、主体 ID、审计事件。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 规范化调用：Model Adapter

把兼容请求转换为内部结构并应用 deadline、模型路由和取消。

这里不靠猜测，优先读取 selected_deployment、上游 trace。

### 编码响应：Route/StreamingResponse

普通请求返回完整 JSON，流式请求逐事件发送并在终态释放资源。

决定下一步前需要看到 事件序列、finish_reason、usage、CancelledError。

## 实现一个可运行、但明确有限的兼容子集

代码适用于 Python 3.11、FastAPI 和 Pydantic 2。输入是 `model` 与非空 `messages`；Fake Adapter 不调用真实模型，只让协议和错误可在 CPU 本机验证。

```python
from typing import Literal
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)

class ChatRequest(BaseModel):
    model: str = Field(min_length=1)
    messages: list[Message] = Field(min_length=1)
    stream: bool = False

async def current_tenant() -> str:
    return "tenant_demo"  # 教学替身，生产中由 API Key 解析

@app.post("/v1/chat/completions")
async def chat(body: ChatRequest, tenant=Depends(current_tenant)):
    if body.stream:
        raise HTTPException(400, "stream_not_supported_in_demo")
    return {
        "id": "chatcmpl_demo", "model": body.model,
        "choices": [{"message": {"role": "assistant", "content": "hello"}}],
        "usage": {"prompt_tokens": len(body.messages), "completion_tokens": 1},
    }
```

启动 `uvicorn app:app` 后，合法输入返回稳定字段；空 `messages` 或空 content 在业务代码执行前返回 422；`stream=true` 明确返回 400，而不是悄悄忽略。示例没有实现 OpenAI 全部字段、SSE、认证和计费，因此只能用于协议边界教学，不能称为生产兼容服务。

## 依赖注入把请求范围和应用范围分开

认证主体和数据库 transaction 通常属于请求范围：请求结束就释放。HTTP 客户端、连接池和模型适配器则适合在应用 lifespan 创建并复用，关闭时统一清理。若在每次 Depends 调用里重新创建昂贵客户端，延迟和连接数会随请求放大；若把可变用户状态放到全局单例，又会形成跨请求泄露。

测试时可以用 dependency override 替换主体和 Adapter，让 401、403、422、上游超时与成功响应都不依赖真实 API Key 或 GPU。Fake Adapter 证明协议和状态机，不证明真实模型的延迟、Token 计数和显存。

## SSE 一旦写出响应头，错误只能在流里表达

~~~text
data: {"id":"chatcmpl_demo","choices":[{"delta":{"content":"hel"}}]}

data: {"id":"chatcmpl_demo","choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}]}

data: [DONE]

~~~

每个事件由空行分隔，`[DONE]` 是兼容约定而不是 TCP 关闭。生成器中途失败时，服务可以使用自己声明的流内 error 事件并终止，但不能再把已经发送的 200 改成 504。客户端断开会触发异步取消；生成器的 `finally` 应关闭上游响应、释放连接和记录终态。

## Middleware 只处理横切信息

Middleware 可以在最外层生成 request_id、记录总时长、限制 Body 大小并映射未知异常。它不应读取并永久记录完整 Prompt，也不应在响应已经发送后承担可靠扣费。BackgroundTasks 在响应后仍运行于同一应用进程，适合可丢失的轻量通知；必须完成的用量结算和索引任务要写入事务/outbox 或可靠队列。

兼容测试至少要读取完整普通 JSON、完整 SSE 事件序列、未知字段策略、空 messages、未授权模型、客户端取消和上游超时。每个用例不仅断言状态码，还要确认 Adapter 是否被调用、资源是否释放、usage 和错误 code 是否符合声明子集。

## 最后回到适用范围

“OpenAI compatible”必须附带版本与支持矩阵。工具调用、结构化输出、logprobs、usage 在流中的位置都可能因实现而异。Middleware 不应记录完整 Prompt、Authorization 或模型输出；关联问题依赖 request_id，不依赖敏感正文。

HTTP 契约稳定后，请求还会产生短期状态：Session、限流窗口、缓存和任务协调。下一篇解释 Redis 为何能承担这些职责，也为何不能把它们混成同一种 key。
