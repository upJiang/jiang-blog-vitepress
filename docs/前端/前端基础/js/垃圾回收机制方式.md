>垃圾收集器会定期（周期性）找出那些不在继续使用的变量，然后释放其内存。但是这个过程不是实时的，因为其开销比较大，所以垃圾回收器会按照固定的时间间隔周期性的执行。

```
function fn1() {
    var obj = {name: 'hanzichi', age: 10};  //使用完后将被清除
}
function fn2() {  
    var obj = {name:'hanzichi', age: 10};  //使用完后不会被清除，因为被全局变量b所指向
   return obj;
}
var a = fn1();  
var b = fn2();
```
## 垃圾回收策略
### 标记清除(较为常用)
```
function test(){
var a = 10 ; //被标记 ，进入环境
var b = 20 ; //被标记 ，进入环境
}
test(); //执行完毕 之后 a、b又被标离开环境，被回收。
```
### 引用计数,到0清除
```
function test(){
var a = {} ; //a的引用次数为0
var b = a ; //a的引用次数加1，为1
var c =a; //a的引用次数再加1，为2
var b ={}; //a的引用次数减1，为1
}
```
>在一些绑定了定时器或者监听器的对象，要及时清除，赋值null或者clear