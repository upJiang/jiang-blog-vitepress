---
title: "排序算法"
description: "理解常见排序的稳定性、复杂度和适用数据分布。"
category: frontend
tags: ["排序", "TypeScript"]
updated: 2026-08-04
order: 190
depth: reference
series: "算法与数据结构"
---
# 排序算法

排序不只比较时间复杂度。还要明确是否稳定、是否原地、输入是否接近有序、比较成本、内存预算，以及是否允许修改输入。JavaScript `Array.prototype.sort` 会原地修改数组；没有比较函数时按字符串序排序，`[2,10].sort()` 得到 `[10,2]`。现代 ECMAScript 要求稳定排序，但具体算法和额外空间由引擎决定。

## 比较维度

| 算法 | 最好 | 平均/最坏 | 额外空间 | 稳定 | 适合 |
| --- | --- | --- | --- | --- | --- |
| 冒泡（带提前结束） | O(n) | O(n²) | O(1) | 是 | 教学、极小近有序 |
| 选择 | O(n²) | O(n²) | O(1) | 通常否 | 写入次数少的小数组 |
| 插入 | O(n) | O(n²) | O(1) | 是 | 小数组、近有序、混合排序子段 |
| 归并 | O(n log n) | O(n log n) | O(n) | 可稳定 | 链表、外部排序、稳定要求 |
| 快速 | O(n log n) | O(n²) | 平均 O(log n) 栈 | 通常否 | 内存数组、良好 pivot |
| 堆排序 | O(n log n) | O(n log n) | O(1) | 否 | 最坏界与低额外空间 |

## 冒泡：有序后缀不变量

每一轮把未排序区最大值交换到末尾：

```ts
function bubbleSort(values: readonly number[]): number[] {
  const result = [...values]
  for (let end = result.length - 1; end > 0; end -= 1) {
    let swapped = false
    for (let index = 0; index < end; index += 1) {
      if (result[index]! > result[index + 1]!) {
        ;[result[index], result[index + 1]] = [result[index + 1]!, result[index]!]
        swapped = true
      }
    }
    if (!swapped) break
  }
  return result
}
```

第 k 轮后，末尾 k 个元素已在最终位置。只在严格大于时交换，相等项保持相对顺序，故稳定。近有序且第一轮无交换时 O(n)，最坏 O(n²)。

## 选择：最小值位置不变量

第 i 轮在 `[i,n)` 找最小值放到 i。比较始终 O(n²)，交换至多 O(n)。普通交换会跨过相等元素，因此不稳定。例如标记相同 key 的 `2a,2b,1`，交换 2a 与 1 后相对顺序变成 2b,2a。

```ts
function selectionSort(values: readonly number[]): number[] {
  const result = [...values]
  for (let start = 0; start < result.length; start += 1) {
    let minimum = start
    for (let index = start + 1; index < result.length; index += 1) {
      if (result[index]! < result[minimum]!) minimum = index
    }
    if (minimum !== start) {
      ;[result[start], result[minimum]] = [result[minimum]!, result[start]!]
    }
  }
  return result
}
```

## 插入：有序前缀不变量

`[0,i)` 已有序，把 values[i] 插入正确位置。比 key 大的元素右移，相等不移动，因此稳定：

```ts
function insertionSort(values: readonly number[]): number[] {
  const result = [...values]
  for (let index = 1; index < result.length; index += 1) {
    const value = result[index]!
    let cursor = index - 1
    while (cursor >= 0 && result[cursor]! > value) {
      result[cursor + 1] = result[cursor]!
      cursor -= 1
    }
    result[cursor + 1] = value
  }
  return result
}
```

移动次数等于逆序对数量，所以近有序时接近 O(n)。实际高性能排序常在小分区使用插入排序，因为常数低、缓存友好。

## 归并：分治与稳定合并

递归排序两半，再线性合并。合并相等时先取左侧保持稳定：

```ts
function mergeSort(values: readonly number[]): number[] {
  if (values.length <= 1) return [...values]
  const middle = Math.floor(values.length / 2)
  return merge(mergeSort(values.slice(0, middle)), mergeSort(values.slice(middle)))
}

function merge(left: readonly number[], right: readonly number[]): number[] {
  const output: number[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i]! <= right[j]!) output.push(left[i++]!)
    else output.push(right[j++]!)
  }
  return output.concat(left.slice(i), right.slice(j))
}
```

递推 `T(n)=2T(n/2)+O(n)`，时间 O(n log n)，额外数组 O(n)，递归栈 O(log n)。示例多次 slice 有额外分配；高性能版复用缓冲区和索引范围。链表归并可 O(1) 连接节点。

## 快速排序：分区不变量

选择 pivot，把小于、等于、大于分区。两路原地分区遇大量重复值可能退化，三路分区更稳：

```ts
function quickSort(values: number[], low = 0, high = values.length - 1): void {
  if (low >= high) return
  const pivot = values[low + Math.floor(Math.random() * (high - low + 1))]!
  let less = low
  let scan = low
  let greater = high

  while (scan <= greater) {
    if (values[scan]! < pivot) {
      ;[values[less], values[scan]] = [values[scan]!, values[less]!]
      less += 1
      scan += 1
    } else if (values[scan]! > pivot) {
      ;[values[scan], values[greater]] = [values[greater]!, values[scan]!]
      greater -= 1
    } else scan += 1
  }
  quickSort(values, low, less - 1)
  quickSort(values, greater + 1, high)
}
```

循环中 `[low,less)` 小于 pivot，`[less,scan)` 等于，`(greater,high]` 大于，`[scan,greater]` 未分类。随机 pivot 使期望 O(n log n)，最坏仍 O(n²)。深递归可先递归较小分区、循环处理较大分区，把栈限制到 O(log n)。

## 比较器必须形成一致顺序

比较器返回负/零/正并应满足反对称、传递和稳定一致。随机比较器 `sort(() => Math.random()-0.5)` 不产生均匀洗牌且违反传递性；使用 Fisher-Yates。

多字段排序先比较主字段，相等再比较次字段。字符串 locale 排序用复用的 `Intl.Collator`，不要在比较函数内每次创建。比较器可能执行 O(n log n) 次，昂贵派生值先 decorate-sort-undecorate 缓存。

## 非比较排序的约束

计数排序在整数范围 k 较小时 O(n+k)，空间 O(k)；基数排序依赖位数与基数；它们绕过比较排序的 Ω(n log n) 下界，因为利用了 key 结构。若值范围巨大，计数数组不可接受。不能只看到线性复杂度就称“更优”。

## 验证

任意排序结果应满足：长度相同、多重集合相同、相邻非降。与 `[...input].sort((a,b)=>a-b)` 作 oracle，覆盖空、重复、已排序、逆序、全相等、负数和大数组。稳定性用 `{key,originalIndex}` 验证相同 key 的 index 递增。

性能基准区分随机、近有序、重复值多和逆序，并隔离复制成本。选择排序算法的正确方式是先写契约和数据分布，再用复杂度与基准选，而不是给所有场景一个“最快排序”。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
