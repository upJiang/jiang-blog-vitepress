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
- `浏览器进程`：主要负责界面显示，用户交互、子进程管理等，浏览器进程内部会启动多个线程处理不同的任务。

- `网络进程`
- `渲染进程`

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?)</a>



## 渲染主线程是如何工作的？
## 若干解释
### 何为异步？
### js 为何会阻碍渲染？
### 任务有优先级吗？