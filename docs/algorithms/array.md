---
title: "数组、哈希与双指针"
description: "从两数之和开始，理解数组扫描、Map 查找和双指针移动为什么不会漏掉答案。"
category: frontend
tags: ["数组", "双指针", "TypeScript"]
updated: 2026-08-05
order: 120
depth: reference
series: "算法与数据结构"
---
# 数组、哈希与双指针

给定整数数组和目标值，返回两个不同下标，使对应元素之和等于目标。这个问题可以用双循环、哈希表或有序数组双指针解决。三种方法依赖的前提不同，不能只记一个 Map 模板。

## 先固定输入合同

假设输入允许负数和重复值，每个下标最多使用一次，存在多个答案时返回首次找到的一组，没有答案返回 `null`。合同改变后，算法的返回与去重策略也要调整。

~~~ts
type Pair = readonly [number, number]

function twoSumBrute(values: number[], target: number): Pair | null {
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] + values[right] === target) return [left, right]
    }
  }
  return null
}
~~~

双循环枚举所有无序下标对，不会重复使用同一元素。时间 `O(n²)`，额外空间 `O(1)`，适合作为测试参考实现。

## 哈希表保存已经确认的前缀

扫描到当前值 x 时，需要寻找 `target - x`。Map 保存之前元素的值到下标，先查再写，可以避免当前元素与自己配对。

~~~ts
function twoSum(values: number[], target: number): Pair | null {
  const indexByValue = new Map<number, number>()

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const needed = target - value
    const partner = indexByValue.get(needed)

    if (partner !== undefined) return [partner, index]
    if (!indexByValue.has(value)) indexByValue.set(value, index)
  }

  return null
}
~~~

循环开始时的不变量是：Map 只包含区间 `[0, index)` 中看过的值。若 needed 命中，两个下标必然不同；若未命中，当前 index 不能与任何已扫描元素组成答案，写入后不变量继续成立。

不能用 `if (partner)` 判断命中，因为下标 0 是 falsy。使用 `has` 或明确比较 undefined。

## 重复值暴露写入顺序

输入 `[3, 3]`，target 为 6。若先把当前 3 写进 Map 再查询，就可能取回自己。先查询后写入会在第二个 3 到来时命中第一个下标。

Map 保存首个还是最后一个下标影响多解时的返回顺序。合同若要求全部答案，需要把值映射到下标列表，并处理输出规模可能达到 `O(n²)`。

## 有序数组可以丢弃一侧

若只要值对且数组已经有序，左右指针从两端开始。和太小时增加 left，和太大时减少 right。

~~~ts
function twoSumSorted(values: number[], target: number): Pair | null {
  let left = 0
  let right = values.length - 1

  while (left < right) {
    const sum = values[left] + values[right]
    if (sum === target) return [left, right]
    if (sum < target) left += 1
    else right -= 1
  }

  return null
}
~~~

当 sum 小于 target 时，当前最小值与当前最大值都不够大。它和任何更小的右端值相加也不会成功，所以可以安全丢弃 left。另一方向同理。每个指针最多移动 n 次，时间 `O(n)`，空间 `O(1)`。

原数组无序时先排序会丢失原下标。可以排序 `{ value, index }` 记录，成本变成 `O(n log n)` 和 `O(n)` 空间。

## 双指针需要单调性

左右指针成立依赖有序和加法的单调关系。换成乘积、绝对值、浮点 NaN 或存在溢出的整数环境，移动证明要重新写。JavaScript Number 还要考虑安全整数与浮点误差，金额和大整数输入应使用明确协议。

## 用参考实现做随机验证

生成短数组和目标值，将 Map 与双指针实现结果交给校验器：下标不同、范围合法、值之和正确。没有答案时，与双循环参考实现比较。

~~~ts
function isValid(values: number[], target: number, pair: Pair | null): boolean {
  if (pair === null) return twoSumBrute(values, target) === null
  const [left, right] = pair
  return left !== right &&
    left >= 0 && right >= 0 &&
    left < values.length && right < values.length &&
    values[left] + values[right] === target
}
~~~

边界至少覆盖空数组、单元素、重复值、负数、多个答案、下标 0 和安全整数边缘。
