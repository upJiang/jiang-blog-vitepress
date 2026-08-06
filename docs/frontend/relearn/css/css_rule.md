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

同一个卡片需要回答三种问题：视口是否狭窄、卡片容器是否狭窄、浏览器是否支持 Grid。它们分别属于 `@media`、`@container` 和 `@supports`。虽然都以 `@` 开头，判断对象和失败语义并不相同。

## 先给 CSS 规则分类

普通 qualified rule 由选择器和声明块组成，例如 `.card { display: grid }`。At-rule 以 `@` 开头，有的包住一组规则，有的声明字体、关键帧或页面信息。浏览器遇到未知或无效规则时按语法恢复，通常只丢弃局部，而非整份样式表。

| 规则 | 判断或声明什么 | 常见用途 |
| --- | --- | --- |
| `@media` | 用户环境和视口 | 响应式、颜色偏好、打印 |
| `@container` | 祖先查询容器 | 可复用组件布局 |
| `@supports` | CSS 能力 | 渐进增强 |
| `@layer` | 层叠来源顺序 | 管理基础、组件与覆盖 |
| `@font-face` | 可下载字体 | 字体来源和范围 |
| `@keyframes` | 动画时间线 | 多阶段动画 |

## 步骤一：让同一组件响应三个条件

预期结果是浏览器支持 Grid 时启用网格，容器窄时改成单列，用户减少动态效果时取消非必要过渡。每个条件只处理自己的判断对象。

```css
@layer base, components, overrides;

@layer components {
  .card-list { container-type: inline-size; }

  @supports (display: grid) {
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); }
  }

  @container (width < 30rem) {
    .cards { grid-template-columns: 1fr; }
  }
}

@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }
}
```

输入是浏览器能力、组件容器宽度与用户偏好。关键逻辑是不同 at-rule 各自包住适用声明；输出是组件在相同 viewport 的不同容器中也能独立变化。Cascade Layer 预先声明顺序，让后续规则覆盖不依赖不断提高 specificity。

## 步骤二：理解加载与定义类规则

`@import` 必须出现在样式表允许的前部位置，会增加依赖发现层级；关键样式通常由 HTML link 直接加载。它也可带 media、supports 和 layer 条件，但仍要检查瀑布和缓存。

`@font-face` 描述字体 family、source、style、weight、display 与 Unicode 范围。字体文件失败时应回退到可用系统字体，布局还要考虑字体指标变化。`@keyframes` 定义动画阶段，不负责业务状态；`@counter-style` 定义列表计数样式；`@page` 处理分页媒体。

`@namespace` 主要用于 XML/SVG 等命名空间选择器。`@charset` 是历史编码声明，必须处在字节流开头且格式严格；现代部署更可靠的做法是 HTTP 与文件统一 UTF-8。旧 `@viewport` 方案不应作为现代移动布局结论，HTML viewport meta 与现行 CSS 规范各有边界。

## 步骤三：理解声明如何得到最终值

普通规则中的选择器决定匹配范围，声明由属性和值组成。最终结果还经过来源、important、layer、specificity、作用域和源码顺序的层叠，然后处理继承、计算值与 used value。

自定义属性保存 token 流，并在使用位置解析；未注册的自定义属性默认继承。`@property` 可以声明语法、初始值和继承行为，但要按兼容性渐进增强。无效变量可能直到 `var()` 被代入具体属性时才暴露。

## 故意制造一次失败

删除 `.card-list` 的 `container-type`，容器查询不再有可查询祖先，规则不会按预期触发。这个失败说明 `@container` 不是 viewport media query 的新名字，它依赖显式查询容器。

再把不受支持的新属性直接作为唯一布局方案。浏览器会忽略无效声明；如果基础样式仍能完成任务，渐进增强成功，否则页面失去结构。`@supports` 应检测真正使用的能力，并在“不支持”路径下保持可用结果。

## 参考资料

- [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/)
- [CSS Conditional Rules Level 4](https://www.w3.org/TR/css-conditional-4/)
- [CSS Containment Module Level 3](https://www.w3.org/TR/css-contain-3/)
- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
