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

用户说“页面白了”可能是 HTML 没返回、关键 JS 404、运行时异常、根节点被空状态覆盖，也可能页面已绘制但遮罩未消失。先把现象转成时间、路由、设备、网络和可观察阶段，才能选择工具。

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

面试回答白屏卡顿时，可以按现象归类、分层证据、最小假设、对照验证和回归监控展开。这比列一串缓存、懒加载和 CDN 更容易说明判断过程。

## 卡顿要拆成任务、渲染和资源

Performance trace 中先标记用户输入。Event Timing 的 processing start 之前是输入等待，handler 与框架 Render 属于 Script，随后可能有 Style/Layout/Paint。单个超过 50ms 的 Long Task 会占用主线程，但 INP 还包含事件等待和下一帧呈现。网络慢、图片解码和 GPU 合成也可能让页面视觉迟钝，不能全部归因给 JavaScript。

白屏按最小证据树处理：文档响应/根 HTML、关键 CSS、入口 JS 请求与 MIME/CSP、首个异常、Root mount、主线程长任务、框架错误边界。给每层设置可观察探针和 release ID，先找到第一处偏离，再建立复现。

## 内存泄漏看保留路径

堆上涨不一定泄漏，GC 前临时对象会增长。用相同操作循环多次，在强制 GC 可控的实验环境比较 heap snapshot；查看 Detached DOM、监听器、定时器、闭包、Map cache 和框架实例到 GC Root 的 retaining path。修复应切断真正所有者的引用，并重复操作确认对象数量回落。

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
