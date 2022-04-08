## 环境搭建
```
# 安装pnpm
npm i -g pnpm
# 换成国内的镜像源
pnpm config set registry https://registry.npmmirror.com/
```
## 项目初始化
```
# 初始化 vite 项目
pnpm create vite
# 进入项目目录
cd vite-project
# 安装依赖
pnpm install
# 启动项目
pnpm run dev
```
## 项目入口加载
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e77d3505dfb24a42b53c6c986fb83e71~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e77d3505dfb24a42b53c6c986fb83e71~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

浏览器不能识别 tsx 语法，也无法直接 import css 文件 <br>
Vite 会将项目的源代码编译成浏览器可以识别的代码，与此同时，`一个 import 语句即代表了一个 HTTP 请求`，如下面两个 import 语句:
```
import "/src/index.css";
import App from "/src/App.tsx";
```
上述两个语句则分别代表了两个不同的请求，`Vite Dev Server` 会读取本地文件，返回浏览器可以解析的代码。当浏览器解析到新的 import 语句，又会发出新的请求，以此类推，直到所有的资源都加载完成。

 Vite 所倡导的 `no-bundle` 理念的真正含义: `利用浏览器原生 ES 模块的支持，实现开发阶段的 Dev Server，进行模块的按需加载，而不是先整体打包再进行加载`。相比 Webpack 这种必须打包再加载的传统构建模式，Vite 在开发阶段省略了繁琐且耗时的打包过程，这也是它为什么快的一个重要原因。

 ## 样式处理
 css 解决方案
 - `CSS 预处理器`：主流的包括 `Sass/Scss、Less和Stylus`。这些方案各自定义了一套语法，让 CSS 也能使用嵌套规则，甚至能像编程语言一样定义变量、写条件判断和循环语句，大大增强了样式语言的灵活性，解决原生 CSS 的开发体验问题。
 - `CSS Modules`：能将 CSS 类名处理成哈希值，这样就可以避免同名的情况下样式污染的问题。
 - CSS 后处理器 `PostCSS`，用来解析和处理 `CSS` 代码，可以实现的功能非常丰富，比如将 `px 转换为 rem`、根据目标浏览器情况自动加上类似于`--moz--、-o-`的属性前缀等等。
 - `CSS in JS` 方案，主流的包括`emotion、styled-components`等等，顾名思义，这类方案可以实现直接在 JS 中写样式代码，基本包含 `CSS 预处理器`和 `CSS Modules` 的各项优点，非常灵活，解决了开发体验和全局样式污染的问题。
 - CSS 原子化框架，如 `Tailwind CSS、Windi CSS`，通过类名来指定样式，大大简化了样式写法，提高了样式开发的效率，主要解决了原生 CSS 开发体验的问题。

 ### CSS 预处理器
 ```
 # 安装sass
 pnpm i sass -D
 # 全局导入变量文件，这样不需要手动引入
 # 安装 @types/node，这样才能使用 path
 pnpm i @types/node -D
 # 在 vite.config.ts 写入
 
 import { normalizePath } from 'vite';
 import path from 'path';

 // 全局 scss 文件的路径
 // 用 normalizePath 解决 window 下的路径问题
 const variablePath = normalizePath(path.resolve('./src/style/variable.scss'));

 export default defineConfig({
  // css 相关的配置
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData 的内容会在每个 scss 文件的开头自动注入
        additionalData: `@import "${variablePath}";`
      }
    }
  }
})
 ```

### CSS Modules
CSS Modules 在 Vite 也是一个开箱即用的能力，Vite 会对后缀带有 `.module` 的样式文件自动应用 `CSS Modules`。接下来我们通过一个简单的例子来使用这个功能。
```
index.scss 更名为 index.module.scss

// index.tsx
import styles from './index.module.scss';
export function Header() {
  return <p className={styles.header}>This is Header</p>
};
```
在配置文件中的 css.modules 选项来配置 CSS Modules 的功能
```
// vite.config.ts
export default {
  css: {
    modules: {
      // 一般我们可以通过 generateScopedName 属性来对生成的类名进行自定义
      // 其中，name 表示当前文件名，local 表示类名
      generateScopedName: "[name]__[local]___[hash:base64:5]"
    },
  }
}
```
结果：<br>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/efe607b6603547d991657b1fad6db45c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/efe607b6603547d991657b1fad6db45c~tplv-k3u1fbpfcp-watermark.image?)</a>

### PostCSS
>通过 postcss.config.js 来配置 postcss 
```
# 安装一个常用的 PostCSS 插件——autoprefixer
pnpm i autoprefixer -D
```
这个插件主要用来自动为不同的目标浏览器添加样式前缀，解决的是`浏览器兼容性的问题`。接下来让我们在 Vite 中接入这个插件:
```
// vite.config.ts 增加如下的配置
import autoprefixer from 'autoprefixer';

export default {
  css: {
    // 进行 PostCSS 配置
    postcss: {
      plugins: [
        autoprefixer({
          // 指定目标浏览器
          overrideBrowserslist: ['Chrome > 40', 'ff > 31', 'ie 11']
        })
      ]
    }
  }
}
```
效果：<br>
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6d9a57e84534193a14ce3dbfc2dd7b3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6d9a57e84534193a14ce3dbfc2dd7b3~tplv-k3u1fbpfcp-watermark.image?)</a>

pnpm run build命令进行打包，可以看到产物中自动补上了浏览器前缀，如:
```
._header_kcvt0_1 {
  <!-- 前面的样式省略 -->
  -webkit-text-decoration: dashed;
  -moz-text-decoration: dashed;
  text-decoration: dashed;
}
```
由于有 CSS 代码的 AST (抽象语法树)解析能力，[PostCSS](https://www.postcss.parts/) 可以做的事情非常多，甚至能实现 CSS 预处理器语法和 CSS Modules，社区当中也有不少的 PostCSS 插件，除了刚刚提到的autoprefixer插件，常见的插件还包括:
- [postcss-pxtorem](https://github.com/cuth/postcss-pxtorem)： 用来将 px 转换为 rem 单位，在适配移动端的场景下很常用。
- [postcss-preset-env](https://github.com/csstools/postcss-preset-env): 通过它，你可以编写最新的 CSS 语法，不用担心兼容性问题。
- [cssnano](https://github.com/cssnano/cssnano): 主要用来压缩 CSS 代码，跟常规的代码压缩工具不一样，它能做得更加智能，比如提取一些公共样式进行复用、缩短一些常见的属性值等等。