---
title: Webpack 模块图、Loader、Plugin 与 Runtime
description: 从入口解析进入 Resolver、Loader Pipeline、Compilation、Chunk、Runtime 和 HMR，解释 Tapable 插件如何介入构建生命周期。
category: frontend
part: 构建工具
chapter: 46
tags:
  - Webpack
  - Module Graph
prerequisites:
  - ES Module 与 Node 包基础
outcomes:
  - 追踪模块到产物的路径
  - 区分 Loader 和 Plugin
practice:
  type: implementation
  result: 编写一个 Loader 和构建统计插件
  verify:
    - 模块依赖与 Chunk 可从 stats 核对
    - 缓存失效条件有测试
evidence: public-source
updated: 2026-08-11
---

# Webpack 模块图、Loader、Plugin 与 Runtime

Webpack 从入口解析模块依赖、生成 Chunk，并输出目标环境可执行的资源。Loader 在模块入图前转换特定文件，Plugin 通过生命周期钩子扩展构建流程，Runtime 则在浏览器侧加载和执行异步 Chunk。它们连接源码与发布产物，让样式、图片和代码能够进入同一张构建图。

入口只有一个 `main.ts`，产物却包含多个 Chunk、一个 Runtime 和动态导入文件。Webpack 的核心工作不是拼接源码，而是解析入口、构建模块依赖图、把模块分配到 Chunk，再生成能在目标环境加载和执行的 Runtime。

## 从 request 到 Module

Resolver 根据当前目录、扩展名、alias、package exports/mainFields 等把 import specifier 变成文件。模块经过匹配 rule 的 Loader，从右到左执行 normal 阶段，把非 JavaScript 或新语法转换成 Webpack 能继续分析的模块源码。

Loader 应是尽量纯的局部转换：输入内容、Source Map 和 meta，输出新内容。它通过 this.addDependency 声明额外文件依赖，使 watch/cache 知道何时失效。把网络发布或全局文件遍历放 Loader 会破坏可重复性。

```js
export default function bannerLoader(source) {
  const options = this.getOptions()
  const banner = JSON.stringify(options.banner ?? '')
  return `/* ${banner.slice(1, -1)} */\n${source}`
}
```

Webpack 调用 Loader 时传入当前模块源码，函数读取受控 option，生成注释并返回新的可解析源码；其他模块再沿各自 Loader 链执行。输入包含换行或注释终止符时仍需更严格转义，修改附加文件时也要调用 addDependency，才能让 watch 与缓存正确失效。

输入是单个模块文本，输出仍是可解析源码。实际 Loader 还应处理 Source Map、异步回调和缓存；配置值进入注释前要避免破坏语法。
## Module Graph 到 Chunk Graph

Parser 从转换结果找静态 import、require 和动态 import，创建依赖并递归构建 Module Graph。静态依赖通常进入同一初始 Chunk；动态导入建立异步边界；SplitChunks 等优化根据复用、体积和请求条件重新分配模块。

Module 是源码与转换结果的单位，Chunk 是一组为加载组织的模块，最终 Asset 是写到磁盘的文件。三者不应混用。一个 Chunk 可能生成多个 Asset，Runtime Chunk 负责模块注册、缓存和异步加载。
## Plugin 与 Compilation 生命周期

Plugin 通过 Compiler/Compilation 暴露的 Tapable hooks 观察或改变整个构建。Compiler 代表一次配置和长期 watch，Compilation 代表一次具体构建及其模块、Chunk、Asset 和诊断。

```js
class BuildSummaryPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('BuildSummaryPlugin', stats => {
      const info = stats.toJson({ all: false, assets: true, errors: true })
      console.log({ assets: info.assets?.length, errors: info.errors?.length })
    })
  }
}
```

Compiler 创建后注册 done hook，每次 Compilation 完成会调用插件，插件从 stats 读取资产和错误数量并输出摘要。它不修改已经生成的文件；若要创建或更新 Asset，应在 processAssets 等对应阶段执行，并按 hook 类型选择同步或异步注册，失败要交还构建诊断。

Plugin 不应在 done 中修改已经完成的资产；生成资产应选择 Compilation 的 processAssets 等正确阶段。hook 是 sync 还是 async 决定 tap/tapPromise/tapAsync，选错会让构建提前结束或挂起。
## Tree Shaking、sideEffects 与 Runtime

Tree Shaking 依赖可静态分析的 ES Module 和副作用信息。`usedExports` 标记使用关系，压缩器删除不可达代码；package.json `sideEffects` 告诉工具哪些模块即使导出未用也必须执行。错误标记 CSS 或注册模块为无副作用会导致生产缺功能。

Webpack Runtime 维护模块缓存和 Chunk 加载。HMR 接收更新 manifest/chunk，尝试沿 accept 边界应用；没有可接受边界时回退全页刷新。状态是否保留由模块和框架 HMR 协议决定，不是替换文件就自动安全。
## 验证构建图

生成 stats JSON，用 analyzer 或脚本检查模块所属 Chunk、重复依赖、orphan modules 和资产体积。修改 Loader 依赖文件验证 watch 重建；动态 import 验证网络按需加载；错误 sideEffects 建立生产反例。

Loader 与 Plugin 的区别来自作用域、输入输出和生命周期：Loader 转换单个模块，Plugin 介入整个 Compiler 或 Compilation。Resolver、Module Graph、Chunk Graph 和 Runtime 则组成完整构建链。
## 一次 import 到浏览器运行时

Webpack 从 context 和 entry 开始，经 Resolver 把请求解析为绝对文件；Loader Runner 按 `enforce`、`pitch` 和 normal 阶段组成转换链，最终交给 Parser 产生依赖。Compilation 将模块节点和依赖边加入 ModuleGraph，再根据入口和动态 import 形成 ChunkGraph，TemplatePlugin 把 Chunk 写成带 runtime 的资产。

```text
entry ./src/main.ts
  -> resolve alias/extensions/exports
  -> ts-loader/babel-loader（源码 -> JS）
  -> parser 发现 import('./settings')
  -> module graph + async chunk
  -> splitChunks/runtime manifest
  -> dist/assets/*.js
```

Loader 的输入是单模块源码和 loader context，输出通常是下一个 loader 可解析的源码与 Source Map；Plugin 通过 Tapable 订阅 compiler/compilation hooks，可以读取全局图、添加资产或改变输出。Loader 中写全局状态会破坏并行和缓存，Plugin 中同步阻塞大文件扫描会拖慢整个编译。
## 缓存失效和产物证据

filesystem cache 的 key 包含 loader、选项、依赖文件和构建环境；只改 loader 实现却不更新版本/依赖声明，可能继续读取旧结果。验证缓存要做冷构建、热构建、修改源依赖、修改配置和切换 mode 五组对照，并检查 stats 中模块来源和 cache hit。

HMR 的 accept 边界不是生产 chunk 边界。React/Vue 插件还要把组件状态保留规则叠加到模块替换上；全局注册、CSS 副作用和 singleton 模块修改可能要求整页刷新。
## 官方依据

- [Webpack Concepts](https://webpack.js.org/concepts/)
- [Loader API](https://webpack.js.org/api/loaders/)
- [Plugin API](https://webpack.js.org/api/plugins/)
