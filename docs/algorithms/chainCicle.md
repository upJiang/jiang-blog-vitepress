---
title: "环形链表"
description: "使用快慢指针判断环、定位入口并分析相遇条件。"
category: frontend
tags: ["链表", "环检测", "TypeScript"]
updated: 2026-08-05
order: 180
depth: reference
series: "算法与数据结构"
---
# 环形链表

单链表存在环时，从某个节点开始会反复访问同一批节点。Floyd 算法用 slow 每轮走一步、fast 每轮走两步，在 `O(1)` 额外空间内判断环，并能定位入口。

## 相遇来自环内相对速度

设头到环入口距离为 `a`，入口到第一次相遇点沿环距离为 `b`，环长为 `c`。slow 进入环后，fast 也在环中；两者每轮相对接近一步，所以最多经过 c 轮就会相遇。

~~~ts
type ListNode<T> = {
  value: T
  next: ListNode<T> | null
}

function findMeeting<T>(
  head: ListNode<T> | null,
): ListNode<T> | null {
  let slow = head
  let fast = head

  while (fast !== null && fast.next !== null) {
    slow = slow?.next ?? null
    fast = fast.next.next

    if (slow === fast) return slow
  }

  return null
}
~~~

循环条件先检查 fast 和 fast.next，保证两步访问安全。无环有限链中 fast 最终到达 null，返回 null。
## 从相遇点怎样找到入口

相遇时 slow 走了 `a + b` 步，fast 走了它的两倍。fast 比 slow 多走的距离是若干整圈：

~~~text
2(a + b) = a + b + kc
a + b = kc
a = kc - b
~~~

从相遇点再走 `c - b` 步会到入口，而从头走 a 步也到入口。令一个指针回到 head，另一个留在 meeting，两者每轮各走一步，第一次再相遇的位置就是入口。

~~~ts
function findCycleEntry<T>(
  head: ListNode<T> | null,
): ListNode<T> | null {
  const meeting = findMeeting(head)
  if (meeting === null) return null

  let fromHead = head
  let fromMeeting: ListNode<T> | null = meeting

  while (fromHead !== fromMeeting) {
    fromHead = fromHead?.next ?? null
    fromMeeting = fromMeeting?.next ?? null
  }

  return fromHead
}
~~~

证明只依赖距离同余，不依赖节点值。重复值不能用来判断节点相同，必须比较对象身份。
## 环长从相遇点量一圈

从 meeting 出发沿 next 走到再次回到 meeting，步数就是 c。

~~~ts
function cycleLength<T>(
  head: ListNode<T> | null,
): number {
  const meeting = findMeeting(head)
  if (meeting === null) return 0

  let length = 1
  let current = meeting.next

  while (current !== meeting) {
    length += 1
    current = current?.next ?? null
    if (current === null) {
      throw new Error('list changed during cycle measurement')
    }
  }

  return length
}
~~~

链表在检测期间被其他任务修改会破坏证明。JavaScript 单线程并不自动排除这种情况，`await`、回调或共享 Worker 数据都可能让状态在算法阶段之间变化。同步函数内不让出控制权，才能把结构视为稳定快照。
## Set 方法提供参考实现

用 Set 记录访问过的节点，第一次重复就是入口，时间 `O(n)`、空间 `O(n)`。它更容易理解，适合测试 Floyd 结果。Floyd 节省空间，但证明和实现更容易写错。

测试要构造无环、头自环、尾连头、尾连中间、长前缀短环和重复值节点。断言入口对象身份、环长和原链表未被修改。
