#### 老师你好！我语义化标签用得很少，多数用到的是 header、footer、 nav 等语义化标签，想问老师 section 和 div 混合使用，会不会效果不好呢？
答：不会效果不好的，因为本来就是这么用的。遇到不确定的情况，请千万不要乱用标签，用 div 和 span 就好。

#### 我一直看见闭包这个词，但是一直也没有弄清楚它是什么东西，老师可以简单概括一下什么是闭包吗？
答：你可以这样理解，闭包其实就是函数，还是能访问外面变量的函数。

#### “事实上，JavaScript 中的“类”仅仅是运行时对象的一个私有属性，而 JavaScript 中是无法自定义类型的。”
- 文中说“类”是私有属性，可以具体表现是什么，不是很能理解具体含义？

答：私有属性当然是你无法访问的属性了，但是具体表现的话，还是有的，那就是 Object.prorotype.toString.call(x) 的行为。

- 无法自定义类型？请问如下编码是属于什么操作，应该怎么理解这个“类”？
```
function Person（）｛｝
var person = new Person（）；
```
答：这个代码是定义类的操作，这里注意一下，你千万不要把类和类型的概念混淆。

#### 请教老师在对象中name(){} 等同于name: function() {} ，这两个写法有什么区别呢？
答：这两个写法在使用上基本没什么区别。只有一点区别，就是函数的 name 属性不一样。可以看下这段代码：
```
var o = {
   myfunc(){}
}
console.log(o.myfunc.name)
```
我们这里按照你的第一种方法定义了方法，然后输出它的 name 属性，我们看到 name 属性是"myfunc"。

值得一提的是，如果我们给你的第二种方法添加了名字，行为还是不一样，区别在于能否在函数内用名字递归，我们看看代码：
```
var o2 = {
    myfunc(){
        consoe.log(myfunc); //error
    }
}
var o1 = {
    myfunc: function myfunc(){
        consoe.log(myfunc); //function myfunc
    }
}
o1.myfunc();
o2.myfunc();
```
这段代码中，我们试着在用两种方式定义的方法中输出函数自身的名字变量，结果是不一样的。

不过现实中，我们几乎不会关心函数的 name 属性，所以不用太在意两种定义方式的区别。

#### 我对于 JavaScript 中 Number 安全整数有个疑问。
MDN 中是（-(2^53-1)~(2^53-1)）, 犀牛书中是（-2^53~2^53）感觉都有道理。

JavaScript 中采用 IEEE754 浮点数标准进行存储， 1 个符号位，11 位指数位， 52 位尾数位。

按照分析，不考虑符号位，尾数位取值 52 个 1 就是表示的最大值了，不会有精度损失，此时指数位代表数值是 52+1023=1075，此时即为 (-(2^53-1)~(2^53-1))。

但是 2^53 这个值，存储的时候尾数是 52 个 0， 指数位为 53+1023=1076，这个值也是刚好没有精度损失的，这时表示的就是（-2^53~2^53）。

用 Math.isSafeInteger() 判断安全数范围和 MDN 中描述一样。所以被问到这个的时候， 感觉两个都是有道理的吧！老师你说对吗？

答：你分析得非常好，我觉得我都没啥可补充的了。这个地方 JavaScript 标准写得也非常模糊，我简单瞄了一下，似乎是用实验的方式来给出的安全数范围。考虑到犀牛书的时效性肯定不如 MDN，应该是参考了某一版本旧引擎给出来的数据。所以，这类行为我们还是以实测为准吧，我们不必纠结。

#### 老师您好，下面这个自己练习的例子希望您能帮解答：
```
console.log('sync1');

setTimeout(function () {
    console.log('setTimeout1')
}, 0);

var promise = new Promise(function (resolve, reject) {
    setTimeout(function () {
        console.log('setTimeoutPromise')
    }, 0);
    console.log('promise');
    resolve();
});


promise.then(() => {
    console.log('pro_then');
    setTimeout(() => {
        console.log('pro_timeout');
    }, 0)
})

setTimeout(function () {
    console.log('last_setTimeout')
}, 0);
console.log('sync2');
```
答：这个例子挺经典的，虽然我觉得这样设计面试题非常不合适，但是我们可以以它为例，学习一下分析异步的方法。

首先我们看第一遍同步执行，这是第一个宏任务。

第一个宏任务中，调用了三次 setTimeout（Promise 中的代码也是同步执行的），调用了一次 resolve，打印了三次。

所以它产生了三个宏任务，一个微任务，两次打印。

那么，首先显示的就是 sync1、promise 和 sync2。这时，setTimeout1，setTimeoutPromise，last_setTimeout 在宏任务队列中，pro_then 在微任务队列中。

接下来，因为微任务队列没空，第一个宏任务没有结束，继续执行微任务队列，所以 pro_then，被显示出来，然后又调用了一次 setTimeout，所以 pro_timeout 进入宏任务队列，成为第 5 个宏任务。

然后，没有微任务了，执行第二个宏任务，所以接下来顺次执行宏任务，显示 setTimeout1，setTimeoutPromise，last_setTimeout，pro_timeout。

最终显示顺序是这样的。

- 宏任务 1
    - 微任务 1
        - sync 1
        - promise
        - sync 2
    - 微任务 2
        - pro_then
- 宏任务 2
    - setTimeout1
- 宏任务 3
    - setTimeoutPromise
- 宏任务 4
    - last_setTimeout
- 宏任务 5
    - pro_timeout

#### 什么 promise.then 中的 settimeout 是最后打印的？不用管是宏任务依次执行吗？
答：因为 then 是第一个宏任务中最后执行的微任务，所以它发起的宏任务是最后入队的，依次执行就是最后。

#### 怎么确定这个微任务属于一个宏任务呢，JavaScript 主线程跑下来，遇到 setTImeout 会放到异步队列宏任务中，那下面的遇到的 promise 怎么判断出它是属于这个宏任务呢？
resolve 在哪个宏任务中调用，对应的 then 里的微任务就属于哪个宏任务。宏任务没有从异步队列中取出，中间所碰到的所有微任务都属于这个宏任务。

#### 为什么要设计微任务（micro task），我知道这样 JavaScript 引擎可以自主地执行任务，但这样的好处是什么？提高性能吗？
不是，微任务是 JavaScript 引擎内部的一种机制，如果不设计微任务，那么 JavaScript 引擎中就完全没有异步了呀，所以必须要设计微任务。

#### 
