## 浏览器缓存机制
缓存可以说是性能优化中简单高效的一种优化方式了，它可以显著减少网络传输所带来的损耗:
- `强缓存`：让我们`直接使用缓存而不发起请求
- `协商缓存`：发起了请求但后端存储的数据和前端一致,那么就没有必要再将数据回传回来，这样就减少了响应数据。

通过以下几个部分来探讨浏览器缓存机制：
- 缓存位置
- 缓存策略
- 实际场景应用缓存策略

## 缓存位置
从缓存位置上来说分为四种，并且各自有优先级，当依次查找缓存且都没有命中的时候，才会去请求网络:
- Service Worker（F12 里面的 application 中可以看到）：
    - 浏览器背后的独立线程，一般可以用来实现缓存功能。使用 Service Worker的话，传输协议必须为 HTTPS。因为 Service Worker 中涉及到请求拦截，所以必须使用 HTTPS 协议来保障安全。
        - Service Worker 实现缓存功能一般分为三个步骤：首先需要先注册 Service Worker，然后监听到 install 事件以后就可以缓存需要的文件，那么在下次用户访问的时候就可以通过拦截请求的方式查询是否存在缓存，存在缓存的话就可以直接读取缓存文件，否则就去请求数据。
- Memory Cache：Memory Cache 也就是内存中的缓存，读取内存中的数据肯定比磁盘快。但是内存缓存虽然读取高效，可是缓存持续性很短，会随着进程的释放而释放。type 为 `script`
    - <a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/5/1677db8003dc8311~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/5/1677db8003dc8311~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>
- Disk Cache：存储在硬盘中的缓存，读取速度慢点，但是什么都能存储到磁盘中，比之 Memory Cache 胜在容量和存储时效性上。
- Push Cache：HTTP/2 中的内容，当以上三种缓存都没有命中时，它才会被使用。并且缓存时间也很短暂，只在会话（Session）中存在，一旦会话结束就被释放。
- 网络请求

## 缓存
通常浏览器缓存策略分为两种：`强缓存`和`协商缓存`，并且缓存策略都是通过`设置 HTTP Header` 来实现的。

### 强缓存：Cache-Control > Expires
强缓存可以通过设置两种 HTTP Header 实现：`Expires` 和 `Cache-Control` 。强缓存表示在缓存期间不需要请求，state code 为 `200`。

#### Expires
```
Expires: Wed, 22 Oct 2018 08:41:00 GMT
```
`Expires` 是 `HTTP/1` 的产物，表示资源会在 `Wed, 22 Oct 2018 08:41:00 GMT` 后过期，需要再次请求。并且 `Expires` **受限于本地时间**，如果修改了本地时间，可能会造成缓存失效。

#### Cache-control
```
Cache-control: max-age=30
```
Cache-Control 出现于 `HTTP/1.1`，`优先级高于 Expires` 。该属性值表示资源会在 30 秒后过期，需要再次请求。

Cache-Control 可以在请求头或者响应头中设置，并且可以组合使用多种指令

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/5/1677ef2cd7bf1bba~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/5/1677ef2cd7bf1bba~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/6/1678234a1ed20487~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/6/1678234a1ed20487~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

### 协商缓存：ETag > Last-Modified，由 if-xxx 发送 xxx 在服务器对比
如果`缓存过期了，就需要发起请求验证资源是否有更新`。协商缓存可以通过设置两种 HTTP Header 实现：`Last-Modified` 和 `ETag` 。

当浏览器发起请求验证资源时，如果资源没有做改变，那么服务端就会返回 304 状态码，并且更新浏览器缓存有效期。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/6/16782357baddf1c6~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/6/16782357baddf1c6~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

#### Last-Modified 和 If-Modified-Since
`HTTP/1.0` 的产物，`Last-Modified` 表示本地文件最后修改日期，If-Modified-Since 会将 Last-Modified 的值发送给服务器，服务器收到这个请求后，将 If-Modified-Since 和当前的 Last-Modified 进行对比。如果相等，则说明资源未修改，返回 304，浏览器使用本地缓存。

缺点：
- 最小单位是秒。也就是说如果我`短时间内资源发生了改变，Last-Modified 并不会发生变化`；
- 周期性变化。如果这个资源在一个周期内修改回原来的样子了，我们认为文件是没有变化的是可以使用缓存的，但是 Last-Modified 记录的是上次修改时间，即使文件没有变化，但修改时间变了，所以它认为缓存失效

因为以上这些弊端，所以在 HTTP / 1.1 出现了 `ETag` 。

#### ETag
Etag 一般是由`文件内容 hash 生成`的，也就是说它可以`保证资源的唯一性`，资源发生改变就会导致 Etag 发生改变。`ETag 优先级比 Last-Modified 高`。

同样地，在浏览器第一次请求资源时，服务器会返回一个 Etag 标识。当再次请求该资源时， 会通过 If-no-match 字段将 Etag 发送回服务器，然后服务器进行比较，如果相等，则返回 304 表示未修改。

### 实际场景应用缓存策略
#### 频繁变动的资源
对于频繁变动的资源，首先需要使用 `Cache-Control: no-cache` 使浏览器每次都请求服务器，然后配合 `ETag 或者 Last-Modified` 来验证资源是否有效。这样的做法虽然不能节省请求数量，但是能显著减少响应数据大小。

#### 代码文件
这里特指除了 HTML 外的代码文件，因为 HTML 文件一般不缓存或者缓存时间很短。

一般来说，现在都会使用工具来打包代码，那么我们就可以对文件名进行`哈希处理`，只有当代码修改后才会生成新的文件名。基于此，我们就可以给代码文件设置缓存有效期一年 `Cache-Control: max-age=31536000`，这样只有当 HTML 文件中引入的文件名发生了改变才会去下载最新的代码文件，否则就一直使用缓存。

## 存储
#### cookie，localStorage，sessionStorage，indexDB
这几种存储方式的区别:

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cee4e96d78c94f8788b1cfb721d53462~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cee4e96d78c94f8788b1cfb721d53462~tplv-k3u1fbpfcp-watermark.image?)</a>

可以看到，cookie 已经不建议用于存储。如果没有大量数据存储需求的话，可以使用 localStorage 和 sessionStorage 。对于不怎么改变的数据尽量使用 localStorage 存储，否则可以用 sessionStorage 存储。

对于 cookie 来说，我们还需要注意安全性。

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f52c4fc91c44f6d907fc3c948129660~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f52c4fc91c44f6d907fc3c948129660~tplv-k3u1fbpfcp-watermark.image?)</a>

## 浏览器渲染原理
>我们知道执行 JS 有一个 JS 引擎，那么执行渲染也有一个渲染引擎。同样，渲染引擎在不同的浏览器中也不是都相同的。比如在 Firefox 中叫做 `Gecko`，在 Chrome 和 Safari 中都是基于 `WebKit` 开发的。

### 浏览器接收到 HTML 文件并转换为 DOM 树
>当我们打开一个网页时，浏览器都会去请求对应的 HTML 文件。虽然平时我们写代码时都会分为 JS、CSS、HTML 文件，也就是字符串，但是计算机硬件是不理解这些字符串的，所以在网络中传输的内容其实都是 0 和 1 这些字节数据。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7069667fcf2f47f3a840ee1026dabfb2~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7069667fcf2f47f3a840ee1026dabfb2~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

- 当浏览器接收到这些字节数据以后，它会将这些`字节数据转换为字符串`，也就是我们写的代码。
- 当数据转换为字符串以后，浏览器会先将这些字符串`通过词法分析转换为标记（token）`，这一过程在词法分析中叫做`标记化`（tokenization）。标记还是字符串，是构成代码的最小单位。这一过程会将代码分拆成一块块，并给这些内容打上标记，便于理解这些最小单位的代码是什么意思。
    - <a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ea575740a2f4d0a9400779d56a70182~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2ea575740a2f4d0a9400779d56a70182~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>
- 当结束标记化后，这些`标记会紧接着转换为 Node`，最后这些 Node 会`根据不同 Node 之间的联系构建为一颗 DOM 树`。
    - <a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/af1ec0497504475287d7a11f988a9496~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/af1ec0497504475287d7a11f988a9496~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

### 将 CSS 文件转换为 CSSOM 树
<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/19955b165ff04d4c9c3117b23e832b6d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/19955b165ff04d4c9c3117b23e832b6d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

在这一过程中，浏览器会`确定下每一个节点的样式到底是什么`，并且这一过程其实是很消耗资源的。因为样式你可以`自行设置给某个节点，也可以通过继承获得`。在这一过程中，浏览器得递归 CSSOM 树，然后确定具体的元素到底是什么样式。

如果你有点不理解为什么会消耗资源的话，我这里举个例子
```
<div>
  <a> <span></span> </a>
</div>
<style>
  span {
    color: red;
  }
  div > a > span {
    color: red;
  }
</style>
```
对于第一种设置样式的方式来说，浏览器只需要找到页面中所有的 span 标签然后设置颜色，但是对于第二种设置样式的方式来说，浏览器首先需要找到所有的 span 标签，然后找到 span 标签上的 a 标签，最后再去找到 div 标签，然后给符合这种条件的 span 标签设置颜色，这样的递归过程就很复杂。所以我们应该`尽可能的避免写过于具体的 CSS 选择器，然后对于 HTML 来说也尽量少的添加无意义标签，保证层级扁平`。

### 生成渲染树
当我们生成 DOM 树和 CSSOM 树以后，就需要将这两棵树组合为渲染树。

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a71c46b79d364655ba35b9b87f6d133b~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a71c46b79d364655ba35b9b87f6d133b~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

在这一过程中，不是简单的将两者合并就行了。**渲染树只会包括需要显示的节点和这些节点的样式信息**，如果某个节点是 display: none 的，那么就不会在渲染树中显示。

当浏览器生成渲染树以后，就会根据渲染树来进行布局（也可以叫做回流），然后`调用 GPU 绘制`，`合成图层`，显示在屏幕上。

## 为什么操作 DOM 慢
因为 DOM 是属于渲染引擎中的东西，而 JS 又是 JS 引擎中的东西。当我们通过 JS 操作 DOM 的时候，其实这个操作涉及到了`两个线程之间的通信`，那么势必会带来一些性能上的损耗。操作 DOM 次数一多，也就等同于一直在进行线程之间的通信，并且操作 DOM 可能还会带来`重绘回流`的情况，所以也就导致了性能上的问题。

>经典面试题：插入几万个 DOM，如何实现页面不卡顿？
对于这道题目来说，首先我们肯定不能一次性把几万个 DOM 全部插入，这样肯定会造成卡顿，所以解决问题的重点应该是如何分批次部分渲染 DOM。大部分人应该可以想到通过 `requestAnimationFrame` 的方式去循环的插入 DOM，其实还有种方式去解决这个问题：`虚拟滚动（virtualized scroller）`。

**这种技术的原理就是只渲染可视区域内的内容，非可见区域的那就完全不渲染了，当用户在滚动的时候就实时去替换渲染的内容。**

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a3a4941c320147fe9f8fc96c4310ee82~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a3a4941c320147fe9f8fc96c4310ee82~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

从上图中我们可以发现，即使列表很长，但是渲染的 DOM 元素永远只有那么几个，当我们滚动页面的时候就会实时去更新 DOM

## 什么情况阻塞渲染
首先渲染的前提是`生成渲染树`，所以 **HTML 和 CSS 肯定会阻塞渲染**。如果你想渲染的越快，你越应该`降低一开始需要渲染的文件大小，并且扁平层级，优化选择器`。

然后当浏览器在解析到 `script` 标签时，会`暂停构建 DOM`，完成后才会从暂停的地方重新开始。也就是说，如果你想首屏渲染的越快，就越不应该在首屏就加载 JS 文件，这也是都建议将 script 标签放在 body 标签底部的原因。当然在当下，并不是说 script 标签必须放在底部，因为你可以给 script 标签添加 defer 或者 async 属性。
- defer: 当 script 标签加上 defer 属性以后，表示该 JS 文件会并行下载，但是会放到 HTML 解析完成后顺序执行，所以对于这种情况你可以把 script 标签放在任意位置。
- async: 对于没有任何依赖的 JS 文件可以加上 async 属性，表示 JS 文件下载和解析不会阻塞渲染。

## 重绘（Repaint）和回流（Reflow）
重绘和回流会在我们设置节点样式时频繁出现，同时也会很大程度上影响性能。
- 重绘: 当节点需要`更改外观而不会影响布局`的，比如改变 color 就叫称为重绘
- 回流: 布局或者`几何属性`需要改变就称为回流。

**回流必定会发生重绘，重绘不一定会引发回流**。回流所需的成本比重绘高的多，改变父节点里的子节点很可能会导致父节点的一系列回流。

以下几个动作可能会导致性能问题：
- 改变 window 大小
- 改变字体
- 添加或删除样式
- 文字改变
- 定位或者浮动
- 盒模型

重绘和回流其实也和 Eventloop 有关：<br>
当 Eventloop 执行完 Microtasks(微任务) 后，会判断 document 是否需要更新，因为浏览器是 60Hz 的刷新率，每 16.6ms 才会更新一次。然后判断是否有 resize 或者 scroll 事件，有的话会去触发事件，所以 resize 和 scroll 事件也是至少 16ms 才会触发一次，并且自带节流功能。

如果在一帧中有空闲时间，就会去执行 requestIdleCallback 回调，并做以下事情：
- 判断是否触发了 media query
- 更新动画并且发送事件
- 判断是否有全屏操作事件
- 执行 requestAnimationFrame 回调
- 执行 IntersectionObserver 回调，该方法用于判断元素是否可见，可以用于懒加载上，但是兼容性不好
- 更新界面

## 减少重绘和回流
- 使用 transform 替代 top
```
<div class="test"></div>
<style>
  .test {
    position: absolute;
    top: 10px;
    width: 100px;
    height: 100px;
    background: red;
  }
</style>
<script>
  setTimeout(() => {
    // 引起回流
    document.querySelector('.test').style.top = '100px'
  }, 1000)
</script>
```
- 使用 `visibility` 替换 `display: none` ，因为前者只会引起重绘，后者会引发回流（改变了布局）
- 不要把节点的属性值放在一个循环里当成循环里的变量
```
for(let i = 0; i < 1000; i++) {
    // 获取 offsetTop 会导致回流，因为需要去获取正确的值
    console.log(document.querySelector('.test').style.offsetTop)
}
```
- 不要使用 table 布局，可能很小的一个小改动会造成整个 table 的重新布局
- 动画实现的速度的选择，动画速度越快，回流次数越多，也可以选择使用 requestAnimationFrame
- CSS 选择符`从右往左`匹配查找，避免节点层级过多
- 将频繁重绘或者回流的节点设置为图层，图层能够阻止该节点的渲染行为影响别的节点。比如对于 video 标签来说，浏览器会自动将该节点变为图层。
<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/050b7528bc47418a893ea02f76cbeebb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/050b7528bc47418a893ea02f76cbeebb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>
    - 设置节点为图层的方式有很多，我们可以通过以下几个常用属性可以生成新图层
        - `will-change`
        - `video`、`iframe` 标签

>思考题：在不考虑缓存和优化网络协议的前提下，考虑可以通过哪些方式来最快的渲染页面，也就是常说的关键渲染路径，这部分也是性能优化中的一块内容。

首先你可能会疑问，那怎么测量到底有没有加快渲染速度呢
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/98502173f7d44d6ca17deb727707da44~tplv-k3u1fbpfcp-watermark.image?)

当发生 DOMContentLoaded 事件后，就会生成渲染树，生成渲染树就可以进行渲染了，这一过程更大程度上和硬件有关系了。

如何加速：
- 从文件大小考虑
- 从 script 标签使用上来考虑
- 从 CSS、HTML 的代码书写上来考虑
- 从需要下载的内容是否需要在首屏使用上来考虑

