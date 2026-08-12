---
title: WebView 与 JSBridge：通信、生命周期和安全
description: 从 H5 调用相机进入消息协议、回调表、导航生命周期、版本协商、Origin 校验和最小能力授权。
category: frontend
part: 跨端开发
chapter: 64
tags:
  - WebView
  - JSBridge
  - Security
prerequisites:
  - 浏览器消息与移动端基础
outcomes:
  - 设计可版本化 Bridge 协议
  - 限制不可信页面能力
practice:
  type: implementation
  result: 实现带超时和取消的 Bridge 模型
  verify:
    - 重复回调和页面销毁被清理
    - 来源、方法和参数都经过校验
evidence: public-source
updated: 2026-08-11
---

# WebView 与 JSBridge：通信、生命周期和安全

H5 调用相机不是直接执行原生函数。页面发送结构化消息，Native 校验页面来源、方法和参数，异步执行能力，再用 callback ID 返回结果。Bridge 是跨信任边界 RPC，不能只是挂一个全能对象到 window。

## 协议结构

请求包含 version、id、method、params，响应包含同 id 与 success/error 联合。H5 维护 pending Map 和超时；页面离开时拒绝所有 pending。Native 为方法建立白名单、Schema、权限和线程切换。

导航会让 JavaScript Context 重建，旧 callback 不能回到新页面。Native 返回前检查 WebView 和导航实例仍有效；H5 重试前判断方法是否幂等。

## 注入方式与安全

不同平台通过 message handler、URL scheme 或注入对象通信，能力和漏洞不同。只允许受控 HTTPS origin，禁止任意远程页面获得高危 Bridge。消息来源、当前顶层页面、用户授权和业务权限都要校验。

相机、文件、定位按最小能力授权，高风险动作增加用户确认。返回文件使用受控 URI/临时句柄，不暴露本地路径。Bridge 日志过滤 Token 和个人数据。

## 版本与降级

H5 先查询 capability/version，再调用。新增可选字段保持兼容，删除方法经过弃用周期。旧客户端缺少能力时提供 Web 降级或明确升级提示，不无限重试。

## 验证

契约测试正常、参数错误、未知方法、拒绝权限、超时、取消、重复响应和导航销毁；安全测试加载未授权 origin、iframe 和重放消息。移动端弱网和后台恢复也要验证。

面试回答 JSBridge 时，应覆盖消息协议、回调表、线程/生命周期、版本协商和信任边界，不只说“Native 和 JS 互调”。

## 一次调用的双向轨迹

JS 端生成 requestId，把 method、version、payload 和 timeout 放入 pending Map，再通过平台消息通道发送；Native 校验来源、能力和参数，在 UI/IO 合适线程执行，回传同一 requestId 的 success/error。页面销毁时 pending 必须统一 reject，迟到响应不能写入新页面。

```text
JS: validate -> pending.set(id) -> postMessage
Native: origin/capability check -> dispatch -> timeout/cancel
Native: {id, ok, data|code} -> JS
JS: match id + page instance -> resolve/reject -> delete pending
```

不要把“能调用”当授权。WebView 导航、外部链接、iframe、远程脚本和 deep link 都可能改变内容来源；敏感能力要绑定可信 origin、用户会话和一次性 nonce。错误返回只暴露稳定 code，不把原生堆栈、路径和 token 回传页面。

线程边界也影响时序：原生同步回调可能阻塞 WebView，异步回调可能在页面已卸载后到达；大 JSON 序列化会占用两端线程。对大数据使用分页/文件 URI/流式协议，测量桥接耗时与 payload 大小。

## 官方依据

- [Android WebView Security](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- [Apple WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler)
- [OWASP Mobile WebView Security](https://mas.owasp.org/MASTG/knowledge/ios/MASVS-PLATFORM/)
