---
title: "浏览器绘制与合成"
description: "理解 paint order、display list、layer、raster 与 compositor"
category: frontend
tags: ["Browser","Rendering"]
updated: 2026-08-05
order: 600
depth: reference
series: "重学前端"
---
# 浏览器绘制与合成

布局得到盒的几何后，浏览器还要决定绘制顺序、颜色、文字、阴影和图像，并把绘制结果栅格化后交给合成器。绘制、栅格化、合成和提交屏幕是相互关联的阶段，开发者常说的“重绘”不能概括所有成本。

## 绘制记录承载视觉指令

浏览器不会把每个元素简单变成一张固定大小的位图。实现会依据布局对象生成 display list，里面记录背景、边框、文字、阴影、替换元素和裁剪等绘制指令，再按 stacking context 和 paint order 排列。

层叠上下文由定位与 z-index、opacity、transform、filter、isolation 等条件建立。不同 stacking context 内部的 z-index 不能直接与外部数字比较。负 z-index、背景、内容、定位后代和 outline 的绘制顺序也有规范规则。

~~~css
.panel {
  position: relative;
  z-index: 1;
}

.panel::before {
  content: '';
  position: absolute;
  z-index: -1;
}
~~~

看到元素被遮挡时，先检查层叠上下文、裁剪和 containing block，再调整 z-index。单纯把数字改成 9999 不能跨越父级 stacking context。

## 栅格化把指令变成像素

绘制指令会按可见区域分块栅格化。文字需要字体选择、字形 shaping、hinting 和抗锯齿；图像还涉及解码、颜色空间和缩放。阴影、滤镜和大面积渐变可能扩大需要栅格化的区域。

浏览器可以复用未失效的绘制结果，也可以只重绘脏区域。修改颜色通常使绘制失效，修改布局尺寸还会先让布局结果失效。字体加载、图片解码和 canvas 内容也会独立触发更新。

“重绘比重排慢”不是可以直接套用的定律。实际耗时取决于失效面积、绘制内容、缓存命中、设备和合成层数量。

## 合成层是调度策略

合成器把若干栅格化内容组合成最终帧。transform、opacity 动画、视频、滚动容器和实现策略可能促成独立合成层，但具体条件随浏览器和版本变化。

独立层能让某些动画只更新变换矩阵，减少主线程布局和绘制；它也会占用纹理内存，增加上传、栅格化和层管理成本。给大量元素加 `will-change: transform` 会提前占用资源，应该在确实需要的时间窗口启用并及时移除。

~~~js
const card = document.querySelector('.card')

card.addEventListener('pointerenter', () => {
  card.style.willChange = 'transform'
})

card.addEventListener('transitionend', () => {
  card.style.willChange = 'auto'
})
~~~

这段代码只表达提示生命周期，不能保证浏览器一定创建层。性能判断要看 Layers、Paint Flashing、Rendering 和 Performance 面板的证据。

## 合成不能修复主线程工作

如果动画同时修改 `width`、`top`、文字内容或影响兄弟布局，合成器拿不到一份稳定的几何结果，主线程仍需重新布局和绘制。把属性写在 CSS transition 中也不会自动移到 GPU。

使用 transform 可能改变命中测试和无障碍坐标，固定定位、滤镜和混合模式还会建立新的包含块或层叠上下文。优化前先确认动画的视觉目标和交互语义。

## 提交屏幕受宿主与设备影响

合成器准备好一帧后，会与显示刷新节奏、窗口系统和设备合成器协作。页面可见性、后台降频、显示器刷新率和设备像素比都会影响提交时机。requestAnimationFrame 的回调表示浏览器准备更新一帧，不等于脚本返回时像素已经被用户看到。

性能报告要区分脚本、样式、布局、绘制、栅格化、合成和提交。用同一设备运行“改变布局属性”和“改变 transform”的对照样本，观察 Paint Flashing 和层内存，再通过截图或视频确认视觉结果。
