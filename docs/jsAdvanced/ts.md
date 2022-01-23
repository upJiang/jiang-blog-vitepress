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
### 元组类型(tuple)
在 TypeScript 的基础类型中，元组（ Tuple ）表示一个已知数量和类型的数组 其实可以理解为他是一种特殊的数组
```
const flag: [string, number] = ["hello", 1];
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
### Symbol
我们在使用 Symbol 的时候，必须添加 es6 的编译辅助库 需要在 tsconfig.json 的 libs 字段加上ES2015 Symbol 的值是唯一不变的
```
const sym1 = Symbol("hello");
const sym2 = Symbol("hello");
console.log(Symbol("hello") === Symbol("hello"));
```
### Any 与 Unknown
#### Any 类型
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

#### Unknown 类型
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
### void 类型
void 表示没有任何类型 **当一个函数没有返回值时** TS 会认为它的返回值是 void 类型。
```
function hello(name: string): void {}
```
### never 类型
never 一般表示用户无法达到的类型 例如never 类型是那些总是会抛出异常或根本就不会有返回值的函数表达式或箭头函数表达式的返回值类型
```
function neverReach(): never {
  throw new Error("an error");
}
```

思考：never 和 void 的区别
void 可以被赋值为 null 和 undefined 的类型。 never 则是一个不包含值的类型。
拥有 void 返回值类型的函数能正常运行。拥有 never 返回值类型的函数无法正常返回，无法终止，或会抛出异常。

### BigInt 大数类型
使用 `BigInt` 可以安全地存储和操作大整数
我们在使用 `BigIn`t 的时候 必须添加 `ESNext` 的编译辅助库 需要在 tsconfig.json 的 `libs` 字段加上`ESNext`
要使用`1n`需要 `"target"`: `"ESNext"`
`number` 和 `BigInt` 类型不一样 不兼容
```
const max1 = Number.MAX_SAFE_INTEGER; // 2**53-1
console.log(max1 + 1 === max1 + 2); //true

const max2 = BigInt(Number.MAX_SAFE_INTEGER);
console.log(max2 + 1n === max2 + 2n); //false

let foo: number;
let bar: bigint;
foo = bar; //error
bar = foo; //error
```
### object, Object 和 {} 类型
**object** 类型用于表示非原始类型
```
let objectCase: object;
objectCase = 1; // error
objectCase = "a"; // error
objectCase = true; // error
objectCase = null; // error
objectCase = undefined; // error
objectCase = {}; // ok
```
**大 Object** 代表所有拥有 toString、hasOwnProperty 方法的类型 所以所有原始类型、非原始类型都可以赋给 Object(严格模式下 null 和 undefined 不可以)
```
let ObjectCase: Object;
ObjectCase = 1; // ok
ObjectCase = "a"; // ok
ObjectCase = true; // ok
ObjectCase = null; // error
ObjectCase = undefined; // error
ObjectCase = {}; // ok
```
{} 空对象类型和大 Object 一样 也是表示原始类型和非原始类型的集合
```
let simpleCase: {};
simpleCase = 1; // ok
simpleCase = "a"; // ok
simpleCase = true; // ok
simpleCase = null; // error
simpleCase = undefined; // error
simpleCase = {}; // ok
```
## 类型推论
指编程语言中**能够自动推导出值的类型的能力** 它是一些强静态类型语言中出现的特性 定义时未赋值就会推论成 any 类型 如果定义的时候就赋值就能利用到类型推论
```
let flag; //推断为any
let count = 123; //为number类型
let hello = "hello"; //为string类型
```

## 联合类型
联合类型（Union Types）表示取值可以为多种类型中的一种 未赋值时联合类型上只能访问两个类型共有的属性和方法
```
let name: string | number;
console.log(name.toString());
name = 1;
console.log(name.toFixed(2));
name = "hello";
console.log(name.length);
```

## 类型断言as
类型断言（Type Assertion）就是手动指定一个值的类型。当你**确定这个值的类型**时才使用类型断言

类型断言有两种形式：
```
let someValue: any = "this is a string";

// 尖括号 语法
let strLength: number = (<string>someValue).length;

// as 语法
let strLength: number = (someValue as string).length;
```
以上两种方式虽然没有任何区别，但是尖括号格式会与 react 中 JSX 产生语法冲突，因此我们更推荐使用 as 语法。

**非空断言** 在上下文中当类型检查器无法断定类型时 一个新的后缀表达式操作符 ! 可以用于断言操作对象是非 null 和非 undefined 类型
```
let flag: null | undefined | string;
flag!.toString(); // ok
flag.toString(); // error
```

## 字面量类型
在 TypeScript 中，字面量不仅可以表示值，还可以表示类型，即所谓的字面量类型。
目前，TypeScript 支持 3 种字面量类型：字符串字面量类型、数字字面量类型、布尔字面量类型，对应的字符串字面量、数字字面量、布尔字面量分别拥有与其值一样的字面量类型，具体示例如下：
```
let flag1: "hello" = "hello";
let flag2: 1 = 1;
let flag3: true = true;
```
## 类型别名
类型别名用来给一个类型起个新名字
```
type flag = string | number;

function hello(value: flag) {}
```
## 交叉类型
交叉类型是将多个类型合并为一个类型。通过 & 运算符可以将现有的多种类型叠加到一起成为一种类型，它包含了所需的所有类型的特性
```
type Flag1 = { x: number };
type Flag2 = Flag1 & { y: string };

let flag3: Flag2 = {
  x: 1,
  y: "hello",
  henb,
};
```

## 类型保护
类型保护就是一些表达式，他们在编译的时候就能通过类型信息确保某个作用域内变量的类型 其主要思想是尝试检测属性、方法或原型，以确定如何处理值
### typeof 类型保护
判断当前值的类型
```
function double(input: string | number | boolean) {
  if (typeof input === "string") {
    return input + input;
  } else {
    if (typeof input === "number") {
      return input * 2;
    } else {
      return !input;
    }
  }
}
```
### in 关键字
判断当前值的类型是否在另一个类型定义中
```
interface Bird {
  fly: number;
}

interface Dog {
  leg: number;
}

function getNumber(value: Bird | Dog) {
  if ("fly" in value) {
    return value.fly;
  }
  return value.leg;
}
```
### instanceof 类型保护
判断当前值的类型是否继承于另一个类型中
```
class Animal {
  name!: string;
}
class Bird extends Animal {
  fly!: number;
}
function getName(animal: Animal) {
  if (animal instanceof Bird) {
    console.log(animal.fly);
  } else {
    console.log(animal.name);
  }
}
```
### 自定义类型保护
通过 `type is xxx` 这样的类型谓词来进行类型保护
```
function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function fn(x: string | object) {
  if (isObject(x)) {
    // ....
  } else {
    // .....
  }
}
```

## 函数(function)
### 函数的定义
可以指定参数的类型和返回值的类型
```
function hello(name: string): void {
  console.log("hello", name);
}
hello("hahaha");
```
### 函数表达式
定义函数类型
```
type SumFunc = (x: number, y: number) => number;

let countNumber: SumFunc = function (a, b) {
  return a + b;
};
```
### 可选参数
在 TS 中函数的形参和实参必须一样，不一样就要配置可选参数,而且必须是**最后一个参数**
```
function print(name: string, age?: number): void {
  console.log(name, age);
}
print("hahaha");
```
### 默认参数
```
function ajax(url: string, method: string = "GET") {
  console.log(url, method);
}
ajax("/users");
```
### 剩余参数
```
function sum(...numbers: number[]) {
  return numbers.reduce((val, item) => (val += item), 0);
}
console.log(sum(1, 2, 3));
```
### 函数重载
函数重载或方法重载是使用相同名称和不同参数数量或类型创建多个方法的一种能力。 在 TypeScript 中，表现为给同一个函数提供多个函数类型定义
```
let obj: any = {};
function attr(val: string): void;
function attr(val: number): void;
function attr(val: any): void {
  if (typeof val === "string") {
    obj.name = val;
  } else {
    obj.age = val;
  }
}
attr("hahaha");
attr(9);
attr(true);
console.log(obj);
```
>注意：函数重载真正执行的是同名函数最后定义的函数体 在最后一个函数体定义之前全都属于函数类型定义 不能写具体的函数实现方法 只能定义类型。感觉好像没啥用。。。

## 类(class)
### 类的定义
在 TypeScript 中，我们可以通过 `Class` 关键字来定义一个类
```
class Person {
  name!: string; //如果初始属性没赋值就需要加上!
  constructor(_name: string) {
    this.name = _name;
  }
  getName(): void {
    console.log(this.name);
  }
}
let p1 = new Person("hello");
p1.getName(); 
```
当我们定义一个类的时候,会得到 2 个类型 一个是构造函数类型的函数类型(当做普通构造函数的类型) 另一个是类的实例类型（代表实例）
```
class Component {
  static myName: string = "静态名称属性";
  myName: string = "实例名称属性";
}
//ts 一个类型 一个叫值
//放在=后面的是值
let com = Component; //这里是代表构造函数
//冒号后面的是类型
let c: Component = new Component(); //这里是代表实例类型
let f: typeof Component = com;
```
### 存取器
在 TypeScript 中，我们可以通过存取器来改变一个类中属性的读取和赋值行为
```
class User {
  myname: string;
  constructor(myname: string) {
    this.myname = myname;
  }
  get name() {
    return this.myname;
  }
  set name(value) {
    this.myname = value;
  }
}

let user = new User("hello");
user.name = "world";
console.log(user.name);
```
其实我们可以看看翻译成 es5 的代码 原理很简单 就是使用了 Object.defineProperty 在类的原型上面拦截了属性对应的 get 和 set 方法
```
var User = /** @class */ (function () {
  function User(myname) {
    this.myname = myname;
  }
  Object.defineProperty(User.prototype, "name", {
    get: function () {
      return this.myname;
    },
    set: function (value) {
      this.myname = value;
    },
    enumerable: false,
    configurable: true,
  });
  return User;
})();
var user = new User("hello");
user.name = "world";
console.log(user.name);
```
### readonly 只读属性
readonly 修饰的变量只能在`构造函数`中初始化 TypeScript 的类型系统同样也允许将 interface、type、 class 上的属性标识为 readonly readonly 实际上只是在编译阶段进行代码检查。
```
class Animal {
  public readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  changeName(name: string) {
    this.name = name; //这个ts是报错的
  }
}

let a = new Animal("hello");
```
### 继承
子类继承父类后子类的实例就拥有了父类中的属性和方法，可以增强代码的可复用性
 
将子类公用的方法抽象出来放在父类中，自己的特殊逻辑放在子类中重写父类的逻辑

super 可以调用父类上的方法和属性

在 TypeScript 中，我们可以通过 extends 关键字来实现继承
```
class Person {
  name: string; //定义实例的属性，默认省略public修饰符
  age: number;
  constructor(name: string, age: number) {
    //构造函数
    this.name = name;
    this.age = age;
  }
  getName(): string {
    return this.name;
  }
  setName(name: string): void {
    this.name = name;
  }
}
class Student extends Person {
  no: number;
  constructor(name: string, age: number, no: number) {
    super(name, age);
    this.no = no;
  }
  getNo(): number {
    return this.no;
  }
}
let s1 = new Student("hello", 10, 1);
console.log(s1);
```
### 类里面的修饰符
publi类: 子类 其它任何地方外边都可以访问<br>
protected类: 子类可以访问，但其它任何地方不能访问 <br>
private类：子类和其它任何地方都不可以访问<br>
```
class Parent {
  public name: string;
  protected age: number;
  private car: number;
  constructor(name: string, age: number, car: number) {
    //构造函数
    this.name = name;
    this.age = age;
    this.car = car;
  }
  getName(): string {
    return this.name;
  }
  setName(name: string): void {
    this.name = name;
  }
}
class Child extends Parent {
  constructor(name: string, age: number, car: number) {
    super(name, age, car);
  }
  desc() {
    console.log(`${this.name} ${this.age} ${this.car}`); //car访问不到 会报错
  }
}

let child = new Child("hello", 10, 1000);
console.log(child.name);
console.log(child.age); //age访问不到 会报错
console.log(child.car); //car访问不到 会报错
```
### 静态属性 静态方法**
类的静态属性和方法是直接定义在类本身上面的 所以也**只能通过直接调用类的方法和属性来访问**
```
class Parent {
  static mainName = "Parent";
  static getmainName() {
    console.log(this); //注意静态方法里面的this指向的是类本身 而不是类的实例对象 所以静态方法里面只能访问类的静态属性和方法
    return this.mainName;
  }
  public name: string;
  constructor(name: string) {
    //构造函数
    this.name = name;
  }
}
console.log(Parent.mainName);
console.log(Parent.getmainName());
```
### 抽象类和抽象方法
抽象类，无法被实例化，只能被继承并且无法创建抽象类的实例 子类可以对抽象类进行不同的实现

抽象方法只能出现在抽象类中并且抽象方法不能在抽象类中被具体实现，只能在抽象类的子类中实现（必须要实现）

使用场景： 我们一般用抽象类和抽象方法抽离出事物的共性 以后所有继承的子类必须按照规范去实现自己的具体逻辑 这样可以增加代码的可维护性和复用性

使用 abstract 关键字来定义抽象类和抽象方法
```
abstract class Animal {
  name!: string;
  abstract speak(): void;
}
class Cat extends Animal {
  speak() {
    console.log("喵喵喵");
  }
}
let animal = new Animal(); //直接报错 无法创建抽象类的实例
let cat = new Cat();
cat.speak();
```

>思考 1:重写(override)和重载(overload)的区别

`重写`是指子类重写继承自父类中的方法 `重载`是指为同一个函数提供多个类型定义
```
class Animal {
  speak(word: string): string {
    return "动物:" + word;
  }
}
class Cat extends Animal {
  speak(word: string): string {
    return "猫:" + word;
  }
}
let cat = new Cat();
console.log(cat.speak("hello"));
// 上面是重写
//--------------------------------------------
// 下面是重载
function double(val: number): number;
function double(val: string): string;
function double(val: any): any {
  if (typeof val == "number") {
    return val * 2;
  }
  return val + val;
}

let r = double(1);
console.log(r);
```
>思考 2:什么是多态

在父类中定义一个方法，在子类中有多个实现，在程序运行的时候，根据不同的对象执行不同的操作，实现运行时的绑定。
```
abstract class Animal {
  // 声明抽象的方法，让子类去实现
  abstract sleep(): void;
}
class Dog extends Animal {
  sleep() {
    console.log("dog sleep");
  }
}
let dog = new Dog();
class Cat extends Animal {
  sleep() {
    console.log("cat sleep");
  }
}
let cat = new Cat();
let animals: Animal[] = [dog, cat];
animals.forEach((i) => {
  i.sleep();
});
```
## 接口(interface)
接口既可以在面向对象编程中表示为行为的抽象，也可以用来描述对象的形状

我们用 `interface` 关键字来定义接口 在接口中可以用分号或者逗号分割每一项，也可以什么都不加
### 对象的形状
```
//接口可以用来描述`对象的形状`
interface Speakable {
  speak(): void;
  readonly lng: string; //readonly表示只读属性 后续不可以更改
  name?: string; //？表示可选属性
}

let speakman: Speakable = {
  //   speak() {}, //少属性会报错
  name: "hello",
  lng: "en",
  age: 111, //多属性也会报错
};
```
### 行为的抽象
接口可以把一些类中共有的属性和方法抽象出来,可以用来约束实现此接口的类

一个类可以实现多个接口，一个接口也可以被多个类实现

我们用 `implements` 关键字来代表 实现
```
//接口可以在面向对象编程中表示为行为的抽象
interface Speakable {
  speak(): void;
}
interface Eatable {
  eat(): void;
}
//一个类可以实现多个接口
class Person implements Speakable, Eatable {
  speak() {
    console.log("Person说话");
  }
  //   eat() {} //需要实现的接口包含eat方法 不实现会报错
}
```
### 定义任意属性
如果我们在定义接口的时候无法预先知道有哪些属性的时候,可以使用 `[propName:string]:any`,propName 名字是任意的
```
interface Person {
  id: number;
  name: string;
  [propName: string]: any;
}

let p1:Person = {
  id: 1,
  name: "hello",
  age: 10,
};
```
这个接口表示 必须要有 id 和 name 这两个字段 然后还可以新加其余的未知字段

### 接口的继承
接口继承类使用 `extends`，类继承接口使用 `implements`
```interface Speakable {
  speak(): void;
}
interface SpeakChinese extends Speakable {
  speakChinese(): void;
}
class Person implements SpeakChinese {
  speak() {
    console.log("Person");
  }
  speakChinese() {
    console.log("speakChinese");
  }
}
```

### 函数类型接口
可以用接口来定义函数类型
```
interface discount {
  (price: number): number;
}
let cost: discount = function (price: number): number {
  return price * 0.8;
};
```

### 构造函数的类型接口
使用特殊的 new()关键字来描述类的构造函数类型
```
class Animal {
  constructor(public name: string) {}
}
//不加new是修饰函数的,加new是修饰类的
interface WithNameClass {
  new (name: string): Animal;
}
function createAnimal(clazz: WithNameClass, name: string) {
  return new clazz(name);
}
let a = createAnimal(Animal, "hello");
console.log(a.name);
```
其实这样的用法一般出现在 **当我们需要把一个类作为参数的时候 我们需要对传入的类的构造函数类型进行约束** 所以需要使用 new 关键字代表是类的构造函数类型 用以和普通函数进行区分

## interface 与 type
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

## 泛型
泛型（Generics）是指在定义函数、接口或类的时候，不预先指定具体的类型，而**在使用的时候再指定类型的一种特性**

为了更好的了解泛型的作用 我们可以看下面的一个例子
```
```