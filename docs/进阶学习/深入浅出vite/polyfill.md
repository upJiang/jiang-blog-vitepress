>通过 Vite 构建我们完全可以兼容各种低版本浏览器，打包出既支持现代(Modern)浏览器又支持旧版(Legacy)浏览器的产物。

**为什么在 Vite 中能够彻底解决低版本浏览器的兼容性问题，以及通过什么手段解决，需要借助哪些 JS 的工具和生态？**<br>
`@babel/preset-env`、`core-js`、`regenerator-runtime`等等工具和基础库的强强联合，官方的 `Vite` 插件`@vitejs/plugin-legacy`将这些底层的工具链接入到 `Vite` 中，并实现开箱即用。

## 场景复现
首先我们来复现一下问题场景，下面两张图代表了之前我在线上环境真实遇到的报错案例:

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89664e25ca4d43acba36586e4ac58b1e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89664e25ca4d43acba36586e4ac58b1e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

某些低版本浏览器并没有提供 `Promise` 语法环境以及对象和数组的各种 API，甚至不支持箭头函数语法，代码直接报错，从而导致线上白屏事故的发生，尤其是需要兼容到`IE 11`、`iOS 9`以及`Android 4.4`的场景中很容易会遇到。
