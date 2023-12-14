## vue 面试总结

[vue 面试总结](https://juejin.cn/post/6992370132148305927)

## watch 的两个属性

deep 是否深度监听 handler 回调

immediate 是否初始值就执行

## vue 的异步更新策略

**进程**： 进程是 cpu 分配资源的最小单位；（是能拥有资源和独立运行的最小单位）
<br> **线程**： 线程是 cpu 调度的最小单位；（线程是建立在进程的基础上的一次程序
运行单位，一个进程中可以有多个线程）<br> **浏览器是多进程的**： 在浏览器中，每打
开一个 tab 页面，其实就是新开了一个进程，在这个进程中，还有 ui 渲染线程，js 引擎
线程，http 请求线程等。 所以，浏览器是一个多进程的。<br> **js 是单线程的**：js
是作为浏览器的脚本语言，主要是实现用户与浏览器的交互，以及操作 dom；这决定了它只
能是单线程，否则会带来很复杂的同步问题。举个例子：如果 js 被设计了多线程，如果有
一个线程要修改一个 dom 元素，另一个线程要删除这个 dom 元素，此时浏览器就会一脸茫
然，不知所措。所以，为了避免复杂性，从一诞生，JavaScript 就是单线程。

#### js 执行机制--Event loop，setTimeout 为何不准确？

在任务队列中的异步任务又可以分为两种 microtast（微任务） 和 macrotask（宏任务）,
执行优先级上，先执行宏任务 macrotask，再执行微任务 mincrotask。

- **microtast（微任务）**：Promise， process.nextTick， Object.observe，
  MutationObserver
- **macrotask（宏任务）**：script 整体代码、setTimeout、 setInterval 等

执行过程中需要注意的几点是：

- 在一次 event loop 中，microtask 在这一次循环中是一直取一直取，直到清空
  microtask 队列，而 macrotask 则是一次循环取一次。
- 如果执行事件循环的过程中又加入了异步任务，如果是 macrotask，则放到 macrotask
  末尾，等待下一轮循环再执行。如果是 microtask，则放到本次 event loop 中的
  microtask 任务末尾继续执行。直到 microtask 队列清空。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/27/17254aa257de1477~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/27/17254aa257de1477~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

到这里，上面那个 300ms 的定时器为什么不一定是精确的 300ms 之后打印就能理解了
：<br> 因为 300ms 的 setTimeout 并不是说 300ms 之后立马执行，而是 300ms 之后被放
入任务列表里面。等待事件循环，等待它执行的时候才能执行代码。如果异步任务列表里面
只有它这个 macrotask 任务，那么就是精确的 300ms。但是如果 还有 microtast 等其它
的任务，就不止 300ms 了。

#### 再看一个事件循环的问题

```
console.log(1);
setTimeout(function () {
  console.log(2)
}, 0);
new Promise(function (resolve) {
  console.log(3)
  for (var i = 100; i > 0; i--) {
    i == 1 && resolve()
  }
  console.log(4)
}).then(function () {
  console.log(5)
}).then(function () {
  console.log(6)
});
console.log(7);
```

- 由于 script 也属于 macrotask，所以整个 script 里面的内容都放到了主线程（任务栈
  ）中，按顺序执行代码。然后遇到 console.log(1)，直接打印 1。
- 遇到 setTimeout,表示 0 秒后加入任务队列，因为 setTimeout 是一个宏观任务，所以
  会放到下一个 macrotask，这里不会执行
- 遇到 new Promise，new Promise 在实例的过程中执行代码都是同步进行的，只有回调
  .then()才是微任务。所以先打印 3。执行完循环打印 4。然后遇到第一个 .then()，属
  于 microtask，加入到本次循环的 microtask 队列里面。接着向下执行又遇到一个
  .then()，又加入到本次循环的 microtask 队列里面。然后继续向下执行。
- 遇到 console.log(7)，直接打印 7。直到此时，一个事件循环的 macrotask 执行完成，
  然后去查看此次循环是否还有 microtask，发现还有刚才的 .then() ，立即放到主线程
  执行，打印出 5。然后发现还有第二个 .then()，立即放到主线程执行，打印出 6 。此
  时 microtask 任务列表清空完了。到此第一次循环完成。
- 第二次事件循环，从 macrotask 任务列表里面找到了第一次放进的 setTimeout，放到主
  线程执行，打印出 2。
- 最终打印的结果：1、3、4、7、5、6、2

## $nextTick、原理

#### 定义

Vue.nextTick([callback,context])<br> 在下次 DOM 更新循环结束之后执行延迟回调。在
修改数据之后立即使用这个方法，获取更新之后的 DOM

```
// 修改数据
vm.msg = 'Hello'
// DOM 还没有更新
Vue.nextTick(function () { // DOM 更新了
})
```

Vue 在更新 DOM 时是异步执行的。只要侦听到数据变化，Vue 将开启一个队列，并缓冲在
同一事件循环中发生的所有数据变更。如果同一个 watcher 被多次触发，只会被推入到队
列中一次。这种在缓冲时去除重复数据对于避免不必要的计算和 DOM 操作是非常重要的。
然后，在下一个的事件循环“tick”中，Vue 刷新队列并执行实际 (已去重的) 工作。Vue 在
内部对异步队列尝试使用原生的 Promise.then、MutationObserver 和 setImmediate，如
果执行环境不支持，则会采用 setTimeout(fn, 0) 代替。

#### 原理

**$nextTick 将回调函数放到微任务或者宏任务当中以延迟它地执行顺序**<br> 理解源码
中它的三个参数的意思：

- callback：我们要执行的操作，可以放在这个函数当中，我们没执行一次$nextTick 就会
  把回调函数放到一个异步队列当中；
- pending：标识，用以判断在某个事件循环中是否为第一次加入，第一次加入的时候才触
  发异步执行的队列挂载
- timerFunc：用来触发执行回调函数，也就是 Promise.then 或 MutationObserver 或
  setImmediate 或 setTimeout 的过程,这个跟当前环境是否支
  持`Promise.then或MutationObserver或setImmediate 或setTimeout`来选择执行

在看整个$nextTick里面的执行过程，其实就是`把一个个$nextTick 中的回调函数压入到
callback 队列`当中，然后根据事件的性质等待执行，轮到它执行的时候，就执行一下，然
后去掉 callback 队列中相应的事件。

[详解](https://juejin.cn/post/6844904169967452174)

## vue2.0 的生命周期

- beforeCreate
- created
- beforeMount
- mounted
- beforeUpdate
- updated
- beforeDestroy
- destroyed

## 父子组件的生命周期的执行顺序

vue2.0:

⽗ beforeCreate -> ⽗ created -> ⽗ beforeMount -> <br/> ⼦ beforeCreate -> ⼦
created -> ⼦ beforeMount-> ⼦ mounted -> ⽗ mounted

vue3.0:

beforeCreate -> 请使用 setup()<br/> created -> 请使用 setup()<br/> beforeMount
-> onBeforeMount<br/> mounted -> onMounted<br/> beforeUpdate ->
onBeforeUpdate<br/> updated -> onUpdated<br/> beforeDestroy ->
onBeforeUnmount<br/> destroyed -> onUnmounted<br/> errorCaptured ->
onErrorCaptured

## new vue 执行了什么？

执行了 this.\_init(options)操作，在里面 合并配置 、初始化生命周期、初始化事件中
心、初始化渲染、初始化 data、初始化 props、初始化 computed、初始化 watcher，在初
始化的最后，检测到如果有 el 属性，则调用 vm.$mount 方法挂载 vm，挂载的目标就是把
模板渲染成最终的 DOM。

## vue3 有什么改进的或者不足之处？

- 完全不兼容 ie，因为使用的 proxy
- 组合式 api，composition api。其实在代码结构上也会有一点乱

## vuex 是如何判断是不是通过 commit 来修改 state 的？

在严格模式下，我们可以通过 commit 以外的方式改变 state 里的状态的，但在严格模式
下，Vuex 中修改 state 的唯一渠道就是执行 commit('xx', payload) 方法。<br>

其底层通过执行 this.\_withCommit(fn) 设置`_committing`标志变量为 true，然后才能
修改 state，修改完毕还需要还原 `_committing` 变量。外部修改虽然能够直接修改
state，但是并没有修改 `_committing` 标志位，所以只要 watch 一下 state，state
change 时判断是否 `_committing` 值为 true，即可判断修改的合法性，在严格模式下，
任何 mutation 处理函数以外修改 Vuex state 都会抛出错误。）然后 getters 能够及时
获取 state 中的状态并作出计算（实际上 getters 就是一个计算属性）

## vue 是如何实现 keep-alive

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/5/5/16a85ce17285dce1~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/5/5/16a85ce17285dce1~tplv-t2oaga2asx-watermark.awebp)</a>

keep-alive 根据设置的条件去缓存组件，执行的时候是在 patch 阶段的，所以并不会执行
mount 及其之前的钩子方法。根据组件 ID 和 tag 生成缓存 Key，缓存 vNode，销毁的时
候遍历缓存组件数组执行组件的 destory 方法进行销毁。
