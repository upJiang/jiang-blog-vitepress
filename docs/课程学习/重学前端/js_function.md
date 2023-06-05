## 函数家族
#### 普通函数：用 function 关键字定义的函数。
```
function foo(){
    // code
}
```
#### 箭头函数：用 => 运算符定义的函数。
```
const foo = () => {
    // code
}
```
#### 方法：在 class 中定义的函数。
```
class C {
    foo(){
        //code
    }
}
```
#### 类：用 class 定义的类，实际上也是函数。
```
class Foo {
    constructor(){
        //code
    }
}
```
#### 异步函数：普通函数、箭头函数和生成器函数加上 async 关键字。
```
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
```
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

## 剪头函数中的this
```
const showThis = () => {
    console.log(this);
}

var o = {
    showThis: showThis
}

showThis(); // global
o.showThis(); // global
```
## class中的this
```
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
#### 为什么输出undefined？
答：因为 class 设计成了默认按 strict 模式执行，this 严格按照调用时传入的值，可能为 null 或者 undefined。

JavaScript 用一个栈来管理执行上下文，这个栈中的每一项又包含一个链表。如下图所示：

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cbf75c95a4cb4dfa85e589c5f1a12381~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cbf75c95a4cb4dfa85e589c5f1a12381~tplv-k3u1fbpfcp-watermark.image?)</a>
当函数调用时，会入栈一个新的执行上下文，函数调用结束时，执行上下文被出栈

而 this 则是一个更为复杂的机制，JavaScript 标准定义了 [[thisMode]] 私有属性。

[[thisMode]] 私有属性有三个取值。
* lexical：表示从上下文中找 this，这对应了箭头函数。
* global：表示当 this 为 undefined 时，取全局对象，对应了普通函数。
* strict：当严格模式时使用，this 严格按照调用时传入的值，可能为 null 或者 undefined。

函数创建新的执行上下文中的词法环境记录时，会根据[[thisMode]]来标记新纪录的[[ThisBindingStatus]]私有属性。

代码执行遇到 this 时，会逐层检查当前词法环境记录中的[[ThisBindingStatus]]，当找到有 this 的环境记录时获取 this 的值。

这样的规则的实际效果是，嵌套的箭头函数中的代码都指向外层 this，例如：
```
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
Function.prototype.call 和 Function.prototype.apply <br/>
可以指定函数调用时传入的 this 值，示例如下：
```
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
1、都是用来改变函数的this对象的指向的。<br/>
2、第一个参数都是this要指向的对象。<br/>
3、都可以利用后续参数传参。

### 区别
1.call、apply与bind都用于改变this绑定，但call、apply在改变this指向的同时还会执行函数，而bind在改变this后是返回一个全新的boundFcuntion绑定函数，这也是为什么上方例子中bind后还加了一对括号 ()的原因。

2.bind属于硬绑定，返回的 boundFunction 的 this 指向无法再次通过bind、apply或 call 修改；call与apply的绑定只适用当前调用，调用完就没了，下次要用还得再次绑。

3.call与apply功能完全相同，唯一不同的是call方法传递函数调用形参是以散列形式，而apply方法的形参是一个数组。在传参的情况下，call的性能要高于apply，因为apply在执行时还要多一步解析数组。

wx.say.bind(this)   不能立即执行，无效，必须wx.say.bind(this)("aaa"),参数置后<br/>
wx.say.call(this,"aaa","bbb")   立即执行<br/>
wx.say.apply(this,["aaa","bbb"])   立即执行,参数为数组

## 手写call,apply,bind
```
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