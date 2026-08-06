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

对象上明明没有 `speak`，调用时为什么仍能找到方法？因为属性读取会沿原型链向上查找。JavaScript 的 class 语法没有取消这套机制，它让我们用更清楚的语法创建实例、原型方法和继承关系。

## 先分清三个容易混淆的名字

- 对象内部的 `[[Prototype]]`：属性找不到时继续查找的对象，可用 `Object.getPrototypeOf()` 观察。
- 构造函数的 `.prototype` 属性：普通对象，`new` 会把它连接到新实例的 `[[Prototype]]`。
- `__proto__`：历史访问器，不适合新代码用来设计协议。

```mermaid
flowchart LR
  I[dog 实例] -->|[[Prototype]]| D[Dog.prototype]
  D -->|[[Prototype]]| A[Animal.prototype]
  A -->|[[Prototype]]| O[Object.prototype]
  O --> N[null]
```

读取 `dog.speak` 时，引擎从实例开始，逐层查到第一个同名属性。链走到 null 仍没找到，结果才是 undefined。

## 步骤一：手工建立一条原型链

预期结果是：`dog` 自己只有 name，却能读取 animal 的 kind 和 speak；给 dog 增加同名 speak 后，会遮蔽上层方法，但不会修改 animal。

```js
const animal = {
  kind: 'animal',
  speak() { return `${this.name} makes a sound` }
}

const dog = Object.create(animal)
dog.name = 'Milo'

console.log(dog.speak())
console.log(Object.hasOwn(dog, 'speak')) // false
console.log('speak' in dog)              // true

dog.speak = function () { return `${this.name} barks` }
console.log(dog.speak())
```

输入是以 animal 为原型创建的 dog。关键逻辑是 `Object.hasOwn()` 只检查自身，`in` 会查询整条链；输出先使用继承方法，再使用 dog 自己的遮蔽方法。写入普通属性通常落在接收者自身，但原型上的 setter 等情况会改变这一过程。

## 步骤二：理解 new 怎样连接 prototype

执行 `new Dog('Milo')` 时，运行时以 `Dog.prototype` 为原型创建实例，把实例作为 `this` 调用 Dog；构造器若没有返回另一个对象，就返回该实例。因此构造器适合初始化每个实例独有的数据，prototype 适合放所有实例共享的方法。

运行中频繁使用 `Object.setPrototypeOf()` 可能破坏引擎优化，也让对象行为难以追踪。通常在创建时用 `Object.create()` 或 class 建好关系，而不是之后动态换链。

`Object.create(null)` 创建没有 `Object.prototype` 的纯字典。它没有 `hasOwnProperty` 等继承方法，检查键应使用 `Object.hasOwn(dictionary, key)`。这也能避免把用户输入的 `__proto__` 当成普通对象访问器处理。

## 步骤三：class 仍然建立原型关系

class 的 constructor 初始化实例字段，普通方法放在类的 prototype 上，static 成员放在构造器自身。`extends` 建立构造器和 prototype 两条继承关系；派生类 constructor 在使用 `this` 前要调用 `super()`。

class 方法不是构造器，class 本身也不能像普通函数一样直接调用。私有字段使用独立的品牌检查，不会沿普通属性反射暴露。这些是 class 带来的语言规则，但实例方法查找仍走原型链。

## 继承何时会变得难维护

三四层继承容易让初始化顺序、`super` 调用和覆盖方法互相影响。子类如果依赖父类内部实现，父类的小改动也可能改变所有后代。此时可以把日志、缓存、重试等能力设计成独立对象或函数，再由业务对象组合使用。

组合不是永远优于继承。稳定的“is-a”关系和统一替换契约仍适合继承；关键是调用者能否只依赖明确公共行为，而不是层层读取父类内部状态。

## 失败结果与安全边界

直接合并不可信对象时，特殊属性名可能影响目标对象的原型或后续判断。应限制允许字段，使用安全合并方式，并只读取自身属性。跨 iframe 的对象来自另一个 Realm，即使形状相同，`instanceof` 也可能因构造器身份不同而失败。

测试原型关系时同时断言行为和所有权：方法能否调用、属性来自自身还是继承、遮蔽后上层是否保持不变。只断言 `instanceof` 无法覆盖代理、跨 Realm 和结构化数据场景。

## 参考资料

- [ECMAScript：Ordinary Object Internal Methods](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots)
- [ECMAScript：Class Definitions](https://tc39.es/ecma262/#sec-class-definitions)
- [MDN：Inheritance and the prototype chain](https://developer.mozilla.org/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- [MDN：Object.hasOwn](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)
