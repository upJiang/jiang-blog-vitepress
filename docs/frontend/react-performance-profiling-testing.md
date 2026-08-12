---
title: React 性能、Profiler 与分层测试
description: 从无证据的 memo 优化进入渲染原因、Profiler、结构共享、缓存成本、虚拟列表、单元测试和用户行为测试。
category: frontend
part: React
chapter: 38
tags:
  - React
  - Profiler
  - Testing
prerequisites:
  - 组件、Hooks 与浏览器性能基础
outcomes:
  - 定位重渲染来源
  - 选择行为测试而非实现细节
practice:
  type: diagnosis
  result: 完成一次基线、优化和回归测试
  verify:
    - 优化前后使用同一交互样本
    - memo 不掩盖错误状态边界
evidence: official-guided-operation
updated: 2026-08-11
---

# React 性能、Profiler 与分层测试

看到组件重新 Render 就加 `memo`，常把代码变复杂却不改善交互。Render 是 React 正常计算过程，性能问题要先证明哪次用户操作慢、时间花在 Render、Commit、浏览器布局还是网络，再选择减少工作、推迟工作或缓存工作。

## 建立同口径基线

用 React Profiler 记录一次确定交互，查看哪些组件 Render、实际耗时、基准耗时和触发原因；同时用浏览器 Performance 查看长任务、布局和 Paint。生产构建与开发构建成本不同，Strict Mode 日志也不能直接当生产次数。

先固定数据量、设备节流、缓存状态和操作脚本。指标至少包含输入响应、关键 Commit、长任务和内存。没有基线的“快了很多”不可复核。

## 四类优化决策

状态越靠近真正消费者，受影响子树越小；结构共享让未变化对象保持引用；`memo/useMemo/useCallback` 在比较成本小于重算成本且引用能稳定时才有价值；长列表应分页或虚拟化，而不是缓存数万个 DOM。

```tsx
const visibleRows = useMemo(
  () => buildVisibleRows(rows, filters),
  [rows, filters]
)
```

这段缓存只在 `rows` 和 `filters` 引用能表达真实变化时可靠。若上游每次复制 filters，缓存始终失效；若错误地漏依赖，会返回旧结果。React Compiler 等工具可以改变手工 memo 的需求，但不能替代状态建模和算法复杂度分析。

## 测试层级保护什么

纯 reducer、格式化和选择器适合单元测试；组件测试验证角色、输入、错误和焦点；契约测试验证请求结构；少量 E2E 覆盖登录、结算等跨边界关键路径。对实现细节的快照很容易因无行为变化的重构破碎。

性能回归也要自动化：固定样本下记录 bundle budget、关键交互 trace 或 Profiler 阈值。阈值应容忍环境噪声，并保留原始证据，不能只输出通过/失败。

## 失败边界与排查

Context 大范围更新时先拆 Provider；列表滚动卡顿先看 DOM 数量和 layout；Commit 慢检查 layout Effect、Ref 和第三方控件；Render 慢再看计算和组件范围。网络慢或图片解码慢不应归因给 React 重渲染。

优化后重新执行相同脚本，并用测试确认可访问名称、焦点、错误和状态未改变。删除 memo 后性能无差异，就应保留更简单实现。

面试继续追问时，能够说明 Profiler 的证据、缓存失效条件、虚拟化的可访问性和测试分层，比列出 `memo、useMemo、useCallback` 更能体现工程深度。

## 从一次交互建立成本树

先在生产构建或 profiling build 录制同一交互，标记用户输入、React Commit、Long Task、Layout/Paint 和网络。Profiler 的 render duration 说明 React 计算成本，Performance 面板说明主线程整体成本；二者时间轴对齐后才能判断瓶颈属于组件计算、提交 DOM、浏览器布局还是第三方脚本。

对某个慢组件继续回答三件事：为什么它 Render，Render 里哪段计算贵，结果最终是否 Commit。父级更新、Context value 身份、Store selector、props 新对象和本地状态都可能触发；并发下未提交 Render 也会消耗 CPU。优化指标既看一次 Commit，也看交互总工作量。

## memo 的收益模型

`memo` 增加 props 比较，`useMemo` 增加依赖比较和缓存占用，`useCallback` 只稳定函数身份。只有下游确实依赖引用稳定且跳过的工作大于比较成本时才有收益。先缩小状态所有权、拆分 Context、避免在 Render 做无关重计算，再针对证据加缓存。

长列表虚拟化减少 DOM 和布局，但需要处理动态高度、滚动定位、焦点、读屏集合信息和搜索。Worker 适合可序列化 CPU 工作，不适合把 DOM 操作“搬走”。每项优化都要记录失败边界和降级路径。

## 测试分层

纯 reducer/selector 用单元测试，组件用角色、名称和用户事件测试，路由/请求用集成或契约测试，少量关键流程跑真实浏览器。性能回归使用固定数据和设备条件记录预算；普通功能测试不应断言 Fiber 字段、Hook 顺序编号或内部 className。

## 官方依据

- [React Profiler](https://react.dev/reference/react/Profiler)
- [React Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks)
- [memo](https://react.dev/reference/react/memo)
