---
title: "CSS 与文档资源"
description: "理解 link、样式表加载、资源提示和超链接关系"
category: frontend
tags: ["CSS","Resource"]
updated: 2026-08-05
order: 420
depth: reference
series: "重学前端"
---
# CSS 与文档资源

link、a 和 area 都能带 href，却承担不同的关系。link 主要声明文档与外部资源或替代版本的关系，a 和 area 创建可激活的导航入口。资源类型、缓存、CORS、安全策略和用户操作共同决定最终行为。

## link 的 rel 是关系声明

~~~html
<link rel="stylesheet" href="/app.css">
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="canonical" href="https://example.com/docs">
~~~

stylesheet 会参与 CSS 加载与阻塞策略，preload 只提前请求并把结果交给后续消费者，canonical 提供搜索索引提示。preload 的 as、type、crossorigin 和 URL 必须与真实请求一致，否则会重复下载或被丢弃。

modulepreload 预热模块依赖，prefetch 更适合未来导航，dns-prefetch 和 preconnect 只提供连接提示。rel 不是越多越好，每条关系都应能说清消费者和失败时的回退。

## 外部样式资源有安全边界

跨源 CSS 是否能被应用受 CORS、MIME type、CSP 和响应状态影响。脚本通常不能读取跨源 stylesheet 的 cssRules，即使页面可以使用它的样式。SRI 适用于支持的外部资源，哈希不匹配会阻止使用。

stylesheet 的媒体条件不满足时可以延迟应用，media 改变后资源可能需要重新进入匹配流程。验证关键 CSS 时看 Network、Initiator、Priority 和 Render Blocking 列，而不是只看源代码顺序。

## a 是可分享的导航入口

~~~html
<a href="/docs" target="_blank" rel="noopener">Docs</a>
<a href="mailto:support@example.com">Email support</a>
~~~

href 让元素成为链接，键盘 Enter、复制 URL、打开新标签和历史导航由浏览器提供。target=_blank 与不受信任页面交互时使用 noopener，避免新窗口通过 opener 反向控制原页面。download 是否生效还取决于同源、响应头和用户代理。

链接文本要描述目标，图标链接需要可访问名称。把按钮动作写成 `href="javascript:..."` 会破坏安全策略、历史语义和渐进增强。

## area 依附于 image map

area 只能在 map 里定义图像热点，需要 href、alt、坐标和形状与图片尺寸匹配。响应式图片缩放会让旧坐标失效，现代页面通常更适合用真实按钮覆盖在图片上。

链接预取、鼠标悬停和键盘焦点都可能触发资源或分析逻辑。跨源、重定向、referrerpolicy 和 CSP 需要在目标环境中实测。

## 测试关系而不是标签数量

用 Network 检查每种 rel 的请求、缓存和优先级，用键盘检查 a、area 的焦点与激活，用搜索工具检查 canonical、alternate 和 robots 的一致性。对外部资源记录 origin、CORS、SRI、CSP 和失败回退，避免把提示性关系误当成强制行为。
