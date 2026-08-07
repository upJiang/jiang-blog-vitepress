---
title: VS Code 扩展调试、测试、打包与发布
description: 从日志和自动化测试推进到 vsix 打包、版本、变更记录与发布前检查。
category: frontend
part: 现代前端：插件开发
chapter: 18
tags:
  - VS Code
  - Testing
  - Release
prerequisites:
  - 读过第 16、17 章
outcomes:
  - 编写扩展测试
  - 生成可验证制品
practice:
  type: implementation
  result: 完成一份扩展发布 Runbook
  verify:
    - 测试在扩展宿主执行
    - 包内不含密钥和无关文件
evidence: public-source
updated: 2026-08-06T00:00:00.000Z
---
# VS Code 扩展调试、测试、打包与发布

扩展在本地能执行命令，不代表用户安装 VSIX 后也能工作。发布包可能漏掉 Webview 静态文件、贡献点写错、版本升级没有迁移状态，或者把 Source Map、测试数据和配置 Secret 一起打进去。

本章用一个包含命令和只读面板的扩展走一遍调试、测试、打包、安装和回滚。重点是验证顺序，不把一次本地点击当成发布证据。

## 先看扩展制品链

~~~mermaid
flowchart LR
  A[源代码与 package.json] --> B[类型检查/单元测试]
  B --> C[Extension Development Host]
  C --> D[集成测试与 Webview 检查]
  D --> E[vsce package]
  E --> F[检查 VSIX 清单与内容]
  F --> G[候选安装验证]
  G --> H[发布/保留旧版本]
~~~

VSIX 是可安装制品。构建阶段要固定 Node、包管理器、依赖锁文件和扩展版本；发布阶段提升同一个制品，不在发布平台临时编译不同内容。

## 第一步：用 Extension Development Host 调试

按 F5 启动 Extension Development Host 后，命令面板、菜单、激活事件和日志都发生在隔离窗口。使用 `Developer: Show Running Extensions` 查看扩展何时激活、激活耗时和是否报错；使用扩展宿主的调试控制台查看异常。

断点要放在命令回调、消息处理、文件读取和错误映射边界。Webview 有自己的浏览器开发者工具，宿主断点和 Webview 断点不是同一个调试上下文。

## 第二步：测试贡献点和命令

静态检查 package.json 的 `contributes.commands`、menus、keybindings、activationEvents 与代码注册名称是否一致。VS Code 只会根据清单暴露贡献点，代码注册一个没有贡献的命令，用户无法从命令面板发现。

命令测试至少覆盖：无工作区、只读工作区、取消执行、重复点击、扩展未激活和依赖失败。断言用户可见消息类别，不把完整堆栈显示给用户；堆栈进入受控日志。

## 第三步：Webview 集成测试

Webview 的消息协议、CSP、资源 URI 和状态恢复需要真实 Extension Development Host 检查。自动化可以启动测试窗口，执行命令、等待面板、向 Webview 发送固定消息并断言响应；没有自动化条件时，至少保留逐步手工清单。

测试异常路径：未知消息 type、过大数组、工作区外路径、旧状态版本和面板销毁后晚到响应。通过标准是宿主拒绝、不泄露路径、状态迁移或清理、监听器不重复。

## 第四步：检查 VSIX 内容

使用官方推荐的打包工具生成：

~~~bash
npx @vscode/vsce package --out extension-candidate.vsix
unzip -l extension-candidate.vsix
~~~

命令中的文件名是本地候选制品。`unzip -l` 只列目录，不安装。检查 include/exclude 配置，确认 `dist`、Webview 资源、清单和许可证存在，确认 `node_modules`、测试快照、日志、`.env`、私钥、Source Map 和本机绝对路径按发布策略处理。

包大小突然变化时，比较文件列表和构建依赖，不要只再次打包。

## 第五步：版本与升级策略

VS Code 扩展版本遵循 SemVer 只是协作约定，真正的破坏变化仍要在 Release Notes 中说明。命令、配置键、状态结构和 Webview 消息协议都可能需要迁移。

升级测试：安装旧版本，写入配置和面板状态，升级到候选版本，确认旧配置被兼容读取或按明确版本迁移；卸载与重新安装时确认敏感数据、缓存和工作区文件不会被意外删除。

贡献点改名时保留兼容命令或提供迁移提示，不要让旧 key 静默失效。配置默认值变化要在清单与文档中同步。

## 第六步：候选安装与回滚

候选验证顺序：

1. 在干净 Extension Host 安装 VSIX。
2. 打开无工作区、单文件和多根工作区场景。
3. 执行命令、打开 Webview、重载窗口和关闭再打开面板。
4. 检查日志、性能、权限提示和网络错误。
5. 卸载候选，安装旧版本验证回滚。

发布后保留上一个已验证 VSIX 和版本说明。遇到高影响错误时，优先停止推广并让用户安装旧版本，或发布前向兼容修复；不要在已安装目录里手改编译文件。

## 第七步：把门禁放进 CI

```text
锁定依赖 -> 类型检查 -> 单元测试 -> lint
-> 构建 Webview/扩展 -> VSIX 文件审计
-> 候选 Extension Host -> 版本与迁移检查
-> 发布并保留旧制品
```

每一步失败都输出可定位信息。CI 不需要把真实 VS Code 窗口跑在每次提交上，但代表性变更应有扩展宿主集成测试。发布 Secret 通过 CI Secret 注入，不写入清单、日志和制品。

## 常见误区

- 只测开发模式，不测打包后的资源路径。
- 只测命令成功，不测没有工作区、权限拒绝和取消。
- 把版本号当作“发布成功”证据，没有安装候选。
- 打包前没有检查 VSIX 文件，测试和环境文件被一起上传。
- 发布后删除旧制品，发生问题无法快速回退。

## 迁移练习

为自己的扩展写一份发布 Runbook：构建命令、版本来源、VSIX 审计项、Extension Host 验收、升级迁移、回滚制品和停止条件。故意从包中排除一个 Webview 资源，观察候选窗口如何失败，再修复并增加门禁。
