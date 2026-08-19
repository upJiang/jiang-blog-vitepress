---
title: "HTML 解析与 DOM 构建"
description: "从字节流理解 tokenizer、tree builder、容错与脚本阻塞"
category: frontend
tags: ["Browser","DOM"]
updated: 2026-08-05
order: 540
depth: reference
series: "重学前端"
---
# HTML 解析与 DOM 构建

浏览器拿到 HTML 字节后，要先按响应编码解码，再把字符流送入 tokenizer（词法器）和 tree builder（树构建器）。最终得到的 DOM 是解析算法的产物，和源码的缩进、标签是否闭合、属性顺序都没有一一对应关系。

## 字节怎样变成字符

HTTP 响应先经过编码判断。BOM、HTTP `Content-Type` 的 charset、HTML 的 `meta` 声明和默认编码共同参与选择，字符解码完成后才进入 HTML tokenizer。一个多字节字符跨越网络分片并不会改变语义，浏览器会在解码层保存未完成的字节。

因此，抓包看到的字节、View Source 看到的源码和开发者工具 Elements 面板里的 DOM 不是同一份数据。排查乱码或节点缺失时，先确认响应头、实际编码和服务器是否在文档中途输出了不完整序列。
## tokenizer 是状态机

HTML tokenizer 不是用一个正则表达式把整页切开。它根据当前状态和下一个字符转移，例如 data state 遇到小于号进入 tag open state，遇到与号进入字符引用处理，遇到普通字符继续积累文本。

~~~html
<p class="note">A &amp; B</p>
~~~

这段输入会产生开始标签 Token、属性 Token、字符 Token、结束标签 Token。属性值中的 `&amp;` 需要在字符引用状态解码，文本中的同样字符也有自己的处理路径。状态机必须记住当前 Token 类型、引号状态和是否遇到 EOF。

真实标准规定了大量状态，用来处理注释、DOCTYPE、原始文本元素、脚本数据和错误输入。用一个“读到 `>` 就结束标签”的示意实现，只能帮助理解分词边界，不能替代浏览器解析器。
## tree builder 维护两套结构

树构建器收到 Token 后，依据 insertion mode 决定把节点插入哪里。最常见的模式是“in body”，但 `<table>`、`<select>`、`<template>` 和脚本都会切换到不同模式。

它至少维护：

- stack of open elements，记录当前打开元素和隐式关闭。
- active formatting elements，处理 `b`、`i` 等格式化元素的重构。
- 当前 insertion mode，以及表格中的 foster parenting 等特殊规则。

~~~html
<table><tr><td>cell<div>text</div></td></tr></table>
~~~

表格内部出现不适合直接放置的内容时，树构建器可能把节点插到表格前方，这就是 foster parenting。浏览器没有“照着缩进建立父子关系”，它执行的是标准规定的状态转移。

省略结束标签也会触发隐式关闭。连续两个 `p`、列表项或表格行，可能让前一个元素在新开始标签到达时自动结束。解析完成后可用 `document.documentElement.outerHTML` 查看浏览器修正后的结构。
## 脚本会改变解析节奏

经典脚本遇到时，HTML 解析通常暂停，脚本执行可能读取或修改当前文档，并通过 `document.write` 把新字符重新送回解析器。外部脚本还要等待网络和编译。

`defer` 脚本在文档解析完成后按文档顺序执行，`async` 脚本下载完成就可能执行，多个 async 之间没有文档顺序保证。模块脚本默认延迟到解析完成附近执行，并有自己的依赖图和错误传播路径。

脚本策略会同时影响 DOMContentLoaded、渲染机会和首屏资源发现。不能只看标签位置判断执行时刻，需要在 Network、Performance 和脚本日志中记录下载、解析、执行三个时间点。
## 错误恢复是 HTML 的日常语义

HTML 解析器对很多错误输入采取恢复策略，浏览器仍会得到 DOM。XML 解析器遇到类似错误通常直接失败，两者不能混为一谈。

~~~html
<p>one
<div>two
<table><tr><td>three
~~~

这个片段的实际节点关系应通过浏览器查询确认。用字符串拼接或正则模拟 HTML 清洗容易漏掉表格、脚本和注释状态。需要处理不可信 HTML 时，使用浏览器提供的 `template`、成熟的 HTML 解析器或经过审计的 Sanitizer 方案，并把允许元素和属性写成策略。
## DOM 是后续阶段的输入

解析完成后，DOM 还要经历样式匹配、布局、绘制和事件注册。读取 DOM 只说明树关系，不能证明元素已经可见、占据尺寸或已经绘制到屏幕。脚本在解析期间插入节点，也会让后续样式和布局失效范围扩大。

验证解析行为时，准备缺失闭合标签、表格错位、字符引用、脚本阻塞和 `document.write` 五类最小样本。分别比较源码、Elements 树、`childNodes` 和 DOMContentLoaded 时刻，并记录浏览器版本与响应编码。
