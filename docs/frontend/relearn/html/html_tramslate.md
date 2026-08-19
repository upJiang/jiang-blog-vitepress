---
title: "链接、资源与嵌入内容"
description: "从 URL 解析到 iframe 隔离，理解浏览器如何加载外部内容"
category: frontend
tags: ["HTML","Resource"]
updated: 2026-08-05
order: 360
depth: reference
series: "重学前端"
---
# 链接、资源与嵌入内容

HTML 中的 script、img、picture、video、audio、iframe 和 link 都会启动不同的资源发现、解码、权限和生命周期流程。标签本身只提供声明，最终行为还受 URL、响应头、CSP、CORS、缓存和用户操作影响。

## script 同时影响执行和依赖

普通经典脚本在解析过程中可能阻塞文档。defer 脚本在解析完成后按文档顺序执行，async 脚本下载完成就执行，模块脚本按依赖图加载并默认延迟。

~~~html
<script src="/app.js" defer></script>
<script type="module" src="/main.js"></script>
~~~

脚本的 crossorigin、integrity、referrerpolicy 和 nonce 等属性参与安全校验。SRI 只在响应内容哈希匹配时允许执行，不能替代 HTTPS 和供应链审计。
## img 的尺寸和替代文本属于内容契约

`img` 的 alt 描述图像目的。装饰图使用空 alt，信息图要在正文或长描述中提供数据。width、height 或 aspect-ratio 能在资源到达前预留空间，减少布局偏移。

`loading="lazy"` 是加载提示，不保证精确的请求时刻。解码、响应 Content-Type、缓存和 fetchpriority 共同决定成本。图片错误、占位图和无障碍名称要在网络失败时仍可用。
## picture 负责选择来源

picture 按 source 的 media、type 和 srcset 条件选择候选，img 作为最终回退。srcset 的宽度描述符需要配合 sizes 才能让浏览器估算显示宽度，不能只列一堆 URL。

~~~html
<picture>
  <source type="image/avif" srcset="/hero.avif">
  <source media="(max-width: 600px)" srcset="/hero-small.jpg">
  <img src="/hero.jpg" alt="Product dashboard" width="1200" height="675">
</picture>
~~~

响应式图片测试要改变视口、设备像素比、支持的 MIME type 和缓存状态，并观察实际请求而非只看 HTML。
## video 和 audio 由媒体状态机驱动

媒体元素涉及 metadata、缓冲、解码、播放策略和错误状态。autoplay 通常需要 muted 或用户手势，preload 只是提示。source 列表按支持类型尝试，失败时通过 error 事件和 readyState 定位阶段。

字幕使用 track 和 WebVTT，控件、键盘操作和暂停状态要可访问。跨源媒体的 crossorigin 与 Canvas 像素读取权限有关，不能把“能播放”当作“能读取”。
## iframe 是独立浏览上下文

iframe 有自己的 Document、事件循环、存储和权限边界。sandbox 可以限制脚本、表单、下载、弹窗和同源能力，allow 属性进一步声明特定能力。跨源父子窗口只能通过 postMessage 按 origin 校验通信。

~~~js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://example.test') return
  if (event.data?.type === 'ready') {
    event.source?.postMessage({ type: 'ack' }, event.origin)
  }
})
~~~

frame-ancestors、X-Frame-Options、CSP、COOP 和 COEP 也会影响嵌入。加载失败、导航和卸载都需要考虑，不要把 iframe 当成普通 div。

资源验证应同时记录请求优先级、缓存、CORS、CSP、解码时刻、事件顺序和失败原因。
