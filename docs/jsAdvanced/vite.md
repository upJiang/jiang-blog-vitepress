## 概念
>基于esm（浏览器原生es Module的支持）
1. Vite，一个基于浏览器原生ES模块的开发服务器。利用浏览器去解析模块，在服务器端按需编译返回，完全跳过了打包这个概念，服务器随起随用。同时另有有Vue文件支持，还搞定了热更新，而且热更新的速度不会随着模块增加而变慢。
2. Vite要求项目完全由ES模块模块组成，common.js模块不能直接在Vite上使用。因此不能直接在生产环境中使用。在打包上依旧还是使用rollup等传统打包工具。
3. Vite的基本实现原理，就是启动一个koa服务器拦截浏览器请求ES模块的请求。通过路径查找目录下对应文件的文件做一定的处理最终以ES模块格式返回给客户端

## 实现步骤
首先启动一个koa服务器，对首页(index.html)、js文件、裸模块比如"vue"、vue文件等进行分别处理<br/>
1. 先返回index.html,然后再index.html中去加载main.js,在main.js中再去加载其它文件
2. 加载main.js中的裸模块，比如"vue",vite会通过预打包，将vue模块的内容打包到node_modules中，然后替换路径 <br/>
import {createApp} from 'vue' 转换成 import {createApp} from '/@modules/vue'<br/>
通过 /@modules标识去node_module中查找并返回相对地址<br/>
3. 加载vue文件，当Vite遇到一个.vue后缀的文件时使用vue中的compiler方法进行解析并返回。<br/>
由于.vue模板文件的特殊性，它被分割成三个模块（template，css，脚本模块）进行分别处理。最后放入script，template，css发送多个请求获取。

## 在vue中的文件执行顺序
localhost ==》 client(websocket) ==> main.js ==> env.js ==> vue.js(裸模块vue) ==> app.vue ==> 最后就是执行里面的路由，组件，ui库等
## 热更新原理
Vite的热加载原理，实际上就是在客户端与服务端建立了一个websocket链接，当代码被修改时，服务端发送消息通知客户端去请求修改模块的代码，完成热更新。<br/>
查看network,在localhost后会执行client文件，就是在这里建立webcocket实现热更新，然后再进入main.js
## 服务端原理
服务端做的就是监听代码文件的更改，在适当的时机向客户端发送websocket信息通知客户端去请求新的模块代码。
## 客户端原理
Vite的websocket相关代码在处理html中时被编写代码中

## 简单vite代码实现
/src/app.vue
```
<template>
  <div>{{ title }}</div>
</template>

<script>
import { ref } from "vue";
export default {
  setup() {
    const title = ref("hello, kvite!");
    return { title };
  },
};
</script>
```
src/main.js
```
import {createApp} from 'vue'
import App from "./app.vue"

createApp(App).mount('#app')
```
index.html
```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>kvite</title>
</head>

<body>
    <div id="app"></div>
    <script>
        window.process = {
            env:{
                NODE_ENV:'dev'
            }
        }
    </script>
    <script type="module" src="/src/main.js"></script>
</body>

</html>
```
kvite.js
```
const Koa = require('koa')
const app = new Koa()

const opn = require('opn');
const fs = require("fs")
const path = require("path")
const complierSFC = require('@vue/compiler-sfc') //引入vue文件的解析
const complierDOM = require('@vue/compiler-dom') //引入template的解析

// 中间件配置
// 处理路由
app.use(async (ctx) => {
  const {
    url,
    query
  } = ctx.request

  // 首页请求
  if (url === '/') {
    //加载index.html
    ctx.type = "text/html";
    ctx.body = fs.readFileSync(path.join(__dirname, "./index.html"), "utf8");
  } else if (url.endsWith('.js')) {
    // js文件加载处理
    const p = path.join(__dirname, url)
    ctx.type = 'application/javascript'
    ctx.body = rewriteImport(fs.readFileSync(p, 'utf8'))
  } else if (url.startsWith("/@modules/")) {
    //裸模块名称
    const moduleName = url.replace("/@modules/", "");
    //去node_modules目录中找
    const prefix = path.join(__dirname, "./node_modules", moduleName);
    //package.json中获取module字段
    const module = require(prefix + "/package.json").module;
    const filePath = path.join(prefix, module);
    const ret = fs.readFileSync(filePath, "utf8");
    ctx.type = 'application/javascript'
    ctx.body = rewriteImport(ret)
  } else if (url.indexOf('.vue') > -1) {
    //获取加载文件路径
    const p = path.join(__dirname, url.split("?")[0]);
    const ret = complierSFC.parse(fs.readFileSync(p, 'utf8')); // console.log(ret)  可以看到是一颗ast树，可以在终端中查看
    if (!query.type) {
      //SFC请求，读取vue文件，解析为js
      //获取脚本部分的内容
      const scriptContent = ret.descriptor.script.content;
      //替换默认导出为一个常量，方便后续修改
      const script = scriptContent.replace(
        "export default ",
        "const __script = "
      );
      ctx.type = 'application/javascript'
      ctx.body = `
        ${rewriteImport(script)}
        // 解析template
        import {render as __render} from '${url}?type=template'
        __script.render = __render
        export default __script
        `;
    } else if (query.type === "template") {
      const tpl = ret.descriptor.template.content;
      //编译为render
      const render = complierDOM.compile(tpl, {
        mode: "module"
      }).code;
      ctx.type = 'application/javascript'
      ctx.body = rewriteImport(render)
    }
  }
})

// 裸模块地址的重写
//在vite中对于vue这种裸模块是无法识别的，它通过预编译把需要的模块打包到node_modules中，再通过相对地址找到并加载，
//这里我们通过识别 /@modules 这种地址标识，去找寻模块，进行地址的替换
//import xx from "vue"  ==> import xx from "/@modules/vue"
function rewriteImport(content) {
  return content.replace(/ from ['"](.*)['"]/g, function (s1, s2) {
    if (s2.startsWith("./") || s2.startsWith("/") || s2.startsWith("../")) {
      return s1
    } else {
      //裸模块替换
      return ` from '/@modules/${s2}'`
    }
  })
}

app.listen(6666, () => {
  console.log('kvite start');
  opn(`http://localhost:6666/`);
})
```

[代码地址](https://github.com/upJiang/kvite)

[vite工作原理和手写实现视频地址](https://www.bilibili.com/video/BV1dh411S7Vz)

## vite在使用中的问题
qs对vite打包后好像不兼容 ，最后使用qs-stringfy

require模块不能使用，需要使用import.meta.glob
## vite插件

![Image.png](https://i.loli.net/2021/08/07/zAHP9tCeGvh5uFb.png)

![Image.png](https://i.loli.net/2021/08/07/2Ah6wpCXbKuPFe8.png)

插件案例 
```
/plugins/vite-plugin-my-example.ts

export default function myExample () {
    // 返回的是插件对象
    return {
      name: 'my-example', // 名称用于警告和错误展示
      // enforce: 'pre'|'post'
      // 初始化hooks，只走一次
      options(opts) {
        console.log('options', opts);
      },
      buildStart() {
        console.log('buildStart');
      },
      config(config) {
        console.log('config', config);
        return {}
      },
      configResolved(resolvedCofnig) {
        console.log('configResolved');
      },
      configureServer(server) {
        console.log('configureServer');
        // server.app.use((req, res, next) => {
        //   // custom handle request...
        // })
      },
      transformIndexHtml(html) {
        console.log('transformIndexHtml');
        return html
        // return html.replace(
        //   /<title>(.*?)<\/title>/,
        //   `<title>Title replaced!</title>`
        // )
      },
      // id确认
      resolveId ( source ) {
        if (source === 'virtual-module') {
          console.log('resolvedId', source);
          return source; // 返回source表明命中，vite不再询问其他插件处理该id请求
        }
        return null; // 返回null表明是其他id要继续处理
      },
      // 加载模块代码
      load ( id ) {
        if (id === 'virtual-module') {
          console.log('load');
          return 'export default "This is virtual!"'; // 返回"virtual-module"模块源码
        }
        return null; // 其他id继续处理
      },
      // 转换
      transform(code, id) {
        if (id === 'virtual-module') {
          console.log('transform');
        }
        return code
      },
    };
  }
```
```
vite.config.ts

import myExample from './plugins/vite-plugin-my-example'  //自定义插件

export default defineConfig({
  plugins: [vue(),
  myExample()
  ], //插件
})

//在项目运行时，可以看到插件钩子的执行
```

[vite插件开发指南视频地址](https://www.bilibili.com/video/BV1jb4y1R7UV)

[vitejs官网地址](https://vitejs.dev/)
