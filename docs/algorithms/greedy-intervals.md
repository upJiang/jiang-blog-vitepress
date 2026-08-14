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

# 贪心算法与区间问题：选择、合并和覆盖

“每次选看起来最好的”不是贪心算法的证明。区间问题中，选最早开始、最短或最少冲突都很自然，却可能失去最优解。可靠做法是先写清目标和端点语义，再用交换论证证明某个局部选择不会让最优答案变差。

本篇把区间统一为半开区间 `[start, end)`，所以 `[1, 3)` 与 `[3, 5)` 不重叠。若业务中的结束时刻也占用资源，比较符号必须改变，测试也要随之改变。

## 最多不重叠区间：按结束时间选择

目标是选出数量最多的互不重叠区间。先按结束时间升序，结束相同时按开始时间升序；依次选择 `start >= lastEnd` 的区间。

为什么最早结束安全？设某个最优解的第一个区间是 `O`，贪心选择是结束最早的 `G`，必有 `G.end <= O.end`。用 `G` 替换 `O` 后，后续原本能接在 `O` 后面的区间仍能接在 `G` 后面，区间数量不减少。重复交换，就能得到以每次贪心选择开头的最优解。

```ts
type Interval = readonly [start: number, end: number]

function selectMostIntervals(input: Interval[]): Interval[] {
  const intervals = [...input].sort(
    (left, right) => left[1] - right[1] || left[0] - right[0]
  )
  const selected: Interval[] = []
  let lastEnd = Number.NEGATIVE_INFINITY

  for (const interval of intervals) {
    const [start, end] = interval
    if (start > end) throw new Error('invalid_interval')
    if (start < lastEnd) continue
    selected.push(interval)
    lastEnd = end
  }
  return selected
}
```

输入被复制后排序，避免函数悄悄改变调用方数组。输出保留被选区间。排序占 `O(n log n)`，扫描占 `O(n)`。若目标从“数量最多”变为“总价值最大”，交换论证不再成立，通常要按结束位置做动态规划。

## 合并区间：状态是当前覆盖范围

合并区间不是选择最多，而是求覆盖并集。应按开始时间排序，维护结果末尾的覆盖区间。新区间开始位置不晚于当前结束位置时扩展结束；否则开启一个新覆盖段。

这里的状态只有“当前已合并区间”，不需要堆。若输入采用闭区间，端点相等算重叠；半开区间下是否合并相邻段取决于业务，例如时间预约通常不合并，连续数值覆盖可能选择合并。

## 最少会议室：释放时间比合并结果更重要

会议室数量等于某一时刻同时存在的最大区间数。按开始时间处理会议，把正在占用的结束时间放入最小堆；新会议开始前，先释放所有 `end <= start` 的会议室，再放入新结束时间。堆的最大大小就是答案。

另一种实现把开始和结束分别排序，用双指针扫描事件。结束事件在同一时刻必须先于开始事件处理，才能符合半开区间语义。若把相等端点顺序写反，会无故多算一个房间。

## 用反例检查局部策略

选最早开始的反例是 `[0, 100)` 加上一组短区间 `[1, 2)、[2, 3)...`。最早开始只能得到一个，按最早结束能得到多个。选最短区间也未必正确：短区间可能位于两个可兼容区间中间，同时阻塞两侧。

验证贪心时，不能只跑几个正例。对小规模随机区间，可以枚举所有子集得到真正最优数量，再与贪心结果比较。这种“暴力基准 + 随机生成”是验证贪心假设的有效方式。

```ts
const sample: Interval[] = [[1, 4], [1, 2], [2, 3], [3, 5]]
const selected = selectMostIntervals(sample)
console.assert(selected.length === 3)
console.assert(selected.every((item, index) => index === 0 || selected[index - 1][1] <= item[0]))
```

断言同时检查数量和不重叠不变量。生产实现还要决定零长度区间是否有效、时间是否跨时区、输入是否允许无穷值。算法题常省略这些契约，工程代码不能省略。

面试追问时，先区分选择、合并、覆盖和并发资源四类目标，再说明排序键、扫描状态和证明。只说“看到区间先排序”无法证明算法正确。

## 交换论证为什么成立

对“最多选择不重叠区间”，按结束时间最早选 g。任意最优解的第一个区间 o 若不是 g，因为 `end(g) <= end(o)`，用 g 替换 o 后，最优解剩余区间仍在 g 之后可行，数量不减。因此可把最优解逐步变为贪心解。这个证明依赖目标是数量最大；若目标是总权重，结束最早不再充分，需要加权区间 DP。

合并区间先按 start 排序，维护当前覆盖段；会议室问题按开始/结束事件或最小堆维护并发数；覆盖最少点又是另一种目标。相同端点是闭区间还是半开区间会改变 `<=`/`<`，应在测试契约中固定。

排序 `O(n log n)`，一次扫描 O(n)，额外空间取决于排序实现和输出。随机暴力验证只能发现反例，不能替代交换论证；两者都需要，前者验证代码，后者验证算法选择。

交换论证和调度背景可对照 [CLRS 的 Greedy Algorithms 章节](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) 与 [CP-Algorithms 的单机调度说明](https://cp-algorithms.com/schedules/schedule_one_machine.html)。这些来源支持证明方法和问题模型；本文的随机反例与断言仍负责验证端点语义和代码行为。
