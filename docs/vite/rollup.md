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
const result = await bundle.generate(); 
const result = await bundle.write(); 
await Promise.all(outputOptions.map(bundle.write));

// 构建结束
await bundle.close();
```
Rollup 内部主要经历了 `Build` 和 `Output` 两大阶段：

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/67d0f8c753ed4eb29ac513439ac198ad~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/67d0f8c753ed4eb29ac513439ac198ad~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

**对于一次完整的构建过程而言， Rollup 会先进入到 Build 阶段，解析各模块的内容及依赖关系，然后进入Output阶段，完成打包及输出的过程。**

```
const rollup = require('rollup');
async function build() {
  // build 阶段
  const bundle = await rollup.rollup({
    input: ['./src/index.js'],
  });

  // output 阶段
  const result = await bundle.generate({
    format: 'es',
  });
  console.log('result:', result);
}

build();
```
- `Build 阶段`：主要负责创建模块依赖图，初始化各个模块的 AST 以及模块之间的依赖关系。
  - ```
    const rollup = require('rollup');
    const util = require('util');
    async function build() {
      const bundle = await rollup.rollup({
        input: ['./src/index.js'],
      });
      console.log(util.inspect(bundle));
    }
    build();
    // 只执行 build 会输出：
        {
      cache: {
        modules: [
          {
            ast: 'AST 节点信息，具体内容省略',
            code: 'export const a = 1;',
            dependencies: [],
            id: '/Users/code/rollup-demo/src/data.js',
            // 其它属性省略
          },
          {
            ast: 'AST 节点信息，具体内容省略',
            code: "import { a } from './data';\n\nconsole.log(a);",
            dependencies: [
              '/Users/code/rollup-demo/src/data.js'
            ],
            id: '/Users/code/rollup-demo/src/index.js',
            // 其它属性省略
          }
        ],
        plugins: {}
      },
      closed: false,
      // 挂载后续阶段会执行的方法
      close: [AsyncFunction: close],
      generate: [AsyncFunction: generate],
      write: [AsyncFunction: write]
    }
    ```
- `Output 阶段`：真正进行打包的过程会在 Output 阶段进行，即在bundle对象的 generate或者write方法中进行。
  - ```
    // 添加执行 bundle.generate
    输出：

    {
      output: [
        {
          exports: [],
          facadeModuleId: '/Users/code/rollup-demo/src/index.js',
          isEntry: true,
          isImplicitEntry: false,
          type: 'chunk',
          code: 'const a = 1;\n\nconsole.log(a);\n',
          dynamicImports: [],
          fileName: 'index.js',
          // 其余属性省略
        }
      ]
    }

    生成的output数组即为打包完成的结果。当然，如果使用 bundle.write 会根据配置将最后的产物写入到指定的磁盘目录中。
    ```

## 拆解插件工作流
### 谈谈插件 Hook 类型
不同插件 Hook 的类型代表了不同插件的执行特点，是我们理解 Rollup 插件工作流的基础。实际上，插件的各种 Hook 可以根据这两个构建阶段分为两类: `Build Hook` 与 `Output Hook`。
- `Build Hook` 即在 `Build 阶段执行的钩子函数`，在这个阶段主要进行模块代码的转换、AST 解析以及模块依赖的解析，那么这个阶段的 Hook 对于代码的操作粒度一般为`模块`级别，也就是单文件级别。
- `Ouput Hook`(官方称为Output Generation Hook)，则主要进行代码的打包，对于代码而言，操作粒度一般为 `chunk` 级别(一个 chunk 通常指很多文件打包到一起的产物)。

除了根据构建阶段可以将 Rollup 插件进行分类，根据不同的 Hook 执行方式也会有不同的分类，主要包括 `Async、Sync、Parallel、Squential、First` 这五种。

### 1. Async & Sync
首先是 `Async` 和 `Sync` 钩子函数，两者其实是相对的，分别代表`异步和同步的钩子函数`，两者最大的区别在于同步钩子里面不能有异步逻辑，而异步钩子可以有。

### 2. Parallel
这里指并行的钩子函数。如果有多个插件实现了这个钩子的逻辑，一旦有钩子函数是异步逻辑，则并发执行钩子函数，不会等待当前钩子完成(底层使用 Promise.all)。

比如对于 `Build` 阶段的 `buildStart` 钩子，它的执行时机其实是在构建刚开始的时候，各个插件可以在这个钩子当中做一些状态的初始化操作，但其实插件之间的操作并不是相互依赖的，也就是可以并发执行，从而提升构建性能。反之，对于需要依赖其他插件处理结果的情况就不适合用 `Parallel` 钩子了，比如 `transform`。

### 3. Sequential
`Sequential` 指串行的钩子函数。这种 `Hook` 往往适用于插件间处理结果相互依赖的情况，前一个插件 `Hook` 的返回值作为后续插件的入参，这种情况就需要等待前一个插件执行完 `Hook`，获得其执行结果，然后才能进行下一个插件相应 `Hook` 的调用，如 `transform`。

### 4. First
如果有多个插件实现了这个 `Hook`，那么 `Hook` 将依次运行，直到返回一个`非 null` 或`非 undefined` 的值为止。比较典型的 `Hook` 是 `resolveId`，一旦有插件的 `resolveId` 返回了一个路径，将停止执行后续插件的 `resolveId` 逻辑。

实际上不同的 `Hook` 类型是可以叠加的，`Async/Sync` 可以搭配后面三种类型中的任意一种，比如一个 `Hook` 既可以是 `Async` 也可以是 `First` 类型

## Build 阶段工作流
对于 `Build` 阶段，插件 `Hook` 的调用流程如下图所示。流程图的最上面声明了不同 `Hook` 的类型，也就是我们在上面总结的 5 种 `Hook` 分类，每个方块代表了一个 `Hook`，边框的颜色可以表示 `Async` 和 `Sync` 类型，方块的填充颜色可以表示 `Parallel`、`Sequential` 和 `First` 类型。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/58ce9fa2b0f14dd1bc50a9c849157e43~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/58ce9fa2b0f14dd1bc50a9c849157e43~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

- 首先经历 options 钩子进行配置的转换，得到处理后的配置对象。
- 随之 Rollup 会调用buildStart钩子，正式开始构建流程。
- Rollup 先进入到 resolveId 钩子中解析文件路径。(从 input 配置指定的入口文件开始)。
- Rollup 通过调用load钩子加载模块内容。
- 紧接着 Rollup 执行所有的 transform 钩子来对模块内容进行进行自定义的转换，比如 babel 转译。
- 现在 Rollup 拿到最后的模块内容，进行 AST 分析，得到所有的 import 内容，调用 moduleParsed 钩子:
  - 6.1 如果是普通的 import，则执行 resolveId 钩子，继续回到步骤3。
  - 6.2 如果是动态 import，则执行 resolveDynamicImport 钩子解析路径，如果解析成功，则回到步骤4加载模块，否则回到步骤3通过 resolveId 解析路径。
- 直到所有的 import 都解析完毕，Rollup 执行buildEnd钩子，Build 阶段结束。

在 Rollup 解析路径的时候，即执行 `resolveId` 或者 `resolveDynamicImport` 的时候，有些路径可能会被标记为 `external` (翻译为排除)，也就是说`不参加 Rollup 打包过程`，这个时候就不会进行load、transform等等后续的处理了。

`watchChange` 和 `closeWatcher` 这两个 `Hook`，这里其实是对应了 `rollup` 的 `watch` 模式。当你使用 `rollup --watch` 指令或者在配置文件配有 `watch: true` 的属性时，代表开启了 `Rollup` 的 `watch` 打包模式，这个时候 `Rollup` 内部会初始化一个 `watcher` 对象，当文件内容发生变化时，`watcher` 对象会自动触发 `watchChange` 钩子执行并对项目进行重新构建。在当前打包过程结束时，`Rollup` 会自动清除 `watcher` 对象调用 `closeWacher` 钩子。

## Output 阶段工作流
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5dc4935d712d451fb6978fad46dd7b74~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5dc4935d712d451fb6978fad46dd7b74~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

- 执行所有插件的 `outputOptions` 钩子函数，对 `output` 配置进行转换。
- 执行 `renderStart`，并发执行 `renderStart` 钩子，正式开始打包。
- 并发执行所有插件的 `banner、footer、intro、outro` 钩子(底层用 Promise.all 包裹所有的这四种钩子函数)，这四个钩子功能很简单，就是往打包产物的固定位置(比如头部和尾部)插入一些自定义的内容，比如协议声明内容、项目介绍等等。
- 从入口模块开始扫描，针对动态 `import` 语句执行 `renderDynamicImport` 钩子，来自定义动态 `import` 的内容。
- 对每个即将生成的 `chunk`，执行 `augmentChunkHash` 钩子，来决定是否更改 `chunk` 的哈希值，在 `watch` 模式下即可能会多次打包的场景下，这个钩子会比较适用。
- 如果没有遇到 `import.meta` 语句，则进入下一步，否则:
  - 6.1 对于 `import.meta.url` 语句调用 `resolveFileUrl` 来自定义 `url` 解析逻辑
  - 6.2 对于其他 `import.meta` 属性，则调用 `resolveImportMeta` 来进行自定义的解析。
- 接着 `Rollup` 会生成所有 `chunk` 的内容，针对每个 `chunk` 会依次调用插件的 `renderChunk` 方法进行自定义操作，也就是说，在这里时候你可以直接操作打包产物了。
- 随后会调用 `generateBundle` 钩子，这个钩子的入参里面会包含所有的打包产物信息，包括 `chunk` (打包后的代码)、`asset`(最终的静态资源文件)。你可以在这里删除一些 `chunk` 或者 `asset`，最终这些内容将不会作为产物输出。
- 前面提到了 `rollup.rollup` 方法会返回一个 `bundle` 对象，这个对象是包含 `generate` 和 `write` 两个方法，两个方法唯一的区别在于后者会将代码写入到磁盘中，同时会触发 `writeBundle` 钩子，传入所有的打包产物信息，包括 `chunk` 和 `asset`，和 `generateBundle` 钩子非常相似。不过值得注意的是，这个钩子执行的时候，产物已经输出了，而 `generateBundle` 执行的时候产物还并没有输出。顺序如下图所示:
  - <a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12142ea189be4a8f918cf247f408487e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/12142ea189be4a8f918cf247f408487e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>
- 当上述的bundle的close方法被调用时，会触发closeBundle钩子，到这里 Output 阶段正式结束。

>注意: 当打包过程中任何阶段出现错误，会触发 renderError 钩子，然后执行closeBundle钩子结束打包。

梳理完了 Rollup 当中完整的插件工作流程，从一开始在构建生命周期中对两大构建阶段的感性认识，到现在插件工作流的具体分析，不禁感叹 Rollup 看似简单，实则内部细节繁杂。

## 常用 Hook 实战
实际上开发 Rollup 插件就是在`编写一个个 Hook 函数`，你可以理解为一个 Rollup 插件基本就是各种 Hook 函数的组合。因此，接下来我会详细介绍一些常用的 Hook，并以一些官方的插件实现为例，从 Hook 的特性、应用场景、入参和返回值的意义及实现代码示例这几个角度带你掌握各种 Hook 实际的使用，如此一来，开发一个完整的插件对你来说想必也不在话下了。

### 1. 路径解析: resolveId
`resolveId` 钩子一般用来解析模块路径，为`Async + First`类型即异步优先的钩子。这里我们拿官方的 [alias](https://github.com/rollup/plugins/blob/master/packages/alias/src/index.ts) 插件 来说明，这个插件用法演示如下:
```
// rollup.config.js
import alias from '@rollup/plugin-alias';
module.exports = {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    alias({
      entries: [
        // 将把 import xxx from 'module-a' 
        // 转换为 import xxx from './module-a'
        { find: 'module-a', replacement: './module-a.js' },
      ]
    })
  ]
};
```
插件的代码简化后如下:
```
export default alias(options) {
  // 获取 entries 配置
  const entries = getEntries(options);
  return {
    // 传入三个参数，当前模块路径、引用当前模块的模块路径、其余参数
    resolveId(importee, importer, resolveOptions) {
      // 先检查能不能匹配别名规则
      const matchedEntry = entries.find((entry) => matches(entry.find, importee));
      // 如果不能匹配替换规则，或者当前模块是入口模块，则不会继续后面的别名替换流程
      if (!matchedEntry || !importerId) {
        // return null 后，当前的模块路径会交给下一个插件处理
        return null;
      }
      // 正式替换路径
      const updatedId = normalizeId(
        importee.replace(matchedEntry.find, matchedEntry.replacement)
      );
      // 每个插件执行时都会绑定一个上下文对象作为 this
      // 这里的 this.resolve 会执行所有插件(除当前插件外)的 resolveId 钩子
      return this.resolve(
        updatedId,
        importer,
        Object.assign({ skipSelf: true }, resolveOptions)
      ).then((resolved) => {
        // 替换后的路径即 updateId 会经过别的插件进行处理
        let finalResult: PartialResolvedId | null = resolved;
        if (!finalResult) {
          // 如果其它插件没有处理这个路径，则直接返回 updateId
          finalResult = { id: updatedId };
        }
        return finalResult;
      });
    }
  }
}
```
从这里你可以看到 resolveId 钩子函数的一些常用使用方式，它的入参分别是当前模块路径、引用当前模块的模块路径、解析参数，返回值可以是 null、string 或者一个对象，我们分情况讨论。
- 返回值为 `null` 时，会默认交给下一个插件的 resolveId 钩子处理。
- 返回值为 `string` 时，则停止后续插件的处理。这里为了让替换后的路径能被其他插件处理，特意调用了 this.resolve 来交给其它插件处理，否则将不会进入到其它插件的处理。
- 返回值为一个`对象`，也会停止后续插件的处理，不过这个对象就可以包含更多的信息了，包括解析后的路径、是否被 enternal、是否需要 tree-shaking 等等，不过大部分情况下返回一个 string 就够用了。

### 2. load
`load` 为 `Async + First`类型，即`异步优先`的钩子，和resolveId类似。它的作用是通过 `resolveId` 解析后的路径来加载模块内容。这里，我们以官方的 image 插件 为例来介绍一下 load 钩子的使用。源码简化后如下所示:
```
const mimeTypes = {
  '.jpg': 'image/jpeg',
  // 后面图片类型省略
};

export default function image(opts = {}) {
  const options = Object.assign({}, defaults, opts);
  return {
    name: 'image',
    load(id) {
      const mime = mimeTypes[extname(id)];
      if (!mime) {
        // 如果不是图片类型，返回 null，交给下一个插件处理
        return null;
      }
      // 加载图片具体内容
      const isSvg = mime === mimeTypes['.svg'];
      const format = isSvg ? 'utf-8' : 'base64';
      const source = readFileSync(id, format).replace(/[\r\n]+/gm, '');
      const dataUri = getDataUri({ format, isSvg, mime, source });
      const code = options.dom ? domTemplate({ dataUri }) : constTemplate({ dataUri });

      return code.trim();
    }
  };
}
```
从中可以看到，load 钩子的入参是模块 id，返回值一般是 null、string 或者一个对象：
- 如果返回值为 null，则交给下一个插件处理；
- 如果返回值为 string 或者对象，则终止后续插件的处理，如果是对象可以包含 SourceMap、AST [等更详细的信息](https://rollupjs.org/guide/en/#load)。

### 3. 代码转换: transform
`transform` 钩子也是非常常见的一个钩子函数，为 `Async + Sequential` 类型，也就是`异步串行`钩子，作用是**对加载后的模块内容进行自定义的转换**。我们以官方的 `replace` 插件为例，这个插件的使用方式如下:
```
// rollup.config.js
import replace from '@rollup/plugin-replace';

module.exports = {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    // 将会把代码中所有的 __TEST__ 替换为 1
    replace({
      __TEST__: 1
    })
  ]
};
```
内部实现也并不复杂，主要通过字符串替换来实现，核心逻辑简化如下:
```
import MagicString from 'magic-string';

export default function replace(options = {}) {
  return {
    name: 'replace',
    transform(code, id) {
      // 省略一些边界情况的处理
      // 执行代码替换的逻辑，并生成最后的代码和 SourceMap
      return executeReplacement(code, id);
    }
  }
}

function executeReplacement(code, id) {
  const magicString = new MagicString(code);
  // 通过 magicString.overwrite 方法实现字符串替换
  if (!codeHasReplacements(code, id, magicString)) {
    return null;
  }

  const result = { code: magicString.toString() };

  if (isSourceMapEnabled()) {
    result.map = magicString.generateMap({ hires: true });
  }

  // 返回一个带有 code 和 map 属性的对象
  return result;
}
```
[transform 钩子](https://rollupjs.org/guide/en/#transform)的入参分别为`模块代码`、`模块 ID`，返回一个包含 `code`(代码内容) 和 `map`(SourceMap 内容) 属性的对象，当然也可以返回 null 来跳过当前插件的 transform 处理。需要注意的是，**当前插件返回的代码会作为下一个插件 transform 钩子的第一个入参**，实现类似于瀑布流的处理。

### 4. Chunk 级代码修改: renderChunk
这里我们继续以 replace插件举例，在这个插件中，也同样实现了 renderChunk 钩子函数:
```
export default function replace(options = {}) {
  return {
    name: 'replace',
    transform(code, id) {
      // transform 代码省略
    },
    renderChunk(code, chunk) {
      const id = chunk.fileName;
      // 省略一些边界情况的处理
      // 拿到 chunk 的代码及文件名，执行替换逻辑
      return executeReplacement(code, id);
    },
  }
}
```
可以看到这里 replace 插件为了替换结果更加准确，在 renderChunk 钩子中又进行了一次替换，因为后续的插件仍然可能在 transform 中进行模块内容转换，进而可能出现符合替换规则的字符串。

这里我们把关注点放到 renderChunk 函数本身，可以看到有两个入参，分别为 `chunk 代码内容`、[chunk 元信息](https://rollupjs.org/guide/en/#generatebundle)，返回值跟 `transform` 钩子类似，既可以返回包含 code 和 map 属性的对象，也可以通过返回 null 来跳过当前钩子的处理。

### 5. 产物生成最后一步: generateBundle
`generateBundle` 也是`异步串行`的钩子，你可以在这个钩子里面自定义删除一些无用的 chunk 或者静态资源，或者自己添加一些文件。这里我们以 Rollup 官方的html插件来具体说明，这个插件的作用是通过拿到 Rollup 打包后的资源来生成包含这些资源的 HTML 文件，源码简化后如下所示:
```
export default function html(opts: RollupHtmlOptions = {}): Plugin {
  // 初始化配置
  return {
    name: 'html',
    async generateBundle(output: NormalizedOutputOptions, bundle: OutputBundle) {
      // 省略一些边界情况的处理
      // 1. 获取打包后的文件
      const files = getFiles(bundle);
      // 2. 组装 HTML，插入相应 meta、link 和 script 标签
      const source = await template({ attributes, bundle, files, meta, publicPath, title});
      // 3. 通过上下文对象的 emitFile 方法，输出 html 文件
      const htmlFile: EmittedAsset = {
        type: 'asset',
        source,
        name: 'Rollup HTML Asset',
        fileName
      };
      this.emitFile(htmlFile);
    }
  }
}
```
相信从插件的具体实现中，你也能感受到这个钩子的强大作用了。入参分别为`output 配置`、[所有打包产物的元信息对象](https://rollupjs.org/guide/en/#generatebundle)，通过操作元信息对象你可以删除一些不需要的 chunk 或者静态资源，也可以通过 插件上下文对象的 `emitFile` 方法输出自定义文件。

## 总结
我们首先认识到 Rollup 为了追求扩展性和可维护性，引入了插件机制，而后给你介绍了 Rollup 的 Build 和Output 两大构建阶段，接着给你详细地分析了两大构建阶段的插件工作流，最后通过几个实际的官方插件带你熟悉了一些常见的 Hook。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a353a4349c124b108a223f29bf8fc9e8~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a353a4349c124b108a223f29bf8fc9e8~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

Rollup 的插件开发整体上是非常简洁和灵活的，总结为以下几个方面:
- **插件逻辑集中管理**。各个阶段的 Hook 都可以放在一个插件中编写，比如上述两个 Webpack 的 Loader 和 Plugin 功能在 Rollup 只需要用一个插件，分别通过 transform 和 renderChunk 两个 Hook 来实现。
- **插件 API 简洁，符合直觉**。Rollup 插件基本上只需要返回一个包含 name 和各种钩子函数的对象即可，也就是声明一个 name 属性，然后写几个钩子函数即可。
- **插件间的互相调用**。比如刚刚介绍的alias插件，可以通过插件上下文对象的resolve方法，继续调用其它插件的 resolveId钩子，类似的还有load方法，这就大大增加了插件的灵活性。
