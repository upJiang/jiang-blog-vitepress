## vue面试总结
[vue面试总结](https://juejin.cn/post/6992370132148305927)
## watch的两个属性
deep是否深度监听 handler回调 

immediate是否初始值就执行

## $nextTick 
vue的dom更新是异步的，有时候在dom节点上更新还未结束我们就去获取dom上的内容，则会获取不到或者获取不争取，这时候使用nexttick就相当于延迟执行，等dom更新完了再去获取，比如我们在created方法中，关系到dom节点的一定要写到$nexttick中

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