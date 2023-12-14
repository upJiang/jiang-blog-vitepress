**输入 URL 发生了啥？**

- 1、浏览器的地址栏输入 URL 并按下回车。
- 2、浏览器查找当前 URL 是否存在缓存，并比较缓存是否过期。
- 3、DNS 解析 URL 对应的 IP。
- 4、根据 IP 建立 TCP 连接（三次握手）。
- 5、HTTP 发起请求。
- 6、服务器处理请求，浏览器接收 HTTP 响应。
- 7、渲染页面，构建 DOM 树。
- 8、关闭 TCP 连接（四次挥手）。

### 1. 浏览器应该具备什么功能？

- 1、网络：浏览器通过网络模块来下载各式各样的资源，例
  如`HTML文本，JavaScript代码，CSS样式表，图片，音视频文件等`。网络部分尤为重要
  ，因为它耗时长，而且需要安全访问互联网上的资源
- 2、资源管理：从网络下载，或者本地获取到的资源需要有`高效的机制`来管理他们。例
  如如何`避免重复下载，资源如何缓存等等`
- 3、网页浏览：这是浏览器的核心也是最`基本`的功能，最`重要`的功能。这个功能决定
  了如何将`资源转变为可视化`的结果
- 4、多页面管理
- 5、插件与管理
- 6、账户和同步
- 7、安全机制
- 8、开发者工具

浏览器的主要功能总结起来就是一句话:`将用户输入的url转变成可视化的图像`。

### 2. 浏览器的内核

在浏览器中有一个最重要的模块，它主要的作用
是`把一切请求回来的资源变成可视化的图像`，这个模块就是`浏览器内核`，通常他也被称
为`渲染引擎`。

下面是浏览器内核的总结：

- 1、IE：`Trident`
- 2、Safari：`WebKit`。WebKit 本身主要是由两个小引擎构成的，一个正是渲染引擎
  “WebCore”，另一个则是 javascript 解释引擎“JSCore”，它们均是从 KDE 的渲染引擎
  KHTML 及 javascript 解释引擎 KJS 衍生而来。
- 3、Chrome：`Blink`。在 13 年发布的 Chrome 28.0.1469.0 版本开始，Chrome 放弃
  Chromium 引擎转而使用最新的 Blink 引擎（基于 WebKit2——苹果公司于 2010 年推出的
  新的 WebKit 引擎），Blink 对比上一代的引擎精简了代码、改善了 DOM 框架，也提升
  了安全性。
- 4、Opera：2013 年 2 月宣布放弃 Presto，采用 Chromium 引擎，又转为`Blink`引擎
- 5、Firefox：`Gecko`

### 3. 进程和线程

- 1、进程：程序的一次执行，它占有一片独有的内存空间，是操作系统执行的基本单元
- 2、线程：是进程内的一个独立执行单元，是 CPU 调度的最小单元，程序运行的基本单元
- 3、一个进程中至少有一个运行的线程：主线程。它在进程启动后自动创建
- 4、一个进程可以同时运行多个线程，我们常说程序是多线程运行的，比如你使用听歌软
  件，这个软件就是一个进程，而你在这个软件里听歌，收藏歌，点赞评论，这就是一个进
  程里的多个线程操作
- 5、一个进程中的数据可以供其中的多个线程直接共享，但是进程与进程之间的数据是不
  能共享的
- 6、`JS引擎是单线程运行的`

### 4. 浏览器渲染引擎的主要模块

- 1、HTML 解析器：解释 HTML 文档的解析器，主要作用是将 HTML 文本解释为 DOM 树
- 2、CSS 解析器：它的作用是为 DOM 中的各个元素对象计算出样式信息，为布局提供基础
  设施
- 3、JavaScript 引擎：JavaScript 引擎能够解释 JavaScript 代码，并通过 DOM 接口和
  CSS 接口来修改网页内容 和样式信息，从而改变渲染的结果
- 4、布局（layout）：在 DOM 创建之后，WebKit 需要将其中的元素对象同样式信息结合
  起来，计算他们的大小位置等布局信息，形成一个能表达着所有信息的内部表示模型
- 5、绘图模块（paint）：使用图形库将布局计算后的各个网页的节点绘制成图像结果

### 5. 大致的渲染过程

渲染页面，构建 DOM 树，接下来说说大致的渲染过程

- 1、浏览器会从上到下解析文档
- 2、遇见 HTML 标记，调用`HTML解析器`解析为对应的 token(一个 token 就是一个标签
  文本的序列化)并构建 DOM 树(就是一块内存，保存着 tokens，建立他们之间的关系)
- 3、遇见 style/link 标记调用相应解析器处理 CSS 标记，并构建出`CSS样式树`
- 4、遇见 script 标记，调用`JavaScript引擎`处理 script 标记，绑定事件，修改 DOM
  树/CSS 树等
- 5、将 DOM 树与 CSS 合并成一个`渲染树`
- 6、根据渲染树来渲染，以计算每个节点的`几何信息`(这一过程需要依赖 GPU)
- 7、最终将各个节点`绘制`在屏幕上

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1eb78804efc444b3bf1ab49328540705~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1eb78804efc444b3bf1ab49328540705~tplv-k3u1fbpfcp-watermark.image?)</a>

### 6. CSS 阻塞情况以及优化

- 1、style 标签中的样式：由`HTML解析器`进行`异步解析`，加载一点 解析一点,容易产
  生“闪屏”现象，因此`不会阻塞浏览器渲染，不会阻塞DOM解析`
- 2、link 引入的 CSS 样式：由`CSS解析器`进行解析，`会阻塞浏览器渲染，会阻塞后面
  的 js 语句执行，不阻塞 DOM 的解析
- 3、优化：使用 CDN 节点进行外部资源加速，对 CSS 进行压缩，优化 CSS 代码(不要使
  用太多层选择器),减少 http 资源请求次数，多个 css 文件合并

注意：看下图，`HTML和CSS是并行解析`的，所以 CSS 不会阻塞 HTML 解析，但是，会阻塞
整体页面的渲染(因为最后要渲染必须 CSS 和 HTML 一起解析完并合成一处)

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1eb78804efc444b3bf1ab49328540705~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1eb78804efc444b3bf1ab49328540705~tplv-k3u1fbpfcp-watermark.image?)</a>

style：内联<br> 一进页面，就看见了盒子，这个盒子背景颜色 赤橙红绿青蓝紫 闪一遍，
最终颜色是紫色 （过程都看出来）

link：外链<br> 一进页面先空白，因为这个时候在请求资源、解析，等着 Stylesheet 解
析完了，统一渲染，盒子出来，背景颜色是紫色 （只看见结果）

### 7. JS 阻塞问题

- 1、`js会阻塞后续DOM的解析`，原因是：浏览器不知道后续脚本的内容，如果先去解析了
  下面的 DOM，而随后的 js 删除了后面所有的 DOM，那么浏览器就做了无用功，浏览器无
  法预估脚本里面具体做了什么操作，例如像 document.write 这种操作，索性全部停住，
  等脚本执行完了，浏览器再继续向下解析 DOM
- 2、`js会阻塞页面渲染`，原因是：js 中也可以给 DOM 设置样式，浏览器等该脚本执行
  完毕，渲染出一个最终结果，避免做无用功。
- 3、`js会阻塞后续js的执行`，原因是维护依赖关系，例如：必须先引入 jQuery 再引入
  bootstrap

### 8. 资源加载阻塞

无论 css 阻塞，还是 js 阻塞，`都不会阻塞浏览器加载外部资源`（图片、视频、样式、
脚本等）

原因：浏览器始终处于一种：`“先把请求发出去”`的工作模式，只要是涉及到网络请求的内
容，无论是：图片、样式、脚本，都会先发送请求去获取资源，至于资源到本地之后什么时
候用，由浏览器自己协调。这种做法效率很高。

### 9. 为什么 CSS 解析顺序从右到左

举个例子：【水果】代表根元素，能吃皮的算一类不能吃皮的算一类这代表子元素 ，苹果
香蕉 橘子代表子子元素。

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f28c68f3220b4c5ca6fcb8263c22a69e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f28c68f3220b4c5ca6fcb8263c22a69e~tplv-k3u1fbpfcp-watermark.image?)</a>
如果从【水果】也就是【左】方向开始找，我们就会找 3 次。但是如果从【橘子】开始找
，我们只需要一次就好了。

这是一个最简单的例子，根据这个例子我们也能看出
，`我们子元素只能有一个父元素，但是父元素可以有一堆子元素`，所以还是从子元素，也
就是【右】方向找会节约时间。

### 10. 什么是重绘回流

重排 > 重绘（回流）

- 1、重绘：重绘是一个`元素外观的改变`所触发的浏览器行为，例如改变 outline、背景
  色等属性。浏览器会根据元素的新属性重新绘制，使元素呈现新的外观。重绘不会带来重
  新布局，所以并不一定伴随重排。
- 2、回流：渲染对象在创建完成并添加到渲染树时，并不包含位置和大小信息
  。`计算这些值的过程称为布局或重排，或回流`
- 3、`"重绘"不一定需要"重排"`，比如改变某个网页元素的颜色，就只会触发"重绘"，不
  会触发"重排"，因为布局没有改变。
- 4、`"重排"大多数情况下会导致"重绘"`，比如改变一个网页元素的位置，就会同时触发"
  重排"和"重绘"，因为布局改变了

### 11. 触发重绘的属性

- color _ background _ outline-color _ border-style _ background-image _ outline
  _ border-radius _ background-position _ outline-style _ visibility _
  background-repeat _ outline-width _ text-decoration _ background-size _
  box-shadow

### 12. 触发回流的属性

- width _ top _ text-align _ height _ bottom _ overflow-y _ padding _ left _
  font-weight _ margin _ right _ overflow _ display _ position _ font-family _
  border-width _ float _ line-height _ border _ clear _ vertival-align _
  min-height _ white-space

### 13. 常见触发重绘回流的行为

- 1、当你增加、删除、修改 DOM 结点时，会导致 Reflow , Repaint。
- 2、当你移动 DOM 的位置
- 3、当你修改 CSS 样式的时候。
- 4、当你 Resize 窗口的时候（移动端没有这个问题，因为移动端的缩放没有影响布局视
  口)
- 5、当你修改网页的默认字体时。
- 6、获取 DOM 的 height 或者 width 时，例如
  clientWidth、clientHeight、clientTop、clientLeft、offsetWidth、offsetHeight、offsetTop、offsetLeft、scrollWidth、scrollHeight、scrollTop、scrollLeft、scrollIntoView()、scrollIntoViewIfNeeded()、getComputedStyle()、getBoundingClientRect()、scrollTo()

### 14. 针对重绘回流的优化方案

- 1、元素位置移动变换时尽量使用 CSS3 的`transform`来代替`top，left`等操作
- 2、不要使用`table`布局
- 3、将多次改变样式属性的操作`合并成一次操作`
- 4、利用`文档素碎片（documentFragment）`，vue 使用了该方式提升性能
- 5、动画实现过程中，启用`GPU硬件加速：transform:tranlateZ(0)`
- 6、为动画元素`新建图层`，提高动画元素的`z-index`
- 7、编写动画时，尽量使用`requestAnimationFrame`

### 15. 浏览器缓存分类

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/96af108a4ce148078df3aff85871b827~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/96af108a4ce148078df3aff85871b827~tplv-k3u1fbpfcp-watermark.image?)</a>

- 强缓存

  - 不会向服务器发送请求，直接从本地缓存中获取数据
  - 请求资源的的状态码为: 200 ok(from memory cache)
  - 优先级：cache-control > expires

- 协商缓存
  - 向服务器发送请求，服务器会根据请求头的资源判断是否命中协商缓存
  - 如果命中，则返回 304 状态码通知浏览器从缓存中读取资源
  - 优先级：`Last-Modified与ETag`是可以一起使用的，服务器会优先验证`ETag`，一致
    的情况下，才会继续比对`Last-Modified`，最后才决定是否返回 304

两者的共同点是，都是从客户端缓存中读取资源；区别是强缓存不会发请求，协商缓存会发
请求

**强缓存**

(1) expires<br> http1.0 时定义的字段，表示过期时间，格式如 expires: Mon, 29 Mar
2021 01:03:05 GMT ，表示在这个时间之前，如果客户端需要再次获取这个资源，不会向服
务器中取，会直接在缓存里读取。

(2) cache-control<br> http1.1 时的字段，表示缓存的时间长度，格式如
cache-control: max-age=2592000，单位为秒，表示可缓存的时间是 30 天。<br>
cache-contorl 还有其它一些可以设置的值<br> no-cache，表示不进行强缓存，但不影响
协商缓存<br> no-store，既不强缓存，也不协商缓存<br>

(3) 两者的优先级：cache-control 的优先级要高于 expires

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/81441c4ef83245eeb5302dc49adb9824~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/81441c4ef83245eeb5302dc49adb9824~tplv-k3u1fbpfcp-watermark.image?)</a>

**协商缓存**

(1) last-modified 与 if-modified-since<br> last-modified 表示该文件上一次被修改
的时间，格式如 last-modified: Tue, 04 Aug 2020 14:54:28 GMT，当客户端第一次向服
务器第一次请求时，服务器会在响应头上带上最后修改时间 last-modified，等到第二次客
户端向服务器请求同样的资源时，客户端会在请求头上的 if-modified-since 带上上一次
请求的 last-modifed 值，服务器对最后修改时间进行比较，如果时间一致，服务器返回
304 状态码，客户端直接在缓存中读取数据，如果不一致，服务器返回 200 的状态码，并
更新文件

(2) etag 与 if-none-match<br> etag 表示文件的唯一标识，格式如 etag:
"5f2976a4-17d"，当客户端第一次向服务器第一次请求时，服务器会在响应头上带上文件唯
一标识 etag，等到第二次客户端向服务器请求同样的资源时，客户端会在请求头上的
if-none-match 带上上一次请求的 etag 值，服务器对 etag 进行比较，如果时间一致，服
务器返回 304 状态码，客户端直接在缓存中读取数据，如果不一致，服务器返回 200 的状
态码，并更新文件

(3) 两者有什么区别呢？<br> etag 的出现时为了解决 last-modified 所存在的一些问
题<br> ① 当周期性的更改文件的时间，但是并没有更改文件的内容时，<br> ②
last-modifed 只能精确到秒，如果一个文件在 1 秒内更改了多次，那么无法更新到最新的
数据，而 etag 的精确度更高<br> ③ 某些服务器不能精确的得到文件的最后修改时间

(4) 两者如何使用<br> last-modified 与 etag 是可以一起使用的，服务器会优先验证
etag，一致的情况下，才会继续比对 last-modified，最后才决定是否返回 304

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49d914bd1db04a5783abad2eb561615b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49d914bd1db04a5783abad2eb561615b~tplv-k3u1fbpfcp-watermark.image?)</a>
