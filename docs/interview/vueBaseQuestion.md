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
