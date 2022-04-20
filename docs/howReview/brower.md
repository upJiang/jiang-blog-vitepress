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