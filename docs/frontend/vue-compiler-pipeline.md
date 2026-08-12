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

模板 `<div class="fixed">{{ count }}</div>` 中，class 永远不变，文本会变。Vue 编译器把这类静态和动态信息写进渲染代码，让运行时不必每次遍历比较所有属性。

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

面试回答 Vue 编译优化时，应从 Parse/Transform/Codegen 数据流解释静态提升、PatchFlag 和 Block Tree 怎样缩小 Runtime 工作，而不是只列三个名词。

## AST 在三阶段怎样变化

Parse 把模板字符流转换为 Root、Element、Text、Interpolation、Directive 等节点，并保留 source location 供错误和 Source Map 使用。Transform 深度优先遍历 AST：进入节点时收集上下文，退出时已有子节点结果，可计算 codegenNode、hoists、helpers 和 patch flags。Codegen 再把根节点、提升常量和 render 表达式写成 JavaScript。

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

## 官方依据

- [Vue: Rendering Mechanism](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue Template Explorer](https://play.vuejs.org/)
- [Vue source: compiler-core](https://github.com/vuejs/core/tree/main/packages/compiler-core/src)
