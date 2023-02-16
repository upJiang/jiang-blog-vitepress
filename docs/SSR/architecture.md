>一步步带领大家搭建整个项目架构
## 样式、模块化代码提示
Nextjs 已经提供了对 css 和 sass 的支持，只需要安装一下 `sass` 的依赖即可。
```
yarn add -D sass
```
修改 `next.config.js` 配置，自定义页面扩展名，项目将会打包指定后缀的文件为页面
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
