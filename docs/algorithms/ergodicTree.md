---
title: "二叉树的递归与层序遍历"
description: "比较深度优先和广度优先的状态组织方式。"
category: frontend
tags: ["二叉树", "遍历", "TypeScript"]
updated: 2026-08-05
order: 210
depth: reference
series: "算法与数据结构"
---
# 二叉树的递归与层序遍历

递归 DFS 沿一个分支深入，BFS 用队列按层推进。两者都访问每个节点一次，差别在于保存什么边界：DFS 保存未返回的祖先，BFS 保存下一批尚未展开的同层或后续层节点。

~~~ts
type TreeNode<T> = {
  value: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null
}
~~~

## 递归定义直接映射树结构

~~~ts
function depth<T>(node: TreeNode<T> | null): number {
  if (node === null) return 0
  return 1 + Math.max(depth(node.left), depth(node.right))
}
~~~

基线定义空树深度为 0。递归假设能正确求出左右子树深度，再取较大值加根这一层。证明可按树高归纳。

时间 `O(n)`，调用栈 `O(h)`。退化树深度 n 时，JavaScript 可能超过最大调用栈，生产输入不可信时用显式栈并设置节点预算。

## 层序遍历要冻结当前层长度

~~~ts
function levels<T>(root: TreeNode<T> | null): T[][] {
  if (root === null) return []

  const queue: TreeNode<T>[] = [root]
  let head = 0
  const result: T[][] = []

  while (head < queue.length) {
    const levelSize = queue.length - head
    const level: T[] = []

    for (let count = 0; count < levelSize; count += 1) {
      const node = queue[head]
      head += 1
      level.push(node.value)

      if (node.left !== null) queue.push(node.left)
      if (node.right !== null) queue.push(node.right)
    }

    result.push(level)
  }

  return result
}
~~~

进入外层循环时，队列未消费前缀后的前 levelSize 个节点正好属于当前层。处理过程中追加的是下一层，冻结长度可以防止它们提前进入当前结果。

使用 head 指针避免 `shift()` 反复移动数组。一次性遍历后数组仍保留所有节点，若持续处理无限数据应改用环形队列。

## DFS 与 BFS 的空间峰值不同

DFS 峰值与树高 h 相关，BFS 峰值与最宽一层 w 相关。完全平衡树中 h 较小而最后一层很宽，DFS 更省空间；极深窄树中 BFS 队列可能很小，而递归 DFS 会栈溢出。

寻找无权树中离根最近的目标，BFS 第一次命中就能返回最短边数。需要后序聚合子树信息，DFS 更自然。选择依据是目标和空间形状，不能只凭习惯。

## 遍历期间修改树会改变证明

在访问回调里追加子节点，BFS 可能把新节点加入后续层，DFS 也可能进入新分支。需要快照语义时，先复制结构或禁止回调修改；需要动态语义时，明确新增节点是否应被本轮看到。

## 验证层边界

构造完全树、退化树、左右不对称树和重复值树。断言所有节点访问一次、每层顺序、深度与层数一致。再用唯一节点 id 和 visited Set 检测输入是否含环或共享节点，避免把图误当成树。
