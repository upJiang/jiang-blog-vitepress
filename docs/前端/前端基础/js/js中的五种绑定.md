## 五种绑定
方式:默认绑定、隐式绑定、显示绑定、new绑定、箭头函数绑定

优先级：显式绑定 > 隐式绑定 > 默认绑定     new绑定 > 隐式绑定 > 默认绑定

### 默认绑定
>当函数调用没有任何前缀的情况下，this在非严格模式下指向window，在严格模式下指向undefined，在严格模式下调用不在严格模式下的函数，并不影响this的返回
```
function fn1() {
    console.log(this); //window
};
function fn2() {
    "use strict";
    console.log(this); //undefined
};
var name = '听风是风';
function fn3() {
    console.log(this); //window
};
(function () {
    "use strict";
    fn3();
}());
```

### 隐式绑定
#### 1. 如果函数调用时，前面存在调用它的对象，那么this就会隐式绑定到这个对象上
```
function fn() {
    console.log(this.name);
};
let obj = {
    name: '听风是风',
    func: fn
};
obj.func() //听风是风
```
#### 2. 如果函数调用前存在多个对象，this指向距离调用自己最近的对象
```
function fn() {
    console.log(this.name);
};
let obj = {
    name: '行星飞行',
    func: fn,
};
let obj1 = {
    name: '听风是风',
    o: obj
};
obj1.o.func() //行星飞行
```
#### 隐式丢失
1. 作为参数传递以及变量赋值
```
var name = '行星飞行';
let obj = {
    name: '听风是风',
    fn: function () {
        console.log(this.name);
    }
};
function fn1(param) {
    param();
};
fn1(obj.fn);//行星飞行
例子中我们将 obj.fn 也就是一个函数传递进 fn1 中执行，这里只是单纯传递了一个函数而已，this并没有跟函数绑在一起，所以this丢失这里指向了window。
```
2. 变量赋值，其实本质上与传参相同
```
var name = '行星飞行';
let obj = {
    name: '听风是风',
    fn: function () {
        console.log(this.name);
    }
};
let fn1 = obj.fn;
fn1(); //行星飞行
```
3.隐式绑定丢失并不是都会指向全局对象
```
var name = '行星飞行';
let obj = {
    name: '听风是风',
    fn: function () {
        console.log(this.name);
    }
};
let obj1 = {
    name: '时间跳跃'
}
obj1.fn = obj.fn;
obj1.fn(); //时间跳跃
虽然丢失了 obj 的隐式绑定，但是在赋值的过程中，又建立了新的隐式绑定，这里this就指向了对象 obj1。
```

### 显示绑定
>通过call、apply以及bind方法改变this的行为
```
let obj1 = {
    name: '听风是风'
};
let obj2 = {
    name: '时间跳跃'
};
let obj3 = {
    name: 'echo'
}
var name = '行星飞行';

function fn() {
    console.log(this.name);
};
fn(); //行星飞行
fn.call(obj1); //听风是风
fn.apply(obj2); //时间跳跃
fn.bind(obj3)(); //echo ，因为bind非立即执行，详情参考笔记的this指向call，apply，bind
```
>注意，如果在使用call之类的方法改变this指向时，指向参数提供的是null或者undefined，那么 this 将指向全局对象。
```
let obj1 = {
    name: '听风是风'
};
let obj2 = {
    name: '时间跳跃'
};
var name = '行星飞行';
function fn() {
    console.log(this.name);
};
fn.call(undefined); //行星飞行
fn.apply(null); //行星飞行
fn.bind(undefined)(); //行星飞行
```
### new绑定
new执行了什么<br/>
(1) 创建一个新对象<br/>
(2) 将构造函数的作用域赋给新对象（因此 this 就指向了这个新对象） <br/>
(3) 执行构造函数中的代码（为这个新对象添加属性） <br/>
(4) 返回新对象<br/>
```
function Fn(){
    this.name = '听风是风';
};
let echo = new Fn(); //this将指向新对象echo上
echo.name//听风是风
```
### 箭头函数
准确来说，箭头函数中没有this，箭头函数的this指向取决于外层作用域中的this，外层作用域或函数的this指向谁，箭头函数中的this便指向谁。