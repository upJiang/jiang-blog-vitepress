## 浏览器的进程模型
### 何为进程？
- 程序运行需要有它自己的内存空间，可以把这块**内存空间**简单的理解为进程。
- 每个应用至少有一个进程，进程之间**相互独立**，即使要通讯，也需要双方同意

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e53d5579e6f24512a396cc20c3587441~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e53d5579e6f24512a396cc20c3587441~tplv-k3u1fbpfcp-watermark.image?)</a>

### 何为线程？
- 一个进程至少有一个线程，**进程开启后会自动创建一个线程来运行代码，这个线程叫主线程，主线程结束，则进程结束**。
- 如果程序想同时执行多块代码，主线程会启动更多的线程来执行代码，所以**一个进程可以有多个线程**。

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3850d8fe55aa47b8a7c9f476e74305a4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3850d8fe55aa47b8a7c9f476e74305a4~tplv-k3u1fbpfcp-watermark.image?)</a>

### 浏览器有哪些进程和线程？
**浏览器是一个多进程多线程的应用程序**

- 为了避免相互影响，减少连环崩溃的几率，他会**自动启动多个进程**。
<a data-fancybox title="1677070303512.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b8b1ba32eeb4684ade6abf5167610fd~tplv-k3u1fbpfcp-watermark.image?">![1677070303512.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b8b1ba32eeb4684ade6abf5167610fd~tplv-k3u1fbpfcp-watermark.image?)</a>

浏览器右上角三个点那里的`更多工具`打开任务管理器：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb091b0193f9446a9afad5b95e2095fd~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb091b0193f9446a9afad5b95e2095fd~tplv-k3u1fbpfcp-watermark.image?)</a>

**每打开一个标签页就会开启一个渲染线程**，尝试多打开一个标签页，任务管理器会多一个线程。
- 主要有下面三个：
- `浏览器进程`：主要负责界面显示(是指浏览器窗体那些界面的交互，而非标签页面内容)，用户交互、子进程管理等，浏览器进程内部会启动多个线程处理不同的任务。
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d465a6f3ceda4c7c93901253b7f2cd1a~tplv-k3u1fbpfcp-watermark.image?)
- `网络进程`
负责加载网络资源，网络进程内部会启动多个线程处理不同的任务。
- `渲染进程`
    - 渲染进程启动后，会开启**一个渲染主线程，主线程负责执行 HTML、CSS、JS 代码**
    - 默认情况下，浏览器会为每个标签页开启一个新的渲染进程，以保证不同的标签页之前不互相影响（以后浏览器可能会改变这种方式，为了减少进程的数量，在寻求的方案比如一个站点开辟一个进程）

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?)</a>

## 渲染主线程是如何工作的？
渲染主线程是浏览器中最繁忙的的线程，需要它处理的任务包括但不限于：
- 解析 HTMl
- 解析 CSS
- 计算样式
- 布局
- 处理图层
- 每秒把页面画60次(FPS)
- 执行全局 JS 代码
- 执行事件处理函数
- 执行计时器的回调函数
- ......

为何只能有一个渲染主线程？比如正在执行一个js函数去修改页面，定时器的任务也到达了时间，那么应该执行哪个？同时执行的话，修改了同一个地方如何选择。

**一个渲染进程只能一个渲染主进程，使用消息队列来调度任务*，

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2718cea5f34545b5a58a9db7d3e80a42~tplv-k3u1fbpfcp-watermark.image?)
- 在最开始的时候、渲染主线程会进入一个无限循环
- 每一次循环会检查消息队列中是否有任务存在，如果有，就取出第一个任务执行，执行完一个后进入下一次循环，如果没有，则进入休眠状态
- 其它所有线程（包括其它进程的线程，比如点击事件，计时器的回调函数等）可以随时向消息队列添加任务。新任务会加到消息队列的末尾。在添加新任务时，如果主线程是休眠状态，则会将其唤醒以继续拿取任务执行。

## 若干解释
### 何为异步？
### js 为何会阻碍渲染？
### 任务有优先级吗？