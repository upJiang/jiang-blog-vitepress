---
title: HTTP、JavaScript 渲染与搜索可访问性
description: 比较匿名 GET、原始 HTML、渲染 DOM 和资源交付，判断搜索系统能否稳定取得主要内容。
category: seo
part: 第四部分：索引、渲染与性能
chapter: 11
tags:
  - HTTP
  - Rendering
prerequisites:
  - HTTP 与 HTML 基础
  - 读过第 10 章
outcomes:
  - 检查状态、跳转和渲染差异
  - 识别爬虫资源访问风险
practice:
  type: diagnosis
  result: 完成原始响应与渲染结果对照表
  verify:
    - 关键内容不依赖脆弱交互
    - 失败路径有服务端证据
evidence: official-guided-operation
updated: 2026-08-11
---

# 浏览器里有正文，为什么匿名请求只得到一个空容器

预约软件的功能页在日常 Chrome 中显示正常，查看原始响应却只有 `<div id="app"></div>`。标题、价格、功能说明和链接都要等待 JavaScript 下载、接口请求和客户端渲染。一次接口超时后，用户看到转圈，原始 HTML 仍然是空壳。

这不等于“客户端渲染一定不能做 SEO”。真正的问题是公开页面的主要信息有多少个失败依赖，搜索系统与普通用户在失败时能获得什么。

上一篇完成的[索引治理矩阵](/docs/seo/robots-sitemap-canonical-strategy)说明每类 URL 应该怎样被抓取和索引。本篇验证服务器与浏览器是否真正兑现这些规则。输入是公开 URL，处理过程是跟踪 HTTP、保存原始 HTML、执行浏览器渲染并抽查资源，输出是一张差异表与开发问题候选。

## HTTP 是页面交付的第一层

**HTTP（Hypertext Transfer Protocol，超文本传输协议）**定义客户端怎样请求资源、服务器怎样返回状态、响应头和正文。搜索爬虫与浏览器首先都要通过这条链路取得页面。

一次公开页面请求通常经过：

```text
URL -> DNS -> TLS/HTTPS -> CDN/WAF -> 反向代理 -> 应用/静态文件
    -> 状态码与响应头 -> HTML 正文 -> 浏览器解析与后续资源
```

这里的 **DNS（Domain Name System，域名系统）**负责把域名解析到服务地址，**TLS（Transport Layer Security，传输层安全协议）**保护 HTTPS 连接，**CDN（Content Delivery Network，内容分发网络）**负责就近缓存与交付，**WAF（Web Application Firewall，Web 应用防火墙）**负责请求安全过滤。任何一层失败都可能表现为“页面搜不到”：DNS 或 TLS 失败时没有 HTTP 正文，CDN/WAF 可能返回挑战页，代理可能建立循环跳转，应用可能返回 500，**SPA（Single-page Application，单页应用）**路由还可能用 200 返回不存在页面。

## 用真实 GET 而不是只看 HEAD

**GET** 请求获取响应头和正文，最接近用户与爬虫读取页面的方式。**HEAD** 理论上只返回与 GET 相同的响应头、不返回正文，但部分 CDN、代理和应用对两者处理不同，因此 HEAD 只能补充。

下面命令的输入是一个公开、无需登录的 URL，目标是保存最终响应头和原始 HTML，同时记录状态、最终 URL、跳转次数与总耗时：

```bash
PAGE_URL="https://example.com/features/booking"

curl -sS -L --max-redirs 8 \
  -D /tmp/seo-response-headers.txt \
  -o /tmp/seo-response-body.html \
  -w 'status=%{http_code} final=%{url_effective} redirects=%{num_redirects} total=%{time_total}\n' \
  "$PAGE_URL"
```

`-L` 跟随跳转，`--max-redirs` 防止循环无限执行，`-D` 与 `-o` 分别保存头和正文。输出只能证明这一次匿名 GET 的结果；它不证明真实爬虫身份、索引或排名。临时文件应在检查后删除，包含敏感响应时更要限制访问。

请求不要带 Cookie、Authorization、表单或浏览器存储。否则登录后的完整页面可能被误判为公开可抓取。若页面本来就只服务登录用户，应回到索引矩阵确认它不承担自然搜索任务。

## HTTPS 和正式主机要收敛

SEO 不要求网站必须带 `www`。正确目标是 HTTP/HTTPS、www/非 www 等公开入口最终收敛到一个稳定 HTTPS 正式主机，并尽量减少跳转。

逐个记录请求地址、每一跳状态和 Location、最终 URL 与是否降级到 HTTP。多个版本同时返回 200，会分散链接、缓存和规范信号；`http -> https -> www -> 新路径` 的多级链路也增加失败概率。对 IP、localhost 或业务子域名不要机械拼接 www。

**HSTS（HTTP Strict Transport Security，HTTP 严格传输安全）**通过响应头告诉浏览器在有效期内只使用 HTTPS。它能减少协议降级风险，但配置错误可能让尚未准备好 HTTPS 的子域名不可访问。页面工具只能检查是否看到响应头，证书到期、证书链、TLS 版本和加密套件需要服务器或专门 TLS 工具，缺失时应标不可测。

**Mixed Content（混合内容）**是 HTTPS 页面继续请求 HTTP 图片、脚本或接口。浏览器可能阻断主动内容，导致渲染或交互不完整。修复应更新资源源地址或代理配置，不用关闭浏览器保护绕过。

## 原始 HTML 与渲染 DOM 分别是什么

**Raw HTML（原始 HTML）**是服务器响应正文。**DOM（Document Object Model，文档对象模型）**是浏览器解析并可能被 JavaScript 修改后的文档结构。两者的差异说明页面哪些信息依赖客户端执行。

至少比较：

| 字段 | 原始 HTML | 渲染 DOM | 风险判断 |
| --- | --- | --- | --- |
| Title / Description | 是否存在且唯一 | 是否被脚本重写 | 模板与客户端可能冲突 |
| robots / Canonical | 是否符合索引矩阵 | 是否晚插入或改变 | 核心索引信号不应依赖脆弱脚本 |
| H1 / main /正文 | 是否能识别页面任务 | 是否只有渲染后出现 | 评估渲染依赖与失败体验 |
| 关键内链 | 是否有真实 href | 是否点击后才生成 | 发现路径可能不稳定 |
| hreflang / JSON-LD | 是否完整合法 | 是否晚生成 | 继续核对平台处理与语义 |

文本长度差异只能提示风险。原始 HTML 短、渲染后长不一定失败，导航或评论也会增加字符；应重点看主要任务字段是否缺失。反过来，原始 HTML 有大量序列化状态，也不等于用户可见正文完整。

## 不同渲染方案怎样选择

| 方案 | 英文 | 适合页面 | 主要失败路径 |
| --- | --- | --- | --- |
| 静态生成 | Static Site Generation, SSG | 文章、帮助、变化较少的营销页 | 更新与大规模构建失控 |
| 服务端渲染 | Server-side Rendering, SSR | 需要最新公开数据的内容页 | 慢查询、源站容量、缓存复杂 |
| 客户端渲染 | Client-side Rendering, CSR | 登录后台和强交互工具 | JS、接口、权限失败后空白 |
| 混合/水合 | Hybrid Rendering / Hydration | 公开正文加交互组件 | 服务端与客户端状态不一致 |
| 流式渲染 | Streaming Rendering | 模块复杂、部分数据较慢 | 占位跳动、关键内容分段失败 |

没有一种方案天然获得排名。选择依据是页面任务、数据更新频率、个性化、首屏所需信息和团队运维能力。公开获客页的 Title、主要正文、Canonical 和关键链接通常应在初始响应中可读；计算器、筛选和评论可以渐进增强。

若脚本失败，页面至少要说明发生了什么并保留可用主任务。为爬虫按 User-Agent 返回一套用户看不到的特殊内容，可能构成误导，也让两个版本难以维护。

## CSS 和 JavaScript 资源怎样审查

浏览器解析 HTML 时发现样式、脚本、字体和图片。同步经典脚本可能阻塞 HTML 解析，多个阻塞样式会延迟首屏；重复 URL 会增加调度与执行风险。但资源数量本身不等于冗余。

**defer** 让经典脚本在文档解析后按顺序执行，适合依赖 DOM 的逻辑；**async** 在下载完成后尽快执行，适合相互独立的脚本；`type="module"` 默认延后执行。调整属性前必须确认依赖顺序和初始化时机。

浏览器资源清单可以记录同步脚本、阻塞样式、重复 URL、第三方资源、传输体积和耗时。受缓存、跨域 Timing-Allow-Origin 等影响时，体积或时序可能不可测。没有 DevTools Coverage、源码依赖和交互回归时，不能仅凭文件名删除“疑似未使用”代码。

robots.txt 也应对当前页面真实引用的 CSS、JS 和主要图片测试。资源被阻止可能影响渲染理解，敏感接口则应靠权限保护，而不是靠 Disallow。

## 压缩要按内容类型检查

HTML、CSS、JavaScript、JSON、XML、SVG 等文本通常适合 Brotli 或 gzip；JPEG、PNG、WebP、视频和 WOFF2 已经压缩，机械重复 gzip 可能只增加 CPU。判断输入包括 `Content-Type`、体积和 `Content-Encoding`，输出是具体资源是否缺少合适传输压缩。

浏览器通常自动解压正文，因此不能用解压后的字符数猜线上是否启用压缩。用真实响应头和传输体积复核，并确认 `Vary: Accept-Encoding`，防止共享缓存把错误版本返回给客户端。

## 缓存必须按资源类型设计

**Cache-Control（缓存控制）**告诉浏览器和共享缓存响应可否保存、保存多久、是否需要重新验证。带内容指纹的静态资源适合长期 `public, max-age=31536000, immutable`；公开 HTML 通常使用短缓存或 `no-cache` 重新验证；个性化响应使用 `private`；敏感内容使用 `no-store`。

`no-cache` 不等于“不保存”，而是再次使用前要验证。`immutable` 只适合 URL 随内容变化；若发布时覆盖同一文件名，用户可能长期拿到旧资源。ETag 与 Last-Modified 可支持 304，再验证成功时减少正文传输。

检查时分别取 HTML、版本化 CSS/JS、图片、接口与登录页，记录 Cache-Control、ETag/Last-Modified、Age 和二次请求行为。工具不知道真实更新频率和 CDN 回源规则时，应标“需要确认”，不能一律判失败。

## nofollow 属于链接关系，不是访问控制

页面级或链接级 `nofollow` 是搜索系统处理链接关系的提示。普通站内导航、分页和正文内链通常保持可跟随；付费链接用 `sponsored`，用户生成链接用 `ugc`，是否同时 nofollow 按真实关系决定。

它不能保护私密页面、阻止所有抓取或进行所谓“站内权重雕刻”。自动检查可以统计内部 nofollow、页面级 nofollow 和关系属性，是否付费或来自用户内容仍需业务人员确认。

## 本篇产物：原始响应与渲染对照表

选择首页、栏目页、详情页和一个脚本较重页面，记录：

```text
URL｜页面任务｜GET 状态与最终 URL｜跳转链｜HTTPS/HSTS/混合内容｜
原始 Title/Description/robots/Canonical/H1/正文/内链｜
渲染后对应字段｜被阻止资源｜同步/重复资源候选｜
压缩｜缓存｜失败场景｜证据强度｜负责人
```

开发/运维负责 HTTP、渲染、资源和缓存证据；SEO 负责人确认哪些差异影响页面任务与索引；内容负责人核对正文；创业者按业务影响排期。先诊断，不在这一章直接选择所有优化方案。

验收还要覆盖随机不存在 URL、脚本失败、接口超时和移动端。下一篇会把本次加载过程中的时间和布局数据转成性能指标，先理解指标再安排代码优化。

## 继续学习

- 上一篇：[Robots、Sitemap、Canonical 与索引治理](/docs/seo/robots-sitemap-canonical-strategy)
- 下一篇：[Core Web Vitals 与网站性能指标](/docs/seo/technical-seo-rendering-performance)
- 开发优化：[开发侧性能优化与验证](/docs/seo/developer-performance-optimization)
