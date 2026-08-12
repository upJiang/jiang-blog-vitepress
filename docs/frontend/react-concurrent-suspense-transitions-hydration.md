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

## 紧急更新与 Transition

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

事件执行时 text 更新进入紧急队列，query 更新被标记为 transition；React 可以先提交输入，再继续或重做结果树。输出中的 isPending 只说明这批非紧急状态尚未提交，网络失败、同步长任务和结果为空仍要由独立状态处理，不能把 pending 当成业务进度。

text 属于紧急反馈，query 驱动可延后的结果。`isPending` 表示相关 transition 尚未提交，不是网络百分比。若筛选函数本身形成不可切分长任务，仍需索引、分页或 Worker。

## Suspense 表达未就绪边界

渲染读取的代码或数据尚未就绪时，支持 Suspense 的数据源会让当前分支挂起。React 向上寻找最近边界，决定显示 fallback、保留已有内容还是配合 transition 等待。普通 Effect 中 fetch 不会自动获得完整 Suspense 数据语义，通常由框架或支持缓存的资源层集成。

边界要围绕用户任务设计。一个覆盖全页的 spinner 会让已可用导航消失；过细边界又会产生闪烁瀑布。错误边界负责异常，Suspense 负责等待，两者不能互相替代。

## 流式 SSR 与选择性 Hydration

服务端先输出可完成的 HTML shell，挂起边界稍后通过流补充。客户端 Hydration 让已有 HTML 获得事件和状态，而不是重新把所有 DOM 创建一遍。用户先交互某个尚未 Hydrate 的边界时，React 可以提高该区域优先级。

Hydration 要求服务端首屏和客户端首次 Render 在可比较内容上确定一致。直接读取 `Date.now()`、随机数、浏览器尺寸或不同 Locale 会产生不匹配。浏览器专属差异应延后到客户端 Effect、使用稳定序列化数据，或明确建立客户端边界。

## 失败与恢复

流式连接中断、动态模块加载失败、数据 promise 拒绝和 Hydration 不匹配需要不同恢复方式。边界应提供可重试入口，缓存层必须允许失效失败记录，服务端要保持每请求状态隔离。

Suspense fallback 频繁闪烁时，检查是否每次 Render 创建新 promise、缓存 key 是否稳定，以及导航是否应放进 transition。Hydration 报错时先对比原始 HTML 和客户端第一次输出，不要用 `suppressHydrationWarning` 大面积掩盖。

## Profiler 验证

记录输入 Commit 时间、transition pending 时长、列表 Render/Commit、服务器首字节、边界内容到达和 Hydration 交互时间。对照组使用同步更新，实验组只改变优先级策略。

结论应区分“更快看到紧急反馈”“更早看到 shell”和“所有内容完成更快”。并发经常改善前两项，不保证减少总工作。面试继续追问时，应把 Fiber/Lane 的可放弃 Render、Suspense 的等待协议和 Hydration 的宿主复用串成同一条执行链。

## Suspense 怎样把等待交给调度器

支持 Suspense 的数据源在读取未就绪数据时抛出 thenable。Reconciler 捕获它，向上寻找最近边界，将相关 lanes 标记为 suspended，并决定保留现有内容还是提交 fallback。thenable settle 后 ping Root，相应 lanes 重新获得尝试机会。普通 Effect 中发请求不会自动进入这条协议。

Transition 告诉 React 某批更新不是紧急输入。若已显示内容因 transition 更新挂起，React 可以延迟 fallback，保留旧界面并暴露 pending 状态；首屏边界没有可保留内容时仍会显示 fallback。边界设计要与用户任务对应，不能每个组件都套一个 spinner，也不能一个根边界让全页一起闪烁。

## 流式 SSR 与选择性 Hydration

服务器先发送 shell 和 fallback，某个 Suspense 边界就绪后再发送该片段及替换指令。客户端 Hydration 复用已有 DOM、连接事件和 Fiber；用户在尚未 Hydrate 的边界交互时，React 可以提高该区域优先级。这里仍是主线程调度，不是多个组件并行在多线程执行。

Hydration 的输入是服务器 HTML、客户端首次 Element 树和序列化数据。时间、随机数、区域设置、无效 HTML 自动修正、客户端缓存差异都会造成不匹配。排查顺序是保存原始响应 HTML，禁用扩展与注入，比较首次客户端输入，再逐个隔离边界；`suppressHydrationWarning` 只适合明确且局部的不可避免差异。

## 官方依据

- [startTransition](https://react.dev/reference/react/startTransition)
- [Suspense](https://react.dev/reference/react/Suspense)
- [renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
