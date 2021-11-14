## 脚本和模块
![img](https://static001.geekbang.org/resource/image/43/44/43fdb35c0300e73bb19c143431f50a44.jpg)
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


