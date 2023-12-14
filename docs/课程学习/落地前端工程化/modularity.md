> 目前 Web 开发倾向于`ESM`，Node 开发倾向于`CJS`。

模块化的核心包括以下特性，基本都是围绕如何处理文件(模块)。

- **拆分**：将代码根据功能拆分为多个可复用模块
- **加载**：通过指定方式加载模块并执行与输出模块
- **注入**：将一个模块的输出注入到另一个模块
- **管理**：因为工程模块数量众多需管理模块间的依赖关系

<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ac42454df5c46a8a2c899c9092f7376~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ac42454df5c46a8a2c899c9092f7376~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

在 JS 发展历程中，主要有六种常见模块方案，分别
是`IIFE、CJS、AMD、CMD、UMD和ESM`。
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6e495d80134881816bace221b6c56b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6e495d80134881816bace221b6c56b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

分析每个模块方案的特性可知，`同步加载`包括`IIFE`与`CJS`，`异步加载`包
括`AMD`、`CMD`和`ESM`。`浏览器`可兼容`IIFE`与`AMD`，`服务器`可兼
容`CJS`，`浏览器与服务器`都兼容`CMD、UMD和ESM`。

目前只需要关注`CJS`跟`ESM`<br>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/639935129c094f599ed70d0a49d750ae~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/639935129c094f599ed70d0a49d750ae~tplv-k3u1fbpfcp-watermark.image?)</a>
加载方式的解析：<br>

- **运行时加载**指整体加载模块生成一个对象，再从对象中获取所需的属性方法去加载。
  最大特性是`全部加载`，只有运行时才能得到该对象，无法在编译时做静态优化。
- **编译时加载**指直接从模块中获取所需的属性方法去加载。最大特性是`按需加载`，在
  编译时就完成模块加载，效率比其他方案高，无法引用模块本身(`本身不是对象`)，但可
  拓展`JS`高级语法(`宏与类型校验`)。

**CJS/ESM 的指定方式：**<br> `mjs`文件使用`ESM解析`，`cjs`文件使用`CJS解析`，js
文件使用基于 package.json 指定的 type 解析
(`type=commonjs使用CJS`，`type=module使用ESM`)。

Node v13.2.0 在默认情况下，会启动对 ESM 的实验支持，无需在命令中加上
--experimental-modules 参数。那 Node 是如何区分 CJS 与 ESM？简而言之，Node 会将
以下情况视为 ESM。

- 文件后缀为`.mjs`
- 文件后缀为`.js`且在`package.json`中指定`type`为`module`
- 命令中加上`--input-type=module`
- 命令中加上`--eval cmd`

### 方案：部署 Node 的 ESM 开发环境
