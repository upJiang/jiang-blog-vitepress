<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c840271dc457409baa0ed1996f38ed04~tplv-k3u1fbpfcp-watermark.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c840271dc457409baa0ed1996f38ed04~tplv-k3u1fbpfcp-watermark.awebp)</a>

可移步到重学前端的sum_性能 

[这篇文章对性能优化的细节讲的很好](https://juejin.cn/post/6949896020788690958)

## OSS对象存储和CDN

**概念**<br>
oss: 对象存储将数据通道(需要访问的数据)和控制通路(元数据，即索引)分离，先根据索引(也就是元数据)找到数据存储的位置，进而通过底层的存储接口来访问数据。就是用来上传资源的，并且会为我们提供一些优化方案。

cdn:CDN(Content Delivery Network)是内容分发网络。基本思路就是在网络各处部署服务节点，系统实时地根据网络流量、负载状况、服务节点到用户的响应时间等信息，自动将用户请求到导向离用户最近的节点上。目的就是让用户就近取得数据，提高响应速度。就是给我们提供一个加速，把oss资源地址加到cdn中

对象存储的核心是存储，以及计算能力(图片处理)，CDN的核心是分发，本身不会给用户提供直接操作存储的入口，所以一般是两者配合使用。对象存储里面存的就是一些图片、视频、文件等等，都是静态数据，正好适合用CDN做加速。用户要做的就是购买CDN服务，并把静态数据URL添加到CDN的加速域名列表中。

CDN主要应用于站点加速，提高网站中静态数据的访问性能，比如图片、音频、视频、静态html网页等。网站静态数据以前一般是用文件存储的形式保存，现在则主要用对象存储。以图片存储为例，`简单说，对象存储是存图片的，CDN是加速下载图片的`。对象存储+CDN，已经成为互联网应用的一个必不可少的组成部分。

## webp 的使用
WebP 是由 Google 开发的一种新的图片格式，它支持有损压缩、无损压缩和透明度，压缩后的文件大小比 JPEG、PNG 等都要小。

WebP 为网络图片提供了无损和有损压缩能力，同时在有损条件下支持透明通道。据官方实验显示：无损 WebP 相比 PNG 减少26%大小；下相比JPEG减少25%~34%的大小；有损WebP也支持透明通道，大小通常约为对应 PNG 的1/3。

使用方法1：<br/>
使用 `<picture>` 标签，`<picture>` 是 H5 中的一个新标签，类似 `<video>` 它也可以指定多个格式的资源，由浏览器选择自己支持的格式进行加载。<br/>
```
<picture class="picture">
  <source type="image/webp" srcset="image.webp">
  <img class="image" src="image.jpg">
</picture>
```
如果浏览器不支持 WebP 格式，那么会自动使用 img 标签，如果支持就会使用 WebP 图片。并且当浏览器不支持 `<picture>` 标签时，也会默认使用 img 标签，图片仍然会正常展示。只不过 css 无法选取 `<picture>`标签，但是仍然会选取到 img 标签。<br>
这种方式兼容性还算不错，不过依然有很大的局限性，如不能作用于 css 中的图片、背景图片。

使用方法2：<br>
使用JS替换图片的URL，类似图片懒加载的原理，根据浏览器是否支持 WebP 格式，给 img 的 src 赋不同的值。<br>
具体的操作就是给浏览器一个 WebP 格式的图片，看浏览器是否能正确渲染，在这个异步的方法中根据渲染的成功与否，执行回调函数，然后将结果存储在localstorage中，避免重复检查。代码如下：
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
然后根据 checkWebp 的回调函数参数判断是否支持webp格式来决定是否替换src
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

[oss方式使用webp](https://www.zybuluo.com/hopefrontEnd/note/1317978)

## 性能优化的一些普通点
- 减少http请求，将小文件合并成成大文件。
- 使用http2。
- 使用服务端渲染。
- 静态资源使用cdn。
- css文件放头部，js放尾部。
- 使用iconfont代替图片图标。
- 使用fontmin-webpack压缩字体文件。
- 使用gzip压缩文件。
- 使用data-src实现图片懒加载，data-src放真实图片路径，src放默认图片，当图片到可视区域把真实图片赋值给src。
- 媒体查询替换图片，webp,使用css代替图片。
- 减少重绘重排，比如用class不要频繁改样式。
- 使用事件委托。
- vue打包优化：路由懒加载，通过注释指定webpackChunkName，自定义打包文件名。
- 分析打包的大小 npm run preview -- --report。
- webpack配置排除打包，externals。
- 打包去除console.log
- dns预查询`<link rel="dns-prefetch" href="https://fonts.googleapis.com/">` 