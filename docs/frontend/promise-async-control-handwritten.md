---
title: Promise、并发控制与异步任务编排
description: 从 Promise 状态机推导 then 链、错误传播、组合方法、并发池、取消和超时，而不是只背手写模板。
category: frontend
part: 基础与手写
chapter: 19
tags:
  - JavaScript
  - Promise
  - Async
prerequisites:
  - 事件循环与函数基础
outcomes:
  - 解释 Promise Resolution Procedure
  - 实现有界并发和失败策略
practice:
  type: implementation
  result: 实现 Promise 核心链路与并发池
  verify:
    - thenable、循环引用和空输入有测试
    - 并发上限和错误语义可观察
evidence: public-source
updated: 2026-08-11
---

# Promise、并发控制与异步任务编排

Promise 是 JavaScript 表示一次异步操作最终成功或失败的对象，并用 `then`、`catch` 和组合方法传递结果。它位于发起异步操作的代码与消费结果的代码之间，统一完成状态和错误传播；Promise 本身不限制同时运行多少任务，并发控制与取消需要由应用层另行调度。

Promise 手写题最常见的错误，是只实现 `pending/fulfilled/rejected` 三个状态，却遗漏 `then` 必须返回新 Promise、回调结果要递归解析 thenable、回调异步执行和循环引用拒绝。Promise 的核心不是回调数组，而是值解析协议与错误传播。

## 状态机与不可逆转换

Promise 从 pending 只能转换为 fulfilled 或 rejected，一旦 settled 就不能改变。executor 同步执行，第一次 resolve/reject 生效；executor 抛错等价于 reject。`then` 注册的回调则进入微任务，不会在当前调用栈同步运行。

resolve 接收普通值、Promise 或任意带 `then` 的对象。实现必须安全取得 `then`，防止 getter 抛错；调用 thenable 时只接受第一次回调，防止恶意对象同时 resolve/reject。
## then 为什么返回新 Promise

若 `onFulfilled` 返回值 `x`，新 Promise 要按 Resolution Procedure 处理 x。普通值直接 fulfilled；thenable 要采用其最终状态；抛错变 rejected；若 x 就是新 Promise 自身，必须以 TypeError 拒绝，避免无限递归。

```ts
function resolveValue<T>(promise: Promise<T>, value: unknown, resolve: (value: T) => void, reject: (reason: unknown) => void): void {
  if (promise === value) return reject(new TypeError('promise_cycle'))
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    resolve(value as T)
    return
  }

  let called = false
  try {
    const then = (value as { then?: unknown }).then
    if (typeof then !== 'function') return resolve(value as T)
    then.call(
      value,
      (next: unknown) => {
        if (called) return
        called = true
        resolveValue(promise, next, resolve, reject)
      },
      (reason: unknown) => {
        if (called) return
        called = true
        reject(reason)
      }
    )
  } catch (error) {
    if (!called) reject(error)
  }
}
```

resolveValue 的输入是新 Promise 与回调产物，处理过程先阻止自引用，再读取 then 并用 called 锁定首次结果；普通值输出 fulfilled，异常和拒绝输出 rejected。读取 getter 或调用 then 失败时，错误只在尚未完成采用过程时生效，避免一个 thenable 同时改变两次状态。

这段代码展示协议核心，不是完整 Promise 类。真实实现还需要状态、反应队列、微任务调度、`finally` 与静态组合方法。`called` 同时保护重复回调和 then 调用后抛错的情况。
## 错误怎样沿链传播

`then` 缺少成功回调时透传值，缺少失败回调时继续抛出原因。失败回调返回普通值会把下一环恢复为 fulfilled；再次 throw 才保持 rejected。`finally` 不接收结果，通常保留原状态，除非 cleanup 自身抛错或返回拒绝 Promise。

`async` 函数总返回 Promise，函数内 throw 变成 rejected；`await` 暂停当前 async 函数的后续，不会阻塞线程。恢复代码进入微任务队列，因此它与 `queueMicrotask`、Promise reaction 的顺序需要按注册时机判断。
## 组合方法的失败语义

`Promise.all` 保持输入顺序，任一拒绝即让结果拒绝，但其他异步工作不会自动取消；空输入立即以空数组 fulfilled。`allSettled` 等待全部并保留状态；`race` 采用第一个 settled；`any` 采用第一个 fulfilled，全部拒绝时产生 AggregateError。

选择方法时先问是否需要全部成功、全部结果、首个完成还是首个成功。把 `race` 当超时不会取消原请求，应配合 AbortController 把取消传到真正资源。
## 有界并发不是 Promise.all 分片

批量上传若一次启动全部任务，会打满连接和内存。并发池维护“下一个任务索引、正在执行数量、结果位置和停止策略”。每个 worker 循环领取任务，可自然限制上限并保持结果顺序。

```ts
async function mapLimit<T, R>(items: T[], limit: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('invalid_limit')
  const results = Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      results[index] = await run(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}
```

输入是任务数组和并发上限，输出按原顺序排列。默认失败快返，但已经启动的 worker 不会自动停止；需要严格取消时传入共享 AbortSignal，并让 run 响应取消。若要收集所有错误，应把每个任务转换成显式结果联合，而不是吞掉异常。
## 验证清单

Promise 核心用 Promises/A+ 风格用例验证 thenable、重复回调、getter 抛错、链式采用和循环引用。并发池记录每次开始/结束时 active 数，断言最大值不超过 limit；测试空数组、limit 大于长度、同步抛错和中途取消。

完整的 Promise 模型还要区分 executor 与 `then` 回调时机、resolve 与 fulfill，解释组合方法为何不取消底层任务，以及 async/await 如何建立在 Promise Reaction 之上。
## 从 resolution 到 microtask 的执行轨迹

`resolve(x)` 不一定立刻把 Promise 置为 fulfilled：当 x 是 thenable 时，它进入采用过程，最终状态由 x 决定。Promise reaction 只有在状态 settled 后排入 Job Queue，当前同步栈清空后才执行；reaction 返回值再驱动下一 Promise 的 resolution。这解释了 `then(() => 1).then(...)` 为什么至少跨越两个微任务阶段。

```text
executor sync: resolve(thenable)
读取 then getter（可能抛错）
调用 then(resolveNext, rejectNext)，只接受第一次结果
thenable fulfilled -> enqueue reaction job
reaction return x -> resolvePromise(nextPromise, x)
```

浏览器中 Promise Job 属于 microtask checkpoint；它会在任务结束后运行，长链 microtask 仍可能推迟下一次渲染。并发池若每个任务完成都立即排新任务，要观察微任务堆积、AbortSignal 和页面可见性，不能只测 active 数。
## 取消、超时与失败补偿

超时 Promise 只能让调用方先得到失败，不能自动停止底层 fetch、Worker 或上传。正确协议是创建 AbortController、把 signal 传到真实操作，并在 `finally` 释放定时器。对不支持取消的任务使用 generation/id 丢弃迟到结果；对已经产生外部副作用的写操作使用幂等键和服务端查询状态。
## 官方依据

- [ECMAScript Promise Objects](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects)
- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
