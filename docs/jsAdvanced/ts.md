[重学TypeScript系列教程](https://mp.weixin.qq.com/s/y6C4R04mpvBmyV80p5WOug)

## TypeScript 基础类型
### Boolean 类型
```
let isDone: boolean = false;
// ES5：var isDone = false;
```
### Number 类型
```
let count: number = 10;
// ES5：var count = 10;
```
### String 类型
```
let name: string = "Semliker";
// ES5：var name = 'Semlinker';
```
### Array 类型
```
let list: number[] = [1, 2, 3];
// ES5：var list = [1,2,3];

let list: Array<number> = [1, 2, 3]; // Array<number>泛型语法
// ES5：var list = [1,2,3];
```
###  Enum 类型
使用枚举我们可以定义一些带名字的常量。 使用枚举可以清晰地表达意图或创建一组有区别的用例。 TypeScript 支持数字的和基于字符串的枚举。

#### 1.数字枚举
```
enum Direction {
  NORTH,
  SOUTH,
  EAST,
  WEST,
}

let dir: Direction = Direction.NORTH;
```
默认情况下，NORTH 的初始值为 0，其余的成员会从 1 开始自动增长。换句话说，Direction.SOUTH 的值为 1，Direction.EAST 的值为 2，Direction.WEST 的值为 3。

上面的枚举示例代码经过编译后会生成以下代码：
```
"use strict";
var Direction;
(function (Direction) {
  Direction[(Direction["NORTH"] = 0)] = "NORTH";
  Direction[(Direction["SOUTH"] = 1)] = "SOUTH";
  Direction[(Direction["EAST"] = 2)] = "EAST";
  Direction[(Direction["WEST"] = 3)] = "WEST";
})(Direction || (Direction = {}));
var dir = Direction.NORTH;
```

当然我们也可以设置 NORTH 的初始值，比如：
```
enum Direction {
  NORTH = 3,
  SOUTH,
  EAST,
  WEST,
}
```

#### 字符串枚举
在 TypeScript 2.4 版本，允许我们使用字符串枚举。在一个字符串枚举里，**每个成员都必须用字符串字面量，或另外一个字符串枚举成员进行初始化**。
```
enum Direction {
  NORTH = "NORTH",
  SOUTH = "SOUTH",
  EAST = "EAST",
  WEST = "WEST",
}
```
#### 异构枚举
异构枚举的成员值是数字和字符串的混合：
```
enum Enum {
  A,
  B,
  C = "C",
  D = "D",
  E = 8,
  F,
}
```
### Any 类型
在 TypeScript 中，任何类型都可以被归为 any 类型。这让 any 类型成为了类型系统的顶级类型（也被称作全局超级类型）。
```
let notSure: any = 666;
notSure = "Semlinker";
notSure = false;
```
`any` 类型本质上是类型系统的一个逃逸舱。作为开发者，这给了我们很大的自由：TypeScript 允许我们对 any 类型的值执行任何操作，而无需事先执行任何形式的检查。比如：
```
let value: any;

value.foo.bar; // OK
value.trim(); // OK
value(); // OK
new value(); // OK
value[0][1]; // OK
```

在许多场景下，这太宽松了。使用 any 类型，可以很容易地编写类型正确但在运行时有问题的代码。如果我们使用 any 类型，就无法使用 TypeScript 提供的大量的保护机制。**为了解决 any 带来的问题，TypeScript 3.0 引入了 `unknown` 类型**。

### Unknown 类型
就像所有类型都可以赋值给 any，所有类型也都可以赋值给 unknown。这使得 unknown 成为 TypeScript 类型系统的另一种顶级类型（另一种是 any）。下面我们来看一下 unknown 类型的使用示例：
```
let value: unknown;

value = true; // OK
value = 42; // OK
value = "Hello World"; // OK
value = []; // OK
value = {}; // OK
value = Math.random; // OK
value = null; // OK
value = undefined; // OK
value = new TypeError(); // OK
value = Symbol("type"); // OK
```
对 value 变量的所有赋值都被认为是类型正确的。但是，当我们尝试将类型为 unknown 的值赋值给其他类型的变量时会发生什么？
```
let value: unknown;

let value1: unknown = value; // OK
let value2: any = value; // OK
let value3: boolean = value; // Error
let value4: number = value; // Error
let value5: string = value; // Error
let value6: object = value; // Error
let value7: any[] = value; // Error
let value8: Function = value; // Error
```
unknown 类型只能被赋值给 any 类型和 unknown 类型本身。直观地说，这是有道理的：只有能够保存任意类型值的容器才能保存 unknown 类型的值。毕竟我们不知道变量 value 中存储了什么类型的值。

现在让我们看看当我们尝试对类型为 unknown 的值**执行操作**时会发生什么。以下是我们在之前 any 章节看过的相同操作：
```
let value: unknown;

value.foo.bar; // Error
value.trim(); // Error
value(); // Error
new value(); // Error
value[0][1]; // Error
```
将 value 变量类型设置为 unknown 后，这些操作都不再被认为是类型正确的。通过将 any 类型改变为 unknown 类型，我们已将允许所有更改的默认设置，更改为禁止任何更改。

unknown 比 any 安全是因为 unknown 只允许被赋值，而无法被操作，也无法赋值给其它（除了 any 跟 unknown）

### 总结any与unknown
#### 共同点
any 和 unknown 都可以接收任何。即可以被赋上任何值

#### 不同点
any 绕过类型检查，因此可以**访问任意方法和属性**，并且可**自由转换为其他任意类型**。即无任何限制
```
var a:any = "123"
a.toFixed(2) // ok

// ok，把一个 string 赋值给 number 也是可以的
var b:number = a;
```
unknown 标识一个元素的类型未知，**不可以调用任何属性或方法，也不可以转换为其他任意类型**。即不能操作，不能转换类型，也不能把指赋给变量(但可以用过as转换类型类型后操作)
```
var b:unknown = "123";
b.length; // 错误

var b:unknown = "123";
b.length; // 错误

// 但是可以通过 as 转换一下
let c:string = b as string;
```


## interface跟type的区别
### 相同点
#### 都可以描述一个对象或者函数

interface
```
interface User {
  name: string
  age: number
}

interface SetUser {
  (name: string, age: number): void;
}
```
type
```
type User = {
  name: string
  age: number
};

type SetUser = (name: string, age: number)=> void;
```

#### 都允许拓展（extends）
interface(extends) 和 type(&) 都可以拓展，并且两者并不是相互独立的，也就是说 interface 可以 extends type, type 也可以 extends interface 。 **虽然效果差不多，但是两者语法不同**。

interface extends interface
```
interface Name { 
  name: string; 
}
interface User extends Name { 
  age: number; 
}
```
type extends type
```
type Name = { 
  name: string; 
}
type User = Name & { age: number  };
```
interface extends type
```
type Name = { 
  name: string; 
}
interface User extends Name { 
  age: number; 
}
```
type extends interface
```
interface Name { 
  name: string; 
}
type User = Name & { 
  age: number; 
}
```

### 不同点
#### type 可以而 interface 不行
- type 可以声明基本类型别名，联合类型，元组等类型
```
// 基本类型别名
type Name = string

// 联合类型
interface Dog {
    wong();
}
interface Cat {
    miao();
}

type Pet = Dog | Cat

// 具体定义数组每个位置的类型
type PetList = [Dog, Pet]
```
- type 语句中还可以使用 typeof 获取实例的 类型进行赋值
```
// 当你想获取一个变量的类型时，使用 typeof
let div = document.createElement('div');
type B = typeof div
```
- 其他骚操作
```
type StringOrNumber = string | number;  
type Text = string | { text: string };  
type NameLookup = Dictionary<string, Person>;  
type Callback<T> = (data: T) => void;  
type Pair<T> = [T, T];  
type Coordinates = Pair<number>;  
type Tree<T> = T | { left: Tree<T>, right: Tree<T> };
```

#### interface 可以而 type 不行
interface 能够声明合并
```
interface User {
  name: string
  age: number
}

interface User {
  sex: string
}

/*
User 接口为 {
  name: string
  age: number
  sex: string 
}
*/
```

**总结:一般来说，如果不清楚什么时候用interface/type，能用 interface 实现，就用 interface , 如果不能就用 type 。**

## 类型断言as
## 类型索引 [propName: string]:number

