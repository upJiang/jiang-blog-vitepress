---
title: "排序算法"
description: "理解稳定性、比较器、归并排序和不同数据分布下的取舍。"
category: frontend
tags: ["排序", "TypeScript"]
updated: 2026-08-05
order: 190
depth: reference
series: "算法与数据结构"
---
# 排序算法

排序把元素按比较关系重新排列。实现前要确定比较器是否形成全序、是否要求稳定、能否修改输入、额外空间预算和数据分布。只说“用快排”缺少这些前提。

## 比较器必须一致

JavaScript 比较器返回负数、零或正数。它应满足自反、反对称、传递和对同一输入结果稳定。比较器矛盾时，任何排序算法都无法保证有意义的结果。

~~~ts
type RecordItem = {
  score: number
  createdAt: number
}

const compareRecord = (left: RecordItem, right: RecordItem): number =>
  right.score - left.score || left.createdAt - right.createdAt
~~~

数值减法遇到 NaN、Infinity 或超大整数要单独定义策略。字符串按用户语言排序应使用固定 locale 与 `Intl.Collator`，直接比较 UTF-16 码元不等于自然语言顺序。

## 归并排序的合并不变量

归并排序递归排序左右两半，再线性合并。合并时结果已经包含两个输入中所有确定较小的前缀，left 和 right 指向各自最小未处理元素。

~~~ts
function mergeSort<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
): T[] {
  if (values.length <= 1) return [...values]

  const middle = Math.floor(values.length / 2)
  const left = mergeSort(values.slice(0, middle), compare)
  const right = mergeSort(values.slice(middle), compare)
  const result: T[] = []

  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < left.length && rightIndex < right.length) {
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex])
      leftIndex += 1
    } else {
      result.push(right[rightIndex])
      rightIndex += 1
    }
  }

  return result
    .concat(left.slice(leftIndex))
    .concat(right.slice(rightIndex))
}
~~~

比较相等时先取左边，保留原相对顺序，因此实现稳定。若改成 `< 0`，相等元素会优先取右边，稳定性消失。

递推为 `T(n) = 2T(n/2) + O(n)`，时间 `O(n log n)`。此实现切片和结果数组使用 `O(n log n)` 总分配量，峰值辅助空间通常按 `O(n)` 讨论；常数可通过复用缓冲区降低。

## 快速排序依赖 pivot 与分区

快速排序把小于 pivot 和大于 pivot 的元素分到两侧，再递归。平均 `O(n log n)`，不良 pivot 可退化到 `O(n²)` 和深递归。随机 pivot、三数取中和三路分区能改善特定分布，不能消除全部最坏情况。

原地快排通常不稳定。需要稳定、多键排序或可预测最坏复杂度时，归并、堆排序或运行时内建实现可能更合适。

## 线性排序有更强前提

计数排序和基数排序可以绕开比较下界，但需要有限整数范围、可提取位或其他结构。键范围远大于 n 时，计数数组的空间不可接受。声称 `O(n)` 时必须把键范围或位数写进复杂度。

## JavaScript sort 的合同

现代 ECMAScript 要求 Array.prototype.sort 稳定，但默认比较会把值转换为字符串。数值排序必须传比较器。sort 会修改原数组；toSorted 返回新数组，兼容性取决于目标环境。

稀疏数组、undefined 和带副作用的 getter/comparator 会产生额外可观察行为。比较器中不要修改待排序数组，也不要依赖调用次数。

## 用性质而非固定样例测试

结果应满足有序性、元素多重集合守恒和长度不变。稳定算法还要给相等键元素附原始序号，断言序号递增。随机小数组与可信内建排序对比，覆盖空、单元素、重复、已排序、逆序、NaN 策略和大规模输入。
