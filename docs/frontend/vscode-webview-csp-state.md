---
title: "VS Code Webview 通信、状态、资源与 CSP"
description: "建立扩展进程与 Webview 的双向消息，并正确处理资源 URI、状态恢复和 CSP。"
category: frontend
part: "现代前端：插件开发"
chapter: 17
tags: ["VS Code", "Webview", "CSP"]
prerequisites: ["读过第 16 章"]
outcomes: ["实现双向消息", "限制 Webview 脚本来源"]
practice:
  type: implementation
  result: "完成一个可恢复状态的 Webview"
  verify: ["消息有类型校验", "CSP 不使用宽松通配符"]
evidence: public-source
updated: 2026-08-06
---
# VS Code Webview 通信、状态、资源与 CSP

VS Code 扩展的 Webview 看起来像一个网页，但它不是普通浏览器页面：UI 在隔离的 Webview 环境，文件访问需要由扩展宿主提供，消息通过异步桥传递，面板销毁后状态可能恢复。把网页代码直接复制进来，常见结果是资源加载失败、消息没有校验或 CSP 允许了任意脚本。

本文做一个只读面板：扩展宿主读取工作区摘要，Webview 请求并展示；用户切换面板后，筛选条件仍能恢复。重点是通信协议、资源 URI、状态和安全边界。

## 两个运行环境

~~~mermaid
sequenceDiagram
  participant E as Extension Host
  participant W as Webview
  E->>W: createWebviewPanel + HTML
  W->>E: postMessage(request)
  E->>E: 校验命令与读取允许数据
  E-->>W: postMessage(response)
  W->>W: 更新 DOM 与保存状态
~~~

扩展宿主拥有 VS Code API、文件系统和工作区上下文；Webview 只拥有浏览器 DOM 和消息桥。Webview 传来的字符串不是可信命令，宿主必须使用命令白名单、参数 Schema 和工作区范围校验。

## 第一步：设计带版本的消息

消息至少包含 type、version、requestId 和数据。请求与响应使用有限枚举，未知类型返回错误或忽略；不要让 Webview 传任意命令名再由宿主动态执行。

类型只约束编译时，运行时仍需检查字段类型、版本、ID 长度和数组大小。输入要拒绝超大对象和不可预期字段；数据读取发生在宿主而不是 Webview。响应带回 requestId，UI 可以忽略过期响应。

## 第二步：使用消息 API，而不是共享全局变量

Webview 通过 VS Code 注入的 API 发送消息，宿主通过 onDidReceiveMessage 接收。宿主按顺序解析并校验、确认当前面板与工作区、执行只读服务、返回最小数据。不要把文件绝对路径或所有工作区内容发给 Webview。

扩展重载和面板销毁会打断消息。请求要有取消或版本号，避免旧响应覆盖新筛选条件。长任务在宿主侧使用可取消 Promise，并在面板关闭时释放订阅。

## 第三步：恢复 Webview 状态

UI 临时状态包括输入框、滚动和选中项，可使用 Webview State API；业务状态包括用户配置和工作区设置，应放在 ExtensionContext 的 globalState、workspaceState 或明确配置文件中。

状态恢复要考虑版本迁移。旧状态缺字段时使用默认值；版本不兼容时迁移或丢弃，不能把未知 JSON 直接当新结构。Panel dispose 时移除事件监听和定时器，避免一次点击执行两次。

## 第四步：资源 URI 和安全目录

Webview 不能直接用 file URL 加载任意磁盘文件。扩展宿主使用 webview.asWebviewUri 生成资源 URI，并通过 localResourceRoots 限制资源根目录。只把编译后的静态资源目录放进去，不要把工作区根、用户目录或 Secret 目录交给 Webview。

用户文档内容若要展示，应作为文本数据返回并转义，或通过受控资源协议。资源路径和消息权限是两个独立边界。

## 第五步：写严格 CSP

CSP 应以 default-src none 开始，只允许当前 Webview 资源源、必要的图片 data 和带随机 nonce 的脚本；不要开启 unsafe-eval，也不要把所有 https 全开。nonce 和 cspSource 在扩展宿主每次生成 HTML 时注入，不能硬编码在仓库里。

CSP 限制资源加载，不会自动校验消息来源、工作区权限和文件内容。四者要分别审查。生产检查应搜索宽松通配符、内联脚本和未受限的资源根。

## 故意制造两个错误

1. 让 Webview 发送未知 type，宿主返回结构化错误，不执行命令。
2. 把资源 URI 指向工作区外路径，加载被阻止；日志只记录类别，不泄露绝对路径。

关闭面板后重新打开，确认旧监听没有重复触发，筛选状态按版本恢复。

## 迁移练习

实现一个只读工作区文件统计面板：宿主只允许读取当前工作区下的文本文件，Webview 通过带版本的消息请求，结果按 requestId 返回。加入大小上限、取消、状态恢复和严格 CSP，并用 Extension Development Host 手工验证。

## 参考资料

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Webview security](https://code.visualstudio.com/api/extension-guides/webview#security)
- [Content Security Policy on MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [VS Code extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
