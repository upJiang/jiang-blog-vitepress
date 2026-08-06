---
title: "HTML Head 与元数据"
description: "从浏览器加载顺序理解标题、编码、资源和搜索元数据"
category: frontend
tags: ["HTML","Metadata"]
updated: 2026-08-05
order: 330
depth: reference
series: "重学前端"
---
# HTML Head 与元数据

页面正文还没出现，浏览器已经需要决定字符怎样解码、移动端多宽、先下载哪些资源，搜索引擎也要识别标题和规范 URL。`head` 就是这些文档级信息的入口。把它当作标签仓库，容易留下乱码、重复下载或不可索引页面。

## 浏览器在 head 中处理什么

一份页面通常按下面的顺序准备。它不是精确的网络时序图，而是帮助初学者理解各类元数据的职责。

```mermaid
flowchart LR
  A[识别编码] --> B[确定视口]
  B --> C[读取标题与索引提示]
  C --> D[解析资源地址]
  D --> E[下载样式和脚本]
  E --> F[继续构造正文]
```

编码决定后续字节如何变成文字；viewport 影响移动布局；title、description、canonical 面向浏览器和搜索系统；stylesheet、script 和资源提示参与加载。它们互有关联，但不是越多越好。

## 步骤一：建立最小 head

目标结果是：中文不乱码，移动端按设备宽度布局，标签页标题能区分页面，并加载一份样式和模块脚本。下面的示例只保留完成这些任务所需的信息。

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>异步任务生命周期 | AI 全栈</title>
  <meta name="description" content="理解任务从创建到恢复的状态变化。">
  <link rel="canonical" href="https://example.com/docs/task-lifecycle">
  <link rel="stylesheet" href="/assets/site.css">
  <script type="module" src="/assets/app.js"></script>
</head>
```

输入是一组页面级元数据。浏览器先使用 UTF-8 和移动视口，再得到标题、摘要候选和资源地址；最终正文按样式呈现，模块脚本在依赖准备后执行。`meta charset` 应完整落在文档前 1024 字节内，HTTP 的 `Content-Type` 也应声明相同编码。

## 步骤二：分清搜索字段的职责

`title` 会出现在标签页、历史记录、收藏和辅助技术中，也是搜索结果标题的重要候选。不同页面应有能描述具体内容的标题。

`description` 是摘要候选，搜索引擎可能根据查询改写它；它不是排名保证。`canonical` 表达重复或高度相似 URL 的首选地址，也不是强制跳转。站内链接、服务端规范化与 Sitemap 仍要使用同一个公开 URL。

`robots` 指令面向合规爬虫，不能保护私密数据。需要保密的页面必须在服务端鉴权。`meta keywords` 也不能替代可抓取正文、稳定结构和有用内容。

## 步骤三：理解资源为什么会互相影响

普通 classic script 会阻塞 HTML 解析；带 `defer` 的 classic script 下载时不阻塞，并按文档顺序在 `DOMContentLoaded` 前执行；`async` 谁先下载完谁先执行；module script 按模块依赖图准备，默认具有类似 defer 的行为。

资源提示用于表达明确意图：`preload` 表示当前导航很快会消费资源，`modulepreload` 提前准备模块，`preconnect` 提前连接关键来源。配置错误可能造成重复下载或抢占首屏带宽，因此应在 Network 面板验证 initiator、优先级和实际消费时机。

## `base` 为什么需要单独说明

第一个带 `href` 的 `base` 会改变文档中相对 URL 的解析基准，包括链接、图片和表单地址。这个能力适合某些离线文档或统一资源根路径，但作用范围很大。

调试时应比较属性原文和解析结果：`getAttribute('src')` 返回源码值，元素的 `.src` 通常返回绝对 URL，`document.baseURI` 表示当前基准。SPA、嵌入页面和片段链接采用 `base` 前，需要用集成测试确认导航没有偏离。

## `http-equiv` 不是任意响应头

它只支持标准列出的少数 pragma。页面跳转优先使用服务端 3xx，因为状态码、缓存和历史语义更明确。`HttpOnly` Cookie 只能由服务端通过 `Set-Cookie` 设置，前端 JavaScript 既不能创建也不能读取。

CSP 可以用受限的 meta 形式交付，但只影响它之后解析的内容，且并非所有指令都支持。完整安全策略更适合放在 HTTP 响应头中，便于统一审计。

## 正常结果和常见失败

正常结果可以从四处确认：标签页标题准确，移动端 200% 放大仍可用，Network 中没有资源重复下载，抓取到的 HTML 含关键标题和正文。

常见失败包括把 `user-scalable=no` 当作响应式方案、给所有来源添加 preconnect、用 `noindex` 代替权限控制，以及让所有路由共享同一标题。出现性能问题时先看请求瀑布；出现索引问题时同时检查响应状态、HTML、canonical 和 robots，不要只修改一个 meta 标签。

## 参考资料

- [WHATWG HTML：Document metadata](https://html.spec.whatwg.org/multipage/semantics.html#the-head-element)：`head`、`title`、`base`、`meta` 与 `link`。
- [WHATWG HTML：Scripting](https://html.spec.whatwg.org/multipage/scripting.html)：classic 与 module script 行为。
- [MDN：Preloading content](https://developer.mozilla.org/docs/Web/HTML/Attributes/rel/preload)：资源提示的使用边界。
- [Google Search Central：Meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags)：搜索系统支持的元数据。
