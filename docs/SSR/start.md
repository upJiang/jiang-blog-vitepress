## 官网开发的技术核心
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ed40a0e1bc1f4e058fc70014dd41ea15~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ed40a0e1bc1f4e058fc70014dd41ea15~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>
- 项目开发：官网与大部分 C 端网站一样，通常采用 SSR 来进行项目的开发，与 B 端应用的客户端渲染（简称：CSR）不同，原理上，更多的数据请求等逻辑需要放在服务器端完成，来保证 SEO 可以获取到站点的完整信息，进行更精准的引擎匹配和排行。
- 用户体验：官网是对外的形象站点，用户的体验和口碑会决定到外部对公司和团队的印象和信任程度，所以需要对性能有更多的要求。官网开发需要尽可能去优化站点首屏等指标，并且考虑到低网速，多媒体访问站点的情况，保证体验可以在多个场景下保持正常。
- 运营维护：一个站点上线后，运营会对站点进行后续的维护，尤其对于官网项目，经常会有实时的数据或是政策更新，所以针对官网应用我们需要保证官网数据的可灵活配置，最好可以提供一个额外的后台系统来协助运营。但是官网数据层相对比较简单，直接开发一个后台对于开发的成本是不小的，怎么平衡开发成本和配置效果，也是官网开发需要重点思考的问题。
- 部署流程：一个对外应用，有严格的备案流程，包括国家站点备案、公安备案等。同时我们还需要考虑集群相关资源的选择，合理地分配集群资源来达到成本和用户访问的平衡。不仅如此，还需要考虑 SEO 站点排行。给予对外站点足够的曝光和流量，才算是实现了官网开发的需求和初衷。

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2f21387dea0d41e6ad7b2279adcd1b7a~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2f21387dea0d41e6ad7b2279adcd1b7a~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

## 浏览器是怎么渲染一个页面的？
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f9d54b5db9484e0ca987580fec16f2c4~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f9d54b5db9484e0ca987580fec16f2c4~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

浏览器渲染一个网页，简单来说可以分为以下几个步骤：
- HTML 解析：在这个过程之前，浏览器会进行 DNS 解析及 TCP 握手等网络协议相关的操作，来与用户需要访问的域名服务器建议连接，域名服务器会给用户返回一个 HTML 文本用于后面的渲染 （这一点很关键，要注意）。
- 渲染树的构建：浏览器客户端在收到服务端返回的 HTML 文本后，会对 HTML 的文本进行相关的解析，其中 DOM 会用于生成 DOM 树来决定页面的布局结构，CSS 则用于生成 CSSOM 树来决定页面元素的样式。如果在这个过程遇到脚本或是静态资源，会执行预加载对静态资源进行提前请求，最后将它们生成一个渲染树。
<a data-fancybox title="img" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27c2a0c031ba4e9cbe55168392fc514c~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27c2a0c031ba4e9cbe55168392fc514c~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>
- 布局：浏览器在拿到渲染树后，会进行布局操作，来确定页面上每个对象的大小和位置，再进行渲染。
- 渲染：我们电脑的视图都是通过 GPU 的图像帧来显示出来的，渲染的过程其实就是将上面拿到的渲染树转化成 GPU 的图像帧来显示。首先浏览器会根据布局树的位置进行栅格化（用过组件库的同学应该不陌生，就是把页面按行列分成对应的层，比如 12 栅格，根据对应的格列来确定位置），最后得到一个合成帧，包括文本、颜色、边框等，最后将合成帧提升到 GPU 的图像帧，进而显示到页面中，就可以在电脑上看到我们的页面了。

**而服务器端渲染对 C 端 网站 的优势，主要也是在于它拿到的 HTML 不同。 这样的差异，会给 Web 应用带来不同的表现。**

## 易传播性： SSR爬虫精度更高
搜索引擎可以理解是一种`爬虫`，它会爬取指定页面的 HTML，并根据用户输入的关键词对页面内容进行排序检索，最后形成我们看到的结果。

页面渲染过程中，HTML 解析过程中从服务器端拉取的 HTML 并不是页面最终预期的结果，对于一些高级爬虫，会待页面渲染完成后进行页面数据的拉取和关键词匹配，但是也有一些低级爬虫，它们爬取的将是服务器端拉取的 HTML，那么**服务器端拉取下来的HTML中包含的实际页面关键词和数据越多，搜索引擎匹配的精度也会越高**。

SSR 会在服务器端完成对页面数据数据的请求，将对应数据注入 DOM 一同返回，会得到一个完整可预览的 HTML。以掘金首页举例，可以看到下图服务器端拉取的 HTML 是包含这个页面中所将展示的实际数据。
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aef693bd60eb4b9b945012677c204686~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/aef693bd60eb4b9b945012677c204686~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

而对于客户端渲染，数据的拉取将会在客户端完成，请求服务器拿到的 HTML 将是一个空的包含有执行脚本的 HTML，也就是说，客户端渲染页面的服务器响应的 HTML 并不包含页面中实际数据，也可以参考下图一个 B 端管理平台的 HTML 响应。
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c2141ea4cac4480087846dfab8e74150~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c2141ea4cac4480087846dfab8e74150~tplv-k3u1fbpfcp-zoom-in-crop-mark:3024:0:0:0.awebp?)</a>

服务器端渲染和客户端渲染的差异，决定了`服务器端渲染在 爬虫 关键词爬取的精准度上会远胜客户端渲染，使得站点更容易获得相关关键词更高的排名`。

## 交互稳定性： SSR 更高效
交互稳定性，这个也与服务器端渲染和客户端渲染的 HTML 差异有关。对于客户端渲染，实际的数据需要在执行脚本后请求数据后才可以得到，而对于服务器端渲染，数据请求的过程在在服务器端已经完成了，这就使得`服务器渲染将不再需要进行数据请求，可以拥有更短的首屏时间`。