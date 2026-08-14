---
title: 前端安全纵深防御：CSP、劫持、加密与支付边界
description: 在 XSS、CSRF 基础上连接 CSP、Trusted Types、点击劫持、依赖供应链、敏感数据、限流和支付确认。
category: frontend
part: 安全与认证
chapter: 58
tags:
  - Security
  - CSP
  - Trusted Types
prerequisites:
  - 浏览器同源策略与认证基础
outcomes:
  - 建立前端威胁模型
  - 区分浏览器缓解和服务端授权
practice:
  type: diagnosis
  result: 审查一条登录到支付确认链路
  verify:
    - 安全头和注入点可自动检查
    - 前端校验不替代服务端权限与金额校验
evidence: official
updated: 2026-08-11
---

# 前端安全纵深防御：CSP、劫持、加密与支付边界

前端安全纵深防御先划分数据、脚本、身份、支付和供应链的信任边界，再用多层控制降低单点失守的影响。它横跨浏览器运行时、网络交付和服务端授权，可约束 XSS、脚本劫持、敏感操作与第三方依赖风险。加密只保护特定传输或存储环节，不能替代授权。

输入转义能减少部分 XSS，却挡不住危险 DOM sink、第三方脚本和被盗依赖。纵深防御先画数据与信任边界，再在输入、输出、浏览器策略、认证、服务端授权和供应链多层降低单点失守影响。

## XSS 与 DOM sink

模板默认文本转义只保护对应文本上下文。HTML、URL、CSS、JavaScript 字符串各有不同编码规则。`innerHTML、document.write、eval` 和动态脚本是高风险 sink；确需富文本时使用维护良好的 sanitizer，并限制 URL scheme 和属性。

CSP 用 source list、nonce/hash 限制脚本来源，Report-Only 先收集违规再收紧。`unsafe-inline` 会显著削弱策略。Trusted Types 可把危险 DOM sink 限制为经过策略创建的 TrustedHTML 等值，但仍需正确 sanitizer。

## CSRF、CORS 与 Cookie

CSRF 利用浏览器自动携带凭证，防护包括 SameSite、CSRF Token、Origin/Referer 校验和敏感操作再认证。CORS 决定脚本能否读取跨源响应，不阻止浏览器发送简单请求，因此不是 CSRF 防护。

Cookie 使用 Secure、HttpOnly、合适 SameSite 和最小 Domain/Path。前端无法通过 JavaScript 设置 HttpOnly。XSS 可能以用户身份发请求，即使读不到 Cookie，所以仍需 CSP 与输入输出安全。

## 点击劫持与跨窗口通信

服务端用 CSP frame-ancestors 或 X-Frame-Options 限制嵌入。前端 frame busting 脚本可被绕过。`postMessage` 必须指定精确 targetOrigin，并校验 event.origin、source 和消息 Schema，不能用 `*` 加一个 type 字段就信任。

## 加密、限流与支付

HTTPS 保护传输，不让前端拥有服务端密钥。浏览器中的“加密密钥”若随应用一起下发，攻击者也能获得。密码使用服务端专用哈希，支付金额、库存、折扣和订单状态由服务端重算与幂等确认。

前端按钮节流改善体验，不是安全限流；服务端按主体、资源和风险执行限流。支付回调以支付平台服务端签名和查询为准，不相信前端跳转参数。

## 供应链与敏感数据

锁文件、依赖审查、最小第三方脚本、SRI（适合稳定 CDN 资源）、CSP 和构建制品签名共同降低供应链风险。Source Map、错误日志、埋点和 URL 不记录 Token、身份证或支付信息。

| 攻击面 | 浏览器层缓解 | 最终责任 |
| --- | --- | --- |
| XSS sink | 输出编码、CSP、Trusted Types | 服务端校验与会话保护 |
| 点击劫持 | `frame-ancestors`、SameSite | 关键操作二次确认 |
| 依赖供应链 | Lockfile、SRI、制品签名 | 发布审批与回滚 |
| 支付篡改 | 只读展示、签名请求 | 服务端金额和订单状态 |

## 验证

自动检查安全头、CSP 报告、危险 sink、依赖漏洞和公开 Source Map；手工测试嵌入、跨源消息、CSRF 和富文本。威胁模型记录资产、入口、攻击者能力、缓解与剩余风险。

浏览器安全控制用于缓解风险，服务端仍拥有最终授权。每一层还要说明失效后由哪一层继续限制数据和副作用。

## 一次 XSS 需要跨过哪些层

输入进入 DOM 的路径可能是 HTML parser、`innerHTML`、URL sink、CSS、脚本字符串或第三方模板。输出编码要匹配上下文，HTML 文本安全不等于 URL、style 或 JS 字符串安全。Trusted Types 可把部分危险 sink 收敛到受控 policy，但 policy 本身仍需审查。

CSP 的 nonce/hash 允许明确脚本，`strict-dynamic` 会改变信任传播；`frame-ancestors` 防点击劫持，`object-src 'none'` 和 `base-uri 'none'` 收紧遗留能力。CSP 报告用于发现真实违规，不是仅写一个 header 就完成防护。CORS 只控制跨源读取，不阻止 CSRF 自动携带 Cookie，也不授予业务权限。

## 支付和限流的最终边界

前端金额、库存和支付按钮都是可篡改输入。服务端从可信订单状态计算金额，向支付平台发起签名请求，回调通过平台签名、幂等键和服务端查询确认；浏览器跳转只展示状态。限流按主体、IP、设备、资源和风险分层，前端 debounce 只减少重复体验请求。

依赖供应链还要锁版本、审查 install script、限制第三方脚本权限、私有 Source Map 和日志字段。SRI 只适用于内容稳定的外部资源，动态版本会导致加载失败；构建签名和发布 provenance 解决的是制品来源，不替代运行时 CSP。

## 官方依据

- [CSP Level 3](https://www.w3.org/TR/CSP3/)
- [MDN: Clickjacking](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [WebAuthn](https://www.w3.org/TR/webauthn-3/)
