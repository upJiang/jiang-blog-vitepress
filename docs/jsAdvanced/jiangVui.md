>在我们平时开发中，我们都会用到组件库，比如vant、element、ant-design等，那我们是否有想过这个东西是怎么做出来的，自己能否也整一个。这篇文章将带大家详细的介绍组件库的开发，这里以vue3组件为例，建议跟着文章内容自己实现一遍。建议收藏~嘿嘿

## 初始化项目
创建文件夹jiang-vui，初始化
```
npm init -y
```

.gitignore
```
node_modules
lib
play/node_modules
docs/node_modules
```

.npmignore
```
packages/
node_modules/    
scripts/        
docs/            
play/            
scripts/         
.babelrc         
.eslintignore    
.eslintrc.js     
.gitignore       
.npmignore       
.prettierrc.js   
jest.config.js   
rollup.config.js 
yarn.lock        
test.html        
gulpfile.js      
README.md
```

package.json
```
{
  "name": "jiang-vui",
  "version": "0.0.0",
  "description": "jiangUI组件库",
  "main": "lib/jiang-ui.esm-browser.prod.js",
  "author": "shaonian",
  "license": "ISC",
  "private": false
  ...
}
```

## 编写组件
创建一个文件夹packages，该文件夹用于组件以及样式的编写，还有jest测试，每一个组件都是一个文件夹，组件文件夹下有src/xxx.vue，以及index.js用于注册组件，test用于jest测试(可以没有，看你喜欢)

目录结构：<br/>
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/48a40c3b01c441f48e37ce705912ad4a~tplv-k3u1fbpfcp-watermark.image)

依赖
```
yarn add vue@3.1.4
yarn add @vue/compiler-sfc@3.1.4
```
我们以button组件为例:

/packages/compoents/button/src/Button.vue
```
<template>
  <div class="main-container">
    <button class="button-container" @click="clickBack">{{ text }}</button>
  </div>
</template>

<script setup>
const emit = defineEmits(['submitCallback'])

const props = defineProps({
  text: { type: String, default: '提交' },
})

const clickBack = () => {
  console.log('点击提交')
  emit('submitCallback')
}
</script>

<style lang="scss" scoped>
.main-container {
  .button-container {
    padding: 8px 15px;

    background-color: #36c96d;
    border-width: 0px;
    border-radius: 2px;
    box-shadow: none;

    font-size: 14px;
    color: #fff;

    cursor: pointer;
  }
}
</style>
```
/packages/compoents/button/index.js 注册并导出组件
```
import MyButton from "./src/Button.vue";
MyButton.install = (app) => app.component("MyButton", MyButton);
export default MyButton;
```
/packages/compoents/index.js 将所有的组件install并导出
```
import MyButton from "./button/index"
import { version } from "../../package.json";

const components = [MyButton];

const install = (app, opts = {}) => {
    app.use(setupGlobalOptions(opts));
    components.forEach((component) => {
        app.use(component);
    });
};

const setupGlobalOptions = (opts = {}) => {
    return (app) => {
        app.config.globalProperties.$JIANG = {
            size: opts.size || "",
            zIndex: opts.zIndex || 2000,
        };
    };
};

const Jiang = {
    version,
    install,
};

export { MyButton, install };
export default Jiang;
```
## 集成VTU

安装依赖
```
yarn add jest -D
# 此版本这个⽀持Vue3.0
yarn add vue-jest@5.0.0-alpha.5 -D
yarn add babel-jest -D
yarn add @vue/compiler-sfc@3.0.2 -D
yarn add @vue/test-utils@next -D
yarn add typescript -D
```
/jest.config.js
```
module.exports = {
  testEnvironment: "jsdom", // 默认JSdom
  roots: ["<rootDir>/packages"], //
  transform: {
    "^.+\\.vue$": "vue-jest", // vue单⽂件
    "^.+\\js$": "babel-jest", // esm最新语法 import
  },
  moduleFileExtensions: ["vue", "js", "json", "jsx", "ts", "tsx", "node"],
  testMatch: ["**/__tests__/**/*.spec.js"],
  // 别名
  moduleNameMapper: {
    "^jiang-ui(.*)$": "<rootDir>$1",
  },
};
```
/packages/button/__tests__/Button.spec.js

```
此处是借鉴的，，测试用例懂的可以自己写，本人对这个还不是很会

import Button from "../Button.vue";
import { mount } from "@vue/test-utils";
it("content", () => {
    const Comp = {
        template: `<div><Button>默认按钮</Button></div>`,
    };
    const wrapper = mount(Comp, {
        global: {
            components: {
                Button,
            },
        },
    });
    expect(wrapper.findComponent({ name: "ElButton" }).text()).toContain(
        "默认按钮"
    );
});
```
/package.json
```
"test": "jest --runInBand", # 序列化执⾏   可以自己执行试试
```
## 集成babel跟rollup
为了打包组件，我们需要集成babel跟rollup
```
yarn add babel -D
yarn add babel-plugin-syntax-dynamic-import -D
yarn add babel-plugin-syntax-jsx -D
yarn add babel-preset-env -D
yarn add @babel/plugin-proposal-optional-chaining -D
yarn add @babel/preset-env -D
yarn add @vue/babel-plugin-jsx -D

yarn add rollup -D
yarn add rollup-plugin-peer-deps-external -D
yarn add rollup-plugin-scss -D
yarn add rollup-plugin-terser -D
yarn add rollup-plugin-vue -D
yarn add @rollup/plugin-node-resolve -D
yarn add @rollup/plugin-commonjs -D
yarn add @rollup/plugin-json -D
yarn add @rollup/plugin-replace -D
yarn add @rollup/plugin-babel -D
yarn add rollup-plugin-vue -D
```
/.babelrc
```
{
  "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]],
  "plugins": [
    "syntax-dynamic-import",
    ["@vue/babel-plugin-jsx"],
    "@babel/plugin-proposal-optional-chaining",
    "@babel/plugin-proposal-nullish-coalescing-operator"
  ],
  "env": {
    "utils": {
      "presets": [
        [
          "env",
          {
            "loose": true,
            "modules": "commonjs",
            "targets": {
              "browsers": ["> 1%", "last 2 versions", "not ie <= 8"]
            }
          }
        ]
      ],
      "plugins": [
        [
          "module-resolver",
          {
            "root": ["jiang-ui"],
            "alias": {
              "jiang-ui/src": "jiang-ui/lib"
            }
          }
        ]
      ]
    },
    "test": {
      "plugins": ["istanbul"],
      "presets": [["env", { "targets": { "node": "current" } }]]
    },
    "esm": {
      "presets": [["@babel/preset-env", { "modules": false }]]
    }
  }
}
```
## 使用rollup打包组件
/rollup.config.js 配置打包信息
```
import pkg from './package.json'
import vuePlugin from 'rollup-plugin-vue'
import scss from 'rollup-plugin-scss'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
const name = 'Jiang'
const createBanner = () => {
  return `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} kkb
  * @license MIT
  */`
}
const createBaseConfig = () => {
  return {
    input: "packages/compoents/index.js",
    external: ['vue'],
    plugins: [
      vuePlugin({
        css: true
      }),
      peerDepsExternal(),
      babel(),
      resolve({
        extensions: ['.vue', '.jsx']
      }),
      commonjs(),
      json(),
      scss()
    ],
    output: {
      sourcemap: false,
      banner: createBanner(),
      externalLiveBindings: false,
      globals: {
        vue: 'Vue'
      }
    }
  }
}
function mergeConfig(baseConfig, configB) {
  const config = Object.assign({}, baseConfig)
  // plugin
  if (configB.plugins) {
    baseConfig.plugins.push(...configB.plugins)
  }
  // output
  config.output = Object.assign({}, baseConfig.output, configB.output)
  return config
} function createFileName(formatName) {
  return `lib/jiang-ui.${formatName}.js`
}
//上面这个是设置打包后的输出目录
// es-bundle
const esBundleConfig = {
  plugins: [
    replace({
      __DEV__: `(process.env.NODE_ENV !== 'production')`
    })
  ],
  output: {
    file: createFileName('esm-bundler'),
    format: 'es'
  }
}
// es-browser
const esBrowserConfig = {
  plugins: [
    replace({
      __DEV__: true
    })
  ],
  output: {
    file: createFileName('esm-browser'),
    format: 'es'
  }
}
// es-browser.prod
const esBrowserProdConfig = {
  plugins: [
    terser(),
    replace({
      __DEV__: false
    })
  ],
  output: {
    file: createFileName('esm-browser.prod'),
    format: 'es'
  }
}
// cjs
const cjsConfig = {
  plugins: [
    replace({
      __DEV__: true
    })
  ],
  output: {
    file: createFileName('cjs'),
    format: 'cjs'
  }
}
// cjs.prod
const cjsProdConfig = {
  plugins: [
    terser(),
    replace({
      __DEV__: false
    })
  ],
  output: {
    file: createFileName('cjs.prod'),
    format: 'cjs'
  }
}
// global
const globalConfig = {
  plugins: [
    replace({
      __DEV__: true,
      'process.env.NODE_ENV': true
    })
  ],
  output: {
    file: createFileName('global'),
    format: 'iife',
    name
  }
}
// global.prod
const globalProdConfig = {
  plugins: [
    terser(),
    replace({
      __DEV__: false
    })
  ],
  output: {
    file: createFileName('global.prod'),
    format: 'iife',
    name
  }
}
// const formatConfigs = [
//   esBundleConfig,
//   esBrowserProdConfig,
//   esBrowserConfig,
//   cjsConfig,
//   cjsProdConfig,
//   globalConfig,
//   globalProdConfig
// ]

const formatConfigs = [
  globalConfig,
  esBrowserProdConfig
]
function createPackageConfigs() {
  return formatConfigs.map((formatConfig) => {
    return mergeConfig(createBaseConfig(), formatConfig)
  })
}
export default createPackageConfigs()
```
/package.json
```
"build": "rollup -c"
```
这个时候我们已经可以打包组件库啦！！！
执行命令后，我们可以在根目录下生成文件夹lib,并且已经有我们的组件代码了。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/daaa605fbb3b4ab7889aa3d62ce69267~tplv-k3u1fbpfcp-watermark.image)

## 测试组件
我们编写一个test.html来检查一下我们的组件是否能行吧

/test.html
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>组件测试界面</title>
    <script src="https://unpkg.com/vue@next"></script>
    <script src="lib/jiang-ui.global.prod.js"></script>
    <script>
      
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script>
      const { createApp } = Vue
      const MyComponent = {
        template: `
          <my-button />
        `,
      }
      createApp(MyComponent).use(Jiang).mount('#app')
    </script>
  </body>
</html>
```
运行结果：<br/>
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7689c5fac60b46ad9c30a5a0b42293b0~tplv-k3u1fbpfcp-watermark.image)

因为没有引入样式，所以没有样式效果哦。那么接下来我们来打包样式！

## 集成gulp
```
yarn add gulp -D 
yarn add gulp-autoprefixer -D 
yarn add gulp-sass -D 
yarn add gulp-cssmin -D 
yarn add cp-cli -D 
yarn add tslib -D 

添加sass
yarn add sass -D
yarn add sass-loader -D
```
## 打包样式
/gulpfile.js
```
const { series, src, dest } = require("gulp");
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const cssmin = require("gulp-cssmin");

function compile() {
  return src("./packages/styles/*.scss")
    .pipe(sass.sync())
    .pipe(
      autoprefixer({
        browsers: ["ie > 9", "last 2 versions"],
        cascade: false,
      })
    )
    .pipe(cssmin())
    .pipe(dest("./lib/styles"));
}

function copyfont() {
  return src("./packages/fonts/**").pipe(cssmin()).pipe(dest("./lib/fonts"));
}

exports.build = series(compile, copyfont);
```
这个时候我们回到/packages/styles,在这里写的样式，我们将进行打包输出，其实还有fonts，在这里不做演示

/packages/styles/compoents/Button.sass
```
.main-container {
  .button-container {
    padding: 8px 15px;

    background-color: #36c96d;
    border-width: 0px;
    border-radius: 2px;
    box-shadow: none;

    font-size: 14px;
    color: #fff;

    cursor: pointer;
  }
}
```
pagckage.json
```
"build:theme": "gulp build --gulpfile gulpfile.js"
```
执行命令后我们在lib目录可以看到：

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9fc3f74bef9d4cfcbecf35d494fa3c26~tplv-k3u1fbpfcp-watermark.image)

## 发布组件库
/scripts/publish.sh
```
#!/usr/bin/env bash
npm config get registry # 检查仓库镜像库
npm config set registry=http://registry.npmjs.org
echo '请进行登录相关操作：'
npm login # 登陆
echo "-------publishing-------"
npm publish # 发布
npm config set registry=https://registry.npm.taobao.org # 设置为淘宝镜像
echo "发布完成"
exit
```
package.json
```
"pub": "sh ./scripts/publish.sh"
```
当然你也可以手动操作npm login,因为登录过一次之后，之后是不需要重新登录的，可以直接npm publish,
每次发布之前记得改下版本号，以及build && build:theme打包一哈

## 在真实环境下使用
现在我们在vue3项目引入使用试试吧
```
yarn add jiang-vui
```
在main.ts中导入样式，或者在vue文件中导入也行
```
import  "jiang-vui/lib/styles/index.css";
```
在页面中使用
```
 <my-button @submitCallback="submitCallback"></my-button>
 
 import { MyButton } from "jiang-vui";
 const submitCallback = ()=>{
  console.log("组件库点击回调");
}
```
成功使用，并且样式，交互都没毛病，good!<br/>
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/723064023eea426cb0d42a95f48dc794~tplv-k3u1fbpfcp-watermark.image)

到此为止，其实最基础的组件库架子已经算是差不多做完了，后面会继续进行优化，添加组件！

## 集成eslint
```
yarn add eslint -D
yarn add eslint-formatter-pretty -D
yarn add eslint-plugin-json -D
yarn add eslint-plugin-prettier -D
yarn add eslint-plugin-vue -D
yarn add @vue/eslint-config-prettier -D
yarn add babel-eslint -D
yarn add prettier -D
```
/.eslintrc.js
```
module.exports = {
  "endOfLine":"auto",
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  globals: {
    ga: true,
    chrome: true,
    __DEV__: true,
  },
  extends: [
    "plugin:json/recommended",
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "@vue/prettier",
  ],
  parserOptions: {
    parser: "babel-eslint",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "prettier/prettier": "error",
  },
};
```
/.eslintignore
```
src/utils/popper.js
src/utils/date.js
examples/play
*.sh
node_modules
lib
coverage
*.md
*.scss
*.woff
*.ttf
src/index.js
dist
```
/.prettierrc.js
```
module.exports = {
  semi: false,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  endOfLine: 'auto',
  overrides: [
    {
      files: '*.scss',
      options: {
        parser: 'scss',
      },
    },
  ],
}
```
/package.json
```
"lint": "eslint --no-error-on-unmatched-pattern --ext .vue --ext .js --ext .jsx packages/**/ src/**/ --fix",
```
## 集成husky
/package.json
```
添加命令
"prepare": "husky install",
"commitlint": "commitlint --config commitlint.config.js -e -V"

下载依赖
yarn add @commitlint/cli -D
yarn add @commitlint/config-conventional -D
yarn add husky -D

添加husky
"husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E $HUSKY_GIT_PARAMS"
    }
}
```
执行yarn add husky 因为添加了prepare，所以会自动生成husky文件夹

添加pre-commit钩子
```
npx husky add .husky/pre-commit "npm run test"

并在pre-commit中写入邮箱的限制代码
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

EMAIL=$(git config user.email)
if [[ ! $EMAIL =~ ^[.[:alnum:]]+@qq\.com$ ]];
then
  echo "Your git information is not valid";
  echo "Please run:"
  echo '   git config --local user.name "<Your name in qq>"'
  echo '   git config --local user.email "<Your alias>@qq.com"'
  exit 1;
fi;
```
添加commit-msg钩子
```
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'

并在commit-msg写入commit代码时的规范限制
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run commitlint
```

## 编写组件库文档项目
>我们组件库是有了，但是也得有个文档吧，这里重点是使用markdown编写我们的文档项目。在根目录下新建docs文件夹


![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7da58f3a53334c6f8df6feb87f68b5f4~tplv-k3u1fbpfcp-watermark.image)

/package.json
```
{
    "name": "@jiang/docs",
    "version": "0.0.1",
    "private": true,
    "scripts": {
        "dev": "vite",
        "build": "vite build"
    },
    "dependencies": {
        "vue": "^3.2.8",
        "vue-router": "4"
    },
    "devDependencies": {
        "@vitejs/plugin-vue": "^1.6.0",
        "node-sass": "^6.0.1",
        "sass": "^1.39.0",
        "sass-loader": "^12.1.0",
        "vite": "^2.5.3",
        "vite-plugin-vuedoc": "^3.1.3",
        "@vue/compiler-sfc": "^3.0.5"
    }
}
```
/shims.d.ts
```
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
  }
  
  declare module '*.md' {
    import { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
  }
```
/tsconfig.json
```
{
    "compilerOptions": {
      "target": "esnext",
      "module": "esnext",
      "moduleResolution": "node",
      "strict": true,
      "jsx": "preserve",
      "sourceMap": true,
      "lib": ["esnext", "dom"],
      "types": ["vite/client"],
      "baseUrl": "."
    },
    "include": ["./shims.d.ts", "src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```
/index.html
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/jiang.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>组件库文档</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
/scripts/vitePluginSyncmd.ts
```
import { Plugin } from "vite";
import chokidar from "chokidar";
import path from "path";
import fs from "fs-extra";

function docFileName(path: string) {
  const ret = path.split("/__docs__/");
  if (ret.length === 2) {
    return ret;
  }
  return [null, null];
}

function syncdocServer({ root }) {
  const componentsDir = path.join(root, "../src/components");
  const docsPath = (file) => path.join(root, "src/__docs__", file);
  const watcher = chokidar.watch(`${componentsDir}/**/__docs__/*.md`);
  watcher
    .on("add", async (path) => {
      const [, file] = docFileName(path);
      if (file) {
        try {
          await fs.copy(path, docsPath(file));
        } catch (err) {
          console.error(err);
        }
      }
    })
    .on("change", async (path) => {
      const [, file] = docFileName(path);
      if (file) {
        try {
          await fs.copy(path, docsPath(file));
        } catch (err) {
          console.error(err);
        }
      }
    })
    .on("unlink", async (path) => {
      const [, file] = docFileName(path);
      if (file) {
        try {
          await fs.remove(docsPath(file));
        } catch (err) {
          console.error(err);
        }
      }
    });
}

function vitePluginSyncmd(): Plugin {
  return {
    name: "Syncmd",
    configureServer(server) {
      syncdocServer({ root: server.config.root });
    },
  };
}

export default vitePluginSyncmd;
```
/src/main.ts
```
import 'vite-plugin-vuedoc/style.css';
import { createApp } from 'vue';

import { router } from './router';
import App from './App.vue';

const app = createApp(App);

app.use(router);
app.mount('#app');
```
/src/router.ts
```
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import AppLayout from './components/AppLayout.vue'
import menus from './menus'

export const router = createRouter({
  history: createWebHistory(),
  strict: true,
  routes: [
    {
      path: '/',
      name: 'Layout',
      component: AppLayout,
      redirect: '/button',
      children: menus.reduce((prev, item) => {
        const _routes = item.items.map((i) => {
          console.log(i.component)
          return {
            path: `/${i.name.toLowerCase()}`,
            name: i.name,
            component: i.component,
          }
        })
        prev.push(..._routes)
        return prev
      }, [] as RouteRecordRaw[]),
    },
  ],
})
```
/src/menus.ts
```
import { Component } from 'vue'
import Button from './__docs__/Button.md'

type MenuItemType = {
  name: string
  component: (() => Promise<Component>) | Component
}
type MenuType = {
  title: string
  items: MenuItemType[]
}

export default [
  {
    title: 'Basic',
    items: [
      { name: 'Button', component: Button },
    ]
  }
] as MenuType[]
```
/src/App.vue
```
<template>
  <router-view />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'App',
  components: {}
})
</script>
```

/src/compoents/AppLayout.vue
```
<template>
  <div class="demo-layout">
    <div>
      <div class="demo-header">
        <div class="layout-center">
          <div align="middle">
            <div :flex="1">
              <!-- <Logo /> -->
            </div>
            <div>
              <div mode="vertical">
                <div>
                  <a href="https://github.com/upJiang" target="__blank">GitHub</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="layout-center">
          <div align="top" :wrap="false">
            <div :flex="'200px'">
              <div style="padding-top: 40px">
                <div mode="vertical" :current-path="route.path">
                  <template v-for="menu in menus" :key="menu.title">
                    <div :title="menu.title">
                      <div v-for="item in menu.items" :key="item" :path="`/${item.name.toLowerCase()}`">
                        {{ `${item.name}-jiang` }}
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div :flex="1">
              <div class="site-content">
                <router-view />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, reactive } from 'vue'
import { useRoute } from 'vue-router'
import menus from '../menus'

export default defineComponent({
  name: 'AppLayout',
  setup() {
    const route = useRoute()
    const data = reactive({

    })

    return {
      route,
      menus,
      data,
    }
  },
})
</script>
<style lang="scss">
.demo-layout {
  height: 100vh;
}
.layout-center {
  max-width: 1200px;
  width: 100vw;
  margin: 0 auto;
}
.site-content {
  width: 100%;
  padding: 20px;
  // max-width: 900px;
  margin: 0 auto;
}

.demo-aside {
  border-right: solid 1px #e6e6e6;
}
.demo-header {
  border-bottom: solid 1px #e6e6e6;
  // box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
```
使用markdown语法编写文档 /src/__docs__/Button.md
```
---
title: Button
wrapperClass: md-button
---

文档内容，可使用markdown语法~
```
packge.json
```
"docs:init": "cd ./docs && yarn ",
"docs": "cd ./docs && yarn dev"
```
项目启动后就可以看到使用md编写的页面效果（项目挺常规不想赘述太多）

## 编写组件库测试项目
>组件库编写完，其实我们直接打包之前，是可以直接引入组件路径来看看效果的，我们来加一个测试项目吧。在根目录下新增play文件夹

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89fbfc9fd80c4094bc30966c8b58896b~tplv-k3u1fbpfcp-watermark.image)

项目其实就是一个vue3.0 + vite的项目，没啥好说的，只是我们在页面中使用相对路径去测试我们编写的组件

/src/views/ButtonTest.vue
```
<template>
    <my-button></my-button>
</template>
<script lang="ts" setup>
import MyButton from '../../../packages/compoents/button/src/Button.vue'
</script>
```
/package.json
```
"play:init": "cd ./play && yarn",
"play": "cd ./play && yarn dev"
```
## 总结
这个项目以及这篇文章会持续更新迭代，其实一直都想尝试做个组件库，迟迟没有动手，这个项目也是借鉴了多方才弄出来的，其实对一些细节自己还不是很清楚。缘由是因为在开课吧里看了[全栈然叔](https://juejin.cn/user/1978776660216136)的工程化课程后，就有兴趣自己也弄一个组件库，跟着课程写了点，但是发布啥的都没介绍，样式打包也有问题。然后又借鉴了[手握手教你搭建组件库环境](https://segmentfault.com/a/1190000039920691)这篇文章，结合起来差不多把这个完成了，中间其实也踩了不少坑。

项目以及文章我都会持续更新的，其实我也只是个两年工作经验的菜鸟，希望可以一起进步。如果你都看到这里了，觉得有收获，写的还行的话，就点个赞收藏一下吧，如果你也是一个爱学习的前端，不妨点个关注！嘿嘿，代码可以下载下来跑跑。谢谢！！！

[项目代码地址](https://github.com/upJiang/jiangUI)



