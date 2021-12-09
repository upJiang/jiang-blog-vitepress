JavaScript 语句执行机制涉及的一种基础类型：Completion 类型。
## Completion 类型
>Completion Record 用于描述异常、跳出等语句执行过程
Completion Record 表示一个语句执行完之后的结果，它有三个字段：
* [[type]] 表示完成的类型，有 break continue return throw 和 normal 几种类型；
* [[value]] 表示语句的返回值，如果语句没有，则是 empty；
* [[target]] 表示语句的目标，通常是一个 JavaScript 标签

## 语句分类
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a54f67efdd14d7fb0b99ab091c8a344~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a54f67efdd14d7fb0b99ab091c8a344~tplv-k3u1fbpfcp-watermark.image?)</a>

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
<a data-fancybox title="img" href="https://static001.geekbang.org/resource/image/77/d3/7760027d7ee09bdc8ec140efa9caf1d3.png">![img](https://static001.geekbang.org/resource/image/77/d3/7760027d7ee09bdc8ec140efa9caf1d3.png)</a>

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

### with 语句（糟粕，了解即可）
>with 语句是个非常巧妙的设计，但它把 JavaScript 的变量引用关系变得不可分析，所以一般都认为这种语句都属于糟粕。
```
let o = {a:1, b:2}
with(o){
    console.log(a, b);
}
```
with 语句把对象的属性在它内部的作用域内变成变量。

## 表达式语句
### PrimaryExpression 主要表达式
>表达式的原子项：Primary Expression，它是表达式的最小单位，它所涉及的语法结构也是优先级最高的。
Primary Expression 包含了各种“直接量”，直接量就是直接用某种语法写出来的具有特定类型的值。<br>
基本类型的直接量<br>
```
"abc";
123;
null;
true;
false;
```
除这些之外，JavaScript 还能够直接量的形式定义对象，针对函数、类、数组、正则表达式等特殊对象类型，JavaScript 提供了语法层面的支持。
```
({});
(function(){});
(class{ });
[];
/abc/g;
```
需要注意，在语法层面，function、{ 和 class 开头的表达式语句与声明语句有语法冲突，所以，我们要想使用这样的表达式，必须加上括号来回避语法冲突。

Primary Expression 还可以是 this 或者变量，在语法上，把变量称作“标识符引用”。
```
this;
myVar;
```
**任何表达式加上圆括号，都被认为是 Primary Expression，这个机制使得圆括号成为改变运算优先顺序的手段**
```
(a + b);
```
### MemberExpression 成员表达式
Member Expression 通常是用于访问对象成员的。它有几种形式：
```
a.b;
a["b"];
new.target;
super.b;
```
前面两种用法都很好理解，就是用标识符的属性访问和用字符串的属性访问。而 new.target 是个新加入的语法，用于判断函数是否是被 new 调用，super 则是构造函数中，用于访问父类的属性的语法。

从名字就可以看出，Member Expression 最初设计是为了属性访问的，不过从语法结构需要，以下两种在 JavaScript 标准中当做 Member Expression：
```
f`a${b}c`;
```
这是一个是带函数的模板，这个带函数名的模板表示把模板的各个部分算好后传递给一个函数。
```
另一个是带参数列表的 new 运算，注意，不带参数列表的 new 运算优先级更低，不属于 Member Expression。
```
NewExpression NEW 表达式
>Member Expression 加上 new 就是 New Expression（当然，不加 new 也可以构成 New Expression，JavaScript 中默认独立的高优先级表达式都可以构成低优先级表达式）。
```
new new Cls(1);
```

### CallExpression 函数调用表达式
>除了 New Expression，Member Expression 还能构成 Call Expression。它的基本形式是 Member Expression 后加一个括号里的参数列表，或者我们可以用上 super 关键字代替 Member Expression。
```
a.b(c);
super();
```
这看起来很简单，但是它有一些变体。比如：
```
a.b(c)(d)(e);
a.b(c)[3];
a.b(c).d;
a.b(c)`xyz`;
```
这些变体的形态，跟 Member Expression 几乎是一一对应的。实际上，我们可以理解为，Member Expression 中的某一子结构具有函数调用，那么整个表达式就成为了一个 Call Expression。

而 Call Expression 就失去了比 New Expression 优先级高的特性，这是一个主要的区分。

### LeftHandSideExpression 左值表达式
>接下来，我们需要理解一个概念：New Expression 和 Call Expression 统称 LeftHandSideExpression，左值表达式。

我们直观地讲，左值表达式就是可以放到等号左边的表达式。JavaScript 语法则是下面这样。
```
a() = b;
```
这样的用法其实是符合语法的，只是，原生的 JavaScript 函数，返回的值都不能被赋值。因此多数时候，我们看到的赋值将会是 Call Expression 的其它形式，如：
```
a().c = b;
```
另外，根据 JavaScript 运行时的设计，不排除某些宿主会提供返回引用类型的函数，这时候，赋值就是有效的了。

### AssignmentExpression 赋值表达式
AssignmentExpression 赋值表达式也有多种形态，最基本的当然是使用等号赋值：a = b
```
a = b
```
这里需要理解的一个稍微复杂的概念是，这个等号是可以嵌套的：
```
a = (b = (c = d))
```
这样的连续赋值，是右结合的，它等价于下面这种：
```
a = (b = (c = d))
```
也就是说，先把 d 的结果赋值给 c，再把整个表达式的结果赋值给 b，再赋值给 a。

赋值表达式的使用，还可以结合一些运算符，例如：
```
a += b;
相当于
a = a + b;
```
能有这样用的运算符有下面这几种：<br>
*=、/=、%=、+=、-=、<<=、>>=、>>>=、&=、^=、|=、**=

### Expression 表达式
赋值表达式可以构成 Expression 表达式的一部分。在 JavaScript 中，表达式就是用逗号运算符连接的赋值表达式。

在 JavaScript 中，比赋值运算优先级更低的就是逗号运算符了。我们可以把逗号可以理解为一种小型的分号。
```
a = b, b = 1, null;
```
逗号分隔的表达式会顺次执行，就像不同的表达式语句一样。“整个表达式的结果”就是“最后一个逗号后的表达式结果”。比如我们文中的例子，整个“a = b, b = 1, null;”表达式的结果就是“，”后面的null。

### 更新表达式 UpdateExpression
>左值表达式搭配 ++ -- 运算符，可以形成更新表达式。
```
-- a;
++ a;
a --
a ++
```
更新表达式会改变一个左值表达式的值。分为前后自增，前后自减一共四种。

我们要注意一下，这里在 ES2018 中，跟早期版本有所不同，前后自增自减运算被放到了同一优先级。

### 一元运算表达式 UnaryExpression
更新表达式搭配一元运算符，可以形成一元运算表达式，我们看下例子：
```
delete a.b;
void a;
typeof a;
- a;
~ a;
! a;
await a;
```
它的特点就是一个更新表达式搭配了一个一元运算符。

### 乘方表达式 ExponentiationExpression
乘方表达式也是由更新表达式构成的。它使用**号。
```
++i ** 30
2 ** 30 //正确
-2 ** 30 //报错
```
-2 这样的一元运算表达式，是不可以放入乘方表达式的，如果需要表达类似的逻辑，必须加括号。

这里我们需要注意一下结合性，** 运算是右结合的，这跟其它正常的运算符（也就是左结合运算符）都不一样。
```
4 ** 3 ** 2
等同于
4 ** (3 ** 2)
```
### 乘法表达式 MultiplicativeExpression
>到这里，我们进入了比较熟悉的表达式类型，乘方表达式可以构成乘法表达式，用乘号或者除号、取余符号连接就可以了，我们看看例子：
```
x * 2;
```
乘法表达式有三种运算符：
```
*
/
%
```
它们分别表示乘、除和取余。它们的优先级是一样的，所以统一放在乘法运算表达式中。

### 加法表达式 AdditiveExpression
>加法表达式是由乘法表达式用加号或者减号连接构成的。我们看下例子:
```
a + b * c
```
加法表达式有加号和减号两种运算符。
```
+ 
-
```
这就是我们小学学的加法和减法的意思了。不过要注意，加号还能表示字符串连接，这也比较符合一般的直觉。

### 移位表达式 ShiftExpression
>移位表达式由加法表达式构成，移位是一种位运算，分成三种：
```
<< 向左移位
>> 向右移位
>>> 无符号向右移位
```
移位运算把操作数看做二进制表示的整数，然后移动特定位数。所以左移 n 位相当于乘以 2 的 n 次方，右移 n 位相当于除以 2 取整 n 次。

普通移位会保持正负数。无符号移位会把减号视为符号位 1，同时参与移位：
```
-1 >>> 1
```
这个会得到 2147483647，也就是 2 的 31 次方，跟负数的二进制表示法相关，这里就不详细讲解了。

在 JavaScript 中，二进制操作整数并不能提高性能，移位运算这里也仅仅作为一种数学运算存在，这些运算存在的意义也仅仅是照顾 C 系语言用户的习惯了。

### 关系表达式 RelationalExpression
>移位表达式可以构成关系表达式，这里的关系表达式就是大于、小于、大于等于、小于等于等运算符号连接，统称为关系运算。
```
<=
>=
<
>
instanceof 
in
```
需要注意，这里的 <= 和 >= 关系运算，完全是针对数字的，所以 <= 并不等价于 < 或 ==。例如：
```
null <= undefined
//false
null == undefined
//true
```
请你务必不要用数学上的定义去理解这些运算符。
### 相等表达式 EqualityExpression
>在语法上，相等表达式是由关系表达式用相等比较运算符（如 ==）连接构成的。所以我们可以像下面这段代码一样使用，而不需要加括号。
```
a instanceof "object" == true
```
相等表达式由四种运算符和关系表达式构成，我们来看一下运算符：
- ==
- !=
- ===
- !==

类型不同的变量比较时==运算只有三条规则：
- undefined 与 null 相等；
- 字符串和 bool 都转为数字再比较；
- 对象转换成 primitive 类型再比较。

这样我们就可以理解一些不太符合直觉的例子了，比如：
```
false == '0' true
true == 'true' false
[] == 0 true
[] == false true
new Boolean('false') == false false
```
这里不太符合直觉的有两点：
- 一个是即使字符串与 boolean 比较，也都要转换成数字；
- 另一个是对象如果转换成了 primitive 类型跟等号另一边类型恰好相同，则不需要转换成数字。

此外，== 的行为也经常跟 if 的行为（转换为 boolean）混淆。总之，我建议，仅在确认 == 发生在 Number 和 String 类型之间时使用，比如：
```
document.getElementsByTagName('input')[0].value == 100
```
在这个例子中，等号左边必然是 string，右边的直接量必然是 number，这样使用 == 就没有问题了。

### 位运算表达式
位运算表达式含有三种：
- 按位与表达式 BitwiseANDExpression
- 按位异或表达式 BitwiseANDExpression
- 按位或表达式 BitwiseORExpression。

按位与表达式由按位与运算符（&）连接按位异或表达式构成，按位与表达式把操作数视为二进制整数，然后把两个操作数按位做与运算。

按位异或表达式由按位异或运算符（^）连接按位与表达式构成，按位异或表达式把操作数视为二进制整数，然后把两个操作数按位做异或运算。异或两位相同时得 0，两位不同时得 1。

异或运算有个特征，那就是两次异或运算相当于取消。所以有一个异或运算的小技巧，就是用异或运算来交换两个整数的值。
```
let a = 102, b = 324;

a = a ^ b;
b = a ^ b;
a = a ^ b;

console.log(a, b);
```
按位或表达式由按位或运算符（|）连接相等表达式构成，按位或表达式把操作数视为二进制整数，然后把两个操作数按位做或运算。

按位或运算常常被用在一种叫做 Bitmask 的技术上。Bitmask 相当于使用一个整数来当做多个布尔型变量，现在已经不太提倡了。不过一些比较老的 API 还是会这样设计，比如我们在 DOM 课程中，提到过的 Iterator API，我们看下例子：
```
var iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT, null, false);
var node;
while(node = iterator.nextNode())
{
    console.log(node);
}
```
这里的第二个参数就是使用了 Bitmask 技术，所以必须配合位运算表达式才能方便地传参。

### 逻辑与表达式和逻辑或表达式
>逻辑与表达式由按位或表达式经过逻辑与运算符连接构成，逻辑或表达式则由逻辑与表达式经逻辑或运算符连接构成
这里需要注意的是，这两种表达式都不会做类型转换，所以尽管是逻辑运算，但是最终的结果可能是其它类型。
```
false || 1;  //1
false && undefined; //undefined
```
另外还有一点，就是逻辑表达式具有短路的特性，例如：
```
true || foo();
```
这里的 foo 将不会被执行，这种中断后面表达式执行的特性就叫做短路。

### 条件表达式 ConditionalExpression
>条件表达式由逻辑或表达式和条件运算符构成，条件运算符又称三目运算符，它有三个部分，由两个运算符?和:配合使用。
```
condition ? branch1 : branch2
```
这里需要注意，条件表达式也像逻辑表达式一样，可能忽略后面表达式的计算。这一点跟 C 语言的条件表达式是不一样的。

条件表达式实际上就是 JavaScript 中的右值表达式了 RightHandSideExpression，是可以放到赋值运算后面的表达式。
