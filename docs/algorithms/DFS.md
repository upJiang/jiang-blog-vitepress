---
title: "深度优先搜索"
description: "用递归或栈探索树、图与组合空间。"
category: frontend
tags: ["DFS", "TypeScript"]
updated: 2026-08-05
order: 230
depth: reference
series: "算法与数据结构"
---
# 深度优先搜索

深度优先搜索（DFS）从一个节点出发，选择一条尚未探索的边继续深入，无法前进时回退。递归调用栈或显式栈负责保存“还有哪些分支没走”，visited 集合负责阻止图中的环让搜索无限重复。

## 图表示决定边的成本

以下实现使用邻接表，顶点是 string，`graph.get(node)` 返回所有出边终点。对稀疏图，存储是 `O(V + E)`；邻接矩阵则占 `O(V²)`，但判断任意边是否存在更直接。

~~~ts
type Graph = ReadonlyMap<string, readonly string[]>

function depthFirstOrder(graph: Graph, start: string): string[] {
  const result: string[] = []
  const visited = new Set<string>()
  const stack = [start]

  while (stack.length > 0) {
    const node = stack.pop()
    if (node === undefined || visited.has(node)) continue

    visited.add(node)
    result.push(node)

    const neighbors = graph.get(node) ?? []
    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index]
      if (!visited.has(neighbor)) stack.push(neighbor)
    }
  }

  return result
}
~~~

逆序压栈让邻接表中的第一个邻居先被访问。若不要求确定遍历顺序，可以省略这个约定，但测试和输出就不能依赖具体序列。
## visited 何时标记会影响重复入栈

上例在弹栈时标记，一个节点可能被多个前驱重复压入，弹出后会被跳过。也可以在入栈时标记，减少重复工作；这时 start 也要先标记，并确保“发现”与“处理”两个时刻的业务语义匹配。

无权最短路通常在 BFS 入队时标记，保证首次发现就是最短层。DFS 不提供最短路径保证，visited 时机主要影响内存和回调时刻。
## 找路径要保存父节点

只返回访问顺序无法重建 start 到 target 的路径。可以在第一次发现邻居时记录 parent，命中后沿父引用反向恢复。

~~~ts
function findPath(
  graph: Graph,
  start: string,
  target: string,
): string[] | null {
  const stack = [start]
  const parent = new Map<string, string | null>([[start, null]])

  while (stack.length > 0) {
    const node = stack.pop()
    if (node === undefined) break
    if (node === target) {
      const path: string[] = []
      let current: string | null = node
      while (current !== null) {
        path.push(current)
        current = parent.get(current) ?? null
      }
      return path.reverse()
    }

    for (const neighbor of graph.get(node) ?? []) {
      if (parent.has(neighbor)) continue
      parent.set(neighbor, node)
      stack.push(neighbor)
    }
  }

  return null
}
~~~

parent Map 同时承担 visited。返回的是某条 DFS 路径，不保证边数最少。若目标不可达返回 null，不能返回空数组混淆“start 等于 target”的合法单节点路径。
## 搜索树与图的 visited 语义不同

组合、排列等回溯问题中，同一个值可能在不同路径上合法出现。全局 visited 会误删其他分支，通常维护的是当前路径的 used 状态，并在回退时撤销。

图遍历中的顶点身份稳定，全局 visited 用于避免重复处理。网格 DFS 也要明确坐标是顶点，移动方向是边，障碍和越界在扩展邻居时过滤。
## 复杂度和深度预算

邻接表中每个可达顶点处理一次，每条可达边检查一次，时间 `O(V + E)`，visited 与栈占 `O(V)`。递归 DFS 的额外空间由最深路径决定，极深输入可能栈溢出。

生产爬取、依赖展开和目录扫描还要限制最大节点、最大深度、超时与取消。算法终止不代表资源消耗可接受。

测试覆盖自环、双向边、多个连通分量、重复边、无目标和固定邻接顺序。再与递归参考实现比较可达集合，不只比较一个偶然相同的访问序列。
