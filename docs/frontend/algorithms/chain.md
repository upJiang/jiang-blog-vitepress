---
title: "链表合并与反转"
description: "围绕 next 指针不变量完成链表结构变换。"
category: frontend
tags: ["链表", "TypeScript"]
updated: 2026-08-04
order: 160
depth: reference
series: "算法与数据结构"
---
# 链表合并与反转

链表算法的难点不是访问值，而是每次改 `next` 前仍能找到未处理部分。画出 `previous/current/next`，写清每段链的含义，再修改指针。链表删除“是 O(1)”只在已知前驱/目标节点且无需查找时成立；从头定位仍是 O(n)。

```ts
interface ListNode<T> {
  value: T
  next: ListNode<T> | null
}
```

## 合并两个有序链表

Dummy 节点让结果头和普通节点使用相同连接逻辑：

```ts
function mergeSortedLists(
  left: ListNode<number> | null,
  right: ListNode<number> | null
): ListNode<number> | null {
  const dummy: ListNode<number> = { value: 0, next: null }
  let tail = dummy

  while (left !== null && right !== null) {
    if (left.value <= right.value) {
      tail.next = left
      left = left.next
    } else {
      tail.next = right
      right = right.next
    }
    tail = tail.next
  }
  tail.next = left ?? right
  return dummy.next
}
```

不变量：dummy.next 到 tail 是已经选出的有序前缀；left/right 分别指向各自未处理的最小节点；tail.next 尚未决定。每次接较小头保持有序。时间 O(m+n)，额外空间 O(1)，但复用并修改输入节点；若调用者仍需原链，应复制节点，空间 O(m+n)。

递归版同样 O(m+n) 时间，但调用栈 O(m+n)，长链在 JS 中可能溢出，迭代更稳。

## 反转单链表

```ts
function reverseList<T>(head: ListNode<T> | null): ListNode<T> | null {
  let reversed: ListNode<T> | null = null
  let current = head

  while (current !== null) {
    const remaining = current.next
    current.next = reversed
    reversed = current
    current = remaining
  }
  return reversed
}
```

循环开始时：`reversed` 是原前缀的反转；`current` 是未处理后缀头；两段包含原链全部节点且不重叠。必须先保存 remaining，再改 current.next，否则失去后缀。时间 O(n)、空间 O(1)。反转两次应恢复同一节点顺序，是很好的属性测试。

## 删除排序链表重复值

保留一个重复值时，当前与 next 相等就跳过 next：

```ts
function deduplicateSorted<T>(
  head: ListNode<T> | null,
  equal: (a: T, b: T) => boolean = Object.is
): ListNode<T> | null {
  let current = head
  while (current?.next) {
    if (equal(current.value, current.next.value)) current.next = current.next.next
    else current = current.next
  }
  return head
}
```

只有排序保证重复连续，此算法才正确。无序链需要 Set（空间 O(n)）或先排序（会改变顺序/复杂度）。

若要求删除所有出现重复的值，头节点可能删除，需要 dummy 指向 head，previous 指向已确认唯一前缀尾：

```ts
function removeAllDuplicates(head: ListNode<number> | null): ListNode<number> | null {
  const dummy: ListNode<number> = { value: 0, next: head }
  let previous = dummy

  while (previous.next !== null) {
    const value = previous.next.value
    let cursor = previous.next
    let count = 0
    while (cursor !== null && cursor.value === value) {
      cursor = cursor.next
      count += 1
    }
    if (count > 1) previous.next = cursor
    else previous = previous.next
  }
  return dummy.next
}
```

previous 之前都是最终唯一节点。找到一整段相等值后，一次决定保留或跳过，不在删除过程中误移动 previous。时间 O(n)，空间 O(1)。

## 删除已知节点的语义限制

有些题只给非尾节点 node，通过复制后继值并跳过后继“删除”：

```ts
function deleteGivenNode<T>(node: ListNode<T>): void {
  if (node.next === null) throw new RangeError('tail cannot be deleted without predecessor')
  node.value = node.next.value
  node.next = node.next.next
}
```

这并非真正删除传入对象身份，而是让它表示后继值，并移除后继对象。若外部持有节点引用、节点含不可复制 ID/资源或要求删除尾节点，这个技巧不成立。工程链表通常通过容器 API 删除，维护 size、所有权和迭代器失效。

## 两两交换

Dummy + 三个指针避免头部特判：

```ts
function swapPairs<T>(head: ListNode<T> | null): ListNode<T> | null {
  const dummy: ListNode<T | null> = { value: null, next: head }
  let before: ListNode<T | null> = dummy

  while (before.next?.next) {
    const first = before.next
    const second = first.next!
    first.next = second.next
    second.next = first
    before.next = second
    before = first
  }
  return dummy.next
}
```

每轮前 before.next 是未处理段；交换后 first 成为本对尾，下一轮 before=first。奇数末节点自然保留。

## 共享、环与输入契约

两个输入链若共享后缀，原地 merge 可能把同一节点接两次形成环；有环链会让普通 while 无限。算法题通常保证无环且节点不共享，必须写进前置条件。处理外部图状输入时先用 Set 检测节点身份，设置最大节点预算。

## 验证

用数组与链表互转建立 oracle，覆盖空、单节点、重复、全部相等、头部删除、奇数交换。验证节点身份：原地 merge 结果节点集合等于两输入节点集合且每个恰一次；reverse 不创建/丢失节点；所有遍历设置上限以捕获意外环。

链表的每个正确解都能画成“已处理段、当前节点、未处理段”。如果改指针后无法说明三段分别在哪里，代码很可能只是在示例上碰巧工作。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
