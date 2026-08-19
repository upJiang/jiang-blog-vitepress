---
title: "CSS At-rules 与规则系统"
description: "从判断对象理解媒体、容器、能力、层叠和资源规则"
category: frontend
tags: ["CSS"]
updated: 2026-08-05
order: 370
depth: reference
series: "重学前端"
---
# CSS At-rules 与规则系统

CSS stylesheet 是规则列表。at-rule 以 `@` 开头，常负责导入、条件、字体、动画、层叠层和命名空间；普通 style rule 再通过 selector 与 declaration block 描述元素样式。解析失败时，浏览器会按规则丢弃未知或无效部分，不会执行任意文本。

## @import 与 @layer 决定来源结构

~~~css
@layer reset, components, utilities;

@import url('/reset.css') layer(reset);

@layer components {
  .button { padding: .5rem 1rem; }
}
~~~

@import 必须出现在允许的位置，且会引入额外依赖和加载链。cascade layer 把优先级划分为命名层，层顺序先于普通 specificity。把工具类放进明确层，可以减少用 `!important` 解决覆盖问题。

## 条件规则筛选可用环境

@media 根据视口、输入设备、色彩和用户偏好筛选规则，@supports 根据语法支持筛选规则，现代浏览器还支持 @container 依据容器尺寸或样式筛选。

~~~css
@media (prefers-reduced-motion: reduce) {
  .hero { animation: none; }
}

@supports (display: grid) {
  .layout { display: grid; }
}
~~~

条件不满足时规则不参与级联，满足条件后再进入同一套 specificity 和层级比较。@supports 只证明声明能被解析，不证明运行时布局符合业务要求。

## @font-face 把字体资源接入布局

@font-face 声明字体族、weight、style、unicode-range 和 src。字体下载、解码和 fallback 会改变文字宽度、行高与布局稳定性。

~~~css
@font-face {
  font-family: 'App Sans';
  src: url('/app-sans.woff2') format('woff2');
  font-display: swap;
}
~~~

font-display 影响等待和替换阶段，不是性能保证。生产验证要观察字体请求、Font Loading API、布局偏移和跨源响应。

## @keyframes 只提供属性采样

@keyframes 定义动画时间点的声明，animation 属性把它绑定到元素和时间线。关键帧中的无效属性会被忽略，缺失属性由样式和插值规则补齐。

动画生命周期有 start、iteration、end、cancel 事件。组件卸载、display none、prefers-reduced-motion 和脚本修改都可能取消动画，业务状态要覆盖取消路径。

## @property 改变自定义属性的类型

注册的自定义属性可以声明 syntax、继承和初始值，让浏览器知道它能否插值。

~~~css
@property --progress {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}
~~~

未注册的 custom property 按 Token 流保存，通常不能逐帧插值。注册语法要有降级策略，因为目标浏览器可能不支持。

## 普通规则由选择器和声明组成

~~~css
.card:is(.selected, [aria-current='page']) {
  border-color: var(--accent);
}
~~~

selector 决定匹配集合，declaration 的 property/value 经过解析后进入级联。CSSOM 可以读取和修改规则，但跨源 stylesheet 受同源策略限制。验证 At-rule 时分别检查解析成功、条件命中、资源加载、级联胜出和最终布局，不要只确认文本出现在文件里。
