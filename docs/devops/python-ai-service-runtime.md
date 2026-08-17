---
title: Python AI 服务运行时：typing、asyncio、线程与多进程
description: 用并发模型请求、分词和文档解析三类任务解释类型边界、事件循环、取消、线程池与进程池。
category: devops
part: 第二部分：AI Backend 基础设施
chapter: 7
tags:
  - Python
  - asyncio
  - Concurrency
prerequisites:
  - 会编写 Python 函数
outcomes:
  - 区分异步并发、线程和多进程
  - 传播超时、取消和结构化结果
practice:
  type: implementation
  result: 实现一个有界并发调度器
  verify:
    - 阻塞任务不占住事件循环
    - 失败和取消不会遗留后台任务
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# Python AI 服务运行时：typing、asyncio、线程与多进程

一个 Python 模型 API 在单请求时很快，两个并发请求却互相等待。原因可能不是模型变慢，而是事件循环被同步分词阻塞，或者多进程各自加载了一份权重。选择并发模型前，要先区分等待 I/O、消耗 CPU 和占用 GPU 的工作。

## asyncio 只擅长把等待交错起来

async def 让协程在 await I/O 时把执行权交给事件循环。它不会让 CPU 密集的分词、压缩或 Python 循环自动并行，也不会把一个同步 SDK 变成异步。阻塞事件循环时，健康检查、SSE 心跳和其他请求都会一起延迟。

```python
import asyncio

async def fetch_and_stream(client, prompt: str):
    response = await client.generate(prompt)
    async for token in response:
        yield token

async def main():
    await asyncio.gather(
        consume(fetch_and_stream(client, "a")),
        consume(fetch_and_stream(client, "b")),
    )
```

输入是两个独立 Prompt，执行过程是协程在网络等待处交错，输出是两条 Token 流。若 client.generate 内部执行同步 CPU 工作，gather 仍会被它阻塞，需要线程池或进程池，并为任务设置上限。

## 线程和多进程的代价不一样

| 工作 | 合适的机制 | 主要代价 |
| --- | --- | --- |
| 网络 I/O、连接等待 | asyncio 协程 | 事件循环不能被同步代码堵住 |
| 短 CPU 解析、压缩 | 受控线程池 | 共享状态、上下文切换 |
| 长 CPU 计算 | 多进程或独立 Worker | 内存复制、进程生命周期 |
| GPU 推理 | Serving 引擎的批处理 | 显存、队列和模型实例数 |

多进程能绕开 Python GIL 的部分限制，但每个进程可能独立加载 tokenizer、权重和缓存。GPU 服务不能只看 CPU 核数决定 worker 数量。

## typing 是运行边界的说明书

类型标注不能替你验证请求，却能把“可能为空”“必须带 tenant_id”“流式事件有哪些 kind”写进接口。对 AI 服务尤其重要，因为字符串和字典很容易在层间丢失状态所有权。运行时仍需要 Pydantic 或显式检查，类型检查通过不等于输入可信。

## 取消必须传到最深处

客户端断开后，API 层收到取消，应该停止等待模型、释放队列槽和关闭上游连接。只取消最外层协程而不通知同步线程或 GPU 请求，会让用户看不到结果，但资源仍被占用。给每个请求记录 deadline、取消原因和清理完成时间，才能判断“取消成功”还是“超时后遗留”。

## 本地验证看什么

```bash
python -m asyncio your_probe.py
python -X dev your_service.py
ps -o pid,ppid,pcpu,pmem,cmd -C python
```

这些命令只能帮助观察事件循环警告、进程数量和资源趋势。真实吞吐要在固定请求分布、模型版本和硬件上测量，不能从开发机的单次结果推导生产容量。下一篇把这些运行时边界放进 FastAPI 和 OpenAI 兼容协议。

## 不要把 ContextVar 当成持久状态

request_id、tenant_id 等短生命周期上下文可以用 ContextVar 在协程链路中传播，但线程池、子进程、后台任务和消息队列不会天然继承它。真正需要恢复和审计的字段，必须显式写入任务消息、数据库或结构化事件。

同样，asyncio.CancelledError 不是普通业务错误。捕获它做清理后应继续传播取消语义，不能吞掉后把请求标成成功。连接池、流式生成器和临时文件都应在 finally 中关闭，使取消成为可验证的资源释放过程。

## 进程模型还决定了连接的归属

Web 服务器创建多个 worker 时，每个进程都有自己的事件循环、连接池和内存。启动前初始化的全局客户端在 fork 后可能带着不安全的连接状态，模型对象也可能被重复加载。初始化时机要按运行模型设计，而不是只看代码能否 import。

对数据库、HTTP 和 Redis 客户端，通常让每个 worker 在自身生命周期内创建和关闭。对 GPU 模型，先明确是否只允许一个 Serving 进程拥有设备，再让 API worker 通过网络调用它。这样避免多个 Python worker 无意竞争同一张卡。
