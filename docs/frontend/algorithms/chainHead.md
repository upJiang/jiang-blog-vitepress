---
title: "链表倒数节点与快慢指针"
description: "通过固定间距指针处理倒数位置和删除操作。"
category: frontend
tags: ["链表", "双指针", "TypeScript"]
updated: 2026-08-04
order: 170
depth: reference
series: "算法与数据结构"
---
# 链表倒数节点与快慢指针

链表不能按下标 O(1) 访问，但两个单向指针可编码相对距离。先让 fast 领先 n 步，再同步移动，能在一次扫描定位倒数第 n 个节点。关键是统一“指针相差多少条边”和 dummy 是否计入，避免 n=长度时删除头节点失败。

```ts
interface ListNode<T> {
  value: T
  next: ListNode<T> | null
}
```

## 删除倒数第 n 个节点

令 dummy.next=head。先让 fast 从 dummy 前进 n+1 步，使 fast 与 slow 相差 n+1 条边；同步到 fast=null 时，slow 是目标前驱：

```ts
function removeNthFromEnd<T>(
  head: ListNode<T> | null,
  n: number
): ListNode<T> | null {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be positive')

  const dummy: ListNode<T | null> = { value: null, next: head }
  let fast: ListNode<T | null> | null = dummy
  let slow: ListNode<T | null> = dummy

  for (let step = 0; step <= n; step += 1) {
    fast = fast.next
    if (fast === null && step < n) throw new RangeError('n exceeds list length')
  }

  while (fast !== null) {
    fast = fast.next
    slow = slow.next!
  }
  slow.next = slow.next!.next
  return dummy.next
}
```

这里循环边界需仔细审查。更易实现的版本让 fast 从 head 先走 n 步，若 null 表示删除 head；否则 fast/slow 从 head 同走直到 fast.next=null，slow 是前驱。Dummy 版本可统一，但必须测试 n=1、n=长度、空链和越界。

时间 O(L)，空间 O(1)。两遍法先计长度也 O(L) 且更易读；一次扫描不是绝对更优，流式/只能遍历一次时才必要。

## 找倒数第 k 个节点

```ts
function kthFromEnd<T>(head: ListNode<T> | null, k: number): ListNode<T> | null {
  if (!Number.isInteger(k) || k <= 0) return null
  let fast = head
  for (let step = 0; step < k; step += 1) {
    if (fast === null) return null
    fast = fast.next
  }
  let slow = head
  while (fast !== null) {
    fast = fast.next
    slow = slow!.next
  }
  return slow
}
```

fast 领先 slow k 条边；fast 到 null 时 slow 距 null k 条边，即倒数第 k 个。返回节点会暴露可变内部结构，容器 API 可只返回值或只读视图。

## 链表中点

fast 每次两步、slow 一步。fast 到尾时 slow 在中间：

```ts
function middleNode<T>(head: ListNode<T> | null): ListNode<T> | null {
  let slow = head
  let fast = head
  while (fast !== null && fast.next !== null) {
    slow = slow!.next
    fast = fast.next.next
  }
  return slow
}
```

偶数长度返回后一个中点；若要前一个中点，循环条件或初始位置不同。中点用于归并排序、回文链表。回文检查反转后半段后，工程上最好恢复原链，避免只读操作意外修改输入。

## 局部反转 [left,right]

先找到区间前驱，再用“头插”把区间后续节点逐个移到区间头：

```ts
function reverseBetween<T>(
  head: ListNode<T> | null,
  left: number,
  right: number
): ListNode<T> | null {
  if (left < 1 || right < left) throw new RangeError('invalid range')
  const dummy: ListNode<T | null> = { value: null, next: head }
  let before: ListNode<T | null> = dummy

  for (let position = 1; position < left; position += 1) {
    if (before.next === null) throw new RangeError('left exceeds length')
    before = before.next
  }

  const tail = before.next
  if (tail === null) throw new RangeError('left exceeds length')
  for (let count = 0; count < right - left; count += 1) {
    const moving = tail.next
    if (moving === null) throw new RangeError('right exceeds length')
    tail.next = moving.next
    moving.next = before.next
    before.next = moving
  }
  return dummy.next
}
```

不变量：before.next 是已反转区间头；tail 是已反转区间尾；tail.next 是下一个待移节点。每次移动保持区间外连接。时间 O(L)，空间 O(1)。若越界时已部分修改，当前函数会留下变化；严格 API 应先验证长度或定义失败不保证原子，工程中通常先校验避免半修改。

## K 组反转

K 组反转先确认剩余至少 k 个节点，再反转恰 k 个并接回。若不先确认，最后不足组可能被错误反转。每个节点处理常数次 O(n)，但指针多，建议拆出 `reverseRange(first, afterLast)`，返回新头尾，并用节点集合验证不丢不重。

## 与环检测的区别

“快慢指针”不是同一个算法。固定间距解决倒数位置；速度 1/2 的 Floyd 利用模环相遇检测环。中点快指针到 null 的前提是无环；若输入可能有环，中点算法会无限循环，应先验证或限定输入。

## 验证

把链表转数组与数组预期比较，同时验证无环和节点数量。删除倒数覆盖长度 1、n=1、n=L、n>L；中点覆盖奇偶；局部反转覆盖 left=right、从头、到尾、全链和越界原子语义。

指针距离题建议在纸上画 dummy、null 和边数，逐步模拟长度 1/2。只记“fast 先走 n 步”而不说明起点/终点，是大多数 off-by-one 的来源。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
