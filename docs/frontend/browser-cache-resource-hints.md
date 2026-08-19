---
title: HTTP 缓存、浏览器缓存与资源提示
description: 从一次刷新进入新鲜度、验证器、Vary、内存/磁盘缓存、preload、prefetch、preconnect 和缓存失效。
category: frontend
part: 浏览器与网络
chapter: 54
tags:
  - Browser
  - Cache
  - Resource Hints
prerequisites:
  - HTTP Header 与构建哈希
outcomes:
  - 设计 HTML 和静态资源缓存
  - 选择不会争抢带宽的资源提示
practice:
  type: diagnosis
  result: 记录冷加载、刷新和回访瀑布
  verify:
    - 状态码与 transferred size 一起判断
    - 更新后不会出现新 HTML 配旧资源
evidence: official-guided-operation
updated: 2026-08-11
---

# HTTP 缓存、浏览器缓存与资源提示

HTTP 缓存根据响应头保存并复用网络资源，浏览器还会在内存、磁盘和 Service Worker 等层决定直接返回、重新验证或发起请求；资源提示提前表达 preload、prefetch、preconnect 等加载意图。它们处在浏览器网络栈与页面资源之间，可以减少等待与重复传输，但不改变权限和新鲜度规则。

Network 显示 200，不代表一定从网络下载；304 也不是“缓存没命中”。浏览器缓存决策包括是否可存、是否新鲜、是否需要验证、响应是否匹配 Vary，以及内存、磁盘、Service Worker 等不同来源。

## 新鲜度与验证

`Cache-Control: max-age` 定义相对新鲜期，`s-maxage` 面向共享缓存，`no-store` 禁止存储，`no-cache` 表示可存但使用前验证。名称相似，语义不能互换。

过期后客户端带 ETag/If-None-Match 或 Last-Modified/If-Modified-Since；未变化返回 304，复用本地 body。ETag 精度更高，服务器仍要正确处理 Vary 和压缩变体。

## HTML 与哈希资源

HTML 引用版本化资源，通常短缓存或验证；内容哈希 JS/CSS 可长期 immutable。发布顺序先上传新资源再切 HTML，旧资源保留观察期。若先删旧 Chunk，仍打开旧 HTML 的用户会遇到动态导入 404。

API 缓存要按用户、授权和数据新鲜度设计。Vary: Authorization/Cookie 可能影响缓存共享，敏感响应默认不要进入公共缓存。

## 浏览器缓存来源

memory cache 生命周期短且与页面上下文相关，disk cache 可跨导航，Service Worker Cache Storage 由应用代码控制，BFCache 保存整个页面快照。它们触发条件和失效方式不同，不能统称“浏览器缓存”。

Service Worker 返回缓存响应时，HTTP 缓存可能完全不参与该请求；调试应查看 from ServiceWorker 和 SW 代码策略。

## Resource Hints 是调度建议

preconnect 提前 DNS/TCP/TLS，dns-prefetch 只解析域名；preload 高优先获取当前页面确定需要的资源，必须匹配 as、type、crossorigin；prefetch 为未来导航低优先准备。错误 preload 会与关键资源争带宽，属性不匹配还会下载两次。

模块使用 modulepreload；字体跨源属性必须与实际请求一致。所有 hint 都要在网络瀑布验证发现时间、优先级和复用。

## 三轮实验

第一轮禁用缓存冷加载，第二轮普通刷新，第三轮跨页面回访。记录 status、size、transferred、from memory/disk/SW、Age 和 timing。修改资源内容验证哈希改变，修改 HTML 验证新引用，同时检查旧页面仍能加载旧资源。

缓存诊断要覆盖完整决策过程、`no-cache` 与 `no-store` 的区别、`Vary`、发布一致性和 Service Worker 层。只看两组 Header 容易漏掉实际命中路径。

## 一次请求怎样选择响应

浏览器先根据 URL、请求方法、分区键和 `Vary` 找候选响应，再计算 freshness lifetime 与 current age。新鲜响应直接复用；陈旧响应若有 ETag/Last-Modified，发送条件请求，`304` 合并允许更新的 header 后复用旧 body；没有验证器或要求 reload 则获取完整 `200`。

`no-cache` 表示使用前必须验证，不是禁止存储；`no-store` 才要求不存储。`private` 限制共享缓存，`s-maxage` 面向共享缓存。`stale-while-revalidate` 允许窗口内先用旧响应后台验证，`stale-if-error` 允许故障时使用旧响应，支持度和 CDN 行为需实测。

```text
request -> cache key/Vary match -> fresh? -> reuse
                                   no -> validator? -> conditional request
                                        304 -> merge metadata + old body
                                        200 -> replace stored response
```

## 资源提示的双下载反例

`preload` 的 `as/type/crossorigin` 必须与真正请求一致；字体 preload 缺 crossorigin、module 使用普通 script preload、响应 Vary 不匹配都可能让预取对象无法复用。`prefetch` 也可能被浏览器基于网络和节流策略忽略，它是 hint 不是命令。

发布时 HTML 不长缓存，哈希资产 immutable，并保留旧 hash 一段时间。Service Worker Cache Storage 位于 HTTP 缓存之上，脚本若 cache-first 永不更新，会让正确的服务器 Header 也失效；必须分别观察 SW、memory/disk cache 和网络。

## 官方依据

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [HTML Resource Hints](https://html.spec.whatwg.org/multipage/links.html#link-type-preload)

## 迁移复核：HTTP 缓存、浏览器缓存与资源提示
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
