## 项目初始化
```
yarn create next-app --typescript

yarn dev
```

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00ba41a41f184c9c9fc09c6e148f9653~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00ba41a41f184c9c9fc09c6e148f9653~tplv-k3u1fbpfcp-watermark.image?)</a>

简单创建项目后：http://localhost:3000/

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
tsconfig.json 中我们也需要加一下对应的别名解析识别（baseurl , paths）。
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

## 目录改造
>这是基于我个人官网实战而得出的目录结构

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e222ffaa9b6748e3888c246d9b7c21fb~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e222ffaa9b6748e3888c246d9b7c21fb~tplv-k3u1fbpfcp-watermark.image?)</a>

接下来一步步把整个项目完善起来！！！

