## 从 V8 看性能优化
JS 是编译型还是解释型语言其实并不固定。首先 JS 需要有引擎才能运行起来，无论是浏览器还是在 Node 中，这是解释型语言的特性。但是**在 V8 引擎下，又引入了 TurboFan 编译器，他会在特定的情况下进行优化，将代码编译成执行效率更高的 Machine Code**，当然这个编译器并不是 JS 必须需要的，只是为了提高代码执行性能，所以总的来说 JS 更偏向于解释型语言。

**如果一个函数被多次调用并且参数一直传入 固定类型，那么 V8 就会认为该段代码可以编译为 Machine Code，因为你固定了类型，不需要再执行很多判断逻辑了。**

- 可以通过 Audit 工具获得网站的多个指标的性能报告
- 可以通过 Performance 工具了解网站的性能瓶颈
- 可以通过 Performance API 具体测量时间
- 为了减少编译时间，我们可以采用减少代码文件的大小或者减少书写嵌套函数的方式
- 为了让 V8 优化代码，我们应该尽可能保证传入参数的类型一致。这也给我们带来了一个思考，这是不是也是使用 TypeScript 能够带来的好处之一

## 图片优化
#### 计算图片大小
对于一张 100 * 100 像素的图片来说，图像上有 10000 个像素点，如果每个像素的值是 RGBA 存储的话，那么也就是说每个像素有 4 个通道，每个通道 1 个字节（8 位 = 1个字节），所以该图片大小大概为 39KB（10000 * 1 * 4 / 1024）。

但是在实际项目中，一张图片可能并不需要使用那么多颜色去显示，我们可以通过减少每个像素的调色板来相应缩小图片的大小。

了解了如何计算图片大小的知识，那么对于如何优化图片，想必大家已经有 2 个思路了：
- 减少像素点
- 减少每个像素点能够显示的颜色

## 图片加载优化
- 不用图片。很多时候会使用到很多修饰类图片，其实这类修饰图片完全可以用 CSS 去代替。
- 对于移动端来说，屏幕宽度就那么点，完全没有必要去加载原图浪费带宽。一般图片都用 CDN 加载，可以计算出适配屏幕的宽度，然后去请求相应裁剪好的图片。
- 小图使用 base64 格式
- 将多个图标文件整合到一张图片中（雪碧图）
- 选择正确的图片格式：
    - 对于能够显示 WebP 格式的浏览器尽量使用 WebP 格式。因为 WebP 格式具有更好的图像数据压缩算法，能带来更小的图片体积，而且拥有肉眼识别无差异的图像质量，缺点就是兼容性并不好
    - 小图使用 PNG，其实对于大部分图标这类图片，完全可以使用 SVG 代替
    - 照片使用 JPEG

## DNS 预解析
DNS 解析也是需要时间的，可以通过预解析的方式来预先获得域名所对应的 IP。
```
<link rel="dns-prefetch" href="//yuchengkai.cn">
```

##  预加载
在开发中，可能会遇到这样的情况。有些资源不需要马上用到，但是希望尽早获取，这时候就可以使用预加载。

预加载其实是声明式的 `fetch` ，强制浏览器请求资源，并且不会阻塞 onload 事件，可以使用以下代码开启预加载
```
<link rel="preload" href="http://example.com">
```
预加载可以一定程度上降低首屏的加载时间，因为可以将一些不影响首屏但重要的文件延后加载，唯一缺点就是兼容性不好。

## 预渲染
可以通过预渲染将下载的文件预先在后台渲染，可以使用以下代码开启预渲染
```
<link rel="prerender" href="http://example.com"> 
```
预渲染虽然可以提高页面的加载速度，但是要确保该页面大概率会被用户在之后打开，否则就是白白浪费资源去渲染。

## 懒执行
懒执行就是将某些逻辑延迟到使用时再计算。该技术可以用于首屏优化，对于某些耗时逻辑并不需要在首屏就使用的，就可以使用懒执行。懒执行需要唤醒，一般可以通过`定时器或者事件的调用`来唤醒。

## 懒加载
懒加载就是将不关键的资源延后加载。

懒加载的原理就是`只加载自定义区域（通常是可视区域，但也可以是即将进入可视区域）内需要加载的东西`。对于图片来说，先设置图片标签的 src 属性为一张占位图，将真实的图片资源放入一个自定义属性中，当进入自定义区域时，就将自定义属性替换为 src 属性，这样图片就会去下载资源，实现了图片懒加载。

懒加载不仅可以用于图片，也可以使用在别的资源上。比如进入可视区域才开始播放视频等等。

## CDN
CDN 的原理是**尽可能的在各个地方分布机房缓存数据**，这样即使我们的根服务器远在国外，在国内的用户也可以通过国内的机房迅速加载资源。

因此，我们可以将静态资源尽量使用 CDN 加载，由于浏览器对于单个域名有并发请求上限，可以考虑使用多个 CDN 域名。并且对于 CDN 加载静态资源需要注意 CDN 域名要与主站不同，否则每次请求都会带上主站的 Cookie，平白消耗流量。

## Webpack 性能优化
- 有哪些方式可以`减少 Webpack 的打包时间`
- 哪些方式可以让 `Webpack 打出来的包更小`

### 减少 Webpack 打包时间
#### 优化 Loader
对于 Loader 来说，影响打包效率首当其冲必属 Babel 了。因为 Babel 会将代码转为字符串生成 AST，然后对 AST 继续进行转变最后再生成新的代码，项目越大，转换代码越多，效率就越低。当然了，我们是有办法优化的。

首先我们可以优化 Loader 的`文件搜索范围`
```
module.exports = {
  module: {
    rules: [
      {
        // js 文件才使用 babel
        test: /\.js$/,
        loader: 'babel-loader',
        // 只在 src 文件夹下查找
        include: [resolve('src')],
        // 不会去查找的路径
        exclude: /node_modules/
      }
    ]
  }
}
```
对于 Babel 来说，我们肯定是希望只作用在 JS 代码上的，然后 node_modules 中使用的代码都是编译过的，所以我们也完全没有必要再去处理一遍。

当然这样做还不够，我们还可以将 Babel 编译过的文件缓存起来，下次只需要编译更改过的代码文件即可，这样可以大幅度加快打包时间
```
loader: 'babel-loader?cacheDirectory=true'
```
#### HappyPack
受限于 Node 是单线程运行的，所以 Webpack 在打包的过程中也是单线程的，特别是在执行 Loader 的时候，长时间编译的任务很多，这样就会导致等待的情况。

`HappyPack 可以将 Loader 的同步执行转换为并行的`，这样就能充分利用系统资源来加快打包效率了
```
module: {
  loaders: [
    {
      test: /\.js$/,
      include: [resolve('src')],
      exclude: /node_modules/,
      // id 后面的内容对应下面
      loader: 'happypack/loader?id=happybabel'
    }
  ]
},
plugins: [
  new HappyPack({
    id: 'happybabel',
    loaders: ['babel-loader?cacheDirectory'],
    // 开启 4 个线程
    threads: 4
  })
]
```

#### DllPlugin
DllPlugin 可以`将特定的类库提前打包然后引入`。这种方式可以极大的减少打包类库的次数，只有当类库更新版本才有需要重新打包，并且也实现了将公共代码抽离成单独文件的优化方案。
```
// 单独配置在一个文件中
// webpack.dll.conf.js
const path = require('path')
const webpack = require('webpack')
module.exports = {
  entry: {
    // 想统一打包的类库
    vendor: ['react']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].dll.js',
    library: '[name]-[hash]'
  },
  plugins: [
    new webpack.DllPlugin({
      // name 必须和 output.library 一致
      name: '[name]-[hash]',
      // 该属性需要与 DllReferencePlugin 中一致
      context: __dirname,
      path: path.join(__dirname, 'dist', '[name]-manifest.json')
    })
  ]
}
```
然后我们需要执行这个配置文件生成依赖文件，接下来我们需要使用 DllReferencePlugin 将依赖文件引入项目中
```
// webpack.conf.js
module.exports = {
  // ...省略其他配置
  plugins: [
    new webpack.DllReferencePlugin({
      context: __dirname,
      // manifest 就是之前打包出来的 json 文件
      manifest: require('./dist/vendor-manifest.json'),
    })
  ]
}
```
#### 代码压缩
在 Webpack3 中，我们一般使用 `UglifyJS` 来压缩代码，但是这个是单线程运行的，为了加快效率，我们可以使用 webpack-parallel-uglify-plugin 来并行运行 UglifyJS，从而提高效率。

在 Webpack4 中，我们就不需要以上这些操作了，只需要将 mode 设置为 production 就可以默认开启以上功能。代码压缩也是我们必做的性能优化方案，当然我们不止可以压缩 JS 代码，还可以压缩 HTML、CSS 代码，并且在压缩 JS 代码的过程中，我们还可以通过配置实现比如删除 console.log 这类代码的功能。

#### 一些小的优化点 
我们还可以通过一些小的优化点来加快打包速度
- `resolve.extensions`：用来表明文件后缀列表，默认查找顺序是 ['.js', '.json']，如果你的导入文件没有添加后缀就会按照这个顺序查找文件。我们应该尽可能减少后缀列表长度，然后将出现频率高的后缀排在前面
- `resolve.alias`：可以通过别名的方式来映射一个路径，能让 Webpack 更快找到路径
- `module.noParse`：如果你确定一个文件下没有其他依赖，就可以使用该属性让 Webpack 不扫描该文件，这种方式对于大型的类库很有帮助

### 减少 Webpack 打包后的文件体积
#### 按需加载
想必大家在开发 SPA 项目的时候，项目中都会存在十几甚至更多的路由页面。如果我们将这些页面全部打包进一个 JS 文件的话，虽然将多个请求合并了，但是同样也加载了很多并不需要的代码，耗费了更长的时间。那么为了首页能更快地呈现给用户，我们肯定是希望首页能加载的文件体积越小越好，这时候我们就可以使用按需加载，将每个路由页面单独打包为一个文件。当然不仅仅路由可以按需加载，对于 loadash 这种大型类库同样可以使用这个功能。

按需加载的代码实现这里就不详细展开了，因为鉴于用的框架不同，实现起来都是不一样的。当然了，虽然他们的用法可能不同，但是底层的机制都是一样的。都是当使用的时候再去下载对应文件，返回一个 Promise，当 Promise 成功以后去执行回调。

#### Scope Hoisting
Scope Hoisting 会分析出模块之间的依赖关系，尽可能的把打包出来的模块合并到一个函数中去。

比如我们希望打包两个文件
```
// test.js
export const a = 1
// index.js
import { a } from './test.js'
```
对于这种情况，我们打包出来的代码会类似这样
```
[
  /* 0 */
  function (module, exports, require) {
    //...
  },
  /* 1 */
  function (module, exports, require) {
    //...
  }
]
```
但是如果我们使用 Scope Hoisting 的话，代码就会尽可能的合并到一个函数中去，也就变成了这样的类似代码
```
[
  /* 0 */
  function (module, exports, require) {
    //...
  }
]
```
这样的打包方式生成的代码明显比之前的少多了。如果在 Webpack4 中你希望开启这个功能，只需要启用 `optimization.concatenateModules` 就可以了。
```
module.exports = {
  optimization: {
    concatenateModules: true
  }
}
```

#### Tree Shaking
Tree Shaking 可以实现删除项目中未被引用的代码，比如
```
// test.js
export const a = 1
export const b = 2
// index.js
import { a } from './test.js'
```
对于以上情况，test 文件中的变量 b 如果没有在项目中使用到的话，就不会被打包到文件中。

如果你使用 Webpack 4 的话，开启生产环境就会自动启动这个优化功能。