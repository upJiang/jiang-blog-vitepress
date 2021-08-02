>前端模块化就是复杂的文件编程一个一个独立的模块，比如js文件等等，分成独立的模块有利于重用（复用性）和维护（版本迭代），这样会引来模块之间相互依赖的问题，所以有了commonJS 规范，AMD，CMD规范等等，以及用于js打包（编译等处理）的工具 webpack

## CommonJS
>NodeJS是CommonJS规范的实现，webpack 也是以CommonJS的形式来书写

浏览器不能兼容，因为require是同步的，需要等待的，如果我们去使用同步获取服务器信息，那么浏览器将会“假死”状态，并且浏览器也没有module、exports、require、global这四个node变量

CommonJS定义的模块分为:{模块引用(require)} {模块定义(exports)} {模块标识(module)}，运行时加载

转换工具： Browserify
```
//foo.js
module.exports = function(x) {
  console.log(x);
};
//main.js
var foo = require("./foo");
foo("Hi");
========================》》》》》》
[
  {
    "id":1,
    "source":"module.exports = function(x) {\n  console.log(x);\n};",
    "deps":{}
  },
  {
    "id":2,
    "source":"var foo = require(\"./foo\");\nfoo(\"Hi\");",
    "deps":{"./foo":1},
    "entry":true
  }
]
browerify 将所有模块放入一个数组，id 属性是模块的编号，source 属性是模块的源码，deps 属性是模块的依赖。
```

## AMD
异步模块定义，就是为了解决commonjs同步等待的问题，使用异步加载，不影响后面代码的执行， AMD也采用require()语句加载模块，但是不同于CommonJS，它要求两个参数：
```
// math.js
　　define(function (){
　　　　var add = function (x,y){
　　　　　　return x+y;
　　　　};
        var ccc = function (x,y){
　　　　　　return x+y;
　　　　};
　　　　return {
　　　　　　add: add,
                    ccc:ccc
　　　　};
});
require(['math'], function (math) {
　　math.add(2, 3);
});

注意：如果定义的模块依赖于别的模块，那么第一个参数是一个依赖模块的数组，使用require.js的插件可以不一样写
define(['dep1','dep2'],function(dep1,dep2){...});
```
**RequireJS**就是实现了AMD规范，比如说在项目中使用require.js，然后设置主入口去异步加载别的模块
```
<script src="js/require.js" data-main="js/main"></script>
假定主模块依赖jquery、underscore和backbone这三个模块，main.js就可以这样写：
require(['jquery', 'underscore', 'backbone'], function ($, _, Backbone){
　　　　// some code here
});
或者
require.config({
　　　　baseUrl: "js/lib",
　　　　paths: {
　　　　　　"jquery": "jquery.min",
　　　　　　"underscore": "underscore.min",
　　　　　　"backbone": "backbone.min"
　　　　}
});
```
## CMD/AMD
>通用模块定义 seajs  CMD 推崇依赖就近，AMD 推崇依赖前置 ,AMD主张以来一开始加载完毕，而CMD主张需要用到时才加载
```
define(function(require, exports, module) {
var a = require('./a')
a.doSomething()
// 此处略去 100 行
var b = require('./b') // 依赖可以就近书写
b.doSomething()
// ...
})
```
AMD | 速度快 | 会浪费资源 | 预先加载所有的依赖，直到使用的时候才执行

CMD | 只有真正需要才加载依赖 | 性能较差 | 直到使用的时候才定义依赖

## CommonJS和ES6模块的区别
* CommonJS模块是运行时加载，ES6 Modules是编译时输出接口
* CommonJS输出是值的拷贝；ES6 Modules输出的是值的引用，被输出模块的内部的改变会影响引用的改变
* CommonJs导入的模块路径可以是一个表达式，因为它使用的是require()方法；而ES6 Modules只能是字符串
* CommonJS this指向当前模块，ES6 Modules this指向undefined
* 且ES6 Modules中没有这些顶层变量：arguments、require、module、exports、__filename、__dirname

### require
1. CommonJs的语法（AMD规范引入方式），CommonJs的模块是对象。
2. 运行时加载整个模块（即模块中所有方法），生成一个对象，再从对象上读取它的方法（只有运行时才能得到这 个对象,不能在编译时做到静态化），理论上可以用在代码的任何地方
3.  require是赋值过程，把require的结果（对象，数字，函数等），默认是export的一个对象，赋给某个变量（复制或浅拷贝）
### import
1. es6的一个语法标准（浏览器不支持，本质是使用node中的babel将es6转码为es5再执行，import会被转码为require），es6模块不是对象
2. 是编译时调用，确定模块的依赖关系，输入变量（es6模块不是对象，而是通过export命令指定输出代码，再通过import输入，只加载import中导的方法，其他方法不加载），import具有提升效果，会提升到模块的头部（编译时执行）
3. import是解构过程（需要谁，加载谁）
![Image.png](https://i.loli.net/2021/08/02/TbfUzNdI3qWFQ1Z.png)