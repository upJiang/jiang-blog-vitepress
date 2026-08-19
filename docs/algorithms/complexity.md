---
title: "复杂度分析"
description: "用时间和空间增长率评估算法，而不是只比较一次运行耗时。"
category: frontend
tags: ["复杂度", "TypeScript"]
updated: 2026-08-05
order: 110
depth: reference
series: "算法与数据结构"
---
# 复杂度分析

复杂度描述输入规模增长时，时间或额外空间怎样增长。它不预测某台机器的毫秒数，也不替代基准测试。先定义输入规模，再建立成本模型，才有资格写 `O(n)`。

## n 必须对应问题输入

在数组扫描中，n 通常是元素个数；图算法常同时使用顶点数 V 和边数 E；字符串算法还要说明按 UTF-16 码元、Unicode 码点还是用户字形计数。

~~~ts
function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}
~~~

循环执行 n 次，每次做常数个模型操作，因此时间上界是 `O(n)`，额外空间是 `O(1)`。返回值和输入数组通常不计入额外空间，若题目要求总空间则要改口径。

## Big O 表示上界增长

Big O 忽略常数和低阶项。函数执行 `3n + 20` 个基本操作时，可以写成 `O(n)`。这不代表 3 和 20 在真实运行里没有成本，只表示 n 足够大时，线性项控制增长趋势。

Big Theta 描述同阶上下界，Big Omega 描述下界。工程文章常用 Big O 统称复杂度，至少要说明讨论的是最坏、平均还是均摊上界。

~~~ts
function hasDuplicate(values: number[]): boolean {
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] === values[right]) return true
    }
  }
  return false
}
~~~

最坏情况比较约 `n(n - 1) / 2` 次，所以是 `O(n²)`。若前两个值重复，最好情况是常数时间。没有输入分布就不能声称平均情况更快。

## 循环嵌套要数总工作量

两层循环不一定都是 `O(n²)`。内层每次把问题减半，总次数可能是 `n log n`；两个指针各自只向前走，写成 while 嵌套也可能总共只移动 `O(n)` 次。

~~~ts
function lowerBound(values: number[], target: number): number {
  let left = 0
  let right = values.length

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2)
    if (values[middle] < target) left = middle + 1
    else right = middle
  }

  return left
}
~~~

每轮把候选区间至少缩小一半，经过 k 轮后剩余规模约为 `n / 2^k`。当它降到 1 时，k 约为 `log₂ n`，时间是 `O(log n)`。

## 递归先写规模变化

递归复杂度来自每层分支数、子问题规模和合并成本。二分查找可写成 `T(n) = T(n/2) + O(1)`，得到 `O(log n)`。归并排序是两个一半子问题，再做线性合并：`T(n) = 2T(n/2) + O(n)`，结果为 `O(n log n)`。

递归深度也是空间。即使函数没有创建数组，调用栈深度 n 仍是 `O(n)` 额外空间。JavaScript 引擎对深递归可能抛出 RangeError，规范不保证所有尾调用都被优化。

## 均摊分析解释偶发扩容

动态数组 append 通常是均摊 `O(1)`。容量耗尽时一次扩容要复制已有元素，但容量按倍数增长后，连续 n 次追加的总复制量仍为 `O(n)`。

均摊结论覆盖一个操作序列，不表示每次 append 都是常数时间。实时系统若不能接受偶发停顿，还要关注单次最坏延迟。

## 哈希结构的 O(1) 带有假设

Map 和 Set 的查找常按平均 `O(1)` 讨论，前提包括实现提供良好哈希与冲突处理。规范主要约束可观察行为，不要求某个固定底层结构。键的分布、内存和垃圾回收会改变常数。

同理，数组 `shift()` 通常需要移动或调整大量元素，频繁队首删除应使用头指针或环形队列。复杂度判断要结合语言运行时的真实数据结构。

## 基准测试验证常数与拐点

用多个规模运行同一实现，预热后重复采样，记录中位数和分位数。避免在计时区间打印日志、分配无关对象或混入网络。增长曲线与理论不符时，检查缓存、JIT、GC、输入分布和计时精度。

复杂度负责回答“规模扩大后会怎样”，基准负责回答“当前环境下有多快”。两份证据缺一不可。
