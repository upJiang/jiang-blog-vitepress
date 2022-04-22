>Rollup 是`一款基于 ES Module 模块规范实现的 JavaScript 打包工具`，在前端社区中赫赫有名，同时也在 Vite 的架构体系中发挥着重要作用。不仅是 Vite 生产环境下的打包工具，其插件机制也被 Vite 所兼容，可以说是 Vite 的构建基石。因此，掌握 Rollup 也是深入学习 Vite 的必经之路。

## 快速上手
#### 初始化
```
# 初始化项目
npm init -y

# 安装 rollup
pnpm i rollup
```
#### 新增 `src/index.js` 和 `src/util.js` 和 `rollup.config.js` 三个文件:
```
.
├── package.json
├── pnpm-lock.yaml
├── rollup.config.js
└── src
    ├── index.js
    └── util.js
```
文件的内容分别如下:
```
// src/index.js
import { add } from "./util";
console.log(add(1, 2));

// src/util.js
export const add = (a, b) => a + b;

export const multi = (a, b) => a * b;

// rollup.config.js
// 以下注释是为了能使用 VSCode 的类型提示
/**
 * @type { import('rollup').RollupOptions }
 */
const buildOptions = {
  input: ["src/index.js"],
  output: {
    // 产物输出目录
    dir: "dist/es",
    // 产物格式
    format: "esm",
  },
};

export default buildOptions;
```
#### 在 `package.json` 中加入如下的构建脚本:
```
{
  // rollup 打包命令，`-c` 表示使用配置文件中的配置
  "build": "rollup -c"
}
```
#### 执行 `pnpm run build`
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/98cffbc93cca4d68a6dcdbba39c47a8b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/98cffbc93cca4d68a6dcdbba39c47a8b~tplv-k3u1fbpfcp-watermark.image?)</a>

可以发现，util.js中的 multi 方法并没有被打包到产物中，这是因为 Rollup `具有天然的 Tree Shaking 功能，可以分析出未使用到的模块并自动擦除`。

所谓 `Tree Shaking`(摇树)，也是计算机编译原理中DCE(Dead Code Elimination，即`消除无用代码`) 技术的一种实现。由于 ES 模块依赖关系是确定的，和运行时状态无关。因此 Rollup 可以在编译阶段分析出依赖关系，对 AST 语法树中没有使用到的节点进行删除，从而实现 Tree Shaking。

## 常用配置解读
### 1. 多产物配置
在打包 JavaScript 类库的场景中，我们通常需要对外暴露出不同格式的产物供他人使用，不仅包括 ESM，也需要包括诸如CommonJS、UMD等格式，保证良好的兼容性。
```
// rollup.config.js
/**
 * @type { import('rollup').RollupOptions }
 */
const buildOptions = {
  input: ["src/index.js"],
  // 将 output 改造成一个数组
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
};

export default buildOptions;
```
从代码中可以看到，我们将output属性配置成一个数组，数组中每个元素都是一个描述对象，决定了不同产物的输出行为。

### 2. 多入口配置
除了多产物配置，Rollup 中也支持多入口配置，而且通常情况下两者会被结合起来使用。接下来，就让我们继续改造之前的配置文件，将 input 设置为一个数组或者一个对象，如下所示:
```
{
  input: ["src/index.js", "src/util.js"]
}
// 或者
{
  input: {
    index: "src/index.js",
    util: "src/util.js",
  },
}
```
执行 `pnpm run build`

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49d8bac92eff441fb57089dbabca00d9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49d8bac92eff441fb57089dbabca00d9~tplv-k3u1fbpfcp-watermark.image?)</a>

如果不同入口对应的打包配置不一样，我们也可以默认导出一个配置数组，如下所示:
```
// rollup.config.js
/**
 * @type { import('rollup').RollupOptions }
 */
const buildIndexOptions = {
  input: ["src/index.js"],
  output: [
    // 省略 output 配置
  ],
};

/**
 * @type { import('rollup').RollupOptions }
 */
const buildUtilOptions = {
  input: ["src/util.js"],
  output: [
    // 省略 output 配置
  ],
};

export default [buildIndexOptions, buildUtilOptions];
```
如果是比较复杂的打包场景(如 [Vite 源码本身的打包](https://github.com/vitejs/vite/blob/main/packages/vite/rollup.config.js))，我们需要将项目的代码分成几个部分，用不同的 Rollup 配置分别打包，这种配置就很有用了。

### 3. 自定义output配置
刚才我们提到了input的使用，主要用来声明入口，可以配置成字符串、数组或者对象，使用比较简单。而output与之相对，用来配置输出的相关信息，常用的配置项如下:
```
output: {
  // 产物输出目录
  dir: path.resolve(__dirname, 'dist'),
  // 以下三个配置项都可以使用这些占位符:
  // 1. [name]: 去除文件后缀后的文件名
  // 2. [hash]: 根据文件名和文件内容生成的 hash 值
  // 3. [format]: 产物模块格式，如 es、cjs
  // 4. [extname]: 产物后缀名(带`.`)
  // 入口模块的输出文件名
  entryFileNames: `[name].js`,
  // 非入口模块(如动态 import)的输出文件名
  chunkFileNames: 'chunk-[hash].js',
  // 静态资源文件输出文件名
  assetFileNames: 'assets/[name]-[hash][extname]',
  // 产物输出格式，包括`amd`、`cjs`、`es`、`iife`、`umd`、`system`
  format: 'cjs',
  // 是否生成 sourcemap 文件
  sourcemap: true,
  // 如果是打包出 iife/umd 格式，需要对外暴露出一个全局变量，通过 name 配置变量名
  name: 'MyBundle',
  // 全局变量声明
  globals: {
    // 项目中可以直接用`$`代替`jquery`
    jquery: '$'
  }
}
```
### 4. 依赖 external
对于某些第三方包，有时候我们`不想让 Rollup 进行打包`，也可以通过 external 进行外部化:
```
{
  external: ['react', 'react-dom']
}
```

### 5. 接入插件能力
>在 Rollup 的日常使用中，我们难免会遇到一些 Rollup 本身不支持的场景，比如`兼容 CommonJS 打包、注入环境变量、配置路径别名、压缩产物代码` 等等。这个时候就需要我们引入相应的 Rollup 插件了。

虽然 Rollup 能够打包输出出 CommonJS 格式的产物，但对于输入给 Rollup 的代码并不支持 CommonJS，仅仅支持 ESM。

我们需要引入额外的插件去解决这个问题。lodash 的第三方依赖只有 CommonJS 格式产物。

1. 安装两个核心的插件包:
- `@rollup/plugin-node-resolve` 是为了`允许我们加载第三方依赖`，否则像 import React from 'react' 的依赖导入语句将不会被 Rollup 识别。
- `@rollup/plugin-commonjs` 的作用是`将 CommonJS 格式的代码转换为 ESM 格式`

```
pnpm i @rollup/plugin-node-resolve @rollup/plugin-commonjs
```

2. 在配置文件中导入这些插件:
```
// rollup.config.js
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

/**
 * @type { import('rollup').RollupOptions }
 */
export default {
  input: ["src/index.js"],
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
  // 通过 plugins 参数添加插件
  plugins: [resolve(), commonjs()],
};
```

3. 安装 `lodash` 
```
pnpm i lodash
```
4. 在 src/index.js 加入如下的代码:
```
import { merge } from "lodash";
console.log(merge);
```
然后执行 npm run build，你可以发现产物已经正常生成了:

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/93d76ca19ce941a5b803ad367bdffa54~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/93d76ca19ce941a5b803ad367bdffa54~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

在 Rollup 配置文件中，`plugins 除了可以与 output 配置在同一级，也可以配置在 output 参数里面`，需要注意的是，output.plugins中配置的插件是有一定限制的，只有使用Output 阶段相关钩子的插件才能够放到这个配置中。如:
```
// rollup.config.js
import { terser } from 'rollup-plugin-terser'
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  output: {
    // 加入 terser 插件，用来压缩代码
    plugins: [terser()]
  },
  plugins: [resolve(), commonjs()]
}
```
一些比较常用的 Rollup 插件库:
- [@rollup/plugin-json](https://github.com/rollup/plugins/tree/master/packages/json)： 支持.json的加载，并配合rollup的Tree Shaking机制去掉未使用的部分，进行按需打包。
- [@rollup/plugin-babel](https://github.com/rollup/plugins/tree/master/packages/babel)：在 Rollup 中使用 Babel 进行 JS 代码的语法转译。
- [@rollup/plugin-typescript](https://github.com/rollup/plugins/tree/master/packages/typescript): 支持使用 TypeScript 开发。
- [@rollup/plugin-alias](https://github.com/rollup/plugins/tree/master/packages/alias)：支持别名配置。
- [@rollup/plugin-replace](https://github.com/rollup/plugins/tree/master/packages/replace)：在 Rollup 进行变量字符串的替换。
- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer): 对 Rollup 打包产物进行分析，自动生成产物体积可视化分析图。

## JavaScript API 方式调用
以上我们通过 `Rollup` 的配置文件结合 `rollup -c` 完成了 Rollup 的打包过程，但有些场景下我们需要基于 Rollup 定制一些打包过程，配置文件就不够灵活了，这时候我们需要用到对应 `JavaScript API` 来调用 Rollup，主要分为 `rollup.rollup` 和 `rollup.watch` 两个 API

`rollup.rollup`，用来一次性地进行 Rollup 打包，新建build.js，内容如下:
```
// build.js
const rollup = require("rollup");

// 常用 inputOptions 配置
const inputOptions = {
  input: "./src/index.js",
  external: []
  plugins:[]
};

const outputOptionsList = [
  // 常用 outputOptions 配置
  {
    dir: 'dist/es',
    entryFileNames: `[name].[hash].js`,
    chunkFileNames: 'chunk-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]'
    format: 'es',
    sourcemap: true,
    globals: {
      lodash: '_'
    }
  }
  // 省略其它的输出配置
];

async function build() {
  let bundle;
  let buildFailed = false;
  try {
    // 1. 调用 rollup.rollup 生成 bundle 对象
    const bundle = await rollup.rollup(inputOptions);
    for (const outputOptions of outputOptionsList) {
      // 2. 拿到 bundle 对象，根据每一份输出配置，调用 generate 和 write 方法分别生成和写入产物
      const { output } = await bundle.generate(outputOptions);
      await bundle.write(outputOptions);
    }
  } catch (error) {
    buildFailed = true;
    console.error(error);
  }
  if (bundle) {
    // 最后调用 bundle.close 方法结束打包
    await bundle.close();
  }
  process.exit(buildFailed ? 1 : 0);
}

build();
```
主要的执行步骤如下:
- 通过 rollup.rollup方法，传入 inputOptions，生成 bundle 对象；
- 调用 bundle 对象的 generate 和 write 方法，传入outputOptions，分别完成产物和生成和磁盘写入。
- 调用 bundle 对象的 close 方法来结束打包。

执行 `node build.js` 进行打包，这样，我们就可以完成了以编程的方式来调用 Rollup 打包的过程。

通过 `rollup.watch` 来完成watch模式下的打包，即`每次源文件变动后自动进行重新打包`。新建 `watch.js` 文件，内容入下:
```
const rollup = require("rollup");

const watcher = rollup.watch({
  // 和 rollup 配置文件中的属性基本一致，只不过多了`watch`配置
  input: "./src/index.js",
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
  watch: {
    exclude: ["node_modules/**"],
    include: ["src/**"],
  },
});

// 监听 watch 各种事件
watcher.on("restart", () => {
  console.log("重新构建...");
});

watcher.on("change", (id) => {
  console.log("发生变动的模块id: ", id);
});

watcher.on("event", (e) => {
  if (e.code === "BUNDLE_END") {
    console.log("打包信息:", e);
  }
});
```
执行 `node watch.js` 开启 Rollup 的 watch 打包模式，当你改动一个文件后可以看到如下的日志，说明 Rollup 自动进行了重新打包，`产物实时变更`，并触发相应的事件回调函数:
```
发生生变动的模块id: /xxx/src/index.js
重新构建...
打包信息: {
  code: 'BUNDLE_END',
  duration: 10,
  input: './src/index.js',
  output: [
    // 输出产物路径
  ],
  result: {
    cache: { /* 产物具体信息 */ },
    close: [AsyncFunction: close],
    closed: false,
    generate: [AsyncFunction: generate],
    watchFiles: [
      // 监听文件列表
    ],
    write: [AsyncFunction: write]
  }
}
```
基于如上的两个 JavaScript API 我们可以很方便地在代码中调用 Rollup 的打包流程，相比于配置文件有了更多的操作空间，你可以在代码中通过这些 API 对 Rollup 打包过程进行定制，甚至是二次开发。

## Rollup 插件机制
Rollup 设计出了一套完整的插件机制，`将自身的核心逻辑与插件逻辑分离，让你能按需引入插件功能，提高了 Rollup 自身的可扩展性`。

Rollup 的打包过程中，会定义一套完整的构建生命周期，从开始打包到产物输出，中途会经历一些标志性的阶段，并且`在不同阶段会自动执行对应的插件钩子函数(Hook)`。对 Rollup 插件来讲，最重要的部分是钩子函数，一方面它定义了插件的执行逻辑，也就是"做什么"；另一方面也声明了插件的作用阶段，即"什么时候做"，这与 Rollup 本身的构建生命周期息息相关。

## Rollup 整体构建阶段
在执行 `rollup` 命令之后，在 cli 内部的主要逻辑简化如下:
```
// Build 阶段
const bundle = await rollup.rollup(inputOptions);

// Output 阶段
await Promise.all(outputOptions.map(bundle.write));

// 构建结束
await bundle.close();
```
Rollup 内部主要经历了 `Build` 和 `Output` 两大阶段：

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/67d0f8c753ed4eb29ac513439ac198ad~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/67d0f8c753ed4eb29ac513439ac198ad~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>