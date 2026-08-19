---
title: "二叉搜索树"
description: "利用有序不变量完成查找、插入、删除和验证。"
category: frontend
tags: ["二叉搜索树", "TypeScript"]
updated: 2026-08-05
order: 220
depth: reference
series: "算法与数据结构"
---
# 二叉搜索树

二叉搜索树（BST）为每个节点维护顺序不变量。若采用严格策略，左子树所有键小于节点键，右子树所有键大于节点键。查找、插入和删除只沿一条根到叶路径，成本取决于树高。

~~~ts
type TreeNode<K, V> = {
  key: K
  value: V
  left: TreeNode<K, V> | null
  right: TreeNode<K, V> | null
}
~~~

## 重复键策略必须先选

可以禁止重复键、让重复统一进入一侧、在节点内保存计数，或把 value 变成列表。本文选择键唯一，插入相同 key 时覆盖 value。比较器必须满足稳定的全序关系，否则搜索路径无法证明。

## 查找每步排除一棵子树

~~~ts
function find<K, V>(
  root: TreeNode<K, V> | null,
  key: K,
  compare: (left: K, right: K) => number,
): TreeNode<K, V> | null {
  let current = root

  while (current !== null) {
    const order = compare(key, current.key)
    if (order === 0) return current
    current = order < 0 ? current.left : current.right
  }

  return null
}
~~~

若 key 小于当前键，根据不变量，当前节点和整个右子树都不可能命中，可以安全进入左子树。时间 `O(h)`，平衡时约 `O(log n)`，退化时 `O(n)`。

## 插入把新节点放在空边

插入沿查找路径前进，遇到 null 时连接新节点。覆盖重复键不能改变左右子树关系。

~~~ts
function insert<K, V>(
  root: TreeNode<K, V> | null,
  key: K,
  value: V,
  compare: (left: K, right: K) => number,
): TreeNode<K, V> {
  if (root === null) return { key, value, left: null, right: null }

  const order = compare(key, root.key)
  if (order < 0) root.left = insert(root.left, key, value, compare)
  else if (order > 0) root.right = insert(root.right, key, value, compare)
  else root.value = value

  return root
}
~~~

递归实现会修改原树。不可变结构需要沿搜索路径复制节点，未变化子树可共享引用，额外空间 `O(h)`。

## 删除分三种结构情况

叶节点直接变成 null；只有一个孩子时，用孩子替代节点；有两个孩子时，用右子树最小节点作为后继，复制其键值后，再从右子树删除后继。

~~~ts
function remove<K, V>(
  root: TreeNode<K, V> | null,
  key: K,
  compare: (left: K, right: K) => number,
): TreeNode<K, V> | null {
  if (root === null) return null

  const order = compare(key, root.key)
  if (order < 0) {
    root.left = remove(root.left, key, compare)
    return root
  }
  if (order > 0) {
    root.right = remove(root.right, key, compare)
    return root
  }

  if (root.left === null) return root.right
  if (root.right === null) return root.left

  let successor = root.right
  while (successor.left !== null) successor = successor.left

  root.key = successor.key
  root.value = successor.value
  root.right = remove(root.right, successor.key, compare)
  return root
}
~~~

右子树最小键大于原节点左子树全部键，且不大于右子树其他键，因此替换后仍保持顺序。若允许重复键，删除后继的规则要与重复策略配套。

## 验证必须检查上下界

只比较节点与直接孩子会漏掉深层违规。递归验证时向左传递新的上界，向右传递新的下界。

中序遍历严格递增也能验证唯一键策略。测试插入和删除后同时检查键集合、搜索结果、顺序不变量和节点数。再用递增输入观察树高退化，说明普通 BST 不提供平衡保证；需要稳定对数高度时选择 AVL、红黑树或由库提供的有序结构。
