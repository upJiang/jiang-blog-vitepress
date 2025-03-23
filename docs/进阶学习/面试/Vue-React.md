### vue2 Object.defineProperty vue 3 Proxy

vue 2 中对对象数组新增属性时，数据变化了，但是视图不会变化，需要使用 `vue.$set`，本质在于 Object.defineProperty **劫持不到后面新增的属性**，因为它是一开始定义时就只监听第一次写的 data

其实就是监听定义好的对象属性，需要循环

```Plaintext
let data = {
        a:1,
        b:2
}

for(let k in data){
        Object.defineProperty(data, k, {
                get(){
                        return data[k]
                },
                set(value){
                        data[k] = value
                }
                ...还有其它属性
                value:1,
                enumerabile:true,
                readOnly:true, 等等
        })
}

data.c = 3 // 这个根本劫持不到，但实际上 data 中已经有 c 了，vue.$set(data,c,'3') 实际上就是重新劫持一遍这个对象
```

Proxy 直接监听整个对象，不需要循环

```Plaintext
let data = {
        a:1,
        b:2,
        get c(){
                console.log(c)
                return this.a + this.b
        }
}

// receiver 是指receiver 是调用 getter 或 setter 时的 this 值，通常是代理对象本身，也可以传一个对象过去
const vue = new Proxy(data, {
        get(target, propKey, receiver){
            console.log(propKey)
        return Reflect.get(target, propKey, receiver)
    },
    set(value){
        return Reflect.set(target, propKey,value, receiver)
    }
})

console.log(data.c)
如果使用的是 Reflect.get(target, propKey, receiver)：打印 c、a、b
如果使用 rerutn tagget[propKey] // 只会打印 c 因为它拦截不到 c，所以一定要使用Reflect.get(target, propKey, receiver)
```

### Reflect 反射

允许你调用对象的基本方法

```Plaintext
const obj = {
        a:1,
        b:2,
        c:3
}
```

Reflect.ownKeys(obj)

Reflect.get(obj, 'c',{a:3,b:2}) // 5

### react 跟 vue 的本质不同，哪个性能好

- **React**
  - 函数式导向，JSX 语法扩展，强调不可变数据与组件组合，依赖外部状态管理（如 Redux）
  - 依赖 Virtual DOM 差异比对（Fiber 架构优化高复杂度场景）
  - React 的 Fiber 调度机制更适合复杂交互场景（如 Figma 类工具）
- **Vue**
  - 渐进式框架，模板语法 + 响应式系统，内置状态管理（Vuex/Pinia），提供开箱即用的 CLI 工具链
  - Vue 通过响应式依赖追踪实现精准组件级更新（Proxy 劫持数据）
  - Vue 的模板编译优化（Compiler-informed fast paths）通常更高效

### v-model 原理

自动处理 props 传递和事件触发，统一使用 **`modelValue`** **+** **`update:modelValue`** 模式，提升代码可维护性。

其实就是实现了 :value + @update:value

**子组件要想与父组件同步，还是需要写 emit('update:modelValue',xxx) 的**

vue3 支持一个组件多个 v-model

### Vue3 收集依赖的原理

- 用 WeakMap 存储依赖（key + 执行函数）
- 在 proxy 劫持对象，在 get 方法中使用 track 收集依赖，在 set 方法中使用 trigger 触发执行函数

```javascript
// 依赖存储仓库
const targetMap = new WeakMap()
let activeEffect = null

// 响应式对象创建
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key)
      return Reflect.get(...arguments)
    },
    set(target, key, value) {
      Reflect.set(...arguments)
      trigger(target, key)
      return true
    }
  })
}

// 依赖收集（数据读取时触发）
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))
  let deps = depsMap.get(key)
  if (!deps) depsMap.set(key, (deps = new Set()))
  deps.add(activeEffect)
}

// 触发更新（数据修改时触发）
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  depsMap.get(key)?.forEach((effect) => effect())
}

// 副作用函数
function effect(fn) {
  activeEffect = fn
  fn()
  activeEffect = null
}
```

## Vue React 源码解析

虚拟 dom，js 对象，跨平台，比直接操作 dom 要快在于更新快，初次渲染甚至慢。

React 的虚拟 dom 更新：

- **构建虚拟 DOM 树** React 使用 `React.createElement` 将 JSX 转换为虚拟 DOM 对象（React 元素），形成一棵虚拟 DOM 树。
- **触发更新机制** 当组件的 `state` 或 `props` 发生变化时，React 会触发更新流程：
  - 调用 `render` 方法，生成新的虚拟 DOM 树。
  - 将新旧虚拟 DOM 树进行对比。
- **对比虚拟 DOM 树（Diff 算法）** React 的 Diff 算法优化了传统 O(n³) 的树对比，采用分层递归策略，将时间复杂度降低为 O(n)。具体过程如下：
  - **分层比较**：React 仅对同一层级的节点进行比较，不跨层级。
  - **节点类型判断**：
    - 如果节点类型相同，保留当前节点，仅对属性和子节点递归更新。
    - 如果节点类型不同，直接移除旧节点，添加新节点。
  - **Key 优化**：通过 `key` 标识节点，提高节点复用率，减少不必要的操作。
- **生成更新队列** 在对比过程中，React 会生成一系列更新操作（增、删、改节点），并存入更新队列。
- **批量更新真实 DOM** React 将更新操作应用到真实 DOM，尽量减少操作次数：
  - 使用 `requestAnimationFrame` 等技术合并多次更新。
  - 将所有更新操作打包为一次 DOM 操作。
- **触发生命周期钩子** 更新完成后，React 调用组件的 `componentDidUpdate` 或 React Hook 中的 `useEffect` 钩子，通知开发者更新结束。

vue3 虚拟 dom

```javascript
// 模板
<template>
  <div id="app">
    <h1>Hello, {{ name }}</h1>
  </div>
</template>

// 编译后的渲染函数
render() {
  return h('div', { id: 'app' }, [
    h('h1', null, `Hello, ${this.name}`)
  ]);
}

//渲染函数生成的虚拟dom对象
{
  tag: 'div',         // 标签名
  data: { id: 'app' }, // 属性
  children: [          // 子节点
    {
      tag: 'h1',
      data: null,
      children: ['Hello, John']
    }
  ],
  text: undefined,     // 文本内容
  elm: null,           // 对应的真实 DOM 节点
  key: undefined,      // 节点的唯一标识
}
```

####    Vue 和 React 虚拟 DOM 的比较

|              |                         |                              |
| ------------ | ----------------------- | ---------------------------- |
| 特性         | React                   | Vue                          |
| 创建虚拟 DOM | React.createElement     | h 函数（Vue 3）              |
| 更新机制     | 全局 diff               | 局部 diff，优化静态节点      |
| 数据绑定     | 单向数据流              | 双向数据绑定 + 单向数据流    |
| 模板支持     | 不支持模板，使用 JSX    | 支持模板，也支持 render 函数 |
| 性能优化     | 依赖于 key 和 diff 算法 | 依赖 key，静态节点标记优化   |
| diff 机制    | 同层对比                | 同层对比                     |
| 触发更新机制 | 主动触发                | 响应式系统自动触发           |

###   Vue 中 template 模版的编译原理

1. 解析（parse）：将模板字符串解析成 AST（抽象语法树）。
2. 静态分析（static analysis）：对 AST 进行静态分析，标记出其中的静态节点（Static Node）。
3. 优化（optimize）：遍历 AST，对静态节点进行优化，去掉不必要的操作。
4. 代码生成（code generation）：将 AST 转换成渲染函数(render function)的可执行代码。
5. 最终的渲染：将生成的渲染函数运用到数据上，最终生成视图。

为什么需要先转成 ast

![](https://r6kvtxijgm.feishu.cn/space/api/box/stream/download/asynccode/?code=YzNkNjZmYzY2ZmNiMjc2OGY0ZjRkYmM3YTgwY2VmNmNfVVFlem9SVGV2akhxdTh2NWNhZHVMd3F3enp1S1BORTdfVG9rZW46UE16VGJCUUl5b1luRUx4MGZpOGNUOFRUbkhmXzE3NDI2NDg3Mzk6MTc0MjY1MjMzOV9WNA)

###    介绍一下 React Fiber

> React 的重新实现协调算法，主要解决旧版 React 在渲染大量组件时的性能问题，比如掉帧。旧版使用递归遍历组件树，一旦开始就不能中断，导致主线程被长时间占用，用户交互卡顿。Fiber 引入可中断的异步渲染，把任务拆分成小单元，分片处理，这样浏览器有机会处理更高优先级的任务，比如用户输入或动画。使用 Scheduler 调度器分配任务
>
> ```javascript
> function FiberNode(tag, pendingProps, key, mode) {
>   // ...
>
>   // 周围的 Fiber Node 通过链表的形式进行关联
>   this.return = null
>   this.child = null
>   this.sibling = null
>   this.index = 0
>
>   // ...
> }
> ```

- **旧版分拣**： 工人必须一口气分完所有包裹（组件更新），期间不能接电话（响应点击/滚动），导致客户投诉
- **Fiber 分拣**： 工人每分拣 5 个包裹就抬头看看有没有紧急电话（高优先级任务），可以随时暂停/继续工作

**三大核心改进**

1. **任务切片**

   1. 把组件更新拆成多个小任务（类似视频缓冲分段加载）
   2. 每完成 16ms 的任务就让浏览器处理其他事情（60 帧/s 的周期）

2. **优先级插队**

   1. 用户点击 > 动画渲染 > 数据加载（就像救护车优先通行）
   2. 正在渲染的表格数据可以被突然的按钮点击打断

3. **断点续传，就是使用了链表的特性，才能被打断**

   1. 用特殊记账本（Fiber 节点链表）记录做到哪一步
   2. 就像读书时夹书签，回来能立刻接着读

### 实现一个简单版的 MVVM

```JavaScript
<html>
    <body>
        <input id='input'>/>
        <div id='content'></div>
    <body>
    <script>
        window.onload = ()=>{
            // Model 层
            const data = {
                inputVal:''
            }

            // 数据 => 视图
            const proxy = new Proxy(data,{
                get:(target, key, receiver){
                  return Reflect.get(target, key, receiver)
                },
                set:(target, key, value, receiver){
                    if(key === 'inputVal'){
                        document.getElementById('content').innerHTML = value
                    }
                }
            })

            //  视图 => 数据
            document.getElementById('input').addEventListener('input', e = >{
                proxy.inputVal = e.target.detail
            })
        }
    <script>
<html>
```
