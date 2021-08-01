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

## 改变this指向
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