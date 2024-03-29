> es6 即为 es2015,之后的版本均为 es2016 之类，或者是 es6.1

## let,var,const

```
var a = 12;
function fn(){
   alert(a)
   var a = 5;
}

a输出undefinded,不会报错，此处为js的预解析
var 重复定义相同变量不会报错，直接覆盖
```

```
let a = 12;
function fn(){
   alert(a)  //暂时性死区 TDZ
   let a = 5;
}

报错undefinder,不会输出,let不存在js的预解析
let不允许重复定义，直接报错
```

- 函数提升优先于变量提升，函数提升会把整个函数挪到作用域顶部，变量提升只会把声明
  挪到作用域顶部，声明而不会赋值
- var 存在提升，我们能在声明之前使用。let、const 因为暂时性死区的原因，不能在声
  明前使用
- var 在全局作用域下声明变量会导致变量挂载在 window 上，其他两者不会
- let 和 const 作用基本一致，但是后者声明的变量不能再次赋值

## 解构赋值

```
let {a,b,c="默认值"} = {"aaa","bbb"}
const {a,b,c} = import './aa'
```

## 字符串方法

### 字符串模板

let a = `士大夫撒${a}感到反感`

### 字符串查找

```
str.includes(要找的东西)  返回true或者false
str.indexOf(要找的东西)  返回索引位置，没找到返回-1
```

### 字符串检测以什么开头/结尾

```
str.startsWith/str.endsWith(要检测的东西) 返回true或者false
```

### 让字符串重复

```
let str = "a"
str.repeat(3)   输出aaa
```

### 字符串填充

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/712c4c52048b46b7bb6b0b1fd40698b6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/712c4c52048b46b7bb6b0b1fd40698b6~tplv-k3u1fbpfcp-watermark.image?)</a>

### 函数变化

```
1.函数默认参数
    function show({x=0,y=0}={}) {
        console.log(x,y);
    }
    show();
2.函数参数默认已经定义了，不能再使用let，const在函数内定义声明。
    function show(a=10){
        let a = 101;
        console.log(a);
    }
    show();
```

### 扩展运算符 rest 运算符 可逆

```
字符串转数组
function show(...[a,b,c]) {
console.log(a,b,c);
}
show(2,3,4);
数组转字符串
function show(...array) {
console.log(array);
}
show([a,b,c]);
剩余参数只能放末尾,否则报错
let a = [a,b,c]
let b = ["ssf","fs",..a]
复制数组内容，而不是地址
let a = [a,b,c]
let b = [...a]
```

## 箭头函数

```
() => a
() => {
    语句
    return;
}

let show = (a) =>a    //参数，返回值
show("aaa")
```

> 使用箭头函数时，this 指向定义函数的位置，而不是函数内部，故在写小程序请求时外
> 面包了已成 promise 之后不需要 let self= this ,它直接指向外层

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cde7835210f64a33a59b86ec1cc0185e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cde7835210f64a33a59b86ec1cc0185e~tplv-k3u1fbpfcp-watermark.image?)</a>

## 数组方法

### forEach

```
arr.forEach(val,index) =>{
}
```

### map

> map,必须 return，return 一个数组，对数据进行改造，返回改造后的数组

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fcf06b61d19c49c6b3eab8e5f02c8248~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fcf06b61d19c49c6b3eab8e5f02c8248~tplv-k3u1fbpfcp-watermark.image?)</a>

### filter

> 过滤不合格的条件，rutrun 条件，符合的数组选项保留下来,返回符合条件的数组

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/583c205bc4a74d16bc53b88a63bf9c09~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/583c205bc4a74d16bc53b88a63bf9c09~tplv-k3u1fbpfcp-watermark.image?)</a>

### some

> arr.some():类似查找，数组里面某一个元素符合条件，返回 true

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c8ea55ccf2814ddb986e97e936295faa~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c8ea55ccf2814ddb986e97e936295faa~tplv-k3u1fbpfcp-watermark.image?)</a>

### every

> arr.every():数组里面所有的元素都要符合条件，才返回 true

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bf46a068e33c424288142909809e7cfa~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bf46a068e33c424288142909809e7cfa~tplv-k3u1fbpfcp-watermark.image?)</a>

### reduce

> 可用于求和，操作后结果作为 prev，再与 cur 操作，依此类推，reduceRight 从右往左

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5844735a6f8749f78cedf159bf3ef723~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5844735a6f8749f78cedf159bf3ef723~tplv-k3u1fbpfcp-watermark.image?)</a>

### for...of...

> arr.keys() 数组下标 arr.entries() 数组某一项

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/754e9d1923694852b4d97c2ce4e32e1c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/754e9d1923694852b4d97c2ce4e32e1c~tplv-k3u1fbpfcp-watermark.image?)</a>

### array.from

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a51bc957f31c4422a59a2fb941993df9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a51bc957f31c4422a59a2fb941993df9~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/878ede2f6d8b4eb78efe688078329962~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/878ede2f6d8b4eb78efe688078329962~tplv-k3u1fbpfcp-watermark.image?)</a>

### array.of

> 类似于... 将一组数据转成数组

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d474dc313c1d4956a02938a2748f24c6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d474dc313c1d4956a02938a2748f24c6~tplv-k3u1fbpfcp-watermark.image?)</a>

### arr.find() arr.findIndex()

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e883985517641a98adab338e769ffa6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e883985517641a98adab338e769ffa6~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/71663644c0e5449b8593ca53a16d1bb6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/71663644c0e5449b8593ca53a16d1bb6~tplv-k3u1fbpfcp-watermark.image?)</a>

### arr.fill()

> arr.fill(填充的东西，开始位置，结束位置)

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb00777c174440fab050ab1dd3e9a450~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb00777c174440fab050ab1dd3e9a450~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/362505b0ca8e48ceb6f42f32513ec12e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/362505b0ca8e48ceb6f42f32513ec12e~tplv-k3u1fbpfcp-watermark.image?)</a>

## 对象 Object

### Object.is()

> 比较两个对象，只要肉眼看到相同就相等

```
Object.is(NaN,NaN)  //true
Object.is(+0,-0)  //false
```

### Object.assign()

> 浅拷贝，Object.assign(目标源，数据，数据) 合并对象，将后面的对象合并到目标对象
> 中，若有重复，后面的替换前面的

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae6c4b9336914ba7b0a73091da4cb0f2~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae6c4b9336914ba7b0a73091da4cb0f2~tplv-k3u1fbpfcp-watermark.image?)</a>

```
输出: {a:2,b:2,c:3}
```

## Promise

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d863f64add6b46999b4ddcb36c9eda94~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d863f64add6b46999b4ddcb36c9eda94~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6e1d83456f5f4e5b9d108c1683aae034~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6e1d83456f5f4e5b9d108c1683aae034~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9ededed16e2e4e039f5cc1c0ff7cd4c7~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9ededed16e2e4e039f5cc1c0ff7cd4c7~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/24bc98f8d41d4d808559e2d656e5a949~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/24bc98f8d41d4d808559e2d656e5a949~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7aa5e8f08dfa4b1c88e33be99e766f7e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7aa5e8f08dfa4b1c88e33be99e766f7e~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/88e5af2520ca4554abf770fc994f937d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/88e5af2520ca4554abf770fc994f937d~tplv-k3u1fbpfcp-watermark.image?)</a>

## 模块化

> 注意：1.要放在服务器环境才可以使用; 2.import './modules/1.js';

### 定义模块

```
export const a = 12;
export{
a as aaa,
b as banana
}
export default 12;
```

### 使用

```
import './modules/1.js';
import {a,b ,c} from './modules/2.js'
import * as modTwo from './modules/2.js'
import a from './modules/2.js' //只有default出来的不用花阔号

使用模块：
<script type="module" src="./main.js"></script>
```

### import 详述

1. import 可以是相对路径，也可以是绝对路径<br/> import
   "https://code.jquery.com/jquery-3.3.1.js"
2. import 模块只引入一次，无论你导入多少次
3. import './modules/1.js';如果这么用，相等于引入文件
4. import 有提升的效果，import 会自动提升到顶部，首先执行。
5. 导出去模块内容，如果里面有定时器更改，外面也会改动，不像 Comon 规范缓存

import() 类似 node 里面 require，可以动态引入的，，而且他是有返回值的，是个
promise 对象，而默认 import 语法不能写到 if 之类里面，因为他是静态的，必须先引入
再调用。

```
import('./modules/1.js').then({}res=>{
console.log(res.a + res.b);
});
```

### 优点

1. 按需加载

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/979cfde4246944d9ba292b26011a3940~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/979cfde4246944d9ba292b26011a3940~tplv-k3u1fbpfcp-watermark.image?)</a>

2. 可以写到 if 中

3. 路径也是可以动态的,可以结合 Promise.all 来用

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bc5976e9cb944770b3d137fb54aad6e0~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bc5976e9cb944770b3d137fb54aad6e0~tplv-k3u1fbpfcp-watermark.image?)</a>

## 类 class

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a793e5d68b494b8fa8259d87963155aa~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a793e5d68b494b8fa8259d87963155aa~tplv-k3u1fbpfcp-watermark.image?)</a>

可以用变量定义方法名，加[]<br/>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e9cd833241245d8b2fc096f6aef8814~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8e9cd833241245d8b2fc096f6aef8814~tplv-k3u1fbpfcp-watermark.image?)</a>

### get、set 的使用

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3cda283637f6493c981e982e78ae06e9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3cda283637f6493c981e982e78ae06e9~tplv-k3u1fbpfcp-watermark.image?)</a>

### 继承

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ecb736ae0887432695f584447ccf4fde~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ecb736ae0887432695f584447ccf4fde~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/50f7fdaa32d2471b8e312f977b858456~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/50f7fdaa32d2471b8e312f977b858456~tplv-k3u1fbpfcp-watermark.image?)</a>

## symbol

### 定义

let syml = Symbpl('aaa');

### 注意

1. Symbol 不能 new
2. Symbol() 返回是一个唯一值。民间传说，做一个 key，定义一些唯一或者私有的一些东
   西
3. Symbol 是一个单独的数据类型，就叫 symbol，基本类型。
4. 如果 symbol 作为 key，用 for-in 循环是出不来的(比如用 json)

## generator

> generator 函数 解决异步深度嵌套。手动调用，每执行一次 next()，就执行一个 yield
> 的方法

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b75aa4db3ee4c608b6501d79e3a8f78~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b75aa4db3ee4c608b6501d79e3a8f78~tplv-k3u1fbpfcp-watermark.image?)</a>

generator 结合 axios 数据请求：
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3ce4a18ec5e44b8c921b62a8fe2ea7bb~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3ce4a18ec5e44b8c921b62a8fe2ea7bb~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a79f0c54715d46339fce0f38f2e09977~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a79f0c54715d46339fce0f38f2e09977~tplv-k3u1fbpfcp-watermark.image?)</a>

## Set

> Set 数据解构：类似数组，但是里面不能有重复值

```
let setArr = new Set(['a','a','b','c','c'])
输出 Set(3) {'a','b','c'}
```

### 用法

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b996361a983143c6ac9bc35e1b5556c7~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b996361a983143c6ac9bc35e1b5556c7~tplv-k3u1fbpfcp-watermark.image?)</a>

### 链式增加

```
let setArr = new Set().add('a').add('b').add('c');
```

### 数组去重

```
let arr = [1,2,3,1];
let newArr = [...new Set(arr)];
console.log(newArr);
```

### set 数据结构变成数组

```
[...set]
然后set变成数组之后，一些有关于数组的东西就可以使用了，比如map循环和filter过滤
```

> new Set([]);存放数组，可用 add 添加 json 对象<br/> new WeakSet({});存放是对象
> json，一般不用，不靠谱<br/> 确认，初始往里面加东西，是不行的，最好用 add 去添
> 加吧。

## Map

> 类似 json，但是 json 的键(key)只能是字符串,map 的可以是任何类型的,用
> (key,value)标识，以 key 获取或者设置

使用：

```
let map = new Map();
map.set(key,value);//set是设置一个值
map.get(key,value);//获取一个值
map.delete(key);//删除一个值
map.has(key);//有没有这个值
map.clear();//清空

如：
let map = new Map();
map.set('sdas','sadfg');
console.log(map);

循环：
for(let [key,value] of map){}
for(let key of map.keys()){}
for(let value of map.values()){}
for(let [k,v] of map.entries()){}
map.forEach((value,key)=>{
console.log(value,key);
})

=================
weakMap//key只能是对象，现实中不建议使用
=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
```

总结:

- set 里面是数组，不重复，没有 key，没有 get 方法。
- map 对 json 功能增强，key 可以是任意类型值。

## 数字(数值)变化

```
二进制 八进制 十六进制
==================================
Number()、parseInt()、parseFloat()
==================================
Number.isNaN(NaN) -->true
Number.isFinite(a) 判断是不是数字
Number.isInterger(a) //判断数字是不是整数
===================================
Number.parseInt();
Number.parseFloat();
===================================
安全整数：
2**3 == 2^3
安全整数 [-(2^53)-1，(2^53)-1],
Number.isSafeInterger(a);
===================================
Math:
Math.abs();//绝对值
Math.sqrt();开方
Math.sin();

Math.trunc(1.1);//截断，保留整数部分1
Math.sign(-10) 用来判断一个数是正数，还是负数还是0，其他值是NaN
Math.cbrt(27);//计算一个数的立方根3
```

## es2018 新增

[详解 ES 2018 新特性](https://mp.weixin.qq.com/s/AfTLs4FJaeir6Lv3hk5UAg)

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/32b044ab6a774f15b2f9a1eea7318b16~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/32b044ab6a774f15b2f9a1eea7318b16~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1c454f9204a4ed19664ef9c67f40402~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1c454f9204a4ed19664ef9c67f40402~tplv-k3u1fbpfcp-watermark.image?)</a>

### 命名捕获

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1c454f9204a4ed19664ef9c67f40402~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e1c454f9204a4ed19664ef9c67f40402~tplv-k3u1fbpfcp-watermark.image?)</a><br/>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7d3629bdf0f74c24a99ccce49fcfb827~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7d3629bdf0f74c24a99ccce49fcfb827~tplv-k3u1fbpfcp-watermark.image?)</a>

### replace 替换

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0556dfba57d4607800b1f5ea25366e7~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a0556dfba57d4607800b1f5ea25366e7~tplv-k3u1fbpfcp-watermark.image?)</a><br/>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6239679ceaf4271a35c5bb7547e84c4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a6239679ceaf4271a35c5bb7547e84c4~tplv-k3u1fbpfcp-watermark.image?)</a>

### dotAll 模式

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/274d33b7b59a441999fdb0944c35631c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/274d33b7b59a441999fdb0944c35631c~tplv-k3u1fbpfcp-watermark.image?)</a>

### 标签函数

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49378e7aa520418da80c1c4fbabeef2a~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49378e7aa520418da80c1c4fbabeef2a~tplv-k3u1fbpfcp-watermark.image?)</a>

### Proxy

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b7c4ffff5a3419ea3d7dfad1d42c8c8~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2b7c4ffff5a3419ea3d7dfad1d42c8c8~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/494f69c61de140faa8a61744f0867cf3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/494f69c61de140faa8a61744f0867cf3~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fb512b7762fc4e328b822831e51b2613~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fb512b7762fc4e328b822831e51b2613~tplv-k3u1fbpfcp-watermark.image?)</a><br/>
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2e630ee4b7894870b16da23ed74d1da0~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2e630ee4b7894870b16da23ed74d1da0~tplv-k3u1fbpfcp-watermark.image?)</a>

#### set():设置，拦截

设置一个年龄，保证是整数，范围不能超过 200。

```
let obj = new Proxy({},{
set(target,prop,value){
if(prop == 'age'){
if(!Number.isInteger(value)){
throw new IypeError('年龄必须为整数');
}
if(value>200 || value < 0){
throw new RangeError('年龄超标了,必须小于200，大于0');
}
}
target[prop] = value;
}
});
obj.age = -2;
console.log(obj);
```

#### deleteProperty():删除，拦截

```
let json = {
name : 'Hansen',
age : '22'
};
let newJson = new Proxy(json,{
deleteProperty(target,property){
console.log('您要删除'+property+'属性');
delete target[property];
}
});
delete newJson.age;
console.log(newJson);
```

#### has():检测有没有

```
let json = {
name : 'Hansen',
age : '22'
};
let newJson = new Proxy(json,{
has(target,property){
console.log('判断是否存在调用has方法');
return property in target;
}
});
console.log('age' in newJson);
//console.log(newJson);
```

#### apply():拦截方法（函数）

```
function fn() {
return '我是一个快乐小函数！';
}
let newFn = new Proxy(fn,{
apply(){
return '函数吗？'
}
});
console.log(newFn());
```

#### Reflect.apply(函数的调用，this 指向，参数数组)

```
Reflect.apply(函数的调用，this指向，参数数组)；
fn.call();
与fn.apply()；类似
Reflec反射的使用:
‘assign’ in Object -> Relect.has(Object,'assign');
如delete json.a -> Relect.deleteProperty(json,'a');
```

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4d772b217d8147eab9ea88d60a8859b2~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4d772b217d8147eab9ea88d60a8859b2~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bb928770bdbc4124ac6372a259afa23c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bb928770bdbc4124ac6372a259afa23c~tplv-k3u1fbpfcp-watermark.image?)</a>

[es6 入门教程](https://es6.ruanyifeng.com/)

[es5 入门到进阶视频地址](https://study.163.com/course/courseLearn.htm?courseId=1005211046#/learn/video?lessonId=1051940974&courseId=1005211046)
