---
title: "队列与滑动窗口"
description: "用先进先出和单调结构处理流式数据与窗口问题。"
category: frontend
tags: ["队列", "滑动窗口", "TypeScript"]
updated: 2026-08-04
order: 150
depth: reference
series: "算法与数据结构"
---
# 队列与滑动窗口

队列按照进入顺序处理工作，适合 BFS、任务缓冲和流式窗口。JavaScript 数组 `push + shift` 语义正确但 shift 通常移动后续元素；算法实现应使用头索引或环形缓冲。窗口问题还要区分普通 FIFO、双端队列和计数 Map，它们维护的不变量不同。

## 两个栈实现队列

输入栈负责接收，输出栈负责弹出。只有输出栈为空时，才把输入栈全部倒入：

```ts
class QueueFromStacks<T> {
  private readonly input: T[] = []
  private readonly output: T[] = []

  enqueue(value: T): void { this.input.push(value) }

  dequeue(): T | undefined {
    this.fillOutput()
    return this.output.pop()
  }

  peek(): T | undefined {
    this.fillOutput()
    return this.output.at(-1)
  }

  get size(): number { return this.input.length + this.output.length }

  private fillOutput(): void {
    if (this.output.length > 0) return
    while (this.input.length > 0) this.output.push(this.input.pop()!)
  }
}
```

output 中栈顶是全队最早元素；一旦开始输出，后来 enqueue 的元素留在 input，不能提前倒入破坏顺序。单次倒栈 O(n)，但每个元素只从 input 到 output 一次，再弹出一次，所以一系列操作摊还 O(1)，空间 O(n)。若每次 dequeue 都把元素来回倒，会退化 O(n)。

## 头索引 FIFO

```ts
class ArrayQueue<T> {
  private items: T[] = []
  private head = 0

  enqueue(value: T): void { this.items.push(value) }

  dequeue(): T | undefined {
    if (this.head === this.items.length) return undefined
    const value = this.items[this.head++]
    if (this.head >= 1024 && this.head * 2 >= this.items.length) {
      this.items = this.items.slice(this.head)
      this.head = 0
    }
    return value
  }

  get size(): number { return this.items.length - this.head }
}
```

偶尔压缩释放已消费引用，避免队列长期持有大对象。高吞吐固定容量使用环形数组，并定义满时策略：拒绝、覆盖、阻塞或背压，不能无限增长。

## BFS：队列表示待处理前沿

图的最短无权路径利用 BFS 按距离层次扩展：

```ts
function shortestDistance(
  graph: ReadonlyMap<string, readonly string[]>,
  start: string,
  target: string
): number | null {
  if (start === target) return 0
  const queue = new ArrayQueue<{ node: string; distance: number }>()
  const visited = new Set([start])
  queue.enqueue({ node: start, distance: 0 })

  while (queue.size > 0) {
    const current = queue.dequeue()!
    for (const neighbor of graph.get(current.node) ?? []) {
      if (visited.has(neighbor)) continue
      if (neighbor === target) return current.distance + 1
      visited.add(neighbor)
      queue.enqueue({ node: neighbor, distance: current.distance + 1 })
    }
  }
  return null
}
```

节点在入队时标 visited，避免同层多个父节点重复入队。队列中所有节点距离非递减，所以第一次发现 target 就是最短边数。时间 O(V+E)，空间 O(V)。带不同非负权重需 Dijkstra 优先队列，不能继续普通 BFS。

## 单调 Deque：固定窗口最大值

Deque 中存索引，索引递增、值单调不增。新元素到来先移除过期队首，再移除不可能成为最大值的队尾：

```ts
function slidingMaximum(values: readonly number[], window: number): number[] {
  if (!Number.isInteger(window) || window <= 0 || window > values.length) return []
  const deque = new Array<number>(values.length)
  let head = 0
  let tail = 0
  const result: number[] = []

  for (let right = 0; right < values.length; right += 1) {
    while (head < tail && deque[head]! <= right - window) head += 1
    while (head < tail && values[deque[tail - 1]!]! <= values[right]!) tail -= 1
    deque[tail++] = right
    if (right + 1 >= window) result.push(values[deque[head]!]!)
  }
  return result
}
```

相等时删除旧索引是安全的：新索引值相同且更晚离开窗口。若题目还要最早最大值下标，则保留相等旧索引（使用 `<`）。每个索引最多两端各处理一次，时间 O(n)，空间 O(window)。

## 可变窗口：计数与收缩条件

求和至少 target 的最短正数子数组：窗口元素全为正，因此右移使和不减，满足后可收缩 left：

```ts
function minimumLengthAtLeast(values: readonly number[], target: number): number {
  let left = 0
  let sum = 0
  let best = Infinity

  for (let right = 0; right < values.length; right += 1) {
    if (values[right]! <= 0) throw new RangeError('values must be positive')
    sum += values[right]!
    while (sum >= target) {
      best = Math.min(best, right - left + 1)
      sum -= values[left++]!
    }
  }
  return Number.isFinite(best) ? best : 0
}
```

不变量：while 结束后当前窗口和小于 target；刚才所有满足窗口已尝试删除尽可能多左端。若允许负数，收缩后和可能变大，单调性消失，需要前缀和 + 单调队列等方法。

最长不重复子串则用 Map 记录最后位置；“窗口内至多 K 种字符”用频率 Map，收缩时计数归零删除。窗口模板只有在扩张/收缩条件具备单调性时成立。

## 流式队列与背压

工程队列还需要容量与失败语义。生产者快于消费者时无限数组最终耗尽内存。固定容量队列选择：阻塞/await、拒绝、丢最新、丢最旧或合并可覆盖事件。进度事件可只留最新，订单写入不能丢。

并发 worker 取队列要保证同一任务租约、超时恢复和幂等；这已超出单机数据结构，但核心仍是“队首事实”和容量不变量。

## 验证

两个栈队列与简单数组 oracle 随机执行 enqueue/dequeue/peek 比较；BFS 用链、环、不连通和多条等长路径；单调窗口与 O(nk) oracle 随机比较；可变窗口故意放负数确认输入约束触发。

复杂度测试不要只数 while 嵌套：单调 Deque 的内层 pop 总次数不超过 n。队列题的核心是说明元素何时进入候选、何时永久失去资格，以及先进先出为何保证层次/时间顺序。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
