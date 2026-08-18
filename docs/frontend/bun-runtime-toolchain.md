---
title: Bun Runtime、包管理器、测试器与构建工具
description: 从执行 TypeScript 到安装依赖、运行测试和打包，区分 Bun 的 Runtime 能力、兼容层和团队迁移边界。
category: frontend
part: 构建工具
chapter: 47
tags:
  - Bun
  - Runtime
  - Toolchain
prerequisites:
  - JavaScript Runtime 与包管理基础
outcomes:
  - 解释 Bun 各子工具职责
  - 评估 Node 兼容风险
practice:
  type: decision
  result: 用兼容矩阵验证一个前端仓库
  verify:
    - 锁文件、脚本和原生依赖逐项检查
    - 性能结论只来自同机实验
evidence: official-guided-operation
updated: 2026-08-11
---

# Bun Runtime、包管理器、测试器与构建工具

Bun 是一套 JavaScript/TypeScript 工具链，分别提供 Runtime、包管理器、脚本运行器、测试器和 Bundler。这些角色连接项目源码与操作系统、依赖仓库和发布产物，可替换或补充 Node、npm、测试框架与构建工具。评估时必须逐项确认兼容边界。

`bun run dev` 能启动 Vite，不代表项目已经把生产 Runtime 从 Node 迁到 Bun。Bun 同时提供 JavaScript Runtime、包管理器、脚本运行器、测试器和 Bundler，评估时必须逐层说明替换了哪一部分。

## 安装 Bun 并确认命令可用

安装入口是 [Bun 官方安装页](https://bun.com/docs/installation)。macOS 与 Linux 可以使用官方脚本，Windows 需要在 PowerShell 中执行对应安装命令：

![Bun 官方安装页面，展示 macOS/Linux、Windows、包管理器和 Docker 安装方式](/images/install/bun-installation.png)

截图用于帮助读者定位官方页面中的安装标签，命令以页面当前版本为准。

::: code-group

```bash [macOS / Linux]
curl -fsSL https://bun.com/install | bash
```

```powershell [Windows PowerShell]
powershell -c "irm bun.sh/install.ps1|iex"
```

:::

安装脚本会把可执行文件放到用户目录。关闭并重新打开终端后，检查版本和对应的源码修订：

```bash
bun --version
bun --revision
```

第一条应输出语义化版本号，第二条会带出当前构建的修订标识。出现 `command not found` 时，先检查 `~/.bun/bin` 是否进入 `PATH`，不要在不同包管理器之间反复安装。Linux 还需要 `unzip`；Windows 要求 Windows 10 1809 或更高版本，具体要求以官方安装页为准。

接着跑一个不依赖框架的 TypeScript 文件，确认生效的是 Runtime，而不只是安装器：

```ts
// hello.ts
const runtime = `Bun ${Bun.version}`
console.log(runtime)
```

```bash
bun run hello.ts
```

输出包含 `Bun` 和当前版本后，才进入项目依赖安装。这个结果只能证明 Runtime 能执行当前文件，不能证明现有仓库的 Node API、原生扩展或构建插件兼容。

## 五个角色

Runtime 执行 JavaScript/TypeScript 并提供 Web/Node 兼容 API；`bun install` 解析依赖并写锁文件；脚本运行器执行 package scripts；test 提供测试 API；build 把模块转换和打包。项目完全可以只采用其中一层，例如使用 Bun 安装依赖但仍由 Vite 构建浏览器应用。

Bun 使用 JavaScriptCore，Node 主要使用 V8。语言标准大体一致，性能、GC、调试和原生扩展边界不同。框架“支持 Bun”也可能只代表开发命令可运行，不代表所有插件、测试环境和部署平台已验证。

## 兼容性从实际调用链验证

先列 package scripts、postinstall、Node 内建模块、CJS/ESM 混用、native addon、测试环境和部署镜像。再在干净环境用锁文件安装，运行 typecheck/test/build/preview，而不是只看 hello world。

```text
层级             验证证据
依赖安装         冷安装、锁文件不变、peer 警告
开发服务器       HMR、代理、HTTPS、框架插件
测试             fake timers、DOM 环境、mock、coverage
生产构建         Chunk、Source Map、CSS 与资源
服务端 Runtime   Node API、信号、原生模块、观测
```

原生依赖或安装脚本失败时，判断能否升级、替代或保留 Node 步骤。不要通过忽略脚本让安装“成功”，那可能跳过必要二进制构建。

## 性能与缓存口径

比较安装和构建时固定机器、网络、缓存状态、依赖图和命令。冷缓存与热缓存分开，记录中位数而非单次最快。Vite 开发速度和 Bun Runtime 启动速度属于不同阶段，不能混成一个排名。

## 迁移与回滚

先在 CI 建立并行实验，不立刻替换团队唯一锁文件。决定锁文件所有者、缓存 key、编辑器/调试支持和生产基线。若只采用脚本运行器，在文档中明确仍由 Vite/Rollup 构建、Node 部署。

Vite 面向前端开发和构建，Bun 覆盖更广的 Runtime 工具链。两者能力有交集，系统位置和替换范围却不同。

## Bun 命令背后的边界

`bun run` 负责脚本解析和进程启动，`bun install` 读取 package manifest 与 lockfile，`bun test` 提供测试运行时，`bun build` 负责解析、转换和打包。它们共享 Runtime 和模块解析实现，但不意味着 Node API、测试环境、Bundler 插件和生产部署完全等价。

迁移一个仓库时按链路验证：先用 frozen lockfile 看依赖图能否复现；再执行 lint/typecheck/test，观察 Node 内建模块、条件 exports、native addon、JSDOM/浏览器 API 和 ESM/CJS 混用；最后分别跑 Vite/Rollup 的正式构建。任何单项失败都应记录最小复现和回退方案，不能只看安装速度。

```text
package.json scripts -> Bun runner -> module resolver
  -> package exports conditions -> JS/TS transform
  -> test/build 产物 -> 目标 Runtime 执行
```

Bun 的兼容层会随版本变化，尤其是 Node API、Web API、测试 mock 和 package manager 行为。生产选型要写最低 Bun 版本、锁文件格式、容器基础镜像、调试器和错误监控支持；性能结论只能来自固定机器、相同依赖缓存和相同输出验收。

## 官方依据

- [Bun 安装](https://bun.com/docs/installation)
- [Bun Runtime](https://bun.sh/docs/runtime)
- [Bun Package Manager](https://bun.sh/docs/pm)
- [Bun Bundler](https://bun.sh/docs/bundler)
- [Bun Test](https://bun.sh/docs/test)
