---
title: "深度优先搜索"
description: "用递归或栈探索树、图与组合空间。"
category: frontend
tags: ["DFS", "TypeScript"]
updated: 2026-08-04
order: 230
depth: reference
series: "算法与数据结构"
---
# 深度优先搜索

DFS 沿一条路径尽可能深入，无法继续再回退。树中父子结构保证无环时可直接递归；图中必须维护 visited；组合搜索还要维护路径选择与撤销。DFS 的“栈本质”指待完成帧后进先出，不等于所有题都应写递归。

## 图遍历

```ts
type Graph = ReadonlyMap<string, readonly string[]>

function depthFirst(graph: Graph, start: string): string[] {
  if (!graph.has(start)) return []
  const visited = new Set<string>()
  const stack = [start]
  const order: string[] = []

  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    order.push(node)

    const neighbors = graph.get(node) ?? []
    for (let index = neighbors.length - 1; index >= 0; index -= 1) {
      const neighbor = neighbors[index]!
      if (!visited.has(neighbor)) stack.push(neighbor)
    }
  }
  return order
}
```

反向压邻居使遍历顺序与按原顺序递归一致，但 DFS 顺序通常不是唯一正确答案。visited 可在入栈或出栈时标：入栈避免重复候选、内存更稳；出栈实现简单但节点可能多次入栈。上例出栈标且 push 前检查仍可能被不同父重复 push。

时间 O(V+E)，空间 O(V)。若要遍历所有不连通分量，对每个未访问节点启动一次 DFS。

## 递归与颜色状态

有向图环检测不能只有 boolean visited，因为遇到“已完成”节点不是环。三色：白未访问、灰在当前递归路径、黑已完成；边指向灰节点才是回边。

```ts
function hasDirectedCycle(graph: Graph): boolean {
  const color = new Map<string, 0 | 1 | 2>()

  function visit(node: string): boolean {
    color.set(node, 1)
    for (const neighbor of graph.get(node) ?? []) {
      const state = color.get(neighbor) ?? 0
      if (state === 1) return true
      if (state === 0 && visit(neighbor)) return true
    }
    color.set(node, 2)
    return false
  }

  for (const node of graph.keys()) {
    if ((color.get(node) ?? 0) === 0 && visit(node)) return true
  }
  return false
}
```

无向图中返回父边不算环，要传 parent 或按边 ID；多重边时简单 parent 节点策略还需明确。

## 网格岛屿

网格是隐式图，节点 `(row,column)`，边由上下左右产生。原地把陆地标记为已访问可省 Set，但会修改输入：

```ts
function countIslands(grid: string[][]): number {
  const rows = grid.length
  let count = 0

  function flood(startRow: number, startColumn: number): void {
    const stack: Array<readonly [number, number]> = [[startRow, startColumn]]
    grid[startRow]![startColumn] = '0'
    while (stack.length > 0) {
      const [row, column] = stack.pop()!
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const nr = row + dr
        const nc = column + dc
        if (nr >= 0 && nr < rows && nc >= 0 && nc < (grid[nr]?.length ?? 0) && grid[nr]![nc] === '1') {
          grid[nr]![nc] = '0'
          stack.push([nr, nc])
        }
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < grid[row]!.length; column += 1) {
      if (grid[row]![column] === '1') { count += 1; flood(row, column) }
    }
  }
  return count
}
```

标记在 push 时做，避免同一格被邻居重复压栈。支持不规则行；若协议要求矩形，入口先验证。时间 O(总格数)，栈最坏 O(总格数)。

## 路径与可达性

只判断可达可在找到目标时提前返回；需要实际路径时保存 parent Map，找到后从 target 回溯。不要在每个栈项复制整条 path，可能让空间/时间变 O(V²)；parent 每节点一个 O(V)。

DFS 找到的路径不保证无权图最短，最短边数用 BFS。加权最短路根据权重用 Dijkstra/Bellman-Ford 等。

## 拓扑排序

三色 DFS 在节点完成（变黑）时压入结果，最后反转，得到 DAG 拓扑序。检测灰回边则无拓扑序。Kahn 入度队列也可，且更易给出并行层。选择取决于是否还要环路径、递归深度和输出要求。

## 组合空间中的 DFS

全排列/组合也可视为树：状态是已选路径，边是下一选择，叶子是完整解。与图不同，同一个值在不同路径可能合法，不能用全局 visited；使用当前路径 used 或 startIndex，并在返回时撤销。

剪枝必须证明被删分支不可能含答案。例如正数和超过 target 可剪，含负数则不成立。Memoization 适合不同路径到达相同状态且后续答案只由状态决定的搜索。

## 深度与资源上限

JS 递归没有可依赖的尾调用优化，深图用显式栈。处理用户输入还设置最大节点、边、深度和截止时间；仅 visited 防环不防百万节点耗尽内存。

遍历邻居期间图若被修改，结果语义不稳定。使用不可变快照、版本号或禁止并发写；不要一边迭代 Map 一边添加边却声称遍历的是某个确定版本。

## 验证

覆盖树、环、自环、DAG、不连通、重复边、深链和巨大宽图。DFS 输出验证每个可达节点恰一次、每相邻父子关系合法；环检测与 Kahn 结果交叉；网格与 Union-Find/小规模 oracle 比较。

故意移除 visited，环用例应超预算失败；把三色简化 boolean，有向 DAG 汇合与真实环应区分。DFS 的正确性来自“栈表示尚待探索的边，visited/路径状态的作用域正确”，不是从一个迷宫比喻直接得到。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
