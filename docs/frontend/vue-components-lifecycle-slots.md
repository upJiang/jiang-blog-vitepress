---
title: Vue 组件、生命周期、Props、Emits 与 Slots
description: 从父子数据混乱进入单向数据流、组件实例生命周期、事件契约、插槽作用域和资源清理。
category: frontend
part: Vue
chapter: 39
tags:
  - Vue 3
  - Components
prerequisites:
  - Vue 模板与 JavaScript
outcomes:
  - 解释组件更新生命周期
  - 设计稳定 Props/Emits/Slots 契约
practice:
  type: implementation
  result: 实现可控对话框并记录生命周期
  verify:
    - 父子状态所有权清晰
    - 卸载后订阅和副作用被释放
evidence: official
updated: 2026-08-11
---

# Vue 组件、生命周期、Props、Emits 与 Slots

子组件直接修改 prop，同时又 emit 更新，父子各维护一份 visible，最终出现弹窗关闭后重新打开。Vue 的组件契约遵循 props down、events up：父级拥有受控状态，子级读取 props 并用事件请求改变。

## 实例从创建到卸载

setup 在实例建立时执行，响应式 Render Effect 随挂载创建。beforeMount/mounted 围绕首次 DOM 提交，beforeUpdate/updated 围绕后续 Patch，beforeUnmount/unmounted 负责资源释放。父子 Hook 顺序应通过实验观察，业务不要依赖未承诺的兄弟顺序。

服务端渲染没有真实 DOM，mounted 不在服务端运行。组合函数如果在模块顶层创建可变单例，可能跨请求泄漏状态。

## Props 与 Emits 是双向契约

Props 应声明类型、必填和运行时验证边界；对象默认值使用工厂避免共享。接收 prop 后不要复制到本地 state 再用 watch 永久同步，除非明确建立“初始值后独立编辑”的语义。

Emits 声明事件名和 payload。`v-model` 是 `modelValue` 与 `update:modelValue` 的约定，可通过参数支持多个模型。事件不会像 DOM 事件一样自动冒泡穿过组件树，跨层通信应选择提升状态、provide/inject 或 store。

## Slot 的作用域

Slot 内容在父组件作用域编译，子组件决定渲染位置并可通过 slot props 暴露有限状态。Scoped slot 本质是父级提供的渲染函数，子级调用时传入数据。高频列表中的复杂 slot 会增加调用和 VNode 工作，应先测量再优化。

## 对话框实践

对话框由父级控制 open，子级 emit `update:open`；内部只维护焦点和动画阶段。打开时在 mounted/updated 后设置焦点，关闭和卸载时释放键盘监听，焦点返回触发点。

测试使用 role=dialog、标题和键盘行为，不读取组件私有 ref。切换 keep-alive 时还要区分 activated/deactivated 与真正 unmounted，暂停和销毁资源的策略不同。

面试追问组件设计，应说明状态所有者、生命周期副作用、slot 编译作用域、事件不冒泡和 SSR 边界，而不是只列 Hook 名称。

## 组件实例从创建到更新

父 VNode 被 patch 时，Renderer 为子组件创建实例，初始化 props、slots、provides 和 effect scope，再执行 `setup`。首次组件 Effect 调用 render 得到 subTree，patch 宿主节点，然后运行 mounted 队列。更新时先判断 props/slots 是否要求重渲染，写入 next VNode，执行 beforeUpdate，重新 render/patch，最后 updated。

```text
父 render -> 子 VNode
createComponentInstance
setupComponent: props / slots / setup
setupRenderEffect
  mount: render -> patch subTree -> mounted
  update: next props -> render -> patch old/new subTree -> updated
unmount: stop scope -> unmount subTree -> unmounted
```

生命周期 Hook 注册在当前组件实例上，Hook 内创建的 watcher/computed 通常随 effect scope 停止；手工创建的全局监听器、第三方实例和异步任务仍需显式 cleanup。`KeepAlive` 的 deactivated 不是 unmounted，资源应根据“暂时不可见”还是“彻底销毁”选择暂停或释放。

## Props、Emits 与 Slots 的契约

Props 是父到子的只读输入；子组件修改嵌套对象虽然可能在 JavaScript 层可行，却破坏所有权，应 emit 意图让父级决策。组件事件不会像 DOM 事件自动冒泡，祖先通信应通过显式透传、Store 或 provide/inject，而不是假设事件穿过组件树。

Slot 函数在父作用域创建，因此读取父依赖；子组件决定调用时机和位置。Scoped slot 参数是子向父提供的渲染输入，不转移状态所有权。高阶组件若无条件转发 `$attrs`、slots 和 events，要检查事件重复、属性落到错误 DOM 以及可访问名称丢失。

## 官方依据

- [Vue: Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html)
- [Vue: Component Basics](https://vuejs.org/guide/essentials/component-basics.html)
- [Vue: Slots](https://vuejs.org/guide/components/slots.html)
- [Vue source: component.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/component.ts)
