---
title: "语义化 HTML"
description: "从用户任务出发，选择自带正确行为的 HTML 元素"
category: frontend
tags: ["HTML","Semantics"]
updated: 2026-08-05
order: 340
depth: reference
series: "重学前端"
---
# 语义化 HTML

HTML 元素的名称会进入可访问性树、浏览器默认行为、搜索理解和表单导航。语义化要求元素职责与交互方式匹配，单纯换成更“高级”的标签没有意义。

## 结构标签表达阅读关系

`main` 表示页面主要内容，`nav` 表示导航集合，`article` 表示可独立分发的内容，`section` 表示带主题的分组，`aside` 表示补充内容。它们不是通用容器，使用前要能说清内容与页面的关系。

~~~html
<main>
  <article>
    <h1>Release notes</h1>
    <section aria-labelledby="fixes">
      <h2 id="fixes">Fixes</h2>
    </section>
  </article>
</main>
~~~

标题层级应反映文档结构，CSS 字号交给样式解决。一个页面应有清晰的 main 和可导航的 heading，重复的 landmark 名称要提供区分标签。

## 链接和按钮负责不同动作

链接把用户带到一个 URL，应该使用 `<a href>`。按钮触发当前页面动作，应该使用 `<button>`。用 div 监听 click 模拟二者会丢失键盘、焦点、复制链接、打开新标签和辅助技术行为。

~~~html
<a href="/settings">Open settings</a>
<button type="button" id="save">Save</button>
~~~

按钮在 form 中默认 type 是 submit。图标按钮要有可访问名称，危险动作要有确认和错误反馈。禁用属性、aria-disabled 和 CSS pointer-events 表达的状态并不等价，选择前确认是否仍需聚焦和读屏提示。

## 列表、表格和表单保留数据关系

有顺序或无顺序的同类项目使用 ol、ul、dl。表格用于二维数据，使用 caption、th、scope 或 headers 建立表头关联，不能为了布局把页面拆成 table。

表单控件通过 label、name、autocomplete、fieldset 和 legend 建立输入、分组和提交关系。placeholder 不能替代 label，错误消息要关联到控件并在状态变化时可感知。

## div 与 span 仍然有位置

当没有合适的语义元素，div 作为块容器，span 作为行内容器。它们不带默认 role 和键盘行为，适合承载样式、布局和脚本挂载点。选择通用容器并不丢脸，真正的问题是用它伪造原生控件。

语义化还要服从内容顺序。视觉上把元素移动到另一位置，不能让键盘顺序、标题关系和屏幕阅读顺序失控。
