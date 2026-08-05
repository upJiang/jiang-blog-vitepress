---
title: "二叉搜索树"
description: "利用有序不变量完成查找、插入、删除和验证。"
category: frontend
tags: ["二叉搜索树", "TypeScript"]
updated: 2026-08-04
order: 220
depth: reference
series: "算法与数据结构"
---
# 二叉搜索树

二叉搜索树（BST）的核心是全局有序不变量，不只是“左孩子小、右孩子大”。对每个节点，左子树所有 key 落在允许的左区间，右子树所有 key 落在右区间；重复值必须选择明确策略：拒绝、计数、统一放一侧。本文默认 key 唯一且左 `< root <` 右。

```ts
interface BstNode<V> {
  key: number
  value: V
  left: BstNode<V> | null
  right: BstNode<V> | null
}
```

## 查找

```ts
function search<V>(root: BstNode<V> | null, key: number): BstNode<V> | null {
  let current = root
  while (current !== null) {
    if (key === current.key) return current
    current = key < current.key ? current.left : current.right
  }
  return null
}
```

每次根据有序不变量排除整棵子树，时间 O(h)，空间 O(1)。平衡树 h=O(log n)，按有序顺序插入普通 BST 会退化链，h=O(n)。“BST 查找 O(log n)”必须带平衡/平均假设。

## 插入与重复策略

返回新根便于处理空树：

```ts
function insert<V>(
  root: BstNode<V> | null,
  key: number,
  value: V
): BstNode<V> {
  if (root === null) return { key, value, left: null, right: null }
  if (key < root.key) root.left = insert(root.left, key, value)
  else if (key > root.key) root.right = insert(root.right, key, value)
  else root.value = value
  return root
}
```

本策略重复 key 更新 value。若多重集合使用 count，节点保存 count；不能一处允许重复放右、一处验证严格区间，否则实现互相矛盾。

递归栈 O(h)，外部大输入可迭代。普通 BST 无并发保护，调用者持有节点引用时原地更新可见；不可变持久树沿查找路径复制 O(h) 节点。

## 删除的三种结构

删除目标节点：无孩子返回 null；单孩子返回孩子；双孩子用右子树最小后继替换 key/value，再删除后继。

```ts
function deleteKey<V>(root: BstNode<V> | null, key: number): BstNode<V> | null {
  if (root === null) return null
  if (key < root.key) root.left = deleteKey(root.left, key)
  else if (key > root.key) root.right = deleteKey(root.right, key)
  else {
    if (root.left === null) return root.right
    if (root.right === null) return root.left

    const successor = minimum(root.right)
    root.key = successor.key
    root.value = successor.value
    root.right = deleteKey(root.right, successor.key)
  }
  return root
}

function minimum<V>(node: BstNode<V>): BstNode<V> {
  let current = node
  while (current.left !== null) current = current.left
  return current
}
```

后继是右子树最小，必大于左侧和当前旧 key，并不大于右子树其他节点；删除原后继避免重复。若节点含不可复制身份/资源，不应只复制字段，应做结构移植或容器级替换。

## 验证 BST：传递区间而非只看孩子

只检查 `node.left.key < node.key` 会漏掉深层越界。例如根 10 的左子树中出现 12，它可能仍大于其直接父。传递上下界：

```ts
function isValidBst<V>(
  node: BstNode<V> | null,
  lower = -Infinity,
  upper = Infinity
): boolean {
  if (node === null) return true
  if (!(lower < node.key && node.key < upper)) return false
  return isValidBst(node.left, lower, node.key) &&
    isValidBst(node.right, node.key, upper)
}
```

若 key 可为 Infinity 或 BigInt，使用 `number | null` 边界或比较器，不能用哨兵。另一验证是中序严格递增，但仍需处理重复策略和初始前值。

## 第 k 小与排名

中序第 k 个是第 k 小，时间 O(h+k)，栈 O(h)：

```ts
function kthSmallest<V>(root: BstNode<V> | null, k: number): number | null {
  if (!Number.isInteger(k) || k <= 0) return null
  const stack: BstNode<V>[] = []
  let current = root
  let remaining = k

  while (current !== null || stack.length > 0) {
    while (current !== null) { stack.push(current); current = current.left }
    const node = stack.pop()!
    remaining -= 1
    if (remaining === 0) return node.key
    current = node.right
  }
  return null
}
```

若频繁排名查询，节点维护 subtreeSize，查第 k 小 O(h)；插入/删除/旋转必须同步更新 size，这增加不变量和测试。

## 有序数组构建平衡 BST

取中点为根，递归左右区间：

```ts
function sortedArrayToBst(values: readonly number[], left = 0, right = values.length): BstNode<null> | null {
  if (left >= right) return null
  const middle = left + Math.floor((right - left) / 2)
  return {
    key: values[middle]!,
    value: null,
    left: sortedArrayToBst(values, left, middle),
    right: sortedArrayToBst(values, middle + 1, right)
  }
}
```

使用半开区间 `[left,right)`。输入必须严格递增（按默认重复策略）；时间 O(n)，栈 O(log n)，树高度最小量级。无需每层 slice，否则增加分配。

## 平衡与自平衡

节点左右高度差不超过 1 是 AVL 风格平衡条件；红黑树用颜色/黑高保证 O(log n)。普通 BST 检查平衡可后序返回高度，发现不平衡返回哨兵，O(n)；若每节点重新求高度会 O(n²)。

自平衡树的旋转必须同时保持 BST 顺序和元数据（高度、size、父指针）。工程中优先成熟实现/数据库索引，不因面试能写 BST 就自制并发平衡树。

## 范围查询

查询 `[low,high]` 时利用剪枝：node.key > low 才需左；key 在范围输出；key < high 才需右。时间 O(h+k)，k 为结果数，而非总 n。分页需要稳定 key 和游标，不能每次从头中序跳 offset。

## 验证

每次随机插入/删除后验证：中序严格递增；节点 key 集合等于参考 Map；isValidBst 为 true；查找与 Map 一致。删除覆盖叶、单左、单右、双子、根、不存在。退化有序输入验证 O(n) 高度，说明为何需要平衡。

BST 的所有优化都建立在同一件事上：每个节点携带一个来自祖先的合法区间。查找排除区间、插入选择区间、删除修复区间、验证检查区间。只看直接孩子会丢掉这个全局不变量。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
