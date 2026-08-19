---
title: JSX、React Element 与组件渲染模型
description: 从 JSX 编译结果进入不可变 Element、组件调用、Props、Children 和渲染纯度，区分元素、组件实例与 DOM。
category: frontend
part: React
chapter: 30
tags:
  - React
  - JSX
prerequisites:
  - JavaScript 函数与模块
outcomes:
  - 读懂 jsx runtime 输出
  - 解释组件为何应保持纯净
practice:
  type: implementation
  result: 观察 JSX 编译结果和元素对象
  verify:
    - 开发与生产转换差异明确
    - 渲染阶段没有外部副作用
evidence: official
updated: 2026-08-11
---

# JSX、React Element 与组件渲染模型

`<Button tone="danger">删除</Button>` 看起来像 HTML，运行时却不会直接创建按钮 DOM。构建工具先把 JSX 转成函数调用，调用返回 React Element；Reconciler 再根据 Element 和旧 Fiber 决定是否调用组件、复用状态以及怎样更新宿主节点。

## JSX 转换后的真实输入

现代自动 JSX runtime 通常把表达式转换为 `jsx` 或 `jsxs` 调用，开发模式可能使用带调试信息的 `jsxDEV`。具体导入名由编译器配置决定，但输出仍然是普通 JavaScript 表达式。

下面在启用 automatic JSX runtime 的 React/TypeScript 构建环境观察转换。输入包含组件 type、普通 prop 和文本 children，目标是对照转换前后结构，确认结果只是 Element 描述；实际 helper 导入、开发调试字段和压缩名称以当前编译器产物为准。

```tsx
const view = <Button tone="danger">删除</Button>

// 可用于理解的近似结果，不是稳定产物格式
const viewModel = jsx(Button, {
  tone: 'danger',
  children: '删除'
})
```

转换结果以 Button 函数和 props 为输入，调用 jsx 后输出 React Element 描述；这一步不会调用组件或写入 DOM。若 tone 或 children 的表达式求值抛出异常，Element 也不会创建。开发与生产 runtime 可能输出不同辅助字段，业务代码不能读取这些内部结果格式。

输入是组件函数和 props，输出是描述对象。此时 `Button` 尚未因为这行 JSX 自动执行，也没有 DOM。React Element 的 `type` 是 Button 函数，`key` 用于同层身份，`props` 保存 tone 和 children。开发构建可能冻结对象帮助发现误修改，业务代码应始终把 Element 当不可变值。
## Element 从描述进入 Fiber 和 DOM

组件是接收 props 并返回可渲染描述的函数。Element 是某次描述结果。Fiber 是 React 内部为组件工作和状态建立的节点。DOM 是 Commit 阶段交给浏览器的宿主对象。

同一个组件函数可产生许多 Element；同一个 DOM 节点可在多次更新中被 Fiber 复用；函数组件本身没有“实例对象”供业务持有。Reconciler 会把 Element 与当前子 Fiber 的 type 和 key 比较，决定复用、创建或删除，再由 Host Config 把确定的变更交给 DOM。

```text
JSX 源码
  -> jsx(type, props, key)
  -> React Element（描述）
  -> reconcileChildFibers（身份比较）
  -> Fiber（工作与状态）
  -> Host Config（DOM 操作）
```

Ref 指向什么取决于目标：宿主元素可得到 DOM，函数组件要通过公开机制暴露有限句柄。key 和 ref 也不是普通 props。业务组件需要相同业务 ID 时，应另外传入 id，不能读取 React 的内部身份字段。
## 组件调用与渲染纯度

Reconciler 处理函数组件 Fiber 时，会在受控环境中调用组件，设置当前 Hook 上下文，读取 props，并取得下一层 Element。组件函数可能因为父更新、状态更新、并发重试或开发检查而执行多次。

因此 Render 必须满足：相同 props、state 和 context 对应相同可渲染输出；不能在函数体修改外部变量、发送不可撤销请求或直接操作 DOM。事件处理属于用户动作，Effect 属于提交后与外部系统同步，它们与 Render 的职责不同。

下面的错误组件每渲染一次都会改变模块变量。即使页面看似正确，重试或服务端并发请求都会让结果依赖执行次数。

```tsx
let nextId = 0

function ImpureRow() {
  nextId += 1 // 渲染次数泄漏到业务结果
  return <span>{nextId}</span>
}
```

ImpureRow 每次调用都会先修改模块变量再返回 Element，因此被放弃的 Render 也会改变下一次输出，服务端并发请求还会共享同一计数。正确实现应从 props、state 或 useId 读取稳定身份；异常重试和 Strict Mode 额外调用都不应改变外部业务状态。

修复不是把变量藏进 `useMemo`，而是确定 ID 的所有者：数据 ID 由数据源提供，表单关联 ID 可用 `useId`，用户动作产生的业务 ID 在事件或服务端命令中创建。每种方案的生命周期不同。

服务端渲染还要求客户端第一次输出与服务器 HTML 一致。当前时间、随机数、可变单例和浏览器专属值会让重试或 Hydration 得到不同结果；这类值应由稳定数据输入，或延后到 Effect 读取。
## Props 与 Children 定义组件边界

`children` 只是 props 的一个字段，可能是字符串、Element、数组、空值、可迭代对象或 Fragment，不能默认当作单个 DOM 子节点。组件应声明它接受的形状，并用组合表达布局槽位。需要遍历或变换结构时，应使用 React 的 Children 工具并保留 key 语义。随意克隆 children 并注入隐式 props 会增加耦合，Context 或显式 render prop 往往更可追踪。

组件边界应围绕状态所有权和变化频率，而不是按 JSX 行数拆分。若一个子树需要独立复用、独立加载、独立错误边界或能够通过稳定 props 跳过更新，它适合成为组件。只有为了缩短文件而拆出没有语义的包装层，会让树和调试更复杂。
## 验证编译和运行过程

在 TypeScript Playground 或本地构建中分别选择 classic 与 automatic JSX，比较输出调用和导入。再在组件函数、事件处理器和 Effect 中分别记录日志，通过 React Profiler 对应 Render 与 Commit。

预期结果是：创建 Element 不修改 DOM；组件函数可能多次运行；事件只在用户操作后发生；Effect setup 在提交后运行，并在依赖变化或卸载前 cleanup。若日志顺序不符合，先检查代码运行环境和 Strict Mode，不要据此认为生产一定重复提交。

JSX 默认会转义作为文本插入的值，却不会把所有 props 变成可信输入。`dangerouslySetInnerHTML`、URL、样式和第三方组件仍需各自的校验与信任边界。
## 官方依据

- [Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React calls Components and Hooks](https://react.dev/reference/rules/react-calls-components-and-hooks)
- [React source: ReactJSXElement.js](https://github.com/facebook/react/blob/main/packages/react/src/jsx/ReactJSXElement.js)
