---
title: "二叉树的迭代遍历"
description: "用显式栈表达前序、中序和后序遍历。"
category: frontend
tags: ["二叉树", "TypeScript"]
updated: 2026-08-04
order: 200
depth: reference
series: "算法与数据结构"
---
# 二叉树的迭代遍历

把递归改成迭代，不是把节点随便 push 进数组。递归帧隐式保存“当前节点、下一步去哪个孩子、返回后做什么”，显式栈也必须表达同样状态。前序可先访问再压孩子；中序要一路压左链；后序要知道右子树是否已处理。

```ts
interface TreeNode<T> {
  value: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null
}
```

## 前序：根、左、右

栈后进先出，所以先压右再压左：

```ts
function preorderIterative<T>(root: TreeNode<T> | null): T[] {
  if (root === null) return []
  const stack = [root]
  const output: T[] = []

  while (stack.length > 0) {
    const node = stack.pop()!
    output.push(node.value)
    if (node.right) stack.push(node.right)
    if (node.left) stack.push(node.left)
  }
  return output
}
```

栈顶是下一待访问节点。时间 O(n)，栈 O(h) 到 O(n)（取决于形状；完整树某层也可能较宽，但 DFS 栈通常与待处理分支相关）。

## 中序：左、根、右

```ts
function inorderIterative<T>(root: TreeNode<T> | null): T[] {
  const stack: TreeNode<T>[] = []
  const output: T[] = []
  let current = root

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current)
      current = current.left
    }
    const node = stack.pop()!
    output.push(node.value)
    current = node.right
  }
  return output
}
```

内层结束时 stack 保存从祖先到最左未访问节点的路径；弹出节点的左子树已完成，访问根后转右。BST 中序按其重复策略应非降，是验证不变量的证据。

## 后序：左、右、根

用帧标记 expanded，第一次见节点时安排“完成根”并让左右子树先执行：

```ts
function postorderIterative<T>(root: TreeNode<T> | null): T[] {
  if (root === null) return []
  const stack: Array<{ node: TreeNode<T>; expanded: boolean }> = [
    { node: root, expanded: false }
  ]
  const output: T[] = []

  while (stack.length > 0) {
    const frame = stack.pop()!
    if (frame.expanded) {
      output.push(frame.node.value)
      continue
    }
    stack.push({ node: frame.node, expanded: true })
    if (frame.node.right) stack.push({ node: frame.node.right, expanded: false })
    if (frame.node.left) stack.push({ node: frame.node.left, expanded: false })
  }
  return output
}
```

这比“根右左后 reverse”多一点状态，但可直接流式输出，不需反转结果。也可用 `lastVisited` 单栈，逻辑更紧凑但更容易错。

## 统一颜色标记模型

把白色帧表示待展开、灰色表示待访问，就能用不同压栈顺序统一三序。它适合理解帧，不一定比专用实现更快。抽象应减少错误而非炫技。

## 层序衍生：右视图与锯齿

右视图是每层最后访问值：

```ts
function rightSideView<T>(root: TreeNode<T> | null): T[] {
  if (root === null) return []
  const queue = [root]
  let head = 0
  const output: T[] = []

  while (head < queue.length) {
    const levelSize = queue.length - head
    for (let offset = 0; offset < levelSize; offset += 1) {
      const node = queue[head++]!
      if (offset === levelSize - 1) output.push(node.value)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
  }
  return output
}
```

锯齿层序不需要真的反向 enqueue（会影响下一层顺序），可按层预分配数组，根据方向写入 `offset` 或 `size-1-offset`。

## 翻转二叉树

每节点交换左右孩子，DFS/BFS 均可：

```ts
function invertTree<T>(root: TreeNode<T> | null): TreeNode<T> | null {
  if (root === null) return null
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    ;[node.left, node.right] = [node.right, node.left]
    if (node.left) stack.push(node.left)
    if (node.right) stack.push(node.right)
  }
  return root
}
```

会原地修改树；不可变版本创建新节点，空间 O(n)。翻转两次恢复原结构和值（节点身份原地版不变），可作属性测试。

## 重建树

前序 + 中序且值唯一时可重建：前序首项是根，中序定位后划左右规模。若每次线性查中序会 O(n²)，先建 value->index Map 得 O(n)。重复值时映射不唯一，需要额外身份或不同协议。

重建递归深度可能 O(n)，外部输入要限制；遍历数组必须长度一致且元素集合一致，否则抛协议错误，不返回半棵树。

## 迭代的工程收益与成本

显式栈避免调用栈上限，可设置每批节点预算、暂停、取消和记录进度；但它仍持有节点引用，并可能在极宽/深输入占大量内存。遍历 DOM/外部对象图还需 visited 防环，二叉树题的“无环独占节点”不能默认迁移到工程数据。

## 验证

用递归三序作小规模 oracle，与迭代结果比较；对 100k 深链，迭代应完成而递归可能溢出；翻转前后验证节点集合与双重翻转；后序保证父节点索引大于所有后代。

迭代树遍历真正训练的是把隐式控制流变成数据。只要每个栈帧能回答“这个节点的哪些阶段已经完成”，前中后序就不再是三个孤立模板。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
