的模块代码分为两部分，

- 源代码，也就是`业务代码`，
- 第三方依赖的代码，即 `node_modules` 中的代码

vite 的 no-bundle `只是不打包业务代码`，对于第三方依赖而言，Vite 还是选择
bundle(打包)，并且使用速度极快的打包器 `Esbuild` 来完成这一过程，达到秒级的依赖
编译速度。

Vite 项目的启动可以分为两步

- 第一步是依赖预构建
- 第二步才是 Dev Server 的启动

## 预构建做了什么事情？

- **将其他格式(如 UMD 和 CommonJS)的产物转换为 ESM 格式**，使其在浏览器通过
  `<script type="module"><script>` 的方式正常加载。
- **打包第三方库的代码**，将各个第三方库分散的文件合并到一起，减少 HTTP 请求数量
  ，避免页面加载性能劣化。

而这两件事情全部由性能优异的 `Esbuild` (基于 Golang 开发)完成，而不是传统的
Webpack/Rollup，所以也不会有明显的打包性能问题，反而是 Vite 项目启动飞快(秒级启
动)的一个核心原因。

> ps: Vite 1.x 使用了 Rollup 来进行依赖预构建，在 2.x 版本将 Rollup 换成了
> Esbuild，编译速度提升了近 100 倍！

## 预构建的启用

- 默认情况下，Vite 会将 package.json 中生产依赖 `dependencies` 的部分启用依赖预
  编译，即会先对该依赖进行编译，然后将编译后的文件缓存在内存中
  （`node_modules/.vite` 文件下），在启动 `DevServer` 时直接请求该缓存内容。
- 在 `vite.config.js` 文件中配置 `optimizeDeps` 选项可以选择需要或不需要进行预构
  建的依赖的名称，Vite 则会根据该选项来确定是否对该依赖进行预构建。
- 在启动时添加 --force options，可以用来强制重新进行依赖预构建。

在 Vite 中有两种开启预构建的方式，分别是`自动开启`和`手动开启`。

### 自动开启

当我们在第一次启动项目的时候，可以在命令行窗口看见如下的信息:<br>
<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b9aec2d8edbb4ed0bf88497aab7dcffc~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b9aec2d8edbb4ed0bf88497aab7dcffc~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

同时，在项目启动成功后，你可以在根目录下的 node_modules 中发现.vite 目录，这就是
预构建产物文件存放的目录，内容如下:<br>
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f96e0f50748a4efb9cb227d45ffcec5d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f96e0f50748a4efb9cb227d45ffcec5d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

在浏览器访问页面后，打开 Dev Tools 中的网络调试面板，你可以发现第三方包的引入路
径已经被重写:

```
import React from "react";
// 路径被重写，定向到预构建产物文件中
import __vite__cjsImport0_react from "/node_modules/.vite/react.js?v=979739df";
const React = __vite__cjsImport0_react.__esModule
  ? __vite__cjsImport0_react.default
  : __vite__cjsImport0_react;
```

并且对于依赖的请求结果，Vite 的 Dev Server 会设置强缓存:<br>
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dec47fc8960041d296965d9fca660645~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dec47fc8960041d296965d9fca660645~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

缓存过期时间被设置为一年，表示缓存过期前浏览器对 react 预构建产物的请求不会再经
过 Vite Dev Server，直接用缓存结果。

当然，除了 HTTP 缓存，Vite 还设置了本地文件系统的缓存，所有的预构建产物默认缓存
在 `node_modules/.vite` 目录中。如果以下 3 个地方都没有改动，Vite 将一直使用缓存
文件:

- package.json 的 `dependencies` 字段
- 各种包管理器的 `lock` 文件
- `optimizeDeps` 配置内容

### 手动开启

上面提到了预构建中本地文件系统的产物缓存机制，而少数场景下我们不希望用本地的缓存
文件，比如需要调试某个包的预构建结果，我推荐使用下面任意一种方法清除缓存，还有手
动开启预构建:

- 1.删除 `node_modules/.vite` 目录。
- 2.在 Vite 配置文件中，将`server.force`设为`true`。
- 3.命令行执行 `npx vite --force` 或者 `npx vite optimize`。

> Vite 项目的启动可以分为两步，第一步是依赖预构建，第二步才是 Dev Server 的启动
> ，npx vite optimize 相比于其它的方案，仅仅完成第一步的功能。

### 自定义配置详解

Vite 将预构建相关的配置项都集中在 `optimizeDeps` 属性上

#### 入口文件——entries

自定义预构建的入口文件

在项目第一次启动时，Vite 会`默认抓取项目中所有的 HTML 文件`（如当前脚手架项目中
的 index.html），将 HTML 文件作为应用入口，然后根据入口文件扫描出项目中用到的第
三方依赖，最后对这些依赖逐个进行编译。

```
// vite.config.ts
{
  optimizeDeps: {
    // 为一个字符串数组
    entries: ["./src/main.vue"];
  }
}

// entries 配置也支持 glob 语法
entries: ["**/*.vue"];
```

不光是`.vue`文件，`Vite` 同时还支持各种格式的入口，包括:
`html、svelte、astro、js、jsx、ts和tsx`。可以看到，只要可能存在 `import`语句的地
方，Vite 都可以解析，并通过内置的扫描机制搜集到项目中用到的依赖，通用性很强。

#### 添加一些依赖——include

`include` 决定了可以强制预构建的依赖项

```
// vite.config.ts
optimizeDeps: {
  // 配置为一个字符串数组，将 `lodash-es` 和 `vue`两个包强制进行预构建
  include: ["lodash-es", "vue"];
}
```

某些情况下 Vite 默认的扫描行为并不完全可靠，这就需要联合配置 include 来达到完美
的预构建效果了。

- 运行时（动态）的 import

  ```
  // src/locales/zh_CN.js
  import objectAssign from "object-assign";
  console.log(objectAssign);

  // main.tsx
  const importModule = (m) => import(`./locales/${m}.ts`);
  importModule("zh_CN");
  ```

- 被 exclude 的包中，它的某个依赖的产物并没有提供 ESM 格式
  ```
  exclude: ["@loadable/component"],
  include: [
    // 间接依赖的声明语法，通过`>`分开, 如`a > b`表示 a 中依赖的 b
    "@loadable/component > hoist-non-react-statics",
  ];
  ```

### 自定义 Esbuild 行为

Vite 提供了`esbuildOptions` 参数来让我们自定义 Esbuild 本身的配置，常用的场景
是`加入一些 Esbuild 插件`:

```
// vite.config.ts
{
  optimizeDeps: {
    esbuildOptions: {
       plugins: [
        // 加入 Esbuild 插件
      ];
    }
  }
}
```

这个配置主要是处理一些特殊情况，如某个第三方包本身的代码出现问题了。如何解决呢？

#### 1. 改第三方库代码

使用 `patch-package` 这个库

- 它能记录第三方库代码的改动，
- 另一方面也能将改动同步到团队每个成员。

注意: 要改动的包在 package.json 中必须声明确定的版本，不能有~或者^的前缀。

```
# 1. 安装依赖
pnpm i @milahu/patch-package-with-pnpm-support -D

# 2. 自行修改第三方库代码

# 3. 关联第三方库，根目录会多出 patches 目录记录第三方包内容的更改
npx patch-package xxx(第三方库名)

# 4. 在package.json的scripts中增加如下内容：
{
  "scripts": {
    // 省略其它 script
    "postinstall": "patch-package"
  }
}
```

这样一来，每次安装依赖的时候都会通过 postinstall 脚本自动应用 patches 的修改，解
决了团队协作的问题。

#### 2. 加入 Esbuild 插件

第二种方式是通过 Esbuild 插件修改指定模块的内容下，新增的配置内容:

```
// vite.config.ts
const esbuildPatchPlugin = {
  name: "react-virtualized-patch",
  setup(build) {
    build.onLoad(
      {
        filter:
          /react-virtualized\/dist\/es\/WindowScroller\/utils\/onScroll.js$/,
      },
      async (args) => {
        const text = await fs.promises.readFile(args.path, "utf8");

        return {
          contents: text.replace(
            'import { bpfrpt_proptype_WindowScroller } from "../WindowScroller.js";',
            ""
          ),
        };
      }
    );
  },
};

// 插件加入 Vite 预构建配置
{
  optimizeDeps: {
    esbuildOptions: {
      plugins: [esbuildPatchPlugin];
    }
  }
}
```
