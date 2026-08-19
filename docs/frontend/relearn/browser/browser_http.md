---
title: "浏览器网络与 HTTP"
description: "从一次导航理解请求、缓存、HTTPS、HTTP/2 与 HTTP/3"
category: frontend
tags: ["Browser","HTTP"]
updated: 2026-08-05
order: 530
depth: reference
series: "重学前端"
---
# 浏览器网络与 HTTP

浏览器网络层把 URL、缓存、连接协议、请求体和响应体串成一条异步链路。页面脚本通常通过 Fetch API 触发它，但 DNS、TCP 或 QUIC、TLS、HTTP framing、缓存、CORS 和流式读取分别属于不同层。

## URL 先确定资源和安全上下文

URL 解析会确定 scheme、host、port、path、query 和 fragment。fragment 通常不发送到服务器，origin 则由 scheme、host、port 组成。相对 URL 还要经过文档 base URL 解析，页面被放进 iframe 或改变 base 标签后，结果可能不同。

发起请求前，浏览器会根据 CSP、混合内容规则、Service Worker、代理和缓存策略判断是否允许继续。开发者工具里看到的“请求失败”可能发生在 DNS 之前，也可能是响应被 CORS 阻止交给脚本。
## Fetch 处理请求和响应对象

~~~js
const response = await fetch('/api/profile', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ include: ['plan'] }),
  credentials: 'same-origin',
})

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`)
}

const profile = await response.json()
~~~

Fetch 对 4xx 和 5xx 默认仍然履行 Promise，只有网络层无法得到可用响应、被策略阻止或请求被取消时才拒绝。业务代码必须同时检查 `response.ok`、状态码、Content-Type 和响应体协议。

Request 和 Response 的 body 是流，只能消费一次。需要同时记录原始文本和解析结果时，使用 `response.clone()`，并控制大响应的内存成本。AbortSignal 可以取消尚未完成的请求，但服务端是否已经收到或处理数据，不能仅凭客户端异常判断。
## 缓存改变“是否访问服务器”

HTTP 缓存根据 Cache-Control、Expires、ETag、Last-Modified、Vary 等元数据决定复用还是重新验证。命中强缓存时可能没有网络请求；协商缓存得到 304 时，浏览器把本地响应体与新的元数据合并给页面。

`Vary` 把请求头纳入缓存键。忽略它会把压缩格式、语言或认证上下文的响应错误地复用给另一请求。Service Worker Cache Storage 还提供一层脚本可控缓存，不能和 HTTP cache 混为一谈。

调试缓存时分别记录 memory cache、disk cache、Service Worker、304 和真实 200。DevTools 的“禁用缓存”只在工具打开且页面按该设置加载时生效。
## 跨源请求由 CORS 决定脚本可见性

浏览器允许网络栈发出某些跨源请求，但脚本能否读取响应由 CORS 响应头决定。带自定义头、非简单方法或特定 Content-Type 的请求，通常先发送 OPTIONS preflight，服务器必须返回匹配的 Allow-Origin、Allow-Methods 和 Allow-Headers。

Origin 不能用字符串拼接的“允许所有域名”规则替代白名单。带 credentials 时，Allow-Origin 不能是 `*`，服务端还要正确设置 Allow-Credentials。CORS 不是服务端鉴权，接口仍需校验身份和权限。
## 重定向、Cookie 和凭证会改变边界

Fetch 可以跟随重定向，也可以配置 `redirect: 'error'` 或 `manual`。跨源重定向可能触发新的 CORS 检查，Authorization 等敏感头也可能被浏览器删除或重建。

Cookie 是否发送受 credentials、Domain、Path、SameSite、Secure 和第三方 Cookie 策略共同影响。把 token 放在 URL query 会扩大日志和 Referer 泄漏面，认证信息应使用合适的 Header 或受保护 Cookie，并配合 CSRF 防护。
## HTTP/1.1、HTTP/2 与 HTTP/3 的工作层不同

HTTP/1.1 以文本请求行和头部传输，可通过持久连接和管线化减少连接开销，但并发通常受连接数和队头阻塞影响。HTTP/2 用二进制帧和 stream 在一条 TCP 连接上复用请求，HPACK 压缩头部；TCP 丢包仍会影响整条连接。

HTTP/3 基于 QUIC 和 QPACK，把传输层队头阻塞缩小到独立 stream，但连接建立、代理和部署条件不同。HTTP/2 server push 已被浏览器逐步淘汰，不能再把它当成通用性能方案。检查 Network 面板的 Protocol、连接复用、TTFB 和传输大小，才能判断实际协议。
## 响应流把下载与解析交错起来

大响应可通过 `response.body.getReader()` 分块读取。流式协议要处理边界跨 chunk、取消、解码器残留字节和服务端提前关闭。直接对每个 chunk 调用 `JSON.parse` 只适用于服务端明确发送独立 JSON 文档的协议。

网络性能分析至少区分 DNS、连接、TLS、请求等待、首字节、内容下载和主线程解析。关闭缓存与保留缓存各跑一次，使用同一浏览器、网络条件和请求体，再检查安全策略和错误类型。
