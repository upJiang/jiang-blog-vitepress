---
title: "二叉树的递归与层序遍历"
description: "比较深度优先和广度优先的状态组织方式。"
category: frontend
tags: ["二叉树", "遍历", "TypeScript"]
updated: 2026-08-04
order: 210
depth: reference
series: "算法与数据结构"
---
# 二叉树的递归与层序遍历

遍历顺序由“何时访问根”定义：前序根-左-右，中序左-根-右，后序左-右-根；层序按距离从近到远。递归代码短，但调用栈就是状态；树可能退化很深时要改显式栈/队列。

```ts
interface TreeNode<T> {
  value: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null
}
```

## 递归三序遍历

```ts
function preorder<T>(root: TreeNode<T> | null, output: T[] = []): T[] {
  if (root === null) return output
  output.push(root.value)
  preorder(root.left, output)
  preorder(root.right, output)
  return output
}

function inorder<T>(root: TreeNode<T> | null, output: T[] = []): T[] {
  if (root === null) return output
  inorder(root.left, output)
  output.push(root.value)
  inorder(root.right, output)
  return output
}

function postorder<T>(root: TreeNode<T> | null, output: T[] = []): T[] {
  if (root === null) return output
  postorder(root.left, output)
  postorder(root.right, output)
  output.push(root.value)
  return output
}
```

默认参数在每次顶层调用会新建数组；不要把 output 放模块全局，否则多次调用串结果。每节点恰访问一次，时间 O(n)，额外调用栈 O(h)，输出 O(n)。平衡树 h=O(log n)，退化树 h=O(n)。

递归正确性用结构归纳：空树输出空；假设左右子树函数按定义正确，把根访问放在对应位置后，整树顺序正确。

## 层序遍历

队列保存已发现但未访问的节点：

```ts
function levelOrder<T>(root: TreeNode<T> | null): T[][] {
  if (root === null) return []
  const queue: TreeNode<T>[] = [root]
  let head = 0
  const levels: T[][] = []

  while (head < queue.length) {
    const levelSize = queue.length - head
    const level: T[] = []
    for (let count = 0; count < levelSize; count += 1) {
      const node = queue[head++]!
      level.push(node.value)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    levels.push(level)
  }
  return levels
}
```

循环开始时 `queue[head..]` 恰好是已发现前沿；固定 levelSize 后，本轮新加入的孩子不会混入当前层。时间 O(n)，队列最大 O(w)，w 为树最大宽度；输出 O(n)。用 head 避免 shift。

## 深度、高度与直径

定义空树高度 0、叶子高度 1：

```ts
function height<T>(root: TreeNode<T> | null): number {
  return root === null ? 0 : 1 + Math.max(height(root.left), height(root.right))
}
```

直径是任意两节点最长边数。后序返回高度，同时更新经过当前根的 `leftHeight+rightHeight`：

```ts
function diameter<T>(root: TreeNode<T> | null): number {
  let best = 0
  function visit(node: TreeNode<T> | null): number {
    if (node === null) return 0
    const left = visit(node.left)
    const right = visit(node.right)
    best = Math.max(best, left + right)
    return 1 + Math.max(left, right)
  }
  visit(root)
  return best
}
```

若对每个节点另调用 height，会 O(n²)；后序一次聚合 O(n)。这体现“子问题返回父节点真正需要的信息”。

## 路径和

判断根到叶路径是否等于 target：

```ts
function hasPathSum(root: TreeNode<number> | null, target: number): boolean {
  if (root === null) return false
  const remaining = target - root.value
  if (root.left === null && root.right === null) return remaining === 0
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining)
}
```

必须在叶节点判断，不能中途 remaining=0 就返回，因为题意是根到叶。含负数时也不能以 remaining<0 剪枝。

## 序列化边界

仅前序值无法唯一重建普通二叉树，必须包含 null 标记或配合中序且值唯一。层序序列化尾部 null 可裁剪，但反序列化要限制节点数、深度和输入类型，防止恶意超大树。

外部数据可能不是树：共享子节点形成 DAG，或 next 指回祖先形成环。递归会重复/无限；接口需保证树，或用 Set 检查节点身份。

## 验证

空树、单节点、只有左/右、完全树、退化链、重复值。递归与迭代三序结果互相验证；层序扁平后多重集合应等于所有节点；直径与小规模任意节点对 BFS oracle 比较。

遍历题的关键是帧状态：递归返回前哪些子树已完成，队列当前保存哪一层。访问语句的位置只是这个状态模型的直接表达。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
