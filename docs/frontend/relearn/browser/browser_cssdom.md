---
title: "CSSOM 与样式计算"
description: "区分声明、层叠、计算值、实际几何和 CSSOM View"
category: frontend
tags: ["Browser","CSSOM"]
updated: 2026-08-05
order: 550
depth: reference
series: "重学前端"
---
# CSSOM 与样式计算

CSSOM（CSS Object Model）把样式表、规则和声明暴露给脚本；CSSOM View 则补充窗口、滚动和几何测量 API。它们提供的是可操作的对象模型，最终样式还要经过级联、继承、变量解析和布局。

## 样式表由规则对象组成

`document.styleSheets` 返回页面可访问的 StyleSheet 列表。CSSStyleSheet 的 `cssRules` 里有 StyleRule、MediaRule、KeyframesRule 等不同规则类型。

~~~js
const sheet = document.querySelector('style').sheet
const rules = [...sheet.cssRules]

for (const rule of rules) {
  console.log(rule.type, rule.cssText)
}
~~~

跨源样式表受同源策略限制，读取 `cssRules` 可能抛出 SecurityError。页面能应用一张表，不代表脚本能读取它的规则文本。生产调试应记录 stylesheet URL、来源策略和加载完成时机。

CSSOM 的规则修改接口，如 `insertRule`、`deleteRule`，会改变样式匹配输入。动态写入要控制规则数量和生命周期，频繁创建规则比更新一个 CSS custom property 更难维护。
## CSSStyleDeclaration 不是最终样式

`element.style` 表示元素的 inline declaration block，只包含 `style=""` 或脚本写入的声明。它不包含外部样式表、继承值和用户代理样式。

~~~js
const card = document.querySelector('.card')

card.style.setProperty('--accent', 'rebeccapurple')
card.style.setProperty('margin-inline', '1rem')

console.log(card.style.getPropertyValue('--accent'))
~~~

声明有优先级标记、原始字符串和规范化序列化等细节。删除 inline 声明使用 `removeProperty`，赋空字符串也可能达到相同效果，但对自定义属性和优先级的处理应以 CSSOM 行为为准。
## 最终样式经过级联和继承

样式规则匹配后，浏览器按 origin、importance、cascade layer、specificity 和源码顺序等条件选择胜出的声明。继承属性从父元素传给子元素，非继承属性通常使用初始值或计算值。

`getComputedStyle(element)` 返回一个只读的 CSSStyleDeclaration，适合查看解析后的计算结果。它不是一份静态快照，读取时会反映当前样式；某些属性返回 resolved value，和规范中的 computed value、used value 仍有层次差异。

~~~js
const node = document.querySelector('.card')
const style = getComputedStyle(node)

console.log(style.display)
console.log(style.getPropertyValue('margin-left'))
~~~

伪元素需要传入 `::before` 或 `::after`。读取不存在的伪元素会得到默认对象或警告，不能把它当作普通 DOM 节点修改。
## CSSOM View 提供多个坐标系

`getBoundingClientRect` 返回相对视口的 DOMRect，滚动页面后 top 和 left 会变化。加上 `scrollX`、`scrollY` 才能近似得到文档坐标。

窗口、文档和元素各有自己的滚动属性。可视视口和布局视口在移动端缩放下也可能不同，不能用 `window.innerWidth` 代替所有宽度概念。

~~~js
const rect = document.querySelector('.card').getBoundingClientRect()
const documentTop = rect.top + window.scrollY

console.log({ viewportTop: rect.top, documentTop })
~~~

`offsetWidth`、`clientWidth`、`scrollWidth` 分别包含不同的边框、内边距和溢出范围。尺寸测试必须写清盒模型、滚动条和设备像素比。
## 读写顺序会触发布局同步

样式写入先让样式或布局失效。紧接着读取 `offsetHeight`、`getBoundingClientRect` 或某些 computed style 时，浏览器可能同步完成尚未处理的样式计算和布局，这常被称作 forced synchronous layout。

~~~js
for (const item of document.querySelectorAll('.item')) {
  const height = item.getBoundingClientRect().height
  item.style.width = `${height}px`
}
~~~

循环里的读写交错会放大布局成本。批量读取几何，再批量写入样式，或使用 class、CSS variables 和 requestAnimationFrame 合并更新。是否真的触发布局取决于引擎和当前失效状态，不能只靠 API 名称推断。
## CSSOM 不等于安全边界

脚本可以通过 CSSOM 读取和修改当前 origin 允许访问的规则。它不会绕过 CSP、同源策略或跨源资源的响应限制。把用户输入拼进 selector、style 或 URL 仍需要转义和校验。

验证 CSSOM 时，覆盖外部表、inline、媒体查询、伪元素、滚动容器、缩放和跨源样式表。每次记录读写顺序、页面尺寸、滚动位置、设备像素比和浏览器版本。
