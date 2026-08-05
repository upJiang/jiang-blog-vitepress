---
title: "递归与回溯思维"
description: "把选择、约束、撤销抽象为可验证的搜索树。"
category: frontend
tags: ["递归", "回溯", "TypeScript"]
updated: 2026-08-04
order: 240
depth: reference
series: "算法与数据结构"
---
# 递归与回溯思维

递归是函数用更小同类问题定义自身；回溯是在搜索树中做选择、进入下一层、撤销选择。模板不是三行 `push/dfs/pop`，真正需要定义：状态代表什么、候选集合如何生成、叶子条件、哪些选择冲突、剪枝为何安全，以及输出规模本身有多大。

## 递归三要素

1. 函数返回/修改的状态语义；
2. 基线条件能直接求解；
3. 每次调用严格接近基线。

```ts
function factorial(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be non-negative integer')
  return n <= 1 ? 1n : BigInt(n) * factorial(n - 1)
}
```

递推 `T(n)=T(n-1)+O(1)`，栈 O(n)。Number factorial 很快溢出安全整数，示例用 BigInt；大 n 仍应迭代避免栈溢出。递归必须有输入域，不是只写 `n===1`（n=0 会无限）。

## 全排列：路径级 used

给不同元素生成所有排列：

```ts
function permutations<T>(values: readonly T[]): T[][] {
  const result: T[][] = []
  const path: T[] = []
  const used = new Array<boolean>(values.length).fill(false)

  function search(): void {
    if (path.length === values.length) {
      result.push(path.slice())
      return
    }
    for (let index = 0; index < values.length; index += 1) {
      if (used[index]) continue
      used[index] = true
      path.push(values[index]!)
      search()
      path.pop()
      used[index] = false
    }
  }
  search()
  return result
}
```

used 表示当前路径已占用的位置，不是全局永不访问；回溯后必须恢复。叶子复制 path，若直接 push path，所有结果引用同一数组最终为空/相同。输出 n! 个、每个长度 n，时间和输出空间 Ω(n·n!)，递归工作同阶，栈/路径 O(n)。

## 含重复值的排列

排序后，同一层跳过“与前一个值相等且前一个未在当前路径使用”的候选：

```ts
function uniquePermutations(values: readonly number[]): number[][] {
  const sorted = [...values].sort((a, b) => a - b)
  const used = new Array(sorted.length).fill(false)
  const path: number[] = []
  const result: number[][] = []

  function search(): void {
    if (path.length === sorted.length) { result.push([...path]); return }
    for (let i = 0; i < sorted.length; i += 1) {
      if (used[i]) continue
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue
      used[i] = true; path.push(sorted[i]!); search(); path.pop(); used[i] = false
    }
  }
  search()
  return result
}
```

条件 `!used[i-1]` 表示前一个相同值未在当前路径，二者属于同层等价选择；若前一个已用，则当前相同值处于下一层，合法。

## 组合：startIndex 消除顺序重复

从 n 个不同值选 k 个，不关心排列。下一层只从当前索引之后选：

```ts
function combinations<T>(values: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 0 || size > values.length) return []
  const result: T[][] = []
  const path: T[] = []

  function search(start: number): void {
    if (path.length === size) { result.push([...path]); return }
    const needed = size - path.length
    for (let i = start; i <= values.length - needed; i += 1) {
      path.push(values[i]!)
      search(i + 1)
      path.pop()
    }
  }
  search(0)
  return result
}
```

上界 `values.length-needed` 是安全剪枝：后面不足 needed 个时不可能完成。输出数 C(n,k)，每项复制 k。

## 子集

每个节点当前 path 都是一个子集，进入时立即记录，再选择后续元素。共有 2^n 个。若含重复，排序并在同层跳相同值。子集/组合与排列最大的状态区别是是否需要回到前面候选。

## 生成有效括号

状态 `(open,close)`，前缀合法不变量 `close <= open <= n`：

```ts
function generateParentheses(pairs: number): string[] {
  const output: string[] = []
  function search(text: string, open: number, close: number): void {
    if (text.length === pairs * 2) { output.push(text); return }
    if (open < pairs) search(`${text}(`, open + 1, close)
    if (close < open) search(`${text})`, open, close + 1)
  }
  search('', 0, 0)
  return output
}
```

禁止 close>open 的前缀是剪枝且不会丢合法答案，因为任何合法括号串的每个前缀都满足该条件。结果数量是 Catalan 数，不能说 O(2^n) 后忽略输出字符串长度。

## 组合总和与剪枝条件

候选正数、可重复选择时，排序后从 start 开始，remaining<0 可剪；同一候选下一层仍传 i。若每个只用一次传 i+1。包含 0 会无限重复，包含负数时 remaining 单调性消失，需要限制次数/改状态图。

```ts
function combinationSum(candidates: readonly number[], target: number): number[][] {
  const values = [...new Set(candidates)].sort((a, b) => a - b)
  if (values.some((v) => v <= 0)) throw new RangeError('positive candidates required')
  const result: number[][] = []
  const path: number[] = []

  function search(start: number, remaining: number): void {
    if (remaining === 0) { result.push([...path]); return }
    for (let i = start; i < values.length && values[i]! <= remaining; i += 1) {
      path.push(values[i]!); search(i, remaining - values[i]!); path.pop()
    }
  }
  search(0, target)
  return result
}
```

## N 皇后：约束集合

逐行放皇后，列、主对角 `row-col`、副对角 `row+col` 用 Set 判冲突。每行只放一个由递归层保证。位掩码可加速，但 n 超过 JS bitwise 32 位需 BigInt；先写集合版证明正确。

## Memo 与回溯的边界

若相同状态的后续答案与到达路径无关，可 memo。例如网格路径由坐标决定；若结果需要包含当前 path，缓存需返回后缀并组合，不能直接缓存可变 path 引用。状态 key 必须包含所有影响未来的值。

回溯枚举全部输出通常无法通过 memo 降低输出量；仅求计数/最优值更适合 DP。先问需要一个解、最优值、计数还是全部解，算法复杂度完全不同。

## 副作用与撤销

`choose -> search -> unchoose` 即使 search 抛异常也要恢复时，可用 try/finally；不过算法内部通常让错误向外并放弃整个临时状态。若修改共享棋盘/图，撤销必须覆盖所有字段。更安全是让 path 局部可变、输入只读。

## 验证

小规模与集合 oracle 比较；每个排列长度 n、元素多重集合相同且结果唯一；组合每项索引递增；括号每前缀合法；N 皇后任意两皇后不同行列对角。计数验证 n=0/1/典型已知值。

做 mutation：去掉 path copy、忘记 pop、把去重条件 used 方向改反、对含负数错误剪枝，测试应失败。回溯能力的标志不是背模板，而是能为每一处剪枝给出“不可能丢解”的证明。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
