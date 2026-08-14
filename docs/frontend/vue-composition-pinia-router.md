---
title: Composition API、Pinia 与 Vue Router 状态边界
description: 从大型 setup 拆分组合函数，区分局部状态、跨组件 Store 和 URL 状态，并处理导航守卫与异步竞态。
category: frontend
part: Vue
chapter: 43
tags:
  - Vue 3
  - Pinia
  - Vue Router
prerequisites:
  - 组件与响应式基础
outcomes:
  - 选择正确状态所有者
  - 设计可测试组合函数
practice:
  type: implementation
  result: 实现带筛选 URL 的列表 Store
  verify:
    - 刷新后 URL 可恢复状态
    - Store 不直接依赖视图实例
evidence: official
updated: 2026-08-11
---

# Composition API、Pinia 与 Vue Router 状态边界

Composition API 用函数组合组件逻辑，Pinia 管理跨组件或跨页面的领域状态，Vue Router 管理 URL、路由参数和导航状态。三者处在应用状态架构的不同层，分别承载局部能力、共享数据和可分享的页面位置。明确所有权比让三处状态互相 watch 更可靠。

筛选条件同时存在组件 ref、Pinia 和 route query，三处互相 watch 后出现循环。状态架构先确定权威来源：可分享和后退的筛选由 URL 拥有，Store 负责跨页面领域缓存，组件只维护输入焦点等局部状态。

## 组合函数封装能力而非文件片段

Composable 应围绕资源生命周期和公开输入输出，例如 useSearch(routeQuery)。内部创建的 watcher、事件和请求要在作用域停止时释放。只把 setup 中十行代码搬到 useX，不会自动形成可复用边界。

参数接受 ref 或 getter 时要明确是否响应变化；返回 readonly 状态和命令函数，避免调用方任意改内部 ref。异步流程传递 AbortSignal，防止旧查询覆盖新查询。

## Pinia 的所有权

Store 适合跨组件共享、需要 Devtools 轨迹或缓存生命周期长于页面的状态。action 包含领域转换，getter 派生状态；不要让 Store 直接操作 DOM、Toast 或 Router 实例，外部副作用由适配层处理。

SSR 下每个请求创建独立 Pinia，并安全序列化初始状态，避免跨用户泄漏和脚本注入。

## Router 是状态容器

route 是响应式对象，但 watch 整个 route 会产生无关更新；监听具体 params/query。导航守卫用于是否允许进入和必要重定向，不应承担所有数据加载。组件卸载、导航取消和重复导航要有明确终态。

实现筛选时从 route query 解析并校验，用户确认后 router.replace/push，数据层订阅规范化 query。浏览器后退只改变 URL，其他层由单向派生更新，避免双向 watch。

## 测试与排查

Composable 用传入 ref 和假请求单测；Store 测 action/getter；Router 集成测试刷新、复制链接、前进后退和非法 query。出现循环时画出每条 watch 的读写边，删除双向同步，选定唯一源。

组件状态、provide/inject、Pinia 和 URL 的生命周期、可分享性与更新范围不同。“数据多”不是把状态移入 Store 的判断标准。

## Composable 的资源边界

Composable 不是把代码搬进 `useX`。它接收 Ref/普通值或适配后的 MaybeRef，内部用 computed 表达派生状态，用 watch 连接外部系统，并返回最小公开状态和命令。监听器、Effect 和第三方实例应注册在当前 effect scope；在组件 setup 中调用可随组件卸载停止，脱离组件创建则由调用方持有并停止 scope。

测试时不要依赖隐式全局 App。把时钟、请求器和存储作为参数，输入 ref 后断言输出、请求版本和 cleanup。若 Composable 必须读取 Router/Pinia 注入，提供带测试 App 的集成 fixture。

## Pinia 与 Router 的状态转换

Pinia Store 的 state 是共享可变事实，getter 是缓存派生，action 表达业务转换和异步协议。Store 不应保存可从 route query 稳定派生的重复副本；否则刷新、后退和多标签页会出现两个真相。反过来，编辑中草稿、临时焦点和未提交表单也不应每次写 URL。

```text
地址栏 query（可分享事实）
  -> parse/normalize
  -> Store action 发起 request(version=7)
  -> response 仅在 version 仍为 7 时提交
  -> View 由 route + store 派生
用户确认筛选 -> router.push -> 同一条链重新运行
```

导航守卫返回允许、取消或重定向，异步数据加载还要处理旧导航取消。权限判断必须由服务端授权兜底；前端守卫只是体验与路由可达性控制。

## 官方依据

- [Vue: Composables](https://vuejs.org/guide/reusability/composables.html)
- [Pinia: Core Concepts](https://pinia.vuejs.org/core-concepts/)
- [Vue Router: Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)
