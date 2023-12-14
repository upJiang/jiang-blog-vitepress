## 浏览器的进程模型

### 何为进程？

- 程序运行需要有它自己的内存空间，可以把这块**内存空间**简单的理解为进程。
- 每个应用至少有一个进程，进程之间**相互独立**，即使要通讯，也需要双方同意

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e53d5579e6f24512a396cc20c3587441~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e53d5579e6f24512a396cc20c3587441~tplv-k3u1fbpfcp-watermark.image?)</a>

### 何为线程？

- 一个进程至少有一个线程，**进程开启后会自动创建一个线程来运行代码，这个线程叫主
  线程，主线程结束，则进程结束**。
- 如果程序想同时执行多块代码，主线程会启动更多的线程来执行代码，所以**一个进程可
  以有多个线程**。

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3850d8fe55aa47b8a7c9f476e74305a4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3850d8fe55aa47b8a7c9f476e74305a4~tplv-k3u1fbpfcp-watermark.image?)</a>

### 浏览器有哪些进程和线程？

**浏览器是一个多进程多线程的应用程序**

- 为了避免相互影响，减少连环崩溃的几率，他会**自动启动多个进程**。
  <a data-fancybox title="1677070303512.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b8b1ba32eeb4684ade6abf5167610fd~tplv-k3u1fbpfcp-watermark.image?">![1677070303512.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b8b1ba32eeb4684ade6abf5167610fd~tplv-k3u1fbpfcp-watermark.image?)</a>

浏览器右上角三个点那里的`更多工具`打开任务管理器：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb091b0193f9446a9afad5b95e2095fd~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb091b0193f9446a9afad5b95e2095fd~tplv-k3u1fbpfcp-watermark.image?)</a>

**每打开一个标签页就会开启一个渲染线程**，尝试多打开一个标签页，任务管理器会多一
个线程。

- 主要有下面三个：
- `浏览器进程`：主要负责界面显示(是指浏览器窗体那些界面的交互，而非标签页面内容
  )，用户交互、子进程管理等，浏览器进程内部会启动多个线程处理不同的任务。
  <a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d465a6f3ceda4c7c93901253b7f2cd1a~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d465a6f3ceda4c7c93901253b7f2cd1a~tplv-k3u1fbpfcp-watermark.image?)</a>
- `网络进程` 负责加载网络资源，网络进程内部会启动多个线程处理不同的任务。
- `渲染进程`
  - 渲染进程启动后，会开启**一个渲染主线程，主线程负责执行 HTML、CSS、JS 代码**
  - 默认情况下，浏览器会为每个标签页开启一个新的渲染进程，以保证不同的标签页之前
    不互相影响（以后浏览器可能会改变这种方式，为了减少进程的数量，在寻求的方案比
    如一个站点开辟一个进程）

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fdfc0d87dace4673ae8ebf60a463e708~tplv-k3u1fbpfcp-watermark.image?)</a>

## 渲染主线程是如何工作的？

渲染主线程是浏览器中最繁忙的的线程，需要它处理的任务包括但不限于：

- 解析 HTMl
- 解析 CSS
- 计算样式
- 布局
- 处理图层
- 每秒把页面画 60 次(FPS)
- 执行全局 JS 代码
- 执行事件处理函数
- 执行计时器的回调函数
- ......

为何只能有一个渲染主线程？比如正在执行一个 js 函数去修改页面，定时器的任务也到达
了时间，那么应该执行哪个？同时执行的话，修改了同一个地方如何选择。

\*_一个渲染进程只能一个渲染主进程，使用消息队列来调度任务_，

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2718cea5f34545b5a58a9db7d3e80a42~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2718cea5f34545b5a58a9db7d3e80a42~tplv-k3u1fbpfcp-watermark.image?)</a>

- 在最开始的时候、渲染主线程会进入一个无限循环
- 每一次循环会检查消息队列中是否有任务存在，如果有，就取出第一个任务执行，执行完
  一个后进入下一次循环，如果没有，则进入休眠状态
- 其它所有线程（包括其它进程的线程，比如点击事件，计时器的回调函数等）可以随时向
  消息队列添加任务。新任务会加到消息队列的末尾。在添加新任务时，如果主线程是休眠
  状态，则会将其唤醒以继续拿取任务执行。

## 若干解释

### 何为异步？

代码执行过程中，会遇到一些无法立即执行的任务，比如：

- 计时完成后需要执行的任务 -- `setTimeout、setInterval`
- 网络通讯完成后需要执行的任务 -- `XHR、Fetch`
- 用户操作后需要执行的任务 -- `addEventListener`

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5f75f1c363af4ee49f4b57589e996406~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5f75f1c363af4ee49f4b57589e996406~tplv-k3u1fbpfcp-watermark.image?)</a>

#### 面试题：如何理解 JS 的异步？

Js 是一门单线程的语言，这是因为它运行在浏览器的渲染主线程中，而渲染主线程只有一
个。<br> 渲染主线程承担着诸多任务，比如渲染页面、执行 JS 、解析 CSS <br> 如果使
用同步的方式，就极有可能会导致主线程的阻塞，从而导致消息队列的很多其它任务无法执
行，页面无法及时更新，给用户造成卡死现象。<br> 所以浏览器使用异步的方式避免，具
体做法是当某些任务发生时，比如计时器、网络、事件监听，主线程将任务交给其它线程处
理，自身立即结束此任务的执行，转而执行后续代码。当其它线程完成此任务时，将事先传
递的回调函数包装成任务，加入到消息队列的末尾排队，等待主线程的调度执行。<br> 在
这种异步模式下，浏览器永不阻塞，从而最大限度的保证了单线程的流畅执行。

### js 为何会阻碍渲染？

渲染主线程只有一个，js 的执行与渲染都在主线程中，两者无法同时执行。react 的
fiber 就是为了解决此问题

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/59006949ddf04d86a54ac3a2b12ad89e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/59006949ddf04d86a54ac3a2b12ad89e~tplv-k3u1fbpfcp-watermark.image?)</a>

### 任务有优先级吗？

**任务没有优先级，消息队列有优先级，消息队列会有多种**，随着浏览器的复杂度急剧提
升，W3C 将**不再使用宏队列的说法**

根据 W3C 的最新解释：

- 每个任务都有一个任务类型，**同一个类型的任务必须在一个队列**，不同类型的任务可
  以分属于不同的队列
- **浏览器必须准备好一个微队列，微队列中的任务优先所有其它任务执行**

在目前 chrome 的实现中，至少包含了下面队列， 微队列 > 交互队列 > 延时队列

- 微队列：用户存放需要最快执行的任务，优先级最高 (Promise、MutationObserver)
- 交互队列：用户存放用户操作后产生的事件处理任务，浏览器认为用户的操作必须及时响
  应，优先级高 (addEventListener)
- 延时队列：用户存放计时器到达后的回调任务，优先级中 (setTimeout、setInterval)

## 几道题加深理解

```
setTimeout(()=>{
    console.log(1) // 交给计时线程，等待添加到延时队列
}，0)
console.log(2)  // 执行完后执行延时队列中的任务

结果：输入 2，1
```

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c0b20880bacc4d219415b6008b6d0269~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c0b20880bacc4d219415b6008b6d0269~tplv-k3u1fbpfcp-watermark.image?)</a>

```
function delay(duration){
    var start = Date.now();
    while (Date.now() - start < duration){}
}

setTimeout(()=>{
    console.log(1) // 交给计时线程，等待添加到延时队列
},0)

delay(1000) // 阻塞主线程一秒

console.log(2) // 输出 2，由于阻塞一秒后，计时线程已经把任务计时完成加到延时队列了，所以输出 2 后立即输出 1

结果：等待一秒后，同时输出 2，1
```

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49e04d4c99e04a5996f87059627c6e56~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49e04d4c99e04a5996f87059627c6e56~tplv-k3u1fbpfcp-watermark.image?)</a>

```
setTimeout(()=>{
    console.log(1) // 交给计时线程，等待添加到延时队列
},0)

Promise.resolve().then(()=>{
    console.log(2)  // 立即添加到微队列，微队列优先级高于延时队列
})

console.log(3)  // 全局任务

结果：输出 3,2,1
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13a5216180564e1291ee7593f3bdbd34~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13a5216180564e1291ee7593f3bdbd34~tplv-k3u1fbpfcp-watermark.image?)</a>

```
// 只是定义，还未执行哈
function a(){
    console.log(1)
    Promise.resolve().then(()=>{
     console.log(2)
    })
}

setTimeout(()=>{
    console.log(3)
    Promise.resolve().then(a)
},0)

Promise.resolve().then(()=>{
     console.log(4)  // 立即添加到微队列，微队列优先级高于延时队列
})

console.log(5) // 全局

结果：5，4，3，1，2
```

## 总结

#### 什么是事件循环？

- 事件循环又叫消息循环，是**浏览器渲染主线程的工作方式**
- 在 Chrome 的源码中，它会开启一个不会结束的 for 循环，每次循环从消息队列中取出
  第一个任务执行，其它线程只需要在合适的时候将任务加到队列末尾即可
- 过去把消息队列简单分为宏队列和微队列，这种说法目前已无法满足复杂的浏览器环境，
  取而代之的是一种更加灵活多变的方式：
  - 根据 W3C 官方的解释，每个任务有不同的类型，同类型的任务必须在同一个队列，不
    同任务可以属于不同队列。
  - 不同任务有不同的优先级，在一次事件循环中，由浏览器自行决定取哪个队列的任务。
  - 但浏览器必须有一个微队列，微队列的任务一定具有最高的优先级，必须优先调度执行
    。

#### JS 中的计时器能做到精确计时吗？

不行，因为

- 计算机硬件没有原子钟，无法做到精确计时
- 操作系统的计时函数本身就有少量偏差，由于 JS 的计时器最终调用的是操作系统的函数
  ，也就携带了这些偏差
- 按照 W3C 的标准，浏览器实现计时器时，如果嵌套层级超过 5 层，则会带有 4 毫秒的
  最少时间，这样在计时时间少于 4 毫秒又带来了偏差
  <a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a4eb91d720934102933bc7989dd50204~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a4eb91d720934102933bc7989dd50204~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/372e08cf55f54c7c8819b2b66ecd4537~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/372e08cf55f54c7c8819b2b66ecd4537~tplv-k3u1fbpfcp-watermark.image?)</a>

- 受事件循环的影响，计时器的回调函数只能在主线程空闲时运行，时间到了也未必会立即
  执行，所以又带了偏差

**单线程是异步产生的原因，事件循环是异步的实现方式**
