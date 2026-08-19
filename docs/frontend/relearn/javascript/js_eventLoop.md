---
title: "事件循环与任务队列"
description: "用两次浏览器实验理解任务、微任务、渲染和异步竞态"
category: frontend
tags: ["JavaScript", "Event Loop"]
updated: 2026-08-05
order: 480
depth: reference
series: "重学前端"
---
# 事件循环与任务队列

浏览器需要在一个线程上协调脚本、事件、网络回调、计时器和渲染。HTML 标准用 Event Loop、Task 与 Microtask 描述这套调度；ECMAScript 规范定义 Promise Reaction Job 等 Job，再由浏览器宿主把它们接入微任务队列。两份规范负责的层次不同。

“宏任务”是工程讨论中的常用叫法，HTML 标准使用的是 task。浏览器也没有一个可以被 JavaScript 直接访问的“宏任务栈”。

## 一个事件循环回合怎样推进

简化到页面主线程，一轮调度通常包含这些动作：

1. 从某个任务队列选择一个可运行任务并执行。
2. 到达微任务检查点后，持续执行微任务，直到队列为空。
3. 宿主判断是否到了更新渲染的机会。
4. 进入下一轮，继续选择任务。

任务可能来自初始脚本、用户交互、计时器、消息通道等不同 task source。相同来源需要维持规范要求的顺序，浏览器可以在来源之间选择，所以不能把所有任务想成一个绝对 FIFO 队列。

~~~js
console.log('script:start')

setTimeout(() => {
  console.log('timer')
}, 0)

queueMicrotask(() => {
  console.log('microtask')
})

console.log('script:end')
~~~

这段脚本通常依次输出 `script:start`、`script:end`、`microtask`、`timer`。零毫秒定时器只表示达到最小等待条件后可以被调度，它不承诺立即执行。
## 微任务检查点会排空队列

Promise reaction、`queueMicrotask` 和 MutationObserver 通知都使用微任务机制。执行某个微任务时又加入微任务，新任务也会在当前检查点继续执行。

~~~js
queueMicrotask(() => {
  console.log('first')

  queueMicrotask(() => {
    console.log('nested')
  })
})

queueMicrotask(() => {
  console.log('second')
})
~~~

输出顺序是 first、second、nested。队列按入队顺序处理；first 执行时 nested 才进入队尾。

持续递归加入微任务会让检查点长时间无法结束，渲染与用户输入因此迟迟得不到机会。微任务适合在当前任务结束后尽快整理状态，不适合承载无界循环或大批量计算。
## Promise 与 queueMicrotask 的错误表面不同

两者都能把回调放到微任务阶段，异常处理方式不同。`queueMicrotask` 回调直接抛出的异常会按宿主未捕获异常流程报告；Promise `then` 回调抛错会让返回的 Promise 进入 rejected 状态。

~~~js
queueMicrotask(() => {
  console.log('queued directly')
})

Promise.resolve().then(() => {
  console.log('promise reaction')
})
~~~

只为排入微任务时，`queueMicrotask` 能直接表达意图。已经处在 Promise 链上时继续用 `then` 或 `await`，拒绝传播关系更清楚。无论哪种方式，都要让错误进入可观测的处理路径。
## await 把后续代码切成微任务续体

异步函数执行到 `await` 时，会对等待值执行 Promise 解析，并暂停当前函数。当前调用者继续运行；等待结果可用后，函数剩余部分作为 job 恢复。

~~~js
async function run() {
  console.log('run:start')
  await null
  console.log('run:resume')
}

console.log('script:start')
run()
queueMicrotask(() => console.log('queued'))
console.log('script:end')
~~~

在当前浏览器和语言实现中，`run:resume` 对应的 reaction 先入队，随后才是 queued，因此它会先输出。判断更复杂的顺序时，逐行记录“何时入队”，比只按代码缩进猜测稳定。
## 渲染机会不等于每轮都绘制

浏览器会根据刷新节奏、页面可见性和实现策略决定是否更新渲染。`requestAnimationFrame` 回调在一次渲染更新中的绘制之前运行，适合读取时间戳并提交本帧视觉状态。它不是通用后台计时器，后台标签页可能被降频或暂停。

~~~js
requestAnimationFrame(() => {
  document.body.dataset.frame = 'ready'

  queueMicrotask(() => {
    document.body.dataset.microtask = 'done'
  })
})
~~~

回调结束后，浏览器在继续渲染流程前会处理相应微任务检查点。实际布局和绘制还受样式失效、同步布局读取、页面状态影响，单看回调触发不能证明像素已经出现在屏幕上。

需要等到浏览器至少获得一次绘制机会时，可以按具体目标组合 rAF、下一任务或浏览器测试截图。没有标准 API 能对所有环境承诺“这一行之后像素必然已经显示”。
## JavaScript 单线程不等于系统只做一件事

页面主线程一次执行一个 JavaScript 调用栈。网络、存储、解码等工作可以由浏览器其他线程或进程推进，完成后再安排任务。Web Worker 还拥有自己的线程、事件循环和全局环境，通过消息传递协作。

因此，fetch 等待期间主线程可以处理输入；回调开始执行后，里面的 JavaScript 仍会占用所在事件循环。把 CPU 密集计算写成 Promise 不会自动移到后台，真正并行需要 Worker 或平台提供的异步能力。
## 长任务与微任务饥饿怎样出现

同步循环会一直占住当前任务。很长的 Promise 链则可能一直占住微任务检查点。两者都能拖延输入和渲染，只看“是否用了 async”判断不了响应性。

批处理可以设置明确预算，每处理一批就通过下一任务或调度 API 归还控制权。选择 `setTimeout`、`MessageChannel`、`scheduler.postTask` 或 Worker 时，需要考虑兼容性、优先级和取消语义，不能把它们当作完全等价的让步手段。
## 浏览器与 Node.js 不能共用一张顺序表

Node.js 使用 libuv phases，并额外维护 `process.nextTick` 队列。它与浏览器的 HTML Event Loop 并不相同，Node 版本变化也曾调整计时器阶段行为。浏览器文章里的 task、渲染与 rAF 结论不能直接套到 Node。

跨环境库应分别写测试，固定运行时版本。不要用 `process.nextTick` 解释浏览器 Promise，也不要用浏览器的一帧概念解释 Node I/O。
## 两个实验足以定位大多数顺序问题

第一个实验只观察顺序：同步日志、`queueMicrotask`、Promise、`setTimeout`、`MessageChannel` 与 rAF 各放一个标记，同时记录入队点和执行点。

第二个实验观察页面响应：在任务或微任务中加入可控批量工作，用 Performance 面板和 Long Tasks API 查看主线程占用，再用 rAF 记录帧间隔。测试需要注明浏览器版本、页面是否前台、计时器嵌套层级和设备负载。

控制台输出能证明回调的可观察次序，不能单独证明规范允许的所有调度，也不能证明用户看到了哪一帧。涉及交互流畅度时，调度日志与真实渲染证据要一起看。
