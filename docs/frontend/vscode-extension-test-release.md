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

VS Code 扩展要先在 **Extension Development Host** 中调试和测试，再打包成 **VSIX**。VSIX 是用户或扩展市场可以安装的发布制品，里面包含扩展清单、编译产物和运行资源。它位于源码开发与正式发布之间，用来确保测试、候选安装和最终上线使用的是同一份内容。

扩展在本地能执行命令，不代表用户安装 VSIX 后也能工作。发布包可能漏掉 Webview 静态文件、写错贡献点、没有迁移旧状态，或者把 Source Map、测试数据和配置 Secret 一起带进去。

下面用一个包含命令和只读面板的扩展走完调试、测试、打包、安装和回滚。重点是验证同一制品的发布链路，不把一次本地点击当成发布证据。

## 准备 VS Code、Node 与打包工具

从 [VS Code 官方下载页](https://code.visualstudio.com/download)安装桌面版，再从 [Node.js 官方下载页](https://nodejs.org/en/download)安装维护中的 LTS 版本。安装完成后重新打开终端，确认编辑器命令、Node 和 npm 都能找到：

<figure class="doc-shot">
  <img src="/images/install/vscode-download.png" alt="Visual Studio Code 官方下载页" loading="lazy">
  <figcaption>Visual Studio Code 官方下载页。按操作系统选择安装包，完成后再配置 `code` 命令进入 PATH。</figcaption>
</figure>

<figure class="doc-shot">
  <img src="/images/install/node-download.png" alt="Node.js 官方下载页，展示维护中的 LTS 版本入口" loading="lazy">
  <figcaption>Node.js 官方下载页。打包工具和测试脚本共享 Node Runtime，先固定维护中的 LTS 版本。</figcaption>
</figure>

![VS Code 官方扩展发布文档，显示 vsce 安装和打包命令](/images/install/vsce-publishing.png)

截图用于定位官方发布文档中的 `vsce` 安装段落，Node、VS Code 和扩展 API 版本以页面当前内容为准。

```bash
code --version
node --version
npm --version
```

macOS 如果找不到 `code`，在 VS Code 命令面板执行 `Shell Command: Install 'code' command in PATH`，再打开新终端。Windows 安装器可以选择把 `code` 加入 PATH。

**VSCE** 是 VS Code 官方用于打包和发布扩展的命令行工具。本文使用 `npx` 临时执行，避免全局版本和项目声明分叉；长期维护的扩展应把 `@vscode/vsce` 固定在开发依赖中：

```bash
npm install --save-dev @vscode/vsce
npx vsce --version
```

版本命令成功，只表示打包器可运行。扩展仍需要自己的依赖安装、类型检查、测试和 Extension Development Host 验证。发布规则以 [VS Code 官方发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)为准。

## 从源码到 VSIX 的制品链

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

## 使用 Extension Development Host 调试

按 F5 启动 Extension Development Host 后，命令面板、菜单、激活事件和日志都发生在隔离窗口。使用 `Developer: Show Running Extensions` 查看扩展何时激活、激活耗时和是否报错；使用扩展宿主的调试控制台查看异常。

断点要放在命令回调、消息处理、文件读取和错误映射边界。Webview 有自己的浏览器开发者工具，宿主断点和 Webview 断点不是同一个调试上下文。

## 贡献点与命令测试

静态检查 package.json 的 `contributes.commands`、menus、keybindings、activationEvents 与代码注册名称是否一致。VS Code 只会根据清单暴露贡献点，代码注册一个没有贡献的命令，用户无法从命令面板发现。

命令测试至少覆盖：无工作区、只读工作区、取消执行、重复点击、扩展未激活和依赖失败。断言用户可见消息类别，不把完整堆栈显示给用户；堆栈进入受控日志。

## Webview 集成测试

Webview 的消息协议、CSP、资源 URI 和状态恢复需要真实 Extension Development Host 检查。自动化可以启动测试窗口，执行命令、等待面板、向 Webview 发送固定消息并断言响应；没有自动化条件时，至少保留逐步手工清单。

测试异常路径：未知消息 type、过大数组、工作区外路径、旧状态版本和面板销毁后晚到响应。通过标准是宿主拒绝、不泄露路径、状态迁移或清理、监听器不重复。

## VSIX 内容检查

使用官方推荐的打包工具生成：

~~~bash
npx @vscode/vsce package --out extension-candidate.vsix
unzip -l extension-candidate.vsix
~~~

命令中的文件名是本地候选制品。`unzip -l` 只列目录，不安装。检查 include/exclude 配置，确认 `dist`、Webview 资源、清单和许可证存在，确认 `node_modules`、测试快照、日志、`.env`、私钥、Source Map 和本机绝对路径按发布策略处理。

包大小突然变化时，比较文件列表和构建依赖，不要只再次打包。

## 版本与升级策略

VS Code 扩展版本遵循 SemVer 只是协作约定，真正的破坏变化仍要在 Release Notes 中说明。命令、配置键、状态结构和 Webview 消息协议都可能需要迁移。

升级测试：安装旧版本，写入配置和面板状态，升级到候选版本，确认旧配置被兼容读取或按明确版本迁移；卸载与重新安装时确认敏感数据、缓存和工作区文件不会被意外删除。

贡献点改名时保留兼容命令或提供迁移提示，不要让旧 key 静默失效。配置默认值变化要在清单与文档中同步。

## 候选安装与回滚

打包后的 VSIX 可以从命令行安装：

```bash
code --install-extension extension-candidate.vsix --force
```

也可以在 Extensions 视图右上角的更多操作菜单中选择 `Install from VSIX...`。两条路径安装的是同一个本地制品，候选验证不能改为从市场重新下载同版本扩展。

候选验证顺序：

1. 在干净 Extension Host 安装 VSIX。
2. 打开无工作区、单文件和多根工作区场景。
3. 执行命令、打开 Webview、重载窗口和关闭再打开面板。
4. 检查日志、性能、权限提示和网络错误。
5. 卸载候选，安装旧版本验证回滚。

发布后保留上一个已验证 VSIX 和版本说明。遇到高影响错误时，优先停止推广并让用户安装旧版本，或发布前向兼容修复；不要在已安装目录里手改编译文件。

## CI 发布门禁

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

## 迁移复核：VS Code 扩展调试、测试、打包与发布
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
