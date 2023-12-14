## 原型系统

- 如果所有对象都有私有字段[[prototype]]，就是对象的原型；
- 读一个属性，如果对象本身没有，则会继续访问对象的原型，直到原型为空或者找到为止
  。

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

- 以构造器的 prototype 属性（注意与私有字段[[prototype]]的区分）为原型，创建新对
  象；
- 将 this 和调用参数传给构造器，执行；
- 如果构造器返回的是对象，则返回，否则返回第一步创建的对象

new 这样的行为，试图让函数对象在语法上跟类变得相似，但是，它客观上提供了两种方式
，

### 添加属性

##### 一是在构造器中添加属性，二是在构造器的 prototype 属性上添加属性。

```
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

> 推荐使用 ES6 的语法来定义类，而令 function 回归原本的函数语义。ES6 中引入了
> class 关键字，并且在标准中删除了所有[[class]]相关的私有属性描述，类的概念正式
> 从属性升级成语言的基础设施，从此，基于类的编程方式成为了 JavaScript 的官方编程
> 范式。

```
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

```
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

在新的 ES 版本中，我们不再需要模拟类了：我们有了光明正大的新语法。而原型体系同时
作为一种编程范式和运行时机制存在。

我们可以自由选择原型或者类作为代码的抽象风格，但是无论我们选择哪种，理解运行时的
原型系统都是很有必要的一件事。
