---
title: React 并发、Transition、Suspense 与 Hydration
description: 从输入卡顿和流式页面进入并发渲染、transition、deferred value、Suspense 边界、流式 SSR 与选择性 Hydration。
category: frontend
part: React
chapter: 36
tags:
  - React
  - Concurrent Rendering
  - Suspense
prerequisites:
  - Fiber、Lane 与服务端渲染基础
outcomes:
  - 解释并发不是多线程
  - 设计稳定的加载与恢复边界
practice:
  type: diagnosis
  result: 用 Profiler 比较紧急和非紧急更新
  verify:
    - 输入响应与总完成时间分别记录
    - Hydration 不匹配可定位到确定输出
evidence: official
updated: 2026-08-11
---

# React 并发、Transition、Suspense 与 Hydration

并发渲染不是浏览器同时运行两个 React 线程。它允许 React 在主线程上准备多个版本的 UI，低优先级 Render 可以让出、继续或丢弃，只有确认版本进入 Commit。`startTransition`、Suspense 和流式 SSR 利用这项能力解决不同阶段的等待问题。

## 并发渲染如何调度更新

React 的并发能力作用于 Render 阶段。更新进入不同 Lane 后，Reconciler 可以暂停低优先级工作，先处理更紧急的输入，再继续或重新执行被打断的 Render。被放弃的 Render 不会进入 Commit，因此组件必须保持渲染纯度，不能把不可撤销的外部操作写进函数体。

这套调度仍运行在浏览器主线程。它能拆分 React 可控制的渲染工作，却不能打断任意同步 JavaScript。排序、解析或列表计算如果形成一个长任务，仍要通过更好的算法、分页或 Worker 处理。

## Transition 区分紧急与非紧急更新

输入、焦点和按下反馈通常要立即反映。大列表筛选或路由内容可标成 transition，让紧急更新先提交。Transition 不让算法变快，也不能控制文本输入的受控值本身。

下面在支持并发特性的 React 客户端组件中运行，输入是用户每次键入的字符串，观察 text 与 query 两条状态何时提交。实验要同时打开 Profiler 和浏览器 Performance；若列表计算形成单个同步长任务，结果应记录为不可切分边界而非调度成功。

```tsx
const [text, setText] = useState('')
const [query, setQuery] = useState('')
const [isPending, startTransition] = useTransition()

function changeText(next: string) {
  setText(next)
  startTransition(() => setQuery(next))
}
```

事件执行时 text 更新进入紧急队列，query 更新被标记为 transition；React 可以先提交输入，再继续或重做结果树。输出中的 isPending 只说明这批非紧急状态尚未提交，网络失败、同步长任务和结果为空仍要由独立状态处理，不能把 pending 当成网络进度。

## Suspense 表达未就绪边界

渲染读取的代码或数据尚未就绪时，支持 Suspense 的数据源会抛出 thenable。Reconciler 捕获它，向上寻找最近边界，将相关 Lane 标记为 suspended，并决定显示 fallback 还是保留已有内容。thenable 完成后会 ping Root，相应 Lane 才获得新的执行机会。普通 Effect 中 fetch 不会自动进入这套协议，通常需要框架或支持缓存的资源层集成。

Transition 会改变已经显示内容时的处理方式。非紧急更新挂起后，React 可以暂时保留旧界面并暴露 pending 状态；首屏没有可保留内容时仍会显示 fallback。错误边界处理异常，Suspense 处理等待，两者不能互相替代。

边界要围绕用户任务设计。一个覆盖全页的 spinner 会让已可用导航消失，过细边界又会产生闪烁瀑布。

## 流式 SSR 与选择性 Hydration

服务端先发送 HTML shell 和 fallback，某个 Suspense 边界就绪后再发送对应片段与替换指令。客户端 Hydration 复用已有 DOM，连接事件、状态与 Fiber，而不是重新创建整棵宿主树。用户在尚未 Hydrate 的边界内交互时，React 可以提高该区域的 Hydration 优先级。这里仍是主线程调度，不代表组件在多个线程并行执行。

Hydration 要求服务端首屏和客户端首次 Render 在可比较内容上确定一致。直接读取 `Date.now()`、随机数、浏览器尺寸或不同 Locale 会产生不匹配。浏览器专属差异应延后到客户端 Effect、使用稳定序列化数据，或明确建立客户端边界。

## 等待、异常与 Hydration 的恢复

流式连接中断、动态模块加载失败、数据 promise 拒绝和 Hydration 不匹配需要不同恢复方式。边界应提供可重试入口，缓存层必须允许失效失败记录，服务端要保持每请求状态隔离。

Suspense fallback 频繁闪烁时，检查是否每次 Render 创建新 promise、缓存 key 是否稳定，以及导航是否应放进 transition。Hydration 报错时先对比原始 HTML 和客户端第一次输出，不要用 `suppressHydrationWarning` 大面积掩盖。

## 用 Profiler 验证调度收益

记录输入 Commit 时间、transition pending 时长、列表 Render/Commit、服务器首字节、边界内容到达和 Hydration 交互时间。对照组使用同步更新，实验组只改变优先级策略。

结论应区分“更快看到紧急反馈”“更早看到 shell”和“所有内容完成更快”。并发经常改善前两项，不保证减少总工作。Hydration 还要保存原始响应 HTML，比较客户端首次 Element 树和序列化数据；`suppressHydrationWarning` 只适合明确且局部的不可避免差异。

## 官方依据

- [startTransition](https://react.dev/reference/react/startTransition)
- [Suspense](https://react.dev/reference/react/Suspense)
- [renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
