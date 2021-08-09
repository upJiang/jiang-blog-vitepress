>es6 即为 es2015,之后的版本均为es2016之类，或者是es6.1

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

* 函数提升优先于变量提升，函数提升会把整个函数挪到作用域顶部，变量提升只会把声明挪到作用域顶部
* var 存在提升，我们能在声明之前使用。let、const 因为暂时性死区的原因，不能在声明前使用
* var 在全局作用域下声明变量会导致变量挂载在 window上，其他两者不会
* let 和 const 作用基本一致，但是后者声明的变量不能再次赋值

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
![Image.png](https://i.loli.net/2021/08/08/82zRqiLNZepuFoY.png)

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
### 扩展运算符 rest运算符 可逆
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

>使用箭头函数时，this指向定义函数的位置，而不是函数内部，故在写小程序请求时外面包了已成promise之后不需要let self= this ,它直接指向外层

![Image.png](https://i.loli.net/2021/08/08/YVbCODG5rSRXP24.png)

## 数组方法
### forEach
```
arr.forEach(val,index) =>{
}
```
### map
>map,必须return，return一个数组，对数据进行改造，返回改造后的数组

![Image.png](https://i.loli.net/2021/08/08/MvoupeJlrNWEQ9d.png)

### filter
>过滤不合格的条件，rutrun条件，符合的数组选项保留下来,返回符合条件的数组

![Image.png](https://i.loli.net/2021/08/08/LbVS3cIDNmfpuzg.png)

### some
>arr.some():类似查找，数组里面某一个元素符合条件，返回true

![Image.png](https://i.loli.net/2021/08/08/z4vLb1MZIGw2mtk.png)

### every
>arr.every():数组里面所有的元素都要符合条件，才返回true

![Image.png](https://i.loli.net/2021/08/08/xgkT6GjeKRs8UBQ.png)

### reduce
>可用于求和，操作后结果作为prev，再与cur操作，依此类推，reduceRight 从右往左

![Image.png](https://i.loli.net/2021/08/08/HF4WvErh5SuC2DL.png)

### for...of...
>arr.keys() 数组下标   arr.entries() 数组某一项

![Image.png](https://i.loli.net/2021/08/08/d2qXu5MRDO3wLrp.png)

### array.from

![Image.png](https://i.loli.net/2021/08/08/2jJQTsbpgVrwGcd.png)

![Image.png](https://i.loli.net/2021/08/08/yseMUFtPjZ3xd79.png)

### array.of
>类似于... 将一组数据转成数组

![Image.png](https://i.loli.net/2021/08/08/mtvEhY4qplKWfbL.png)

### arr.find()  arr.findIndex()

![Image.png](https://i.loli.net/2021/08/08/M2YiCJgn6lhRUs8.png)

![Image.png](https://i.loli.net/2021/08/08/oAOujarQKRE5zZY.png)

### arr.fill()
>arr.fill(填充的东西，开始位置，结束位置)

![Image.png](https://i.loli.net/2021/08/08/snOiKAhRCLDZHI6.png)
![Image.png](https://i.loli.net/2021/08/08/Jfcn4w6QvYtXKeV.png)

## 对象Object
### Object.is()
>比较两个对象，只要肉眼看到相同就相等
```
Object.is(NaN,NaN)  //true
Object.is(+0,-0))  //false
```

### Object.assign()
>浅拷贝，Object.assign(目标源，数据，数据)  合并对象，将后面的对象合并到目标对象中，若有重复，后面的替换前面的

![Image.png](https://i.loli.net/2021/08/09/7jkrbJ3ZUDI2PBW.png)
输出: {a:2,b:2,c:3}

## Promise
![Image.png](https://i.loli.net/2021/08/09/OIoPv5A8UwifCn7.png)

![Image.png](https://i.loli.net/2021/08/09/YsTfnadPcFSUIlx.png)

![Image.png](https://i.loli.net/2021/08/09/hn5zswHIe7KdJxE.png)

![Image.png](https://i.loli.net/2021/08/09/v7LA6PW3icub9Er.png)

![Image.png](https://i.loli.net/2021/08/09/XaVy3LzZ2csrm4P.png)

![Image.png](https://i.loli.net/2021/08/09/Ohs85dnD1Bio9vL.png)

## 模块化
>注意：1.要放在服务器环境才可以使用; 2.import './modules/1.js';

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
### import详述
1. import可以是相对路径，也可以是绝对路径<br/>
import "https://code.jquery.com/jquery-3.3.1.js"
2. import模块只引入一次，无论你导入多少次
3. import './modules/1.js';如果这么用，相等于引入文件
4. import 有提升的效果，import会自动提升到顶部，首先执行。
5. 导出去模块内容，如果里面有定时器更改，外面也会改动，不像Comon规范缓存

import() 类似node里面require，可以动态引入的，，而且他是有返回值的，是个promise对象，而默认import语法不能写到if之类里面，因为他是静态的，必须先引入再调用。
```
import('./modules/1.js').then({}res=>{
console.log(res.a + res.b);
});
```

### 优点
1. 按需加载

![Image.png](https://i.loli.net/2021/08/09/q3GpfY9lIQOHWVD.png)

2. 可以写到if中

3. 路径也是可以动态的,可以结合 Promise.all来用

![Image.png](https://i.loli.net/2021/08/09/RzU8kcsxAEnLFiM.png)

## 类class
![Image.png](https://i.loli.net/2021/08/09/ONs5JvQXZcidw8Y.png)

可以用变量定义方法名，加[]<br/>
![Image.png](https://i.loli.net/2021/08/09/MtUr1xj8dhg2T5v.png)

### get、set的使用
![Image.png](https://i.loli.net/2021/08/09/zFxNyfMnXGWHcS5.png)

### 继承
![Image.png](https://i.loli.net/2021/08/09/5eIyHb4BO6DkWNP.png)

![Image.png](https://i.loli.net/2021/08/09/TI9LzUluA2gEhVw.png)

## symbol
### 定义
let syml = Symbpl('aaa');

### 注意
1. Symbol 不能 new
2. Symbol() 返回是一个唯一值。民间传说，做一个key，定义一些唯一或者私有的一些东西
3. Symbol是一个单独的数据类型，就叫symbol，基本类型。
4. 如果symbol作为key，用for-in循环是出不来的(比如用json)

## generator
>generator 函数 解决异步深度嵌套。手动调用，每执行一次next()，就执行一个yield的方法

![Image.png](https://i.loli.net/2021/08/09/5FG9vlXm2VPQ6hY.png)

![Image.png](https://upload.cc/i1/2021/08/09/04oacP.png)

generator结合axios数据请求：
![Image.png](https://z3.ax1x.com/2021/08/09/fGERHg.png)

![fGE44s.png](https://z3.ax1x.com/2021/08/09/fGE44s.png)

## Set
>Set数据解构：类似数组，但是里面不能有重复值

```
let setArr = new Set(['a','a','b','c','c')
输出 Set(3) {'a','b','c'}
```

### 用法
![fGVAVe.png](https://z3.ax1x.com/2021/08/09/fGVAVe.png)

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
### set数据结构变成数组
```
[...set]
然后set变成数组之后，一些有关于数组的东西就可以使用了，比如map循环和filter过滤
```
>new Set([]);存放数组，可用add添加json对象<br/>
>new WeakSet({});存放是对象json，一般不用，不靠谱<br/>
>确认，初始往里面加东西，是不行的，最好用add去添加吧。

## Map
>类似json，但是json的键(key)只能是字符串,map的可以是任何类型的,用(key,value)标识，以key获取或者设置

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
* set 里面是数组，不重复，没有key，没有get方法。
* map对json功能增强，key可以是任意类型值。

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

## es2018新增

[详解 ES 2018 新特性](https://mp.weixin.qq.com/s/AfTLs4FJaeir6Lv3hk5UAg)

![fGZWfs.png](https://z3.ax1x.com/2021/08/09/fGZWfs.png)

![fGZv11.png](https://z3.ax1x.com/2021/08/09/fGZv11.png)

### 命名捕获
![fGeB4J.png](https://z3.ax1x.com/2021/08/09/fGeB4J.png)<br/>
![fGe2DK.png](https://z3.ax1x.com/2021/08/09/fGe2DK.png)

### replace 替换
![fGmp2n.png](https://z3.ax1x.com/2021/08/09/fGmp2n.png)<br/>
![fGmV54.png](https://z3.ax1x.com/2021/08/09/fGmV54.png)

### dotAll模式
![fGmMKx.png](https://z3.ax1x.com/2021/08/09/fGmMKx.png)

### 标签函数
![fGm8aD.png](https://z3.ax1x.com/2021/08/09/fGm8aD.png)

### Proxy
![fGmGIe.png](https://z3.ax1x.com/2021/08/09/fGmGIe.png)

![fGmYPH.png](https://z3.ax1x.com/2021/08/09/fGmYPH.png)

![fGmtGd.png](https://z3.ax1x.com/2021/08/09/fGmtGd.png)<br/>
![fGm6iQ.png](https://z3.ax1x.com/2021/08/09/fGm6iQ.png)

#### set():设置，拦截
设置一个年龄，保证是整数，范围不能超过200。
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
#### Reflect.apply(函数的调用，this指向，参数数组)
```
Reflect.apply(函数的调用，this指向，参数数组)；
fn.call();
与fn.apply()；类似
Reflec反射的使用:
‘assign’ in Object -> Relect.has(Object,'assign');
如delete json.a -> Relect.deleteProperty(json,'a');
```
![fGnv1s.png](https://z3.ax1x.com/2021/08/09/fGnv1s.png)

![fGnzXq.png](https://z3.ax1x.com/2021/08/09/fGnzXq.png)


[es6入门教程](https://es6.ruanyifeng.com/)

[es5入门到进阶视频地址](https://study.163.com/course/courseLearn.htm?courseId=1005211046#/learn/video?lessonId=1051940974&courseId=1005211046)