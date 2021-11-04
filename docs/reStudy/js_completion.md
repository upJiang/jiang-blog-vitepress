JavaScript 语句执行机制涉及的一种基础类型：Completion 类型。
## Completion 类型
>Completion Record 用于描述异常、跳出等语句执行过程
Completion Record 表示一个语句执行完之后的结果，它有三个字段：
* [[type]] 表示完成的类型，有 break continue return throw 和 normal 几种类型；
* [[value]] 表示语句的返回值，如果语句没有，则是 empty；
* [[target]] 表示语句的目标，通常是一个 JavaScript 标签

## 语句分类
![img](https://static001.geekbang.org/resource/image/98/d5/98ce53be306344c018cddd6c083392d5.jpg)

### 普通的语句
在 JavaScript 中，我们把不带控制能力的语句称为普通语句。普通语句有下面几种。
* 声明类语句
    var 声明
    const 声明
    let 声明
    函数声明
    类声明
* 表达式语句
* 空语句
* debugger 语句

这些语句在执行时，从前到后顺次执行（我们这里先忽略 var 和函数声明的预处理机制），没有任何分支或者重复执行逻辑。

普通语句执行后，会得到 [[type]] 为 normal 的 Completion Record，JavaScript 引擎遇到这样的 Completion Record，会继续执行下一条语句。

### 语句块
语句块就是拿大括号括起来的一组语句，它是一种语句的复合结构，可以嵌套。
```
//在一个 block 中，如果每一个语句都是 normal 类型，那么它会顺次执行。
{
  var i = 1; // normal, empty, empty
  i ++; // normal, 1, empty
  console.log(i) //normal, undefined, empty
} // normal, undefined, empty

{
  var i = 1; // normal, empty, empty
  return i; // return, 1, empty
  i ++; 
  console.log(i)
} // return, 1, empty
```

在 block 中插入了一条 return 语句，产生了一个非 normal 记录，那么整个 block 会成为非 normal。这个结构就保证了非 normal 的完成类型可以穿透复杂的语句嵌套结构，产生控制效果。

### 控制型语句
控制类语句分成两部分，一类是对其内部造成影响，如 if、switch、while/for、try。

另一类是对外部造成影响如 break、continue、return、throw，这两类语句的配合，会产生控制代码执行顺序和执行逻辑的效果，这也是我们编程的主要工作。
![img](https://static001.geekbang.org/resource/image/77/d3/7760027d7ee09bdc8ec140efa9caf1d3.png)

```
function foo(){
  try{
    return 0;
  } catch(err) {

  } finally {
    return 1;
  }
}

console.log(foo()); //1
```
因为 finally 中的内容必须保证执行，所以 try/catch 执行完毕，即使得到的结果是非 normal 型的完成记录，也必须要执行 finally。

而当 finally 执行也得到了非 normal 记录，则会使 finally 中的记录作为整个 try 结构的结果。

### 带标签的语句
JavaScript 语句是可以加标签的，在语句前加冒号即可：
```
outer: while(true) {
    inner: while(true) {
        break outer;
    }
}
console.log("finished")

//我这个是不行的，会报错Uncaught SyntaxError: Undefined label 'out'，得研究研究
let array1 = [1,2,3]
out:array1.forEach(item=>{
    console.log(item)
    if(item === 2){
        break out;
    }
)}
```
大部分时候，这个东西类似于注释，没有任何用处。唯一有作用的时候是：与完成记录类型中的 target 相配合，用于跳出多层循环。

break/continue 语句如果后跟了关键字，会产生带 target 的完成记录。一旦完成记录带了 target，那么只有拥有对应 label 的循环语句会消费它。