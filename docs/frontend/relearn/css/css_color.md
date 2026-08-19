---
title: "Web 色彩系统"
description: "从颜色空间、透明度和对比度理解网页色彩"
category: frontend
tags: ["CSS","Color"]
updated: 2026-08-05
order: 400
depth: reference
series: "重学前端"
---
# Web 色彩系统

CSS 颜色值经过解析、颜色空间转换、混合和合成后才成为屏幕上的像素。写下一个十六进制值只确定了输入格式，不保证不同显示器、透明背景和色彩管理下看起来相同。

## sRGB 与通道表示

常见 `#rrggbb`、rgb() 和 rgba() 使用 sRGB 语境。现代 CSS 允许用百分比、alpha 和更宽色域函数表达颜色，通道范围和序列化方式由具体颜色函数决定。

~~~css
:root {
  --surface: rgb(248 249 251);
  --accent: rgb(60 110 240 / 80%);
}
~~~

alpha 表示前景与背景的合成比例，不是把颜色通道变成另一种色彩。相同半透明颜色叠在不同背景上会得到不同最终值，设计 token 要同时说明使用场景。
## HSL 适合调参，不等于感知均匀

HSL 把颜色表示为 hue、saturation、lightness，方便生成同色相的明暗变化。lightness 并不代表人眼感受到的亮度，两个相同 L 值的色块可能差异很大。实验室设计颜色时需要考虑对比度和实际颜色空间，不能只沿 HSL 旋转。

OKLCH、Lab 和 `color(display-p3 ...)` 可表达更接近感知或更宽的色域，但设备、浏览器和导出链路未必完整支持。超出显示设备色域时会发生 gamut mapping，最终颜色可能被压缩。
## 混合和对比度需要背景

文本对比度由前景、背景和字体尺寸共同决定。半透明前景必须先与背景合成，再计算相对亮度。渐变、图片和 hover 状态不能只检查单一色块。

~~~css
.badge {
  color: white;
  background: color-mix(in srgb, royalblue 80%, black);
}
~~~

`color-mix` 的插值空间会影响中间颜色，不能把所有空间当成同一条直线。可访问性测试要覆盖正常、焦点、禁用、错误和高对比度模式。
## 渐变是图像，不是颜色列表

linear-gradient、radial-gradient 和 conic-gradient 生成 image 值。色标按角度、位置和插值空间计算，透明色标默认与透明黑有关，写 `transparent` 可能产生意外的边缘颜色。

~~~css
.hero {
  background:
    linear-gradient(120deg, rgb(20 30 60 / 0.85), rgb(20 30 60 / 0)),
    url('/hero.jpg') center / cover;
}
~~~

渐变与背景图一起绘制，遮挡、裁剪和高对比度设置都会改变最终结果。大面积滤镜和渐变可能增加绘制成本，性能验证应使用真实尺寸。
## 颜色和形状有同一条几何链

border-radius、clip-path、mask 和 outline 会改变绘制区域与命中区域。圆角不会让子元素自动裁剪，除非 overflow、clip-path 或其他裁剪规则生效。视觉上的透明不等于元素从可访问性树或命中测试中消失。

验证颜色时用浏览器拾色器、不同背景、不同设备像素比和 prefers-color-scheme。记录颜色函数、插值空间、alpha、对比度算法和实际截图，避免只凭肉眼判断。
