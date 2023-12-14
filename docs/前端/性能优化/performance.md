<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c840271dc457409baa0ed1996f38ed04~tplv-k3u1fbpfcp-watermark.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c840271dc457409baa0ed1996f38ed04~tplv-k3u1fbpfcp-watermark.awebp)</a>

可移步到重学前端的 sum\_性能

[这篇文章对性能优化的细节讲的很好](https://juejin.cn/post/6949896020788690958)

## OSS 对象存储和 CDN

**概念**<br> oss: 对象存储将数据通道(需要访问的数据)和控制通路(元数据，即索引)分
离，先根据索引(也就是元数据)找到数据存储的位置，进而通过底层的存储接口来访问数据
。就是用来上传资源的，并且会为我们提供一些优化方案。

cdn:CDN(Content Delivery Network)是内容分发网络。基本思路就是在网络各处部署服务
节点，系统实时地根据网络流量、负载状况、服务节点到用户的响应时间等信息，自动将用
户请求到导向离用户最近的节点上。目的就是让用户就近取得数据，提高响应速度。就是给
我们提供一个加速，把 oss 资源地址加到 cdn 中

对象存储的核心是存储，以及计算能力(图片处理)，CDN 的核心是分发，本身不会给用户提
供直接操作存储的入口，所以一般是两者配合使用。对象存储里面存的就是一些图片、视频
、文件等等，都是静态数据，正好适合用 CDN 做加速。用户要做的就是购买 CDN 服务，并
把静态数据 URL 添加到 CDN 的加速域名列表中。

CDN 主要应用于站点加速，提高网站中静态数据的访问性能，比如图片、音频、视频、静态
html 网页等。网站静态数据以前一般是用文件存储的形式保存，现在则主要用对象存储。
以图片存储为例，`简单说，对象存储是存图片的，CDN是加速下载图片的`。对象存储
+CDN，已经成为互联网应用的一个必不可少的组成部分。

## webp 的使用

WebP 是由 Google 开发的一种新的图片格式，它支持有损压缩、无损压缩和透明度，压缩
后的文件大小比 JPEG、PNG 等都要小。

WebP 为网络图片提供了无损和有损压缩能力，同时在有损条件下支持透明通道。据官方实
验显示：无损 WebP 相比 PNG 减少 26%大小；下相比 JPEG 减少 25%~34%的大小；有损
WebP 也支持透明通道，大小通常约为对应 PNG 的 1/3。

使用方法 1：<br/> 使用 `<picture>` 标签，`<picture>` 是 H5 中的一个新标签，类似
`<video>` 它也可以指定多个格式的资源，由浏览器选择自己支持的格式进行加载。<br/>

```
<picture class="picture">
  <source type="image/webp" srcset="image.webp">
  <img class="image" src="image.jpg">
</picture>
```

如果浏览器不支持 WebP 格式，那么会自动使用 img 标签，如果支持就会使用 WebP 图片
。并且当浏览器不支持 `<picture>` 标签时，也会默认使用 img 标签，图片仍然会正常展
示。只不过 css 无法选取 `<picture>`标签，但是仍然会选取到 img 标签。<br> 这种方
式兼容性还算不错，不过依然有很大的局限性，如不能作用于 css 中的图片、背景图片。

使用方法 2：<br> 使用 JS 替换图片的 URL，类似图片懒加载的原理，根据浏览器是否支
持 WebP 格式，给 img 的 src 赋不同的值。<br> 具体的操作就是给浏览器一个 WebP 格
式的图片，看浏览器是否能正确渲染，在这个异步的方法中根据渲染的成功与否，执行回调
函数，然后将结果存储在 localstorage 中，避免重复检查。代码如下：

```
function checkWebp(callback) {
  var img = new Image();
  img.onload = function () {
    var result = (img.width > 0) && (img.height > 0);
    callback(result);
  };
  img.onerror = function () {
    callback(false);
  };
  img.src = 'data:image/webp;base64,lAABSoBAQVXD+JaQAUkRAQCA4ADsJAAdAIBYAUAAlGRAwAA3AAEAA';
}
```

然后根据 checkWebp 的回调函数参数判断是否支持 webp 格式来决定是否替换 src

```
function showImage(supWebp){
  var imgs = Array.from(document.querySelectorAll('img'));

  imgs.forEach(function(i){
    var src = i.attributes['data-src'].value;

	// 如果支持则替换
    if (supWebp){
      src = src.replace(/\.jpg$/, '.webp');
    }

    i.src = src;
  });
}

checkWebp(showImage);
```

[oss 方式使用 webp](https://www.zybuluo.com/hopefrontEnd/note/1317978)

## 性能优化的一些普通点

- 减少 http 请求，将小文件合并成成大文件。
- 使用 http2。
- 使用服务端渲染。
- 静态资源使用 cdn。
- css 文件放头部，js 放尾部。
- 使用 iconfont 代替图片图标。
- 使用 fontmin-webpack 压缩字体文件。
- 使用 gzip 压缩文件。
- 使用 data-src 实现图片懒加载，data-src 放真实图片路径，src 放默认图片，当图片
  到可视区域把真实图片赋值给 src。
- 媒体查询替换图片，webp,使用 css 代替图片。
- 减少重绘重排，比如用 class 不要频繁改样式。
- 使用事件委托。
- vue 打包优化：路由懒加载，通过注释指定 webpackChunkName，自定义打包文件名。
- 分析打包的大小 npm run preview -- --report。
- webpack 配置排除打包，externals。
- 打包去除 console.log
- dns 预查询`<link rel="dns-prefetch" href="https://fonts.googleapis.com/">`
