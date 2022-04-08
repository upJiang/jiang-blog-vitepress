>自 2009 年 Node.js 诞生，前端先后出现了 CommonJS、AMD、CMD、UMD和ES Module 等模块规范。

## 无模块标准阶段
早在模块化标准还没有诞生的时候，前端界已经产生了一些模块化的开发手段，如`文件划分、命名空间和IIFE 私有作用域`。
```
// module-a.js  文件划分思想
// 立即执行函数创建一个私有的作用域，
// 在私有作用域中的变量外界是无法访问的，
// 只有模块内部的方法才能访问。
(function () {
  let data = "moduleA";

  function method() {
    console.log(data + "execute");
  }

  // 命名空间思想
  window.moduleA = {
    method: method,
  };
})();
```
```
// module-b.js
(function () {
  let data = "moduleB";

  function method() {
    console.log(data + "execute");
  }

  window.moduleB = {
    method: method,
  };
})();
```
```
<script src="./module-a.js"></script>
<script src="./module-b.js"></script>
<script>
    // 此时 window 上已经绑定了 moduleA 和 moduleB
    console.log(moduleA.data);
    moduleB.method();
</script>
```
为了解决模块加载，依赖问题，学习一下业界主流的三大模块规范: `CommonJS、AMD 和 ES Module`。

## CommonJS 规范
CommonJS 是业界最早正式提出的 JavaScript 模块规范，主要用于服务端，随着 Node.js 越来越普及，这个规范也被业界广泛应用。
```
// module-a.js
var data = "hello world";
function getData() {
  return data;
}
module.exports = {
  getData,
};

// index.js
const { getData } = require("./module-a.js");
console.log(getData());
```
代码中使用 `require` 来导入一个模块，用`module.exports`来导出一个模块。实际上 Node.js 内部会有相应的 loader 转译模块代码，最后模块代码会被处理成下面这样:
```
(function (exports, require, module, __filename, __dirname) {
  // 执行模块代码
  // 返回 exports 对象
});
```

存在的问题：
- 为了在浏览器中执行，业界产生了 `browserify` 这种打包工具来支持打包 CommonJS 模块，相当于社区实现了一个第三方的 loader。
- CommonJS 本身约定以`同步`的方式进行模块加载，`模块请求会造成浏览器 JS 解析过程的阻塞，导致页面加载速度缓慢`。

## AMD 规范
`AMD`全称为`Asynchronous Module Definition`，即异步模块定义规范。模块根据这个规范，在浏览器环境中会被异步加载，而不会像 CommonJS 规范进行同步加载，也就不会产生同步请求导致的浏览器解析过程阻塞的问题了。
```
// main.js
define(["./print"], function (printModule) {
  printModule.print("main");
});

// print.js
define(function () {
  return {
    print: function (msg) {
      console.log("print " + msg);
    },
  };
});
```
在 AMD 规范当中，我们可以通过 define 去定义或加载一个模块，比如上面的 `main` 模块和`prin`t模块，如果模块需要导出一些成员需要通过在定义模块的函数中 `return` 出去(参考 `print` 模块)，如果当前模块依赖了一些其它的模块则可以通过 `define` 的第一个参数来声明依赖(参考`main`模块)，这样模块的代码执行之前浏览器会先加载依赖模块。

当然，你也可以使用 require 关键字来加载一个模块，如:
```
// module-a.js
require(["./print.js"], function (printModule) {
  printModule.print("module-a");
});
```
不过 require 与 define 的区别在于前者`只能加载模块，而不能定义一个模块`。

由于没有得到浏览器的原生支持，AMD 规范需要由第三方的 loader 来实现，最经典的就是 `requireJS` 库了，它完整实现了 AMD 规范，至今仍然有不少项目在使用。

同期出现的规范当中也有 CMD 规范，这个规范是由淘宝出品的SeaJS实现的，解决的问题和 AMD 一样。不过随着社区的不断发展，SeaJS 已经被requireJS兼容了。

>当然，你可能也听说过 UMD (Universal Module Definition)规范，其实它并不算一个新的规范，只是兼容 AMD 和 CommonJS 的一个模块化方案，可以同时运行在浏览器和 Node.js 环境。

## ES6 Module
ES6 Module 也被称作 `ES Module`(或 `ESM`)， 是由 `ECMAScript`官方提出的模块化规范，作为一个官方提出的规范，`ES Module` 已经得到了现代浏览器的内置支持。在现代浏览器中，如果在 HTML 中加入含有`type="module"`属性的 `script` 标签，那么浏览器会按照 `ES Module` 规范来进行依赖加载和模块解析，这也是 `Vite` 在开发阶段实现 `no-bundle` 的原因，由于模块加载的任务交给了浏览器，即使不打包也可以顺利运行模块代码。**import、export**

 ES Module 能够`同时在浏览器与 Node.js 环境中执行`，拥有天然的跨平台能力。
 ```
 // main.js
import { methodA } from "./module-a.js";
methodA();

//module-a.js
const methodA = () => {
  console.log("a");
};

export { methodA };
 ```
 如果在 Node.js 环境中，你可以在package.json中声明type: "module"属性:
 ```
 // package.json
{
  "type": "module"
}
 ```
 然后 Node.js 便会默认以 ES Module 规范去解析模块:
 ```
 node main.js
 // 打印 a
 ```