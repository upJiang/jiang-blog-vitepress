---
title: React Reconciliation、Key 与列表身份
description: 从列表输入框错位现象推导 type/key 身份、同层比较、复用、删除和移动，解释索引 key 的真实风险。
category: frontend
part: React
chapter: 31
tags:
  - React
  - Reconciliation
  - Key
prerequisites:
  - React Element 与数组方法
outcomes:
  - 推演子节点协调过程
  - 为业务实体选择稳定 key
practice:
  type: implementation
  result: 用可编辑列表验证节点身份
  verify:
    - 重排后状态仍跟随业务实体
    - 重复 key 和类型变化有对照结果
evidence: public-source
updated: 2026-08-11
---

# React Reconciliation、Key 与列表身份

Reconciliation（协调）是 React 比较上一次与下一次元素描述，并决定哪些 Fiber 复用、插入、移动或删除的过程。它位于组件 Render 与 Commit 之间；`key` 是同一父节点下标识兄弟节点业务身份的提示，帮助状态和宿主节点跟随正确实体。

渲染三行可编辑数据，用户在第二行输入内容，然后把第一行删除。如果使用数组索引作为 key，输入状态可能跑到另一条业务数据上。React 并非随机复用错误 DOM，而是按照调用方提供的 type、key 和位置执行了身份判断。

## 协调过程如何识别节点身份

一次父节点更新后，Reconciler 拿到旧 child Fiber 链和新 children。它需要决定哪些节点复用、哪些删除、哪些插入或移动。React 不计算任意两棵树的数学最小编辑距离，而采用适合 UI 的启发式：不同 type 通常是不同子树；同层子节点用 key 表达稳定身份。

key 只需在同一父节点的兄弟之间唯一，不会传给组件 props，也不是全局数据库主键要求。稳定意味着同一业务实体跨渲染保持同一个 key，不能在 render 中用随机数生成。

## 索引 key 会让状态跟随数组位置

旧列表 `[A, B, C]` 对应 key `[0, 1, 2]`。删除 A 后，新列表 `[B, C]` 的 key 仍是 `[0, 1]`。协调器看到旧 key 0 与新 key 0、旧 key 1 与新 key 1，于是把原来属于 A、B 的 Fiber 状态分别用于 B、C。数据文本会更新，但组件本地状态和未受控 DOM 值可能沿旧 Fiber 留下。

若 key 使用业务 ID，旧 `[a, b, c]` 变成 `[b, c]`，React 能删除 a 并复用 b、c。状态跟随实体，而不是跟随数组槽位。

## Keyed Diff 的身份匹配过程

真实实现包含 fast path、Map 查找、删除记录和位置判断。下面只展示核心身份决策：先尝试按当前位置复用；无法继续顺序匹配后，把剩余旧节点按 key 建表，再为新节点查找。

```ts
type Child = { key: string; type: string; oldIndex?: number }

function classifyChildren(oldChildren: Child[], nextChildren: Child[]) {
  const remaining = new Map(oldChildren.map(child => [child.key, child]))
  let lastPlacedIndex = 0

  return nextChildren.map((next, newIndex) => {
    const previous = remaining.get(next.key)
    if (!previous || previous.type !== next.type) {
      return { key: next.key, action: 'insert', newIndex }
    }

    remaining.delete(next.key)
    const oldIndex = previous.oldIndex ?? 0
    const action = oldIndex < lastPlacedIndex ? 'move' : 'reuse'
    lastPlacedIndex = Math.max(lastPlacedIndex, oldIndex)
    return { key: next.key, action, oldIndex, newIndex }
  })
}
```

分类函数输入旧、新子节点，先用 key 查找候选，再用 type 确认是否能复用；oldIndex 小于 lastPlacedIndex 时输出 move，否则输出 reuse，缺少候选则输出 insert。示例没有提交删除和 DOM 操作，只用于验证身份与相对位置，重复 key 会让 Map 覆盖并破坏结果。

`lastPlacedIndex` 表示已经确认可保持相对顺序的最大旧位置。旧位置小于它的节点需要移动；更大的节点可以保持。示例省略 Fiber 创建、flags 和删除提交，只用于解释列表位置判断。

## Type 和 Key 共同决定状态是否复用

即使 key 相同，`<Counter key="a" />` 变成 `<TextField key="a" />` 也不是同一种组件工作。React 会卸载旧子树并挂载新子树。相反，同一位置同一组件 type 通常保留 Hook 状态，除非祖先身份发生变化。

业务可以主动改变 key 重置表单或播放器状态，但要把它当作明确生命周期操作。为了“强制刷新”到处拼接时间戳会导致 Effect 重建、焦点丢失和昂贵子树重新挂载。

## 稳定 Key 的适用边界

稳定 key 帮助正确复用身份，也减少不必要挂载；它不会阻止父组件调用子组件，也不会自动缓存昂贵计算。渲染性能还受 props 稳定性、状态位置、Context 范围和组件计算影响。

索引 key 并非绝对禁止。列表永不插入、删除、排序，且行没有独立状态时，索引与身份可以等价。但这些约束很容易随需求变化，优先使用数据 ID 更稳妥。

## 用列表重排实验验证节点身份

实现一组带本地 input 状态的行，分别使用 ID、索引和随机 key。执行头部插入、删除、逆序和过滤。用 Profiler 观察 mount/update，用 Effect cleanup 记录卸载。

ID key 应让状态跟随业务实体；索引 key 在结构变化时可能错位；随机 key 每次都卸载重建。出现焦点跳动或状态串行时，先检查父层数组变换后的 key/type，不要在子组件里用 Effect 强行同步 props 到 state 掩盖身份问题。

常见协调接近线性依赖两个前提：React 使用同层启发式，开发者提供稳定 key。它不计算任意两棵树的全局最小编辑距离，也不保证 DOM 移动达到理论最少。

## 重排时如何标记插入、移动与删除

以旧 `[A, B, C, D]` 和新 `[A, C, B, E]` 为例。第一轮从头按位置比较，A 的 key/type 相同，复用并记录旧索引 0；B 与 C 不同后退出顺序快路径。Reconciler 把剩余旧 Fiber 按 key 放入 Map，再遍历新尾段：C 命中旧索引 2，B 命中 1，E 未命中新建；Map 中剩余 D 标记删除。

`lastPlacedIndex` 保存目前确认无需向前移动的最大旧索引。C 的旧索引 2 推高它；随后 B 的旧索引 1 小于 2，因此 B 获得 Placement，提交时移动。React 追求线性可预测协调，不计算全局最少移动；这与 Vue keyed diff 常用 LIS 的策略不同。

| 新节点 | 旧索引 | 结果 | 原因 |
| --- | ---: | --- | --- |
| A | 0 | 复用，不移动 | 顺序快路径命中 |
| C | 2 | 复用，不移动 | 推高 lastPlacedIndex |
| B | 1 | 复用并移动 | 旧索引落后 |
| E | 无 | 新建 | key 未命中 |
| D | 3 | 删除 | 最终未被消费 |

## 父级身份变化也会重置状态

Hook 状态存于 Fiber。父位置、type 与 key 共同决定是否复用这条 Fiber；改变 key 等价于声明“这是另一个实体”，旧状态、Ref 与 Effect 会卸载。索引 key 在只追加的静态列表未必立刻出错，但一旦头部插入、排序或过滤，相同位置会绑定不同业务对象。

排查时同时记录业务 ID、React key、DOM data 属性和 mount/unmount 日志。若 key 正确仍重置，继续检查父组件 type 是否变化、是否在 Render 内定义组件导致每次得到新函数、以及条件分支是否改变树位置。

## 官方依据

- [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [Rendering Lists: Keeping list items in order with key](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [React source: ReactChildFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js)

## 迁移复核：React Reconciliation、Key 与列表身份
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
