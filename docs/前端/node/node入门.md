## 概念

**`Node.js` 不是语言，它只是 `JavaScript` 运行时环境**

**简而言之：`Node.js` 允许我们将 `js` 代码运行在服务端。**

## 应用场景

- 服务端开发：`Express、Koa、Midway、Egg`；
- 桌面应用：`Electron`、`NW.js`、线上应用 `VS Code`、飞书、新版 QQ；
- 移动应用：`React Native、Weex`；
- Web 开发：`Vue、React、Svelte` 等前端框架
- 构建工具：`webpack、Vite、Rollup`；
- CLI 工具：前端开发者常用的各种项目脚手架和工具，如
  ：`nodemon、whistle、http-server`；

## 在 vsCode 中调试

- 安装插件

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e66af2284d4411a96f9ce7ed4f37f44~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=684&h=233&s=31777&e=png&b=1e1e1e">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e66af2284d4411a96f9ce7ed4f37f44~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=684&h=233&s=31777&e=png&b=1e1e1e)</a>

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2f38e864c6c043e881b93df1489b0f7f~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=677&h=248&s=39128&e=png&b=1f1f1f">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2f38e864c6c043e881b93df1489b0f7f~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp#?w=677&h=248&s=39128&e=png&b=1f1f1f)</a>

- 新建项目，新建文件 `text.ts`

```
const hello = "Hello";
hello = '13'
console.log(hello);
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c32b5a7ca3834e20bed3271d488a9f06~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=433&h=90&s=5793&e=png&b=232121">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c32b5a7ca3834e20bed3271d488a9f06~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=433&h=90&s=5793&e=png&b=232121)</a>

## 模块系统

默认情况下 `Node.js` 会将 `.js` 后缀文件识别为 `CJS` 模块。

### CJS（CommonJS）

使用 `require` 和 `module.exports` 实现导入和导出。

#### 导出

```
module.exports = {
  hello: function() {
    console.log("Hello World!");
  },
  bye: function() {
    console.log("Goodbye World!");
  },
  userInfo: {
    name: 'forever',
    age: 18
  }
};
```

#### 导入

```
// 导入模块 "./exports" 中的 hello, userInfo 和 byebye，并赋值给相应的变量
const { hello, userInfo, byebye } = require('./exports')

// 导入模块 "./exports" 并将其赋值给变量 context
const context = require('./exports')
context.hello(context.userInfo.name)
```

### ESM（ECMAScript Modules）

要让 `Node.js` 正确识别 `ESM`，主要有两种方式：

- 使用 `.mjs` 作为文件后缀名 (例如 `hello.mjs`)；
- `package.json` 中 `type` 字段设置为 `module`。
  ```
      {
       "type":"module"
      }
  ```

#### 导出

```
export default {
  // 定义 hello 方法，输出欢迎信息
  hello(name) {
    console.log(`Hello, ${name}!`)
  },
  // 定义 byebye 方法，输出道别信息
  byebye(name) {
    console.log(`byebye, ${name}!`)
  },
  // 定义 userInfo 对象，存储用户信息
  userInfo: {
    name: 'forever', // 用户名
    age: 18 // 用户年龄
  }
}

// 定义 hello 方法，输出欢迎信息
export function hello(name) {
  console.log(`Hello, ${name}!`)
}

// 定义 byebye 方法，输出道别信息
export function byebye(name) {
  console.log(`byebye, ${name}!`)
}

// 定义 userInfo 对象，存储用户信息
export const userInfo = {
  name: 'forever', // 用户名
  age: 18 // 用户年龄
}
```

#### 导入

```
// 引入 export_named.js 中具名导出的模块
import { byebye, hello, userInfo as user } from './export_named.js'

import * as allValues from './export_all.js'
```

### 区别

#### 1. 语法

- **CommonJS**:

  - 导入: 使用 `require()`
  - 导出: 使用 `module.exports` 或 `exports`
  - 示例: `const lodash = require('lodash');`, `module.exports = someFunction;`

- **ECMAScript Modules**:
  - 导入: 使用 `import`
  - 导出: 使用 `export`
  - 示例: `import lodash from 'lodash';`, `export default someFunction;`

#### 2. 加载机制

- **CommonJS**:

  - 模块是同步加载的，通常用于服务器端 Node.js 环境。支持动态加载模块 (`require`
    语句可以出现在任意位置)；

- **ECMAScript Modules**:
  - 支持异步加载，适合用于浏览器环境。会在所有模块都加载完毕后才执行代码 (通常会
    将 `import` 导入语句放在模块的顶部)；

#### 3. 模块解析

- **CommonJS**:

  - 模块输出是一个值的拷贝。

- **ECMAScript Modules**:
  - 模块输出是实时的绑定，模块内部值变化时，引用该模块的文件中的值也会更新。

#### 4. 跨平台兼容性

- **CommonJS**:

  - 主要用于 Node.js，不原生支持浏览器。

- **ECMAScript Modules**:

#### 5. 文件命名

- 通常情况下模块一般都以 .js 结尾，通过 package.json 中 "type":"module" 区分模块
  类型，
- 实际上还可以通过文件命名来区分 .cjs 表明是 CJS 规范的模块，.mjs 表明是 ESM 规
  范的模块。

## global 全局对象
