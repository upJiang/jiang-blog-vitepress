[vue 代码规范](https://mp.weixin.qq.com/s/qeAoyWx01fOLgEI0jkT_ag)

## vue3.0 的提升与改变（完全自述）

1. 性能优化上，静态标记，热更新 click，vite 打包速度，摇树优化（打包时会把一些没
   有用到的 nextnick,observable 等方法抽离出来，排除掉）
2. 语法上，采用最新的 script setup 语法糖，比如
   defineEmit,defineProps,useContext(里面有 expose，用于暴露组件的方法，真正意义
   上的组件封装），vue3.2 开始使用 defineExpose 替代
3. 定义全局变量的方式，以前可以使用 vue.proto,,定义原型链去挂载全局变量，现在使
   用 app.config.globalProperties
4. v-modal 的使用，移除.async，实现父子组件双向数据绑定
5. 插槽 slot 使用的变化，增加了 name 的属性（具名插槽），便于排版吧
6. teleport，就是一个任意插入到 div 中的工具，但是需要变量去动态控制，首次加载就
   算是 true 也不显示
7. 本来在 template 中必须有一层 div 包裹并导出，现在不需要了，fragmate
8. css 中，v-bind 使用变量
9. 新增了 watchEffect 可以监控这个方法内写过的变量发生改变后就会触发，以及一些
   red,reactive 这些的用法就不用详细说了
10. 移除掉了 created 方法，setup 是在 beforeCreated 后才能使用的，没有 this，只
    能使用 getCurrentInstance 去获取实例，而且使用 proxy 导出使用
11. 组件的传值除了使用 vuex，还可以使用 provide/reject 进行深层传递
12. 函数式编程，可以轻易暴露公共方法，取消了 mixin 的使用
13. 新增一些获取 env 环境变量的方法 import.meta.env.VITE_BASE_URL，便于定义打包
    方式使用不同变量这些
14. 在 vite 中不能使用 require，比如遍历文件夹，以前使用 require.context,,, 现在
    提供了新方法 import.meta.globEager 或者 import.meta.glob
15. 注册自定义组件的方法变化，以前需要 install，，，然后 use 什么的，现在直接
    app.component(key, componentArray[key])
16. dom 中 ref 的使用，因为跟语法 ref 可能有冲突啥的，现在必须定义 const a =
    ref(null)，否则在服务器环境中会报错
17. 以前基本不怎么支持 ts，现在是全方位支持
18. 新增 Suspens 异步组件，可以用于封装 loading 结束后显示下一个组件
19. 新增了一个 createdRender 自定义渲染器，函数式组件（但不建议使用，性能提升不
    高）
20. vue2 中 h 渲染方法以及其中的 on 方法的变化，h 直接导入使用，on 方法直接前面
    是 on，，，就可以使用，以及插槽的变化
21. defineAsyncCompont 定义异步组件，用于区分函数式组件
22. 自定义指令的语法变了，比如 inserted=>mounted , bind->beforeMount
23. 过渡动画 transition 现在卸载 router-view 内部，v-enter =>v-enter-from ,
    v-leave => v-leave-from
24. $on,$off,$once，filters 被移除，使用必须使用第三方库
25. 修改 vite.config.ts 不需要重新启动项目
26. vite 用的 esm 不支持 node 的 require

## vue3.0 在响应式方面上做了哪些提升？

> vue2.0 使用 object.defineProperty，vue3.0 使用 prpxy

vue3 ==> 基于 Proxy 的数据响应式<br/> ==> 依赖收集: 添加副作用 efferc() => 依赖
收集 track() -> 触发副作用 trigger()

1. vue2.0 初始化需要递归，速度慢，而 vue3 不需要初始化，它是在运行时初始化的，当
   遇到响应式对象时才去遍历，采取获取依赖，添加副作用函数等。
2. vue2.0 依赖关系占用资源较多，为了实现响应式数据需要添加很多依赖，以及
   watcher，而 vue3.0 没有 watcher，依靠的 effect 副作用函数以及 proxy 去做到响
   应式
3. vue2.0 数组支持需要特殊实现，动态属性的增加删除需要额外的 api(
   如$set.$delete),而 vue3.0 直接使用 proxy 搞定了
4. vue2.0 不支持 MAp,Set，vue3 支持

## 虚拟 dom 是什么？

虚拟 dom 就是一个 js 对象，一个对于真实 dom 的一个抽象，可以表示一个真实 dom 的
基本结构

## 为什么需要虚拟 dom？

1. 虚拟 dom 可以做到定点更新，可以对于两次虚拟 dom 进行对比，只更新变化的节点
2. 通过虚拟 dom 可以更好做跨平台，数据驱动可以直接驱动虚拟 dom,渲染层可以更好写
   出跨平台的代码
3. 虚拟 dom 可以在真实 dom 生成之前做一些兼容性处理或优化工作，减少人为犯错的可
   能

## vue3 编译器优化策略

1. 静态节点提升
2. 补丁标记和动态属性记录
3. 缓存事件处理程序
4. 块 block，把静态的内容剔除，将需要更新的节点取出来作为块

## 响应系统的实现

> Vue2: Object.defineProperty。Vue3：Proxy

#### Object.defineProperty

```
// 响应式函数
function reactive(obj, key, value) {
  Object.defineProperty(data, key, {
    get() {
      console.log(`访问了${key}属性`)
      return value
    },
    set(val) {
      console.log(`将${key}由->${value}->设置成->${val}`)
      if (value !== val) {
        value = val
      }
    }
  })
}


const data = {
  name: 'xxx',
  age: 22
}
Object.keys(data).forEach(key => reactive(data, key, data[key]))
console.log(data.name)
// 访问了name属性
// xxx
data.name = 'yyy' // 将name由->xxx->设置成->yyy
console.log(data.name)
// 访问了name属性
// yyy
```

弊端：新增一个属性后，并不会重新触发 get 和 set

```
data.hobby = '打篮球'
console.log(data.hobby) // 打篮球
data.hobby = '打游戏'
console.log(data.hobby) // 打游戏
```

Object.defineProperty**只对初始对象里的属性有监听作用，而对新增的属性无效**。这
也是为什么 Vue2 中对象新增属性的修改需要使用 Vue.$set 来设值的原因。

#### Proxy

```
function reactive(target) {
  const handler = {
    get(target, key, receiver) {
      console.log(`访问了${key}属性`)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      console.log(`将${key}由->${target[key]}->设置成->${value}`)
      Reflect.set(target, key, value, receiver)
    }
  }

  return new Proxy(target, handler)
}

const data = {
  name: 'xxx',
  age: 22
}

const proxyData = reactive(data)

console.log(proxyData.name)
// 访问了name属性
// 林三心
proxyData.name = 'yyy'
// 将name由->xxx->设置成->yyy
console.log(proxyData.name)
// 访问了name属性
// yyy
```

效果与上面的 Object.defineProperty 没什么差别，新增属性时会重新触发 get 和 set

```
proxyData.hobby = '打篮球'
console.log(proxyData.hobby)
// 访问了hobby属性
// 打篮球
proxyData.hobby = '打游戏'
// 将hobby由->打篮球->设置成->打游戏
console.log(proxyData.hobby)
// 访问了hobby属性
// 打游戏
```

### 响应式渐入佳境

例子：

```
let name = '林三心', age = 22, money = 20
let myself = `${name}今年${age}岁，存款${money}元`

console.log(myself) // 林三心今年22岁，存款20元

money = 300

// 预期：林三心今年22岁，存款300元
console.log(myself) // 实际：林三心今年22岁，存款20元
```

问题思考：如何让 myself 跟着 money 变?

#### 封装 effect 函数，重新执行一遍 myself

```
let name = '林三心', age = 22, money = 20
let myself = ''
const effect = () => myself = `${name}今年${age}岁，存款${money}元`

effect() // 先执行一次
console.log(myself) // 林三心今年22岁，存款20元
money = 300

effect() // 再执行一次

console.log(myself) // 林三心今年22岁，存款300元
```

问题思考：如果有很多个 effect 函数，难道要写很多个吗？

#### 用 `track函数` 把所有依赖于`变量`的 `effect函数` 都收集起来，放在 `dep` 里

dep 为什么用 `Set` 呢？因为 `Set` 可以自动去重。搜集起来之后，以后**只要 money
变量一改变，就执行 trigger 函数通知 dep 里所有依赖 money 变量的 effect 函数执行
，实现依赖变量的更新**。

```
let name = '林三心', age = 22, money = 20
let myself = '', ohtherMyself = ''
const effect1 = () => myself = `${name}今年${age}岁，存款${money}元`
const effect2 = () => ohtherMyself = `${age}岁的${name}居然有${money}元`

const dep = new Set()
function track () {
    dep.add(effect1)
    dep.add(effect2)
}
function trigger() {
    dep.forEach(effect => effect())
}
track() //收集依赖
effect1() // 先执行一次
effect2() // 先执行一次
console.log(myself) // 林三心今年22岁，存款20元
console.log(ohtherMyself) // 22岁的林三心居然有20元
money = 300

trigger() // 通知变量myself和otherMyself进行更新

console.log(myself) // 林三心今年22岁，存款300元
console.log(ohtherMyself) // 22岁的林三心居然有300元
```

问题思考：如果变量是对象怎么办？它的每一个属性都应该有对应的 dep？如果是多个对象
又怎么办？

#### 单个对象：使用 Map 存储对象里属性的 dep。多个对象：使用 WeakMap 存储多个对象里属性的 dep。

单个对象：Map

```
const person = { name: '林三心', age: 22 }

const depsMap = new Map()
function track(key) {
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    // 这里先暂且写死
    if (key === 'name') {
        dep.add(effectNameStr1)
        dep.add(effectNameStr2)
    } else {
        dep.add(effectAgeStr1)
        dep.add(effectAgeStr2)
    }
}
function trigger (key) {
    const dep = depsMap.get(key)
    if (dep) {
        dep.forEach(effect => effect())
    }
}
```

多个对象：weakMap

```
const person = { name: '林三心', age: 22 }
const animal = { type: 'dog', height: 50 }

const targetMap = new WeakMap()
function track(target, key) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    // 这里先暂且写死
    if (target === person) {
        if (key === 'name') {
            dep.add(effectNameStr1)
            dep.add(effectNameStr2)
        } else {
            dep.add(effectAgeStr1)
            dep.add(effectAgeStr2)
        }
    } else if (target === animal) {
        if (key === 'type') {
            dep.add(effectTypeStr1)
            dep.add(effectTypeStr2)
        } else {
            dep.add(effectHeightStr1)
            dep.add(effectHeightStr2)
        }
    }
}

function trigger(target, key) {
    let depsMap = targetMap.get(target)
    if (depsMap) {
        const dep = depsMap.get(key)
        if (dep) {
            dep.forEach(effect => effect())
        }
    }
}
```

使用

```
const person = { name: '林三心', age: 22 }
const animal = { type: 'dog', height: 50 }
let nameStr1 = ''
let nameStr2 = ''
let ageStr1 = ''
let ageStr2 = ''
let typeStr1 = ''
let typeStr2 = ''
let heightStr1 = ''
let heightStr2 = ''

const effectNameStr1 = () => { nameStr1 = `${person.name}是个大菜鸟` }
const effectNameStr2 = () => { nameStr2 = `${person.name}是个小天才` }
const effectAgeStr1 = () => { ageStr1 = `${person.age}岁已经算很老了` }
const effectAgeStr2 = () => { ageStr2 = `${person.age}岁还算很年轻啊` }
const effectTypeStr1 = () => { typeStr1 = `${animal.type}是个大菜鸟` }
const effectTypeStr2 = () => { typeStr2 = `${animal.type}是个小天才` }
const effectHeightStr1 = () => { heightStr1 = `${animal.height}已经算很高了` }
const effectHeightStr2 = () => { heightStr2 = `${animal.height}还算很矮啊` }

track(person, 'name') // 收集person.name的依赖
track(person, 'age') // 收集person.age的依赖
track(animal, 'type') // animal.type的依赖
track(animal, 'height') // 收集animal.height的依赖



effectNameStr1()
effectNameStr2()
effectAgeStr1()
effectAgeStr2()
effectTypeStr1()
effectTypeStr2()
effectHeightStr1()
effectHeightStr2()

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// 林三心是个大菜鸟 林三心是个小天才 22岁已经算很老了 22岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// dog是个大菜鸟 dog是个小天才 50已经算很高了 50还算很矮啊

person.name = 'sunshine_lin'
person.age = 18
animal.type = '猫'
animal.height = 20

trigger(person, 'name')
trigger(person, 'age')
trigger(animal, 'type')
trigger(animal, 'height')

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// sunshine_lin是个大菜鸟 sunshine_lin是个小天才 18岁已经算很老了 18岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// 猫是个大菜鸟 猫是个小天才 20已经算很高了 20还算很矮啊
```

问题思考：总是手动去执行 track 函数进行依赖收集，并且当数据改变时手动执行
trigger 函数去进行通知更新。如何自动通知更新？

#### 使用 Proxy 搭配 Reflect 实现自动通知更新

```
function reactive(target) {
    const handler = {
        get(target, key, receiver) {
            track(receiver, key) // 访问时收集依赖
            return Reflect.get(target, key, receiver)
        },
        set(target, key, value, receiver) {
            Reflect.set(target, key, value, receiver)
            trigger(receiver, key) // 设值时自动通知更新
        }
    }

    return new Proxy(target, handler)
}

function track(target, key) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    // 这里先暂且写死
    if (target === person) {
        if (key === 'name') {
            dep.add(effectNameStr1)
            dep.add(effectNameStr2)
        } else {
            dep.add(effectAgeStr1)
            dep.add(effectAgeStr2)
        }
    } else if (target === animal) {
        if (key === 'type') {
            dep.add(effectTypeStr1)
            dep.add(effectTypeStr2)
        } else {
            dep.add(effectHeightStr1)
            dep.add(effectHeightStr2)
        }
    }
}

function trigger(target, key) {
    let depsMap = targetMap.get(target)
    if (depsMap) {
        const dep = depsMap.get(key)
        if (dep) {
            dep.forEach(effect => effect())
        }
    }
}
```

使用时无需再手动调用 `track` 和 `trigger`。在执行 `effect 函数`时会自动调用
`Proxy 的 get 方法`，`修改对象属性值`时会自动调用 `Proxy 的 set 方法`

```
const person = reactive({ name: '林三心', age: 22 }) // 传入reactive
const animal = reactive({ type: 'dog', height: 50 }) // 传入reactive

// 自动调用 get
effectNameStr1()
effectNameStr2()
effectAgeStr1()
effectAgeStr2()
effectTypeStr1()
effectTypeStr2()
effectHeightStr1()
effectHeightStr2()

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// 林三心是个大菜鸟 林三心是个小天才 22岁已经算很老了 22岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// dog是个大菜鸟 dog是个小天才 50已经算很高了 50还算很矮啊

// 自动调用 set
person.name = 'sunshine_lin'
person.age = 18
animal.type = '猫'
animal.height = 20

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// sunshine_lin是个大菜鸟 sunshine_lin是个小天才 18岁已经算很老了 18岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// 猫是个大菜鸟 猫是个小天才 20已经算很高了 20还算很矮啊
```

<a data-fancybox title="img" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/413bd2e621004d0c9838c200bd658f05~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/413bd2e621004d0c9838c200bd658f05~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

问题思考：在 track 方法中，我们是写死对象属性的判断，并讲 effect 方法添加到对应
的 dep。如何让其自动添加？

#### 当 effect 执行的时候会触发 Proxy 的 get 方法， 执行 track 将其放入到对应的 dep 中

使用一个全局变量 activeEffect 存储当前的 effect 函数，执行完 effect 函数后，重置
回 null

```
let activeEffect = null
function effect(fn) {
    activeEffect = fn
    activeEffect()
    activeEffect = null // 执行后立马变成null
}
function track(target, key) {
    // 如果此时activeEffect为null则不执行下面
    // 这里判断是为了避免例如console.log(person.name)而触发track
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    dep.add(activeEffect) // 把此时的activeEffect添加进去
}

// 每个effect函数改成这么执行，当执行时，会先执行 effect 方法，然后在 Proxy 中触发 get 方法执行 track
effect(effectNameStr1)
effect(effectNameStr2)
effect(effectAgeStr1)
effect(effectAgeStr2)
effect(effectTypeStr1)
effect(effectTypeStr2)
effect(effectHeightStr1)
effect(effectHeightStr2)
```

<a data-fancybox title="img" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/397c1c8c167f4837b641e560b84d17d0~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/397c1c8c167f4837b641e560b84d17d0~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

### 总结

最后的代码

```
// 使用 proxy 实现自动触发 track 和 trigger
function reactive(target) {
    const handler = {
        get(target, key, receiver) {
            track(receiver, key) // 访问时收集依赖
            return Reflect.get(target, key, receiver)
        },
        set(target, key, value, receiver) {
            Reflect.set(target, key, value, receiver)
            trigger(receiver, key) // 设值时自动通知更新
        }
    }

    return new Proxy(target, handler)
}

// 使用 activeEffect 存储当前触发的 effect
let activeEffect = null
function effect(fn) {
    activeEffect = fn
    activeEffect()
    activeEffect = null // 执行后立马变成null
}

//  当 effect 方法初始化时触发 Proxy 的 get 方法，将 effect函数分发到对应的 dep 中
function track(target, key) {
    // 如果此时activeEffect为null则不执行下面
    // 这里判断是为了避免例如console.log(person.name)而触发track
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    dep.add(activeEffect) // 把此时的activeEffect添加进去
}

// 当变量改变，触发 Proxy 的 set 方法，然后执行对应 dep 中的所有 effect 函数
function trigger(target, key) {
    let depsMap = targetMap.get(target)
    if (depsMap) {
        const dep = depsMap.get(key)
        if (dep) {
            dep.forEach(effect => effect())
        }
    }
}
```

使用

```
const person = reactive({ name: '林三心', age: 22 }) // 传入reactive
const animal = reactive({ type: 'dog', height: 50 }) // 传入reactive

let nameStr1 = ''
let nameStr2 = ''
let ageStr1 = ''
let ageStr2 = ''
let typeStr1 = ''
let typeStr2 = ''
let heightStr1 = ''
let heightStr2 = ''

const effectNameStr1 = () => { nameStr1 = `${person.name}是个大菜鸟` }
const effectNameStr2 = () => { nameStr2 = `${person.name}是个小天才` }
const effectAgeStr1 = () => { ageStr1 = `${person.age}岁已经算很老了` }
const effectAgeStr2 = () => { ageStr2 = `${person.age}岁还算很年轻啊` }
const effectTypeStr1 = () => { typeStr1 = `${animal.type}是个大菜鸟` }
const effectTypeStr2 = () => { typeStr2 = `${animal.type}是个小天才` }
const effectHeightStr1 = () => { heightStr1 = `${animal.height}已经算很高了` }
const effectHeightStr2 = () => { heightStr2 = `${animal.height}还算很矮啊` }

// 自动调用 get
effectNameStr1()
effectNameStr2()
effectAgeStr1()
effectAgeStr2()
effectTypeStr1()
effectTypeStr2()
effectHeightStr1()
effectHeightStr2()

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// 林三心是个大菜鸟 林三心是个小天才 22岁已经算很老了 22岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// dog是个大菜鸟 dog是个小天才 50已经算很高了 50还算很矮啊

// 自动调用 set
person.name = 'sunshine_lin'
person.age = 18
animal.type = '猫'
animal.height = 20

console.log(nameStr1, nameStr2, ageStr1, ageStr2)
// sunshine_lin是个大菜鸟 sunshine_lin是个小天才 18岁已经算很老了 18岁还算很年轻啊

console.log(typeStr1, typeStr2, heightStr1, heightStr2)
// 猫是个大菜鸟 猫是个小天才 20已经算很高了 20还算很矮啊
```

#### 明白概念以及作用

**effect 函数**：当变量改变时，需要执行的方法

```
const effectNameStr1 = () => { nameStr1 = `${person.name}是个大菜鸟` }
```

**activeEffect**：当前执行的 effect 函数

**weakMap**：用来存储所有的对象 **depsMap**：就是对象(new Map()) **dep**：就是对
象的属性(去重 new Set())，每一个属性都应该有一个 dep,这个 dep 用来存储该属性对应
的所有 effect 方法

**track 方法**：将当前执行的 effect 函数添加到对应的 dep 中，全部存储在 weakMap
中 **trigger 方法**：当变量改变时，在存储的 weakMap 中找到该变量对应的 dep，并执
行 dep 中的所有 effect 函数，即更新

**Proxy**：

- 当 effect 函数执行时，即读取变量内容时，调用 get 方法并执行 track 方法。
- 当变量改变时，调用 set 方法并执行 trigger 方法

#### 总结过程

- 将对象传入到封装的 Proxy 中，get 方法中执行 track，set 方法中执行 trigger
- 编写 track 方法分发 effect 函数到 对应 dep 中，并全部存储到 weakMap 中，即收集
- 编写 trigger 方法执行当前改变的变量对应的 dep 中的所有 effect 函数，即更新
- 定义对象，定义 effect 函数自动触发 track 收集依赖；当对象属性值改变时，自动触
  发 trigger 执行属性对应的 dep 中的所有 effect 方法，更新视图。

## 实现 ref

上面的过程已经实现了 reactive,ref 其实就是一个 `reactive 下有一个属性叫 value`

```
function ref (initValue) {
    return reactive({
        value: initValue
    })
}
```

## 实现 computed

computed 的实现就是通过 ref 的响应式，在 effect 里面将 fn 执行函数赋值给 ref，返
回这个 ref。这样当 fn 中的变量发生改变，就会自动触发 Proxy 的 set 方法，更新
ref。

```
function computed(fn) {
    const result = ref()
    effect(() => result.value = fn()) // 执行computed传入函数
    return result
}
```

## 最终代码

```
const targetMap = new WeakMap()
function track(target, key) {
    // 如果此时activeEffect为null则不执行下面
    // 这里判断是为了避免例如console.log(person.name)而触发track
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, dep = new Set())
    }
    dep.add(activeEffect) // 把此时的activeEffect添加进去
}
function trigger(target, key) {
    let depsMap = targetMap.get(target)
    if (depsMap) {
        const dep = depsMap.get(key)
        if (dep) {
            dep.forEach(effect => effect())
        }
    }
}
function reactive(target) {
    const handler = {
        get(target, key, receiver) {
            track(receiver, key) // 访问时收集依赖
            return Reflect.get(target, key, receiver)
        },
        set(target, key, value, receiver) {
            Reflect.set(target, key, value, receiver)
            trigger(receiver, key) // 设值时自动通知更新
        }
    }

    return new Proxy(target, handler)
}
let activeEffect = null
function effect(fn) {
    activeEffect = fn
    activeEffect()
    activeEffect = null
}
function ref(initValue) {
    return reactive({
        value: initValue
    })
}
function computed(fn) {
    const result = ref()
    effect(() => result.value = fn())
    return result
}
```

## Proxy 和 Reflect

### Proxy

```
const person = { name: '林三心', age: 22 }

const proxyPerson = new Proxy(person, {
    get(target, key, receiver) {
        console.log(target) // 原来的person
        console.log(key) // 属性名
        console.log(receiver) // 代理后的proxyPerson
    },
    set(target, key, value, receiver) {
        console.log(target) // 原来的person
        console.log(key) // 属性名
        console.log(value) // 设置的值
        console.log(receiver) // 代理后的proxyPerson
    }
})

proxyPerson.name // 访问属性触发get方法

proxyPerson.name = 'sunshine_lin' // 设置属性值触发set方法
```

### Reflect

Reflect 的两个方法

- `get(target, key, receiver)`：个人理解就是，访问`target`的`key`属性，但
  是`this`是指向`receiver`，所以实际是访问的值是`receiver`的`key`的值，但是这可
  不是直接访问`receiver[key]`属性，大家要区分一下
- `set(target, key, value, receiver)`：个人理解就是，设置`target`的`key`属性
  为`value`，但是`this`是指向`receiver`，所以实际是是设置`receiver`的`key`的值
  为`value`，但这可不是直接`receiver[key] = value`，大家要区分一下

正确的做法：

```
const person = { name: '林三心', age: 22 }

const proxyPerson = new Proxy(person, {
    get(target, key, receiver) {
        return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
        Reflect.set(target, key, value, receiver)
    }
})

console.log(proxyPerson.name) // 林三心

proxyPerson.name = 'sunshine_lin'

console.log(proxyPerson.name) // sunshine_lin
```

不能直接 `receiver[key]` 的原因是因为会导致无限循环。

其实 Proxy 不搭配 Reflect 也是可以的

```
const proxyPerson = new Proxy(person, {
    get(target, key, receiver) {
        return target[key]
    },
    set(target, key, value, receiver) {
        target[key] = value
    }
})
```

那为什么建议 Proxy 和 Reflect 一起使用呢？因为 Proxy 和 Reflect 的方法都是一一对
应的，在 Proxy 里使用 Reflect 会`提高语义化`

- `Proxy`的`get`对应`Reflect.get`
- `Proxy`的`set`对应`Reflect.set`
