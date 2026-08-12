---
title: HTTP/1.1、HTTP/2、HTTP/3 与连接演进
description: 从队头阻塞、连接复用和加密握手解释各版本帧模型、流、优先级、QUIC 迁移及前端优化策略变化。
category: frontend
part: 浏览器与网络
chapter: 53
tags:
  - HTTP
  - HTTP/2
  - HTTP/3
  - QUIC
prerequisites:
  - TCP、TLS 与请求响应基础
outcomes:
  - 区分三层队头阻塞
  - 根据协议调整资源策略
practice:
  type: diagnosis
  result: 用协议列和时间线核对真实连接
  verify:
    - 协商结果以浏览器证据为准
    - HTTP/2 Push 不作为现代默认建议
evidence: official
updated: 2026-08-11
---

# HTTP/1.1、HTTP/2、HTTP/3 与连接演进

把资源合成一张雪碧图曾能减少 HTTP/1.1 请求成本，在 HTTP/2/3 下可能损失缓存和按需加载。协议优化要理解瓶颈位于应用请求顺序、HTTP 流还是底层传输，而不是记“新版本更快”。

## HTTP/1.1 的连接复用

持久连接允许同一 TCP 连接连续发送请求。Pipelining 理论上可连续发请求，但响应仍按序，前一个慢响应阻塞后续，加上代理兼容问题，浏览器没有广泛依赖。于是浏览器常为同一源建立有限多连接增加并行，付出握手和拥塞窗口成本。

缓存、条件请求、Range、Vary 和内容协商仍是现代协议基础。协议升级不会让错误缓存策略自动正确。

## HTTP/2 的帧与多路复用

HTTP/2 把消息拆成二进制帧，多个 stream 在一条连接交错传输，并用 HPACK 压缩头部。一个慢响应不再阻塞其他 HTTP stream 的帧调度。

但它仍运行在一条有序 TCP 字节流上。某个 TCP 包丢失时，后续字节要等待重传，所有 HTTP/2 stream 都可能停顿，这是传输层队头阻塞。应用自身串行 await 则是第三种“业务瀑布”，HTTP/2 也无法消除。

## HTTP/3 与 QUIC

HTTP/3 使用 QUIC 在 UDP 之上实现加密连接和独立流。一个流的数据丢失通常不阻塞其他流，连接 ID 还能支持网络地址变化。TLS 1.3 集成减少握手路径，但首次连接、0-RTT 安全限制、网络设备支持和回退仍需考虑。

QPACK 头压缩要处理动态表阻塞风险。不能把 HTTP/3 简化成“UDP 所以不可靠”；可靠、有序和拥塞控制由 QUIC 在流层实现。

## 前端策略怎样变化

域名分片在多路复用下会拆散连接复用和拥塞状态，通常不再有利。代码分割仍需控制请求瀑布和优先级；小文件不是无限免费。preconnect 只对确定关键源使用，过多连接会争抢资源。

HTTP/2 Server Push 已不应作为现代浏览器通用优化建议，优先使用 preload、103 Early Hints 和缓存策略，并按真实支持验证。

## 验证协议

在 Network 打开 Protocol/Connection ID，结合服务端或 CDN 日志确认 h1/h2/h3；模拟延迟与丢包比较，而不是只看本地宽带。ALPN 协商、代理和回退会让配置声称的协议与真实访问不同。

面试追问队头阻塞时，应分别回答 HTTP/1.1 响应顺序、HTTP/2 的 TCP 丢包和应用请求依赖，说明 HTTP/3 解决哪一层、没有解决哪一层。

## 三代协议把复用放在哪里

HTTP/1.1 在一个 TCP 连接上按字节顺序传输请求/响应；浏览器通常开多个连接缓解串行，pipelining 受队头和中间设备限制。HTTP/2 把 header/data 拆成带 stream ID 的二进制帧，多流共享一个 TCP 连接，并用 HPACK 压缩头部；某个 stream 的应用响应可以独立推进，但底层 TCP 丢包仍阻塞后续所有字节交付。

HTTP/3 把 HTTP 映射到 QUIC。QUIC 在 UDP 上提供加密、多 stream 可靠传输和连接迁移，单个 stream 丢包不必阻塞其他 stream；QPACK 还要处理动态表引用阻塞。它没有消除 DNS、TLS/QUIC 握手、服务器计算、应用依赖和主线程执行。

```text
h1: connection -> ordered bytes -> response queue
h2: TCP connection -> frames(stream 1/3/5) -> TCP loss blocks all
h3: QUIC connection -> independent streams -> per-stream recovery
```

## 优先级和 0-RTT 边界

协议支持优先级不代表 CDN、服务器和浏览器都按同一策略执行，实际加载顺序仍要看瀑布。QUIC 0-RTT 数据存在重放风险，只适合服务端认定可重放的请求；前端不能因为“更快”把支付或状态变更放进可重放早期数据。

## 官方依据

- [RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000)
