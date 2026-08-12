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

朴素 Fibonacci 递归会反复计算同一个 `fib(4)`。动态规划把子问题结果保存起来，让每个状态只求一次。但“有递归就加 memo”还不够，完整设计要说明状态含义、转移、基线、计算顺序和答案位置。

本篇先用 Fibonacci 理解重叠子问题，再以 0/1 背包展示更新方向为什么决定“每件物品只能使用一次”。最后补充路径、LIS 和不可达状态的选择。

## 动态规划适用条件

问题可以由较小状态组成，同一状态会重复出现，并且状态包含决定未来所需的全部信息。求全部排列时输出本身巨大，DP 不能消除输出成本；求最优值、计数或可达性更常见。

```mermaid
flowchart LR
  M[定义 dp 状态] --> B[写基线]
  B --> T[列出最后一步转移]
  T --> O[确定计算顺序]
  O --> A[找到答案位置]
  A --> C[证明后再压缩空间]
```

## 步骤一：先用一句话定义状态

Fibonacci 的 `dp[i]` 表示第 i 项，依赖前两项。爬楼梯的 `dp[i]` 表示到达第 i 阶的方案数，`dp[0]=1` 表示空路径。相同公式可能因状态含义不同拥有不同基线。

网格路径的 `dp[r][c]` 表示到达单元格的方案数，来自上方和左方；障碍位置为 0。滚动成一维后，左到右更新保证 `dp[c]` 仍含上方旧值，`dp[c-1]` 已是当前行左值。

## 步骤二：0/1 背包从大到小更新

有 n 件物品，每件只有一次，容量为 C。`dp[c]` 表示处理过的物品在容量 c 下可获得的最大价值。处理当前物品时，选择不拿的旧 `dp[c]`，或拿它的 `dp[c-weight] + value`。

```ts
function knapsack01(
  weights: readonly number[],
  values: readonly number[],
  capacity: number
): number {
  if (weights.length !== values.length) throw new Error('LENGTH_MISMATCH')
  const dp = new Array(capacity + 1).fill(0)

  for (let item = 0; item < weights.length; item += 1) {
    const weight = weights[item]!
    const value = values[item]!
    for (let current = capacity; current >= weight; current -= 1) {
      dp[current] = Math.max(
        dp[current]!,
        dp[current - weight]! + value
      )
    }
  }
  return dp[capacity]!
}
```

容量倒序，使 `dp[current-weight]` 仍来自未使用当前物品的上一轮。若正序，刚更新的值会再次被读取，同一物品可重复使用，问题就变成完全背包。时间 O(nC)，空间 O(C)；C 是数值容量，因此按输入位数看属于伪多项式。

## 步骤三：基线与不可达状态随目标变化

当前实现允许不选任何物品，所以初始全 0。若价值可负且要求恰好装满，除 `dp[0]=0` 外要用 `-Infinity` 表示不可达，否则不存在的组合会被当成价值 0。

最少硬币使用 `Infinity` 表示不可达；完全背包容量正序允许同一硬币重复。若求组合数，外层遍历硬币可避免顺序重复；求排列数则外层遍历金额。循环顺序编码题意，不只是性能细节。

## 步骤四：空间压缩前先证明依赖

不相邻最大和只依赖前一个和前两个状态，可以保留两个变量。LCS 依赖二维上、左、左上，可压成一行，但更新方向与暂存值要保持旧左上。需要重建具体方案时，还要保存 parent/决策，不能只返回最优值。

LIS 的 O(n²) DP 定义 `dp[i]` 为以 i 结尾的最长长度，答案是所有 dp 最大值，不一定在最后。O(n log n) 的 tails 方法维护每种长度最小尾值，tails 本身不一定是一条真实 LIS；重建需要额外前驱。

## 验证与证明

用归纳证明：基线正确；假设依赖状态正确；转移枚举最后决策的所有互斥可能，因此当前状态正确。还要证明计算顺序已计算依赖，空间压缩没有覆盖仍要使用的旧值。

小规模用暴力子集对照 0/1 背包，故意把容量改为正序，单件不能重复的用例应失败。边界覆盖容量 0、空物品、不可达、全负、重复值和大计数溢出。

## 参考资料

- [Open Data Structures](https://opendatastructures.org/)
- [MIT 6.006 Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/)
- [VisuAlgo DP](https://visualgo.net/en/recursion)
