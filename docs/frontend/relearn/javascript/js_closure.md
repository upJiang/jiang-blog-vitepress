---
title: "作用域与闭包"
description: "从词法环境和生命周期理解闭包、var、let 与 Realm"
category: frontend
tags: ["JavaScript","Closure"]
updated: 2026-08-18
order: 470
depth: reference
series: "重学前端"
---
# 作用域与闭包

写一个计数器时，`count` 既不能暴露成全局变量，又要在函数返回后继续存活。闭包解决的就是这个生命周期问题：函数保留对定义位置词法环境的引用，调用时仍能解析其中的绑定。

## 作用域链决定一次读取去哪找

JavaScript 使用词法作用域。函数在哪里定义，决定它能看到哪些外层绑定；函数在哪里调用，不会改变这条链。

```js
const label = 'global'

function makeReader() {
  const label = 'local'
  return function read() {
    return label
  }
}

const read = makeReader()
console.log(read())
```

`read` 的调用位置在全局，返回值仍是 `local`。引擎解析 `label` 时先查 `read` 自己的环境，再查创建它的 `makeReader` 环境，最后才到全局环境。这个过程与 `this` 的绑定规则不同，箭头函数捕获 `this` 也不等于捕获所有外层变量。

## 闭包保存的是可达绑定

调用 `makeReader` 结束后，它的执行上下文可以退出，但 `read` 仍然引用其中的词法环境。垃圾回收器从全局对象、活动栈和其他根对象出发，只要这条环境仍可达，`label` 就不能回收。

```js
function createCounter() {
  let count = 0
  return {
    next() {
      count += 1
      return count
    },
    reset() {
      count = 0
    },
  }
}

const counter = createCounter()
counter.next()
counter.next()
counter.reset()
```

这里的闭包是两个方法与同一词法环境的组合。调用方拿不到 `count` 这个绑定，只能通过方法改变它。若对象被丢弃，整个环境也会变得不可达。

## `var`、`let` 和循环捕获

`var` 的绑定属于函数作用域，`let` 和 `const` 属于块级作用域。循环中的 `let` 每轮创建一个新的绑定，因此异步回调可以读到当轮值；`var` 只有一个共享绑定。

```js
const tasks = []
for (let index = 0; index < 3; index += 1) {
  tasks.push(() => index)
}

console.log(tasks.map((task) => task()))
```

需要兼容旧代码时，可以在 `var` 循环中用 IIFE 或显式参数复制值，但优先改成块级声明。循环闭包真正需要关注的是绑定是否共享、回调何时执行和回调是否会被长期保存。

## 闭包与内存泄漏不是同义词

闭包让数据继续可达，这可能是设计需要，也可能是无意保留。定时器、事件监听器、缓存和 DOM 节点常把闭包保留很久。泄漏发生在对象已经不再需要，却仍能从某个根对象沿引用链到达。

排查时先找持有者，再决定释放方式：清除定时器，移除监听器，缩小缓存，解除对 DOM 的引用，或让组件销毁时丢弃回调。只看到“函数捕获了变量”不能推出泄漏。

## Realm 会改变全局对象身份

每个窗口、Worker 或 iframe 都有自己的 Realm。来自另一个 Realm 的数组，其原型来自另一个全局对象，因此 `value instanceof Array` 可能为假。跨 Realm 判断优先使用 `Array.isArray` 或对象标签，并明确消息传递的结构化克隆规则。

## 如何观察闭包的真实边界

在浏览器中给回调设置断点，Scope 面板可以显示当前可见绑定。Heap Snapshot 用来确认对象由哪条引用链保留，不能把调试器展示的内部名称当成 ECMAScript 公开属性。

验证一组闭包时，分别检查返回值、解绑后的可达性和跨 Realm 行为。一个运行结果只能证明当前引擎与输入，规范语义和垃圾回收时机应分开记录。
