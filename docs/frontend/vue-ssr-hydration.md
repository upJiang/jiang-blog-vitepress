---
title: Vue SSR、流式渲染与 Hydration
description: 沿服务端 HTML、客户端状态和事件绑定解释 SSR 生命周期、数据隔离、Hydration 不匹配及仅客户端能力边界。
category: frontend
part: Vue
chapter: 45
tags:
  - Vue 3
  - SSR
  - Hydration
prerequisites:
  - 组件生命周期与 HTTP 基础
outcomes:
  - 区分服务端渲染和客户端激活
  - 排查 Hydration 不匹配
practice:
  type: diagnosis
  result: 实现确定输出的 SSR 页面
  verify:
    - 每请求状态隔离
    - 时间、随机数和浏览器 API 有明确处理
evidence: official
updated: 2026-08-11
---

# Vue SSR、流式渲染与 Hydration

SSR 在服务端生成初始 HTML，流式渲染按可用片段逐步发送，Hydration 让客户端在已有 DOM 上建立组件状态和事件关系。它们处在服务端输出与浏览器接管之间，可缩短首屏等待，却要求两端首次渲染使用相同数据和结构。

服务端输出价格是 10.00，客户端按另一 Locale 首次渲染为 10,00，Hydration 便发现节点不一致。SSR 不只是把 SPA 在服务器运行一次，它要求每请求状态隔离、首屏输出确定，并让客户端在已有 DOM 上建立组件和事件关系。

## 两段执行链

服务端为请求创建 app、router、store，加载数据并 renderToString 或 stream，输出 HTML 与安全序列化状态。客户端用同一初始状态 createSSRApp，Hydrate DOM，之后才进入普通响应式更新。

mounted 和浏览器 API 不在服务端可用。模块顶层 window、共享 store 或随机 ID 会导致崩溃、跨请求污染或不匹配。使用环境守卫只能避免崩溃，仍要决定客户端差异何时显示。
## Hydration 如何复用

客户端遍历 VNode 与现有 DOM，绑定事件并建立组件实例；匹配时避免重建宿主节点。结构不匹配可能触发警告和局部修复，成本和行为取决于版本，不能把警告当无害日志。

时间、随机数、Locale、媒体查询和鉴权状态应由服务端传入稳定快照，或在 mounted 后更新客户端专属内容。大面积忽略不匹配会掩盖真实状态泄漏。
## 流式和数据边界

流式 SSR 可以先发送 shell 再发送后续片段，改善首字节与内容可见时间，但代理缓冲、错误边界和客户端激活都要验证。每个异步边界需要 loading、error 和恢复策略。
## 验证

并发发起两种用户/Locale 请求，确认 HTML 和 store 不串；禁用 JavaScript 检查服务端内容；启用后记录 Hydration 警告和交互可用时间。故意加入随机值建立反例，再改成服务端序列化种子。

SSR 的收益要同时对照首屏、SEO、服务器成本、缓存、数据安全和 Hydration。它改变了工作位置与交付顺序，不保证所有页面都更快。
## 每个请求必须拥有独立应用图

服务端入口应为每次请求创建 app、router、Pinia 和请求上下文，等待路由 ready 与数据预取，再渲染 HTML。把 Store 或 reactive 单例放在模块顶层，会让并发请求共享用户数据；这既是正确性 bug，也是隐私事故。

```text
HTTP request
  -> createApp() / createRouter() / createPinia()
  -> router.push(url), await isReady
  -> preload route data with request-scoped auth
  -> renderToString / renderToNodeStream
  -> 安全序列化初始状态
  -> client createSSRApp + hydrate
```

序列化状态不能直接拼进 script。`</script>`、HTML 特殊字符和原型相关键需要安全序列化策略，敏感 token 不应进入 HTML。客户端读取同一快照后再创建 Store，保证第一次 render 与服务器一致。
## Hydration 怎样复用 DOM

客户端从根 VNode 与现有 DOM 同步向下核对类型、文本、属性和子节点，并绑定事件/组件实例。匹配时复用节点，差异时开发环境警告并按策略修补。无效 HTML 被浏览器解析器重排、服务端与客户端时区不同、随机 ID、只在 mounted 前读取 viewport 都可能破坏匹配。

Hydration 完成不等于页面立刻流畅：大组件仍要在主线程执行 setup/render 和事件绑定。测量应区分 TTFB、FCP/LCP、HTML 完成、脚本加载、Hydration 完成和 INP。流式改善前几项，可能增加服务器并发、代理配置和错误恢复复杂度。
## 缓存与错误边界

整页缓存只能在响应对身份、Locale、实验组和权限无差异时共享；否则缓存 key 或私有缓存策略必须覆盖这些维度。流式响应一旦已发送 headers/部分 HTML，错误不能再简单改成完整 500 页面，需要边界 fallback、客户端恢复和可观测 request ID。
## 官方依据

- [Vue SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)
- [Vue SSR API](https://vuejs.org/api/ssr.html)
- [Pinia SSR](https://pinia.vuejs.org/ssr/)
