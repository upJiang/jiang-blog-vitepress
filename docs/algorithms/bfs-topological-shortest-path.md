---
title: BFS、拓扑排序与无权最短路
description: 从队列分层进入图的入度、拓扑序和无权最短路径，区分访问时机、环检测与路径恢复。
category: algorithms
part: 图与搜索
chapter: 18
tags:
  - BFS
  - 拓扑排序
  - TypeScript
prerequisites:
  - 队列与图基础
outcomes:
  - 解释 BFS 分层不变量
  - 用入度识别有向环
practice:
  type: implementation
  result: 实现课程依赖排序和最短路径恢复
  verify:
    - 重复边与孤立点有明确处理
    - 有环时不会返回伪拓扑序
evidence: public-source
updated: 2026-08-11
---

# BFS、拓扑排序与无权最短路

页面路由之间存在跳转关系：从首页最少点击几次能到详情页？构建任务之间存在依赖：能否找到一个合法执行顺序？两题都使用队列，但状态含义不同。BFS 的队列保存按距离分层的节点，拓扑排序的队列保存当前入度为零、已经满足依赖的节点。

## BFS 的分层不变量

在无权图中，每条边的代价相同。起点距离为 0；从距离 `d` 的节点首次发现邻居时，邻居距离一定是 `d + 1`。队列先进先出保证较小距离的节点先扩展，因此首次访问就是最短距离。

访问标记必须在入队时设置，而不是出队时设置。否则同一节点可能被多个父节点重复入队，时间和内存都会膨胀。若还要恢复路径，就在首次发现邻居时记录 `parent`，终点沿父指针反向回到起点。

```ts
function shortestPath(graph: number[][], start: number, target: number): number[] {
  const queue: number[] = [start]
  let head = 0
  const visited = new Set([start])
  const parent = new Map<number, number>()

  while (head < queue.length) {
    const node = queue[head++]
    if (node === target) break

    for (const next of graph[node] ?? []) {
      if (visited.has(next)) continue
      visited.add(next) // 入队即确定最短层级
      parent.set(next, node)
      queue.push(next)
    }
  }

  if (!visited.has(target)) return []
  const path: number[] = []
  for (let node = target; ; node = parent.get(node)!) {
    path.push(node)
    if (node === start) return path.reverse()
  }
}
```

数组配合 `head` 模拟队列，避免 `shift()` 每次移动剩余元素。输入邻接表，输出一条最短路径；多条最短路径并存时，结果取决于邻接表顺序。若边有不同权重，首次访问不再保证最短，应该改用 Dijkstra、0-1 BFS 或 Bellman-Ford。

## 拓扑排序维护的是依赖状态

有向边 `prerequisite -> task` 表示任务必须在依赖之后执行。入度是一个任务尚未满足的前置数量。Kahn 算法先把所有入度为零的任务入队；取出任务后，相当于完成它，于是所有后继入度减一，新变成零的后继才具备执行资格。

```ts
function topologicalOrder(nodeCount: number, edges: Array<[number, number]>): number[] {
  const graph = Array.from({ length: nodeCount }, () => [] as number[])
  const indegree = Array<number>(nodeCount).fill(0)
  const uniqueEdges = new Set<string>()

  for (const [from, to] of edges) {
    const key = `${from}:${to}`
    if (uniqueEdges.has(key)) continue
    uniqueEdges.add(key)
    graph[from].push(to)
    indegree[to] += 1
  }

  const queue: number[] = []
  for (let node = 0; node < nodeCount; node += 1) {
    if (indegree[node] === 0) queue.push(node)
  }

  const order: number[] = []
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head]
    order.push(node)
    for (const next of graph[node]) {
      indegree[next] -= 1
      if (indegree[next] === 0) queue.push(next)
    }
  }

  return order.length === nodeCount ? order : []
}
```

重复边若不去重，会把入度多加一次；如果邻接表只保存一次，入度最终无法归零。实现选择显式去重。孤立节点入度为零，会正常出现在结果中。有多个零入度节点时拓扑序不唯一；若需要字典序最小结果，要把普通队列换成最小堆。

## 环为什么能被剩余入度识别

若图中存在环，环内每个节点至少有一条来自环内的入边。环外节点全部移除后，它们仍不会变成零入度，因此处理数量小于节点总数。返回部分顺序会伪装成成功，必须用数量比较决定最终结果。

BFS 的 `visited` 表示“已经确定最短层级”，拓扑排序的 `indegree` 表示“仍有多少依赖未完成”。二者都使用队列，不代表能互换状态模型。DFS 也能拓扑排序，但需要三色访问状态区分未访问、当前路径和已完成，单个布尔值无法可靠识别回边。

## 验证与复杂度

邻接表构建和遍历都只处理每个节点与边有限次，时间复杂度 `O(V + E)`，空间复杂度同阶。路径恢复额外使用父指针，但不会改变数量级。

验证时准备链、菱形、多条最短路、孤立点、重复边、自环和多节点环。对拓扑结果逐边检查 `position[from] < position[to]`；对最短路检查相邻节点确实有边，并与只记录距离的 BFS 结果一致。排查错误时先打印队列、入度或距离的每次变化，不要只看最终数组。

面试追问通常会从无权最短路扩展到加权图、从任意拓扑序扩展到唯一性、从内存图扩展到并行任务调度。回答时先说明当前算法依赖的边权和图方向，再选择数据结构。

## BFS 的层不变量与拓扑的入度不变量

BFS 出队距离 d 的节点时，队列中未处理节点距离只能是 d 或 d+1；第一次访问节点就得到最短边数，因为任何更短路径必须先经过更早层。若要恢复路径，只有在首次入队时写 parent，重复边不能覆盖已确定父节点。

Kahn 拓扑排序维护“已输出节点的所有前驱都完成”。每次取 indegree=0 的节点，输出后把其出边目标减一；若多个节点同时为 0，顺序不唯一。若业务要求稳定结果，需要按 id 排序的优先队列，但这改变的是选择策略，不是拓扑合法性。

无权最短路遇到加权边就失效：0/1 权重可用 0-1 BFS，非负任意权重用 Dijkstra，负权需其他模型。先声明 V/E、边方向、权重和可达性，再谈复杂度。

## 参考与验证

- [CP-Algorithms: BFS](https://cp-algorithms.com/graph/breadth-first-search.html)
- [CP-Algorithms: Topological Sort](https://cp-algorithms.com/graph/topological-sort.html)
- [MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
