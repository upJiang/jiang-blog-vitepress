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

二分查找依赖单调谓词：候选区间里，一段位置让谓词为 false，之后全部为 true。算法寻找第一个 true。精确查值、lower bound、upper bound 和“最小可行答案”都可以由这一个边界模型得到。

## 使用左闭右开区间

令搜索区间为 `[left, right)`。循环开始时维持：

- `[0, left)` 全部已知为 false。
- `[right, n)` 全部已知为 true。
- 答案仍位于 `[left, right]` 的边界上。

~~~ts
function firstTrue(
  length: number,
  predicate: (index: number) => boolean,
): number {
  let left = 0
  let right = length

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2)

    if (predicate(middle)) right = middle
    else left = middle + 1
  }

  return left
}
~~~

middle 属于当前非空区间。谓词为 true 时，middle 可能就是答案，保留它并收缩 right；为 false 时，middle 及其左侧都能排除，所以 left 变成 middle + 1。区间长度每轮严格减小，最终 left 等于 right。

返回 length 表示整个范围没有 true，这个哨兵结果必须由调用方处理。
## lowerBound 与 upperBound 只差谓词

~~~ts
function lowerBound(values: number[], target: number): number {
  return firstTrue(values.length, (index) => values[index] >= target)
}

function upperBound(values: number[], target: number): number {
  return firstTrue(values.length, (index) => values[index] > target)
}
~~~

lowerBound 返回第一个大于等于 target 的位置，upperBound 返回第一个严格大于 target 的位置。重复值区间是 `[lowerBound, upperBound)`，出现次数为两者之差。

精确查找不能只检查返回位置，还要确认位置小于长度且值等于 target。
## 手算重复值暴露边界错误

对 `[1, 2, 2, 2, 4]` 查 lowerBound(2)：

~~~text
[0,5) middle=2 true  -> [0,2)
[0,2) middle=1 true  -> [0,1)
[0,1) middle=0 false -> [1,1)
~~~

结果为 1。若 true 分支写成 `right = middle - 1`，会把候选 middle 错误丢弃；若 false 分支写成 `left = middle`，区间长度可能不变而死循环。
## 答案空间也能二分

假设有函数 `canFinish(limit)`，limit 越大越容易满足。寻找最小可行 limit 时，对整数范围应用相同 first-true 模型。

~~~ts
function minimumFeasible(
  low: number,
  highExclusive: number,
  feasible: (value: number) => boolean,
): number | null {
  let left = low
  let right = highExclusive

  while (left < right) {
    const middle = left + Math.floor((right - left) / 2)
    if (feasible(middle)) right = middle
    else left = middle + 1
  }

  return left < highExclusive && feasible(left) ? left : null
}
~~~

调用前要证明 feasible 单调，并保证 highExclusive 覆盖可能答案。若上界未知，可以先指数扩张，但要设置数值和调用预算。
## 数值边界会破坏实现

JavaScript Number 在安全整数外无法逐一表示相邻整数。超大整数答案空间应使用 BigInt 版本，并避免 Number 与 BigInt 混算。浮点谓词可能受舍入影响而在边界附近来回变化，通常改用固定迭代次数、误差区间或整数缩放。
## 用性质测试覆盖边界

随机生成有序数组和 target，与线性扫描结果比较 lower/upper bound。断言返回位置左侧不满足谓词、返回位置及右侧满足谓词。覆盖空数组、全 false、全 true、重复值、首尾命中和安全整数边缘。

二分正确性来自区间不变量与单调性。记住某个 while 模板只能减少手误，不能替代这两个证明。
