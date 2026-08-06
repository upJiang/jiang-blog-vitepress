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

元素写着 `width: 50%`，`element.style.width` 返回 `50%`，`getComputedStyle()` 可能返回像素，`getBoundingClientRect()` 又可能得到带小数的实际几何。它们观察的是不同阶段，不能统称为“CSS 属性值”。

## 样式如何得到最终结果

```mermaid
flowchart LR
  A[样式表与内联声明] --> B[选择器匹配]
  B --> C[层叠与继承]
  C --> D[计算值]
  D --> E[布局得到 used value]
  E --> F[盒几何与滚动信息]
```

CSSOM 提供样式表、规则和声明的对象接口；CSSOM View 提供 viewport、滚动和盒几何接口。浏览器可能为返回 API 值做序列化，规范术语与具体字符串形式要分开理解。

## 步骤一：比较三种宽度

预期结果是内联声明保留 50%，computed style 反映层叠与计算后的可用值，矩形给出当前布局坐标和边框盒尺寸。父容器宽度或 transform 改变时，这些值可能进一步分化。

运行前准备一个固定宽度父容器和 `.box { width: 50%; padding: 8px; border: 1px solid }`，并记录 `box-sizing`。这样每个 API 都面对同一个元素和同一帧布局，差异来自观察阶段而不是页面仍在加载字体或动画。改变浏览器缩放后，小数与取整结果也可能变化，应连同环境一起记录。

```js
const box = document.querySelector('.box')

console.table({
  inline: box.style.width,
  computed: getComputedStyle(box).width,
  borderBox: box.getBoundingClientRect().width,
  clientWidth: box.clientWidth,
  offsetWidth: box.offsetWidth
})
```

输入是一个具有内联百分比宽度的元素。关键区别是 style 只看内联声明，computed 经过层叠，rect 包含 transform 后的 viewport 几何，client/offset 使用各自盒模型并通常为整数；输出不能互相替代。测量前要说明 box-sizing、边框、滚动条和缩放条件。

## 步骤二：理解样式表对象

`document.styleSheets` 暴露关联样式表，CSSStyleSheet 含规则列表，CSSStyleRule 连接 selectorText 与 CSSStyleDeclaration。跨源样式表即使应用成功，脚本读取 `cssRules` 也可能因同源策略抛 SecurityError。

可以用 `insertRule()`、`deleteRule()` 或 constructable stylesheet 修改规则，但大量运行时拼接会增加作用域和回收复杂度。组件状态通常通过 class/data attribute 切换，让样式表保持稳定；主题可使用自定义属性更新 token。

## 步骤三：层叠、继承和自定义属性

层叠比较来源、important、layer、specificity、scope 与源码顺序。继承只发生在属性定义允许时；`inherit`、`initial`、`unset`、`revert` 和 `revert-layer` 又有不同回退含义。

自定义属性保存 token，并默认继承。`var(--token, fallback)` 的 fallback 只在变量缺失或无效时参与，不等同于 JavaScript 的 `||`。循环引用或代入后属性语法无效，会让声明在 computed-value time 失效。

## 步骤四：读取布局为何可能变慢

JavaScript 写入 class/style 后，浏览器可以延迟样式和布局。紧接着读取 `offsetWidth`、rect 或部分 computed style，为了返回当前值，浏览器可能同步刷新待处理工作。循环中交替“写、读、写、读”会产生 layout thrashing。

改进方法是批量读取旧状态、计算、再批量写入；跨帧视觉更新可用 requestAnimationFrame。不要为了避免一次布局把全部测量搬进定时器，先用 Performance trace 证明强制布局来自哪里。

## viewport 与滚动接口

`window.innerWidth`、VisualViewport、documentElement clientWidth 表达的视口概念并不完全相同，移动端缩放和软键盘尤其明显。滚动位置还受 scroll container、书写模式、overscroll 和小数精度影响。

`scrollIntoView()` 只发起滚动行为，固定 header、scroll-margin、减少动态偏好和焦点仍需设计。IntersectionObserver 适合异步观察相交，不提供每像素同步测量保证。

## 失败与验证

制造 500 个元素，在循环中每次改 class 后立即读 offsetWidth，再改为先批量写后统一读。Performance 中比较 Recalculate Style 与 Layout 次数，而不是只测一轮 `Date.now()`。

遇到尺寸差异时记录 viewport、DPR、zoom、box-sizing、transform 和滚动条，再选择正确 API。没有一个“真实宽度”适合所有目的：布局约束、屏幕命中和动画几何关心的阶段不同。

## 参考资料

- [CSS Object Model](https://www.w3.org/TR/cssom-1/)
- [CSSOM View Module](https://www.w3.org/TR/cssom-view-1/)
- [CSS Cascading and Inheritance](https://www.w3.org/TR/css-cascade-5/)
- [MDN：CSS Object Model](https://developer.mozilla.org/docs/Web/API/CSS_Object_Model)
