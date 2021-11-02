## 闭包
>一个绑定了执行环境的函数

在JS中，函数其实就是闭包，不管该函数内部是否使用外部变量，它都是一个闭包。如闭包定义的那样，由环境和表达式组成，作为js函数，环境为词法环境，而表达式就是函数本身。而词法环境是执行上下文的一部分，执行上下文包括 this 绑定, 词法环境和变量环境。词法环境是随着执行上下文一起创建的，在函数/脚本/eval执行时创建。

理解闭包，首先需要理解闭包是什么类型的东西，闭包实际上指的是函数，搞清楚问题的对象究竟是谁，而很多人会把环境/作用域等其他的东西当做闭包，是对闭包的概念类型的错误理解。那么知道了闭包是函数，那么闭包应该是什么样的函数呢？也就是含有环境的函数，很明显，在js中，任何一个函数都有着自己的环境，这个环境让我们可以去找到定义的变量内部的this、外部作用域。

很多人认为，要让一个函数能去访问某个应该被回收的内存空间，但由于函数存在对该内存空间的变量的引用而不可回收，这样才形成了闭包。那么试问一下，这里你到底是把这个内存空间当做闭包呢？还是引用这块内存空间的函数当闭包呢？假如是前者，则和把环境当闭包的人犯了同样的错误，假如是后者，现在的这个函数实际上和你定义的普通函数本质上没有区别，都含有自己的环境，只不过这个函数的环境多了一些，但本质没有区别。理解了这点，你才能从上面的错误理解中解脱出来。

总结:我们之前以为闭包就是函数中return了一个函数，那么闭包是这个函数，还是函数中return的函数，其实函数就是闭包！！！

#### 那么为何总有人说要嵌套函数呢？
是因为需要局部变量，闭包的目的就是 --- 隐藏变量
```
function foo(){
  var local = 1
  function bar(){
    local++
    return local
  }
  return bar
}

var func = foo()
func()
```
local变量就是局部变量，我们无法在外面访问，只能在foo中获取，这样就做到了隐藏变量。return bar是为了能够在外面去使用到这个闭包，仅此而已

#### 闭包会造成内存泄露？
答案：不会

说这话的人根本不知道什么是内存泄露。内存泄露是指你用不到（访问不到）的变量，依然占居着内存空间，不能被再次利用起来。

闭包里面的变量明明就是我们需要的变量（lives），凭什么说是内存泄露？

这个谣言是如何来的？

因为 IE。IE 有 bug，IE 在我们使用完闭包之后，依然回收不了闭包里面引用的变量。 这是 IE 的问题，不是闭包的问题。参见司徒正美的[这篇文章](https://www.cnblogs.com/rubylouvre/p/3345294.html)。

[可以查看这篇文章的解释](https://zhuanlan.zhihu.com/p/22486908)

## var
```
var b = 1
```
声明了 b，并且为它赋值为 1

var 声明作用域函数执行的作用域。也就是说，var 会穿透 for 、if 等语句。也就是变量提升，可以重复定义

#### 控制var的范围
使用立即执行函数
>但是，括号有个缺点，那就是如果上一行代码不写分号，括号会被解释为上一行代码最末的函数调用，产生完全不符合预期，并且难以调试的行为，加号等运算符也有类似的问题。所以一些推荐不加分号的代码风格规范，会要求在括号前面加上分号。
```
(function(){
    var a;
    //code
}());

(function(){
    var a;
    //code
})();

;(function(){
    var a;
    //code
}())

;(function(){
    var a;
    //code
})()
```
规避括号的问题，使用void的写法
```
void function(){
    var a;
    //code
}();
```
这有效避免了语法问题，同时，语义上 void 运算表示忽略后面表达式的值，变成 undefined，我们确实不关心 IIFE 的返回值，所以语义也更为合理。

值得特别注意的是，有时候 var 的特性会导致声明的变量和被赋值的变量是两个 b，JavaScript 中有特例，那就是使用 with 的时候：
```
var b;
void function(){
    var env = {b:1};
    b = 2;  
    console.log("In function b:", b); //2
    with(env) {
        var b = 3;
        console.log("In with b:", b); //3，var影响了with中b的值
    }
}();
console.log("Global b:", b);  //2
```
在这个例子中，我们利用立即执行的函数表达式（IIFE）构造了一个函数的执行环境，并且在里面使用了我们一开头的代码。

可以看到，在 Global function with 三个环境中，b 的值都不一样，而在 function 环境中，并没有出现 var b，这说明 with 内的 var b 作用到了 function 这个环境当中。

var b = {} 这样一句对两个域产生了作用，从语言的角度是个非常糟糕的设计，这也是一些人坚定地反对在任何场景下使用 with 的原因之一。

## let
>为了实现 let，JavaScript 在运行时引入了块级作用域。也就是说，在 let 出现之前，JavaScript 的 if for 等语句皆不产生作用域。不会变量提升

以下语句会产生 let 使用的作用域：
* for；i
* f；
* switch；
* try/catch/finally。
意思就是在这些语句中，let的声明只在这里面的作用域中有效，并不会变量提升影响到别的地方

## Realm
>在最新的标准（9.0）中，JavaScript 引入了一个新概念 Realm，它的中文意思是“国度”“领域”“范围”。
```
var b = {}
```
在 ES2016 之前的版本中，标准中甚少提及{}的原型问题。但在实际的前端开发中，通过 iframe 等方式创建多 window 环境并非罕见的操作，所以，这才促成了新概念 Realm 的引入。

Realm 中包含一组完整的内置对象，而且是复制关系。

对不同 Realm 中的对象操作，会有一些需要格外注意的问题，比如 instanceOf 几乎是失效的。

以下代码展示了在浏览器环境中获取来自两个 Realm 的对象，它们跟本土的 Object 做 instanceOf 时会产生差异：
```
var iframe = document.createElement('iframe')
document.documentElement.appendChild(iframe)
iframe.src="javascript:var b = {};"

var b1 = iframe.contentWindow.b;
var b2 = {};

console.log(typeof b1, typeof b2); //object object

console.log(b1 instanceof Object, b2 instanceof Object); //false true
```
可以看到，由于 b1、 b2 由同样的代码“ {} ”在不同的 Realm 中执行，所以表现出了不同的行为。