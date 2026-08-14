---
title: LRU Cache：哈希表与双向链表的协作
description: 从 O(1) 查询、更新和淘汰约束推导哈希表加双向链表，处理容量、覆盖、移动与哨兵节点。
category: algorithms
part: 缓存数据结构
chapter: 20
tags:
  - LRU
  - 哈希表
  - 双向链表
  - TypeScript
prerequisites:
  - 链表与 Map 基础
outcomes:
  - 推导 LRU 的组合数据结构
  - 维护链表和缓存容量不变量
practice:
  type: implementation
  result: 实现带哨兵节点的 LRU Cache
  verify:
    - 容量为零和重复写入均通过
    - 每次操作后 Map 与链表节点一一对应
evidence: public-source
updated: 2026-08-11
---

# LRU Cache：哈希表与双向链表的协作

缓存容量为 2，依次写入 A、B，读取 A，再写入 C。被淘汰的应该是 B，因为读取 A 已经更新了“最近使用”顺序。若只用 `Map` 查找很快，却无法在通用数据结构语义下明确维护任意节点顺序；只用链表能维护顺序，查找又会退化为线性。

LRU 的约束是 `get`、`put` 和淘汰都达到均摊 `O(1)`。这直接推导出两种结构协作：哈希表负责 key 到节点的定位，双向链表负责常数时间删除、移动和尾部淘汰。

## 四条结构不变量

链表从头到尾按“最近使用到最久未使用”排列。头尾哨兵节点不保存业务数据，消除空链表、首节点和尾节点的分支。

1. `head.next` 是最近使用节点，`tail.prev` 是淘汰候选。
2. Map 中每个条目恰好对应链表中的一个业务节点。
3. 业务节点的 `prev.next` 和 `next.prev` 始终指回它。
4. 业务节点数不超过容量，容量为零时始终为空。

读取命中会改变顺序，所以 `get` 不是纯查询。写入已有 key 要更新原节点并移到头部，不能新建第二个同 key 节点。写入新 key 超容后，必须先从链表移除尾节点，再从 Map 删除相同 key。

## TypeScript 实现

下面实现接收正整数或零容量。输入 key/value，输出命中的值或 `undefined`；如果业务值本身允许 `undefined`，调用方应改成 `{ found, value }` 联合类型，避免混淆未命中。

```ts
class LruNode<K, V> {
  prev!: LruNode<K, V>
  next!: LruNode<K, V>

  constructor(public key: K, public value: V) {}
}

class LruCache<K, V> {
  private readonly nodes = new Map<K, LruNode<K, V>>()
  private readonly head = new LruNode<K, V>(undefined as K, undefined as V)
  private readonly tail = new LruNode<K, V>(undefined as K, undefined as V)

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 0) throw new Error('invalid_capacity')
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  get(key: K): V | undefined {
    const node = this.nodes.get(key)
    if (!node) return undefined
    this.moveToFront(node)
    return node.value
  }

  put(key: K, value: V): void {
    if (this.capacity === 0) return
    const existing = this.nodes.get(key)
    if (existing) {
      existing.value = value
      this.moveToFront(existing)
      return
    }

    const node = new LruNode(key, value)
    this.nodes.set(key, node)
    this.addAfterHead(node)

    if (this.nodes.size > this.capacity) {
      const evicted = this.tail.prev
      this.detach(evicted)
      this.nodes.delete(evicted.key)
    }
  }

  private moveToFront(node: LruNode<K, V>): void {
    this.detach(node)
    this.addAfterHead(node)
  }

  private detach(node: LruNode<K, V>): void {
    node.prev.next = node.next
    node.next.prev = node.prev
  }

  private addAfterHead(node: LruNode<K, V>): void {
    node.prev = this.head
    node.next = this.head.next
    this.head.next.prev = node
    this.head.next = node
  }
}
```

`detach` 必须在覆盖指针前同时修复左右邻居；`addAfterHead` 先让新节点连接旧首节点，再更新旧首节点和头哨兵。操作次序错一行就可能产生断链或环，因此测试除了返回值，还应遍历链表检查双向关系。

## 执行轨迹

容量 2 的初始链表是 `head <-> tail`。写 A 后为 `head <-> A <-> tail`；写 B 后为 `head <-> B <-> A <-> tail`。读取 A 先摘除 A，再插到头部，得到 `head <-> A <-> B <-> tail`。写 C 后暂时有三个节点，淘汰 `tail.prev` 的 B，最终顺序为 C、A。

覆盖 A 的值不会改变 Map 大小，只把 A 移到最前。若实现选择删除旧节点再新建，也能保持复杂度，但更容易在 Map 与链表之间出现短暂不一致。

## 测试、工程边界与追问

测试应覆盖容量 0/1、未命中、重复覆盖、读取刷新顺序、连续淘汰以及 key 为对象的情况。再增加内部诊断方法，在每次随机操作后验证 Map 大小、链表节点数、双向指针和 key 集合完全一致。

算法题中的 LRU 是单进程内存结构。真实浏览器或服务缓存还要处理 TTL、大小权重、并发、持久化和多实例一致性。LRU 也不保证最佳命中率：顺序扫描大数据可能污染缓存，LFU、分段 LRU 或业务感知策略会更合适。

面试继续追问时，可以从“为什么必须双向链表”回答：已知节点时单链表仍不知道前驱，删除要重新扫描；也可以解释 JavaScript `Map` 保持插入顺序，但用删除再插入模拟 LRU 是语言容器特性，无法展示通用组合结构，也需要明确迭代与更新语义。

## 组合结构的不变量

Map 保存 `key -> node`，双向链表保存最近使用顺序；两者必须满足双射：每个 Map 节点都在链表中，每个链表节点都能从 Map 取回，且 `size <= capacity`。哨兵 head/tail 让插入、删除不需要分支处理空头/空尾，任何操作都只改相邻四个指针。

`get` 是读语义却会改变顺序，因此并发实现要明确是否需要锁/原子操作；异步 JS 单线程不代表 Worker/多实例共享安全。TTL、最大权重和淘汰回调会把 O(1) 核心扩展成额外时间/资源协议，淘汰回调抛错不能破坏 Map/链表一致性。

如果要把内存 LRU 扩展到服务缓存，可对照 [Redis 的淘汰策略说明](https://redis.io/docs/latest/develop/reference/eviction/)；容器语义可对照 [MDN 的 `Map` 参考](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)。这些资料解释外部语义，本文测试仍以 Map/链表双射和容量不变量为准。
