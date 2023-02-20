>一步步带领大家搭建整个项目架构

## 部署打包、导出静态页面
>在开发中，为了减少上线后遇到的并发问题或者在开发中并没发现的奇葩问题，我们可以时不时打包出静态文件，在本地看一下效果。在引入组件库之前，这一步其实尤为重要。
### 安装 cross-env，区分环境变量
>cross-env：运行跨平台设置和使用环境变量的脚本
- 安装
```
yarn add -D cross-env
```
- 常规添加 `.env.development、.env.test、.env.production`,并写入配置。

**注意：nextjs 如果想在浏览器环境访问变量，意思就是除了构建时调用，还想在平时调用接口啥的使用，就必须添加前缀 `NEXT_PUBLIC_`，否则打包后将无法访问该变量**
```
NEXT_PUBLIC_HOST = https://junfeng530.xyz
```
- 添加打包脚本
```
"build": "cross-env NODE_ENV=test next build",
"export:test": "cross-env NODE_ENV=test next build && next export", // antdV5 在 test 环境打包样式丢失，暂未找到原因
"export:prod": "cross-env NODE_ENV=production next build && next export",
```
- 安装 http-server

全局安装 http-server，如果对 npm [管理安装依赖](https://juejin.cn/post/6998884224073744414)不熟悉的可以参考我的文章
```
npm install -g http-server
```

## 样式、模块化代码提示
Nextjs 已经提供了对 css 和 sass 的支持，只需要安装一下 `sass` 的依赖即可。

**这里 next 有个坑，如果版本超过 13.1.1 ，将会报错 unhandledRejection: Error: Cannot find module 'D:\nextjs\node_modules\next\dist\compiled\sass-loader/fibers.js'**
因此将 next 版本锁住降级 `yarn add next@13.1.1`。[问题导航](https://github.com/vercel/next.js/issues/45052)
```
yarn add -D sass
```
- 修改 `next.config.js` 配置，自定义页面扩展名，项目将会打包指定后缀的文件为页面
```
const path = require('path')

module.exports = {
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],  // 指定项目扩展名
  reactStrictMode: true,
  swcMinify: true,
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  },
}
```
- 我们把 `index.ts` 文件名换成 `index.page.tsx` ,`_app.tsx` 改成 `_app.page.tsx` 。修改 `index.page.tsx` 文件 
```
// @/pages/index.page.tsx
import styles from './home/index.module.scss'

export default function () {
  return <div className={styles.home}>官网实战</div>
}
```
此处应该 eslint 应该会报错：`组件缺少DisplayName`，.eslintrc.js 增加规则关闭此限制
```
'react/display-name': 'off'
```
- 修改一下 pages 目录

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df28268a9a354a29aeb7a0f055a81b61~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df28268a9a354a29aeb7a0f055a81b61~tplv-k3u1fbpfcp-watermark.image?)</a>

首页还是 index.page.tsx ，使用的是 home 目录下的文件，每个页面都有类似：`api.ts、index.module.scss、index.page.tsx、components` 等文件


- 添加样式代码提示
在页面我们只能使用 `模块化 .module.scss` 的方式去写样式，全局样式则放到 `@/styles` 文件目录下，并在 `_app.tsx` 中引入

修改配置 `next.config.js`
```
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["page.tsx", "page.ts", "page.jsx", "page.js"],
  reactStrictMode: true,
  images: {
    loader: "akamai",
    path: "/",
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === "object")
      .oneOf.filter((rule) => Array.isArray(rule.use));
    rules.forEach((rule) => {
      rule.use.forEach((moduleLoader) => {
        if (
          moduleLoader.loader !== undefined &&
          moduleLoader.loader.includes("css-loader") &&
          typeof moduleLoader.options.modules === "object"
        ) {
          moduleLoader.options = {
            ...moduleLoader.options,
            modules: {
              ...moduleLoader.options.modules,
              // This is where we allow camelCase class names
              exportLocalsConvention: "camelCase",
            },
          };
        }
      });
    });

    return config;
  },
};

module.exports = nextConfig;
```
这样，我们在页面中引入样式.module.scss 后，使用 styls. 就会有代码提示

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/01e2e784951645008034dbf34055624f~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/01e2e784951645008034dbf34055624f~tplv-k3u1fbpfcp-watermark.image?)</a>

## 响应式布局，适配双端，引入 antd、antd-mobilt
>使用 `px 转 vw` 加`媒体查询` 的方式实现响应式布局，引入 antd、antd-mobile` 实现双端的页面组件布局
### 响应式布局 px-vw
- 安装 postcss-px-to-viewport 
```
yarn add -D postcss-px-to-viewport
```
- 添加文件 postcss.config.js
```
module.exports = {
  plugins: {
    "postcss-px-to-viewport": {
      unitToConvert: "px", // 要转化的单位
      viewportWidth: 1920, // 设置成设计稿宽度
      unitPrecision: 5, // 转换后的精度，即小数点位数
      propList: ["*"], // 指定转换的css属性的单位，*代表全部css属性的单位都进行转换
      viewportUnit: "vw", // 指定需要转换成的视窗单位，默认vw
      fontViewportUnit: "vw", // 指定字体需要转换成的视窗单位，默认vw
      selectorBlackList: [], // 指定不转换为视窗单位的类名，
      minPixelValue: 1, // 默认值1，小于或等于1px则不进行转换
      mediaQuery: false, // 是否在媒体查询的css代码中也进行转换，默认false,这点可以用来写固定弹窗类的样式
      replace: true, // 是否转换后直接更换属性值
      exclude: undefined,  // 设置忽略文件，用正则做目录名匹配
      include: undefined,
      landscape: false, // 是否处理横屏情况
      landscapeUnit: "vw",
      landscapeWidth: 568,
    },
  },
};
```
可以看到单位已经被转换成 vw

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4e20e7c80ec34586af4488ae48d311b2~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4e20e7c80ec34586af4488ae48d311b2~tplv-k3u1fbpfcp-watermark.image?)</a>

### 媒体查询适配移动端
在 px 端的适配，我们有一些弹窗它本身就很小，并不需要响应式布局，我们可以通过 postcss 的  `mediaQuery` 特性，我们给样式添加一个媒体查询即可避开 vw 的转换

比如：
```
@media (min-width: 1px) {
}
```
其它适配移动端媒体查询就是常规用法~

### 引入pc端组件库 antd
最新版 antd5.0，采用 CSS-in-JS，CSS-in-JS 本身具有按需加载的能力，不再需要插件支持，`不再支持 babel-plugin-import`,
因此只需下载依赖，引入使用即可。[antd引入官网文档](https://ant.design/docs/react/use-with-create-react-app-cn)
- 安装
```
yarn add antd
```
- 为了兼容旧浏览器，比如在安卓微信中打开某些样式会失效，可以通过 @ant-design/cssinjs 的 StyleProvider 去除降权操作。修改 `_app.page.tsx`
```
import type { AppProps } from "next/app";
import "@/styles/globals.scss";
import { StyleProvider } from "@ant-design/cssinjs";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider locale={zhCN}>
        <Component {...pageProps} />
      </ConfigProvider>
    </StyleProvider>
  );
}
```
- 可以在 `@/_app.page.tsx` 引入antd默认样式文件
```
import 'antd/dist/reset.css';
```
- 在 `@/index.page.tsx`引入看下效果
```
import { Button } from "antd";
<Button type="primary">antd 按钮</Button>
```

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/852872c338014c1fa40525996f43f9db~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/852872c338014c1fa40525996f43f9db~tplv-k3u1fbpfcp-watermark.image?)</a>

- 这里可以打包看下打包的静态文件对 antd 的引入
```
yarn export:prod  // 执行yarn export:test 样式丢失
```
执行后在根目录会生成 out 文件夹，使用 http-server 查看一下，之后可以时不时打包看下模拟线上效果，避免上线爆发一些坑。

### 引入移动端组件库 antd-mobile
[antd-mobile ssr 引入文档地址](https://mobile.ant.design/zh/guide/ssr/)，
- 安装
```
yarn add antd-mobile
```
- 配置 next.config.js

方式一：此方式会有一堆警告
```
experimental: {
  transpilePackages: ["antd-mobile"],
},

```
方式二：建议用这个
```
yarn add -D next-transpile-modules

// 修改 next.config.js
const withTM = require('next-transpile-modules')([
  'antd-mobile',
]);
module.exports = withTM({
  // 你项目中其他的 Next.js 配置
});
```
- antd-mobile 应该避免使用 postcss-px-to-viewport 的转换，修改 `postcss.config.js`，将 node_modules 下的 antd-mobile 整个目录排除掉
```
exclude: [/antd-mobile/]
```
- antd-mobile 会自动按需加载，只需引入使用即可，在 `@/index.page.tsx`引入看下效果
```
import { Button as ButtonMobile } from "antd-mobile";
<ButtonMobile size="large" color="primary">
        antd-mobile 按钮
</ButtonMobile>
```
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a628e38507014173bcd5918a46d51dee~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a628e38507014173bcd5918a46d51dee~tplv-k3u1fbpfcp-watermark.image?)</a>

至此完成样式与组件库的引入。

## 引入 axios，配置 mock 以及本地代理
### 封装 axios
```
yarn add axios
```
- 新增工具文件夹，添加文件：`@/utils/request.ts`，写入
```
import { notification } from "antd";
import type { AxiosError, AxiosRequestConfig } from "axios";
import axios from "axios";

const instance = axios.create({
  timeout: 30 * 1000,
})

// 请求拦截
instance.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
)

// 响应拦截
instance.interceptors.response.use(
  res => {
    if (
      res.data.code !== undefined &&
      res.data.code !== 0 &&
      res.data.code !== 200 &&
      !(res.config as AxiosRequestConfig & { skipErrorHandler?: boolean }).skipErrorHandler
    ) {
      notification.error({
        message: '异常',
        description: res.data.msg || res.data.message,
      })
      return Promise.reject(res.data)
    }
    return Promise.resolve(res.data)
  },
  (error: AxiosError<{ code: number; message?: string; msg?: string }>) => {
    const { skipErrorHandler } = error.config as AxiosRequestConfig & {
      skipErrorHandler?: boolean
    }
    if (error.response?.status === 401 && !skipErrorHandler) {
      return
    }
    if (!skipErrorHandler) {
      notification.error({
        message: '异常',
        description: error.response?.data?.message || error.response?.data?.msg || error.message,
      })
    }
    return Promise.reject(error)
  }
)

type Request = <T = unknown>(
  config: AxiosRequestConfig & { skipErrorHandler?: boolean }
) => Promise<T>

export const request = instance.request as Request
```
### 搭建 mock 环境
- 根目录下新增 mock 文件夹，新增如下两个文件

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9f9c2263cdbf4ec4b7d14ee7b99e9c64~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9f9c2263cdbf4ec4b7d14ee7b99e9c64~tplv-k3u1fbpfcp-watermark.image?)</a>

```
// mock/data.json
{
    "indexStore": {
        "store": {
            "深圳": [
                {
                    "name": "坂田店",
                    "address": "福田街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                },
                {
                    "name": "坂田店",
                    "address": "福田街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                }
            ],
            "广州": [
                {
                    "name": "天河店",
                    "address": "天河街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                },
                {
                    "name": "天河店",
                    "address": "天河街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                }
            ],
            "佛山": [
                {
                    "name": "好地方店",
                    "address": "而得到街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                },
                {
                    "name": "好地方店",
                    "address": "而得到街道xxx",
                    "marker": [
                        114.294773,
                        22.587251
                    ]
                }
            ]
        },
        "seo": {
            "content": "坂田店、福田街道xxx、天河店、天河街道xxx、好地方店、而得到街道xxx"
        }
    }
}
``` 
```
// mock/routes.json
{
    "/api/*": "/$1"
}
```
- 安装 json-server
```
yarn add -D json-server
```
- 为了同时运行 mock 终端以及 next dev，我们安装 concurrently
```
yarn add -D concurrently
```
- 添加命令
```
dev:mock": "concurrently  \"yarn mock\" \"next dev\"",
"mock": "cd ./mock && json-server --watch data.json --routes routes.json --port 4000"
```
## 服务端获取接口数据
nextjs 提供 `getStaticProps` 方法让我们在项目构建时获取服务器的静态数据，注意该方法只在 build 时执行一次，数据必须是发布时更新的才使用这个，且必须是在页面级别上使用。
- 添加 `@/home/api.ts`
```
// @/home/api.ts
import { request } from "@/utils/request";

export interface IMockData {
  store: {
    [key: string]: {
      name: string;
      address: string;
      marker: number[];
    }[];
  };
  seo: string;
}

// 获取mock数据
export function fetchMockData() {
  return request<IMockData>({
    url: `${process.env.NEXT_PUBLIC_HOST}/api/indexStore`,
    method: "GET",
  });
}
```
- 修改 `index.page.tsx`
```
import { Button } from "antd";
import { Button as ButtonMobile } from "antd-mobile";

import { fetchMockData, IMockData } from "./home/api";
import styles from "./home/index.module.scss";

export default function (props: { mockData: IMockData }) {
  console.log("mockData", props.mockData);
  return (
    <div>
      <Button type="primary">antd 按钮</Button>
      <ButtonMobile color="primary">antd-mobile 按钮</ButtonMobile>
      <div className={styles["home-container"]}>官网实战</div>;
    </div>
  );
}

export async function getStaticProps() {
  // 获取门店列表
  const res = await fetchMockData();
  const mockData = res;

  return {
    props: { mockData },
  };
}
```
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d62305aad1a9471ba67e8b437f2de272~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d62305aad1a9471ba67e8b437f2de272~tplv-k3u1fbpfcp-watermark.image?)</a>

我们在终端控制台可以看到 mock 数据已被打印出来，之后我们就能在页面组件中通过 props 拿到它返回的数据，并可以传递给组件使用。

## 封装通用 Layout、SEOHEAD
### 新增组件
新增如下组件文件：

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a1c914f3d624e1b9e4f52017b0f3a75~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a1c914f3d624e1b9e4f52017b0f3a75~tplv-k3u1fbpfcp-watermark.image?)</a>

- `@/components/footer/index.tsx`
```
import styles from "./index.module.scss";

export default function () {
  return (
    <div id="footer" className={styles["footer-container"]}>
      底部
    </div>
  );
}
```
- `@/components/headSeo/index.tsx`
```
import Head from "next/head";

export default function (seo: {
  content: {
    keywords: string;
    description: string;
    title: string;
  };
}) {
  return (
    <Head>
      <meta charSet="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0;"
      />
      <meta name="keywords" content={seo.content.keywords} />
      <meta name="description" content={seo.content.description} />
      <meta name="robots" content="index, follow" />
      <meta name="applicable-device" content="pc,mobile" />
      <meta name="format-detection" content="telephone=no" />
      <title>{seo.content.title}</title>
    </Head>
  );
}
```
- `@/components/layout/index.tsx`
```
import Footer from "../footer";
import HeadSeo from "../headSeo";
import Navbar from "../navbar";

export default function Layout(props: {
  children: React.ReactNode;
  seo: {
    keywords: string;
    description: string;
    title: string;
  };
}) {
  return (
    <>
      <HeadSeo content={props.seo} />
      <Navbar />
      <main>{props.children}</main>
      <Footer />
    </>
  );
}
```
- `@/components/navbar/index.tsx`
```
import styles from "./index.module.scss";

export default function () {
  return (
    <div id="footer" className={styles["navbar-container"]}>
      头部
    </div>
  );
}
```
样式文件就不贴了，自行编写。

### 在页面级文件使用
- `@/index.page.tsx`，我们可以为每个页面都传入不同的 `headseo`，加到 `description` 标签中
```
import { Button } from "antd";
import { Button as ButtonMobile } from "antd-mobile";

import Layout from "../components/layout";
import type { IMockData } from "./home/api";
import { fetchMockData } from "./home/api";
import styles from "./home/index.module.scss";

export default function (props: { mockData: IMockData }) {
  console.log("mockData", props.mockData);
  const headSeo = {
    keywords: "sso、nextjs、antd、jiang",
    description: `seo实践 ${props.mockData.seo}`,
    title: "nextJs 官网 SSR 实战",
  };
  return (
    <Layout seo={headSeo}>
      <div>
        <Button type="primary">antd 按钮</Button>
        <ButtonMobile color="primary">antd-mobile 按钮</ButtonMobile>
        <div className={styles["home-container"]}>官网实战</div>;
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // 获取mock数据
  const res = await fetchMockData();
  const mockData = res;

  return {
    props: { mockData },
  };
}
```
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/77505b71c369414b82547dfbcd88b140~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/77505b71c369414b82547dfbcd88b140~tplv-k3u1fbpfcp-watermark.image?)</a>