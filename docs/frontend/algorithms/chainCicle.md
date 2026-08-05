---
title: "环形链表"
description: "使用快慢指针判断环、定位入口并分析相遇条件。"
category: frontend
tags: ["链表", "环检测", "TypeScript"]
updated: 2026-08-04
order: 180
depth: reference
series: "算法与数据结构"
---
# 环形链表

链表有环时，从某节点开始沿 next 永远不会到 null。Set 能记录访问过的节点，时间/空间 O(n)；Floyd 快慢指针利用相对速度在 O(1) 额外空间判断并定位入口。公式不是背诵，而来自模环距离。

```ts
interface ListNode<T> {
  value: T
  next: ListNode<T> | null
}
```

## Floyd 判环

```ts
function hasCycle<T>(head: ListNode<T> | null): boolean {
  let slow = head
  let fast = head

  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) return true
  }
  return false
}
```

比较的是节点引用，不是 value；不同节点可有相同值。若无环，fast 最终到 null；若有环，进入环后把位置看作模 C（环长），每轮 fast 相对 slow 前进 1，有限 C 个相对位置内必相遇。时间 O(μ+C)，μ 为入环前长度，空间 O(1)。

循环条件必须检查 fast 和 fast.next 后再走两步。初始时不要在移动前比较 slow===fast，否则非空链立即误判。

## 定位环入口

快慢首次相遇后，让一个指针回 head，二者每次一步，再次相遇处是入口：

```ts
function cycleEntry<T>(head: ListNode<T> | null): ListNode<T> | null {
  let slow = head
  let fast = head

  do {
    if (fast === null || fast.next === null) return null
    slow = slow!.next
    fast = fast.next.next
  } while (slow !== fast)

  let fromHead = head
  while (fromHead !== slow) {
    fromHead = fromHead!.next
    slow = slow!.next
  }
  return fromHead
}
```

设 head 到入口 μ，入口到首次相遇 x，环长 C。相遇时 slow 走 `μ+x`，fast 走两倍；差是若干整环：`μ+x = kC`，所以 `μ = kC-x`。从 head 走 μ 到入口；从相遇点走 μ 等价沿环走 `kC-x`，也到入口。

这个推导不要求 fast 恰好多跑一圈，k 可大于 1。

## 求环长

拿到相遇节点后固定一个指针，另一个走一圈计数：

```ts
function cycleLength<T>(head: ListNode<T> | null): number {
  let slow = head
  let fast = head
  while (fast?.next) {
    slow = slow!.next
    fast = fast.next.next
    if (slow === fast) {
      let length = 1
      for (let cursor = slow.next; cursor !== slow; cursor = cursor!.next) length += 1
      return length
    }
  }
  return 0
}
```

入口前长度可在找到 entry 后从 head 同步计数。整体仍线性、O(1) 空间。

## Set 方案仍有价值

```ts
function cycleEntryWithSet<T>(head: ListNode<T> | null): ListNode<T> | null {
  const visited = new Set<ListNode<T>>()
  for (let current = head; current !== null; current = current.next) {
    if (visited.has(current)) return current
    visited.add(current)
  }
  return null
}
```

它更直观，能记录路径、诊断重复节点，也适合图结构的 visited。空间预算足够时可作为基准 oracle。Floyd 只适合每节点恰有一个后继的函数图；普通图有多邻居，需要 DFS/BFS visited，不能用两个指针概括。

## 环与共享尾部

两个无环链共享尾部不是环，但若合并/修改指针不考虑共享，可能创建环。相交链表问题可通过长度对齐或切换头指针找到相交引用；仍比较身份。

容器销毁、序列化和日志遍历若没防环会无限。处理不可信对象图时用 WeakSet/Set 与节点/深度预算；JSON.stringify 默认会因循环引用抛错，不能依赖它作为安全检测。

## 安全断环与所有权

找到入口并不意味着可以直接 `entry.next = null`，那只在环长为 1 时正确。要断开环，应从入口沿环找到满足 `cursor.next === entry` 的尾节点，再把它的 next 设为 null：

```ts
function breakCycle<T>(head: ListNode<T> | null): boolean {
  const entry = cycleEntry(head)
  if (entry === null) return false

  let tail = entry
  while (tail.next !== entry) tail = tail.next!
  tail.next = null
  return true
}
```

这会修改原结构，时间 O(μ+C)、空间 O(1)。调用者必须拥有整条链；若节点与其他容器共享，断环会改变其他观察者的遍历结果。并发修改下 Floyd 的证明也不成立：指针读取期间结构变化可能漏报、误报或访问已解绑节点。工程容器需要锁、不可变快照或版本检查，而不是把单线程算法直接用于并发数据结构。

断环后再次调用 `hasCycle` 应为 false，并验证所有原节点仍恰好可达一次。若目标是诊断而非修复，优先返回入口、环长和前缀长度，不静默修改输入。

## 验证

构造：空、单节点无环、单节点自环、两节点环、入口=head、长前缀+短环、重复 value 无环。Set 方案作 oracle，与 Floyd 的入口引用比较。遍历测试设置最大步数，避免错误实现挂住测试进程。

还可做属性生成：创建 n 个独立节点，随机选择 tail.next 为 null 或某个索引；预期入口就是该索引节点。验证 hasCycle、entry 和 length 一致。

环检测真正需要掌握的是“引用身份 + 相对速度 + 模环距离”。一旦数据不再是每节点单后继，这套证明条件就不成立，应回到通用图遍历。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
