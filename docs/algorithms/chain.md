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

单链表节点只保存当前值和下一个节点引用。算法修改的是引用关系，原节点对象通常会被复用。反转与有序合并都可以做到线性时间和常数额外空间，前提是每次改指针前保留仍要访问的后继。

~~~ts
export type ListNode<T> = {
  value: T
  next: ListNode<T> | null
}
~~~

## 反转维护两段链

扫描过程中，`previous` 指向已经反转完成的前缀，`current` 指向尚未处理的后缀。循环开始时两段合起来恰好覆盖原链表，且没有节点丢失。

~~~ts
export function reverseList<T>(
  head: ListNode<T> | null,
): ListNode<T> | null {
  let previous: ListNode<T> | null = null
  let current = head

  while (current !== null) {
    const next = current.next
    current.next = previous
    previous = current
    current = next
  }

  return previous
}
~~~

保存 `next` 必须发生在覆盖 `current.next` 之前。否则尚未处理的后缀失去入口，只能得到一个被截断的链表。

每个节点访问一次，时间 `O(n)`，只使用三个引用，额外空间 `O(1)`。递归实现需要 `O(n)` 调用栈，并可能在长链上溢出。

## 原地反转会改变调用方数据

函数返回新头节点，但节点仍是原对象。旧 head 在反转后变成尾节点，`head.next` 为 null。若其他模块持有中间节点引用，它们看到的 next 也会变化。

不可变数据模型需要创建新节点：

~~~ts
export function reverseCopy<T>(
  head: ListNode<T> | null,
): ListNode<T> | null {
  let result: ListNode<T> | null = null
  let current = head

  while (current !== null) {
    result = { value: current.value, next: result }
    current = current.next
  }

  return result
}
~~~

这会增加 `O(n)` 空间，但不修改输入。接口文档必须写清采用哪种语义。

## 有序合并只移动一个头

假设两个输入链表分别按比较器非降序排列。每轮比较当前头节点，把较小者接到结果尾部，并只推进对应链表。

~~~ts
export function mergeSorted<T>(
  first: ListNode<T> | null,
  second: ListNode<T> | null,
  compare: (left: T, right: T) => number,
): ListNode<T> | null {
  const sentinel: ListNode<T | undefined> = {
    value: undefined,
    next: null,
  }
  let tail: ListNode<T | undefined> = sentinel
  let left = first
  let right = second

  while (left !== null && right !== null) {
    if (compare(left.value, right.value) <= 0) {
      const next = left.next
      tail.next = left
      tail = left
      left = next
    } else {
      const next = right.next
      tail.next = right
      tail = right
      right = next
    }
  }

  tail.next = left ?? right
  return sentinel.next as ListNode<T> | null
}
~~~

循环不变量是结果链已排序，且 tail 是结果最后一个节点；两个未处理后缀仍各自有序。选择较小头不会漏掉更小元素，因为它已经是该后缀最小值。

比较相等时先取 first，使来自 first 的相等节点保持在 second 之前，这是一种稳定策略。若输入无序，函数不会自动修复，只会产生不满足合同的结果。

## 哨兵节点减少头部特判

sentinel 只提供统一的连接起点，不进入最终结果。没有它时，第一次选出的节点需要单独初始化 head 和 tail，后续逻辑容易出现空引用分支。

类型系统不允许无意义的 T 值时，可以定义内部哨兵联合类型，最终返回前再缩窄。不要用 `0 as T` 伪造业务值。

## 环会破坏终止性

反转和合并都假设输入是有限无环链。若存在环，while 不会到达 null。公共库可以先做 Floyd 判环，或接受调用方合同并在调试模式设置最大步数。

测试要检查节点值序列、引用身份、尾节点 next 为 null、节点数守恒和是否意外形成环。空链、单节点、两个长度不等链、重复值和共享尾部也要单独处理；两个输入若共享节点，原地合并可能形成重复连接，不属于普通合同。
