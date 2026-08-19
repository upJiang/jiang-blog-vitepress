---
title: Vue VNode、Renderer 与 Keyed Diff
description: 从 render 结果进入 patch、组件 Effect、前后缀同步、索引映射和最长递增子序列，解释 DOM 移动最小化。
category: frontend
part: Vue
chapter: 42
tags:
  - Vue 3
  - VNode
  - Diff
prerequisites:
  - Vue 编译与响应式基础
outcomes:
  - 推演 patchKeyedChildren
  - 手算最长递增子序列
practice:
  type: implementation
  result: 用列表重排观察 Patch 行为
  verify:
    - 新增删除移动分别有测试
    - 重复 key 会被明确诊断
evidence: public-source
updated: 2026-08-11
---

# Vue VNode、Renderer 与 Keyed Diff

VNode 是 Vue 对元素或组件输出的渲染描述；Renderer 把前后 VNode 树映射为宿主环境的创建、更新、移动和删除操作；Keyed Diff 是同一父节点下列表子节点的协调算法。它们位于组件 Render Effect 与 DOM 操作之间，负责保留业务身份并减少不必要的宿主变更。

列表从 `[a,b,c,d]` 变成 `[a,c,b,e,d]` 时，Renderer 先由 VNode 的 type/key 判断身份，再在 keyed children 中同步前后缀、建立索引映射，最后用最长递增子序列减少移动。

一次列表重排可以完整推演新增、删除、复用和移动，再用宿主操作日志核对结果。实践边界限定在同一父节点的 keyed children；跨层级移动、Transition 动画和浏览器布局成本需要在更上层分别分析。

## Renderer 的输入输出

VNode 是渲染描述，包含 type、props、children、key、shapeFlag 和编译提示。`patch(oldVNode, newVNode, container)` 根据节点类别进入文本、Fragment、元素或组件分支。组件挂载会创建响应式 Render Effect，更新时再次得到子树 VNode 并 patch。

Renderer 通过 host operations 抽象 DOM 创建、插入、删除和属性更新，因此核心可适配不同宿主环境。DOM 属性处理还要区分 attribute、property、事件和样式，不能简化成统一 setAttribute。

## Keyed Diff 的阶段

先从头同步相同节点，再从尾同步；若旧段耗尽，挂载剩余新节点；若新段耗尽，删除剩余旧节点。两侧都有未知序列时，为新节点建立 key 到新索引映射，遍历旧节点决定删除或 patch，并记录新位置对应的旧索引。

记录序列中的最长递增子序列代表旧索引保持递增、相对顺序无需移动的节点。最后从右向左处理新序列，缺失项挂载，不在 LIS 中的复用节点移动，在 LIS 中的保持。

```text
旧未知段：b c
新未知段：c b e
新位置映射旧索引：[2, 1, 0]
LIS 可保留一个旧节点；0 表示 e 需要新建
```

从右向左便于使用下一个新节点的 DOM 作为 anchor。LIS 优化移动数量，不改变 key 身份语义。

## 无 key 和重复 key

无 key 列表按位置尝试 patch，适合没有状态身份的简单内容；有状态表单、组件重排应使用稳定业务 key。重复 key 让映射不唯一，是调用方错误，开发环境应诊断。

## 验证 Renderer

用自定义 host operation 记录 create/insert/remove/patchProp，比直接观察 DOM 更容易断言算法轨迹。测试纯追加、纯删除、头尾交换、逆序、混合插入和重复 key。再在浏览器确认输入状态和焦点跟随业务实体。

比较 React/Vue diff 时，要分清 Vue 编译提示与 LIS 移动优化、React Fiber 调度与单向子节点协调的不同职责，不能用脱离版本和输入的“谁一定更快”作结论。

## 把混合区间完整走一遍

旧 `[a,b,c,d,e]` 变为 `[a,c,b,f,e]`。头部 a 和尾部 e 先同步，未知区间是旧 `[b,c,d]`、新 `[c,b,f]`。新 key 映射为 `{c:2,b:3,f:4}`，遍历旧区间得到 `newIndexToOldIndexMap=[3,2,0]`（通常旧索引会加一以让 0 表示新建），d 未命中删除。

序列 `[3,2]` 的 LIS 长度为 1。倒序处理新节点：f 没旧索引，按 e 的 DOM 作为 anchor 新建；b 属于选定 LIS 可留；c 不在 LIS 中，调用 hostInsert 移到 b 前。具体哪一个同长度 LIS 被选中不影响正确性，但会影响移动哪个节点，测试应断言最终顺序与状态身份，不依赖非契约的中间选择。

## Renderer 如何区分组件与宿主节点

组件 VNode 没有直接 DOM。patch 组件时运行其 Render Effect，得到 subTree，再递归 patch；移动 Fragment 或组件需要定位整段宿主节点范围。Teleport、Suspense、Transition 也通过 Renderer 协议扩展插入/删除语义，教学版只对单 DOM `insertBefore` 无法覆盖它们。

`patchProp` 要区分 DOM property、attribute、class/style 和事件 invoker。事件更新常复用一个 invoker 并替换 value，避免频繁 remove/add；表单 value、布尔属性和 SVG 又有各自规则。因此“VNode diff 完了就 setAttribute”不是完整 Renderer。

## 复杂度与调试

建立 key Map、遍历旧新段都是 O(n)，LIS 为 O(n log n)，额外空间 O(n)。真实成本还包括组件 Render、DOM 移动引发的 Style/Layout 和过渡动画。使用自定义 Renderer 日志验证算法，再用 Performance 验证宿主成本，两层证据不能互换。

## 官方依据

- [Vue: Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue source: renderer.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/renderer.ts)

## 迁移复核：Vue VNode、Renderer 与 Keyed Diff
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
