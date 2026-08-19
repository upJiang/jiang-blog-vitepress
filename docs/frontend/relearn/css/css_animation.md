---
title: "CSS 动画与过渡"
description: "从状态变化理解 transition、animation、性能和减弱动态效果"
category: frontend
tags: ["CSS","Animation"]
updated: 2026-08-05
order: 410
depth: reference
series: "重学前端"
---
# CSS 动画与过渡

CSS 动画把属性值映射到时间轴。transition 描述一次状态变化如何插值，animation 由 keyframes 和时间线驱动，可重复、暂停、反向和填充。它们都可能触发样式、布局、绘制或合成，性能不能只看“是不是 CSS”。

## transition 需要两个可比较状态

transition 在属性计算值从旧状态变成新状态时启动。它没有独立的关键帧，只有当属性可动画化、元素在两个时刻都存在且变化被浏览器观察到时才会产生过渡。

~~~css
.button {
  opacity: 0.7;
  transition: opacity 160ms ease;
}

.button:hover {
  opacity: 1;
}
~~~

离散属性通常不能逐帧插值，display 的切换就不会像 opacity 一样平滑。多属性 transition 要写清 duration、timing-function 和 delay，避免只改 duration 却让其他属性使用默认值。
## animation 用 keyframes 定义采样

~~~css
@keyframes pulse {
  from { transform: scale(1); }
  to { transform: scale(1.04); }
}

.card {
  animation: pulse 400ms ease-in-out 2 alternate;
}
~~~

浏览器按 animation-duration、delay、iteration-count、direction、fill-mode 和 play-state 计算当前时间，再从 keyframes 得到属性值。delay 期间是否保留起始或结束样式由 fill-mode 决定，animation-fill-mode 不会让动画永远占据布局。

动画事件的 `animationstart`、`animationiteration` 和 `animationend` 可能因取消、元素隐藏或文档卸载而不完整触发。业务状态不要只依赖 end 事件，取消路径要能收尾。
## 可动画属性决定影响范围

opacity 和 transform 常能在合成阶段处理，width、height、top、font-size 等属性可能触发布局，box-shadow、filter、background 等通常需要绘制。引擎会根据当前层和失效区域决定实际阶段，分类只是排查线索。

prefers-reduced-motion 是用户偏好，应降低持续运动和视差，而不是把所有反馈都删除。

~~~css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms;
    transition-duration: 1ms;
    scroll-behavior: auto;
  }
}
~~~

验证动画时观察视觉结果、键盘焦点、屏幕阅读器状态和取消行为。用 Performance、Paint Flashing 和 Layers 面板确认是否发生布局或大面积绘制。
