---
title: "Manifest V3 浏览器扩展架构"
description: "从读取当前页面标题开始，理解页面脚本、内容脚本、Service Worker、消息与最小权限。"
category: frontend
tags: ["Browser Extension", "Manifest V3"]
updated: 2026-08-05
order: 770
depth: flagship
series: "现代前端"
---

# Manifest V3 浏览器扩展架构

扩展要读取当前网页标题，并在弹窗中展示。Popup 不能直接访问页面 DOM，后台 Service Worker 也没有网页 DOM；真正运行在页面上下文旁边的是 Content Script。三个环境有不同权限和生命周期，需要通过消息连接。

本篇先跑通“点击扩展 -> 请求标题 -> 页面读取 -> 返回结果”，再加入最小权限、存储与后台休眠。示例以 Chromium Manifest V3 公共 API 为基础，其他浏览器差异要按目标平台核对。

## 四个常见运行环境

```mermaid
flowchart LR
  P[Popup / Side panel] -->|消息| W[Extension Service Worker]
  W -->|消息| C[Content Script]
  C --> D[页面 DOM]
  C -. 隔离世界 .- J[页面 JavaScript]
```

Popup 是短生命周期扩展页面；Service Worker 处理事件与跨页面协调，空闲后会被终止；Content Script 可访问 DOM，但与页面 JavaScript 处于隔离世界；注入 page script 才进入页面主世界，风险和通信成本更高。

## 步骤一：从最小权限开始

只读取用户主动点击的当前页，可以考虑 `activeTab` 与 `scripting`，而不是申请所有网站的永久访问。需要长期匹配特定站点时，再使用精确 host permissions。权限文案会影响用户信任，也决定商店审核风险。

下面的 Content Script 只响应一个已知消息并返回页面标题。输入来自扩展消息，输出是短字符串；它不读取正文、不执行任意选择器，也不把页面内容上传。

```ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'page.read-title') return

  sendResponse({
    type: 'page.title-result',
    title: document.title.slice(0, 200)
  })
})
```

消息处理器使用白名单类型并限制输出大小。真实扩展还要验证 sender、目标 tab 和错误状态，避免任何扩展页面都能触发高权限动作。

## 步骤二：消息是安全契约

定义带版本的判别联合，校验输入和输出，不接受 `action + payload:any`。Content Script 传来的网页数据是不可信输入，即使消息来自自己的脚本，DOM 内容仍由网页控制。

Service Worker 只暴露明确能力，例如读取当前 Tab、写入受限存储或发起允许域名请求。远端响应、页面文本和文件都不能被当作代码执行。Manifest V3 限制远程托管代码，依赖应随扩展包发布并满足商店政策。

## 步骤三：接受 Service Worker 会休眠

后台不能依赖内存变量长期存在。需要恢复的状态写入 `chrome.storage` 或其他合适存储；Timer 与长连接不能被当作永久调度器。事件处理尽快完成，异步响应按 API 要求保持通道或返回 Promise。

状态分为：Popup 局部 UI、Tab 级临时状态、扩展持久设置和可重建缓存。敏感 Token 尽量避免存储；确需认证时缩小权限、生命周期和暴露面，不把凭证发送给 Content Script。

## 步骤四：处理页面导航与失败

Tab 会刷新、导航和销毁，Content Script 可能尚未注入。Popup 请求失败时展示可操作状态，例如“当前页面不支持”或重新注入，而不是无限重试。SPA 内部导航可能改变 DOM，需要按目标场景监听可靠事件，不用高频全页面扫描。

| 场景 | 预期 |
| --- | --- |
| 用户在允许页面点击扩展 | 返回受限标题 |
| 系统页或未授权页面 | 明确不支持，不扩大权限 |
| Content Script 未就绪 | 受控注入或提示重试 |
| 后台休眠后再唤醒 | 从持久状态恢复 |
| 页面返回恶意字符串 | 作为文本渲染，不使用 innerHTML |
| 扩展更新 | 消息与存储 Schema 有兼容迁移 |

测试覆盖权限安装提示、无权限页面、Worker 重启、多个 Tab、导航和扩展升级。使用打包后的扩展运行浏览器测试，确认 Manifest、CSP 和资源路径，而不是只测试普通网页组件。

## 参考资料

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
