---
title: "JavaScript 对象模型"
description: "从属性描述符理解对象、访问器、内建能力和函数调用"
category: frontend
tags: ["JavaScript","Object"]
updated: 2026-08-05
order: 440
depth: reference
series: "重学前端"
---
# JavaScript 对象模型

JavaScript 对象是一组属性与内部行为的组合。属性不只是键和值，还包含可写、可枚举、可配置等描述符；对象读取、写入、删除和枚举时，会调用规范定义的内部方法。理解这一层，才能解释访问器、冻结、Proxy 和原型链为什么表现不同。

## 属性键只有 String 与 Symbol

普通对象的属性键最终是 String 或 Symbol。数字键会转换成字符串，Symbol 保持独立身份。

```js
const marker = Symbol('marker')
const record = {
  1: 'one',
  [marker]: 'hidden from Object.keys',
}

console.log(record['1'])
console.log(Reflect.ownKeys(record))
```

`Reflect.ownKeys` 同时返回字符串键与 Symbol 键。Symbol 不会自动保密，反射仍能读取它。

## 数据属性与访问器属性不能混合描述

数据属性保存 `value` 和 `writable`，访问器属性保存 `get` 与 `set`。两类都包含 `enumerable` 和 `configurable`。

```js
const account = {}

Object.defineProperty(account, 'balance', {
  value: 100,
  writable: false,
  enumerable: true,
  configurable: false,
})

console.log(Object.getOwnPropertyDescriptor(account, 'balance'))
```

通过 `defineProperty` 省略的布尔标志默认是 `false`，与对象字面量创建的普通属性不同。不可配置属性不能随意改成访问器，也不能删除；Proxy 必须遵守这些不变量。

访问器把函数放进属性读取和写入路径：

```js
const profile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  },
}
```

读取 `profile.fullName` 会调用 getter。序列化、日志和模板渲染如果访问属性，也可能触发用户代码；访问器内部异常要按调用边界处理。

## 内部方法定义对象怎样响应操作

规范用 `[[Get]]`、`[[Set]]`、`[[DefineOwnProperty]]`、`[[Delete]]`、`[[OwnPropertyKeys]]` 等内部方法描述对象行为。普通对象使用 Ordinary Object 的算法，数组、函数、模块命名空间和 TypedArray 等 Exotic Object 会覆盖部分规则。

这些双中括号名称是规范抽象，不是可以直接从 JavaScript 读取的真实属性。公开代码通过 `Reflect` 与 `Object` API 触发相应操作。

## 属性读取沿原型链，写入还要检查描述符

对象没有自有属性时，读取会沿 `[[Prototype]]` 向上查找。写入并非总是在接收者上创建属性：原型上的只读数据属性或无 setter 访问器可能阻止写入。

```js
const base = {}
Object.defineProperty(base, 'mode', {
  value: 'locked',
  writable: false,
})

const child = Object.create(base)
child.mode = 'open'

console.log(child.mode)
console.log(Object.hasOwn(child, 'mode'))
```

在非严格模式下，失败写入可能静默；严格模式会抛出 `TypeError`。库代码应使用 `Reflect.set` 查看布尔结果，或在严格模式中明确处理异常。

## 枚举顺序有规则，但不同 API 选择的键不同

自有属性键大体按整数索引、其他字符串插入顺序、Symbol 插入顺序排列。`Object.keys` 只返回可枚举字符串键，`Object.getOwnPropertyNames` 包含不可枚举字符串键，`Reflect.ownKeys` 再加 Symbol。

业务协议不应把普通对象的枚举顺序当作排序规则。需要稳定业务顺序时，显式排序或使用数组保存顺序。

## 防扩展、密封与冻结控制不同层

`Object.preventExtensions` 禁止增加自有属性；`Object.seal` 还把现有属性设为不可配置；`Object.freeze` 进一步把数据属性设为不可写。

冻结是浅层的：

```js
const config = Object.freeze({
  nested: { enabled: true },
})

config.nested.enabled = false
console.log(config.nested.enabled)
```

内层对象没有自动冻结。不可变状态需要递归策略、持久化数据结构或在更新边界创建新对象，不能只给顶层调用一次 `freeze`。

## Proxy 可以拦截操作，仍受目标对象不变量约束

Proxy 的 trap 对应一组内部方法。它适合观测、验证和虚拟对象，也会改变性能、错误栈和身份判断。

```js
const target = { status: 'ready' }
const proxy = new Proxy(target, {
  get(object, key, receiver) {
    if (key === 'secret') throw new Error('denied')
    return Reflect.get(object, key, receiver)
  },
})
```

trap 中优先用同名 Reflect 操作保持默认语义。Proxy 不能谎报不可配置属性不存在，也不能绕过不可扩展目标的键集合；违反不变量会抛错。

## 验证对象行为时看描述符和所有者

排查属性问题时同时检查 `Object.hasOwn`、`Object.getOwnPropertyDescriptor`、`Object.getPrototypeOf` 与 `Reflect.ownKeys`。再分别测试严格模式写入、删除、枚举、序列化和 Proxy 包装。

控制台展开对象时可能显示查看那一刻的当前值，不一定是日志调用时的快照。需要证据时显式复制所需字段，并避免复制 getter 产生的副作用。
