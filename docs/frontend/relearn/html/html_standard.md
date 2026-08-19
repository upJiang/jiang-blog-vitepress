---
title: "HTML 标准与语言设计"
description: "从源码到 DOM，理解 HTML 的解析、容错与元素行为"
category: frontend
tags: ["HTML","Standard"]
updated: 2026-08-05
order: 310
depth: reference
series: "重学前端"
---
# HTML 标准与语言设计

HTML 是由 WHATWG 维护的 Living Standard（持续更新标准），内容覆盖语法、解析、DOM、事件、表单、导航、加载、存储和安全接口。它不是一张静态标签表，很多行为需要连同算法、事件和宿主环境一起阅读。

## 标准同时描述输入与运行时

HTML 标准规定 tokenizer 和 tree builder 如何处理字符流，也规定元素接口、反射属性、事件和用户代理行为。一个标签是否“有效”与浏览器遇到错误时怎么恢复，是两个问题。

标准中的 Web IDL 定义 JavaScript 能看到的接口形状。元素属性往往由 IDL attribute 与 content attribute 共同组成，反射方式、默认值和异常条件需要查看对应章节，而不能从名字推断。

## 从规范到浏览器要经过实现

规范描述符合性要求和可观察行为，浏览器实现还要处理性能、平台窗口系统、字体、网络和历史兼容。实现可以采用不同数据结构，只要对外行为满足要求。

兼容性判断至少需要查看目标浏览器版本、MDN 兼容表、Web Platform Tests 和实际运行结果。某个 Chromium 版本的 DevTools 面板不是规范本身，实验结论也不能自动推广到 Safari 或 WebView。

## 标准术语能帮助定位边界

阅读规范时区分“必须”“应当”“可以”、用户代理、作者、环境设置和队列。比如 HTML 事件循环与 ECMAScript Promise Job 由不同规范描述，Fetch、URL、DOM、CSSOM 也各自有责任边界。

遇到行为争议，先写出最小输入、宿主环境和预期输出，再定位规范算法和测试。不要用“浏览器大概会”代替证据。

验证标准理解时，保存规范链接的章节、测试代码、浏览器版本和结果。生产代码还要保留降级路径，因为标准支持率和用户环境会随时间变化。
