---
title: "Completion Record 与控制流"
description: "从规范完成记录理解 return、throw、break、finally 和表达式求值"
category: frontend
tags: ["JavaScript","Control Flow"]
updated: 2026-08-05
order: 520
depth: reference
series: "重学前端"
---
# Completion Record 与控制流

ECMAScript 规范用 **Completion Record（完成记录）** 表示一段算法怎样结束。它携带 `[[Type]]`、`[[Value]]` 和 `[[Target]]` 三个字段，让 `return`、`throw`、`break` 与 `continue` 可以穿过嵌套语句，直到遇到负责处理它们的结构。

完成记录是规范描述工具。JavaScript 代码无法直接读取它，开发者工具里也不会出现一个名为 Completion Record 的运行时对象。

## normal 与 abrupt 决定是否继续执行

`[[Type]]` 可以是 `normal`、`break`、`continue`、`return` 或 `throw`。除 normal 之外都属于 Abrupt Completion，后续语句通常停止执行并把记录向外传播。

~~~js
function classify(value) {
  if (value < 0) {
    return 'negative'
  }

  const doubled = value * 2
  return `value:${doubled}`
}
~~~

当 value 小于零时，`return` 产生 abrupt completion，函数体中的后续语句不会执行。函数调用算法消费 return 记录，把其中的值变成调用表达式的结果。没有显式返回值的函数按规则得到 `undefined`。

规范伪代码经常使用 `?` 和 `!`。前者表示某一步得到 abrupt completion 就立即向上传播，后者断言该步骤一定正常完成。它们是阅读规范算法的控制流标记，不是 JavaScript 运算符。
## 块语句传播第一条异常完成

块会按顺序执行内部语句。前一条语句正常完成，才会进入下一条；遇到 abrupt completion，块把它交给外层。

~~~js
function run(log) {
  log.push('before')
  return 7
  log.push('after')
}

const log = []
console.log(run(log)) // 7
console.log(log) // ['before']
~~~

`[[Value]]` 还可能是规范中的 empty，表示该语句没有提供值。empty 与 JavaScript 值 `undefined` 不相同，外层算法可以按规则把 empty 更新成先前值或替换成 `undefined`。这个区别主要用于准确阅读规范，业务代码不能直接观察它。
## 循环负责消费 break 与 continue

`break` 和 `continue` 会携带可选的 `[[Target]]`。循环检查目标是否为空或与自己的标签匹配，匹配后消费相应记录；不匹配就继续向外传播。

~~~js
const visited = []

outer: for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    if (row === 1 && column === 1) break outer
    visited.push([row, column])
  }
}

console.log(visited)
~~~

标签只能被词法上包围它的 `break` 引用，`continue label` 的目标还必须是迭代语句。回调函数形成新的函数边界，所以不能从 `forEach` 回调里 `break` 外层循环。需要可中断遍历时，直接使用 `for...of`，或让回调返回状态并由外层处理。
## throw 沿调用栈寻找处理者

`throw expression` 先求出表达式的值，再产生 throw completion。当前语句、块和函数都没有处理它时，记录继续向外传播。匹配的 `catch` 会把抛出的值绑定到参数，然后执行 catch 块。

~~~js
function parsePort(raw) {
  const port = Number(raw)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('invalid port')
  }

  return port
}

try {
  parsePort('70000')
} catch (error) {
  console.log(error.name) // RangeError
}
~~~

JavaScript 允许抛出任意值，但统一抛出 Error 或其子类能保留名称、消息、堆栈和 cause。catch 只能处理执行进入它所包围的同步控制流时产生的异常。定时器回调里的异常发生在之后的任务中，外层同步 try/catch 接不到。
## finally 可以保留，也可以覆盖先前结果

try 或 catch 结束后，finally 总会执行。finally 正常完成时，先前的 completion 继续传播；finally 自己产生 abrupt completion 时，它会覆盖先前结果。

~~~js
function preserved() {
  try {
    return 1
  } finally {
    console.log('cleanup')
  }
}

function replaced() {
  try {
    throw new Error('original')
  } finally {
    return 2
  }
}

console.log(preserved()) // 1
console.log(replaced()) // 2
~~~

第二个函数吞掉了原异常。finally 中的 `return`、`throw`、`break` 或 `continue` 都可能遮蔽正在传播的控制流，代码审查通常应把它们当作高风险写法。资源清理放在 finally 中，完成方式保持 normal，更容易保留原结果。
## 表达式求值还会产生 Reference

变量读取与属性访问在规范中常先得到 Reference Record。它记录基值、引用名和严格模式等信息，赋值、删除与函数调用再使用这些信息。`obj.method()` 能保留 obj 作为 `this`，正是因为调用算法收到的是成员访问产生的引用；把方法先赋给变量会丢掉基值。

~~~js
'use strict'

const box = {
  value: 4,
  read() {
    return this.value
  },
}

const direct = box.read
console.log(box.read()) // 4
console.log(direct()) // TypeError
~~~

Reference Record 与 Completion Record 分工不同。前者描述“值从哪里来、能否写回”，后者描述“这一步怎样结束”。两者都属于规范内部类型。
## async 函数把完成方式映射到 Promise

异步函数调用会立即返回 Promise。函数体最终正常返回时，Promise 履行；抛出异常时，Promise 拒绝。`await` 暂停当前异步函数，后续部分通过 Promise reaction job 继续。

~~~js
async function load() {
  throw new Error('network unavailable')
}

load().catch((error) => {
  console.log(error.message)
})
~~~

外层同步 try/catch 只能捕获调用表达式本身同步抛出的异常。要处理异步函数的拒绝，需要 `await` 它并放在 try/catch 中，或显式注册 rejection handler。
## 如何验证控制流判断

为一个控制流片段列出每个可能出口：normal、return、throw、break 和 continue。再检查哪个结构会消费它，finally 是否产生新出口，函数边界是否把结果转换成返回值或 Promise 状态。

可以用日志验证可观察顺序，但日志只显示执行过的路径。规范断言还要结合最小测试：覆盖 try 返回、catch 抛出、finally 正常、finally 返回、带标签循环以及异步拒绝。这样才能区分“清理代码执行了”和“原完成记录仍被保留”这两个问题。
