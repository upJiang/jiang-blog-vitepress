---
title: "复杂度分析"
description: "用时间和空间增长率评估算法，而不是只比较一次运行耗时。"
category: frontend
tags: ["复杂度", "TypeScript"]
updated: 2026-08-04
order: 110
depth: reference
series: "算法与数据结构"
---
# 复杂度分析

复杂度描述输入规模增长时资源需求如何增长。它不预测某台机器的精确毫秒，也不替代基准；它先排除在目标规模上必然失控的方案，再用常数、缓存、引擎和真实数据比较同阶实现。

## 先定义输入规模和基本操作

`n` 必须有含义：数组长度、节点数 `V`、边数 `E`、字符串 code point 数、数值大小还是位数。整数算法若循环到 `number` 本身，复杂度与数值 n 有关；按输入编码长度看可能是指数级。

```ts
function containsDuplicate(values: readonly number[]): boolean {
  const seen = new Set<number>()
  for (const value of values) {
    if (seen.has(value)) return true
    seen.add(value)
  }
  return false
}
```

令 n 为数组长度，循环最多 n 次，平均哈希操作按常数估计，所以期望时间 `O(n)`，额外空间 `O(n)`。应说“期望/平均”，而不是把 Map/Set 宣称绝对最坏 `O(1)`。

## O、Ω、Θ 的含义

- `O(g(n))`：渐近上界，增长最终不超过某个常数倍；
- `Ω(g(n))`：渐近下界；
- `Θ(g(n))`：上下界同阶。

行业交流常把 O 当“复杂度恰好”，但严格地说线性算法也属于 `O(n²)`；更精确可写最坏 `Θ(n)`。分析还要注明最好、平均、最坏或摊还。

| 增长 | n 翻倍的大致变化 | 典型场景 |
| --- | --- | --- |
| `O(1)` | 不随 n 增长 | 数组按下标 |
| `O(log n)` | 增加常数步骤 | 二分、平衡树 |
| `O(n)` | 约 2 倍 | 单次扫描 |
| `O(n log n)` | 略多于 2 倍 | 比较排序 |
| `O(n²)` | 约 4 倍 | 所有数对 |
| `O(2^n)` | 指数增长 | 子集搜索 |
| `O(n!)` | 更快爆炸 | 全排列 |

## 顺序、嵌套与对数

顺序执行相加，保留最高阶：`O(n)+O(n²)=O(n²)`；嵌套通常相乘，但必须看指针是否回退。

```ts
function pairCount(n: number): number {
  let count = 0
  for (let left = 0; left < n; left += 1) {
    for (let right = left + 1; right < n; right += 1) count += 1
  }
  return count
}
```

执行次数为 `n(n-1)/2`，所以 `Θ(n²)`。去掉常数 1/2 不代表常数永远无关；渐近阶相同时常数决定实际速度。

双指针虽有 while 嵌套外观，若每个指针只单向移动总共 n 次，仍是 `O(n)`。复杂度看总操作次数，不看缩进。

每轮规模减半产生 `log₂n`：二分查找、堆高度、平衡树路径。对数底数只差常数，Big O 中通常省略。

## 递归用递推式分析

```ts
function sum(values: readonly number[], index = 0): number {
  return index === values.length ? 0 : values[index]! + sum(values, index + 1)
}
```

递推 `T(n)=T(n-1)+O(1)`，时间 `O(n)`，调用栈 `O(n)`。尾递归在 JavaScript 环境中不能普遍依赖优化，深数组可能溢出；迭代版空间 `O(1)`。

归并排序 `T(n)=2T(n/2)+O(n)` 得 `O(n log n)`；朴素 Fibonacci `T(n)=T(n-1)+T(n-2)+O(1)` 指数级，memo 后每个状态一次变 `O(n)`。

回溯复杂度还包含“输出大小”。生成 n 个不同元素所有排列本就有 `n!` 个结果，任何完整算法至少花 `Ω(n! · n)` 写出结果；不能只说递归深度 O(n)。

## 摊还分析

动态数组 push 偶尔扩容复制 O(n)，但容量按倍数增长时，一系列 n 次 push 总复制量 O(n)，所以单次摊还 O(1)。摊还不是平均随机输入，而是对操作序列总成本的保证。

队列头索引偶尔压缩数组同理：若达到比例才复制，长期 dequeue 可摊还常数；每次 `shift` 则可能持续线性移动。

## 空间复杂度要区分输入、输出和额外空间

合并两个数组产生长度 m+n 的结果，输出空间必为 O(m+n)；算法额外工作空间可能 O(1)。题目说“空间 O(1)”通常指除输出外，但文章应说明口径。

递归栈、哈希表、临时数组、字符串切片/拼接和闭包保留都算空间。`array.slice()` 是新数组；`sort()` 虽原地修改，具体排序实现仍可能使用栈/缓冲区，ECMAScript 不承诺 O(1) 辅助空间。

## 多变量复杂度

图遍历用 `O(V+E)`，合并链表用 `O(m+n)`，不要在无关系时强行都写 n。矩阵 r×c 遍历是 `O(rc)`。字符串算法若模式长度 m、文本 n，应保留二者。

API 请求复杂度还可能由结果数量 k 表达为 `O(log n + k)`。数据库/网络系统不能只分析前端循环，还要考虑传输字节、查询和序列化。

## JavaScript 的隐藏成本

```ts
function quadraticBuild(parts: readonly string[]): string {
  let result = ''
  for (const part of parts) result = result + part
  return result
}
```

字符串不可变，理论上反复拼接可能复制形成 O(total²)；现代引擎可能用 rope 优化，但在扁平化时支付成本。需要稳定性能可收集到数组后 join，并基于目标引擎测量。

类似隐藏成本还有：循环内 `array.includes` 形成 O(n²)，`shift` 队列，递归 `slice(1)` 每层复制，比较函数中的昂贵解析，JSON stringify 大对象，以及展开运算符反复复制累计结果。

## 复杂度与基准如何配合

1. 理论分析给出规模趋势和最坏风险；
2. 构造接近最坏/典型的数据；
3. 预热 JIT，隔离 I/O，运行多次看分布；
4. 防止死代码消除，验证输出一致；
5. 测不同 n，观察斜率而非单点；
6. 同时记录内存、GC 和尾延迟。

```ts
function benchmark(fn: () => unknown, rounds: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < rounds; i += 1) {
    const start = performance.now()
    const result = fn()
    if (result === Symbol.for('impossible')) throw new Error('keep result observable')
    samples.push(performance.now() - start)
  }
  return samples
}
```

这只是示意；严谨基准使用专门工具、独立进程和统计分析。一个 n=100 时更快的 O(n²) 实现，可能在产品最大 n=10,000 时不可接受。

## 验证分析是否正确

对循环记录关键操作次数：线性扫描 n 翻倍约翻倍，双循环约四倍，二分只加一步。对空间记录集合最大大小和递归最大深度。属性测试确保优化版与基准版输出一致，避免用错误结果换速度。

复杂度回答的完整格式是：定义输入规模；说明循环/递归为何产生该阶；区分最好/最坏/摊还；说明额外空间和输出；指出语言实现假设。这样得到的是可审查的论证，而不是背诵结论。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
