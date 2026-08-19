---
title: "链表倒数节点与快慢指针"
description: "通过固定间距指针处理倒数位置和删除操作。"
category: frontend
tags: ["链表", "双指针", "TypeScript"]
updated: 2026-08-05
order: 170
depth: reference
series: "算法与数据结构"
---
# 链表倒数节点与快慢指针

寻找单链表倒数第 k 个节点时，无法从尾部直接向前走。快慢指针让两个引用保持固定距离：fast 先走 k 步，随后 fast 与 slow 同速前进；fast 到达链尾时，slow 恰好位于目标。

## 合同先决定 k 的含义

这里使用从 1 开始的 k：k 为 1 返回尾节点，k 等于链表长度返回头节点。k 不是正整数或大于长度时返回 null。

~~~ts
type ListNode<T> = {
  value: T
  next: ListNode<T> | null
}

function kthFromEnd<T>(
  head: ListNode<T> | null,
  k: number,
): ListNode<T> | null {
  if (!Number.isInteger(k) || k <= 0) return null

  let fast = head
  for (let step = 0; step < k; step += 1) {
    if (fast === null) return null
    fast = fast.next
  }

  let slow = head
  while (fast !== null && slow !== null) {
    fast = fast.next
    slow = slow.next
  }

  return slow
}
~~~

先行阶段结束后，fast 比 slow 超前 k 条边。同步移动保持距离不变。fast 走出链表时，slow 后方恰好还有 k 个节点，因此 slow 是倒数第 k 个。
## 为什么不能先算长度就结束讨论

先扫描长度 L，再从头走 `L - k` 步同样是 `O(n)` 时间和 `O(1)` 空间，也更直观。快慢指针的优势是单次通过，适合流式访问或希望减少第二次遍历的接口。

若链表节点位于慢速外部存储，两次扫描的 I/O 成本可能明显不同；普通内存链表则要通过基准判断常数差异。复杂度相同不代表工程成本相同。
## 删除倒数节点需要哨兵

删除倒数第 k 个节点时，需要修改目标的前驱。给头节点前放一个 sentinel，可把“删除头”纳入同一路径。

~~~ts
function removeKthFromEnd<T>(
  head: ListNode<T> | null,
  k: number,
): ListNode<T> | null {
  if (!Number.isInteger(k) || k <= 0) return head

  const sentinel: ListNode<T | undefined> = {
    value: undefined,
    next: head,
  }

  let fast: ListNode<T | undefined> | null = sentinel
  let slow: ListNode<T | undefined> | null = sentinel

  for (let step = 0; step < k + 1; step += 1) {
    if (fast === null) return head
    fast = fast.next
  }

  while (fast !== null && slow !== null) {
    fast = fast.next
    slow = slow.next
  }

  if (slow?.next !== null && slow?.next !== undefined) {
    slow.next = slow.next.next
  }

  return sentinel.next as ListNode<T> | null
}
~~~

这里让 fast 领先 k + 1 条边，使 slow 最终停在待删除节点前驱。非法 k 保持原链不变，这是接口选择，也可以改成抛错，但要统一测试。
## 固定间距模式的迁移

相同不变量可用于找中点、分隔窗口和判断两个位置距离。找中点时 fast 每轮走两步、slow 走一步，fast 到尾部时 slow 走了约一半。偶数长度返回左中点还是右中点，取决于循环条件。

快慢指针假设链表无环。有环时 fast 不会到达 null，算法可能无限循环。若输入不可信，先判环或设置步数预算。

测试覆盖空链、单节点、k 为 1、k 等于长度、k 越界、非整数和删除头尾。除了值序列，还要断言未删除节点身份保持不变。
