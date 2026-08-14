---
title: React 组件边界、状态架构与可访问性
description: 从难复用弹窗和复杂表单进入受控/非受控、状态归属、组合、Context、Reducer、焦点管理和语义契约。
category: frontend
part: React
chapter: 37
tags:
  - React
  - Component Design
  - Accessibility
prerequisites:
  - React Hooks 与 HTML 语义
outcomes:
  - 按变化频率划分组件
  - 设计键盘和读屏可用的交互
practice:
  type: implementation
  result: 实现可控且可访问的 Modal
  verify:
    - 焦点进入并返回触发点
    - Escape、标题和背景交互符合契约
evidence: public-source
updated: 2026-08-11
---

# React 组件边界、状态架构与可访问性

React 组件边界由 Props、事件和内容插槽构成，状态架构决定每份状态的所有者，可访问性保证同一交互能被键盘和辅助技术使用。这三项属于组件树的 API 设计层，用来避免状态重复、焦点丢失和语义缺口。视觉样式只是这份契约的一个消费者。

一个 Modal 同时接收 `open`，内部又维护 `visible`，父组件关闭后动画状态和焦点状态开始冲突。组件设计的核心不是 Props 越少越好，而是每份状态只有一个权威所有者，公开契约明确表达命令、状态和内容插槽。

## 状态放在哪里

只影响单个组件的临时输入留在本地；多个兄弟需要一致值时提升到最近共同祖先；跨远距离但变化不频繁的环境信息可放 Context；可分享、可刷新、可后退的筛选条件应进入 URL。把所有状态放全局会扩大更新范围和生命周期。

受控组件由父级拥有当前值，子组件通过事件请求改变；非受控组件拥有初始值和后续变化。两种模式都有效，但不能在生命周期中无规则切换。复杂状态转换用 reducer 显式列出事件和不可达状态，比多个互相修正的布尔值更可靠。

## 组合优于隐式配置爆炸

当组件出现 `showHeader、hideFooter、customBody、renderTitle` 等大量互斥参数，应考虑 Compound Components 或显式 slots。组合让调用方提供结构，但共享状态仍需受控 Context，并限制公开子组件协议。

Context value 每次创建新对象会让消费者更新。先缩小 Provider 范围、拆分读写 Context，再考虑 memo。性能问题不能以牺牲清晰所有权为代价。

## Modal 的可访问性契约

打开后焦点进入有意义位置，Tab 保持在对话框，Escape 按约定关闭，背景内容不可交互，关闭后焦点返回触发按钮。容器需要 dialog 语义、可访问名称和必要的 modal 状态。标题文本应通过 `aria-labelledby` 关联，而不是只靠视觉字号。

```tsx
type ModalProps = {
  open: boolean
  title: string
  onOpenChange(open: boolean): void
  children: ReactNode
}
```

这个接口的输入由父组件持有，点击遮罩或按 Escape 只调用 onOpenChange(false)，不会在子组件再保存第二份 open。组件输出包含带名称的 dialog 与 children；若父级拒绝关闭，请求不会越权修改状态，焦点和监听器仍按实际 open 值创建或清理。

这是公开状态契约：父级拥有 open，组件发出关闭请求。实现还要保存触发点、在 layout 阶段设置初始焦点、清理键盘监听，并用 Portal 处理层叠上下文。不能只渲染一个带 `position: fixed` 的 div。

## 测试用户可观察行为

组件测试应通过角色和可访问名称查找对话框，模拟键盘打开、Tab、Shift+Tab、Escape 和关闭后的焦点返回。不要只断言内部 `isOpen` state 或 CSS 类。

屏幕阅读器语义、键盘行为、触控尺寸和 reduced motion 都属于组件契约。设计系统要在基础组件层验证，业务不应每次重新实现。

排查状态混乱时画出所有者和事件方向；排查可访问性时从键盘完整走一次任务，再检查 Accessibility Tree。组件拆分要考虑状态生命周期、变化频率、错误隔离、复用和语义，文件行数不能替代这些边界。

## 状态所有权决策表

状态放在哪里由生命周期和协调范围决定。只影响一个输入的短暂值放局部；兄弟节点需要同一事实时提升到最近共同父级；跨页面且与 URL 可分享的筛选放路由；服务器数据交给具备缓存与失效语义的数据层；跨大量子树的稳定依赖才考虑 Context。把所有状态塞进全局 Store 会扩大更新和清理范围，也让组件测试依赖整个应用。

受控组件由父级持有当前值和变更决策，适合需要协调、校验和回放的场景；非受控组件由自身/DOM 持有过程状态，父级通过初始值和提交结果交互。不要在同一字段上同时维护 props 和本地镜像，除非定义清楚“何时重置、冲突谁赢”的状态机。

## 可访问 Modal 的完整契约

打开前保存触发元素；挂载后把焦点移动到对话框标题或第一个可操作项；Tab/Shift+Tab 留在模态范围；Escape 在允许时请求关闭；背景内容不可交互；关闭后把焦点还给仍存在的触发元素。`role="dialog"`、`aria-modal="true"` 和可访问名称只解决语义，不自动实现焦点与背景隔离。

Portal 改变 DOM 位置但不改变 React 事件树。点击遮罩关闭时要区分 `target`/`currentTarget`，避免内容点击冒泡误关；嵌套 Portal、滚动锁和移动端虚拟键盘还需独立测试。优先使用经过验证的无头组件或平台 `dialog` 能力，并在目标浏览器核对行为。

错误边界只捕获后代 Render/生命周期的一类错误，不代替事件和异步请求错误处理。组件架构要同时定义 loading、empty、partial、error、retry 和权限状态，成功路径不是唯一 API。

## 官方依据

- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [WAI-ARIA APG: Dialog Modal Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [React createPortal](https://react.dev/reference/react-dom/createPortal)
