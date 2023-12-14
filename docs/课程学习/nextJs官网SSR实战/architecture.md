[仓库地址](https://github.com/upJiang/next-ssr-website)

## 部署打包环境

> 在开发中，为了减少上线后遇到的并发问题或者在开发中并没发现的奇葩问题，我们可以
> 时不时打包出静态文件，在本地看一下效果。在引入组件库之前，这一步其实尤为重要。

- 安装 `cross-env`，区分环境变量，cross-env：运行跨平台设置和使用环境变量的脚本
- 安装依赖

```
yarn add -D cross-env
```

- 常规添加 `.env.development、.env.test、.env.production`，并写入配置。

**注意：nextjs 如果想在浏览器环境访问变量，意思就是除了构建时调用，还想在平时调
用接口啥的使用，就必须添加前缀 `NEXT_PUBLIC_`，否则打包后将无法访问该变量**

```
NEXT_PUBLIC_HOST = https://junfeng530.xyz
```

- 添加打包脚本

```
"build": "cross-env NODE_ENV=test next build",
"export:test": "cross-env NODE_ENV=test next build && next export",
"export:prod": "cross-env NODE_ENV=production next build && next export",
```

- 安装 http-server

全局安装
http-server，[npm 管理安装依赖教程地址](https://juejin.cn/post/6998884224073744414)

```
npm install -g http-server
```

- 查看静态文件

```
yarn export:test
cd out
http-server
```

## 样式、模块化代码提示

- 安装依赖 Nextjs 已经提供了对 css 和 sass 的支持，只需要安装一下 `sass` 的依赖
  即可。

**这里 next 有个坑，如果版本超过 13.1.1 ，将会报错 unhandledRejection: Error:
Cannot find module
'D:\nextjs\node_modules\next\dist\compiled\sass-loader/fibers.js'** 因此将 next
版本锁住降级
`yarn add next@13.1.1`。[问题导航](https://github.com/vercel/next.js/issues/45052)

```
yarn add -D sass
```

- `next.config.js` 配置，自定义页面扩展名，项目将会打包指定后缀的文件为页面

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

- `index.ts` 文件名换成 `index.page.tsx` ,`_app.tsx` 改成 `_app.page.tsx` 。

修改 `index.page.tsx`

```
// @/pages/index.page.tsx
import styles from './home/index.module.scss'

export default function () {
  return <div className={styles.home}>官网实战</div>
}
```

此处应该 eslint 应该会报错：`组件缺少DisplayName`，.eslintrc.js 增加规则关闭此限
制

```
'react/display-name': 'off'
```

- 修改一下 pages 目录

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df28268a9a354a29aeb7a0f055a81b61~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df28268a9a354a29aeb7a0f055a81b61~tplv-k3u1fbpfcp-watermark.image?)</a>

首页还是 `index.page.tsx` ，使用的是 home 目录下的文件，每个页面都有类似
：`api.ts、index.module.scss、index.page.tsx、components` 等文件

- 添加样式代码提示页面中只能使用 cssModule 的方式，全局样式放到 `@/styles` 文件
  目录下，并在 `_app.tsx` 中引入

- 安装 vscode 插件添加代码提示
  [CSS Modules](https://marketplace.visualstudio.com/items?itemName=clinyong.vscode-css-modules)

- 修改配置
  `next.config.js`，[兼容驼峰风格](https://stackoverflow.com/questions/74038400/convert-css-module-kebab-case-class-names-to-camelcase-in-next-js)

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

在页面中引入样式.module.scss 后，使用 styls. 就会有代码提示

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/01e2e784951645008034dbf34055624f~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/01e2e784951645008034dbf34055624f~tplv-k3u1fbpfcp-watermark.image?)</a>

## 响应式布局

- 安装 postcss-px-to-viewport

```
yarn add -D postcss-px-to-viewport
```

- postcss.config.js

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

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4e20e7c80ec34586af4488ae48d311b2~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4e20e7c80ec34586af4488ae48d311b2~tplv-k3u1fbpfcp-watermark.image?)</a>

## 媒体查询

在 px 端的适配，我们有一些弹窗它本身就很小，并不需要响应式布局，我们可以通过
postcss 的 `mediaQuery` 特性，我们给样式添加一个媒体查询即可避开 vw 的转换

比如：

```
@media (min-width: 1px) {
}
```

其它适配移动端媒体查询就是常规用法~

### 设备判断

> 如果根据服务器请求的 user-agent 请求头去判断设备，如果我们打开客户端没有请求那
> 么打包后将无法正确判断设备，推荐使用以下方式：

- 安装 `react-use`

```
yarn add react-use
```

- 封装 hooks 方法，`@/components/useDevice.ts`

```
import { useEffect, useState } from "react";
import { useWindowSize } from "react-use";

export const useDevice = () => {
  const [isMobile, setMobile] = useState(true);
  const size = useWindowSize();

  useEffect(() => {
    const userAgent =
      typeof window.navigator === "undefined" ? "" : navigator.userAgent;
    const mobile =
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
        userAgent,
      );
    setMobile(size.width <= 750 || mobile);
  }, [size.width]);

  return {
    isMobile,
  };
};
```

- `index.page.tsx`

```
import { useDevice } from "@/hooks/useDevice";

const { isMobile } = useDevice();

{!isMobile && <div>pc端布局</div>}
{isMobile && <div>移动端布局</div>}
```

## 引入 antd

> 最新版 antd5.0，采用 CSS-in-JS，CSS-in-JS 本身具有按需加载的能力，不再需要插件
> 支持，`不再支持 babel-plugin-import`, 因此只需下载依赖，引入使用即可
> 。[antd 引入官网文档](https://ant.design/docs/react/use-with-create-react-app-cn)

- 安装依赖

```
yarn add antd
```

- 为了兼容旧浏览器，比如在安卓微信中打开某些样式会失效，可以通过
  @ant-design/cssinjs 的 StyleProvider 去除降权操作。

`_app.page.tsx`

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

- `@/_app.page.tsx` 引入 antd 默认样式文件（可选）

```
import 'antd/dist/reset.css';
```

- `@/index.page.tsx`

```
import { Button } from "antd";
<Button type="primary">antd 按钮</Button>
```

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/852872c338014c1fa40525996f43f9db~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/852872c338014c1fa40525996f43f9db~tplv-k3u1fbpfcp-watermark.image?)</a>

- antdV5 打包 test 环境样式丢失，修改 `_document.page.tsx`
  ，[问题解决参考地址](https://github.com/ant-design/create-next-app-antd/blob/main/pages/_document.tsx)

```
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import Document, {
  DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) =>
          (
            <StyleProvider cache={cache}>
              <App {...props} />
            </StyleProvider>
          ),
      });

    const initialProps = await Document.getInitialProps(ctx);
    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          <style
            data-test="extract"
            dangerouslySetInnerHTML={{ __html: extractStyle(cache) }}
          />
        </>
      ),
    };
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

## 引入 antd-mobile

[antd-mobile ssr 引入文档地址](https://mobile.ant.design/zh/guide/ssr/)，

- 安装依赖

```
yarn add antd-mobile
```

- next.config.js

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

- antd-mobile 去除 `postcss-px-to-viewport` 的转换

`postcss.config.js`

```
exclude: [/antd-mobile/]
```

- antd-mobile 会自动按需加载，只需引入使用即可

`@/index.page.tsx`

```
import { Button as ButtonMobile } from "antd-mobile";
<ButtonMobile size="large" color="primary">
        antd-mobile 按钮
</ButtonMobile>
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a628e38507014173bcd5918a46d51dee~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a628e38507014173bcd5918a46d51dee~tplv-k3u1fbpfcp-watermark.image?)</a>

## 封装 axios

- 安装依赖

```
yarn add axios
```

- `@/utils/request.ts`

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

## 搭建 mock 环境

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

- 同时运行 mock 以及 next dev 两个终端，安装 concurrently

```
yarn add -D concurrently
```

- 添加命令

```
dev:mock": "concurrently  \"yarn mock\" \"next dev\"",
"mock": "cd ./mock && json-server --watch data.json --routes routes.json --port 4000"
```

## 服务端获取接口数据

> nextjs 提供 `getStaticProps` 方法让我们在项目构建时获取服务器的静态数据，注意
> 该方法只在 build 时执行一次，数据必须是发布时更新的才使用这个，且必须是在页面
> 级别上使用。

**mock 数据只能在本地调试使用，打包构建时记得切换**

- `@/home/api.ts`

```
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

// export function fetchMockData() {
//   return new Promise<IMockData>((resolve) => {
//     resolve({
//       store: {
//         深圳: [
//           {
//             name: "111",
//             address: "222",
//             marker: [11, 22],
//           },
//         ],
//       },
//       seo: "333",
//     });
//   });
// }
```

- `index.page.tsx`

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

// 静态生成 SSG ，往下会介绍  getStaticProps
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

我们在终端控制台可以看到 mock 数据已被打印出来，之后我们就能在页面组件中通过
props 拿到它返回的数据，并可以传递给组件使用。

## 封装通用 Layout

- 组件封装
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

- 我们可以为每个页面都传入不同的 `headseo`，加到 `description` 标签中，这样搜索
  引擎就可以爬取到我们这些信息。

`@/index.page.tsx

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

## 图片优化 `webp + cdn`

- 封装 useWebp hooks，`@/hooks/useWebp.ts`

```
import { useEffect, useState } from "react";

export const useWebp = () => {
  const [isSupportWebp, setIsSupportWebp] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supportWebp =
        window.document
          .createElement("canvas")
          .toDataURL("image/webp")
          .indexOf("data:image/webp") > -1;
      setIsSupportWebp(supportWebp);
    }
  }, []);

  return {
    isSupportWebp,
  };
};
```

- 封装 useOss hooks ，`@/hooks/useOss.ts`

```
import { useCallback } from "react";

import { useWebp } from "./useWebp";

export const useOSS = () => {
  const { isSupportWebp } = useWebp();
  const getOssImage = useCallback(
    (option: {
      originUrl: string;
      /**
       * @description 不支持 webp，降级处理宽度
       * @type {number}
       */
      notSupportWebpWidth?: number;
      /**
       * @description 不支持 webp，降级处理高度
       * @type {number}
       */
      notSupportWebpHeight?: number;
      width?: number; // 不使用 oss，正常传即可
      height?: number;
    }) => {
      let process = "";
      if ((option.notSupportWebpWidth && !isSupportWebp) || option.width) {
        process = `w_${option.notSupportWebpWidth || option.width},`;
      }
      if ((option.notSupportWebpHeight && !isSupportWebp) || option.height) {
        process = `${process}h_${
          option.notSupportWebpHeight || option.height
        },`;
      }
      if (process) {
        process = `x-oss-process=image/resize,m_fill,limit_0,${process},`;
      }

      if (isSupportWebp && process) {
        process = `${process}/format,webp`;
      }
      if (isSupportWebp && !process) {
        process = `x-oss-process=image/format,webp`;
      }
      return `${option.originUrl}?${process}`;
    },
    [isSupportWebp],
  );

  return { getOssImage };
};
```

- 封装 ossImage 组件，`@/components/OssImage/index.tsx`

```
/* eslint-disable react/require-default-props */
import { useOSS } from "@/hooks/useOss";

type Props = React.DetailedHTMLProps<
  React.ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
> & {
  notSupportWebpWidth?: number;
  notSupportWebpHeight?: number;
  ossWidth?: number;
  ossHeight?: number;
};

export default function (props: Props) {
  const { getOssImage } = useOSS();
  return (
    <img
      {...props}
      src={getOssImage({
        originUrl: props.src || "",
        notSupportWebpWidth: props.notSupportWebpWidth,
        notSupportWebpHeight: props.notSupportWebpHeight,
        width: props.ossWidth,
        height: props.ossHeight,
      })}
      loading="lazy"
    />
  );
}
```

- 在页面中使用 `index.page.tsx`

```
import OssImage from "@/components/OssImage";

 {/* 使用 oss，自动判断是否支持 webp*/}
<OssImage
  style={{
    background: "beige",
  }}
  src="https://img.alicdn.com/tfs/TB11B9iM7voK1RjSZPfXXXPKFXa-338-80.png"
  notSupportWebpWidth={338}
  notSupportWebpHeight={80}
></OssImage>
{/* 不使用 oss,正常传宽高*/}
<OssImage
  style={{
    background: "beige",
  }}
  src="https://img.alicdn.com/tfs/TB11B9iM7voK1RjSZPfXXXPKFXa-338-80.png"
  width={338}
  height={80}
></OssImage>
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b2ebad92cd5247488c207e6daf7076fe~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b2ebad92cd5247488c207e6daf7076fe~tplv-k3u1fbpfcp-watermark.image?)</a>

## 数据渲染

- next 会根据导出的函数来区分这个页面是哪种渲染，这两个函数
  （`getStaticProps`、`getServerSideProps`）**只能存在一个**
- 调用时机都是在浏览器渲染之前，也就是说没有 `document、window` 之类的对象，开发
  时，请在终端查看数据

### getStaticProps SSG (静态生成)

- 项目构建打包时调用，并生成 html（开发时是每次请求都更新），理解为写死了传到服
  务器上，想要更新请重新打包。
- 适用于不变的数据，能够做 seo
- 在页面中使用，`index.page.tsx`

```
// 静态 SSG
export async function getStaticProps() {
  // 获取mock数据
  const res = await fetchMockData();
  const mockData = res;

  return {
    props: { mockData },
  };
}
```

### getServerSideProps SSR (服务端渲染)

- 每次在服务器接收到请求时更新
- 适用于经常改变的数据，无法做 seo
- getServerSideProps 返回值除了可以设置 props 外还可以使用 `notFound` 来强制页面
  跳转到 404，或者是使用 `redirect` 来将页面重定向。

```
export async function getServerSideProps() {
  const data = await fetchMockData();
  console.log("data", data);

  if (!data) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    // return {
    //   notFound: true
    // };
    };
  }

  return {
    props: { data },
  };
}
```

## getStaticPaths 生成多页面

> 比如我们的项目有一个新闻页面，它需要做 seo，这样一个页面肯定无法满足，我们可以
> 通过 getStaticPaths 去生成多个页面，搭配 getStaticProps 去构造每个页面不同的页
> 面数据，文件名只需要使用 `[变量名].page.tsx`

- `@/static-path/[id].page.tsx`

```
export default function ({ post }: { post: string }) {
  return (
    <div>
      <h1>Post: {post}</h1>
    </div>
  );
}

export async function getStaticPaths() {
  const paths = new Array(10).fill(0).map((_, i) => ({
    params: { id: i + 1 + "" },
  }));

  console.log("paths", paths);
  return { paths, fallback: false };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
  // 在这里我们可以获取需要的数据，然后根据不同的 id 去返回到页面上
  console.log("params", params);
  return { props: { post: `post ${params.id}` } };
}
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6f6f4e5ab5e4eb09e06e12bc87234d9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6f6f4e5ab5e4eb09e06e12bc87234d9~tplv-k3u1fbpfcp-watermark.image?)</a>

## 总结

服务器部署自动上传可以参考[我的文章](https://juejin.cn/post/7077484161660878856)

至此初步的项目结构已经完成，本文将持续更新，后面将加入埋点、监控系统、后台管理系
统等，同时也会将尝试将自己的博客换成 ssr 方式。
