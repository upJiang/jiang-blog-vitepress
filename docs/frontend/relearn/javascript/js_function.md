---
title: "JavaScript 函数"
description: "比较普通函数、箭头函数、生成器和异步函数"
category: frontend
tags: ["JavaScript","Function"]
updated: 2026-08-04
order: 460
depth: reference
series: "重学前端"
---
# JavaScript 函数

## 函数家族

#### 普通函数：用 function 关键字定义的函数。

```text
function foo(){
    // code
}
```

#### 箭头函数：用 => 运算符定义的函数。

```text
const foo = () => {
    // code
}
```

#### 方法：在 class 中定义的函数。

```text
class C {
    foo(){
        //code
    }
}
```

#### 类：用 class 定义的类，实际上也是函数。

```text
class Foo {
    constructor(){
        //code
    }
}
```

#### 异步函数：普通函数、箭头函数和生成器函数加上 async 关键字。

```text
async function foo(){
    // code
}
const foo = async () => {
    // code
}
async function foo*(){
    // code
}
```

## this 关键字的行为

this 是执行上下文中很重要的一个组成部分。同一个函数调用方式不同，得到的 this 值也不同

```text
function showThis(){
    console.log(this);
}

var o = {
    showThis: showThis
}

showThis(); // global
o.showThis(); // o
```

**调用函数时使用的引用，决定了函数执行时刻的 this 值。**

## 剪头函数中的 this

```text
const showThis = () => {
    console.log(this);
}

var o = {
    showThis: showThis
}

showThis(); // global
o.showThis(); // global
```

## class 中的 this

```text
class C {
    showThis() {
        console.log(this);
    }
}
var o = new C();
var showThis = o.showThis;

showThis(); // undefined
o.showThis(); // o

等同于严格模式下：
"use strict"
function showThis(){
    console.log(this);
}

var o = {
    showThis: showThis
}

showThis(); // undefined
o.showThis(); // o
```

#### 为什么输出 undefined？

答：因为 class 设计成了默认按 strict 模式执行，this 严格按照调用时传入的值，可能为 null 或者 undefined。

JavaScript 用一个栈来管理执行上下文，这个栈中的每一项又包含一个链表。如下图所示：

 当函数调用时，会入栈一个新的执行上下文，函数调用结束时，执行上下文被出栈

而 this 则是一个更为复杂的机制，JavaScript 标准定义了 [[thisMode]] 私有属性。

[[thisMode]] 私有属性有三个取值。

- lexical：表示从上下文中找 this，这对应了箭头函数。

- global：表示当 this 为 undefined 时，取全局对象，对应了普通函数。

- strict：当严格模式时使用，this 严格按照调用时传入的值，可能为 null 或者 undefined。

函数创建新的执行上下文中的词法环境记录时，会根据[[thisMode]]来标记新纪录的[[ThisBindingStatus]]私有属性。

代码执行遇到 this 时，会逐层检查当前词法环境记录中的[[ThisBindingStatus]]，当找到有 this 的环境记录时获取 this 的值。

这样的规则的实际效果是，嵌套的箭头函数中的代码都指向外层 this，例如：

```text
var o = {}
o.foo = function foo(){
    console.log(this);
    return () => {
        console.log(this);
        return () => console.log(this);
    }
}

o.foo()()(); // o, o, o
```

这个例子中，我们定义了三层嵌套的函数，最外层为普通函数，两层都是箭头函数。这里调用三个函数，获得的 this 值是一致的，都是对象 o。

## 操作 this 的内置函数

Function.prototype.call 和 Function.prototype.apply <br/> 可以指定函数调用时传入的 this 值，示例如下：

```text
//这里 call 和 apply 作用是一样的，只是传参方式有区别。会立即执行
function foo(a, b, c){
    console.log(this); //如果传进来的this是null或者undefined，那么将会输出global
    console.log(a, b, c);
}
foo.call({}, 1, 2, 3);
foo.apply({}, [1, 2, 3]);

//bind
function foo(a, b, c){
    console.log(this);
    console.log(a, b, c);
}
foo.bind({}, 1, 2, 3)();
```

### 相似之处

1、都是用来改变函数的 this 对象的指向的。<br/> 2、第一个参数都是 this 要指向的对象。<br/> 3、都可以利用后续参数传参。

### 区别

1.call、apply 与 bind 都用于改变 this 绑定，但 call、apply 在改变 this 指向的同时还会执行函数，而 bind 在改变 this 后是返回一个全新的 boundFcuntion 绑定函数，这也是为什么上方例子中 bind 后还加了一对括号 ()的原因。

2.bind 属于硬绑定，返回的 boundFunction 的 this 指向无法再次通过 bind、apply 或 call 修改；call 与 apply 的绑定只适用当前调用，调用完就没了，下次要用还得再次绑。

3.call 与 apply 功能完全相同，唯一不同的是 call 方法传递函数调用形参是以散列形式，而 apply 方法的形参是一个数组。在传参的情况下，call 的性能要高于 apply，因为 apply 在执行时还要多一步解析数组。

wx.say.bind(this) 不能立即执行，无效，必须 wx.say.bind(this)("aaa"),参数置后<br/> wx.say.call(this,"aaa","bbb") 立即执行<br/> wx.say.apply(this,["aaa","bbb"]) 立即执行,参数为数组

## 手写 call,apply,bind

```text
Function.prototype.myCall =
    function (ctx) {
    ctx = ctx || window;
    ctx.fn = this;
    let args = Array.from(arguments).slice(1);
    let res = ctx.fn(...args);
    delete ctx.fn;
    return res;
};
Function.prototype.myApply = function (ctx) {
    ctx = ctx || window;
    ctx.fn = this;
    let args = Array.from(arguments[1]);
    let res = ctx.fn(...args);
    delete ctx.fn;
    return res;
};
Function.prototype.myBind = function (ctx) {
    let args = Array.from(arguments).slice(1);
    let that = this;
    return function (...oargs)
        {
            return that.apply(ctx, [...args, ...oargs]);
        };
 };
```

## 现代规范校订

规范内部术语用于解释语言行为，不等同于浏览器或引擎必须采用的具体数据结构。工程代码同时需要 TypeScript 静态约束和运行时输入校验。

## 规范要点与现代边界

函数的 this、参数、返回值和副作用应通过调用方式与类型签名表达。箭头函数没有自己的 this，生成器提供可暂停迭代，异步函数把异常放进 Promise。封装函数时区分同步抛错、异步拒绝、取消和超时，避免调用者只能捕获一类失败。

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
