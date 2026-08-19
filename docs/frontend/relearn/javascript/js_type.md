---
title: "JavaScript 类型系统"
description: "掌握语言类型、转换、相等性和数值边界"
category: frontend
tags: ["JavaScript","Type"]
updated: 2026-08-05
order: 430
depth: reference
series: "重学前端"
---
# JavaScript 类型系统

JavaScript 的值分成八种语言类型：Undefined、Null、Boolean、String、Symbol、Number、BigInt 和 Object。变量本身没有固定运行时类型，当前保存的值有类型。`typeof` 只是一个运算符，它返回的字符串不能完整代表这八类。

## 原始值与对象的身份不同

前七种是原始值。原始值不可变，相同内容按各自规则比较。Object 通过身份区分，两个字段完全相同的对象仍是不同值。

```js
console.log('a' === 'a')
console.log({ value: 1 } === { value: 1 })
```

第一行是 `true`，第二行是 `false`。数组、函数、日期、Map 和正则都属于 Object，只是拥有不同内部槽与内部方法。

## Undefined 与 Null 表达不同状态

`undefined` 常出现在绑定尚未赋值、属性不存在或函数没有显式返回值的场景。`null` 是开发者可以明确写入的空对象意图。两者在严格相等中不同，宽松相等会把它们视为相等。

```js
console.log(undefined === null)
console.log(undefined == null)
```

API 设计应明确缺失字段、空值和未计算结果的区别。只依赖宽松相等，会把两个业务状态合并。

## Number 使用 IEEE 754 双精度表示

Number 同时表示整数、分数、无穷和 NaN。安全整数范围有限，超过范围后相邻数学整数可能映射到同一个 Number。

```js
console.log(Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2)
console.log(Object.is(NaN, NaN))
console.log(Object.is(0, -0))
```

`===` 认为 `NaN` 与自身不相等，并把 `0` 与 `-0` 视为相等。`Object.is` 在这两个边界上给出不同结果。金额、计数和标识符是否允许浮点误差，要在数据合同中决定，不能靠显示时四舍五入补救。

## BigInt 处理任意精度整数

BigInt 用 `n` 后缀或构造函数创建，适合超出安全整数范围的整数计算。它不能与 Number 直接进行算术运算，也不能表示小数。

```js
const total = 9_007_199_254_740_993n
console.log(total + 1n)
```

JSON 默认不能序列化 BigInt。跨 API 传输时应使用明确字符串格式或协议支持的整数类型，并在接收端校验范围。

## String 按 UTF-16 码元提供多数索引操作

`length`、下标和 `charCodeAt` 主要按 UTF-16 码元工作。一个 Unicode 码点可能由两个码元组成，用户看到的一个字形还可能由多个码点组合。

```js
const symbol = '😀'
console.log(symbol.length)
console.log([...symbol].length)
```

第一行输出 `2`，扩展运算符按字符串迭代器读取码点，因此第二行输出 `1`。光标移动、截断和字数限制若面向用户字形，还需要分词器或 `Intl.Segmenter`，不能只切 `length`。

## Symbol 提供不会意外碰撞的属性键

每次 `Symbol()` 都创建唯一值，常用于协议钩子和内部属性键。`Symbol.for` 通过全局注册表按字符串复用 Symbol，两者身份规则不同。

```js
const key = Symbol('state')
const item = { [key]: 'ready' }

console.log(item[key])
```

Symbol 属性不会出现在普通 `Object.keys` 结果中，但可以通过反射 API 读取。它不是安全边界，拿到对象的代码仍可枚举 Symbol 键。

## 隐式转换沿固定抽象操作执行

对象参与字符串或数字运算时，规范会执行 ToPrimitive，再根据运算符走 ToString、ToNumber 或其他转换。`valueOf`、`toString` 和 `Symbol.toPrimitive` 可能参与过程。

```js
const size = {
  [Symbol.toPrimitive](hint) {
    return hint === 'number' ? 8 : '8px'
  },
}

console.log(Number(size))
console.log(String(size))
```

隐式转换可以简化少量表达式，也会让错误藏在运算符里。边界数据进入系统时先显式解析和校验，比在业务计算中依赖宽松相等稳定。

## `typeof` 与跨 Realm 边界

`typeof null` 历史上返回 `"object"`，函数通常返回 `"function"`，其他对象返回 `"object"`。判断数组使用 `Array.isArray`。来自 iframe 等其他 Realm 的对象拥有另一套构造器和原型，`instanceof` 可能失败。

类型测试应覆盖 NaN、负零、安全整数边界、BigInt、Unicode、Symbol、代理对象和跨 Realm 值。记录运行时版本，并把语言类型判断与 TypeScript 静态类型分开，后者在编译后不会自动校验外部数据。
