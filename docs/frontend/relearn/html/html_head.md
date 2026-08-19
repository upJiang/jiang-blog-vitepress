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

head 里的元素不直接构成页面主体，却决定文档标题、编码、资源发现、视口、引用策略和部分安全策略。它们影响浏览器、搜索引擎、分享器和辅助技术，配置错误往往在首屏之后才暴露。

## charset 必须尽早出现

浏览器需要知道编码后才能正确解码后续字节。HTML5 文档把 `<meta charset="utf-8">` 放在 head 前部，并让服务器响应头同时声明 charset，减少解析前的猜测窗口。

~~~html
<head>
  <meta charset="utf-8">
  <title>Settings</title>
</head>
~~~

响应头、BOM 和 meta 声明冲突时，最终结果取决于浏览器编码嗅探规则。乱码排查要保存原始响应头和字节，不能只复制页面里显示的字符串。
## title 是文档名和无障碍入口

每个页面应有准确、稳定的 `title`。浏览器标签页、历史记录、书签和屏幕阅读器都可能使用它。把标题写成相同的品牌词，会让多标签操作和搜索结果失去区分度。

title 只能包含文本，不要把 HTML 标签写进去期待样式生效。异步切换路由时，同步更新 document.title 和可访问的主标题，避免两套名称长期不一致。
## base 会改变所有相对 URL

`<base href="..."> ` 为文档设置解析相对 URL 的基准，`target` 还会影响没有显式 target 的链接和表单。它会作用于 script、link、img、fetch 中通过文档解析的相对地址。

~~~html
<base href="/app/">
<link rel="stylesheet" href="styles.css">
<a href="help">Help</a>
~~~

上例实际请求 `/app/styles.css` 和 `/app/help`。动态创建 URL、脚本拼接路径和构建工具的 publicPath 需要与 base 约定一致。一个页面通常只放一个 base，且应尽早出现。
## meta 同时承载行为与描述

常见元数据包括 viewport、referrer、theme-color、robots 和 description。viewport 只影响移动端布局视口和缩放策略，不会让页面自动响应式。

~~~html
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="description" content="Account settings">
~~~

description 是搜索摘要的候选内容，不是排名开关。robots 的效果取决于爬虫是否能访问页面，不能用它替代鉴权或删除服务器数据。referrer 策略应结合隐私、分析和跨源跳转测试。

CSP 可以通过响应头或 meta 部分声明，响应头更早也更完整。涉及 frame-ancestors、报告模式和 worker-src 等能力时，应在服务器头部配置并验证违规报告。
## link 负责资源关系

`rel="stylesheet"` 引入 CSS，`preload` 提前请求明确类型的资源，`modulepreload` 为模块图提供提示，`icon` 声明站点图标。rel 是语义关系集合，不能把每个 link 都当成“加载文件”。

preload 必须与实际请求的 as、crossorigin 和 URL 匹配，否则会重复下载或产生警告。prefetch 适合低优先级的未来导航，不能代替当前页面关键资源。关键 CSS 和字体要用 Network、Priority 和 Initiator 面板确认是否真的提前发现。
## head 顺序仍然会影响性能

charset、关键 meta、title、预加载、stylesheet 和 module script 的顺序会影响预加载扫描器与阻塞时机。defer、async、module 和普通脚本的执行关系也不同，不能只看 DOM 顺序。

验证 head 时同时检查最终 HTML、响应头、资源请求、缓存、CSP、移动端视口和分享卡片。每项元数据都写清它影响的消费者，避免把 SEO、性能、安全和可访问性混成一条规则。
