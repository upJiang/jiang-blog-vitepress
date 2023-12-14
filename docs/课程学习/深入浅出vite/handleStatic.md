> 静态资源处理是前端工程经常遇到的问题，在真实的工程中不仅仅包含了动态执行的代码
> ，也不可避免地要引入各种静态资源，如`图片、JSON、Worker 文件、Web Assembly` 文
> 件等等。

而静态资源本身并不是标准意义上的模块，因此对它们的处理和普通的代码是需要区别对待
的。一方面我们需要解决资源加载的问题
，`对 Vite 来说就是如何将静态资源解析并加载为一个 ES 模块的问题`；另一方面在生产
环境下我们还需要考虑`静态资源的部署问题、体积问题、网络性能问题`，并采取相应的方
案来进行优化。

## 图片加载

### 配置 @ 路径

```
// vite.config.ts
resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'src')
      }
    ]
  },
```

## SVG 组件方式加载

SVG 组件加载在不同的前端框架中的实现不太相同，社区中也已经了有了对应的插件支持:
Vue2 项目中可以使用
[vite-plugin-vue2-svg](https://github.com/pakholeung37/vite-plugin-vue2-svg)插件
。 Vue3 项目中可以引入
[vite-svg-loader](https://github.com/jpkleemans/vite-svg-loader)。 React 项目使
用 [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr)插件。

#### 在 react 项目中添加依赖

```
pnpm i vite-plugin-svgr -D
```

#### 添加配置

```
// vite.config.ts
import svgr from 'vite-plugin-svgr';

{
  plugins: [
    // 其它插件省略
    svgr()
  ]
}
```

#### 在 tsconfig.json 添加配置，否则会有类型错误:

```
{
  "compilerOptions": {
    // 省略其它配置
    "types": ["vite-plugin-svgr/client"]
  }
}
```

#### 在代码中使用

```
import { ReactComponent as ReactLogo } from '@assets/icons/logo.svg';

export function Header() {
  return (
    // 其他组件内容省略
     <ReactLogo />
  )
}
```

## JSON 加载

Vite 中已经内置了对于 JSON 文件的解析，底层使用 `@rollup/pluginutils` 的
`dataToEsm` 方法将 `JSON` 对象转换为一个包含各种具名导出的 `ES` 模块，使用姿势如
下:

```
import { version } from '../../../package.json';
```

不过你也可以在配置文件禁用按名导入的方式:

```
// vite.config.ts

{
  json: {
    stringify: true
  }
}
```

这样会将 JSON 的内容解析为 `export default JSON.parse("xxx")`，这样会失去按名导
出的能力，不过在 JSON 数据量比较大的时候，可以优化解析性能。

## Web Worker 脚本

使用方式就是在引入文件那里添加 `?worker`

#### 新建 Header/example.js 文件:

```
const start = () => {
  let count = 0;
  setInterval(() => {
    // 给主线程传值
    postMessage(++count);
  }, 2000);
};

start();
```

在组件使用

```
import Worker from './example.js?worker';
// 1. 初始化 Worker 实例
const worker = new Worker();
// 2. 主线程监听 worker 的信息
worker.addEventListener('message', (e) => {
  console.log(e);
});
```

打开浏览器的控制面板，你可以看到 Worker 传给主线程的信息已经成功打印:

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8169a359598543d8a8959364913625af~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8169a359598543d8a8959364913625af~tplv-k3u1fbpfcp-watermark.image?)</a>)

## Web Assembly 文件

Vite 对于 .wasm 文件也提供了开箱即用的支持，我们拿一个斐波拉契的 `.wasm` 文件来
进行一下实际操作，对应的 JavaScript 原文件如下:

```
export function fib(n) {
  var a = 0,
    b = 1;
  if (n > 0) {
    while (--n) {
      let t = a + b;
      a = b;
      b = t;
    }
    return b;
  }
  return a;
}
```

在组件中导入 fib.wasm 文件:

```
// Header/index.tsx
import init from './fib.wasm';

type FibFunc = (num: number) => number;

init({}).then((exports) => {
  const fibFunc = exports.fib as FibFunc;
  console.log('Fib result:', fibFunc(10));
});
```

Vite 会对.wasm 文件的内容进行封装
，`默认导出为 init 函数，这个函数返回一个 Promise`，因此我们可以在其 then 方法中
拿到其导出的成员——fib 方法。

回到浏览器，我们可以查看到计算结果，说明 .wasm 文件已经被成功执行:<br>
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7478ef95b7a847fca740218262b411cd~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7478ef95b7a847fca740218262b411cd~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

## 其它静态资源

除了上述的一些资源格式，`Vite` 也对下面几类格式提供了内置的支持:

- 媒体类文件，包括 `mp4、webm、ogg、mp3、wav、flac和aac`。
- 字体类文件。包括 `woff、woff2、eot、ttf 和 otf`。
- 文本类。包括 `webmanifest、pdf和txt`。

也就是说，你可以在 Vite 将这些类型的文件当做一个 ES 模块来导入使用。如果你的项目
中还存在其它格式的静态资源，你可以通过 `assetsInclude` 配置让 Vite 来支持加载:

```
// vite.config.ts

{
  assetsInclude: ['.gltf']
}
```

## 特殊资源后缀

Vite 中引入静态资源时，也支持在路径最后加上一些特殊的 query 后缀，包括:

- ?url: 表示获取资源的路径，这在只想获取文件路径而不是内容的场景将会很有用。
- ?raw: 表示获取资源的字符串内容，如果你只想拿到资源的原始内容，可以使用这个后缀
  。
- ?inline: 表示资源强制内联，而不是打包成单独的文件。

## 生产环境处理

问题：

- 部署域名怎么配置？
- 资源打包成单文件还是作为 Base64 格式内联?
- 图片太大了怎么压缩？
- svg 请求数量太多了怎么优化？

### 配置 CDN 地址

```
// vite.config.ts
// 是否为生产环境，在生产环境一般会注入 NODE_ENV 这个环境变量，见下面的环境变量文件配置
const isProduction = process.env.NODE_ENV === 'production';
// 填入项目的 CDN 域名地址
const CDN_URL = 'xxxxxx';

// 具体配置
{
  base: isProduction ? CDN_URL: '/'
}

// .env.development
NODE_ENV=development

// .env.production
NODE_ENV=production
```

使用 env 变量需要在 src/vite-env.d.ts 增加类型声明:

```
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // 自定义的环境变量
  readonly VITE_IMG_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

值得注意的是，如果某个环境变量要在 Vite 中通过 import.meta.env 访问，那么它必须
以 VITE\_开头，如 VITE_IMG_BASE_URL。

### 单文件 or 内联？

在 Vite 中，所有的静态资源都有两种构建方式:

- 如果静态资源体积 >= 4KB，则提取成单独的文件
- 如果静态资源体积 < 4KB，则作为 base64 格式的字符串内联

对于比较小的资源，适合内联到代码中，一方面对代码体积的影响很小，另一方面可以减少
不必要的网络请求，优化网络性能。而对于比较大的资源，就推荐单独打包成一个文件，而
不是内联了，否则可能导致上 MB 的 base64 字符串内嵌到代码中，导致代码体积瞬间庞大
，页面加载性能直线下降。

上述的 `4 KB` 即为提取成单文件的临界值，当然，这个临界值你可以通过
`build.assetsInlineLimit` 自行配置，如下代码所示:

```
// vite.config.ts
{
  build: {
    // 8 KB
    assetsInlineLimit: 8 * 1024
  }
}
```

> svg 格式的文件不受这个临时值的影响，始终会打包成单独的文件，因为它和普通格式的
> 图片不一样，需要动态设置一些属性

### 图片压缩

在 JavaScript 领域有一个非常知名的图片压缩库 `imagemin`，作为一个底层的压缩工具
，前端的项目中经常基于它来进行图片压缩，比如 `Webpack` 中大名鼎鼎的
`image-webpack-loader`。社区当中也已经有了开箱即用的
`Vite 插件——vite-plugin-imagemin`，首先让我们来安装它:

```
pnpm i vite-plugin-imagemin -D
```

下载不下来需要在 package.json 添加：

```
"resolutions": {
    "bin-wrapper": "npm:bin-wrapper-china"
  }
```

在 Vite 配置文件中引入:

```
//vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

{
  plugins: [
    // 忽略前面的插件
    viteImagemin({
      // 无损压缩配置，无损压缩下图片质量不会变差
      optipng: {
        optimizationLevel: 7
      },
      // 有损压缩配置，有损压缩下图片质量可能会变差
      pngquant: {
        quality: [0.8, 0.9],
      },
      // svg 优化
      svgo: {
        plugins: [
          {
            name: 'removeViewBox'
          },
          {
            name: 'removeEmptyAttrs',
            active: false
          }
        ]
      }
    })
  ]
}
```

执行 pnpm run build 后，Vite 插件已经自动帮助我们调用 imagemin 进行项目图片的压
缩，可以看到压缩的效果非常明显：<br>
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7bf122b2f5c7447990f2ed502d8defba~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7bf122b2f5c7447990f2ed502d8defba~tplv-k3u1fbpfcp-watermark.image?)</a>

### 雪碧图优化

在实际的项目中我们还会经常用到各种各样的 svg 图标，虽然 svg 文件一般体积不大，但
Vite 中对于 svg 文件会始终打包成单文件，大量的图标引入之后会导致网络请求增加，大
量的 HTTP 请求会导致网络解析耗时变长，页面加载性能直接受到影响。这个问题怎么解决
呢？

> HTTP2 的多路复用设计可以解决大量 HTTP 的请求导致的网络加载性能问题，因此雪碧图
> 技术在 HTTP2 并没有明显的优化效果，这个技术更适合在传统的 HTTP 1.1 场景下使用(
> 比如本地的 Dev Server)。

比如在 Header 中分别引入 5 个 svg 文件:

```
import Logo1 from '@assets/icons/logo-1.svg';
import Logo2 from '@assets/icons/logo-2.svg';
import Logo3 from '@assets/icons/logo-3.svg';
import Logo4 from '@assets/icons/logo-4.svg';
import Logo5 from '@assets/icons/logo-5.svg';
```

#### 使用 import.meta.glob 批量导入

```
const icons = import.meta.glob('../../assets/icons/logo-*.svg');
```

<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bb4489676ca341689048f9595a8f0fae~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bb4489676ca341689048f9595a8f0fae~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

可以看到对象的 value 都是动态 import，适合按需加载的场景。在这里我们只需要同步加
载即可，可以使用 import.meta.globEager 来完成:

```
const icons = import.meta.globEager('../../assets/icons/logo-*.svg');
```

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/038367c43dad4c399e3d00597ae852e3~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/038367c43dad4c399e3d00597ae852e3~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

接下来我们稍作解析，然后将 svg 应用到组件当中:

```
// Header/index.tsx
const iconUrls = Object.values(icons).map(mod => mod.default);

// 组件返回内容添加如下
{iconUrls.map((item) => (
  <img src={item} key={item} width="50" alt="" />
))}
```

回到页面中，我们发现浏览器分别发出了 5 个 svg 的请求:
<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3646903dde814c6c8cb7097b93f98667~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3646903dde814c6c8cb7097b93f98667~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

### 通过 vite-plugin-svg-icons 合并 svg 请求

#### 安装依赖

```
pnpm i vite-plugin-svg-icons -D
```

#### 在 Vite 配置文件中增加如下内容:

```
// vite.config.ts
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

{
  plugins: [
    // 省略其它插件
    createSvgIconsPlugin({
      iconDirs: [path.join(__dirname, 'src/assets/icons')]
    })
  ]
}
```

#### 在 src/components 目录下新建 SvgIcon 组件:

```
// SvgIcon/index.tsx
export interface SvgIconProps {
  name?: string;
  prefix: string;
  color: string;
  [key: string]: string;
}

export default function SvgIcon({
  name,
  prefix = 'icon',
  color = '#333',
  ...props
}: SvgIconProps) {
  const symbolId = `#${prefix}-${name}`;

  return (
    <svg {...props} aria-hidden="true">1
      <use href={symbolId} fill={color} />
    </svg>
  );
}
```

#### src/main.tsx 文件中添加一行代码:

```
import 'virtual:svg-icons-register';
```

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/17497a3a9abe40d2a5145bca8d2041f6~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/17497a3a9abe40d2a5145bca8d2041f6~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp?)</a>

如此一来，我们就能将所有的 svg 内容都内联到 HTML 中，省去了大量 svg 的网络请求，
只请求一次。
