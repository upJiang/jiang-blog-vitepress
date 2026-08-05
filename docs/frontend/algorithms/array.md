---
title: "数组、哈希与双指针"
description: "掌握数组索引、哈希映射和双指针的典型问题模型。"
category: frontend
tags: ["数组", "双指针", "TypeScript"]
updated: 2026-08-04
order: 120
depth: reference
series: "算法与数据结构"
---
# 数组、哈希与双指针

数组题的关键不是看到“求和就 Map、看到有序就双指针”，而是先定义扫描过程中已经知道什么、尚未处理的候选在哪里，以及指针移动为何不会丢失答案。本篇保留两数之和、合并有序数组和三数之和，并补充原面试资料中的滑动窗口与原地索引题型。

## 两数之和：已见集合不变量

给定整数数组和 target，返回两个不同下标，使元素和等于 target。暴力枚举所有数对时间 `O(n²)`；单次扫描可把“是否见过补数”交给 Map。

```ts
function twoSum(
  values: readonly number[],
  target: number
): readonly [number, number] | null {
  const indexByValue = new Map<number, number>()

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]!
    const previous = indexByValue.get(target - value)
    if (previous !== undefined) return [previous, index]
    indexByValue.set(value, index)
  }
  return null
}
```

循环开始时，Map 只保存 `[0,index)` 的元素；查询发生在写入当前值之前，所以不会重复使用同一位置。由于索引从 0 开始且永不为 undefined，`get !== undefined` 可用；更通用映射应先 `has`，避免 value 本身允许 undefined。

重复值 `[3,3]` 能得到 `[0,1]`；无解返回 null，比 `[]` 更清楚。时间期望 O(n)，空间 O(n)。若输入已经有序且只需数值而非原下标，可用双指针 O(1) 空间。

“求和转求差”不是所有求和题的万能公式：数据范围很小可用位图，流式数据需处理内存上限，多解/计数需要不同 Map value。

## 合并有序数组：从后写避免覆盖

`first` 前 m 项有效，尾部预留 n 个位置，`second` 有 n 项。若从前写入 first，会覆盖尚未比较的有效元素；从后写最大的值，目标空位始终不会破坏未处理前缀。

```ts
function mergeSortedInto(
  first: number[],
  firstLength: number,
  second: readonly number[],
  secondLength: number
): void {
  if (first.length < firstLength + secondLength) {
    throw new RangeError('first has insufficient capacity')
  }

  let left = firstLength - 1
  let right = secondLength - 1
  let write = firstLength + secondLength - 1

  while (left >= 0 && right >= 0) {
    if (first[left]! > second[right]!) first[write--] = first[left--]!
    else first[write--] = second[right--]!
  }
  while (right >= 0) first[write--] = second[right--]!
}
```

不变量：`(write, end]` 已是最终有序后缀；`[0,left]` 与 `[0,right]` 是未处理前缀；最大未处理值放到 write 后不影响前缀。first 剩余无需复制，它们已在正确位置。时间 O(m+n)，额外空间 O(1)。

输入是否允许别名要说明：若 second 实际引用 first 的视图，原地写可能破坏读取；普通 JS 数组 slice 会复制，TypedArray subarray 则共享缓冲区。

## 三数之和：排序、固定与去重

要求所有不重复三元组。排序后固定 `i`，在右侧用左右指针寻找 `-values[i]`：

```ts
function threeSum(input: readonly number[]): number[][] {
  const values = [...input].sort((a, b) => a - b)
  const result: number[][] = []

  for (let i = 0; i < values.length - 2; i += 1) {
    if (i > 0 && values[i] === values[i - 1]) continue
    if (values[i]! > 0) break

    let left = i + 1
    let right = values.length - 1
    while (left < right) {
      const sum = values[i]! + values[left]! + values[right]!
      if (sum < 0) left += 1
      else if (sum > 0) right -= 1
      else {
        result.push([values[i]!, values[left]!, values[right]!])
        const leftValue = values[left]
        const rightValue = values[right]
        while (left < right && values[left] === leftValue) left += 1
        while (left < right && values[right] === rightValue) right -= 1
      }
    }
  }
  return result
}
```

排序后若 sum 小于 0，移动 right 只会更小或不变，不能找到 0，所以必须增加 left；反之减少 right。固定值和两侧指针成功后都跳过重复，保证值组合唯一。时间 O(n²)，排序 O(n log n) 被主循环覆盖，复制空间 O(n)；若允许修改输入可原地排序，但 API 应明确副作用。

JS Number 对超大整数会失去精度；输入超出安全整数用 BigInt（不可与 Number 混算）或明确数据约束。

## 滑动窗口：区间定义先统一

固定窗口最大值如果每个窗口重新扫描是 O(nk)。单调 Deque 保存“仍在窗口内、且可能成为最大值”的索引：值从队首到队尾单调不增。

```ts
function maxSlidingWindow(values: readonly number[], size: number): number[] {
  if (!Number.isInteger(size) || size <= 0 || size > values.length) return []

  const deque = new Array<number>(values.length)
  let head = 0
  let tail = 0
  const result: number[] = []

  for (let index = 0; index < values.length; index += 1) {
    while (head < tail && deque[head]! <= index - size) head += 1
    while (head < tail && values[deque[tail - 1]!]! <= values[index]!) tail -= 1
    deque[tail++] = index
    if (index >= size - 1) result.push(values[deque[head]!]!)
  }
  return result
}
```

尾部比新值小或相等的索引可删除：新索引更晚过期且不小，旧索引永不再成为最大值。每个索引最多入队、出队一次，时间 O(n)，Deque 空间 O(k)，输出 O(n-k+1)。用头尾索引避免 `shift()` 的移动成本。

可变长度窗口（如最短子数组）不一定用单调队列；通常维护 `[left,right)` 及窗口统计，何时收缩由单调条件决定。包含负数时“和只会随扩张增大”的前提失效，普通双指针不能直接用。

## 原地索引：缺失的第一个正整数

长度 n 的数组，第一个缺失正整数一定在 `[1,n+1]`。可以把值 x 放到索引 x-1，形成数组自身的哈希表：

```ts
function firstMissingPositive(values: number[]): number {
  for (let i = 0; i < values.length; i += 1) {
    while (
      Number.isInteger(values[i]) &&
      values[i]! >= 1 &&
      values[i]! <= values.length &&
      values[values[i]! - 1] !== values[i]
    ) {
      const target = values[i]! - 1
      ;[values[i], values[target]] = [values[target]!, values[i]!]
    }
  }

  for (let i = 0; i < values.length; i += 1) {
    if (values[i] !== i + 1) return i + 1
  }
  return values.length + 1
}
```

while 而非 if，因为交换来的新值也可能需要归位。重复值判断避免两个相同数字无限交换。每次成功交换至少把一个合法值放到最终位置，总交换 O(n)，扫描 O(n)，额外空间 O(1)，但会修改输入。

## 数组切片、分块与扁平化的边界

`slice(start,end)` 返回新数组且不含 end；`splice(start,count,...items)` 修改原数组。`substr` 已废弃，字符串使用 slice/substring。分块应拒绝非法 size，不能 size<=0 时悄悄返回整个数组：

```ts
function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) throw new RangeError('size must be positive')
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}
```

这是 O(n) 时间和 O(n) 输出。无限深扁平化要考虑循环引用和极深嵌套；内建 `flat(Infinity)` 对普通 JSON 风格数组足够，通用图结构需要 visited。

## 正确性验证

为优化算法保留简单 oracle：twoSum 与双循环结果比较；三数和将结果规范化为字符串 Set 与 O(n³) 小规模枚举比较；滑动窗口与每窗 `Math.max` 比较；firstMissingPositive 与 Set 扫描比较。属性测试随机生成小数组可覆盖重复、负数、全相等、空和边界。

| 算法 | 特别边界 |
| --- | --- |
| twoSum | 0 下标、重复值、无解、负数 |
| merge | m/n 为 0、全部一侧更小、重复值、容量不足 |
| threeSum | 全 0、重复三元组、输入不可修改、超大整数 |
| window max | k=1、k=n、非法 k、相等最大值 |
| missing positive | 重复、负数、1..n 完整、非整数输入策略 |

数组算法的共通能力是把一个扫描状态写成不变量：Map 里是哪些位置、指针外哪些候选已排除、窗口区间是否含端点、原地位置代表什么。只有能说明移动为何安全，模板才真正成为方法。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
