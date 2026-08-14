---
title: new、bind、instanceof、继承与深拷贝
description: 沿对象创建、原型查找和属性描述符解释常见手写题，处理构造器返回值、Symbol、循环引用和内建对象。
category: frontend
part: 基础与手写
chapter: 21
tags:
  - JavaScript
  - Prototype
  - Clone
prerequisites:
  - 对象、函数与原型基础
outcomes:
  - 解释五类能力的规范语义
  - 识别面试简化实现的边界
practice:
  type: implementation
  result: 实现并对照原生行为测试对象工具
  verify:
    - 原型、描述符和循环引用被保留
    - 不支持的宿主对象明确拒绝
evidence: public-source
updated: 2026-08-11
---

# new、bind、instanceof、继承与深拷贝

`new`、`bind`、`instanceof` 和继承描述的是 JavaScript 怎样调用函数、创建对象以及沿原型链判断或共享行为；深拷贝处理的是怎样复制一张对象图。前四项位于语言的函数与对象模型中，深拷贝是建立在这些语义之上的应用工具。把它们放在一起，是为了沿同一条“对象从哪里来、身份怎样判断、数据怎样复制”的路径对照原生行为，用来发现手写实现与原生语义的差异；它们不是一套 API。

这些手写题都围绕对象身份、函数调用和原型链。若只记 `Object.create + apply`，会漏掉构造器显式返回对象；若把深拷贝写成 JSON 序列化，会丢失循环引用、Date、Map、Symbol 和属性描述符。

## new 的四个阶段

构造调用创建以 `Constructor.prototype` 为原型的新对象，用新对象作为 this 执行函数。若构造器返回对象或函数，结果采用显式返回；返回原始值则忽略，仍采用新对象。

下面在支持 `Object.create` 与 `Reflect.apply` 的现代 JavaScript 环境运行。输入是一个可构造函数及参数，观察目标是新对象的原型、构造函数收到的 this 和最终返回选择；异常构造器与内建对象属于本节必须明确的失败边界。

```ts
function construct<T>(Constructor: new (...args: any[]) => T, ...args: unknown[]): T {
  const instance = Object.create(Constructor.prototype)
  const returned = Reflect.apply(Constructor as unknown as Function, instance, args)
  const isObject = returned !== null && (typeof returned === 'object' || typeof returned === 'function')
  return (isObject ? returned : instance) as T
}
```

函数先创建目标原型下的实例，再用 Reflect.apply 传入参数并取得构造器返回值；返回对象时采用该对象，返回原始值时保留新实例。若 Constructor 不是可构造函数、prototype 异常或内建对象依赖内部槽，这个教学实现会失败，工程代码应调用 Reflect.construct。

教学实现没有完整模拟 `new.target`、内建构造器和不可构造函数。工程代码直接使用 `Reflect.construct`，手写的价值是解释返回选择和原型建立。

## bind 的调用与构造双语义

绑定函数普通调用时固定 this 和前置参数；被 `new` 调用时，绑定的 this 被忽略，新实例应继承目标函数原型，并保持构造器返回规则。还涉及 `length、name` 和不可重新定义的内部槽，普通 JavaScript 包装无法百分百复刻原生 bind。

因此面试实现应先声明覆盖范围，再测试普通调用、偏参数、构造调用和返回对象。使用箭头函数包装会丢失动态 this 和构造能力，是常见错误。

## instanceof 的链路

默认 `left instanceof Right` 检查 `Right.prototype` 是否出现在 left 的原型链；右侧还可以通过 `Symbol.hasInstance` 自定义判断。跨 iframe 的 Array 拥有另一套 prototype，所以 `instanceof Array` 可能失败，类型识别常用 `Array.isArray`。

手写时必须拒绝右侧非可调用值，并考虑自定义 hasInstance。仅用 `__proto__` 循环忽略了公开 `Object.getPrototypeOf` 和协议入口。

## 继承是共享行为与实例状态的安排

ES class 的 `extends` 同时建立构造器静态继承和实例原型继承，`super()` 决定派生构造器 this 初始化。原型链适合共享方法，实例字段保存各对象状态。把数组等可变值放原型会让所有实例共享同一份状态。

组合通常比深层继承更容易维护：把变化能力作为显式对象或函数注入，避免基类私有假设扩散。回答继承题时应从属性查找和构造过程解释，不把 `class` 当作完全不同对象模型。

## 深拷贝先定义支持矩阵

通用深拷贝不存在一个适用于所有 JavaScript 值的短实现。函数闭包、WeakMap、DOM、Promise 和平台句柄不能可靠复制。`structuredClone` 支持循环引用、Map、Set、ArrayBuffer 等结构化可克隆值，并可转移 Transferable，但不保留函数和所有自定义原型语义。

自定义实现至少用 WeakMap 保存源对象到副本映射以处理循环；按类型创建 Date、RegExp、Map、Set、TypedArray；通过 Reflect.ownKeys 覆盖 Symbol 和不可枚举键；用属性描述符决定 getter 是保留还是求值。每个选择都影响安全与语义。

## 验证和边界

对原生行为建立对照测试：构造器返回原始值/对象、bind 后 new、跨 Realm 数组、不可枚举和 Symbol 属性、循环图、共享子对象、Map 对象键。共享子对象在副本中仍应共享同一克隆节点，不能复制成两份。

面试中先说明语言协议和支持范围，再给最小实现。写出几十行分支却不解释 getter、原型、宿主对象和循环图，不能称为通用深拷贝。

## 原型查找与跨 Realm 反例

`obj.prop` 先查自身属性描述符，再沿 `[[Prototype]]` 链查找；找到 getter 时 receiver 仍是最初 obj。`Object.create(null)` 没有 Object.prototype，原型污染防护和字典场景要用它或 Map。跨 iframe 的对象拥有不同 Realm 内建原型，可靠判断应使用品牌检查、`Array.isArray` 或结构化协议。

深拷贝的关键不在递归，而在图同构：输入 `a.self=a` 需要输出 `copy.self===copy`；输入 `a.left=a.right` 需要两条输出边指向同一副本。WeakMap 必须在遍历子属性前登记新对象，否则循环无法终止且共享关系会丢失。Accessor 是执行代码，复制 descriptor 与读取 value 是不同安全选择。

`structuredClone(value, { transfer: [buffer] })` 会转移而非复制 ArrayBuffer，源对象随后失去可用存储。Worker、MessagePort、File、DOM 节点和函数各有结构化克隆限制，应用协议应把不可克隆值列为显式错误，而不是 fallback 到 JSON。

## 官方依据

- [ECMAScript Ordinary Object Internal Methods](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html)
- [MDN: structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [MDN: instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)
