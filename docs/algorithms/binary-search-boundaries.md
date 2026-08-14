---
title: 二分查找的边界、不变量与答案空间
description: 从“第一个满足条件的位置”推导左右边界模板，解释循环不变量、终止条件和答案空间二分。
category: algorithms
part: 查找与字符串
chapter: 17
tags:
  - 二分查找
  - TypeScript
prerequisites:
  - 数组与复杂度基础
outcomes:
  - 能从不变量写出四类边界
  - 能判断何时对答案空间二分
practice:
  type: implementation
  result: 实现并测试四种二分边界
  verify:
    - 空数组、重复值和越界目标均通过
    - 每轮搜索区间严格缩小
evidence: public-source
updated: 2026-08-11
---

# 二分查找的边界、不变量与答案空间

数组 `[1, 2, 2, 2, 5]` 中，普通二分找到任意一个 `2` 并不难。真正容易写错的是“第一个 `2`”“最后一个 `2`”以及“第一个大于 `2` 的位置”。这些问题不是记忆四套模板，而是维护不同的搜索区间不变量。

本篇固定使用左闭右开区间 `[left, right)`。它允许空区间用 `left === right` 表示，数组尾后位置也能自然成为答案。输入必须具有单调性；没有单调谓词时，二分只会更快地得到错误答案。

## 从单调谓词开始

把数组值隐藏起来，只看谓词 `value >= target`，结果会形成一串 `false` 后接一串 `true`。寻找第一个 `true` 就是 lower bound。循环中维护两个事实：`left` 左侧全部确定为 `false`，`right` 及其右侧全部确定为 `true`；未决区间只有 `[left, right)`。

| 状态 | 已知范围 | 未决范围 |
| --- | --- | --- |
| 初始 | 两侧都为空 | `[0, length)` |
| 谓词为真 | `mid` 可以是答案 | `[left, mid)` |
| 谓词为假 | `mid` 不可能是答案 | `[mid + 1, right)` |
| 终止 | `left === right` | 第一个真位置 |

`mid` 使用 `left + Math.floor((right - left) / 2)`。JavaScript 数组长度达不到传统整数溢出的典型规模，但这种写法直接表达“在当前区间取中点”，也能迁移到定长整数语言。

## 写出一个通用边界函数

下面的输入是数组长度和单调谓词，输出是第一个满足谓词的索引；若不存在，返回 `length`。谓词必须满足“一旦为真，后续始终为真”，函数无法替调用者验证这个前提。

```ts
function firstTrue(length: number, predicate: (index: number) => boolean): number {
  let left = 0
  let right = length

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2)
    if (predicate(middle)) {
      // middle 可能是第一个真值，不能把它排除
      right = middle
    } else {
      // middle 已确定为假，下一轮从 middle + 1 开始
      left = middle + 1
    }
  }

  return left
}

function lowerBound(values: number[], target: number): number {
  return firstTrue(values.length, index => values[index] >= target)
}

function upperBound(values: number[], target: number): number {
  return firstTrue(values.length, index => values[index] > target)
}
```

每轮不是执行 `right = middle - 1`，因为右边界本来就不属于区间。谓词为真时保留 `middle`，为假时排除 `middle`。区间长度严格缩小，所以终止性不依赖“感觉差不多”。`lowerBound` 与 `upperBound` 的唯一区别是谓词中的等号。

第一个等于目标的位置需要检查 `values[index] === target`；最后一个等于目标的位置是 `upperBound - 1`，也必须检查索引合法。边界函数返回插入位置，调用方再决定“不存在”是返回 `-1`、抛错还是插入新值。

## 手算重复值的执行轨迹

对 `[1, 2, 2, 2, 5]` 求 `lowerBound(2)`：初始 `[0, 5)`，中点 2 满足条件，缩为 `[0, 2)`；中点 1 满足条件，缩为 `[0, 1)`；中点 0 不满足，缩为 `[1, 1)`，答案为 1。

同一数组求 `upperBound(2)`：中点 2 不满足 `value > 2`，缩为 `[3, 5)`；中点 4 满足，缩为 `[3, 4)`；中点 3 不满足，得到 4。于是最后一个 `2` 在 `4 - 1 = 3`。

这条轨迹也解释了为什么“遇到相等就返回”不能求边界：相等只说明当前点是候选，左侧或右侧仍可能存在更靠近边界的候选。

## 从有序数组迁移到答案空间

二分不要求输入一定是数组，只要求候选答案有顺序，并能构造单调判定。假设要在 `days` 天内运完包裹，给定运力 `capacity` 可以线性判断是否可行。容量越大越容易可行，于是可行性同样是 `false...true`。

搜索下界是最重包裹，保证单个包裹能装下；上界取总重量，保证一天可以运完。`firstTrue` 的思想不变，只是索引换成数值区间。复杂度是 `O(n log S)`，其中 `S` 是答案范围，不应误写成 `O(log n)`。

## 反例、测试与排查

至少覆盖空数组、单元素、全部相等、目标小于最小值、目标大于最大值和不存在但位于中间的情况。测试还应记录每轮新区间长度小于旧长度，这能直接抓出 `left = middle` 导致的死循环。

```ts
const samples = [
  { values: [], target: 2, lower: 0, upper: 0 },
  { values: [2], target: 2, lower: 0, upper: 1 },
  { values: [2, 2, 2], target: 2, lower: 0, upper: 3 },
  { values: [1, 3, 5], target: 0, lower: 0, upper: 0 },
  { values: [1, 3, 5], target: 4, lower: 2, upper: 2 },
  { values: [1, 3, 5], target: 8, lower: 3, upper: 3 }
]

for (const sample of samples) {
  console.assert(lowerBound(sample.values, sample.target) === sample.lower)
  console.assert(upperBound(sample.values, sample.target) === sample.upper)
}
```

这些断言验证的是边界语义，不只是“找到了某个值”。若结果总偏一位，先写出区间是闭还是开、`middle` 是否仍可能为答案、返回值是否允许等于长度。若谓词会从真变回假，则应停止使用二分，先修正建模。

面试继续追问时，重点不是背模板，而是现场声明不变量、证明每个分支不丢答案、说明终止条件，并给出不存在目标时的返回契约。

## 四种边界如何由谓词统一

把排序数组问题改写成单调谓词 `P(i)`：`false...false,true...true`。`lowerBound` 求第一个 true，`upperBound` 求第一个 `value > target` 的 true；等值范围是 `[lowerBound, upperBound)`。循环保持“答案在 [left,right) 或已由 answer 表示”，每次把不可能区间排除，终止时 left/right 相遇即为边界。

答案空间二分只要求答案可行性关于 x 单调，不要求数组中存在 x。例如最小容量、最短时间和最大最小值都可以定义 `can(x)`，再二分最小 true。若 `can` 内部贪心不正确，二分只会稳定地返回错误答案；先用暴力小样本验证谓词。

复杂度是 `O(log n)` 次谓词调用，迭代版本空间 O(1)。空数组、重复元素、NaN 和比较器违反传递性都属于输入契约，不能用边界模板掩盖。

实现依据可以和 [CP-Algorithms 的 Binary Search 说明](https://cp-algorithms.com/num_methods/binary_search.html) 以及 [MDN 的 `findIndex` 参考](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) 对照。这里的断言仍以本文定义的边界契约为准：来源解释通用算法，测试负责确认当前实现的闭开区间和返回值。
