---
title: 前端性能交付：预算、资源、渲染与回归
description: 从业务页面建立实验基线，把 Core Web Vitals、资源预算、关键渲染路径、图片、字体、代码分割和 CI 回归连接起来。
category: frontend
part: 工程专题
chapter: 62
tags:
  - Performance
  - Core Web Vitals
  - Delivery
prerequisites:
  - 浏览器渲染、缓存与构建基础
outcomes:
  - 把指标映射到处理阶段
  - 建立可执行性能预算
practice:
  type: implementation
  result: 完成一次基线、优化和回归门禁
  verify:
    - 实验环境和样本固定
    - 优化不牺牲可访问性与正确性
evidence: public-source
updated: 2026-08-11
---

# 前端性能交付：预算、资源、渲染与回归

前端性能交付把实验室诊断、真实用户分布、构建预算和发布回归连接起来，并把 LCP、INP、CLS 等指标映射到具体资源和主线程阶段。它处在一次性能诊断与长期上线控制之间；一次 Lighthouse 高分不能代表所有用户持续获得相同速度。

## 建立用户任务基线

选择首页、搜索、详情和结算等关键路径，记录设备、网络、缓存、数据量和 release。实验室用 Lighthouse/Performance 复现，RUM 看 p75 等分布并按路由、设备和网络分段。两类数据用途不同。

LCP 查主要内容发现、TTFB、资源下载和渲染延迟；INP 查事件等待、处理和下一帧展示；CLS 查无尺寸资源、字体和动态插入。指标只是入口，优化要落到时间线。

## 资源与渲染预算

HTML/关键 CSS 控制发现路径，图片用正确尺寸、现代格式和响应式候选，字体只预加载首屏必要字重并定义 fallback，JS 按路由分割并减少执行成本。preload 不是越多越好，必须从优先级瀑布验证。

主线程任务超过预算时拆分、减少工作或移到 Worker；DOM 和样式复杂度用 Layout/Paint 证据优化。骨架屏可能改善感知，但不能替代真实 LCP 和可访问内容。

## CI 与发布

构建门禁检查入口/异步 Chunk、图片和字体预算；候选环境运行固定浏览器脚本；生产 RUM 按 release 比较并设置回归告警。阈值来自产品基线和误差分布，不套用未经验证的固定 KB 数。

## 验证和边界

一次只修改一个主要假设，修复前后用同一配置，保存 trace 和构建清单。性能提升后运行功能、视觉、键盘和低端设备测试。延迟加载不能让读屏内容消失，减少动画要尊重 reduced motion。

性能优化先固定用户、页面、指标和证据，再沿网络、解析、渲染、交互、缓存与发布定位动作，最后用相同口径回归。

## 性能预算怎样映射处理阶段

预算不能只有一个 bundle KB。入口 JS 影响解析/编译/执行，关键字体和图片影响 LCP，长任务与同步布局影响 INP，未预留尺寸影响 CLS；每项预算应绑定用户路径、网络/设备条件和可接受误差。

```text
预算项 -> 采集证据 -> 责任模块 -> CI 门禁 -> release 对比
JS/Chunk -> build stats -> tooling owner
LCP/INP/CLS -> RUM/trace -> page owner
404/旧 hash -> Network -> release owner
```

资源优化先保证正确性：响应式图片、字体 display/预加载、CSS 关键路径、动态 import、缓存和压缩要一起看。过早 `preload` 会抢首屏资源，过细分包会增加请求和执行开销；服务端渲染、Hydration、Service Worker 和第三方脚本要分别测量。

低端设备、慢 CPU、4G/离线和 reduced-motion 是不同约束。桌面本地 Lighthouse 高分不能证明真实用户体验，实验要保存浏览器版本、设备模拟、缓存状态、样本量和 trace，优化后复跑相同脚本。

## 官方依据

- [Core Web Vitals](https://web.dev/articles/vitals)
- [LCP](https://web.dev/articles/lcp)
- [INP](https://web.dev/articles/inp)
- [CLS](https://web.dev/articles/cls)

## 迁移复核：前端性能交付：预算、资源、渲染与回归
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
