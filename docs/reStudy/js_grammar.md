## 脚本和模块
<a data-fancybox title="img" href="https://static001.geekbang.org/resource/image/43/44/43fdb35c0300e73bb19c143431f50a44.jpg">![img](https://static001.geekbang.org/resource/image/43/44/43fdb35c0300e73bb19c143431f50a44.jpg)</a>
### 区别
- 脚本是可以由浏览器或者 node 环境引入执行的，模块只能由 JavaScript 代码用 import 引入执行。
- 从概念上，我们可以认为脚本具有主动性的 JavaScript 代码段，是控制宿主完成一定任务的代码；而模块是被动性的 JavaScript 代码段，是等待被调用的库。
- 我们对标准中的语法产生式做一些对比，不难发现，实际上模块和脚本之间的区别仅仅在于是否包含 import 和 export，模块有，脚本没有。

在 script 标签的引入方式中，默认加载的文件是脚本，如果要引入模块，必须给 script 标签添加 type=“module”。如果引入脚本，则不需要 type。
```
//加载的是模块
<script type="module" src="xxxxx.js"></script>
```
**在script标签写export为什么会报错？**
答案：script 标签如果不加type=“module”，默认认为我们加载的文件是脚本而非模块，如果我们在脚本中写了 export，当然会抛错。

## 模块中的import和export
### export
两种声明方式：
**独立使用 export 声明**:就是一个 export 关键字加上变量名列表
```
export {a, b, c};
```
**声明型语句前添加 export 关键字**:这里的 export 可以加在任何声明性质的语句之前，整理如下：
- var 
- function (含 async 和 generator) 
- class 
- let 
- const

export 还有一种特殊的用法，就是跟 default 联合使用。export default 表示导出一个默认变量值，它可以用于 function 和 class。这里导出的变量是没有名称的，可以使用import x from "./a.js"这样的语法，在模块中引入。

export default 还支持一种语法，后面跟一个表达式，例如：
```
var a = {};
export default a;
```
但是，这里的行为跟导出变量是不一致的，这里导出的是值，导出的就是普通变量 a 的值，以后 a 的变化与导出的值就无关了，修改变量 a，不会使得其他模块中引入的 default 值发生改变。

在 import 语句前无法加入 export，但是我们可以直接使用 export from 语法。
```
export a from "a.js"
```
### import
两种声明方式：
```
import "mod"; //引入一个模块
import v from "mod";  //把模块默认的导出值放入变量v
```
**直接声明**,直接 import 一个模块，只是保证了这个模块代码被执行，引用它的模块是无法获得它的任何信息的。

**带from的import**，它能引入模块的一些信息，引入模块中的一部分信息，可以把它们变成本地的变量。

带 from 的 import 细分又有三种用法：
- import x from "./a.js" 引入模块中导出的默认值。
- import {a as x, modify} from "./a.js"; 引入模块中的变量。
- import * as x from "./a.js" 把模块中所有的变量以类似对象属性的方式引入。

第一种方式还可以跟后两种组合使用。记忆方式就是只有默认的引入能够跟其它的组合
- import d, {a as x, modify} from "./a.js"
- import d, * as x from "./a.js"

语法要求不带 as 的默认值永远在最前。注意，这里的变量实际上仍然可以受到原来模块的控制。

```
export var a = 1; //导出的是变量a
export function modify(){
    a = 2;
}


import {a, modify} from "./a.js";
console.log(a); //1
modify();
console.log(a); //2
```
当我们调用修改变量的函数后，b 模块变量也跟着发生了改变。这说明导入与一般的赋值不同，导入后的变量只是改变了名字，它仍然与原来的变量是同一个。

export var a = 1 导出的是变量a，当a在别的模块被改变了，那么之后在其它模块去使用它也会是改变后的值，也就是共用变量了<br>
如果不想要共用变量，可以只导出值，export支持这样的写法
```
var a = {};
export default a;  //导出的是变量a的值，之后a变化，其它模块再使用a不受影响
```
注意：import进来的变量不能直接赋值，它相当于私有变量，必须深拷贝出来后再进行赋值


## 函数体
>执行函数的行为通常是在 JavaScript 代码执行时，注册宿主环境的某些事件触发的，而执行的过程，就是执行函数体（函数的花括号中间的部分）。

函数体实际上有四种
- 普通函数体
```
function foo(){
    //Function body
}
```
- 异步函数体
```
async function foo(){
    //Function body
}
```
- 生成器函数体
```
function *foo(){
    //Function body
}
```
- 异步生成器函数体
```
async function *foo(){
    //Function body
}
```
上面四种函数体的区别在于：能否使用 await 或者 yield 语句。

关于函数体、模块和脚本能使用的语句
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/275821220335441d90fadce54c2700b5~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/275821220335441d90fadce54c2700b5~tplv-k3u1fbpfcp-watermark.image?)</a>

## 预处理
>JavaScript 执行前，会对脚本、模块和函数体中的语句进行预处理。预处理过程将会提前处理 var、函数声明、class、const 和 let 这些语句，以确定其中变量的意义。

### var 声明
>var 声明永远作用于脚本、模块和函数体这个级别，在预处理阶段，不关心赋值的部分，只管在当前作用域声明这个变量（var的变量提升是只声明但不赋值）

**var 的作用除了脚本跟函数体，能够穿透一切语句结构，它只认脚本、模块和函数体三种语法结构，在预处理过程中，如果遇到函数体级别的声明，就不会去访问外层作用域中的声明**所以下面三种代码的a变量都输出为undefined
```
var a = 1;

function foo() {
    console.log(a);  //undefined
    var a = 2;
}

foo();
```
```
var a = 1;

function foo() {
    console.log(a); //undefined
    if(false) {
        var a = 2;  //if被穿透，不认这个if条件，所以跟上面其实是一致的
    }
}

foo();
```
```
var a = 1;

function foo() {
    var o= {a:3}
    with(o) {
        var a = 2;
    }
    console.log(o.a); //2，当执行到var a = 2时，作用域变成了 with 语句内，这时候的 a 被认为访问到了对象 o 的属性 a
    console.log(a); //undefined，with也被穿透，所以仍然是undefined
}

foo();
```
在执行阶段，当执行到var a = 2时，作用域变成了 with 语句内，这时候的 a 被认为访问到了对象 o 的属性 a，所以最终执行的结果，我们得到了 2 和 undefined。<br>
这个行为是 JavaScript 公认的设计失误之一，一个语句中的 a 在预处理阶段和执行阶段被当做两个不同的变量，严重违背了直觉，但是今天，在 JavaScript 设计原则“don’t break the web”之下，已经无法修正了，所以你需要特别注意。

因为早年 JavaScript 没有 let 和 const，只能用 var，又因为 var 除了脚本和函数体都会穿透，人民群众发明了“立即执行的函数表达式（IIFE）”这一用法，用来产生作用域，例如：
```
for(var i = 0; i < 20; i ++) {
    void function(i){
        var div = document.createElement("div");
        div.innerHTML = i;
        div.onclick = function(){
            console.log(i);
        }
        document.body.appendChild(div);
    }(i);
}
```
通过 IIFE 在循环内构造了作用域，每次循环都产生一个新的环境记录，这样，每个 div 都能访问到环境中的 i。所以能正常打印，1，2，3。。。

如果不使用IIFE，那么将会全部打印20，因为全局只有一个i，而i在for循环中会被穿透，执行完循环后就变成了20

### function 声明
>在全局（脚本、模块和函数体），function 声明表现跟 var 相似，不同之处在于，function 声明不但在作用域中加入变量，还会给它赋值。

```
console.log(foo); //正常打印foo
function foo(){

}
```
function 声明出现在 if 等语句中的情况有点复杂，它仍然作用于脚本、模块和函数体级别，在预处理阶段，仍然会产生变量，它不再被提前赋值：
```
console.log(foo); //undefined,如果没有函数声明，则会抛出错误。
if(true) {
    function foo(){

    }
}
```
这说明 **function 在预处理阶段仍然发生了作用，在作用域中产生了变量，没有产生赋值，赋值行为发生在了执行阶段。**

### class 声明
class 的声明作用不会穿透 if 等语句结构，所以只有写在全局环境才会有声明作用
```
console.log(c);  //报错：Uncaught ReferenceError: c is not defined
class c{

}
```
```
var c = 1;
function foo(){
    console.log(c);  //报错，这说明class 声明也是会被预处理的，它会在作用域中创建变量，并且要求访问它时抛出错误。
    class c {}
}
foo();
```

## 指令序言机制 
>脚本和模块都支持一种特别的语法，叫做指令序言（Directive Prologs）。JavaScript 的指令序言是只有一个字符串直接量的表达式语句，**它只能出现在脚本、模块和函数体的最前面**,可以是单引号或者双引号。

这里的指令序言最早是为了 use strict 设计的，它规定了一种给 JavaScript 代码添加元信息的方式。

```
"use strict";
function f(){
    console.log(this);
};
f.call(null);
```
这段代码展示了严格模式的用法，我这里定义了函数 f，f 中打印 this 值，然后用 call 的方法调用 f，传入 null 作为 this 值，我们可以看到最终结果是 null 原封不动地被当做 this 值打印了出来，这是严格模式的特征。

如果我们去掉严格模式的指令需要，打印的结果将会变成 global。