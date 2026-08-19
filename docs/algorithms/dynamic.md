---
title: "动态规划"
description: "从重叠子问题和状态转移建立可复用的求解模型。"
category: frontend
tags: ["动态规划", "TypeScript"]
updated: 2026-08-05
order: 250
depth: reference
series: "算法与数据结构"
---
# 动态规划

动态规划适用于可由较小重叠子问题组成、且局部最优状态足以决定后续的优化问题。实现前先定义状态含义、转移、初始值和计算顺序；数组只是保存这些结论的工具。

## 0/1 背包的状态

给定每件物品的重量和价值，每件最多选一次，容量为 C。定义 `dp[c]` 为“处理完当前前缀物品后，容量不超过 c 能取得的最大价值”。

~~~ts
type Item = {
  weight: number
  value: number
}

function knapsack(items: readonly Item[], capacity: number): number {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new RangeError('capacity must be a non-negative integer')
  }

  const dp = new Array<number>(capacity + 1).fill(0)

  for (const item of items) {
    if (!Number.isInteger(item.weight) || item.weight <= 0) {
      throw new RangeError('weight must be a positive integer')
    }

    for (let current = capacity; current >= item.weight; current -= 1) {
      dp[current] = Math.max(
        dp[current],
        dp[current - item.weight] + item.value,
      )
    }
  }

  return dp[capacity]
}
~~~

处理 item 时，每个容量有两个选择：不选它，保留 `dp[current]`；选它，使用处理上一批物品时的 `dp[current - weight]` 加当前价值。
## 容量必须从大到小更新

一维数组覆盖了二维状态的“物品维度”。从大到小更新时，读取的较小容量位置尚未被当前物品修改，因此每件物品最多使用一次。

若从小到大更新，`dp[current - weight]` 可能已经包含当前物品，算法变成完全背包，允许重复选择。循环方向承担了题目合同，不能当成代码风格。
## 初始值取决于“最多”还是“恰好”

当前定义允许容量不装满，所以所有 `dp[c]` 初始为 0 合理。若题目要求恰好装满，除 `dp[0] = 0` 外，其他状态应标为不可达，例如 `-Infinity`，转移时只从可达状态出发。

负价值也会影响合同。允许不选任何物品时，最大价值至少为 0；必须选择至少一件时，需要增加选择状态或改变基线。
## 从递归发现重叠子问题

直接递归可以定义：

~~~text
best(i, c) =
  max(best(i - 1, c),
      best(i - 1, c - weight[i]) + value[i])
~~~

同一 `best(i, c)` 会被多个路径重复计算。记忆化自顶向下只计算访问到的状态，表格自底向上按依赖顺序计算全部状态。两者时间上界都是状态数乘每个状态转移成本。

0/1 背包有 `n(C + 1)` 个二维状态，因此时间 `O(nC)`。这是伪多项式复杂度，C 的数值可能远大于输入中表示 C 所需的位数。
## 空间压缩会丢掉恢复路径

一维 dp 只保存最优值，无法直接列出选了哪些物品。需要恢复方案时，可以保留二维表，或额外记录每次状态改善的来源。重复价值和并列最优还要定义返回哪一组。
## 动态规划不是看到“最优”就套用

状态若遗漏影响未来的历史，转移会把不可等价的路径合并。比如带路径依赖折扣、重复使用限制或多个资源维度时，要把足以决定未来的变量加入状态，状态空间也会随之扩大。

验证时用小 n 穷举所有子集，与 dp 结果随机对比。覆盖容量 0、空物品、物品过重、重复重量、零或负价值，并对每轮更新检查 `dp[c]` 的状态含义。
