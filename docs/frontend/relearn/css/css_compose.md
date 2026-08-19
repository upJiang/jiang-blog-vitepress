---
title: "CSS 布局与格式化上下文"
description: "从正常流、包含块和内容约束选择 Flex、Grid 与定位"
category: frontend
tags: ["CSS","Layout"]
updated: 2026-08-05
order: 390
depth: reference
series: "重学前端"
---
# CSS 布局与格式化上下文

布局系统先建立 formatting context，再按包含块和可用空间计算盒。normal flow、block/inline、BFC、Flex、Grid 和定位各自有输入和约束，不能用一组“浮动、清除、居中”口诀互相替代。

## 正常流安排块和行

块盒沿块方向排列，行内内容组成 line box。文字的字体、基线、white-space、断词和书写模式会影响行高与换行；行内元素跨行时可以产生多个 fragment。

外边距折叠发生在满足条件的块格式化上下文边界之间，Flex、Grid、绝对定位和 flow-root 等通常会阻断它。看到相邻块间距异常时，先画出包含块和 BFC 边界，不要只给父元素加 padding。

## BFC 是独立的块布局范围

浮动会让周围行盒避让，BFC 内的块不会被外部浮动穿透。形成 BFC 的条件包括 flow-root、浮动、绝对定位和特定 overflow 等，具体以 display 和 overflow 组合为准。

~~~css
.media {
  display: flow-root;
}

.media img {
  float: inline-start;
  margin-inline-end: 1rem;
}
~~~

flow-root 只建立布局边界，不会自动解决高度、裁剪和响应式图片的所有问题。选择它前要确认需要隔离的到底是浮动、外边距还是滚动。

## Flex 和 Grid 表达不同关系

Flex 主要在一条主轴上分配空间，适合工具栏、行列和内容对齐。Grid 同时管理行与列，适合二维区域和可预测的轨道关系。两者都受内容最小尺寸、固有尺寸、gap 和溢出约束。

~~~css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 1.5rem;
}
~~~

`minmax(0, 1fr)` 允许主区域收缩，避免长文本把轨道撑出视口。Flex 子项常需要 `min-width: 0`，否则默认最小内容尺寸会阻止收缩。

## 绝对定位脱离正常流

position absolute 和 fixed 不参与普通块的空间分配，但它们仍有包含块、层叠上下文、尺寸和命中测试规则。inset、margin、auto 尺寸与静态位置共同决定最终几何。

固定定位在移动端还会受到可视视口、工具栏和安全区影响。若只是想把元素从布局中移出，不要默认使用 absolute，先确认它是否需要跟随滚动和内容变化。

## 布局读写顺序影响性能

修改 class、style 或 DOM 会标记样式和布局失效。马上读取 offset、scroll、client 或 bounding rect 时，浏览器可能同步处理失效。批量读取再批量写入，或把视觉更新放到 rAF，可减少交错成本。

验证布局时一次只改变一个约束，记录包含块、盒模型、可用空间、字体状态和滚动条。用 DevTools Layout 面板、computed style 和多个几何 API 交叉核对，不要把某一次屏幕截图当作规则证明。
