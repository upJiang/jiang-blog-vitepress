## vue面试总结
[vue面试总结](https://juejin.cn/post/6992370132148305927)
## watch的两个属性
deep是否深度监听 handler回调 

immediate是否初始值就执行

## vue的异步更新策略
**进程**： 进程是cpu分配资源的最小单位；（是能拥有资源和独立运行的最小单位） <br>
**线程**： 线程是cpu调度的最小单位；（线程是建立在进程的基础上的一次程序运行单位，一个进程中可以有多个线程）<br>
**浏览器是多进程的**： 在浏览器中，每打开一个tab页面，其实就是新开了一个进程，在这个进程中，还有ui渲染线程，js引擎线程，http请求线程等。 所以，浏览器是一个多进程的。<br>
**js是单线程的**：js是作为浏览器的脚本语言，主要是实现用户与浏览器的交互，以及操作dom；这决定了它只能是单线程，否则会带来很复杂的同步问题。
举个例子：如果js被设计了多线程，如果有一个线程要修改一个dom元素，另一个线程要删除这个dom元素，此时浏览器就会一脸茫然，不知所措。所以，为了避免复杂性，从一诞生，JavaScript就是单线程。

#### js执行机制--Event loop，setTimeout为何不准确？
在任务队列中的异步任务又可以分为两种microtast（微任务） 和 macrotask（宏任务）,执行优先级上，先执行宏任务macrotask，再执行微任务mincrotask。
- **microtast（微任务）**：Promise， process.nextTick， Object.observe， MutationObserver
- **macrotask（宏任务）**：script整体代码、setTimeout、 setInterval等

执行过程中需要注意的几点是：
- 在一次event loop中，microtask在这一次循环中是一直取一直取，直到清空microtask队列，而macrotask则是一次循环取一次。
- 如果执行事件循环的过程中又加入了异步任务，如果是macrotask，则放到macrotask末尾，等待下一轮循环再执行。如果是microtask，则放到本次event loop中的microtask任务末尾继续执行。直到microtask队列清空。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/27/17254aa257de1477~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/27/17254aa257de1477~tplv-t2oaga2asx-zoom-in-crop-mark:3024:0:0:0.awebp)</a>

到这里，上面那个300ms的定时器为什么不一定是精确的300ms之后打印就能理解了：<br>
因为300ms的setTimeout并不是说300ms之后立马执行，而是300ms之后被放入任务列表里面。等待事件循环，等待它执行的时候才能执行代码。如果异步任务列表里面只有它这个macrotask任务，那么就是精确的300ms。但是如果 还有microtast等其它的任务，就不止300ms了。

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
- 由于script也属于macrotask，所以整个script里面的内容都放到了主线程（任务栈）中，按顺序执行代码。然后遇到console.log(1)，直接打印1。
- 遇到setTimeout,表示0秒后加入任务队列，因为setTimeout是一个宏观任务，所以会放到下一个macrotask，这里不会执行
- 遇到new Promise，new Promise在实例的过程中执行代码都是同步进行的，只有回调.then()才是微任务。所以先打印3。执行完循环打印4。然后遇到第一个 .then()，属于microtask，加入到本次循环的microtask队列里面。接着向下执行又遇到一个 .then()，又加入到本次循环的microtask队列里面。然后继续向下执行。
- 遇到console.log(7)，直接打印7。直到此时，一个事件循环的macrotask执行完成，然后去查看此次循环是否还有microtask，发现还有刚才的  .then() ，立即放到主线程执行，打印出5。然后发现还有第二个 .then()，立即放到主线程执行，打印出6 。此时microtask任务列表清空完了。到此第一次循环完成。
- 第二次事件循环，从macrotask任务列表里面找到了第一次放进的setTimeout，放到主线程执行，打印出2。
- 最终打印的结果：1、3、4、7、5、6、2

## $nextTick、原理
#### 定义
Vue.nextTick([callback,context])<br>
在下次DOM更新循环结束之后执行延迟回调。在修改数据之后立即使用这个方法，获取更新之后的DOM
```
// 修改数据 
vm.msg = 'Hello' 
// DOM 还没有更新 
Vue.nextTick(function () { // DOM 更新了 
}) 
```
Vue 在更新 DOM 时是异步执行的。只要侦听到数据变化，Vue 将开启一个队列，并缓冲在同一事件循环中发生的所有数据变更。如果同一个 watcher 被多次触发，只会被推入到队列中一次。这种在缓冲时去除重复数据对于避免不必要的计算和 DOM 操作是非常重要的。然后，在下一个的事件循环“tick”中，Vue 刷新队列并执行实际 (已去重的) 工作。Vue 在内部对异步队列尝试使用原生的 Promise.then、MutationObserver 和 setImmediate，如果执行环境不支持，则会采用 setTimeout(fn, 0) 代替。
#### 原理
**$nextTick将回调函数放到微任务或者宏任务当中以延迟它地执行顺序**<br>
理解源码中它的三个参数的意思：
- callback：我们要执行的操作，可以放在这个函数当中，我们没执行一次$nextTick就会把回调函数放到一个异步队列当中；
- pending：标识，用以判断在某个事件循环中是否为第一次加入，第一次加入的时候才触发异步执行的队列挂载
- timerFunc：用来触发执行回调函数，也就是Promise.then或MutationObserver或setImmediate 或setTimeout的过程,这个跟当前环境是否支持`Promise.then或MutationObserver或setImmediate 或setTimeout`来选择执行

在看整个$nextTick里面的执行过程，其实就是`把一个个$nextTick中的回调函数压入到callback队列`当中，然后根据事件的性质等待执行，轮到它执行的时候，就执行一下，然后去掉callback队列中相应的事件。

[详解](https://juejin.cn/post/6844904169967452174)

## vue2.0的生命周期
* beforeCreate
* created
* beforeMount
* mounted
* beforeUpdate
* updated
* beforeDestroy
* destroyed

## 父子组件的生命周期的执行顺序
vue2.0:

⽗beforeCreate -> ⽗created -> ⽗beforeMount -> <br/>
⼦beforeCreate -> ⼦created -> ⼦beforeMount-> ⼦mounted -> ⽗mounted

vue3.0:

beforeCreate -> 请使用 setup()<br/>
created -> 请使用 setup()<br/>
beforeMount -> onBeforeMount<br/>
mounted -> onMounted<br/>
beforeUpdate -> onBeforeUpdate<br/>
updated -> onUpdated<br/>
beforeDestroy -> onBeforeUnmount<br/>
destroyed -> onUnmounted<br/>
errorCaptured -> onErrorCaptured

## new vue执行了什么？
执行了this._init(options)操作，在里面 合并配置 、初始化生命周期、初始化事件中心、初始化渲染、初始化data、初始化props、初始化computed、初始化watcher，在初始化的最后，检测到如果有el属性，则调用vm.$mount方法挂载vm，挂载的目标就是把模板渲染成最终的DOM。

## vue3 有什么改进的或者不足之处？
- 完全不兼容ie，因为使用的 proxy
- 组合式 api，composition api。其实在代码结构上也会有一点乱

## vuex 是如何判断是不是通过 commit 来修改 state 的？
在严格模式下，我们可以通过commit以外的方式改变state里的状态的，但在严格模式下，Vuex中修改state的唯一渠道就是执行 commit('xx', payload) 方法。<br>

其底层通过执行 this._withCommit(fn) 设置`_committing`标志变量为 true，然后才能修改 state，修改完毕还需要还原 `_committing` 变量。外部修改虽然能够直接修改 state，但是并没有修改 `_committing` 标志位，所以只要 watch 一下 state，state change 时判断是否 `_committing` 值为 true，即可判断修改的合法性，在严格模式下，任何 mutation 处理函数以外修改 Vuex state 都会抛出错误。）然后 getters 能够及时获取 state 中的状态并作出计算（实际上 getters 就是一个计算属性）

## vue 是如何实现 keep-alive
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/5/5/16a85ce17285dce1~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2019/5/5/16a85ce17285dce1~tplv-t2oaga2asx-watermark.awebp)</a>

keep-alive 根据设置的条件去缓存组件，执行的时候是在 patch 阶段的，所以并不会执行 mount 及其之前的钩子方法。根据组件ID和tag生成缓存Key，缓存vNode，销毁的时候遍历缓存组件数组执行组件的 destory 方法进行销毁。

