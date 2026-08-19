---
title: "队列与滑动窗口"
description: "用先进先出和单调队列处理任务流与窗口最大值。"
category: frontend
tags: ["队列", "滑动窗口", "TypeScript"]
updated: 2026-08-05
order: 150
depth: reference
series: "算法与数据结构"
---
# 队列与滑动窗口

队列维持 FIFO（First In, First Out，先进先出）。任务调度和 BFS 只需要队首出、队尾进；滑动窗口最大值还需要从两端删除，因此要使用 deque（双端队列）并维护单调性。

## 头指针避免频繁 shift

~~~ts
class Queue<T> {
  private values: T[] = []
  private head = 0

  get size(): number {
    return this.values.length - this.head
  }

  enqueue(value: T): void {
    this.values.push(value)
  }

  dequeue(): T | undefined {
    if (this.head >= this.values.length) return undefined

    const value = this.values[this.head]
    this.head += 1

    if (this.head > 1024 && this.head * 2 > this.values.length) {
      this.values = this.values.slice(this.head)
      this.head = 0
    }

    return value
  }
}
~~~

逻辑队列位于 `[head, values.length)`。dequeue 只移动 head，偶尔压缩已消费前缀。压缩一次需要线性复制，但跨大量操作的总成本可按均摊分析控制。

空队列返回 undefined，因此若 T 本身允许 undefined，接口无法区分“无元素”和“元素值就是 undefined”。可以禁止该值，或返回 `{ ok, value }` 联合类型。

## 滑动窗口先定义有效范围

给定数组和窗口宽度 k，窗口右端为 right 时，有效下标是 `[right - k + 1, right]`。单调队列保存候选下标，并满足：

- 下标从队首到队尾递增。
- 对应值从队首到队尾单调不增。
- 队首始终处在当前窗口内。

~~~ts
function maxSlidingWindow(values: number[], width: number): number[] {
  if (!Number.isInteger(width) || width <= 0 || width > values.length) {
    return []
  }

  const deque: number[] = []
  let head = 0
  const result: number[] = []

  for (let right = 0; right < values.length; right += 1) {
    const firstValid = right - width + 1

    if (deque[head] < firstValid) head += 1

    while (
      deque.length > head &&
      values[deque[deque.length - 1]] <= values[right]
    ) {
      deque.pop()
    }

    deque.push(right)

    if (right + 1 >= width) {
      result.push(values[deque[head]])
    }
  }

  return result
}
~~~

新值大于等于队尾值时，旧候选可以删除。新值位置更靠右，且至少一样大，只要两者还在同一未来窗口，旧值不可能重新成为最大值。

## 为什么整体是 O(n)

每个下标进入 deque 一次，最多从队尾弹出一次或从队首过期一次。while 的单次执行次数可能很大，所有轮次相加不超过线性数量，所以时间 `O(n)`，辅助空间最多 `O(k)`。

代码中的数组仍保留过期前缀，下标计数可能增长到 n。长期流式系统要使用真正的环形 deque 或周期压缩，才能把物理空间也限制在 `O(k)`。

## 重复值的删除策略

使用 `<=` 会删除相等旧值，保留更新下标，队列更短；使用 `<` 会同时保留相等值。两种都能得到最大值，但过期判断和希望返回哪个下标时会有差异。

若输出最大值所在的最早位置，应保留旧相等值；只输出值时保留新值更简单。策略必须与返回合同一致。

## 队列还需要背压和取消

算法队列默认 enqueue 总会成功，工程任务队列还要处理容量、优先级、失败重试和消费者速度。生产者持续快于消费者时，内存会无界增长，需要上限、拒绝、丢弃或持久化策略。

测试滑动窗口时覆盖 width 为 1、等于数组长度、非法 width、递增、递减、全相等和负数。再与每个窗口直接求最大值的 `O(nk)` 实现做随机对照。
