---
title: "JavaScript 词法系统"
description: "理解空白、标识符、字面量、模板和正则的分词边界"
category: frontend
tags: ["JavaScript","Lexer"]
updated: 2026-08-05
order: 500
depth: reference
series: "重学前端"
---
# JavaScript 词法系统

JavaScript 引擎拿到源代码后，先把字符流识别成 Token，再交给语法分析器组成表达式、语句和声明。变量名、数字、字符串、正则、模板字符串与运算符都在这一层确定边界。词法切错一步，后面的 AST 就无从谈起。

## 源代码先经过 Unicode 与换行处理

ECMAScript 源文本是一串 Unicode 码点。编辑器保存的是 UTF-8 还是 UTF-16 文件，属于文件解码阶段；引擎解码后才按照 ECMAScript 的词法规则读取字符。

空白和换行不是一回事。普通空白通常只分隔 Token，换行还会影响自动分号插入、`return`、`throw`、`yield`、`async` 等受限产生式。注释虽然不进入程序语义，块注释中包含换行时，词法上仍可能产生换行效果。

```js
function getValue() {
  return
  { value: 1 }
}

console.log(getValue())
```

这里的返回值是 `undefined`。解析器看到 `return` 后的换行，会在允许的位置结束这条语句；下一行的花括号被解析成块语句。
## 标识符允许 Unicode，但显示相同不代表身份相同

标识符可以包含 Unicode 字符和转义序列。关键字不能直接用作普通绑定名，属性名的位置则有不同语法限制。

```js
const café = 1
const caf\u00E9 = 2

console.log(café)
```

第二个声明与第一个声明指向同一个标识符，因此会产生重复声明错误。Unicode 还存在视觉相似字符和规范化差异。语言不会替开发者统一所有视觉形式，安全敏感的标识符应限制字符集，并让代码审查工具检测混淆字符。
## 数字字面量的边界会改变后续 Token

十进制、二进制、八进制、十六进制、科学计数法、数字分隔符和 BigInt 都有各自的词法规则。数字后的点最容易暴露 Token 边界问题。

```js
12..toString()
12 .toString()
(12).toString()
```

三种写法都能访问数字的方法。`12.toString()` 会失败，因为词法分析器会尝试把第一个点归入数字字面量，后续字符无法组成合法结构。生产代码通常用括号，读者更容易确认边界。
## 字符串、模板字符串与转义

字符串字面量用单引号或双引号包围，换行必须通过转义表达。模板字符串允许换行和 `${...}` 插值，插值内部重新进入普通 JavaScript 语法。

```js
const user = 'Ada'
const message = `hello ${user.toUpperCase()}`
```

模板字符串还可以被标签函数处理。标签函数收到的是已解析的字符串片段和表达式结果，不会自动进行 HTML、SQL 或 Shell 转义。把不可信值放进模板仍要由目标协议的编码器处理。
## 正则字面量与除法不能只靠字符判断

`/` 既可能开始正则字面量，也可能表示除法。下面两段字符外观相近，词法目标却不同：

```js
const ratio = total / count / scale
const matched = /count/.test(text)
```

解析器会根据当前位置允许表达式开始，还是应继续一个表达式，选择不同的 Lexical Goal。独立正则表达式无法完整切分 JavaScript 源码；格式化器、高亮器和静态分析器需要真正的解析上下文。
## Token 与语法错误的边界

字符串没有闭合、数字格式非法，通常在词法阶段就无法继续。Token 都合法，也可能无法组成语法树。例如两个相邻数字分别合法，放在同一个表达式中却不合法。模块中的重复导出、`break` 指向不存在的标签等问题，还可能属于解析后的早期错误。

调试时可以把问题分成三层：字符能否形成 Token，Token 能否形成语法结构，结构执行时是否触发运行时错误。只看到 `SyntaxError` 不能断定一定是词法问题。
## 怎样验证词法边界

使用固定 Node.js 或浏览器版本，将最小片段交给同一个解析入口。`new Function(source)` 适合快速判断 Script 语法，不能解析含顶层 `import` 的 Module，也不会暴露 Token 列表。

需要观察 Token 时使用成熟解析器，并保存解析器版本、源码类型和 ECMAScript 版本。至少覆盖正则与除法、模板插值、Unicode 标识符、数字后的点、注释换行和未闭合字面量。测试应断言错误位置与分类，不只断言“抛错了”。
