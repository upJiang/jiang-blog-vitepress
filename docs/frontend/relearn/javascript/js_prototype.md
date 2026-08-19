---
title: "原型与继承"
description: "从属性查找理解 [[Prototype]]、new、class 与组合"
category: frontend
tags: ["JavaScript","Prototype"]
updated: 2026-08-05
order: 450
depth: reference
series: "重学前端"
---
# 原型与继承

每个普通对象都有内部槽 `[[Prototype]]`，它保存另一个对象或 `null`。读取缺失属性时，运行时沿这条链继续查找。构造函数公开的 `prototype` 属性是另一个概念，它只是 `new` 选择实例原型时使用的普通属性。

## 属性读取会保留最初的接收者

读取 `child.name` 时，内部 `[[Get]]` 先检查 child 的自有属性。没有命中就访问原型，但 getter 中的 `this` 仍是最初的 child，这个值在规范算法中叫 receiver。

~~~js
const base = {
  get label() {
    return `item:${this.id}`
  },
}

const child = Object.create(base)
child.id = 7

console.log(child.label) // item:7
~~~

getter 定义在 base，实际读取者是 child。这个细节让原型方法能够处理实例状态，也解释了 Proxy 的 `get` trap 为什么通常要把 receiver 继续传给 `Reflect.get`。

原型链最终以 `null` 结束。使用 `Object.create(null)` 可以创建没有 `Object.prototype` 的字典对象，但它也没有 `toString`、`hasOwnProperty` 等继承方法。检查自有属性可统一使用 `Object.hasOwn(value, key)`。
## 写入会同时检查原型描述符

赋值不等于“总在当前对象创建属性”。运行时先查看已有属性及原型链上的描述符。原型上存在不可写数据属性时，子对象无法用普通赋值遮蔽它；原型上存在 setter 时，赋值会调用 setter。

~~~js
'use strict'

const base = {}
Object.defineProperty(base, 'mode', {
  value: 'locked',
  writable: false,
})

const child = Object.create(base)

try {
  child.mode = 'open'
} catch (error) {
  console.log(error.name) // TypeError
}

console.log(Object.hasOwn(child, 'mode')) // false
~~~

如果要精确创建自有属性，可以使用 `Object.defineProperty` 或 `Reflect.defineProperty`，并明确描述符。它们绕过普通赋值的查找路径，但仍要遵守对象不可扩展等约束。
## 函数的 prototype 怎样进入实例链

普通可构造函数通常有一个自有 `prototype` 属性。执行 `new Model()` 时，运行时读取 `Model.prototype`。该值是对象就作为新实例的 `[[Prototype]]`，否则回退到 `Object.prototype`。

~~~js
function Model(id) {
  this.id = id
}

Model.prototype.read = function read() {
  return this.id
}

const item = new Model(3)

console.log(Object.getPrototypeOf(item) === Model.prototype)
console.log(item.read()) // 3
~~~

`Model.prototype` 自身是对象，默认带有指回 Model 的 `constructor` 属性。这个属性可以被删除或覆盖，运行时构造并不依赖它。根据 `constructor` 推断实例类型并不稳妥。

替换整个 `Model.prototype` 只影响之后创建的实例。旧实例还指向旧对象，因为实例保存的是对象引用，并不会跟踪函数属性后来换成了什么。
## new 的四个可观察阶段

普通基类的构造过程可以用四步理解：

1. 从 `newTarget.prototype` 选择实例原型。
2. 创建对象并把它绑定为构造器中的 `this`。
3. 使用传入参数执行构造器。
4. 构造器显式返回对象时采用该对象，否则返回新实例。

这个模型能解释 `Reflect.construct(Target, args, NewTarget)`。它允许“执行哪个构造器”和“从谁的 prototype 取原型”分开，框架元编程偶尔会用到，普通业务代码很少需要。
## class 把原型操作放进稳定语法

类的实例方法定义在 `ClassName.prototype` 上，静态方法定义在类构造器自身。实例字段则在每次构造时写到实例，不会放进原型共享。

~~~js
class Counter {
  step = 1

  constructor(value = 0) {
    this.value = value
  }

  increment() {
    this.value += this.step
    return this.value
  }

  static from(value) {
    return new Counter(value)
  }
}
~~~

类方法默认不可枚举，类体默认严格模式。私有字段使用语言级品牌检查，既不是字符串属性，也不会沿原型链被普通反射 API 枚举。

`extends` 建立两条链：子类构造器的原型指向父类构造器，用于继承静态成员；子类的 `prototype` 对象指向父类的 `prototype`，用于实例方法查找。
## super 沿 HomeObject 的原型查找

方法中的 `super.name` 从该方法的 HomeObject 原型开始查找，调用时仍把当前 `this` 作为 receiver。它不会把 `this` 换成父对象。

~~~js
class Base {
  describe() {
    return this.name
  }
}

class Child extends Base {
  constructor(name) {
    super()
    this.name = name
  }

  describe() {
    return `child:${super.describe()}`
  }
}

console.log(new Child('Ada').describe())
~~~

派生构造器必须先调用 `super()` 才能访问 `this`。父类返回另一个对象时，派生实例还可能建立在那个返回对象上，这也是元编程框架需要测试的边界。
## instanceof 检查的是链，不是字段形状

默认的 `value instanceof Constructor` 会在 value 的原型链中查找 `Constructor.prototype`。跨 iframe 等 Realm 时，同名构造器拥有不同的 prototype 对象，因此 `instanceof` 可能返回 false。构造器还可以通过 `Symbol.hasInstance` 自定义判断。

数组使用 `Array.isArray` 更稳。外部数据应按字段协议校验，不能用 `instanceof` 代替输入验证。
## 动态修改原型的成本

`Object.setPrototypeOf` 会改变既有对象的查找路径。引擎针对稳定对象形状和原型链做优化，频繁修改会让优化假设失效，影响范围还可能超过当前对象。创建时用 `Object.create` 或 class 建好关系更容易推理。

原型共享方法适合表达同类对象的公共行为。共享可变数组或对象字段容易让实例互相影响，这类状态应在构造器或实例字段中创建。

验证继承关系时，同时观察 `Object.getPrototypeOf`、`Object.getOwnPropertyDescriptor`、`Object.hasOwn` 与 `Reflect.ownKeys`。再测试读取、遮蔽写入、getter、冻结对象和跨 Realm 输入，单看控制台打印的对象外形不足以证明原型关系。
