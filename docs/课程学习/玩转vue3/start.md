## 全面拥抱 Vue 3
相较于 Vue 2.0

### 1. 源码组织上的变化
在 `Vue 2` 中，所有的源码都存在在 `src` 目录下：

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ddc2d129b1664b31935609ae4e713856~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ddc2d129b1664b31935609ae4e713856~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

`Vue 3` 相对于 `Vue 2` 使用 `monorepo` 的方式进行包管理，使用 `monorepo` 的管理方式，使得 `Vue 3` 源码模块职责显得特别地清晰明了，每个包独立负责一块核心功能的实现，方便开发和测试。

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0dd5ab8f7fe4d45929bdd734fd01a12~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0dd5ab8f7fe4d45929bdd734fd01a12~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

比如，`compiler-core` 专职负责与平台无关层的渲染器底层，对外提供统一调用函数，内部通过完整的测试用例保障功能的稳定性。而 `compiler-dom` 和 `compiler-ssr` 则依托于 `compiler-core` 分别实现浏览器和服务端侧的渲染器上层逻辑，模块核心职责清晰明了，提高了整体程序运行的健壮性！

### 2. 引入 Composition API
![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f13d16b31d3443ec9c29935870c9f7bb~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)

## 3. 运作机制的变化
![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fa72bab154fd45a7b793d6f33aaa3043~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4b410850bd4d4e2198e62e4c38bf8b92~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)

- 之前通过 `new Vue()` 来创建 `Vue` 对象的方式已经变成了 `createApp`；
- 在响应式部分也由原来的 `Object.defineProperty` 改成了现在的 `Proxy API` 实现；
- 针对响应式依赖收集的内容，在 `Vue 2.x` 版本中是收集了 `Watcher`，而到了 `Vue 3` 中则成了 `effect`。

下载 [Vue 3 源码](https://github.com/vuejs/core)，开始深层学习