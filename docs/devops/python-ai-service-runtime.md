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
updated: 2026-08-11
---

# Python AI 服务运行时：并发不是把所有函数都改成 async

一个接口同时发出 50 个模型请求时吞吐正常，加入 PDF 解析后整个服务开始卡顿。原因可能不是模型更慢，而是 CPU 密集解析直接运行在事件循环线程里，阻止它继续接收网络事件。AI Backend 常同时拥有网络 I/O、轻量 CPU 处理和重型解析，必须为三类工作选择不同执行位置。

本篇从类型契约开始，建立 asyncio、线程和进程的职责。输入是一批有 Deadline 的任务；运行时限制并发、传播取消、隔离阻塞工作；输出是顺序明确的成功或失败结果。

## typing 先规定数据能怎样流动

类型提示不会自动验证网络输入，也不会改变运行时调度。它的价值是把接口所有权写清：请求包含哪些字段，模型适配器返回什么，错误是否进入正常返回，调用方能否取消。

`Protocol` 适合描述模型客户端行为，`dataclass` 或 Pydantic 模型适合承载结构化状态，`Literal` 和 `Enum` 适合限制有限终态。外部 JSON 仍需运行时校验；通过校验后，内部函数再依赖稳定类型。

## 三种执行模型解决不同问题

| 模型 | 适合任务 | 主要限制 | 典型错误 |
| --- | --- | --- | --- |
| asyncio | HTTP、数据库、Redis 等可等待 I/O | 事件循环不能执行长时间阻塞代码 | async 函数内部调用同步解析器 |
| 线程 | 没有异步接口的阻塞 I/O、会释放 GIL 的库 | 共享内存、取消能力有限 | 无界创建线程、在线程里修改共享状态 |
| 多进程 | 纯 Python CPU 密集解析与计算 | 序列化、启动和进程间传输有成本 | 把每个小任务都提交进程池 |

asyncio 的并发来自任务在 `await` 时让出执行权，不等于多个 CPU 核心同时运行 Python 字节码。线程可以让阻塞调用不占事件循环，但并不保证 CPU 密集代码线性加速。多进程提供独立解释器和地址空间，更适合足够大的 CPU 工作单元。

## 一个有边界的异步调度器

下面程序不依赖外部 API。输入是一组字符串，模拟不同耗时的模型调用；目标是同时最多运行两个请求，并把每个输入映射为结构化结果。代码使用 `TaskGroup` 管理任务所有权，使用 `Semaphore` 限制下游并发。

```python
import asyncio
from dataclasses import dataclass
from typing import Protocol

class TextModel(Protocol):
    async def complete(self, prompt: str) -> str: ...

@dataclass(frozen=True)
class CompletionResult:
    index: int
    text: str | None
    error: str | None

class DemoModel:
    async def complete(self, prompt: str) -> str:
        # 网络客户端在等待响应时应让出事件循环。
        await asyncio.sleep(0.02)
        if prompt == "fail":
            raise RuntimeError("upstream unavailable")
        return prompt.upper()

async def run_bounded(
    prompts: list[str],
    model: TextModel,
    concurrency: int,
) -> list[CompletionResult]:
    semaphore = asyncio.Semaphore(concurrency)
    results: list[CompletionResult | None] = [None] * len(prompts)

    async def execute(index: int, prompt: str) -> None:
        async with semaphore:
            try:
                # 单任务超时必须小于外层请求的剩余 Deadline。
                text = await asyncio.wait_for(model.complete(prompt), timeout=1)
                results[index] = CompletionResult(index, text, None)
            except Exception as exc:
                results[index] = CompletionResult(index, None, type(exc).__name__)

    async with asyncio.TaskGroup() as group:
        for index, prompt in enumerate(prompts):
            group.create_task(execute(index, prompt))

    # 所有任务已结束，因此槽位不再包含 None。
    return [result for result in results if result is not None]

async def main() -> None:
    results = await run_bounded(["one", "fail", "three"], DemoModel(), 2)
    print(results)

if __name__ == "__main__":
    asyncio.run(main())
```

`run_bounded` 先按输入长度分配结果槽，使并发完成顺序不会改变输出顺序。每个 `execute` 只有进入 Semaphore 后才占用下游配额，`wait_for` 给单次调用设置上限。异常被转换为结构化结果，因此某个上游失败不会取消其他独立任务；如果业务要求任一失败即整体失败，则应让异常离开子任务，由 `TaskGroup` 取消同组任务。

外层取消与普通异常不同。收到 `CancelledError` 时通常应清理资源后继续抛出，不能吞掉并返回伪成功。数据库事务、流式连接和模型请求也要接收同一取消信号，否则 HTTP 已结束，后台仍在运行。

## 阻塞代码怎样离开事件循环

短暂、主要等待文件或兼容库的同步函数可以通过 `asyncio.to_thread` 调用。它把函数交给线程池，事件循环继续处理其他连接。线程中的函数不会因为协程取消而自动停止，因此要为库本身设置超时，并避免不可逆副作用。

CPU 密集解析可放到长期复用的 `ProcessPoolExecutor` 或独立 Worker。传入进程池的数据必须可序列化，结果也要控制大小。大型文件更适合传对象存储键，由 Worker 自己读取，而不是把几十 MB 二进制通过进程队列复制多次。

## Deadline、超时和取消不是同一个状态

Deadline 是绝对结束时间，跨服务传播后可以计算剩余预算。超时表示某一步超过分配预算；取消表示调用方主动终止；失败表示执行完成但未得到有效结果。三者可能触发不同重试、退款和审计逻辑，不能统一映射为 500。

重试只能发生在剩余预算允许、操作幂等且错误可恢复时。模型请求已经到达供应商但连接丢失，结果可能未知；直接重试可能重复计费。运行时应给每个尝试记录 request ID、开始时间、终态和用量归属。

## 运行时检查清单

- 每个并发入口有 Semaphore、连接池或队列上限，而不是无限 `gather`。
- 同步 I/O 不在事件循环执行，CPU 密集任务不靠增加 async 关键字解决。
- 任务由请求、TaskGroup、Worker 或调度器明确拥有，终态后不会遗留后台协程。
- Deadline 向下传播，取消保持取消语义，错误进入稳定联合类型。
- 观测同时记录排队时间、执行时间、并发槽和终态，避免只看总延迟。

掌握这些边界后，FastAPI 只是把 HTTP 生命周期接到这套运行时上，而不是替你自动解决并发、取消与资源所有权。
