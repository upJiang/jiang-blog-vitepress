---
title: "JavaScript 类型系统"
description: "掌握语言类型、转换、相等性和数值边界"
category: frontend
tags: ["JavaScript","Type"]
updated: 2026-08-04
order: 430
depth: reference
series: "重学前端"
---
# JavaScript 类型系统

## 类型

> 运行时类型是代码实际执行过程中我们用到的类型。所有的类型数据都会属于 7 个类型之一。从变量、参数、返回值到表达式中间结果，任何 JavaScript 代码运行过程中产生的数据，都具有运行时类型。

JavaScript 语言的每一个值都属于某一种数据类型。JavaScript 语言规定了 7 种语言类型。语言类型广泛用于变量、函数参数、表达式、函数返回值等场合。根据最新的语言标准，这 7 种语言类型是：

Undefined；Null；Boolean；String；Number；Symbol；Object。

### Undefined

类型表示未定义，它的类型只有一个值，就是 undefined。任何变量在赋值前是 Undefined 类型、值为 undefined，一般我们可以用全局变量 undefined（就是名为 undefined 的这个变量）来表达这个值，或者 void 运算来把任意一个表达式变成 undefined 值。

#### 为什么有的编程规范要求用 void 0 代替 undefined？

答：因为 JavaScript 的代码 undefined 是一个变量，而并非是一个关键字，这是 JavaScript 语言公认的设计失误之一，所以，我们为了避免无意中被篡改，我建议使用 void 0 来获取 undefined 值。

### Null

定义了但是为空，所以，在实际编程时，我们一般不会把变量赋值为 undefined，这样可以保证所有值为 undefined 的变量，都是从未赋值的自然状态。

Null 类型也只有一个值，就是 null，它的语义表示空值，与 undefined 不同，null 是 JavaScript 关键字，所以在任何代码中，你都可以放心用 null 关键字来获取 null 值。

### Boolean

有两个值， true 和 false，它用于表示逻辑意义上的真和假，同样有关键字 true 和 false 来表示两个值。

### String

用于表示文本数据

#### 字符串是否有最大长度？

答：String 有最大长度是 2^53 - 1，这在一般开发中都是够用的，因为 String 的意义并非“字符串”，而是字符串的 UTF16 编码，我们字符串的操作 charAt、charCodeAt、length 等方法针对的都是 UTF16 编码。所以，字符串的最大长度，实际上是受字符串的编码长度影响的。

### Number

表示我们通常意义上的“数字”。这个数字大致对应数学中的有理数

JavaScript 中的 Number 类型有 18437736874454810627(即 2^64-2^53+3) 个值。

JavaScript 中的 Number 类型基本符合 IEEE 754-2008 规定的双精度浮点数规则，但是 JavaScript 为了表达几个额外的语言场景（比如不让除以 0 出错，而引入了无穷大的概念），规定了几个例外情况：

#### NaN

用于引用特殊的非数字值，

**提示：**请使用 isNaN() 来判断一个值是否是数字。原因是 NaN 与所有值都不相等，包括它自己。可以把 Number 对象设置为该值，来指示其不是数字值。

占用了 9007199254740990，这原本是符合 IEEE 规则的数字；

```text
Number('asfadas') //NaN
isNaN('300') //false
isNaN('sdfa') //true
```

Infinity，无穷大；

-Infinity，负无穷大。

#### 为什么在 JavaScript 中，0.1+0.2 不能 =0.3？

答：浮点数运算的精度问题导致等式左右的结果并不是严格相等，而是相差了个微小的值。所以实际上，这里错误的不是结论，而是比较的方法，正确的比较方法是使用 JavaScript 提供的最小精度值

```text
console.log( Math.abs(0.1 + 0.2 - 0.3) <= Number.EPSILON); //true
```

### Symbol

Symbol 是 ES6 中引入的新类型，它是一切非字符串的对象 key 的集合，在 ES6 规范中，整个对象系统被用 Symbol 重塑。

创建：

```text
var mySymbol = Symbol("my symbol");
```

```text
//我们可以使用 Symbol.iterator 来自定义 for…of 在对象上的行为：
		var o = new Object

    o[Symbol.iterator] = function() {
        var v = 0
        return {
            next: function() {
                return { value: v++, done: v > 10 }
            }
        }
    };

    for(var v of o)
        console.log(v); // 0 1 2 3 ... 9
```

### Object

Object 是 JavaScript 中最复杂的类型，也是 JavaScript 的核心机制之一。Object 表示对象的意思，它是一切有形和无形物体的总称。

#### 为什么给对象添加的方法能用在基本类型上？

答：运算符提供了装箱操作，它会根据基础类型构造一个临时对象，使得我们能在基础类型上调用对应对象的方法。

## 类型转换



## 现代规范校订

规范内部术语用于解释语言行为，不等同于浏览器或引擎必须采用的具体数据结构。工程代码同时需要 TypeScript 静态约束和运行时输入校验。

## 规范要点与现代边界

规范中的语言类型、对象包装和类型转换需要与工程边界区分。输入来自 URL、表单或网络时，先做运行时校验，再把可信值交给 TypeScript。比较相等性时明确是否允许转换；处理金额、时间和用户可见数字时不要直接依赖二进制浮点。

把结论放回可复现条件：浏览器版本、文档模式、输入数据、网络和设备都会影响结果。遇到与旧教材不同的行为，先查现行规范和实现说明，再用最小样例验证；如果规范只定义可观察结果，就不要把某个引擎的内部结构写成跨浏览器保证。

## 运行验证

| 验证项 | 方法 | 通过条件 |
| --- | --- | --- |
| 语义 | 对照现行规范和 MDN 兼容性说明 | 结论有适用范围 |
| 行为 | 最小页面、Node 脚本或 DevTools 复现 | 结果与预期一致 |
| 工程 | 运行类型检查、测试和性能采样 | 没有新增回归 |

```text
现象 -> 假设 -> 最小复现 -> 观测证据 -> 修复 -> 回归测试
```

## 参考资料

- https://tc39.es/ecma262/
- https://developer.mozilla.org/en-US/docs/Web/JavaScript
