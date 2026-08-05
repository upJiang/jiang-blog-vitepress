---
title: "数据结构基础"
description: "从访问模式出发选择数组、链表、栈、队列、树与图。"
category: frontend
tags: ["数据结构", "TypeScript"]
updated: 2026-08-04
order: 100
depth: reference
series: "算法与数据结构"
---
# 数据结构基础

数据结构不是若干 API 的目录，而是数据布局、允许操作和复杂度承诺的组合。选结构前先问访问模式：需要按下标随机访问、按 key 查询、频繁在两端进出、保持优先级，还是表达层级/任意关系？同一个“列表”在不同访问模式下可能应使用数组、链表、Deque 或树。

## 结构与操作成本

下表是常见平均/摊还复杂度，不代表所有语言实现和最坏情况：

| 结构 | 读取/查找 | 插入删除 | 核心约束 |
| --- | --- | --- | --- |
| 动态数组 | 下标 `O(1)`，按值 `O(n)` | 尾部摊还 `O(1)`，头/中间 `O(n)` | 连续索引、整体移动 |
| 哈希表 | 平均 `O(1)` | 平均 `O(1)` | hash/equality、容量与冲突 |
| 单链表 | 第 k 个 `O(k)` | 已知前驱后 `O(1)` | `next` 关系必须不断链 |
| 栈 | 栈顶 `O(1)` | push/pop `O(1)` | 后进先出 |
| 队列/Deque | 两端 `O(1)` | 两端 `O(1)` | 先进先出或双端 |
| 二叉搜索树 | 平均 `O(log n)` | 平均 `O(log n)` | 左右有序；退化时 `O(n)` |
| 堆 | 堆顶 `O(1)` | 插入/删除堆顶 `O(log n)` | 父子局部有序，不支持全局顺序 |
| 图邻接表 | 邻居 `O(deg(v))` | 边操作依实现 | 节点/边、方向、权重 |

JavaScript `Array.shift()` 通常需要移动后续元素，不适合高频队列。`Map` 的规范没有承诺某种具体哈希实现或严格 `O(1)`，复杂度是现代引擎通常实现的工程预期；安全代码不能把哈希表当抗拒绝服务的绝对保证。

## 数组：索引与内存局部性

数组适合顺序扫描、随机访问和紧凑数据。动态数组容量扩张可能复制底层存储，所以尾部 push 是摊还 `O(1)`，不是每一次都常数成本。中间插入要移动后缀：

```ts
function insertAt<T>(items: readonly T[], index: number, value: T): T[] {
  if (!Number.isInteger(index) || index < 0 || index > items.length) {
    throw new RangeError('index out of range')
  }
  return [...items.slice(0, index), value, ...items.slice(index)]
}
```

这个不可变实现时间、空间都是 `O(n)`。若在循环中反复展开会变 `O(n²)`，高频构建应先写入可变数组，再在边界发布只读结果。

稀疏数组的“洞”与值 `undefined` 不完全相同，某些迭代方法会跳过洞。算法输入应明确是否允许稀疏数组；通常先规范为紧凑数组。

## Map 与 Set：身份和相等

`Map` 可使用任意值作 key，`Set` 表示唯一集合。两者采用 SameValueZero 相等语义：`NaN` 与自身相等，`0` 与 `-0` 视为相同；对象按引用身份，不按内容。

```ts
type Frequency = Map<string, number>

function countWords(words: readonly string[]): Frequency {
  const counts = new Map<string, number>()
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return counts
}
```

不要用普通对象模拟所有 Map：`__proto__`、原型继承、key 强制字符串化和顺序语义会产生差异。只需要 JSON 记录时可用 `Object.create(null)` 或 `Record`，但仍明确 key 范围。

## 链表：结构变更与身份

链表节点分散存储，用指针表达顺序。它的 `O(1)` 插入成立的前提是已经拿到插入位置/前驱；若先从头查位置，整体仍是 `O(n)`。

```ts
interface ListNode<T> {
  value: T
  next: ListNode<T> | null
}

function prepend<T>(head: ListNode<T> | null, value: T): ListNode<T> {
  return { value, next: head }
}

function removeAfter<T>(node: ListNode<T>): ListNode<T> | null {
  const removed = node.next
  if (removed) node.next = removed.next
  return removed
}
```

修改前先保存后继，避免断链；共享节点意味着原地修改会影响所有持有引用者。面试题常默认无环单链表，工程接口应写明是否允许环、是否拥有节点修改权。

## 栈：未完成工作的后进先出

栈适合括号、表达式、撤销、DFS 和显式模拟递归。数组尾部 push/pop 在 JS 中最合适：

```ts
class Stack<T> {
  private readonly values: T[] = []

  push(value: T): void { this.values.push(value) }
  pop(): T | undefined { return this.values.pop() }
  peek(): T | undefined { return this.values.at(-1) }
  get size(): number { return this.values.length }
}
```

API 返回 `undefined` 时，若 `T` 本身允许 undefined 就无法区分“空”和“值”。严格结构可用 `Result` 或抛受控异常。算法中通常先判断 size。

## 队列与 Deque：不要 shift

用头索引避免每次移动数组：

```ts
class Queue<T> {
  private values: T[] = []
  private head = 0

  enqueue(value: T): void { this.values.push(value) }

  dequeue(): T | undefined {
    if (this.head >= this.values.length) return undefined
    const value = this.values[this.head]
    this.head += 1

    if (this.head > 1024 && this.head * 2 > this.values.length) {
      this.values = this.values.slice(this.head)
      this.head = 0
    }
    return value
  }

  get size(): number { return this.values.length - this.head }
}
```

单次压缩是 `O(n)`，但跨大量操作可摊还。滑动窗口单调队列还需要尾部弹出，生产中可实现环形 Deque，避免 `shift`。

## 树：递归结构和不变量

二叉树节点最多两个孩子：

```ts
interface TreeNode<T> {
  value: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null
}
```

“二叉树”只限制度，不自动有序、平衡或完全。二叉搜索树增加有序策略；堆增加父子优先级；平衡树限制高度；Trie 按字符串前缀组织。先写出不变量，才能选择算法。

树高为 `h` 时递归栈 `O(h)`；退化链可能导致 JS 调用栈溢出。外部不可信树使用迭代遍历和节点上限，并用 Set 防止实际输入误成图/环。

## 堆：只保证极值

最小堆保证父节点不大于孩子，因此根是全局最小，但数组整体不排序。数组下标关系（0 起始）：父 `(i-1)>>1`，左子 `2i+1`，右子 `2i+2`。插入向上调整，删除根用末尾替换再向下调整。

堆适合优先队列、Top K 和多路归并。若每次都对整个数组 sort，单次插入后取最小是 `O(n log n)`；堆是 `O(log n)`。但数据很小或一次性排序后多次读取时，排序可能更简单且常数更低。

## 图：关系不再只有父子

邻接表适合稀疏图：

```ts
type NodeId = string
type Graph = ReadonlyMap<NodeId, readonly NodeId[]>

function validateGraph(graph: Graph): void {
  for (const [from, neighbors] of graph) {
    for (const to of neighbors) {
      if (!graph.has(to)) throw new Error(`missing node referenced by ${from}`)
    }
  }
}
```

无向边通常要写两个方向；有向图只写真实方向。带权图邻接项包含 weight，并明确是否允许负权。DFS/BFS 必须有 visited，否则环会无限搜索；不连通图要从每个未访问节点启动才能遍历全图。

## 选择结构的步骤

1. 写操作集合和频率：按 key 查、按序遍历、两端进出、取最值；
2. 写输入规模、内存与延迟预算；
3. 写必须保持的不变量和并发/所有权；
4. 比较平均、最坏和摊还复杂度；
5. 用代表数据基准，而不是只凭 Big O；
6. 将结构封装，避免调用者绕过不变量。

例如任务调度同时需要按 ID 更新和按优先级取出，单个结构不够：Map 保存 ID 到任务/堆位置，Heap 保存优先级。双结构必须在同一操作中保持一致，删除和更新要测试。

## 正确性与边界验证

结构测试不只测试示例值，还要验证不变量：

| 结构 | 属性测试 |
| --- | --- |
| Stack | 任意序列 push 后 pop 顺序与输入反向一致 |
| Queue | enqueue 序列与 dequeue 序列一致 |
| BST | 中序遍历满足定义的有序/重复策略 |
| Heap | 每个父节点满足与孩子的优先级关系 |
| Graph traversal | 每个可达节点恰访问一次 |

边界覆盖空结构、单元素、大规模、重复值、非法索引、环和退化深度。复杂度测试可统计基本操作次数：队列若使用 shift，随着 n 增大移动成本会显现；链表插入若隐藏线性查找，计数能揭示“伪 O(1)”。

数据结构的核心不是会用 `push`、`Map` 或 `TreeNode`，而是能够陈述结构不变量、证明每次操作保持它，并知道语言运行时让理论成本在哪些地方发生变化。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
