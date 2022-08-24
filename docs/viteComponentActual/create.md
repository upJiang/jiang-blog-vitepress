## 创建项目
>这个项目的包管理工作选择目前比较流行的 Pnpm 完成。选择 Pnpm ，首先是由于 Pnpm 优秀的管理机制，使得安装依赖非常迅速且节省空间。更重要的是，项目后期需要开发组件库的周边，比如 CLI 工具等。CLI工具以单独软件包的形式发布在 npm 仓库之中，这样的话，一个 Repo 多个软件包的项目结构需要使用 monorepo 风格进行管理。pnpm 拥有的 workspace 功能可以很好地完成这样的工作。

#### 从零开始自己搭建Vite项目
```
## 初始化项目
pnpm init

## 安装vite
pnpm i vite@"3.0.7" -D
```
#### 在根目录下新建index.html、src/index.ts，代码
```
##index.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Hello Smarty UI</h1>
    <script src="./src/index.ts" type="module"></script>
</body>
</html>

## src/index.ts
const s: string = 'Hello Typescript'
console.log(s)
```
vite `无需任何配置就可以提供一个Typescript 的前端开发环境，支持自动热更新`。

#### 在 package.json 添加脚本命令
```
"dev": "vite"
```
#### 运行 
```
pnpm run dev
```
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4aad652fe8214021a6b76075a1156ce6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4aad652fe8214021a6b76075a1156ce6~tplv-k3u1fbpfcp-watermark.image?)</a>

## 开发一个Vue组件
```
## 安装 Vue3.0 软件包
pnpm i vue@"3.2.37"
```
#### 编写一个简单的 Button 组件
```
##  /src/button/index.ts 

import { defineComponent, h } from "vue";

export default defineComponent({
  name: "SButton",
  // template:'<button>MyButton</button>'
  render() {
    return h("button", null, "MyButton");
  },
});
```
#### 在 src/index.ts 中启动 Vue 实例
```
import { createApp } from "vue";

import SButton from "./button";

createApp(SButton).mount("#app");
```
#### 在 index.html 中添加一个容器。
```
 <div id="app"></div>
 <script src="./src/index.ts" type="module"></script>
```
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/42a07e332f354127b5b3ffa3ab7ce9f8~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/42a07e332f354127b5b3ffa3ab7ce9f8~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

## 支持 Vue 单文件 (SFC) 组件
>Vue3.0 默认的包是不支持模板编译功能的，Vite 默认只能支持 TS 代码。而 Vue 的模板需要在编译阶段转换为 Typescript 代码 (渲染函数)才可以运行
#### 安装 Vite 的Vue插件
```
pnpm i @vitejs/plugin-vue@"3.0.3" -D
```
#### 添加一个 vite.config.ts
```
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/

export default defineConfig({

  plugins: [vue()],

});
```
#### 编写一个 SFC单文件组件
src/button/SFCButton.vue
```
<template>
  <button>SFC Button</button>
</template>

<script lang="ts">
export default {
  name: "SFCButton",
};
</script>
```
#### 引用到 index.ts 中测试一下。
```
import { createApp } from "vue";
import SFCButton from "./button/SFCButton.vue";

createApp(SFCButton)
.mount("#app");
```
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fc689ad964474b1a9f3521f0ec1d6b8b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fc689ad964474b1a9f3521f0ec1d6b8b~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

在引用 .vue 模块时候，编辑器中 import 语句会有红色的警告。这是因为Typescript 默认是不支持 .vue 类型的模块的。可以通过`添加一个模块的类型定义`来解决这个问题。

src/shims-vue.d.ts
```
declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
```

为避免报错，请使用16版本的node，[升级 node 参考文章](https://juejin.cn/post/6998884224073744414)

## 库文件封装
参考一下 Element 的使用指南。可以看到组件库有两种引入形态：
- 完整引入 ：一次性引入全部组件，使用 Vue.use 以 Vue 插件的形式引入；
- 按需引入 ：按需引入，导出单个组件，使用 Vue.component 注册。

```
import Vue from 'vue'
import Element from 'element-ui'

// 完整引入
Vue.use(Element)

// or 
import {
  Select,
  Button
  // ...

} from 'element-ui'

// 按需引入
Vue.component(Select.name, Select)
Vue.component(Button.name, Button)
```

#### 实现一个 Vue 插件，插件中编写 install 方法，将所有组件安装到 vue 实例中:
/src/entry.ts
```
import { App } from "vue";
import SFCButton from "./button/SFCButton.vue";

// 导出单独组件
export { SFCButton };

// 编写一个插件，实现一个install方法
export default {
  install(app: App): void {
    app.component(SFCButton.name, SFCButton);
  }
};
```
#### 默认 Vite 就是可以支持构建，使用 Vite 的 build 命令就可以打包输出。如果导出的是一个库文件的话，还需要配置【导出模块类型】并确定导出的文件名。配置如下:

vite.config.ts
```
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/

const rollupOptions = {

  external: ["vue", "vue-router"],
  output: {
    globals: {
      vue: "Vue",
    },
  },
};

export default defineConfig({
  plugins: [
    vue(),    // 添加JSX插件
  ],
  // 添加库模式配置
  build: {
    rollupOptions,
    minify:false,
    lib: {
      entry: "./src/entry.ts",
      name: "SmartyUI",
      fileName: "smarty-ui",
      // 导出模块格式
      formats: ["esm", "umd","iife"],
    },
  },
});
```
#### 添加一个 npm 运行脚本
package.json
```
  "scripts": {
    "build": "vite build"
  },
```
执行后可以看到新生成 dist 打包结果目录
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e950b72dcad545ef8474812d5b022178~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e950b72dcad545ef8474812d5b022178~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

## 测试
新增 demo 目录测试

测试加载全部组件：demo/esm/index.html
```
<h1>Demo</h1>
<div id="app"></div>
<script type="module">
    import { createApp } from "vue/dist/vue.esm-bundler.js";
    import SmartyUI, { SFCButton } from "../../dist/smarty-ui.esm.js";

    createApp({
        template: `
      <SFCButton/>
    `}).use(SmartyUI).mount('#app')

</script>
```
加载单独组件：demo/esm/button.html
```
<h1>Demo</h1>
<div id="app"></div>
<script type="module">
    import { createApp } from "vue/dist/vue.esm-bundler.js";
    import SmartyUI, {
        SFCButton
    } from "../../dist/smarty-ui.esm.js";

    createApp({
        template: `
<SFCButton/>
`,
    })
        .component(SFCButton.name, SFCButton)
        .mount("#app");
</script>
```
访问url： http://localhost:5173/demo/esm/index.html
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c119f99ecca74214b394bf1cc06f6675~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c119f99ecca74214b394bf1cc06f6675~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>
