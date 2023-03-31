## this指向的方式
```
① 在普通函数中，this指向window
② 在构造函数中，this指向创建的对象
③ 在方法声明中，this指向调用者
④ 在定时器中， this指向window
⑤ 在事件中，this 指向事件源

//this指向window
function foo() {
console.log(this.a)
}
var a = 1foo()   

//this指向obj，调用foo的对象上
const obj = {
a: 2,
foo: foo
}
obj.foo()

//this指向new这个函数上，即c
const c = new foo()

//箭头函数的this指向定义这个函数的位置，bind，apply无效，此时this指向window
function a() {
    return () => {
        return () => {
            console.log(this)
        }
    }}
}
```

#### 如果要判断一个运行中函数的 this 绑定， 就需要找到这个函数的直接调用位置。 找到之后 就可以顺序应用下面这四条规则来判断 this 的绑定对象。
- `new` 调用：绑定到新创建的对象，注意：显示 `return` 函数或对象，返回值不是新创建的对象，而是显式返回的函数或对象。
- `call` 或者 `apply`（ 或者 `bind`） 调用：严格模式下，**绑定到指定的第一个参数**。非严格模式下，`null` 和 `undefined`，指向全局对象（浏览器中是window），其余值指向被 `new Object()` 包装的对象。
- 对象上的函数调用：绑定到那个对象。
- 普通函数调用： 在严格模式下绑定到 undefined，否则绑定到全局对象。
- `ES6` 中的箭头函数：不会使用上文的四条标准的绑定规则， 而是根据当前的词法作用域来决定 `this`， 具体来说， 箭头函数会继承外层函数，调用的 `this` 绑定（ 无论 this 绑定到什么），没有外层函数，则是绑定到全局对象（浏览器中是 `window`）。 这其实和 `ES6` 之前代码中的 `self = this` 机制一样。
- `DOM` 事件函数：一般指向绑定事件的 `DOM` 元素，但有些情况绑定到全局对象（比如IE6~IE8的attachEvent）。

## 改变 this 指向
1.使用bind
```
var foo = {
x: 3
}
var bar = function(){
console.log(this.x);
}
bar(); // undefined

var boundFunc = bar.bind(foo); //使用bind将this绑定到window上，可以访问到foo
boundFunc(); // 3
```
2.let self = this<br/>
3.立即执行函数(function(j) {})(i) 

## bind、apply、call

在说区别之前还是先总结一下三者的相似之处：<br/>
### 相似之处
1、都是用来改变函数的 this 对象的指向的。<br/>
2、第一个参数都是 this 要指向的对象。<br/>
3、都可以利用后续参数传参。

### 区别
1.call、apply 与 bind 都用于改变 this 绑定，但 call、apply 在改变 this 指向的同时还会执行函数，而bind在改变this后是返回一个全新的boundFcuntion绑定函数，这也是为什么上方例子中bind后还加了一对括号 ()的原因。

2.bind属于硬绑定，返回的 boundFunction 的 this 指向无法再次通过bind、apply或 call 修改；call与apply的绑定只适用当前调用，调用完就没了，下次要用还得再次绑。

3.call 与 apply 功能完全相同，唯一不同的是 call 方法传递函数调用形参是以散列形式，而 apply 方法的形参是一个数组。在传参的情况下，call 的性能要高于 apply，因为 apply 在执行时还要多一步解析数组。

wx.say.bind(this)   不能立即执行，无效，必须wx.say.bind(this)("aaa"),参数置后<br/>
wx.say.call(this,"aaa","bbb")   立即执行,参数散列<br/>
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