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

LRU（Least Recently Used，最近最少使用）缓存容量满时淘汰最久未访问的键。Map 提供按键 `O(1)` 平均查找，双向链表提供已知节点的 `O(1)` 移动和删除。任何一边单独使用，都无法同时满足两个操作。

## 四条结构不变量

实现始终维持：

- Map 中每个键恰好指向链表中的一个真实节点。
- 链表从头到尾按最近使用到最久未使用排序。
- head.next 是最新节点，tail.prev 是最旧节点。
- size 等于 Map 大小，且不超过 capacity。

两个哨兵节点让插入和删除不需要区分空表、头和尾。

~~~ts
type Node<K, V> = {
  key: K
  value: V
  previous: Node<K, V> | null
  next: Node<K, V> | null
}

export class LruCache<K, V> {
  private readonly nodes = new Map<K, Node<K, V>>()
  private readonly head: Node<K, V>
  private readonly tail: Node<K, V>

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError('capacity must be a non-negative integer')
    }

    this.head = {
      key: undefined as K,
      value: undefined as V,
      previous: null,
      next: null,
    }
    this.tail = {
      key: undefined as K,
      value: undefined as V,
      previous: this.head,
      next: null,
    }
    this.head.next = this.tail
  }

  get size(): number {
    return this.nodes.size
  }

  get(key: K): V | undefined {
    const node = this.nodes.get(key)
    if (node === undefined) return undefined

    this.moveToFront(node)
    return node.value
  }

  set(key: K, value: V): void {
    const existing = this.nodes.get(key)

    if (existing !== undefined) {
      existing.value = value
      this.moveToFront(existing)
      return
    }

    if (this.capacity === 0) return

    const node: Node<K, V> = {
      key,
      value,
      previous: null,
      next: null,
    }

    this.nodes.set(key, node)
    this.insertAfterHead(node)

    if (this.nodes.size > this.capacity) {
      const oldest = this.tail.previous
      if (oldest === null || oldest === this.head) {
        throw new Error('LRU invariant broken')
      }
      this.detach(oldest)
      this.nodes.delete(oldest.key)
    }
  }

  private moveToFront(node: Node<K, V>): void {
    this.detach(node)
    this.insertAfterHead(node)
  }

  private detach(node: Node<K, V>): void {
    if (node.previous === null || node.next === null) {
      throw new Error('detached node')
    }
    node.previous.next = node.next
    node.next.previous = node.previous
    node.previous = null
    node.next = null
  }

  private insertAfterHead(node: Node<K, V>): void {
    const first = this.head.next
    if (first === null) throw new Error('LRU invariant broken')

    node.previous = this.head
    node.next = first
    this.head.next = node
    first.previous = node
  }
}
~~~

## get 为什么也要修改结构

命中表示该键刚被使用，必须移到链首。若 get 只返回值不更新顺序，缓存退化成“最早写入淘汰”，那是 FIFO。

返回 `V | undefined` 在 V 本身允许 undefined 时有歧义。公共 API 可以提供 `has`，或返回判别联合 `{ hit: true, value } | { hit: false }`。

## 更新与插入走不同路径

已有键更新 value 后移动到链首，Map 大小不变，不触发淘汰。新键先进入 Map 和链表，再检查容量。也可以先淘汰再插入，只要 capacity 0 和异常路径保持原子性。

每个结构修改都要同步两边。先从 Map 删除后链表断链失败，会留下无法查找但仍占顺序位置的节点。内存实现通常让私有方法不抛业务异常，并用不变量测试发现程序错误。

## O(1) 不包含 value 的成本

Map 查找和链表改指针按平均 `O(1)` 讨论。缓存值构造、序列化、过期检查和释放资源可能很贵，不在这个数据结构证明里。

LRU 只按最近访问淘汰，不考虑值大小、计算成本、TTL 和并发请求合并。生产缓存常需要容量按字节、过期时间、single-flight 和命中观测，这会引入堆、时钟和异步状态。

## 随机操作验证不变量

用一个简单但较慢的数组模型记录使用顺序，随机执行 get/set，与 LRU 比较返回值和淘汰键。每一步遍历链表，检查前后指针互相对应、没有环、节点数等于 Map 大小、每个 Map 节点可达。

覆盖容量 0、容量 1、重复 set、get miss、值为 undefined 和对象键。复杂度测试再观察操作规模增长，正确性测试不要依赖计时。
