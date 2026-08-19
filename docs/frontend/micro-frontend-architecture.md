---
title: 微前端架构：隔离、通信、路由与发布
description: 从多团队独立交付需求判断是否需要微前端，再比较 Module Federation、运行时加载、iframe 和 Web Components。
category: frontend
part: 工程专题
chapter: 59
tags:
  - Micro Frontend
  - Architecture
prerequisites:
  - 前端构建、路由与浏览器隔离
outcomes:
  - 识别微前端适用条件
  - 设计依赖和故障隔离
practice:
  type: decision
  result: 完成一份边界、通信和回滚设计
  verify:
    - 全局资源所有权唯一
    - 子应用失败不会阻塞壳应用恢复
evidence: public-source
updated: 2026-08-11
---

# 微前端架构：隔离、通信、路由与发布

微前端按业务或团队边界拆分前端应用，让各子应用能够独立开发、发布和演进。它位于多个前端应用与统一入口之间，解决的是大型组织中的交付耦合；隔离、通信、路由与发布都服务于自治边界。若只有一个团队、统一技术栈和同步发布，模块化 Monorepo 往往成本更低。

## 微前端的自治边界

候选子应用应有明确业务能力、团队所有权、路由和发布节奏。按页面组件随意拆会产生跨应用状态、样式和权限耦合。壳应用只拥有导航、认证上下文、错误恢复和全局资源，不能重新实现所有业务。
## 四类集成方案

构建时包共享最简单但不独立发布；Module Federation 等运行时模块共享支持独立部署和依赖协商；Web Components 提供元素协议与一定样式边界；iframe 隔离最强但路由、体验、通信和性能成本更高。

选择轴包括 JavaScript/样式隔离、依赖共享、SSR、部署原子性、调试和安全。不存在一项技术同时提供完全隔离与零通信成本。
## 运行时协议

子应用公开 `mount(container, context)` 与 `unmount()`，context 只包含版本化能力，如导航、认证快照和观测。通信优先 URL 和领域事件，事件需要 Schema、版本和关联 ID；共享可变全局 store 会重新形成单体耦合。

路由只有一个所有者。壳解析一级前缀，子应用处理内部路由；浏览器前进后退必须保持一致。CSS 使用命名空间、Shadow DOM 或构建隔离，Portal 和全局 Overlay 需明确宿主。
## 依赖与发布

共享 React/Vue 要协商版本和单例约束，兼容失败必须阻止加载并提供回退，而不是让两套 Runtime 随机共享状态。Manifest 记录子应用 URL、版本、完整性和健康；发布先上传不可变资产再原子切 Manifest。

子应用加载失败时壳显示可重试边界，其他导航仍可用。上一版本 Manifest 是回滚点。观测把 shell release 与 child release 同时记录。
## 验证

契约测试验证 mount/unmount、路由和事件；集成测试验证版本组合；故障注入模拟超时、Chunk 404、CSS 冲突和不兼容共享依赖；浏览器测试验证焦点和历史。

微前端方案应从组织与发布问题推导，再核算隔离、通信、依赖和回滚成本。把项目拆成多个子应用只是结构变化，还没有说明架构边界。
## 隔离模型的取舍

iframe 给出浏览器级 origin、CSS、JS 和故障隔离，代价是路由、通信、焦点、性能和 SEO 需要跨文档协议；Module Federation 共享 JS Runtime/依赖，体验更自然，却把版本、远程入口和供应链风险带进同一进程；Web Components 通过 Custom Element/Shadow DOM 隔离样式，但状态与框架集成仍需约定。

选择前先画所有权：shell 管全局导航、认证和 release；子应用管自己的路由、数据和资源；跨应用只通过版本化事件/命令或共享只读契约，不直接读取对方 Store/DOM。事件应带 source、version、correlationId 和超时，跨应用失败不能让 shell 永久等待。
## 加载、路由和回滚轨迹

```text
shell HTML -> manifest -> integrity/compat check
  -> load child entry -> mount(container, context)
  -> child route -> data request -> unmount on navigation
```

Manifest 原子切换后保留旧资产窗口；子应用 Chunk 404、共享依赖不兼容或 mount 抛错时，shell 显示局部错误并可回退上一 manifest。Service Worker、CDN 和浏览器缓存必须一起验证，否则回滚指针已切换但用户仍拿到旧 shell/新 child 的混合版本。
## 官方依据

- [Module Federation](https://module-federation.io/guide/start/)
- [MDN: iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
