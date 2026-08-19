---
title: "递归与回溯思维"
description: "把选择、约束、撤销抽象为可验证的搜索树。"
category: frontend
tags: ["递归", "回溯", "TypeScript"]
updated: 2026-08-05
order: 240
depth: reference
series: "算法与数据结构"
---
# 递归与回溯思维

回溯在一棵隐式搜索树上做深度优先遍历。每个节点表示当前路径状态，边表示一次选择；进入子节点前应用选择，返回后撤销，使兄弟分支看到相同的父状态。

## 排列问题的状态

给定互不相同的 values，生成所有排列。状态由 path 和 used 组成：path 保存已选顺序，used[index] 表示该输入位置是否已在当前路径。

~~~ts
function permutations<T>(values: readonly T[]): T[][] {
  const result: T[][] = []
  const path: T[] = []
  const used = new Array<boolean>(values.length).fill(false)

  const search = (): void => {
    if (path.length === values.length) {
      result.push([...path])
      return
    }

    for (let index = 0; index < values.length; index += 1) {
      if (used[index]) continue

      used[index] = true
      path.push(values[index])
      search()
      path.pop()
      used[index] = false
    }
  }

  search()
  return result
}
~~~

进入 search 时，path 与 used 表示同一组选中位置，且没有位置重复。递归返回后必须执行两次撤销，让下一轮循环恢复父节点状态。忘记复制 path 会让 result 中所有项指向同一个数组。

## 重复值需要同层去重

输入含重复值时，按位置 used 仍会生成重复排列。先排序，在同一层跳过与前一个值相等且前一个位置尚未使用的候选。

~~~ts
function uniquePermutations(values: readonly number[]): number[][] {
  const sorted = [...values].sort((a, b) => a - b)
  const result: number[][] = []
  const path: number[] = []
  const used = new Array<boolean>(sorted.length).fill(false)

  const search = (): void => {
    if (path.length === sorted.length) {
      result.push([...path])
      return
    }

    for (let index = 0; index < sorted.length; index += 1) {
      if (used[index]) continue
      if (
        index > 0 &&
        sorted[index] === sorted[index - 1] &&
        !used[index - 1]
      ) {
        continue
      }

      used[index] = true
      path.push(sorted[index])
      search()
      path.pop()
      used[index] = false
    }
  }

  search()
  return result
}
~~~

条件中的 `!used[index - 1]` 表示前一个相等值不在当前路径，两个相等候选正在竞争同一层位置，只保留第一个。若前一个已在路径中，当前值位于更深层，是合法选择。

## 组合与子集改变候选范围

排列每层都能选择任意未使用位置。组合不关心顺序，可以传入 start，让下一层只看更后位置。子集在每个节点都能输出当前 path，不必等到固定长度。

状态设计先回答“顺序是否重要、元素能否重复使用、答案何时完成”。模板中的循环起点和 used 只是这些答案的编码。

## 剪枝必须有单调前提

求和组合中，若候选全为正数且已排序，当前和超过目标后，继续添加只会更大，可以停止分支。存在负数时，这个剪枝不成立；后续负数可能把和拉回目标。

剪枝要写成可证明的必要条件，不能因为某批样例通过就保留。启发式排序可以让更早命中，但不应删除潜在答案。

## 输出规模是复杂度的一部分

n 个不同元素有 `n!` 个排列，算法至少要花与输出规模同阶的时间和空间。无法靠局部优化把完整枚举降成多项式。只需要第 k 个、计数或判断存在性时，应改写问题，避免生成所有结果。

深度 n 的递归还受调用栈限制。大搜索需要显式栈、生成器、取消信号、节点预算和分批输出。

## 用穷举和不变量验证

检查每个结果长度、元素多重集合、无重复结果和输出数量。对短输入与集合参考实现比较，覆盖空数组、单元素、全重复和部分重复。搜索中可在调试模式断言 `path.length === used.filter(Boolean).length`，让撤销错误在发生位置暴露。
