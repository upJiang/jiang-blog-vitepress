---
title: "二叉树的迭代遍历"
description: "用显式栈表达前序、中序和后序遍历。"
category: frontend
tags: ["二叉树", "TypeScript"]
updated: 2026-08-05
order: 200
depth: reference
series: "算法与数据结构"
---
# 二叉树的迭代遍历

二叉树遍历要规定节点在什么时刻进入结果。前序在访问子树前处理根，中序在左子树完成后处理根，后序在两个子树都完成后处理根。递归把暂停位置放在调用栈，迭代实现必须显式保存同样的状态。

~~~ts
type TreeNode<T> = {
  value: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null
}
~~~

## 中序遍历保存未处理祖先

~~~ts
function inorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = []
  const stack: TreeNode<T>[] = []
  let current = root

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current)
      current = current.left
    }

    const node = stack.pop()
    if (node === undefined) break

    result.push(node.value)
    current = node.right
  }

  return result
}
~~~

内层循环把左路径压栈。弹出节点时，它的左子树已经处理，节点自身和右子树尚未处理。访问节点后转向右子树，不变量再次成立。

每个节点压栈、弹栈一次，时间 `O(n)`。栈深等于树高 h，额外空间 `O(h)`；平衡树是 `O(log n)`，退化链是 `O(n)`。
## 前序可以在入栈前处理

~~~ts
function preorder<T>(root: TreeNode<T> | null): T[] {
  if (root === null) return []

  const result: T[] = []
  const stack: TreeNode<T>[] = [root]

  while (stack.length > 0) {
    const node = stack.pop()
    if (node === undefined) break

    result.push(node.value)
    if (node.right !== null) stack.push(node.right)
    if (node.left !== null) stack.push(node.left)
  }

  return result
}
~~~

栈后进先出，所以先压右子树，再压左子树，左边才能先访问。调换两行会得到根、右、左的遍历，不是实现细节。
## 后序需要记住访问阶段

一种实现给每个栈帧加 visited 标记。第一次弹出节点时，安排“稍后处理根”，再压右、左子树；第二次弹出才输出节点。

~~~ts
function postorder<T>(root: TreeNode<T> | null): T[] {
  const result: T[] = []
  const stack: Array<{ node: TreeNode<T>; expanded: boolean }> = []

  if (root !== null) stack.push({ node: root, expanded: false })

  while (stack.length > 0) {
    const frame = stack.pop()
    if (frame === undefined) break

    if (frame.expanded) {
      result.push(frame.node.value)
      continue
    }

    stack.push({ node: frame.node, expanded: true })
    if (frame.node.right !== null) {
      stack.push({ node: frame.node.right, expanded: false })
    }
    if (frame.node.left !== null) {
      stack.push({ node: frame.node.left, expanded: false })
    }
  }

  return result
}
~~~

expanded 相当于递归函数从两个子调用返回后的程序计数器。只压节点却不保存阶段，往往需要额外的 lastVisited 指针或反转结果。
## 输入若不是树会失去终止保证

算法假设节点没有环，且每个节点最多由一个父节点拥有。共享子树会被访问多次，环会导致无限循环。通用对象图遍历要增加 visited Set，复杂度按可达节点和边计算。

验证遍历时，生成随机小树，与递归参考实现比较三种序列。覆盖空树、单节点、全左、全右、重复值和深树；节点值重复时，测试可给每个节点附唯一 id，避免序列相同掩盖访问错误。
