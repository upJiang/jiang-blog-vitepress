>目前Web开发倾向于`ESM`，Node开发倾向于`CJS`。

模块化的核心包括以下特性，基本都是围绕如何处理文件(模块)。
- **拆分**：将代码根据功能拆分为多个可复用模块
- **加载**：通过指定方式加载模块并执行与输出模块
- **注入**：将一个模块的输出注入到另一个模块
- **管理**：因为工程模块数量众多需管理模块间的依赖关系

<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ac42454df5c46a8a2c899c9092f7376~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ac42454df5c46a8a2c899c9092f7376~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

在JS发展历程中，主要有六种常见模块方案，分别是IIFE、CJS、AMD、CMD、UMD和ESM。
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6e495d80134881816bace221b6c56b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6e495d80134881816bace221b6c56b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>