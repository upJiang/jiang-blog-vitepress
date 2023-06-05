## var、let 及 const 区别
为什么要存在提升这个事情呢，其实提升存在的根本原因就是为了`解决函数间互相调用的情况`
```
function test1() {
    test2()
}
function test2() {
    test1()
}
test1()
```
**var `变量提升`，会`挂载 window` 上**
```
console.log(a) // undefined
var a = 1

等用于：
var a
console.log(a) // undefined
a = 1
```
**let 暂时性死区，在声明之前使用会报错**
```
console.log(a)  // 报错
let a = 1
```

总结：
- 函数提升优先于变量提升，函数提升会把整个函数挪到作用域顶部，变量提升只会把声明挪到作用域顶部
- `var` 存在提升，我们能在声明之前使用。`let、const` 因为暂时性死区的原因，不能在声明前使用
- `var` 在全局作用域下声明变量会导致变量挂载在 `window` 上，其他两者不会
- `let` 和 `const` 作用基本一致，但是后者声明的变量不能再次赋值

## 原型继承和 Class 继承
其实在 JS 中并不存在类，`class 只是语法糖，本质还是函数`。
```
class Person {}
Person instanceof Function // true
```
class 继承
```
class Parent {
  constructor(value) {
    this.val = value
  }
  getValue() {
    console.log(this.val)
  }
}
class Child extends Parent {
  constructor(value) {
    super(value)
  }
}
let child = new Child(1)
child.getValue() // 1
child instanceof Parent // true
```

## commonJs 跟 ES Module 的区别
- CommonJS 支持动态导入，也就是 `require(${path}/xx.js)`，后者目前不支持，但是已有提案
- CommonJS 是同步导入，因为用于服务端，文件都在本地，同步导入即使卡住主线程影响也不大。而后者是异步导入，因为用于浏览器，需要下载文件，如果也采用同步导入会对渲染有很大影响
CommonJS 在导出时都是`值拷贝`，就算导出的值变了，导入的值也不会改变，所以如果想更新值，必须重新导入一次。但是 ES Module 采用`实时绑定`的方式，导入导出的值都指向同一个内存地址，所以导入值会跟随导出值变化
- ES Module 会编译成 require/exports 来执行的
 ## proxy
 ```
 let p = new Proxy(target, handler)
 ```
 `target` 代表需要添加代理的对象，`handler` 用来自定义对象中的操作，比如可以用来自定义 set 或者 get 函数。

 使用 Proxy 来实现一个数据响应式，
 Reflect.get 是获取一个对象的某个属性值，target：目标对象，property：键值，receiver：如果target对象中指定了getter，receiver则为getter调用时的this值。
 ```
 let onWatch = (obj, setBind, getLogger) => {
  let handler = {
    get(target, property, receiver) {
      getLogger(target, property)
      return Reflect.get(target, property, receiver)
    },
    set(target, property, value, receiver) {
      setBind(value, property)
      return Reflect.set(target, property, value)
    }
  }
  return new Proxy(obj, handler)
}

let obj = { a: 1 }
let p = onWatch(
  obj,
  (v, property) => {
    console.log(`监听到属性${property}改变为${v}`)
  },
  (target, property) => {
    console.log(`'${property}' = ${target[property]}`)
  }
)
p.a = 2 // 监听到属性a改变
p.a // 'a' = 2
 ```

 **[es6 的 的 reduce 直接看手写面试题篇的](https://blog.junfeng530.xyz/docs/interview/writeQuestion.html#reduce)**