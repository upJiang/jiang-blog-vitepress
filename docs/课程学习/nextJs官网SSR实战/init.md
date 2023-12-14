## 项目初始化

- 创建项目

```
yarn create next-app --typescript
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00ba41a41f184c9c9fc09c6e148f9653~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00ba41a41f184c9c9fc09c6e148f9653~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c6dd46370f74343863096a10741d4d6~tplv-k3u1fbpfcp-watermark.image?">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7c6dd46370f74343863096a10741d4d6~tplv-k3u1fbpfcp-watermark.image?)</a>

## 配置别名

```
// next.config.js
const path = require("path");

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },
};
```

- tsconfig.json 中我们也需要加一下对应的别名解析识别（baseurl , paths）。

```
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@public/*": ["public/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

## 目录

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4bcf8748c6fc477c922072cde102d6cf~tplv-k3u1fbpfcp-watermark.image?)

[项目代码地址](https://github.com/upJiang/next-ssr-website)
