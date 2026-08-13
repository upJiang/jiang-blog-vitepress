---
title: "数据结构基础"
description: "从访问模式出发选择数组、链表、栈、队列、树与图。"
category: frontend
tags: ["数据结构", "TypeScript"]
updated: 2026-08-05
order: 100
depth: reference
series: "算法与数据结构"
---

# 数据结构基础

有一批任务：页面要按 ID 查任务，Worker 要按到达顺序消费，调度器还要随时取得最高优先级。用一个数组也能勉强完成，但按 ID 查找要扫描，头部删除会移动元素，取最高优先级又要排序。

数据结构的选择来自“最常做什么操作”。本篇先比较数组、Map、链表、栈、队列、树、堆和图，再用任务调度说明为什么工程中常组合多个结构。

## 先看操作成本

| 结构 | 擅长的访问 | 关键不变量 |
| --- | --- | --- |
| 动态数组 | 下标读取、顺序扫描 | 连续整数索引 |
| Map / Set | 按 Key 查找、唯一集合 | Key 的相等语义 |
| 链表 | 已知节点后的插入删除 | next 关系不断裂 |
| 栈 | 撤销、括号、DFS | 后进先出 |
| 队列 | 调度、BFS | 先进先出 |
| 堆 | 反复取得最小或最大值 | 父子局部有序 |
| 树 | 层级、范围查找 | 父子与特定有序规则 |
| 图 | 任意关系、路径 | 节点、边与访问状态 |

数组下标通常是 `O(1)`，按值查找是 `O(n)`；尾部追加摊还 `O(1)`，中间插入需要移动后缀。Map/Set 在现代实现中通常提供次线性访问，但 ECMAScript 不承诺某一种哈希表或绝对最坏 `O(1)`。

## 步骤一：先写访问模式

如果页面频繁按 ID 更新任务，使用 `Map<id, task>`；如果 Worker 只取最早任务，使用 Queue；如果每次取优先级最高任务，使用 Heap。链表的 `O(1)` 插入只有在已经持有节点或前驱时成立，从头找第 k 个仍是 `O(k)`。

树也不是自动有序。“二叉树”只限制每个节点最多两个孩子；二叉搜索树额外要求左右有序；堆只保证父子优先级，不保证完整排序。写出不变量后，算法才有正确性依据。

## 步骤二：组合结构满足多种查询

任务既要按 ID 更新，又要按优先级取出，单个结构很难同时做到。可以用 Map 保存 ID 到任务，用最小堆保存优先级。更新时两边必须共同变化，删除也要处理堆中的旧条目。

下面是更简单的“Map + FIFO Queue”示例。输入是带 ID 的任务；Queue 保存到达顺序，Map 保存当前记录。取消任务后，出队时跳过已从 Map 删除的旧 ID。

```ts
type Task = { id: string; title: string }

class TaskQueue {
  private readonly records = new Map<string, Task>()
  private readonly order: string[] = []
  private head = 0

  enqueue(task: Task) {
    if (this.records.has(task.id)) throw new Error('DUPLICATE_TASK')
    this.records.set(task.id, task)
    this.order.push(task.id)
  }

  cancel(id: string) {
    this.records.delete(id)
  }

  dequeue(): Task | undefined {
    while (this.head < this.order.length) {
      const task = this.records.get(this.order[this.head++]!)
      if (task) {
        this.records.delete(task.id)
        return task
      }
    }
  }
}
```

头索引避免 `shift()` 反复移动数组。取消只更新 Map，因此是惰性删除；大量历史 ID 时还要按阈值压缩数组。两个结构共同表达一个抽象，测试要检查它们不会产生重复任务或返回已取消任务。

## 步骤三：理论成本还要结合运行时

数组通常有较好的内存局部性，数据量小时可能比指针结构更快。链表节点有额外对象和 GC 成本。递归树深度可能超过 JavaScript 调用栈，工程输入常使用显式栈并限制节点数。

图的邻接表适合稀疏关系，邻接矩阵适合节点少且需要常数时间判断边。DFS/BFS 都要记录 visited；无向边通常保存两个方向，不连通图需要从每个未访问节点继续启动。

## 怎样验证选择正确

除了示例输出，还要验证结构属性：Stack 的弹出顺序是输入反向；Queue 保持到达顺序；Heap 每个父节点满足优先级；BST 中序结果满足重复值策略；图遍历让每个可达节点恰好访问一次。

边界包括空结构、单元素、重复 Key、非法索引、环、退化深度和大规模。复杂度不是 API 名称自带的标签，要把查找位置、摊还扩容和隐藏复制都算入完整操作。
