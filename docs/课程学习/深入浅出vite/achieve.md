Vite 底层所深度使用的两个构建引擎—— `Esbuild` 和 `Rollup`。

## Vite 架构图

很多人对 Vite 的双引擎架构仅仅停留在`开发阶段使用 Esbuild，生产环境用 Rollup`的
阶段，殊不知，Vite 真正的架构远没有这么简单。一图胜千言，这里放一张 Vite 架构图
：<br>
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02910cd2c6894bcdb3a9e0fc9e59f4c2~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02910cd2c6894bcdb3a9e0fc9e59f4c2~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

## 性能利器——Esbuild

> 必须要承认的是，Esbuild 的确是 Vite 高性能的得力助手，在很多关键的构建阶段让
> Vite 获得了相当优异的性能，如果这些阶段用传统的打包器/编译器来完成的话，开发体
> 验要下降一大截。

### 一、依赖预构建——作为 Bundle 工具

首先是开发阶段的依赖预构建阶段。<br>
<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f53b2429304e4808be5faea190bf05a7~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f53b2429304e4808be5faea190bf05a7~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

一般来说，node_modules 依赖的大小动辄几百 MB 甚至上 GB ，会远超项目源代码，相信
大家都深有体会。如果这些依赖直接在 Vite 中使用，会出现一系列的问题。

Vite 1.x 版本中使用 Rollup 来做这件事情，但 Esbuild 的性能实在是太恐怖了，Vite
2.x 果断采用 Esbuild 来完成第三方依赖的预构建，至于性能到底有多强，大家可以参照
它与传统打包工具的性能对比图:<br>
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df7f314cd598418f924c689020fbee88~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df7f314cd598418f924c689020fbee88~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

Esbuild 作为打包工具也有一些缺点:

- 不支持降级到 `ES5` 的代码。这意味着在低端浏览器代码会跑不起来。
- 不支持 `const enum` 等语法。这意味着单独使用这些语法在 esbuild 中会直接抛错。
- `不提供操作打包产物的接口`，像 Rollup 中灵活处理打包产物的能力(如 renderChunk
  钩子)在 Esbuild 当中完全没有。
- `不支持自定义 Code Splitting 策略`。传统的 Webpack 和 Rollup 都提供了自定
  义`拆包策略`的 API，而 Esbuild 并未提供，从而降级了拆包优化的灵活性。

### 二、单文件编译——作为 TS 和 JSX 编译工具

在依赖预构建阶段， Esbuild 作为 Bundler 的角色存在。而在 TS(X)/JS(X) 单文件编译
上面，Vite 也使用 Esbuild 进行语法转译，也就是将 Esbuild 作为 Transformer 来用。
大家可以在架构图中 `Vite Plugin Pipeline` 部分注意到: <br>
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7b1ab2ef7b0443cb99b1aa48e908ffce~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7b1ab2ef7b0443cb99b1aa48e908ffce~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

也就是说，Esbuild 转译 TS 或者 JSX 的能力通过 Vite 插件提供，这个 Vite 插件在开
发环境和生产环境都会执行，因此，我们可以得出下面这个结论:

> Vite 已经将 Esbuild 的 Transformer 能力用到了生产环境。

### 三、代码压缩——作为压缩工具

> Vite 从 2.6 版本开始，就官宣默认使用 Esbuild 来进行生产环境的代码压缩，包括 JS
> 代码和 CSS 代码。

传统的方式都是使用 Terser 这种 JS 开发的压缩器来实现，在 Webpack 或者 Rollup 中
作为一个 Plugin 来完成代码打包后的压缩混淆的工作。但 Terser 其实很慢，主要有 2
个原因。

- 压缩这项工作涉及大量 AST 操作，并且在传统的构建流程中，AST 在各个工具之间无法
  共享，比如 Terser 就无法与 Babel 共享同一个 AST，造成了很多重复解析的过程。
- JS 本身属于解释性 + JIT（即时编译） 的语言，对于压缩这种 CPU 密集型的工作，其
  性能远远比不上 Golang 这种原生语言。

因此，Esbuild 这种`从头到尾共享 AST 以及原生语言编写`的 Minifier 在性能上能够甩
开传统工具的好几十倍。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/48a7b8bac5f54d84b33ab060c7df2299~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/48a7b8bac5f54d84b33ab060c7df2299~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

压缩一个大小为 3.2 MB 的库，Terser 需要耗费 8798 ms，而 Esbuild 仅仅需要 361
ms，`压缩效率较 Terser 提升了二三十倍，并且产物的体积几乎没有劣化`，因此 Vite 果
断将其内置为默认的压缩方案。

## 构建基石——Rollup

> Rollup 在 Vite 中的重要性一点也不亚于
> Esbuild，`它既是 Vite 用作生产环境打包的核心工具，也直接决定了 Vite 插件机制的设计`。
> 那么，Vite 到底基于 Rollup 做了哪些事情？

### 生产环境 Bundle

虽然 ESM 已经得到众多浏览器的原生支持，但生产环境做到完全 no-bundle 也不行，会有
网络性能问题。为了在生产环境中也能取得优秀的产物性能，Vite 默认选择在生产环境中
利用 `Rollup` 打包，并基于 Rollup 本身成熟的打包能力进行扩展和优化，主要包含 3
个方面:

- `CSS 代码分割`。如果某个异步模块中引入了一些 CSS 代码，Vite 就会自动将这些 CSS
  抽取出来生成单独的文件，`提高线上产物的缓存复用率`。
- 自动预加载。Vite 会自动为入口 `chunk` 的依赖自动生成预加载标签
  `<link rel="moduelpreload">` ，如:
  ```
      <head>
      <!-- 省略其它内容 -->
      <!-- 入口 chunk -->
      <script type="module" crossorigin src="/assets/index.250e0340.js"></script>
      <!--  自动预加载入口 chunk 所依赖的 chunk-->
      <link rel="modulepreload" href="/assets/vendor.293dca09.js">
      </head>
  ```
- 异步 Chunk 加载优化。在异步引入的 Chunk 中，通常会有一些公用的模块，如现有两个
  异步引入的 Chunk: A 和 B，而且两者有一个公共依赖 C，如下图:<br>
  <a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5adc9b7c9426424f99be3a7044e3469f~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5adc9b7c9426424f99be3a7044e3469f~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>
  一般情况下，Rollup 打包之后，会先请求 A，然后浏览器在加载 A 的过程中才决定请求
  和加载 C，但 Vite 进行优化之后，请求 A 的同时会自动预加载 C，通过优化 Rollup
  产物依赖加载方式节省了不必要的网络开销。

### 兼容插件机制

无论是开发阶段还是生产环境，Vite 都根植于 Rollup 的插件机制和生态，如下面的架构
图所示:<br>
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/db5342d894e649ca8a953e3880fc96fb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/db5342d894e649ca8a953e3880fc96fb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

在开发阶段，Vite 借鉴了 [WMR](https://github.com/preactjs/wmr) 的思路，自己实现
了一个 `Plugin Container`，用来模拟 Rollup 调度各个 Vite 插件的执行逻辑，而 Vite
的插件写法完全兼容 Rollup，因此在生产环境中将所有的 Vite 插件传入 Rollup 也没有
问题，反过来说，Rollup 插件却不一定能完全兼容 Vite。
