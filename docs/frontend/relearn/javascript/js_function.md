---
title: "JavaScript 函数"
description: "从调用方式理解 this、普通函数、箭头函数、生成器和异步函数"
category: frontend
tags: ["JavaScript","Function"]
updated: 2026-08-05
order: 460
depth: reference
series: "重学前端"
---
# JavaScript 函数

JavaScript 函数既是对象，也可能带有规范内部方法 `[[Call]]` 和 `[[Construct]]`。前者让值可以被调用，后者让值可以跟在 `new` 后面。普通函数通常两者都有，箭头函数只有调用能力，类构造器只有构造能力。把这两个入口分开，`this`、`new` 和 `bind` 的许多边界会清楚很多。

## 调用表达式保存了接收者

执行 `obj.method()` 时，成员访问会产生一个带基值的引用。调用阶段从引用中取出函数，并把基值 `obj` 作为 `this` 传入。先把函数取出来，引用关系就丢了。

~~~js
'use strict'

const counter = {
  value: 2,
  read() {
    return this.value
  },
}

const detached = counter.read

console.log(counter.read()) // 2
console.log(detached()) // TypeError
~~~

第二次调用的 `this` 是 `undefined`。类方法和模块代码默认处在严格模式中，普通严格函数也不会把 `undefined` 替换成全局对象。依赖隐式接收者的方法传给定时器、事件系统或数组高阶函数之前，需要明确绑定，或包一层负责调用的函数。

## 普通函数怎样确定 this

普通函数的 `this` 由调用入口决定。直接调用、成员调用、`call`、`apply` 和构造调用会给出不同结果。

~~~js
function inspect(prefix) {
  return `${prefix}:${this.name}`
}

const user = { name: 'Ada' }

console.log(inspect.call(user, 'call'))
console.log(inspect.apply(user, ['apply']))

const bound = inspect.bind(user, 'bound')
console.log(bound())
~~~

`call` 接收逐个参数，`apply` 接收类数组参数，两者都会立即调用目标函数。`bind` 创建 Bound Function Exotic Object，先保存目标函数、绑定的 `this` 和前置参数，稍后再调用。

绑定函数仍可能被 `new` 调用。只要原目标可构造，构造调用会忽略已绑定的 `this`，使用新实例作为接收者；前置参数仍然生效。因此“bind 后 this 永远不会变化”只适用于普通调用。

~~~js
function Account(name) {
  this.name = name
}

const ignored = { name: 'ignored' }
const BoundAccount = Account.bind(ignored, 'Grace')
const account = new BoundAccount()

console.log(account.name) // Grace
console.log(ignored.name) // ignored
console.log(account instanceof Account) // true
~~~

## 箭头函数捕获外层 this

箭头函数的 `[[ThisMode]]` 是 lexical。函数体读取 `this`、`arguments`、`super` 或 `new.target` 时，会沿外层词法环境查找。成员调用不会重新绑定它，`call`、`apply` 和 `bind` 也改不了它。

~~~js
const panel = {
  id: 'settings',
  createReader() {
    return () => this.id
  },
}

const read = panel.createReader()
console.log(read()) // settings
~~~

这正适合回调继续使用外层方法的接收者。把箭头函数直接放在对象字面量里当方法，通常会捕获模块或脚本外层的 `this`，并不会指向该对象。

箭头函数没有 `[[Construct]]`，也没有普通构造函数那种自有 `prototype` 属性。对它使用 `new` 会抛出 `TypeError`。

## 方法的 HomeObject 服务于 super

对象方法简写和类方法会记录 `[[HomeObject]]`。执行 `super.method()` 时，运行时从 HomeObject 的原型开始查找属性，再把当前 `this` 作为调用接收者。把方法复制到另一个对象不会改写 HomeObject。

~~~js
const base = {
  label() {
    return this.name
  },
}

const child = {
  __proto__: base,
  name: 'child',
  label() {
    return `[${super.label()}]`
  },
}

console.log(child.label()) // [child]
~~~

`super` 不是一个可以保存到变量里的普通对象值。它依赖方法定义时的语法位置和 HomeObject，所以动态拼装继承方法时要谨慎。

## 构造调用有单独的返回规则

`new Constructor(...args)` 会根据构造器的 `prototype` 创建实例，把实例作为 `this` 执行构造器。普通构造器返回对象时，该对象替代新实例；返回原始值时，原始值被忽略。

~~~js
function First() {
  this.source = 'instance'
  return { source: 'explicit object' }
}

function Second() {
  this.source = 'instance'
  return 1
}

console.log(new First().source) // explicit object
console.log(new Second().source) // instance
~~~

派生类构造器的规则更严格。`super()` 完成之前读取 `this` 会抛错，因为实例初始化由父类构造过程建立。类构造器也不能像普通函数那样直接调用。

普通函数、类、箭头函数、生成器函数和异步函数都能以 `typeof value === 'function'` 暴露可调用外观，但能力并不相同。生成器调用返回迭代器，异步函数调用立刻返回 Promise，生成器函数与异步函数通常不可构造。

## 参数初始化先于函数体

调用开始后，运行时建立函数环境，绑定形参，再执行函数体。默认参数、解构参数和剩余参数都发生在参数初始化阶段。

~~~js
function connect(
  url,
  { retries = 2, signal } = {},
  ...labels
) {
  return { url, retries, signal, labels }
}

console.log(connect('/api', undefined, 'foreground'))
~~~

默认参数表达式可以读取前面的参数，不能读取函数体内才建立的 `let` 绑定。复杂参数列表还会影响 `arguments` 与形参的映射规则。新代码若需要参数集合，优先使用剩余参数，它是真数组，也不会携带旧式映射语义。

## 用调用矩阵验证函数行为

排查函数问题时，不要只跑 `fn()`。同一个函数至少覆盖直接调用、成员调用、`call`、`bind` 和 `new`，再记录是否有自有 `prototype`、是否能构造、返回值类型与异常。

测试替身只能证明这段 JavaScript 的语言行为。事件监听器如何传参、框架是否自动绑定方法、宿主回调把什么值设为 `this`，还要查看对应 API 合同并在真实运行环境验证。
