---
title: React Render、Commit、Flags 与 Effect 执行
description: 从工作树完成进入 before mutation、mutation、layout 与 passive 阶段，解释 DOM、Ref、布局 Effect 和被动 Effect 的时序。
category: frontend
part: React
chapter: 33
tags:
  - React
  - Fiber
  - Commit
prerequisites:
  - Fiber Work Loop 与 Hooks
outcomes:
  - 区分可重做 Render 和同步 Commit
  - 解释 Flags 如何驱动宿主变更
practice:
  type: implementation
  result: 记录 DOM、Ref 与 Effect 的提交顺序
  verify:
    - 渲染期不修改外部世界
    - cleanup 与下一次 setup 顺序可复现
evidence: public-source
updated: 2026-08-11
---

# React Render、Commit、Flags 与 Effect 执行

Render 根据状态和 props 计算下一棵 Fiber 工作树，Commit 把完成结果同步应用到 DOM、Ref 和 Effect 生命周期，Flags 是 Render 写在 Fiber 上的待提交标记。三者连接状态更新与浏览器显示，把可以暂停或重做的计算同不可逆的外部副作用分开，也避免半成品直接暴露给用户。

因此，组件函数已经运行不代表用户看到了新页面。Render 可以暂停或放弃，Commit 则应用一批已经确认的宿主变更。布局读取、资源 cleanup 和 Strict Mode 下的重复检查，都要放回这条阶段线理解。

## Render 阶段产生什么

Render 从 Root 和选中 lanes 开始，沿 Fiber 执行 beginWork 与 completeWork。它读取更新队列、调用组件、协调 children，并为需要插入、更新、删除或运行 Effect 的节点设置 flags。`subtreeFlags` 汇总后代是否有工作，提交遍历可以跳过完全干净的子树。

Render 必须可暂停和放弃，所以不能让用户观察到半成品 DOM。类组件的部分旧生命周期和函数组件的渲染体都处在这一可重做区域。
## Commit 的阶段边界

完成的 workInProgress 树交给 Commit 后，React 进入不可随意中断的宿主变更过程。可以用四个观察窗口理解：

| 窗口 | 典型工作 | 页面状态 |
| --- | --- | --- |
| before mutation | 读取变更前快照 | 旧 DOM 仍在 |
| mutation | 插入、更新、删除 DOM，处理部分 Ref | DOM 正在切换 |
| layout | 连接新树，运行 layout Effect 与 Ref | 新 DOM 已可同步读取 |
| passive | 调度后续被动 Effect cleanup/setup | 通常在提交之后 |

具体函数和细节会随 React 版本变化，但“变更前读取、宿主变更、布局同步、被动同步”的职责边界稳定。Commit 要尽量短；大量 `useLayoutEffect` 会延迟浏览器绘制。
## Flags 怎样连接两阶段

Render 不直接执行 DOM 操作，而是在 Fiber 上记录 Placement、Update、ChildDeletion、Ref、Layout、Passive 等位标记。Commit 根据 mask 判断当前 Fiber 或子树是否包含某类工作。

```text
Render：比较 props -> Fiber.flags |= Update
        新节点    -> Fiber.flags |= Placement
        Effect    -> Fiber.flags |= Passive 或 Layout

Commit：遍历 subtreeFlags/flags
        mutation mask -> 修改宿主树
        layout mask   -> Ref 与布局 Effect
        passive mask  -> 安排被动 Effect
```

旧文章常把所有副作用串成 `nextEffect` 链。现代源码的 flags/subtreeFlags 遍历不应被旧字段覆盖；调试时先确认项目 React 版本，不把两套字段混成同一实现。
## Ref、Layout Effect 与 Passive Effect 的时序

Ref 让业务在提交后取得宿主节点或公开句柄。`useLayoutEffect` 在 DOM 变更后、浏览器有机会绘制前同步运行，适合读取布局并立即修正；`useEffect` 适合网络订阅、日志连接等不要求阻塞绘制的同步过程。

```tsx
function MeasureBox() {
  const boxRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const rect = boxRef.current?.getBoundingClientRect()
    console.log('layout', rect?.width)
    return () => console.log('layout cleanup')
  })

  useEffect(() => {
    console.log('passive setup')
    return () => console.log('passive cleanup')
  })

  return <div ref={boxRef}>box</div>
}
```

提交后，callback ref 和 layout setup 能读取新的 div；下一次更新先清理旧布局资源，再建立新同步关系，被动 Effect 则在相应 passive flush 中处理。若 setup 抛出异常或 cleanup 未释放订阅，错误边界与资源所有者仍需给出恢复路径，不能依赖 DOM 删除自动清理。

组件输入是当前状态，输出一个带 Ref 的 DOM 描述。布局 Effect 能读取新几何；被动 Effect 不应该承担首帧必须完成的同步布局。更新时旧 cleanup 在相应新 setup 前运行，卸载时资源所有者负责释放。
## 删除为什么不只是 removeChild

删除子树还要运行 Effect cleanup、断开 Ref、处理类实例生命周期，并找到实际宿主后代。函数组件 Fiber 自身没有 DOM，Commit 必须穿过组件层找到宿主节点。只在教学实现中对当前 Fiber 执行 `parent.removeChild(fiber.stateNode)`，无法覆盖真实组件树。

删除完成后，React 还会断开部分 Fiber 链接，帮助垃圾回收和防止已卸载更新继续传播。业务仍持有 DOM、闭包或监听器时，内存不会因为 Fiber 删除自动释放。
## 验证顺序与故障定位

为组件函数、callback ref、layout cleanup/setup、passive cleanup/setup、微任务和 `requestAnimationFrame` 分别记录带时间戳日志。切换 key 触发卸载再挂载，并在 Performance 中对照 Paint。

预期是 Render 日志先出现，DOM 只在 Commit 改变；layout 阶段能读新 DOM；passive 工作不会被误认为渲染计算。开发 Strict Mode 可能额外执行 setup/cleanup 检查，验证资源释放能力，不代表每次生产提交都会双写 DOM。

若页面闪烁，检查必须在绘制前完成的布局逻辑是否误放到 passive Effect；若交互卡顿，检查 mutation/layout 阶段是否过重；若重复请求，先判断请求是否属于用户事件或可取消同步，而不是禁用 Strict Mode。

完整的两阶段模型还包括 flags、Effect 时序和删除清理。只记“Render 生成虚拟 DOM、Commit 更新真实 DOM”，不足以解释布局闪烁、重复请求或卸载后的资源残留。
## 一次更新的阶段日志

假设组件从 `hidden` 切换为 `visible`，包含 callback ref、`useLayoutEffect` 和 `useEffect`。Render 调用组件并为宿主节点、Ref、Layout/Passive Effect 记录 flags；完成树后进入 Commit。

before-mutation 读取旧快照，mutation 插入 DOM 并处理旧 Ref，root current 切换到完成树，layout 连接新 Ref 并运行布局 setup。Passive 工作被安排到提交后的 flush，旧 passive cleanup 先于新 setup。
```text
render component
complete tree / bubble subtreeFlags
commitBeforeMutationEffects
commitMutationEffects
root.current = finishedWork
commitLayoutEffects
browser paint opportunity
flushPassiveEffects: old cleanup -> new setup
```

这是一张职责图，不承诺所有环境的 Paint 必定位于同一两行之间；同步更新、浏览器调度和 Effect 内新更新都会影响实际时间线。验证时用 Performance 的 DOM mutation、Paint 与 User Timing，而不是只靠 `console.log` 推断浏览器是否已经绘制。
## 错误与一致性边界

Render 抛错可以由错误边界捕获并重新计算替代树；Commit 中的错误发生时，宿主变更可能已经部分执行，React 会尽力捕获并卸载受影响树，但业务资源仍要靠 cleanup 和幂等协议恢复。`useLayoutEffect` 中同步 setState 会延长提交路径，严重时阻塞 Paint。

Ref 也有清理顺序。对象 Ref 的 current 在失效时置空，callback ref 应处理接收 null；只处理节点不处理 null 会泄漏第三方实例。Offscreen/Suspense 隐藏和重新显示还可能使布局/被动 Effect 经历额外生命周期，不能把“DOM 仍存在”当成资源仍应连接。
## 官方依据

- [Render and Commit](https://react.dev/learn/render-and-commit)
- [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [useEffect](https://react.dev/reference/react/useEffect)
- [React source: ReactFiberCommitWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCommitWork.js)
