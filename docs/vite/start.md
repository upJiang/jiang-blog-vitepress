#### 构建工具种类
- 远古时代：`browserify`、`grunt`
- 传统：`Webpack`、`Rollup`、`Parcel`
- 现代：`Esbuild`、`Vite`

#### 前端工程的痛点：
- 模块化需求
    - 业界的模块标准非常多，包括 ESM、CommonJS、AMD 和 CMD 等等。前端工程一方面需要落实这些模块规范，保证模块正常加载。另一方面需要兼容不同的模块规范，以适应不同的执行环境。
- 兼容浏览器，编译高级语法
    - 由于浏览器的实现规范所限，只要高级语言/语法（TypeScript、 JSX 等）想要在浏览器中正常运行，就必须被转化为浏览器可以理解的形式。这都需要工具链层面的支持，而且这个需求会一直存在。
- 线上代码的质量问题
    - 和开发阶段的考虑侧重点不同，生产环境中，我们不仅要考虑代码的安全性、兼容性问题，保证线上代码的正常运行，也需要考虑代码运行时的性能问题。
- 开发效率
    - 项目的`冷启动/二次启动时间、热更新时间`都可能严重影响开发效率，尤其是当项目越来越庞大的时候。因此，提高项目的启动速度和热更新速度也是前端工程的重要需求。

#### 前端构建工具如何解决以上问题：
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f54b17dcae4c49adb558b760048c3603~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f54b17dcae4c49adb558b760048c3603~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

- 模块化方面，提供模块加载方案，并兼容不同的模块规范。
- 语法转译方面，配合 `Sass、TSC、Babel` 等前端工具链，完成高级语法的转译功能，同时对于静态资源也能进行处理，使之能作为一个模块正常加载。
- 产物质量方面，在生产环境中，配合 `Terser`等压缩工具进行代码压缩和混淆，通过 `Tree Shaking` 删除未使用的代码，提供对于低版本浏览器的语法降级处理等等。
- 开发效率方面，构建工具本身通过各种方式来进行性能优化，包括使用原生语言 Go/Rust、no-bundle等等思路，提高项目的启动性能和热更新的速度。

#### 为什么 Vite 是当前最高效的构建工具？
对于 webpack 而言，一般的项目使用 Webpack 之后，启动花个几分钟都是很常见的事情，热更新也经常需要等待十秒以上。这主要是因为：
- 项目冷启动时必须递归打包整个项目的依赖树
- JavaScript 语言本身的性能限制，导致构建性能遇到瓶颈，直接影响开发效率

这样一来，代码改动后不能立马看到效果，自然开发体验也越来越差。而其中，最占用时间的就是代码打包和文件编译。

**vite 的解决方案**
- 模块化方面，Vite 基于浏览器原生 ESM 的支持实现模块加载，并且无论是开发环境还是生产环境，都可以将其他格式的产物(如 CommonJS)转换为 ESM。
- 语法转译方面，Vite 内置了对 TypeScript、JSX、Sass 等高级语法的支持，也能够加载各种各样的静态资源，如图片、Worker 等等。
- 产物质量方面，Vite 基于成熟的打包工具 `Rollup` 实现生产环境打包，同时可以配合`Terser、Babel`等工具链，可以极大程度保证构建产物的质量。
- 开发效率方面，Vite 在开发阶段基于浏览器原生 ESM 的支持实现了no-bundle服务，借助 Esbuild 超快的编译速度来做第三方库构建和 TS/JSX 语法编译，从而能够有效提高开发效率。