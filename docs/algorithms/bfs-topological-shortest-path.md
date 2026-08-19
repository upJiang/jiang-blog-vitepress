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

BFS（Breadth-First Search，广度优先搜索）按距离分层扩展节点。拓扑排序也使用队列，但队列里保存的是当前入度为零的节点。两者外形相似，核心不变量不同，不能互换证明。

## BFS 的首次发现就是最短层

在无权图中，队列按发现顺序处理。节点出队时，所有更短距离的节点已经处理，因此第一次发现邻居时记录的距离就是最短边数。

~~~ts
type Graph = ReadonlyMap<string, readonly string[]>

type ShortestPaths = {
  distance: Map<string, number>
  parent: Map<string, string | null>
}

function shortestPaths(graph: Graph, start: string): ShortestPaths {
  const queue = [start]
  let head = 0
  const distance = new Map<string, number>([[start, 0]])
  const parent = new Map<string, string | null>([[start, null]])

  while (head < queue.length) {
    const node = queue[head]
    head += 1

    for (const neighbor of graph.get(node) ?? []) {
      if (distance.has(neighbor)) continue
      distance.set(neighbor, (distance.get(node) ?? 0) + 1)
      parent.set(neighbor, node)
      queue.push(neighbor)
    }
  }

  return { distance, parent }
}
~~~

标记发生在入队时。若等到出队才标记，同一节点可能由当前层多个前驱重复入队，浪费空间并使 parent 语义不稳定。

BFS 只保证无权或等权边的最短边数。边权不同且非负时使用 Dijkstra，存在负权时还要选择能处理负边和负环的算法。
## 恢复路径沿 parent 反向走

target 不在 distance 中表示不可达。start 到自身的路径为 `[start]`，距离为 0。恢复时若 parent 链断裂，应报告结构错误，不能静默返回半条路径。

多个最短路径存在时，邻接表顺序决定记录哪一个 parent。若要求所有最短路径，需要保存前驱集合，输出规模可能快速增长。
## 拓扑排序维护剩余入度

有向无环图中，入度为零的节点没有未完成前置依赖，可以立即输出。删除它的出边后，新的入度零节点进入队列。

~~~ts
type Edge = readonly [from: string, to: string]

function topologicalOrder(
  nodes: readonly string[],
  edges: readonly Edge[],
): string[] | null {
  const outgoing = new Map<string, string[]>()
  const indegree = new Map(nodes.map((node) => [node, 0]))

  for (const [from, to] of edges) {
    if (!indegree.has(from) || !indegree.has(to)) {
      throw new Error('edge references unknown node')
    }
    outgoing.set(from, [...(outgoing.get(from) ?? []), to])
    indegree.set(to, (indegree.get(to) ?? 0) + 1)
  }

  const queue = nodes.filter((node) => indegree.get(node) === 0)
  let head = 0
  const order: string[] = []

  while (head < queue.length) {
    const node = queue[head]
    head += 1
    order.push(node)

    for (const neighbor of outgoing.get(node) ?? []) {
      const next = (indegree.get(neighbor) ?? 0) - 1
      indegree.set(neighbor, next)
      if (next === 0) queue.push(neighbor)
    }
  }

  return order.length === nodes.length ? order : null
}
~~~

循环中 indegree 表示尚未输出节点收到的剩余前置边数。每条边只在其起点输出时删除一次。最后仍有节点未输出，说明它们位于环中或依赖环内节点。
## 重复边会改变入度模型

若 edges 中同一条边重复出现，上例把它当作两条独立依赖，outgoing 也保留两次，最终仍能成对减掉。业务若把重复边视为同一关系，应在构图时去重；只去重一侧会产生永远无法归零的入度。

拓扑序通常不唯一。使用普通 FIFO 会按输入顺序给出一种合法结果；需要字典序最小时，把零入度集合换成最小堆。
## 复杂度与验证

BFS 和 Kahn 拓扑排序在邻接表上都是 `O(V + E)` 时间、`O(V + E)` 存储。验证 BFS 时检查每条树边满足 `dist[v] = dist[u] + 1`，并确认所有图边不会把终点距离缩短两层以上。

验证拓扑序时建立节点到位置的 Map，对每条边断言 `position[from] < position[to]`。null 结果再用独立 DFS 颜色法确认是否有环，避免实现自身错误被同一逻辑掩盖。
