---
title: "动态规划"
description: "从重叠子问题和状态转移建立可复用的求解模型。"
category: frontend
tags: ["动态规划", "TypeScript"]
updated: 2026-08-04
order: 250
depth: reference
series: "算法与数据结构"
---
# 动态规划

动态规划不是“看到最值就建 dp 数组”。它适用于问题能由重叠子问题组成，且某状态的最优/计数只依赖更小状态。完整设计包括：状态含义、转移、基线、计算顺序、答案位置和不可达表示。空间压缩只有在旧状态不再被需要且更新方向不污染依赖时才正确。

## 从 Fibonacci 看 memo 与表格

朴素递归重复计算相同 n，指数增长。自顶向下 memo：

```ts
function fibonacci(n: number, memo = new Map<number, bigint>()): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('invalid n')
  if (n < 2) return BigInt(n)
  const cached = memo.get(n)
  if (cached !== undefined) return cached
  const value = fibonacci(n - 1, memo) + fibonacci(n - 2, memo)
  memo.set(n, value)
  return value
}
```

每状态一次 O(n)，memo 与栈 O(n)。只需最终值时自底向上保留前两项 O(1) 空间。Number 在 n=79 前后已超安全整数，计数用 BigInt。

## 状态设计检查表

以“爬 n 阶，每次 1/2 步”举例：`dp[i]` 表示到达第 i 阶的方案数；最后一步来自 i-1 或 i-2，转移相加；`dp[0]=1` 表示空路径，答案 dp[n]；i 从小到大确保依赖已算。

如果状态定义成“从 i 出发到终点”，循环顺序和基线会不同。状态句子必须包含下标每一维含义，不能只写公式。

## 机器人网格路径

无障碍 m×n 网格路径数，`dp[c]` 在处理当前行 c 前是上方路径数，更新后加左方：

```ts
function uniquePaths(rows: number, columns: number): bigint {
  if (rows <= 0 || columns <= 0) return 0n
  const dp = new Array<bigint>(columns).fill(1n)
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      dp[column] = dp[column]! + dp[column - 1]!
    }
  }
  return dp[columns - 1]!
}
```

时间 O(rc)，空间 O(c)。有障碍时障碍位置设 0，其他仍上+左；更新顺序左到右保证 `dp[c-1]` 已是当前行。

## 01 背包：更新方向表达“只能一次”

n 件物品，每件 weight/value，只能选 0/1 次，容量 C。`dp[c]` 表示处理过的物品在容量 c 下最大价值。对每件物品容量必须从大到小：

```ts
function knapsack01(
  weights: readonly number[],
  values: readonly number[],
  capacity: number
): number {
  if (weights.length !== values.length) throw new RangeError('length mismatch')
  const dp = new Array<number>(capacity + 1).fill(0)

  for (let item = 0; item < weights.length; item += 1) {
    const weight = weights[item]!
    const value = values[item]!
    if (!Number.isInteger(weight) || weight <= 0) throw new RangeError('invalid weight')
    for (let current = capacity; current >= weight; current -= 1) {
      dp[current] = Math.max(dp[current]!, dp[current - weight]! + value)
    }
  }
  return dp[capacity]!
}
```

倒序使 `dp[current-weight]` 仍是未使用当前物品的上一轮状态。若正序，同一物品刚更新的值会再次被使用，变成完全背包。时间 O(nC)，空间 O(C)；C 是数值容量，按输入位数看这是伪多项式。

若价值可负且必须恰好装满，初始化不能全 0；用 `-Infinity` 表不可达，dp[0]=0。状态/目标改变会改变基线。

## 不相邻元素最大和

`dp[i]` 为前 i 个元素最大和：不选第 i 个取 dp[i-1]，选则 dp[i-2]+value。空间压缩：

```ts
function maxNonAdjacentSum(values: readonly number[]): number {
  let twoBack = 0
  let oneBack = 0
  for (const value of values) {
    const current = Math.max(oneBack, twoBack + value)
    twoBack = oneBack
    oneBack = current
  }
  return oneBack
}
```

这里允许不选任何元素，所以全负返回 0。若题目要求至少选一个，基线必须改变。空间压缩前先写二维/一维完整状态更容易证明。

## 最长递增子序列

O(n²) DP：`dp[i]` 是以 i 结尾的 LIS 长度，检查所有 j<i 且 values[j]<values[i]。答案 max dp，不一定在末尾。

O(n log n) patience 方法维护 `tails[length-1]` 为该长度递增子序列的最小可能尾值：

```ts
function lisLength(values: readonly number[]): number {
  const tails: number[] = []
  for (const value of values) {
    let left = 0
    let right = tails.length
    while (left < right) {
      const middle = left + Math.floor((right - left) / 2)
      if (tails[middle]! < value) left = middle + 1
      else right = middle
    }
    tails[left] = value
  }
  return tails.length
}
```

tails 不是实际 LIS 序列，只保存最优尾。严格递增用 lower_bound（第一个 >= value）；非递减要 upper_bound（第一个 > value）。要重建序列需 parent 和位置数组。

## 最长公共子序列

`dp[i][j]` 是 left 前 i、right 前 j 的 LCS。字符相等 `1+dp[i-1][j-1]`，否则 max 上/左。时间 O(mn)，空间可压到 O(min(m,n))；若要重建，需要完整决策或更复杂分治。

字符串单位同样需定义，JS 下标是 UTF-16；题目若按 Unicode code point，先 Array.from。

## 最少硬币

任意硬币系统用贪心取最大面额不总正确，例如 `[1,3,4]` 凑 6，贪心得 4+1+1 三枚，最优 3+3 两枚。完全背包 DP：dp[0]=0，其余 Infinity；对 amount 从 coin 到 target 正序允许重复使用。

```ts
function minimumCoins(coins: readonly number[], target: number): number {
  const dp = new Array<number>(target + 1).fill(Infinity)
  dp[0] = 0
  for (const coin of coins) {
    if (!Number.isInteger(coin) || coin <= 0) throw new RangeError('invalid coin')
    for (let amount = coin; amount <= target; amount += 1) {
      dp[amount] = Math.min(dp[amount]!, dp[amount - coin]! + 1)
    }
  }
  return Number.isFinite(dp[target]) ? dp[target]! : -1
}
```

若求组合数，外层 coin 可避免排列重复；若求排列数，外层 amount。循环顺序编码计数语义，不是性能细节。

## 区间 DP 与状态爆炸

矩阵链、回文子串等状态可能是区间 `[left,right]`，需按区间长度递增。多维 DP 状态数量是各维乘积，先估算内存；`n=10,000` 的 n² 表不可行。可利用稀疏状态、滚动数组、算法优化或改变问题。

Memo key 若用字符串拼接要避免歧义和高开销；嵌套 Map/整数编码更稳。递归 memo 仍有深度风险，自底向上更可控但可能计算不需要状态。

## 正确性证明

通常用归纳：基线正确；假设所有依赖状态最优；转移枚举最后决策的所有互斥可能，并取最优/求和，因此当前状态正确。还要证明计算顺序保证依赖已完成，空间压缩没有覆盖仍需旧值。

## 验证

每个优化 DP 与小规模暴力/回溯 oracle 比较：01 背包枚举子集，LIS 枚举子序列，硬币 BFS/枚举。覆盖 0、空、不可达、全负、重复、容量边界和大计数溢出。

做 mutation：01 背包改正序应被“单件不能重复”用例抓到；硬币贪心反例必须存在；LIS 把 `<` 改 `<=` 应被重复值抓到；空间压缩调整赋值顺序应失败。DP 的深度体现在状态含义和转移证明，而不是表格数量。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
