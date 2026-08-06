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

普通任务队列按到达顺序处理，第一个进入的任务最先离开。滑动窗口最大值则多一个要求：窗口每向右移动一步，要快速知道仍在窗口中的最大元素。每次扫描整个窗口需要 `O(nk)`，单调队列可以降到 `O(n)`。

本篇先实现不使用 `shift()` 的 FIFO Queue，再用双端队列保存窗口候选下标。关键不变量是队列中的值从大到小，队首始终是当前最大值。

## 为什么普通数组 shift 不理想

JavaScript 数组尾部操作适合栈，头部 `shift()` 通常需要移动后续索引。FIFO 可以保留一个 head 指针，出队只增加 head；当无效前缀足够大时再一次性压缩，获得摊还常数成本。

滑动窗口还要从队尾删除较小元素，因此需要 Deque。教学实现可以用数组加两个索引；生产项目也可使用经过验证的双端队列库。

```mermaid
flowchart LR
  N[新元素下标] --> E[移除队首过期下标]
  E --> S[移除队尾不大于新值的下标]
  S --> A[新下标入队]
  A --> M[队首就是窗口最大值]
```

## 步骤一：只保存可能成为最大值的下标

若新值大于或等于队尾值，旧队尾更早过期且不更大，以后永远不可能成为最大值，可以删除。下标还能判断元素是否已经离开窗口，仅保存值无法区分重复元素的位置。

下面输入数组和窗口宽度 k，输出每个完整窗口的最大值。Deque 使用下标数组与 head，所有下标最多入队、出队一次。

```ts
function maxSlidingWindow(values: readonly number[], k: number): number[] {
  if (!Number.isInteger(k) || k <= 0 || k > values.length) return []

  const deque: number[] = []
  const output: number[] = []
  let head = 0

  for (let right = 0; right < values.length; right += 1) {
    const left = right - k + 1
    while (head < deque.length && deque[head]! < left) head += 1

    while (
      head < deque.length &&
      values[deque[deque.length - 1]!]! <= values[right]!
    ) deque.pop()

    deque.push(right)
    if (left >= 0) output.push(values[deque[head]!]!)
  }

  return output
}
```

对 `[1,3,-1,-3,5]`、`k=3`，窗口最大值依次是 `[3,3,5]`。新值 5 到来时，队尾所有更小候选都会被移除；它们既更旧又更小，删除不会丢失未来答案。

## 复杂度与边界

虽然代码有两个 while，每个下标只从队首或队尾移除一次，所以总时间 O(n)，Deque 最多 k 个下标，空间 O(k)。k 为 1 时输出原数组副本；k 超出范围或非正整数时当前接口返回空数组，也可以按业务选择抛错。

单调递减队列求最大值，单调递增队列求最小值。BFS 使用普通 Queue，层序遍历可在每层开始时读取当前队列长度。背压型工程队列还需要容量和拒绝策略，算法 Queue 的无限内存假设不能直接带到服务系统。

## 怎样验证不变量

每轮结束检查队列下标递增、对应值递减，且所有下标都在当前窗口内。小数组与朴素 `Math.max(...slice)` 交叉验证，覆盖重复最大值、负数、单元素与 k 等于数组长度。

## 参考资料

- [Open Data Structures: Queues and Deques](https://opendatastructures.org/ods-javascript/2_Stacks_Queues_and_Deques.html)
- [ECMAScript Array](https://tc39.es/ecma262/multipage/indexed-collections.html)
