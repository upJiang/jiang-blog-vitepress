> 在生产环境下，为了提高页面加载性能，构建工具一般将项目的代码打包(bundle)到一起
> ，这样上线之后只需要请求少量的 JS 文件，大大减少 HTTP 请求。当然，Vite 也不例
> 外，默认情况下 Vite 利用底层打包引擎 Rollup 来完成项目的模块打包。

bundle、chunk、vendor 这些构建领域的专业概念

- bundle 指的是整体的打包产物，包含 JS 和各种静态资源。
- chunk 指的是打包后的 JS 文件，是 bundle 的子集。
- vendor 是指第三方包的打包产物，是一种特殊的 chunk。

## Code Splitting 解决的问题

在传统的单 chunk 打包模式下，当项目代码越来越庞大，最后会导致浏览器下载一个巨大
的文件，从页面加载性能的角度来说，主要会导致两个问题:

- `无法做到按需加载`，即使是当前页面不需要的代码也会进行加载。
- `线上缓存复用率极低`，改动一行代码即可导致整个 bundle 产物缓存失效。

一个前端页面中的 JS 代码可以分为两个部分: Initital Chunk (页面首屏所需要的 JS 代
码)和 Async Chunk (当前页面并不一定需要的 JS 代码)。

比如路由组件的加载，与当前路由无关的组件并不用加载。而项目被打包成单 bundle 之后
，无论是`Initial Chunk`还是`Async Chunk`，都会打包进同一个产物，也就是说，浏览器
加载产物代码的时候，会将两者一起加载，导致许多冗余的加载过程，从而影响页面性能。
而通过 `Code Splitting` 我们可以将按需加载的代码`拆分出单独的 chunk`，这样应用在
首屏加载时`只需要加载Initial Chunk` 即可，避免了冗余的加载过程，使页面性能得到提
升。

线上的`缓存命中率`是一个重要的性能衡量标准。对于线上站点而言，服务端一般在响应资
源时加上一些 HTTP 响应头，最常见的响应头之一就是 cache-control，它可以指定浏览器
的强缓存，比如设置为下面这样:

```
cache-control: max-age=31536000
```

表示资源过期时间为一年，在过期之前，访问相同的资源 url，浏览器直接利用本地的缓存
，并不用给服务端发请求，这就大大降低了页面加载的网络开销。不过，
在`单 chunk 打包模式`下面，一旦有一行代码变动
，`整个 chunk 的 url 地址都会变化`。进行`Code Splitting`之后，代码的改动只会影响
部分的 chunk 哈希改动:<br>
<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5bdd076bb07b471a96feb0e05b0bdec5~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5bdd076bb07b471a96feb0e05b0bdec5~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

## Vite 默认拆包策略

在生产环境下 `Vite` 完全利用 `Rollup` 进行构建，因此拆包也是基于 Rollup 来完成的
，但 Rollup 本身是一个专注 JS 库打包的工具，对应用构建的能力还尚为欠缺，Vite 正
好是补足了 Rollup 应用构建的能力，在拆包能力这一块的扩展就是很好的体现。

[示例代码地址](https://github.com/upJiang/vite-code-splitting)

Vite 默认拆包的优势在于实现了
`CSS 代码分割与业务代码、第三方库代码、动态 import 模块代码三者的分离`，但缺点也
比较直观，`第三方库的打包产物容易变得比较臃肿`，这个时候我们就需要用到 Rollup 中
的拆包 API ——manualChunks 了。

## 自定义拆包策略

针对更细粒度的拆包，Vite 的底层打包引擎 Rollup 提供了 manualChunks，让我们能自定
义拆包策略，它属于 Vite 配置的一部分，示例如下:

```
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        // manualChunks 配置
        manualChunks: {},
      },
    }
  },
}
```

manualChunks 主要有两种配置的形式，可以配置为`一个对象或者一个函数`。我们先来看
看对象的配置，也是最简单的配置方式，你可以在上述的示例项目中添加如下的
manualChunks 配置代码: **对象方式**

```
// vite.config.ts
{
  build: {
    rollupOptions: {
      output: {
        // manualChunks 配置
        manualChunks: {
          // 将 React 相关库打包成单独的 chunk 中
          'react-vendor': ['react', 'react-dom'],
          // 将 Lodash 库的代码单独打包
          'lodash': ['lodash-es'],
          // 将组件库的代码打包
          'library': ['antd', '@arco-design/web-react'],
        },
      },
    }
  },
}
```

在对象格式的配置中，key 代表 chunk 的名称，value 为一个字符串数组，每一项为第三
方包的包名。在进行了如上的配置之后，我们可以执行 npm run build 尝试一下打包:

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6edc54e00ba4475dac67dd77f00966b4~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6edc54e00ba4475dac67dd77f00966b4~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

你可以看到原来的 vendor 大文件被拆分成了我们手动指定的几个小 chunk，每个 chunk
大概 200 KB 左右，是一个比较理想的 chunk 体积。这样，当第三方包更新的时候，也只
会更新其中一个 chunk 的 url，而不会全量更新，从而提高了第三方包产物的缓存命中率
。

除了对象的配置方式之外，我们还可以通过函数进行更加灵活的配置，而 Vite 中的默认拆
包策略也是通过函数的方式来进行配置的，我们可以在 Vite 的实现中瞧一瞧:

```
// Vite 部分源码
function createMoveToVendorChunkFn(config: ResolvedConfig): GetManualChunk {
  const cache = new Map<string, boolean>()
  // 返回值为 manualChunks 的配置
  return (id, { getModuleInfo }) => {
    // Vite 默认的配置逻辑其实很简单
    // 主要是为了把 Initial Chunk 中的第三方包代码单独打包成`vendor.[hash].js`
    if (
      id.includes('node_modules') &&
      !isCSSRequest(id) &&
      // 判断是否为 Initial Chunk
      staticImportedByEntry(id, getModuleInfo, cache)
    ) {
      return 'vendor'
    }
  }
}
```

Rollup 会对每一个模块调用 manualChunks 函数，在 manualChunks 的函数入参中你可以
拿到`模块 id` 及`模块详情信息`，经过一定的处理后返回 chunk 文件的名称，这样当前
id 代表的模块便会打包到你所指定的 `chunk` 文件中。 **函数方式**

```
manualChunks(id) {
  if (id.includes('antd') || id.includes('@arco-design/web-react')) {
    return 'library';
  }
  if (id.includes('lodash')) {
    return 'lodash';
  }
  if (id.includes('react')) {
    return 'react';
  }
}
```

打包后结果如下:

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3495634bb0284597bfcdc071fbf27d45~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3495634bb0284597bfcdc071fbf27d45~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

看上去好像各个第三方包的 chunk (如`lodash`、`react`等等)都能拆分出来，但实际上你
可以运行 `npx vite preview` 预览产物，会发现产物根本`没有办法运行起来`，页面出现
白屏，同时控制台出现如下的报错:

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f4250e42ed9445b985cb8c539f69694e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f4250e42ed9445b985cb8c539f69694e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

这也就是函数配置的坑点所在了，虽然灵活而方便，但稍不注意就陷入此类的产物错误问题
当中。那上面的这个报错究竟是什么原因导致的呢？

## 解决循环引用问题

从报错信息追溯到产物中，可以发现 `react-vendor.js` 与 `index.js` 发生了循环引用:

```
// react-vendor.e2c4883f.js
import { q as objectAssign } from "./index.37a7b2eb.js";

// index.37a7b2eb.js
import { R as React } from "./react-vendor.e2c4883f.js";
```

用一个最基本的例子来复原这个场景:

```
// a.js
import { funcB } from './b.js';

funcB();

export var funcA = () => {
  console.log('a');
}
// b.js
import { funcA } from './a.js';

funcA();

export var funcB = () => {
  console.log('b')
}

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
  <script type="module" src="/a.js"></script>
</body>
</html>
```

在浏览器中打开会出现类似的报错:<br>
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f71a39e22848419aac513906df7d39bb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f71a39e22848419aac513906df7d39bb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

代码的执行原理如下:

- JS 引擎执行 `a.js` 时，发现引入了 `b.js`，于是去执行 `b.js`
- 引擎执行 `b.js`，发现里面引入了 `a.js` (出现循环引用)，认为 `a.js` 已经加载完
  成，继续往下执行
- 执行到 `funcA()` 语句时发现 `funcA` 并没有定义，于是报错。

## 解决方案 --- vite-plugin-chunk-split

安装依赖

```
pnpm i vite-plugin-chunk-split -D
```

在项目中引入并使用:

```
// vite.config.ts
import { chunkSplitPlugin } from 'vite-plugin-chunk-split';

export default {
  chunkSplitPlugin({
    // 指定拆包策略
    customSplitting: {
      // 1. 支持填包名。`react` 和 `react-dom` 会被打包到一个名为`render-vendor`的 chunk 里面(包括它们的依赖，如 object-assign)
      'react-vendor': ['react', 'react-dom'],
      // 2. 支持填正则表达式。src 中 components 和 utils 下的所有文件被会被打包为`component-util`的 chunk 中
      'components-util': [/src\/components/, /src\/utils/]
    }
  })
}
```

相比于手动操作依赖关系，使用插件只需几行配置就能完成，非常方便。当然，这个插件还
可以支持多种打包策略，包括 unbundle 模式打包，你可以去
[使用文档](https://github.com/sanyuan0704/vite-plugin-chunk-split/blob/master/README-CN.md)
探索更多使用姿势。
