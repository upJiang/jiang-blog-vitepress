---
title: Vite、Webpack、Rollup、esbuild 与 Bun 如何选
description: 沿开发服务器、转换、打包、运行时和插件生态比较五种工具，建立应用、库和全栈项目的选型矩阵。
category: frontend
part: 构建工具
chapter: 48
tags:
  - Vite
  - Webpack
  - Rollup
  - esbuild
  - Bun
prerequisites:
  - 模块图与构建产物基础
outcomes:
  - 按工作阶段比较工具
  - 设计可回滚迁移
practice:
  type: decision
  result: 完成同一最小项目的工具链决策表
  verify:
    - 比较口径和环境固定
    - 不使用来源不明的性能数字
evidence: official
updated: 2026-08-11
---

# Vite、Webpack、Rollup、esbuild 与 Bun 如何选

“哪个工具最快”缺少开发、生产、库构建还是 Runtime 这一前提。Vite 是开发服务器与构建集成，Webpack 是完整应用 Bundler，Rollup 擅长模块打包和库产物，esbuild 提供高速解析/转换/打包能力，Bun 覆盖 Runtime 和多种工具角色。

## 按阶段比较

| 阶段 | Vite | Webpack | Rollup | esbuild | Bun |
| --- | --- | --- | --- | --- | --- |
| 开发 | 按需原生 ESM + HMR | 先建图/Bundle + HMR | 通常由上层工具集成 | 常作转换/预构建 | 可运行脚本或提供工具能力 |
| 生产 | 集成 Rollup 管线 | 自有 Module/Chunk/Runtime | 强项 | 高速但高级生态取舍 | 内置 Bundler |
| 库 | library mode | 可做但配置较重 | 成熟输出控制 | 适合简单高速构建 | 需按当前能力验证 |
| Runtime | 不提供 | 不提供 | 不提供 | Go 实现的构建工具 | 提供 JS Runtime |

表格描述系统位置，不代替版本验证。Vite 的具体生产引擎、Rollup 版本和未来演进以当前官方配置为准。

## 应用选择的约束

现代浏览器应用优先看框架插件、SSR、测试、代理和团队迁移成本。复杂遗留 Webpack 工程可能依赖自定义 Loader/Plugin、Module Federation 和特殊资产管线，迁移不能只把启动命令换成 Vite。

库构建关注 ESM/CJS、types、exports、external、preserveModules、CSS 和 tree-shaking，而不是开发 HMR。全栈项目还要区分浏览器产物与服务端 Runtime，Bun/Node 兼容单独验收。

## 插件模型与兼容

Vite/Rollup 插件共享部分钩子，但 Vite 增加 dev server、configureServer、transformIndexHtml 和 HMR 等语义。Webpack Plugin 基于 Tapable 生命周期，Loader 是模块转换。esbuild 插件 API 与并行架构不同，不能直接移植所有 Rollup 插件。

## 用实验做决定

选一条真实入口、动态路由、CSS、图片、Worker 和失败插件作为 fixture。固定机器分别记录冷启动、首次页面、HMR、生产构建和产物；更重要的是检查 Source Map、Chunk 稳定、缓存、错误信息和插件缺口。

迁移采用双构建对照，先确保行为和产物，再讨论速度。保留旧命令和制品回滚点，避免一次替换开发、测试、构建和部署全部层。

面试回答工具选型时应从项目类型、模块图规模、插件能力、产物契约和团队维护出发。没有上下文的“Vite 一定比 Webpack 快”不是工程结论。

## 用同一模块图比较，而不是比较命令时长

建立 fixture：一个入口、共享模块、动态 import、CSS/图片、Worker、Node 专用依赖、带副作用模块和 Source Map。对每个工具固定 Node/Bun 版本、CPU、依赖缓存、minify、sourcemap 与 target，记录解析、转换、打包、压缩各阶段时间，以及输出文件数、首屏请求、压缩体积和运行正确性。

| 观察点 | 要问的问题 | 常见误判 |
| --- | --- | --- |
| 开发反馈 | 首次请求、HMR 传播边界是什么 | 把热缓存启动当冷启动 |
| 模块图 | 是否正确处理 exports、动态导入和副作用 | 只看入口 JS 大小 |
| 产物 | ESM/CJS、types、Chunk、Source Map 是否满足契约 | 只看 gzip 体积 |
| 生态 | 插件能否替代现有 Loader/Plugin | 把共享钩子当完全兼容 |
| 运行时 | Node/Bun/浏览器目标是否一致 | 把 Bun bundler 当 Bun runtime |

迁移分层进行：先让新工具生成可消费的等价产物，再切换开发服务器，最后切换 CI 和发布。保留旧构建在同一提交可重跑，比较 snapshot、动态路由、错误堆栈和缓存头；任何差异都回到模块图或插件边界定位。

## 官方依据

- [Vite Guide](https://vite.dev/guide/)
- [Webpack Concepts](https://webpack.js.org/concepts/)
- [Rollup JavaScript API](https://rollupjs.org/javascript-api/)
- [esbuild API](https://esbuild.github.io/api/)
