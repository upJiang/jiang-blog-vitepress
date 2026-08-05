---
title: "HTML Head 与元数据"
description: "正确组织标题、链接、脚本和页面元信息"
category: frontend
tags: ["HTML","Metadata"]
updated: 2026-08-04
order: 330
depth: reference
series: "重学前端"
---
# HTML Head 与元数据

`head` 不是 SEO 标签仓库，而是文档级控制面：字符编码影响后续字节如何解释，viewport 影响移动布局，`base` 改变所有相对 URL，资源提示参与网络优先级，title、description、canonical 和 robots 面向不同消费者。顺序和组合错误时，问题往往发生在正文开始渲染之前。

## 一份可审计的最小 head

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>异步任务生命周期 | AI 全栈</title>
  <meta
    name="description"
    content="从创建、排队、执行到取消和恢复，设计可观测的异步任务状态机。"
  >
  <link rel="canonical" href="https://example.com/docs/async-task-lifecycle">
  <link rel="stylesheet" href="/assets/site.css">
  <script type="module" src="/assets/app.js"></script>
</head>
```

`meta charset` 应完整位于文档前 1024 字节内。HTTP `Content-Type` 同样可以声明编码；部署时两处应保持一致，而不是依赖浏览器猜测。`lang` 属于根 `html` 元素，不是 `meta content-language` 的现代替代品。

viewport 配置不应默认禁止缩放。`user-scalable=no`、`maximum-scale=1` 会妨碍低视力用户放大内容，也无法替代真正的响应式布局。工程目标应是文本放大后仍可用，而不是锁住用户能力。

## title、description 与搜索语义

`title` 是文档标题，会被标签页、历史记录、收藏和辅助技术使用。每个可索引页面都需要描述具体内容的标题，避免所有路由共享产品名。`meta name="description"` 是页面摘要候选，不保证搜索引擎一定采用；它不是排名承诺。

`meta name="keywords"` 不再是现代通用搜索优化的关键项，不能用关键词堆砌替代可抓取正文、稳定 URL、结构化内链和真实内容。canonical 用于表达一组重复或高度相似 URL 的首选地址，也不是强制重定向：服务端规范化、站内链接和 sitemap 仍应保持一致。

```html
<meta name="robots" content="noindex, nofollow">
```

robots 指令用于合规爬虫，不是访问控制。私密内容必须在服务端鉴权；客户端隐藏、`noindex` 或不放导航都不能保护数据。

## base 是全局解析状态

文档最多使用一个 `base` URL；第一个带 `href` 的 `base` 决定后续相对 URL 的解析基准。它会影响链接、图片、表单 action、脚本动态设置的相对 URL，甚至片段链接可能变成对 base URL 的网络导航。

```html
<base href="https://cdn.example.net/release/2026-08/">
<img src="cover.webp" alt="发布流程示意图">
```

上例图片解析为 CDN 地址。这个行为不是“危险所以总不能用”，而是一项作用域很大的契约：离线快照、嵌入式文档或统一资源根路径可能需要它；SPA 若依赖路由相对地址，则必须通过集成测试验证。检查最终值应读取 `document.baseURI` 和元素的 URL 属性，而不是只看 attribute 原文。

```js
const image = document.querySelector('img')
console.table({
  baseURI: document.baseURI,
  attribute: image.getAttribute('src'),
  resolvedURL: image.src
})
```

## http-equiv 的能力边界

`http-equiv` 只支持 HTML 标准明确列出的 pragma，不能模拟任意 HTTP 响应头。`refresh` 可以刷新或跳转，但服务端 3xx 对缓存、历史、爬虫和状态码表达更清晰。过时的 `set-cookie` pragma 不能替代 `Set-Cookie` 响应头或 `document.cookie`；尤其 `HttpOnly` 只能由服务端响应设置，前端 JavaScript 无法创建或读取 HttpOnly Cookie。

安全策略优先通过 HTTP 响应头交付。CSP 虽支持 `<meta http-equiv="Content-Security-Policy">` 的受限形式，但它只影响元素之后解析的内容，且部分指令不受支持。需要完整、可审计策略时使用响应头。

## preload、modulepreload 与 preconnect

资源提示不是越多越快。`preload` 表示当前导航很快会使用某资源，必须正确设置 `as`，跨源字体还要匹配 `crossorigin`；错误配置可能重复下载或争抢关键带宽。`modulepreload` 针对模块图准备抓取、解析和编译。`preconnect` 提前建立到关键源的连接，但对大量源同时使用会浪费 socket、CPU 和电量。

```html
<link
  rel="preload"
  href="/fonts/text.woff2"
  as="font"
  type="font/woff2"
  crossorigin
>
<link rel="modulepreload" href="/assets/editor.js">
```

验证资源提示必须看 Network 面板或 PerformanceResourceTiming：是否重复请求、initiator 是谁、是否在实际消费前完成、优先级是否挤压 LCP 资源。不能仅凭标签存在断言优化有效。

## 脚本顺序是执行契约

普通外链脚本会阻塞解析；`defer` 在解析完成后按文档顺序执行；`async` 下载完成即可执行，不保证顺序；module script 默认具有 defer 类似行为，并按模块依赖图执行。选择依据是依赖关系，不是统一给所有脚本加同一属性。

| 脚本 | 是否阻塞 HTML 解析 | 执行顺序 |
| --- | --- | --- |
| classic | 是 | 文档顺序 |
| classic + defer | 否 | 文档顺序，`DOMContentLoaded` 前 |
| classic + async | 否 | 下载完成顺序 |
| module | 否 | 模块图准备完成后，依赖优先 |

## 验证清单

检查最终 HTTP 响应头与 HTML 前 1024 字节；在移动设备模拟和 200% 文本缩放下验证布局；用 URL API 核对 canonical 和 base 后的绝对地址；用 Network 面板证明资源提示确实命中；用无脚本抓取结果确认关键内容不是只存在于客户端 metadata 修改中。

## 参考资料

- [WHATWG HTML：Document metadata](https://html.spec.whatwg.org/multipage/semantics.html#the-head-element)：`head`、`title`、`base`、`meta` 和 `link` 的规范定义。
- [WHATWG HTML：Viewport meta](https://html.spec.whatwg.org/multipage/semantics.html#meta-viewport)：移动 viewport 指令及处理模型。
- [WHATWG HTML：Scripting](https://html.spec.whatwg.org/multipage/scripting.html)：classic/module script 的准备与执行语义。
- [Google Search Central：Meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags)：搜索引擎实际支持的元数据边界。

