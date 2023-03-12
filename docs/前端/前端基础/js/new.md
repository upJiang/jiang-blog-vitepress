## js中new做了什么
* 创建一个新对象
* 将构造函数的作用域赋给新对象（因此 this 就指向了这个新对象） 
* 执行构造函数中的代码（为这个新对象添加属性） 
* 返回新对象

>首先明白 obj._proto_ === Base.prototype
```
function Person () {
    this.name = name;
    this.age = age;
    this.sex = sex
    this.sayName = function () {
        return this.name;
    };
}
var person = new Person("tom", 21, "famle");

1.创建一个新对象
2.将新对象的_proto_指向构造函数的prototype对象
3.将构造函数的作用域赋值给新对象 （也就是this指向新对象）
4.执行构造函数中的代码（为这个新对象添加属性）
5.返回新的对象
var Obj = {};
Obj._proto_ =  Person.prototype();
Person.call(Obj);
```