---
title: "链接、资源与嵌入内容"
description: "理解 href、src、srcset、iframe 等资源语义"
category: frontend
tags: ["HTML","Resource"]
updated: 2026-08-04
order: 360
depth: reference
series: "重学前端"
---
# 链接、资源与嵌入内容

HTML 中的 `a`、`img`、`script`、`video`、`iframe` 都会引用 URL，但它们不是同一种“资源标签”。浏览器会根据元素、属性、CORS 模式、CSP、优先级和响应 MIME 选择完全不同的抓取与处理流程。工程设计要同时回答：谁发起请求、响应进入什么执行环境、失败如何降级、内容能获得哪些权限。

## URL 属性是解析后的结果

相对 URL 根据文档 base URL 解析。attribute 保存源码值，DOM property 通常返回绝对 URL：

```html
<a id="guide-link" href="../guide/start?from=article#install">安装指南</a>
```

```js
const link = document.querySelector('#guide-link')
console.table({
  source: link.getAttribute('href'),
  resolved: link.href,
  origin: new URL(link.href).origin
})
```

外链在新标签页打开时应考虑 opener 隔离。现代浏览器对 `target="_blank"` 已有隐式 noopener 行为，但公共组件显式写 `rel="noopener noreferrer"` 能表达策略；是否发送 Referer 则应依据分析和安全需求决定，不能机械删除。

## script 的执行和信任边界

外部脚本加载成功不等于可以安全执行。来源、完整性、CORS、CSP 和模块图共同决定边界。第三方静态文件可使用 Subresource Integrity 锁定内容，但版本更新时必须同步 hash；动态频繁变化的脚本不适合假装使用固定完整性值。

```html
<script
  src="https://cdn.example.net/library/1.2.3/index.min.js"
  integrity="sha384-EXAMPLE_HASH_REPLACE_AT_BUILD_TIME"
  crossorigin="anonymous"
  defer
></script>
```

这里的 hash 明确是构建占位，不是可复制的真实凭证。生产流程应从已审计制品计算。`async` 适合互不依赖的脚本，`defer` 适合需要保持文档顺序的 classic script，module script 则按依赖图处理。性能建议必须建立在依赖关系上。

## 图片：候选选择与内容语义

`srcset` 和 `sizes` 让浏览器根据设备像素比、viewport 与布局提示选择候选；`picture` 用于格式协商或 art direction。`sizes` 不是实际 CSS 尺寸，写错会让浏览器下载过大的资源。

```html
<picture>
  <source
    type="image/avif"
    srcset="/media/flow-640.avif 640w, /media/flow-1280.avif 1280w"
  >
  <img
    src="/media/flow-640.webp"
    srcset="/media/flow-640.webp 640w, /media/flow-1280.webp 1280w"
    sizes="(min-width: 960px) 760px, calc(100vw - 32px)"
    width="1280"
    height="720"
    alt="请求经过鉴权、检索、重排后生成带引用回答的数据流"
    loading="lazy"
    decoding="async"
  >
</picture>
```

显式宽高帮助浏览器提前计算宽高比、减少布局偏移。首屏 LCP 图片通常不应 lazy-load；非首屏图片才适合延迟加载。`alt` 根据图片目的编写：传达信息的图描述其作用，邻近文字已完整表达的装饰图使用 `alt=""`，不能把文件名或“图片”当作替代文本。

Data URL 会增加 HTML/CSS 体积、失去独立缓存和流式优先级，并受 CSP 限制。小图标也不应默认把未清洗 SVG 字符串拼进属性；内联选择必须用真实测量和安全模型决定。

## 音视频：格式、轨道与加载策略

`video` 和 `audio` 可以提供多个 source，浏览器按支持能力选择。可访问视频还需要字幕或其他替代内容。不要依赖 autoplay 作为核心流程：浏览器通常限制带声音自动播放，用户的 reduced motion、save-data 和网络状态也需要纳入体验。

```html
<video controls preload="metadata" width="960" height="540">
  <source src="/media/deploy-demo.webm" type="video/webm">
  <source src="/media/deploy-demo.mp4" type="video/mp4">
  <track
    kind="captions"
    src="/media/deploy-demo.zh-CN.vtt"
    srclang="zh-CN"
    label="简体中文"
    default
  >
  当前浏览器无法播放视频，请阅读同页文字步骤。
</video>
```

`preload` 是提示而非下载保证。长视频、鉴权媒体和 Range 请求还涉及服务端缓存与跨域响应，必须在目标 CDN/网关上验证。

## iframe 是隔离工具，不是天然安全容器

iframe 在移动端同样可以由 CSS 指定尺寸，不会必然“铺平页面”。它适合隔离第三方文档、预览和独立应用，但引入额外导航、进程、无障碍标题和通信边界。

```html
<iframe
  title="匿名文档预览"
  src="https://preview.example.net/document/42"
  sandbox="allow-scripts"
  allow="fullscreen"
  referrerpolicy="no-referrer"
  loading="lazy"
></iframe>
```

`sandbox` 在未配置 token 时施加最严格限制，再按需要放开。不要对同源内容同时授予 `allow-scripts` 和 `allow-same-origin` 后误以为仍有强隔离：脚本可能移除 sandbox 并重新加载。`allow` 控制 Permissions Policy 特性，不能代替 CSP；父页面限制谁能嵌入自己应使用 `Content-Security-Policy: frame-ancestors ...`。

`srcdoc` 只是内联文档来源，不会自动清洗 HTML。插入不可信 `srcdoc` 仍需 sanitizer、严格 sandbox 和 CSP。跨源 iframe 的 DOM 访问受同源策略限制，协作通信应使用 `postMessage` 并严格校验 origin 与消息 schema。

```ts
type PreviewMessage = { type: 'preview:height'; height: number }

window.addEventListener('message', (event: MessageEvent<PreviewMessage>) => {
  if (event.origin !== 'https://preview.example.net') return
  if (event.data?.type !== 'preview:height') return
  if (!Number.isFinite(event.data.height)) return
  const height = Math.min(Math.max(event.data.height, 320), 1600)
  document.querySelector('iframe').style.height = `${height}px`
})
```

## object 与 embed 的选择

`object`、`embed` 的历史能力很宽，但插件时代已经结束。PDF 等内容是否能内嵌取决于浏览器和响应头，关键业务必须提供下载或独立打开的后备路径。新应用不要基于 Flash、Java applet 或浏览器插件设计功能。

## 验证资源链路

1. Network 面板检查最终 URL、initiator、priority、CORS、缓存与 MIME。
2. 禁用某一格式或制造 404，确认 picture/video fallback 可用。
3. 使用慢网和小 viewport 检查 CLS、LCP 与候选图片选择。
4. 对 iframe 覆盖同源、跨源、sandbox、CSP、加载失败和消息伪造。
5. 只用键盘和读屏确认链接目的、图片替代文本、视频字幕和 iframe title。

## 参考资料

- [WHATWG HTML：Links](https://html.spec.whatwg.org/multipage/links.html)：链接类型与抓取语义。
- [WHATWG HTML：Embedded content](https://html.spec.whatwg.org/multipage/embedded-content.html)：图片、音视频、iframe 等元素的规范行为。
- [WHATWG HTML：The script element](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element)：脚本类型、准备与执行模型。
- [W3C CSP Level 3](https://www.w3.org/TR/CSP3/)：脚本、frame 与资源加载的策略边界。
- [Web Platform Tests：html/semantics/embedded-content](https://github.com/web-platform-tests/wpt/tree/master/html/semantics/embedded-content)：嵌入内容的公开浏览器测试。
