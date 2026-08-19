---
title: "浏览器布局与格式化上下文"
description: "从 display、包含块、行盒、定位、浮动、Flex 和 Grid 理解几何"
category: frontend
tags: ["Browser","Process"]
updated: 2026-08-05
order: 580
depth: reference
series: "重学前端"
---
# 浏览器布局与格式化上下文

布局把样式计算结果转换成盒的几何信息。元素属于哪个 formatting context（格式化上下文）、包含块是谁、可用空间多大，决定了 width、height、边距、基线和定位结果。一个 `getBoundingClientRect()` 数字本身无法说明这些规则。

## 盒模型先决定尺寸口径

内容区、padding、border 和 margin 构成盒模型。默认 `box-sizing: content-box` 时，指定 width 只覆盖内容区；`border-box` 则把内边距和边框纳入指定尺寸。

~~~css
.panel {
  box-sizing: border-box;
  width: 240px;
  padding: 16px;
  border: 1px solid;
}
~~~

滚动条、最小尺寸、替换元素固有尺寸和百分比参照物会进一步改变 used value。调试尺寸先确认测量 API、盒模型、writing mode 和设备像素比。
## 正常流产生块格式化上下文和行盒

块级盒按块方向依次排列，宽度通常由包含块和边距计算。行内内容被分成 line box，文字按字体度量和 baseline 对齐，换行受可用宽度、断词、书写方向和 `white-space` 影响。

行内元素跨行时可能生成多个 fragment，`getClientRects()` 会返回多个矩形。不要用一个 bounding rect 代替选区、文本命中或多行装饰的所有几何。

块格式化上下文（BFC）建立独立的块布局范围。浮动、绝对定位、`display: flow-root`、某些 overflow 设置等会形成 BFC，影响浮动包围和外边距折叠。BFC 不是“万能清除浮动”口诀，是否形成上下文要看具体 display、overflow 和规范条件。
## 包含块决定定位参照

绝对定位元素从包含块的 padding box 等规则中计算 inset。包含块可能来自最近的定位祖先，也可能由 transform、filter、contain 等属性建立。没有合适祖先时通常回到初始包含块。

~~~css
.wrapper {
  position: relative;
  width: 20rem;
  height: 10rem;
}

.badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}
~~~

固定定位通常相对视口，但 transform 等属性可能改变 containing block。滚动容器、逻辑方向和安全区域会让“top left”直觉失效，优先使用逻辑属性和明确参照。
## 浮动仍参与周围文字布局

浮动盒从普通块的垂直排列中移出，但会占据一块排版区域，后续行盒会为它让出空间。清除浮动会让后续内容避开指定方向的浮动。

浮动的高度和父元素高度不是简单相加关系。现代布局优先使用 Flex 或 Grid 表达组件关系，阅读遗留文档或实现文本环绕时再使用 float。用 `overflow: hidden` 清除浮动还会意外裁剪阴影和溢出内容。
## Flex 根据轴线分配剩余空间

Flex 容器先确定主轴和交叉轴，再计算 flex base size、冻结项和剩余空间分配。最小尺寸、`flex-basis: auto`、内容固有尺寸和 `min-width: auto` 会让“平均分配”失效。

~~~css
.row {
  display: flex;
  gap: 1rem;
}

.row > .main {
  flex: 1 1 auto;
  min-width: 0;
}
~~~

`min-width: 0` 允许可伸缩子项在内容很长时真正收缩。交叉轴对齐还受 stretch、基线、自动边距和多行 flex-wrap 影响。调试 Flex 时检查 computed flex base size、冻结状态和溢出节点。
## Grid 同时处理行和列

Grid 根据显式轨道、隐式轨道、gap 和可用空间放置项目。自动放置算法会先处理显式位置，再按 dense 或稀疏规则寻找空位。轨道尺寸可能经过 min-content、max-content 和 `fr` 的多轮计算。

~~~css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}
~~~

`fr` 分配的是轨道剩余空间，不是元素最终宽度；内容最小尺寸仍可能撑开轨道。需要让长文本可收缩时，使用 `minmax(0, 1fr)` 并处理 overflow。
## 布局结果会影响后续阶段

改变尺寸、字体、边距和文档结构可能让祖先与兄弟重新布局；改变 transform 通常保留布局几何，由绘制或合成阶段处理。读取几何 API 紧跟写入时，浏览器可能同步完成布局。

验证布局时用一个变量一次只改一项，分别观察 normal flow、BFC、absolute、Flex 和 Grid。记录包含块、可用尺寸、滚动条、字体加载状态和浏览器版本，再用 Layout 面板和 `getClientRects()` 交叉确认。
