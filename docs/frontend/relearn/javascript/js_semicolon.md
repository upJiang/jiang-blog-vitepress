---
title: "自动分号插入"
description: "用解析规则而不是代码风格争论理解 ASI"
category: frontend
tags: ["JavaScript","ASI"]
updated: 2026-08-05
order: 510
depth: reference
series: "重学前端"
---
# 自动分号插入

JavaScript 允许省略一部分分号，因为解析器会在规定条件下执行 **ASI（Automatic Semicolon Insertion，自动分号插入）**。ASI 只负责让 Token 序列满足语法规则，它不知道开发者原本想把哪两行分开。

## ASI 在哪些位置尝试插入

规范规则可以归纳为三类场景：

- 解析遇到不允许继续的 Token，并且前面存在换行或右花括号时，尝试在前一个 Token 后插入分号。
- 遇到受限产生式中的换行时，在受限 Token 前插入分号。
- 输入结束后仍不能解析成完整 Script 或 Module 时，在末尾插入分号。

插入还受例外约束。它不能把 `for (...)` 头部需要的分号凭空补齐，也不会为了符合直觉而拆开一段本来就能继续解析的表达式。

“每个换行都相当于分号”会给出大量错误判断。只要下一行能接进当前表达式，解析器通常会继续。

## return 换行会提前结束语句

`return`、`throw`、部分 `break` 与 `continue`、后缀自增自减、`yield` 和 async arrow 等语法含有 `[no LineTerminator here]` 限制。换行出现在受限位置时，语义可能改变，或直接变成语法错误。

~~~js
function createRecord() {
  return
  {
    status: 'ready'
  }
}

console.log(createRecord()) // undefined
~~~

这里会在 `return` 后插入分号。下一行花括号被当成块语句，其中的 `status:` 又能解析为标签，所以代码甚至可能不报错。

`throw` 更严格：

~~~js
throw
new Error('failed')
~~~

这段代码是 SyntaxError，ASI 不会把它修成可用的 `throw;`，因为 throw 必须带表达式。需要返回或抛出长表达式时，把表达式开头留在同一行，或用括号明确包裹。

## 下一行的开头可能继续上一表达式

左括号、左方括号、模板字符串、正则或除号、加号和减号都可能把两行连成一个表达式。

~~~js
const first = () => console.log('first')
const second = () => console.log('second')

first
()
second
()
~~~

这段代码能按连续调用解析，换行没有强制分隔。更危险的情况是前一行的值碰巧允许属性访问或函数调用，程序可以运行，却做了另一件事。

数组开头也可能被解释为下标访问：

~~~js
const matrix = [[1, 2]]
[0].forEach((value) => console.log(value))
~~~

解析器可以把第二行接到前一表达式后面。具体结果取决于整段 Token 形成的语法树，代码审查靠肉眼很容易漏掉。

## 无分号风格怎样守住边界

选择无分号风格时，格式化器通常会在危险行前加防御性分号。

~~~js
;(() => {
  console.log('isolated expression')
})()

;[1, 2, 3].forEach((value) => {
  console.log(value)
})
~~~

前导分号结束上一条可能延续的表达式。实际项目应让格式化器和 linter 统一处理，不要让每位作者自己记一组行首字符。源码拼接、模板生成和压缩器也必须用真正的解析器，它们面对的是 Token 边界，字符串末尾看起来“像一句话结束”没有意义。

使用分号同样不能修复 `return` 后误换行，因为解析已经在受限位置结束。风格规则只能减少风险，无法取代语法理解。

## async、yield 与后缀运算符的换行边界

`async` 与函数或箭头参数之间的换行可能改变解析角色。后缀 `++`、`--` 前不允许换行，换行后可能被当成下一表达式的前缀运算符。

~~~js
let left = 1
let right = 2

left
++
right

console.log(left, right)
~~~

解析结果相当于 `left; ++right;`，最终是 1 和 3。看到运算符分到两行时，不要凭“离谁更近”推断，直接检查 AST。

生成器中的 `yield` 也有自己的受限规则，`yield*` 的星号位置不能随意换行。新语法加入语言后，格式化工具需要同步更新解析器版本。

## 用 AST 而不是运行结果确认

最小验证应同时做两件事。先用与生产构建一致的解析器读取代码，比较加分号前后的 AST；再运行含副作用计数的样本，确认调用次数、参数和异常。

`new Function(source)` 可以快速检查 Script 语法，但它不能解析静态 `import` 与 `export`，也不会展示实际分组。需要检查 Module 或精确节点时，使用项目已有的 Babel、Acorn、Espree 或 TypeScript 解析入口，并固定 source type 与语言版本。

团队要做的取舍很简单：选择一种格式化策略，交给工具稳定执行；在评审中关注 AST 是否符合意图。是否写分号属于风格，ASI 怎样解析属于语言语义。
