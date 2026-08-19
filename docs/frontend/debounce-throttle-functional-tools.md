---
title: 防抖、节流、柯里化与函数组合
description: 从事件频率和业务语义选择防抖或节流，并实现 leading、trailing、cancel、flush、this 与参数透传。
category: frontend
part: 基础与手写
chapter: 20
tags:
  - JavaScript
  - Debounce
  - Throttle
prerequisites:
  - 闭包、this 与定时器
outcomes:
  - 推导防抖节流状态机
  - 组合可取消的函数工具
practice:
  type: implementation
  result: 实现并用假时钟测试函数工具
  verify:
    - 边界时刻只触发预期次数
    - 取消后不保留定时器和闭包状态
evidence: public-source
updated: 2026-08-11
---

# 防抖、节流、柯里化与函数组合

防抖和节流都包装高频函数调用：防抖等待一段安静时间再执行，节流限制每个时间窗口的执行次数。柯里化把多参数函数拆成连续的一元调用，函数组合则把一个函数的输出接到下一个函数的输入。前两者位于事件与副作用之间，用来控制触发时机；后两者位于函数组织层，用来固定参数或连接数据变换，解决的不是同一类问题。

输入联想希望用户停顿后查询，滚动进度希望持续更新但限制频率。前者需要防抖，后者需要节流。两者都用定时器不代表语义相同：防抖把连续调用折叠成一轮，节流保证时间窗口内最多执行一次并决定是否补尾调用。

## 防抖状态机

状态包括 timer、最近参数、最近 this、是否已有待执行调用。每次调用重置等待时间；leading 决定窗口开始是否执行，trailing 决定安静期结束是否执行。`cancel` 清空资源，`flush` 立即提交待执行尾调用。

```ts
function debounce<TArgs extends unknown[]>(fn: (...args: TArgs) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let latestArgs: TArgs | undefined
  let latestThis: unknown

  function invoke() {
    if (!latestArgs) return
    fn.apply(latestThis, latestArgs)
    latestArgs = undefined
    latestThis = undefined
  }

  function wrapped(this: unknown, ...args: TArgs) {
    latestArgs = args
    latestThis = this
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      invoke()
    }, wait)
  }

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    latestArgs = undefined
    latestThis = undefined
  }
  wrapped.flush = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = undefined
    invoke()
  }
  return wrapped
}
```

执行时，wrapped 只更新最近参数与 this，并把旧定时器替换为新的等待窗口；定时器到期后 invoke 才调用原函数并释放闭包引用。cancel 的输出是清空待处理状态，flush 则立即提交最后一次调用，二者都不会留下继续触发的计时任务。

这是 trailing-only 版本。输入调用被折叠，输出采用最后一次参数。完整 leading+trailing 实现还要记录窗口内是否发生过额外调用，避免一次 leading 调用后又无条件补一次尾调用。
## 节流的时间边界

节流可用时间戳、定时器或二者结合。时间戳适合 leading，定时器适合 trailing。系统时间可能调整，严谨实现优先使用单调时钟 `performance.now()`。回调执行耗时也会影响下一窗口，应先定义“从调用时刻”还是“从完成时刻”计间隔。

`requestAnimationFrame` 节流适合视觉更新，它按绘制机会合并调用，却不是固定毫秒节流；页面后台时 rAF 会降频或暂停。网络保存需要明确时间和页面生命周期，不能只依赖 rAF。
## 柯里化与偏函数

柯里化把多参数函数转换为逐个参数函数，偏函数固定部分参数。工程价值在于建立可组合配置，而不是为了写更短。判断是否收集完成不能只看 `fn.length`，默认参数、rest 参数会改变它；生产 API 更适合显式 arity 或专用包装。

函数组合 `compose(f, g)(x)` 从右向左，`pipe` 从左向右。同步组合遇到 Promise 会把 Promise 当普通值传入，异步管道要统一 `await` 每一步，并定义错误是否短路、重试或转换成结果联合。
## 假时钟验证

真实等待会让测试慢且不稳定。使用测试框架假时钟，精确推进 99ms/1ms，验证边界时刻、连续调用、cancel 和 flush。还要断言调用参数、this 和定时器数量。

组件卸载时调用 cancel，否则闭包仍持有组件数据，尾调用还可能写入已失效状态。防抖搜索还需 AbortController 取消旧网络请求：防抖只减少发起次数，不能解决已经发出的响应乱序。

实现防抖和节流前要先固定业务语义与时间线。“防抖最后执行、节流一段时间执行一次”没有覆盖 leading、trailing、取消、页面后台和异步竞态。
## 时间线而不是一行实现

设 `wait=100`，在 t=0、50、90 连续调用 trailing debounce：每次调用都取消旧 timer，最终只在 t=190 用第三次参数执行。若 `leading=true`，t=0 立即执行；是否在 t=190 再执行取决于窗口内是否有第二次调用，不能用一个布尔值随意替代。

节流 trailing 的状态至少包含 lastInvokeTime、timer、latestArgs 和 latestThis。系统从后台恢复时 timer 可能延迟很久；用 `Date.now` 还会受系统时钟调整影响。视觉滚动优先 rAF，网络/搜索节流则用单调时间和明确的最大等待。
## this、返回值与资源所有权

包装器应保留调用时 this 和参数；若原函数返回 Promise，工具要决定是否返回该 Promise、如何传播 reject，以及 cancel 是否只取消未来调用还是也 abort 当前调用。组件卸载必须 cancel 并清空 latestArgs/this，否则闭包会保留大对象；节流触发的异步请求仍需 requestId 防止乱序覆盖。
## 官方依据

- [HTML Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [High Resolution Time](https://www.w3.org/TR/hr-time-2/)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
