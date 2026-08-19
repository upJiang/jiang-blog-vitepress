---
title: "CSS 选择器与伪元素"
description: "从匹配目标理解组合、优先级、状态伪类和生成内容"
category: frontend
tags: ["CSS","Selector"]
updated: 2026-08-05
order: 380
depth: reference
series: "重学前端"
---
# CSS 选择器与伪元素

选择器定义一组节点匹配条件，伪类根据状态或结构筛选已有元素，伪元素表示元素生成的特殊内容或片段。选择器的可读性、特异性和失效范围共同影响维护与性能。

## 简单选择器描述单个条件

类型选择器、通用选择器、class、id 和属性选择器可以组合成 compound selector。

~~~css
article.card[data-state='open'] > h2.title {
  color: #222;
}
~~~

上例要求同一个 article 同时满足 tag、class 和 attribute，再要求它的直接子节点 h2 同时有 title class。选择器中的空格、`>`、`+`、`~` 分别表达后代、子代、直接相邻和后续兄弟关系。

属性选择器有存在、精确、前缀、后缀、子串和空格分隔等形式。语言相关的 `i`、`s` 匹配标志以及属性值规范化要按目标 HTML/XML 文档类型测试。
## 伪类提供状态和结构条件

`:hover`、`:focus-visible`、`:disabled` 等伪类来自交互或控件状态，`:first-child`、`:nth-child()`、`:empty` 来自树结构。复杂组件常用 `:is()`、`:where()` 和 `:not()` 组合条件。

~~~css
.list > :nth-child(2n + 1) {
  background: #f8f8f8;
}

.button:focus-visible {
  outline: 2px solid currentColor;
}
~~~

`:nth-child(of selector)` 会先按筛选集合再计数，不能把它和 nth-of-type 混为一谈。focus-visible 应保留清晰焦点样式，不能只用 outline: none。
## :is、:where 和 :has 改变组合策略

`:is(.primary, .danger)` 把多个分支合成一个选择器，其 specificity 取参数列表中最高项。`:where(...)` 的 specificity 始终为零，适合提供可覆盖的基础样式。`:has(...)` 允许根据后代或兄弟条件筛选前面的元素，适合表达父级状态，但要控制范围和候选数量。

~~~css
.card:has(> input:invalid) {
  border-color: crimson;
}

:where(.prose h2) {
  margin-block: 2rem 1rem;
}
~~~

这些功能不能取代状态模型。表单错误仍需可读文本和 aria 状态，CSS 只能表达视觉结果。
## specificity 决定同层覆盖顺序

specificity 可按 id、class/attribute/pseudo-class、type/pseudo-element 三列比较，inline style 和 `!important` 还涉及不同来源与重要性。specificity 只在 origin、importance、layer 等前置条件相同后参与。

重复 class、深层嵌套和大量 important 会把覆盖成本转移给未来维护。使用 cascade layer、低特异性的组件根和 `:where` 基础规则，通常比不断增加选择器更稳定。
## 伪元素不是普通 DOM 节点

`::before`、`::after` 生成附着在元素上的盒，通常需要 `content` 才会出现。它们没有可被脚本直接查询的 Node，也不应承载唯一文本、表单控件或交互。

`::first-line` 和 `::first-letter` 作用于排版片段，实际范围受字体、语言、换行和布局影响。生成内容要考虑复制、屏幕阅读器和打印行为，关键事实放在真实 DOM。
## Shadow DOM 改变选择器边界

普通选择器不能穿过 closed 或 open shadow root 直接匹配内部节点。:host、:host-context 和 ::slotted 通过组件边界提供有限入口，内部样式不会自动泄漏到外部。

验证选择器时，使用 DevTools 查看 matched rules、specificity、cascade layer 和 computed style。为每个复杂选择器准备命中与不命中的 DOM，覆盖 Shadow DOM、伪类状态、用户偏好和动态 class，再用 Performance 记录大规模节点变化时的样式失效范围。
