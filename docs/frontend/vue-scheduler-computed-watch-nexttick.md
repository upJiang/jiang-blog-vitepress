---
title: Vue 调度器、computed、watch 与 nextTick
description: 从同步修改多次只渲染一次进入 Job Queue、去重排序、微任务刷新、computed 脏标记和 watch flush 时机。
category: frontend
part: Vue
chapter: 40
tags:
  - Vue 3
  - Scheduler
prerequisites:
  - Vue 响应式 Effect
outcomes:
  - 推演批量更新队列
  - 选择 computed、watch 或 watchEffect
practice:
  type: implementation
  result: 实现最小调度器并记录刷新顺序
  verify:
    - 父子更新和去重顺序稳定
    - nextTick 只等待当前刷新周期
evidence: public-source
updated: 2026-08-11
---

# Vue 调度器、computed、watch 与 nextTick

Vue 调度器接收响应式系统产生的 Job，并决定去重、排序和刷新时机；`computed` 保存惰性派生值，`watch/watchEffect` 在依赖变化时运行同步回调，`nextTick` 让调用方等待当前刷新队列完成。它们位于 `trigger` 与组件 DOM 更新之间，各自解决“何时执行”“算什么”和“何时观察完成”的问题。

同一同步函数连续修改 `count` 三次，组件通常只更新一次。`trigger` 没有丢更新，而是把同一个组件 Job 交给调度器；队列去重后，最终 Render 读取最新状态。

## 队列不只是 Promise.then

调度器要管理主队列、pre flush 和 post flush callbacks，按 Job ID 保持父组件等关键顺序，处理刷新中新增任务、递归更新上限和错误。`queueMicrotask` 只能安排时机，不能提供这些不变量。

下面在支持 queueMicrotask 的现代浏览器或 Node 环境运行一个教学队列。输入是可重复加入的 Job 函数，目标是观察同一同步调用栈只安排一个微任务、相同函数只执行一次；排序、递归限制和错误分发未实现，输出不能等同于 Vue 正式调度器。

```ts
const jobs = new Set<() => void>()
let pending = false

function queueJob(job: () => void): void {
  jobs.add(job)
  if (pending) return
  pending = true
  queueMicrotask(() => {
    try {
      for (const current of jobs) current()
    } finally {
      jobs.clear()
      pending = false
    }
  })
}
```

queueJob 每次调用先把函数写入 Set，同一 Job 因此只保留一次；首个调用创建微任务，刷新时依次执行当前任务，finally 清空状态。Job 执行失败仍会释放 pending，但教学输出没有排序、错误分发和刷新中插入规则，真实组件调度必须补齐这些边界。

这段教学模型只表达去重和微任务刷新。排序、刷新中插入和多队列的具体顺序放在后面的完整轨迹中，不能据此假设所有 watcher 与组件更新时机相同。
## computed 的脏标记

computed 内部 Effect 初次读取时计算并缓存。依赖变化时 scheduler 不立即重算，只把 dirty 设为 true，并触发 computed 自身消费者；下次读取才计算。若无人读取，昂贵派生值不会浪费工作。

computed getter 应纯净。写请求、修改依赖或依赖当前时间，会破坏缓存语义。可写 computed 的 setter 是把写操作映射到源状态，不代表可以在 getter 中副作用。
## watch 的 flush 时机

watch 有显式 source，可拿新旧值并 cleanup；watchEffect 自动收集同步读取。`flush: 'pre'` 通常在组件 DOM 更新前，`post` 在更新后，`sync` 立即执行且不批处理，应谨慎用于简单状态。

`nextTick` 返回当前刷新 Promise，让代码等待已经排队的 DOM 更新完成。它不是固定延时，也不保证图片加载、动画结束或浏览器绘制完成。等待绘制用 requestAnimationFrame，等待资源用资源事件。
## Job Queue 的数据结构和顺序

组件 ReactiveEffect 不直接同步重渲染，而把 update job 交给 scheduler。队列按 job 身份去重，并利用组件 UID/优先标记维持父组件先于子组件、pre callback 先于对应组件更新等约束；已卸载子组件的任务可在刷新时跳过。刷新期间新增任务要插入尚未处理的区间，不能简单复制数组后清空。

```text
同步写 state 三次
  -> trigger 同一个 component update job 三次
  -> queue 中只保留一次
当前调用栈结束
  -> flush pre callbacks
  -> 按 id 执行 component jobs
  -> flush post callbacks
  -> currentFlushPromise resolve，nextTick 恢复
```

这里的“微任务批处理”不是所有更新永远一个微任务。flush 中再次排队、递归上限、同步 watcher 和不同应用实例都会改变轨迹。调试时在一次具体操作中记录 job 来源和写入者，不用“Vue 异步更新”概括所有时序。
## computed 与 watch 的所有权

computed 维护内部 Effect、缓存值和脏状态。依赖 trigger 时 scheduler 先把 computed 标脏并通知读取它的消费者；下一次读取才求值。getter 必须无副作用，否则缓存命中与重新计算会改变外部行为。

watch source 决定依赖范围，回调收到新旧值和 cleanup 注册器。异步回调在 await 前注册 cleanup 最可靠；新版本提供的清理 API 仍应按官方同步调用约束使用。深度 watch 需要遍历对象，成本随图规模增长，也无法为原地嵌套修改自动保留深克隆 oldValue。
## 记录一轮真实刷新

在同一组件中加入 pre watcher、Render 日志、post watcher、`nextTick` 和 `requestAnimationFrame`，连续修改状态三次。记录 Vue 版本和调用位置，验证同步日志先结束，组件 Job 去重，pre/组件/post 按当前版本规则推进，`nextTick` 在该轮 flush 后恢复，rAF 才提供下一次绘制机会。

出现无限更新时，先找哪个 watcher 写回了自身 source、computed getter 是否修改依赖、组件更新 Hook 是否无条件写状态。测试断言阶段关系和最终 DOM，不依赖未公开的私有函数调用次数。
## 官方依据

- [Vue: Computed Properties](https://vuejs.org/guide/essentials/computed.html)
- [Vue: Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [Vue: nextTick](https://vuejs.org/api/general.html#nexttick)
- [Vue source: scheduler.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/scheduler.ts)
