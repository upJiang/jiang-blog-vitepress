---
title: 贪心算法与区间问题：选择、合并和覆盖
description: 用交换论证解释为什么按结束位置排序可以选出最多不重叠区间，并比较合并、覆盖与会议室问题。
category: algorithms
part: 贪心与区间
chapter: 19
tags:
  - 贪心
  - 区间
  - TypeScript
prerequisites:
  - 排序与复杂度基础
outcomes:
  - 能提出并证明局部选择
  - 区分三类区间状态
practice:
  type: implementation
  result: 实现区间选择、合并和最少会议室
  verify:
    - 端点相等语义在测试中固定
    - 反例能击穿错误排序策略
evidence: public-source
updated: 2026-08-11
---
# 贪心算法与区间问题

贪心算法每一步做局部选择，并且不回退。它能成立，需要证明当前选择总能出现在某个全局最优解中。区间问题看起来相似，最大不重叠集合、合并区间和最少会议室却维护不同状态。

## 最多不重叠区间按结束时间选

区间采用半开语义 `[start, end)`，相邻 `end === next.start` 不重叠。先按 end 升序，再选择第一个 start 不小于上次结束时间的区间。

~~~ts
type Interval = readonly [start: number, end: number]

function maximumNonOverlapping(
  input: readonly Interval[],
): Interval[] {
  const intervals = [...input].sort(
    (left, right) => left[1] - right[1] || left[0] - right[0],
  )

  const selected: Interval[] = []
  let lastEnd = -Infinity

  for (const interval of intervals) {
    const [start, end] = interval
    if (start > end) throw new RangeError('invalid interval')

    if (start >= lastEnd) {
      selected.push(interval)
      lastEnd = end
    }
  }

  return selected
}
~~~

结束越早，留给后续区间的空间越多。交换证明取任意最优解的第一个区间 O，贪心选出的 G 结束时间不晚于 O。把 O 换成 G 不会让后续原本可选的区间失效，因此存在一个包含 G 的最优解，问题可递归到剩余区间。

按最早开始或最短长度选择没有同样保证，可以构造一个很早但跨度巨大的区间，或一个短区间卡在多个可兼容区间中间。
## 合并区间维护当前覆盖范围

合并目标是输出并集，不是在做选择最大化。按 start 排序后，只需比较下一个区间与当前合并段的 end。

~~~ts
function mergeIntervals(input: readonly Interval[]): Interval[] {
  const intervals = [...input].sort(
    (left, right) => left[0] - right[0] || left[1] - right[1],
  )
  const result: Interval[] = []

  for (const [start, end] of intervals) {
    if (start > end) throw new RangeError('invalid interval')

    const last = result[result.length - 1]
    if (last === undefined || start > last[1]) {
      result.push([start, end])
    } else {
      result[result.length - 1] = [last[0], Math.max(last[1], end)]
    }
  }

  return result
}
~~~

半开区间是否把相邻端点合并，取决于业务。上例 `start === last.end` 会合并；若相邻不算连续覆盖，条件改为 `start >= last.end`。边界语义必须写在合同里。
## 最少会议室追踪释放时间

会议室数量取决于任一时刻重叠区间的最大数。按 start 处理会议，用最小堆保存每个占用房间的 end。新会议开始前，把已经结束的房间释放；没有空房才新增。

也可以把开始和结束拆成事件排序扫描。相同时间点上，半开区间应先处理 end 再处理 start，才能复用刚释放的房间。闭区间语义则相反。
## 排序成本控制总复杂度

三个算法都先排序，时间 `O(n log n)`。后续扫描是 `O(n)`，会议室堆操作总计 `O(n log n)`。若输入已经按所需键排序，可以省掉排序，但接口要明确并验证顺序。
## 反例与穷举验证证明

为贪心策略构造短区间集合，穷举所有子集得到最大兼容数量，与实现对比。为合并算法随机生成区间，抽样多个坐标点验证输入并集和输出并集一致，且输出两两不重叠。

贪心解法的核心产物是交换论证或保持领先证明。没有证明时，一个看起来合理的排序规则仍只是猜测。
