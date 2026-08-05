---
title: "原型与继承"
description: "从内部原型链到 class 语法理解对象继承"
category: frontend
tags: ["JavaScript","Prototype"]
updated: 2026-08-04
order: 450
depth: reference
series: "重学前端"
---
# 原型与继承

## 原型系统

- 如果所有对象都有私有字段[[prototype]]，就是对象的原型；

- 读一个属性，如果对象本身没有，则会继续访问对象的原型，直到原型为空或者找到为止。

ES6 提供的操纵原型方法：

- Object.create 根据指定的原型创建新对象，原型可以是 null；

- Object.getPrototypeOf 获得一个对象的原型；

- Object.setPrototypeOf 设置一个对象的原型。

  ```
  var cat = {
      say(){
          console.log("meow~");
      },
      jump(){
          console.log("jump");
      }
  }

  var tiger = Object.create(cat,  {
      say:{
          writable:true,
          configurable:true,
          enumerable:true,
          value:function(){
              console.log("roar!");
          }
      }
  })

  var anotherCat = Object.create(cat);
  anotherCat.say(); //moew~

  var anotherTiger = Object.create(tiger);
  anotherTiger.say(); //roar!
  ```

## new

new 运算接受一个构造器和一组调用参数，

实际上做了几件事：

- 以构造器的 prototype 属性（注意与私有字段[[prototype]]的区分）为原型，创建新对象；

- 将 this 和调用参数传给构造器，执行；

- 如果构造器返回的是对象，则返回，否则返回第一步创建的对象

new 这样的行为，试图让函数对象在语法上跟类变得相似，但是，它客观上提供了两种方式，

### 添加属性

##### 一是在构造器中添加属性，二是在构造器的 prototype 属性上添加属性。

```text
//直接在构造器中修改 this，给 this 添加属性
function c1(){
    this.p1 = 1;
    this.p2 = function(){
        console.log(this.p1);
    }
}
var o1 = new c1;
o1.p2();

//修改构造器的 prototype 属性指向的对象，它是从这个构造器构造出来的所有对象的原型。
function c2(){
}
c2.prototype.p1 = 1;
c2.prototype.p2 = function(){
    console.log(this.p1);
}
var o2 = new c2;
o2.p2();
```

## ES6 中的类

> 推荐使用 ES6 的语法来定义类，而令 function 回归原本的函数语义。ES6 中引入了 class 关键字，并且在标准中删除了所有[[class]]相关的私有属性描述，类的概念正式从属性升级成语言的基础设施，从此，基于类的编程方式成为了 JavaScript 的官方编程范式。

```text
class Rectangle {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
  // Getter
  get area() {
    return this.calcArea();
  }
  // Method
  calcArea() {
    return this.height * this.width;
  }
}
```

### 继承

```text
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    console.log(this.name + ' makes a noise.');
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name); //调用父类的构造函数
  }
	//覆盖父类的方法
  speak() {
    console.log(this.name + ' barks.');
  }
}

let d = new Dog('Mitzie');
d.speak(); // Mitzie barks.
```

## 总结

在新的 ES 版本中，我们不再需要模拟类了：我们有了光明正大的新语法。而原型体系同时作为一种编程范式和运行时机制存在。

我们可以自由选择原型或者类作为代码的抽象风格，但是无论我们选择哪种，理解运行时的原型系统都是很有必要的一件事。

## 现代规范校订

规范内部术语用于解释语言行为，不等同于浏览器或引擎必须采用的具体数据结构。工程代码同时需要 TypeScript 静态约束和运行时输入校验。

## 规范要点与现代边界

原型链解决属性查找和共享行为，不等于类实例的私有状态。class 只是语法层抽象，继承层级过深会增加初始化和替换成本。优先用组合表达能力边界；需要继承时明确 super、私有字段、静态成员和跨 realm 行为。

把结论放回可复现条件：浏览器版本、文档模式、输入数据、网络和设备都会影响结果。遇到与旧教材不同的行为，先查现行规范和实现说明，再用最小样例验证；如果规范只定义可观察结果，就不要把某个引擎的内部结构写成跨浏览器保证。

## 运行验证

| 验证项 | 方法 | 通过条件 |
| --- | --- | --- |
| 语义 | 对照现行规范和 MDN 兼容性说明 | 结论有适用范围 |
| 行为 | 最小页面、Node 脚本或 DevTools 复现 | 结果与预期一致 |
| 工程 | 运行类型检查、测试和性能采样 | 没有新增回归 |

```text
现象 -> 假设 -> 最小复现 -> 观测证据 -> 修复 -> 回归测试
```

## 参考资料

- https://tc39.es/ecma262/
- https://developer.mozilla.org/en-US/docs/Web/JavaScript

## 属性查找与工程取舍

读取 `obj.key` 时，运行时先检查对象自身属性，再沿 `[[Prototype]]` 链查找；写入则可能创建自身属性或调用 setter。`Object.create(null)` 没有普通对象原型，适合做纯字典但没有 `hasOwnProperty` 等方法。`class` 方法通常放在原型上，实例字段在实例自身，私有字段使用独立的品牌检查，不会通过普通反射读取。

```js
const dictionary = Object.create(null)
dictionary.__proto__ = 'data'
console.log(Object.hasOwn(dictionary, '__proto__')) // true

class Counter {
  #value = 0
  inc() { this.#value += 1; return this.#value }
}
```

不要把用户输入直接作为原型对象或属性路径处理；合并配置时使用白名单和安全的自身属性检查。跨 iframe 或 worker 的对象可能属于另一个 realm，`instanceof` 结果不一定符合直觉，公共 API 更适合使用结构化检查或品牌字段。
