---
title: Vue 模板编译：Parse、Transform 与 Codegen
description: 把模板从字符串转换为 AST、转换上下文和渲染函数，解释静态提升、PatchFlag、Block Tree 与编译错误定位。
category: frontend
part: Vue
chapter: 41
tags:
  - Vue 3
  - Compiler
  - AST
prerequisites:
  - 模板、函数与树遍历
outcomes:
  - 追踪模板编译流水线
  - 解释编译信息如何减少运行时工作
practice:
  type: implementation
  result: 查看一段模板的编译输出
  verify:
    - 静态与动态节点可对应
    - 手写 render 与编译结果行为一致
evidence: public-source
updated: 2026-08-11
---

# Vue 模板编译：Parse、Transform 与 Codegen

Vue 模板编译器把模板字符串转换成 JavaScript 渲染函数。Parse 建立带源码位置的 AST，Transform 分析结构并加入运行时提示，Codegen 输出 helper、hoist 和 VNode 创建代码。整条流水线位于 `.vue` 模板与 Runtime Renderer 之间，把编译期已知的静态和动态信息交给更新阶段。

例如 `<div class="fixed">{{ count }}</div>` 中，class 永远不变，文本会变。编译器可以把这种差异写进渲染代码，运行时不必每次比较所有属性。

## Parse 产生模板 AST

解析器按 HTML-like 语法读取标签、属性、指令、插值和文本，维护元素栈和源码位置。模板语法与浏览器 HTML parser 不完全相同，编译错误必须使用节点 loc 映射回原始文件。

AST 还不是最终渲染代码。Transform 以插件式遍历节点，处理 v-if/v-for、表达式作用域、组件解析和静态分析，并在退出节点时汇总子树结果。

## Transform 提供运行时提示

静态提升把不会变化的 VNode 或 props 提到 render 外复用；PatchFlag 标记文本、class、style 或动态 props；Block 收集动态后代，让更新跳过大量静态结构。这是 Vue 模板编译优化的重要差异：编译器知道模板哪些位置动态。

这些提示是编译器与 Runtime 的内部协议，手写 render 函数不一定享有相同优化。错误 PatchFlag 会导致漏更新，因此自定义编译插件要有产物和运行测试。

## Codegen 输出渲染函数

Codegen 根据转换后的 AST 生成 helper 导入、VNode 创建、条件和列表表达式，并附 Source Map。构建工具再处理模块、压缩和分包。运行时调用 render，输入组件上下文与缓存，输出 VNode 树。

使用官方编译器 playground 比较静态模板、动态文本、动态 class、v-if 和 v-for。记录 AST、hoists、patchFlag 和生成代码，随后在 Devtools 中观察更新范围。

## 安全和边界

运行时编译会把模板变成可执行函数，不能把不可信用户字符串直接当模板。服务端预编译减少客户端编译体积，也让 CSP 更容易保持严格。插值默认按文本处理，但 v-html 仍需要可信内容净化。

## 同一模板在三阶段怎样变化

把前面三阶段落到同一模板上：Parse 产生 Root、Element、Text、Interpolation 等节点并保留 source location；Transform 深度优先遍历，计算 `codegenNode`、hoists、helpers 和 patch flags；Codegen 再把根节点、提升常量和 render 表达式写成 JavaScript。

```text
模板：<div class="box">{{ count }}</div>
Parse：Element(div) -> Text + Interpolation(count)
Transform：注册 toDisplayString/openBlock/createElementBlock
           标出 TEXT 动态位，静态 class 留在 props
Codegen：生成 render(_ctx, _cache) -> VNode
Runtime：更新时重点比较动态文本，而非完整静态结构
```

结构指令如 `v-if`、`v-for` 会重写 AST 分支；表达式转换处理作用域标识符；元素转换决定组件还是宿主标签。自定义 directive 可能要求 Runtime helper，不能只在字符串层做正则替换。

## PatchFlag、静态提升与 Block Tree

静态提升把不会随 Render 改变的 VNode/props 移到函数外，减少重复创建。PatchFlag 是编译器给 Renderer 的正向提示，例如只更新 text、class 或特定动态 props；它不是运行时 diff 的最终结果。Block 收集本层动态子节点，更新时可以跳过大批静态后代。

错误使用手写 render、运行时动态组件或不稳定结构时，编译器无法提供同等提示，Renderer 回退到更通用路径。性能分析先查看编译输出和组件更新原因，再决定是否值得改模板结构，不要手工硬编码内部 flag 常量。

## 用编译输出验证，不手抄结果

用项目锁定版本的 `@vue/compiler-dom` 或官方 Template Explorer 编译同一模板，保存生成代码、helpers、hoists 和 PatchFlag；再把 `count` 从 1 改为 2，确认页面只改变动态文本。手写 render 对照应验证行为，而不是复制某个版本的内部常量。文章没有绑定编译器版本时，只能解释职责，不能声称输出字符串永久不变。

## 官方依据

- [Vue: Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue Template Explorer](https://play.vuejs.org/)
- [Vue source: compiler-core](https://github.com/vuejs/core/tree/main/packages/compiler-core/src)

## 迁移复核：Vue 模板编译：Parse、Transform 与 Codegen
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
