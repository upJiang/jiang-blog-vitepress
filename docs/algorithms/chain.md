---
title: "链表合并与反转"
description: "围绕 next 指针不变量完成链表反转与有序合并。"
category: frontend
tags: ["链表", "TypeScript"]
updated: 2026-08-05
order: 160
depth: reference
series: "算法与数据结构"
---

# 链表合并与反转

反转链表 `1 -> 2 -> 3` 时，若先执行 `current.next = previous`，又没有保存原来的 `current.next`，后面的 `2 -> 3` 就失去引用。链表题的核心不是背三行代码，而是每次改指针前知道哪些部分已经处理、哪些部分仍要访问。

本篇先反转单链表，再用同一指针思维合并两个有序链表。节点默认无环且由当前算法拥有修改权；共享链表若原地改动，会影响其他引用者。

## 反转的不变量

循环开始时：`previous` 指向已经反转好的前缀，`current` 指向尚未处理的后缀。先保存 `next`，再把 current 接到 previous，最后两个指针向前移动。

这里的“前缀”和“后缀”按节点身份划分，而不是按 value。循环每推进一次，恰好有一个节点从未处理后缀移动到已反转前缀；两个区域互不遗漏，也不重复。只要在改写 next 前保住后缀入口，剩余节点就始终可达。

```mermaid
flowchart LR
  P[已反转前缀 previous] <-.- C[current]
  C --> N[未处理后缀 next]
  N --> X[其余节点]
```

## 步骤一：保存后继再改指针

下面输入链表头，输出新的头。原链表节点被原地复用，时间 O(n)，额外空间 O(1)。

```ts
interface ListNode<T> {
  value: T
  next: ListNode<T> | null
}

function reverseList<T>(head: ListNode<T> | null): ListNode<T> | null {
  let previous: ListNode<T> | null = null
  let current = head

  while (current) {
    const next = current.next
    current.next = previous
    previous = current
    current = next
  }

  return previous
}
```

处理 1 后，previous 是 `1 -> null`，current 是 2；处理 2 后，previous 是 `2 -> 1`，current 是 3。循环结束时后缀为空，previous 正好覆盖全部节点。

函数的输入头可能为 null，输出也可能为 null；非空输入返回原链表最后一个节点。关键逻辑只重连 next，没有创建业务节点，因此测试还应比较反转前后的节点引用集合完全相同。

## 步骤二：有序合并只移动一个头

两个升序链表合并时，较小头节点一定是剩余结果的第一个。使用 dummy 节点简化“结果头还没确定”的分支：比较两个头，将较小节点接到 tail，再移动对应链表。一个链表耗尽后，剩余链已经有序，可以整体接上。

若要求稳定合并，值相等时优先选择左链表。时间 O(m+n)，只重连节点时额外空间 O(1)。输入可能共享尾部时，原地合并需额外定义所有权，避免形成重复引用或环。

## 边界与失败结果

空链表反转仍为空，单节点返回自身；合并时一侧为空直接返回另一侧。递归实现更接近定义，却占用 O(n) 调用栈，深链表在 JavaScript 中可能溢出，迭代更稳妥。

测试不只比较值数组，还要检查节点数量没有变化、尾节点 next 为 null、没有形成环。故意删除 `const next` 或忘记移动 current，测试应分别出现丢节点或无限循环。

下一篇使用两个保持固定间距的指针，在一次扫描中找到倒数节点。
