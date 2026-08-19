---
title: 白屏、卡顿与内存泄漏的证据化诊断
description: 从用户现象建立加载、渲染、主线程、内存和框架五层证据，使用 Performance、Memory、Coverage 和错误日志缩小范围。
category: frontend
part: 浏览器与网络
chapter: 56
tags:
  - Performance
  - Memory
  - Diagnostics
prerequisites:
  - 浏览器渲染与网络基础
outcomes:
  - 区分白屏和不可交互
  - 定位长任务与泄漏保留链
practice:
  type: diagnosis
  result: 完成一次故障复现和对照实验
  verify:
    - 修复前后使用相同样本
    - Detached DOM 与监听器所有权可解释
evidence: anonymized-practice
updated: 2026-08-11
---

# 白屏、卡顿与内存泄漏的证据化诊断

前端故障诊断从白屏、卡顿或内存持续增长出发，按网络、错误、渲染、主线程和内存层收集证据并定位第一处异常。它连接线上反馈与代码修复，目标是提出一个能被同样输入和环境复验的原因；“性能优化”不是对所有现象都有效的统一答案。

用户说“页面白了”时，HTML 可能没有返回，关键 JS 可能是 404，也可能根节点已渲染却被遮罩盖住。先把现象转成时间、路由、设备、网络和可观察阶段，再选择工具。

## 五层排查顺序

加载层检查导航状态、HTML、关键资源、CSP 和 Chunk 404；执行层检查控制台、错误监控和 Source Map；渲染层检查根节点、CSS 可见性、Hydration；主线程层检查长任务、事件延迟、Layout/Paint；内存层检查持续增长和保留链。

这种顺序不是固定责任归属，而是从成本较低证据缩小范围。服务端 500 时没有必要先分析 React memo。

## 卡顿的火焰图

Performance 录制同一交互，定位超过 50ms 的长任务，展开脚本调用、样式重算、布局、绘制和 GC。任务总耗时与用户等待不同：一个 200ms 任务会阻塞输入，四个分块任务总计可能更长但可让出响应。

频繁紫色 Layout 常来自读写交错；大量黄色脚本查循环、序列化和框架更新；Paint/Composite 查大面积效果和图层。先定位阶段，再优化具体调用。

## 内存泄漏看可达性

GC 只回收不可达对象。已卸载 DOM 若仍被监听器、全局 Map、定时器、闭包或第三方实例引用，会在 Heap Snapshot 显示 Detached DOM 和 Retainer Path。单次堆大小上升不等于泄漏，缓存和延迟 GC 都会增长。

采用“操作前快照、重复操作、强制 GC、操作后快照”对比数量和保留链。Allocation instrumentation 可观察持续分配。修复要释放真正所有者，不是定期清空所有缓存。

## 白屏保护和观测

入口捕获资源加载、未处理 rejection 和框架错误边界，记录 release、路由和关联 ID，不采集敏感表单。超时白屏探针只能作为兜底信号，要结合首个内容、根节点和错误证据，避免把慢网误报成崩溃。

## 验证修复

固定脚本、数据和环境，保存修复前 trace/heap，修改一个假设，再重跑。性能结论同时报告交互和总工作；内存结论报告对象数量和保留路径。没有对照证据不宣布解决。

Performance trace 中先标记用户输入。Event Timing 的 processing start 之前是输入等待，handler 与框架 Render 属于 Script，随后可能出现 Style、Layout 和 Paint。Long Task 会占用主线程，但 INP 还包含事件等待和下一帧呈现；网络、图片解码和合成问题不能全部归因给 JavaScript。

## 用同一条故障时间线完成诊断

假设“订单列表打开详情三十次后越来越卡”。先固定路由、账号权限、数据量、浏览器版本和操作脚本，然后保存下面这些证据，不预设它一定是 React、Vue 或 DOM 泄漏：

| 阶段 | 记录什么 | 能排除什么 |
| --- | --- | --- |
| 复现前 | Release、设备、数据量、初始 heap | 样本和版本不一致 |
| 每次打开/关闭 | User Timing、Long Task、监听器/定时器计数 | 单纯网络慢或一次性初始化 |
| 重复三十次后 | 相同交互 trace、强制 GC 后 heap | 只有瞬时分配的假象 |
| Heap Snapshot | 增长对象和到 GC Root 的 Retainer Path | 凭对象名猜泄漏 |
| 修复后 | 同一脚本、trace、heap 和功能回归 | 用不同输入制造“优化” |

如果 Retainer Path 是 `Window -> event listener -> closure -> component state -> response`，修复点在监听器所有者的 cleanup；若对象能在强制 GC 后回落，问题可能只是分配峰值。结论应报告字段和路径，不填写没有实际运行过的耗时或内存数字。

```text
Window -> event listener -> closure -> component state -> large response
Map cache -> route key -> DOM node
pending Promise -> callback -> unmounted view
```

使用 allocation instrumentation 定位持续分配，用 sampling profiler 降低开销；线上只采集聚合指标和受控诊断，不上传用户敏感堆内容。内存、CPU 和网络优化分别建立预算，避免一个修复把成本转移到另一层。

## 官方依据

- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Chrome DevTools Memory](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Web Vitals](https://web.dev/articles/vitals)

## 迁移复核：白屏、卡顿与内存泄漏的证据化诊断
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
