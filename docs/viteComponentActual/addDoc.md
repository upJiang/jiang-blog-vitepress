>使用 VitePress 建设文档

## 添加 VitePress 文档
- 引入 Vitepress 文档。
```
pnpm i vitepress@"0.22.4" -D
```
- 创建首页文档文档: 在代码根目录下新建 `docs/index.md`

- 增加启动脚本。
```
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs"
  }
}
```

运行 `pnpm run docs:dev`<br>
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02decc8c90a74a8fb81ab01bcf87cd52~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/02decc8c90a74a8fb81ab01bcf87cd52~tplv-k3u1fbpfcp-watermark.image?)</a>

## 配置菜单
>因为我们的博客就是使用的 VitePress，因此很多配置类似，不细写

新建 `docs/.vitepress/config.ts`
```
const sidebar = {
  '/': [
    { text: '快速开始', link: '/' },
    {
      text: '通用',
      children: [
        { text: 'Button 按钮', link: '/components/button/' },
      ]
    },
    { text: '导航' },
    { text: '反馈' },
    { text: '数据录入' },
    { text: '数据展示' },
    { text: '布局' },
  ]
}
const config = {
  themeConfig: {
    sidebar,
  }
}
export default config
```
- 重新运行生效：`pnpm run docs:dev`
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f3b8502b9b424af3949b6286fc6fa827~tplv-k3u1fbpfcp-watermark.image?)

## 组件 Demo 展示
>其实 markdown 是可以直接运行 html 代码的。而 Vitepress 中也含有 vue 实例，也就是说 vue 的代码也是可以直接运行的。唯一的问题就是如何将组件库加载。通过编写一个主题 theme 就可以获取 vue 实例。只需要在 enhanceApp 方法中注册组件库插件就可以了。

- 新建 `docs/.vitepress/theme/index.ts`
```
import Theme from 'vitepress/dist/client/theme-default'
import SmartyUI from '../../../src/entry'

export default {
  ...Theme,
  enhanceApp({ app }) {
    app.use(SmartyUI)
  },
}
```
- 加载组件库后，尝试在 markdown 中引用组件的代码。


```
  <div style="margin-bottom:20px;">
    <SButton color="blue">主要按钮</SButton>
    <SButton color="green">绿色按钮</SButton>
    <SButton color="gray">灰色按钮</SButton>
    <SButton color="yellow">黄色按钮</SButton>
    <SButton color="red">红色按钮</SButton>
  </div>
```