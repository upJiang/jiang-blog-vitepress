---
title: "JavaScript 语法结构"
description: "区分脚本、模块、声明、语句和表达式"
category: frontend
tags: ["JavaScript","Grammar"]
updated: 2026-08-05
order: 490
depth: reference
series: "重学前端"
---
# JavaScript 语法结构

词法系统产生 Token，语法分析器再把它们组织成树。运算符优先级、声明位置、模块边界和控制流都由这棵树决定。阅读一段容易误判的代码时，先问“它被解析成什么结构”，比直接猜输出可靠。

## 表达式计算值，语句控制执行

表达式会产生一个值或引用，语句决定执行顺序与控制流。声明负责在环境中建立绑定。三者在语法上有交叉，却不能互换。

```js
const total = 1 + 2 * 3

if (total > 5) {
  console.log(total)
}
```

初始化器 `1 + 2 * 3` 是表达式，`const` 是声明，`if` 是语句。块中的表达式语句调用 `console.log`。AST 会把乘法放在加法的右侧子树，因为乘法优先级更高。
## 优先级决定分组，结合性决定同级方向

优先级回答不同运算符怎样分组，结合性处理同一优先级的连续运算。赋值通常从右向左结合，减法从左向右结合。

```js
const value = 20 - 5 - 3
let left
let right
left = right = value
```

第一行等价于 `(20 - 5) - 3`，最后一行等价于 `left = (right = value)`。括号可以显式改变树，但不能让语法禁止的组合变合法。例如空值合并运算符与逻辑与、逻辑或直接混用时，需要括号明确意图。
## 声明位置会影响解析目标

函数声明、类声明和词法声明只在允许的语法位置出现。对象字面量与块语句都使用花括号，解析器根据上下文区分它们。

```js
const config = { mode: 'safe' }

{
  const mode = 'local'
  console.log(mode)
}
```

第一组花括号属于对象初始化器，第二组属于块。把一个对象字面量直接放到语句开头时，某些内容会被解释为标签语句；需要返回对象的箭头函数也要用括号包住对象。

```js
const createConfig = () => ({ mode: 'safe' })
```
## Script 与 Module 使用不同语法目标

经典脚本和 ECMAScript 模块共享大部分语法，但顶层语义不同。Module 允许静态 `import` 与 `export`，默认使用严格模式，并拥有独立模块作用域。Script 中的顶层 `await` 通常不合法，Module 可以按宿主支持的规则处理。

解析工具必须显式选择 `script` 或 `module`。把 Module 当 Script 解析，会把合法 `import` 报成错误；反过来，自动切到 Module 又可能掩盖经典脚本里的严格模式差异。
## Cover Grammar 为什么需要后续确认

有些字符序列在读到后面之前无法确定最终语法角色。括号中的参数列表可能是普通表达式，也可能成为箭头函数参数。

```js
const pair = (left, right) => [left, right]
const last = (left, right)
```

解析器先接受一组覆盖语法，再根据后续的 `=>` 和上下文完成重解释。解析完成后还要执行早期错误检查，例如参数重复、非法绑定模式或严格模式限制。
## 语法正确不代表程序可执行成功

解析器能生成 AST，只证明代码满足语法和早期错误约束。读取未初始化绑定、调用非函数、访问权限失败等问题发生在运行时。

```js
const data = null
console.log(data.value)
```

这段代码语法合法，执行到属性读取时才抛出 `TypeError`。静态分析器可以提前发现部分风险，但它使用的是类型和控制流规则，不属于 ECMAScript 语法本身。
## 用 AST 验证理解

选择支持目标 ECMAScript 版本的解析器，固定 `sourceType`，查看节点类型与起止位置。重点验证运算符分组、对象与块、箭头函数、可选链、类字段和 Module 声明。

再为每个片段区分三种结果：解析成功，解析阶段早期错误，运行时错误。格式化器输出相同不代表语义相同，最终以 AST、规范规则和执行测试共同确认。
