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




[es6入门教程](https://es6.ruanyifeng.com/)

[es5入门到进阶视频地址](https://study.163.com/course/courseLearn.htm?courseId=1005211046#/learn/video?lessonId=1051940974&courseId=1005211046)