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

### CSS In JS
社区中有两款主流的 CSS In JS 方案: `styled-components` 和 `emotion`。

对于 `CSS In JS` 方案，在构建侧我们需要考虑`选择器命名问题`、`DCE(Dead Code Elimination 即无用代码删除)`、`代码压缩`、`生成 SourceMap`、`服务端渲染(SSR)`等问题，而 `styled-components` 和 `emotion` 已经提供了对应的 babel 插件来解决这些问题，我们在 Vite 中要做的就是集成这些 babel 插件。
```
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        // 加入 babel 插件
        // 以下插件包都需要提前安装
        // 当然，通过这个配置你也可以添加其它的 Babel 插件
        plugins: [
          // 适配 styled-component
          "babel-plugin-styled-components"
          // 适配 emotion
          "@emotion/babel-plugin"
        ]
      },
      // 注意: 对于 emotion，需要单独加上这个配置
      // 通过 `@emotion/react` 包编译 emotion 中的特殊 jsx 语法
      jsxImportSource: "@emotion/react"
    })
  ]
})
```

## lint 规范
```
# 安装 ESLint
pnpm i eslint -D
# 初始化 eslint
npx eslint --init
# 安装 react、ts 的 eslint 依赖
pnpm i eslint-plugin-react@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest -D
```
### 核心配置解读
ESLint 底层默认使用 [Espree](https://github.com/eslint/espree) 来进行 AST 解析，这个解析器目前已经基于 `Acron` 来实现，虽然说 `Acron` 目前能够解析绝大多数的 [ECMAScript](https://github.com/acornjs/acorn/tree/master/acorn) 规范的语法，但还是不支持 TypeScript ，因此需要引入其他的解析器完成 TS 的解析。

社区提供了 `@typescript-eslint/parser` 这个解决方案，专门为了 `TypeScript` 的解析而诞生，将 `TS` 代码转换为 `Espree` 能够识别的格式(即 [Estree](https://github.com/estree/estree) 格式)，然后在 Eslint 下通过 `Espree` 进行格式检查， 以此兼容了 TypeScript 语法。

### parserOptions - 解析器选项
这个配置可以对上述的解析器进行能力定制，默认情况下 ESLint 支持 ES5 语法，你可以配置这个选项，具体内容如下:
- ecmaVersion: 这个配置和 `Acron` 的 [ecmaVersion](https://github.com/acornjs/acorn/tree/master/acorn) 是兼容的，可以配置 `ES + 数字`(如 ES6)或者`ES + 年份`(如 ES2015)，也可以直接配置为 `latest`，启用最新的 ES 语法。
- sourceType: 默认为 `script`，如果使用 `ES Module` 则应设置为 `module`。
- ecmaFeatures: 为一个对象，表示想使用的额外语言特性，如开启 `jsx`。

### rules - 具体代码规则
`rules` 配置即代表在 ESLint 中手动调整哪些代码规则，比如`禁止在 if 语句中使用赋值语句`这条规则可以像如下的方式配置:
```
// .eslintrc.js
module.exports = {
  // 其它配置省略
  rules: {
    // key 为规则名，value 配置内容
    "no-cond-assign": ["error", "always"]
  }
}
```
在 rules 对象中，`key` 一般为`规则名`，`value` 为`具体的配置内容`，在上述的例子中我们设置为一个数组，数组第一项为规则的 `ID`，第二项为`规则的配置`。也能直接将 `rules` 对象的 `value` 配置成 `ID`，如: `"no-cond-assign": "error"`。

**规则的 ID**：它的语法对所有规则都适用，你可以设置以下的值:
- `off` 或 `0`: 表示关闭规则。
- `warn` 或 `1`: 表示开启规则，不过违背规则后只抛出 warning，而不会导致程序退出。
- `error` 或 `2`: 表示开启规则，不过违背规则后抛出 error，程序会退出。

具体的规则配置可能会不一样，有的是一个字符串，有的可以配置一个对象，参考 [ESLint 官方文档](https://cn.eslint.org/docs/rules/)。

### extends - 继承配置
extends 相当于`继承`另外一份 ESLint 配置，可以配置为一个字符串，也可以配置成一个字符串数组。主要分如下 3 种情况:
- 从 ESLint 本身继承;
- 从类似 `eslint-config-xxx` 的 npm 包继承；
- 从 ESLint 插件继承。
```
// .eslintrc.js
module.exports = {
   "extends": [
     // 第1种情况 
     "eslint:recommended",
     // 第2种情况，一般配置的时候可以省略 `eslint-config`
     "standard"
     // 第3种情况，可以省略包名中的 `eslint-plugin`
     // 格式一般为: `plugin:${pluginName}/${configName}`
     "plugin:react/recommended"
     "plugin:@typescript-eslint/recommended",
   ]
}
```
有了 extends 的配置，对于之前所说的 ESLint 插件中的繁多配置，我们就不需要手动一一开启了，通过 extends 字段即可自动开启插件中的推荐规则:
```
extends: ["plugin:@typescript-eslint/recommended"]
```
### env 和 globals
这两个配置分别表示`运行环境`和`全局变量`，在指定的运行环境中会预设一些全局变量，比如:
```
// .eslint.js
module.export = {
  "env": {
    "browser": "true",
    "node": "true"
  }
}
```
指定上述的 `env` 配置后便会启用浏览器和 Node.js 环境，这两个环境中的一些全局变量(如 `window、global` 等)会同时启用。

有些全局变量是业务代码引入的第三方库所声明，这里就需要在globals配置中声明全局变量了。每个全局变量的配置值有 3 种情况:
- `"writable"`或者 `true`，表示变量可重写；
- `"readonly"`或者`false`，表示变量不可重写；
- `"off"`，表示禁用该全局变量。

拿jquery举例，我们可以在配置文件中声明如下:
```
// .eslintrc.js
module.exports = {
  "globals": {
    // 不可重写
    "$": false, 
    "jQuery": false 
  }
}
```
## Prettier
虽然 ESLint 本身具备自动格式化代码的功能(`eslint --fix`)，但术业有专攻，ESLint 的主要优势在于`代码的风格检查并给出提示`，而在代码格式化这一块 Prettier 做的更加专业，因此我们经常将 ESLint 结合 Prettier 一起使用。
```
# 安装 Prettier
pnpm i prettier -D
```
在项目根目录新建 `.prettierrc.js` 配置文件，填写如下的配置内容:
```
// .prettierrc.js
module.exports = {
  printWidth: 80, //一行的字符数，如果超过会进行换行，默认为80
  tabWidth: 2, // 一个 tab 代表几个空格数，默认为 2 个
  useTabs: false, //是否使用 tab 进行缩进，默认为false，表示用空格进行缩减
  singleQuote: false, // 字符串是否使用单引号，默认为 false，使用双引号
  semi: true, // 行尾是否使用分号，默认为true
  trailingComma: "none", // 是否使用尾逗号
  bracketSpacing: true // 对象大括号直接是否有空格，默认为 true，效果：{ a: 1 }
};
```
将Prettier集成到现有的ESLint工具中，安装两个工具包:
- eslint-config-prettier：用来覆盖 ESLint 本身的规则配置
- eslint-plugin-prettier：让 Prettier 来接管eslint --fix即修复代码的能力
```
pnpm i eslint-config-prettier eslint-plugin-prettier -D
```
在 .eslintrc.js 配置文件中接入 prettier 的相关工具链：
```
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    // 1. 接入 prettier 的规则
    "prettier",
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: "latest",
    sourceType: "module"
  },
  // 2. 加入 prettier 的 eslint 插件
  plugins: ["react", "@typescript-eslint", "prettier"],
  rules: {
    // 3. 注意要加上这一句，开启 prettier 自动修复的功能
    "prettier/prettier": "error",
    quotes: ["error", "single"],
    semi: ["error", "always"],
    "react/react-in-jsx-scope": "off"
  }
};
```
在 package.json 添加脚本
```
{
  "scripts": {
    // 省略已有 script
    "lint:script": "eslint --ext .js,.jsx,.ts,.tsx --fix --quiet ./",
  }
}
``` 
### 在 Vite 中接入 ESLint
安装 Vite 中的 ESLint 插件:
```
pnpm i vite-plugin-eslint -D
```
vite.config.ts 中接入:
```
// vite.config.ts
import viteEslint from 'vite-plugin-eslint';

// 具体配置
{
  plugins: [
    // 省略其它插件
    viteEslint(),
  ]
}
```