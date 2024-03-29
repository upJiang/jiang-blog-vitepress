> 使用 mock 模拟数据请求，在 vue3+vite 项目中我们将使用 vite-plugin-mock 插件来
> 实现

**1. 安装插件**

```
npm i mockjs -S
npm i vite-plugin-mock -D
```

**2. 配置 vite.config.ts**

```
import { viteMockServe } from 'vite-plugin-mock'
export default {
  plugins: [ viteMockServe({ supportTs: false }) ]
}
```

**3. 在项目根目录下创建 mock 文件夹，在 mock 文件夹下创建 test.ts**

```
/mock/test.ts

export default [
  {
    url: "/mock/getUser",
    method: "GET",
    response: () => {
      return {
        code: 0,
        message: "ok",
        result: ["jiang", "junfeng"],
      };
    },
  }
]
```

**4. 使用**

```
request({
   url: '/mock/getUser',
   method: "GET"
}).then((res)=>{

})
```

设置代理的情况下要增加配置，但使用方法是一样的：

新建一个.env.development 文件，写入 VITE_BASE_URL = "/gapi"

配置 axios 的 baseURL

```
axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  ...
})
```

在 vite.config.ts 中配置代理

```
//为了区分mock代理和服务器地址代理，建议设置两个，在mock的url中前面必须带有/mock
//'/gapi/mock'用于mock代理，'/gapi' 用于代理服务器地址
 server: {
    port: 8080,
    proxy: {
      '/gapi/mock': {
        target: 'http://localhost:8080/', //对mock进行代理，为了区别非mock的代理
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi/, '')
      },
      '/gapi': {
        target: 'https://blog.junfeng530.xyz/',  //我的博客地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gapi/, '')
      },
    },
    open: true,
  }
```
