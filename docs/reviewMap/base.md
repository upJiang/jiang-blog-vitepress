## 变量类型
ECMAScript 中定义了 6 种原始类型：
- Boolean
- String
- Number
- Null
- Undefined
- Symbol（ES6 新定义）

### JS 的数据类型分类和判断
#### typeof：undefined boolean number string object function、symbol
- `typeof null`结果是 `object` ，实际这是typeof的一个bug，null是原始值，非引用类型
- `typeof [1, 2]`结果是 `object`，结果中没有array这一项，**引用类型除了function其他的全部都是object**
- `typeof Symbol()` 用typeof获取symbol类型的值得到的是`symbol`，这是 ES6 新增的知识点
#### instanceof
用于实例和构造函数的对应。例如判断一个变量是否是数组，使用typeof无法判断，但可以使用`[1, 2] instanceof Array`来判断。因为，[1, 2]是数组，它的构造函数就是Array。同理：

### 值类型 vs 引用类型
>引用类型引用类型统称为object 类型，细分的话有：`Object 类型、Array 类型、Date 类型、RegExp 类型、Function 类型等
- 值类型
```

var a = 10
var b = a
b = 20
console.log(a)  // 10
console.log(b)  // 20
```
- 引用类型
```
// 引用类型
var a = {x: 10, y: 20}
var b = a
b.x = 100
b.y = 200
console.log(a)  // {x: 100, y: 200}
console.log(b)  // {x: 100, y: 200}
```
总结：**值类型：复制的是内容，不会影响原数据；引用类型复制的是引用，指向了同一个内存地址，会影响原数据**

## 原型与原型链彻底搞懂
### es5 类与继承
```
// 父类
class Person {
    construtor(name, age){
        this.name = name
        this.age = age
    }
    sayHello(){
        console.log("父类")
    }
}

// 子类，会继承父类的变量与方法；construtor 中必须传入父类有的变量，并执行 super
class Student extends Person {
     construtor(name, age, sex){
        super()
        this.sex = sex
    }
    learn(){
         console.log("子类")
    }
}

const zhangsan = new Student('张三',16,'男')
zhangsan.sayHello() // 父类
zhangsan.learn() // 子类
```
继承
-  子类，会继承父类的变量与方法；
- `construtor` 中必须传入父类有的变量，并执行 `super()`

### instanceof
判断两个对象是否在同一条原型链上
```
zhangsan instanceof Student // true
zhangsan instanceof Person // true
zhangsan instanceof Object // true
zhangsan instanceof Array // false
```
### 原型
把上面的类例子改成原始的写法，可以参考上一个学习篇章大师课中实战栏目的内容
```
function Student(name,age){
    this.name = name
    this.age = age
}
Student.prototype.learn = function(){
    console.log("子类")
}

const zhangsan = new Student('张三',18)
console.log(zhangsan)
```
- 打印 `zhangsan 对象`：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/68f2d7e32d35430dbc603dd89422fac8~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/68f2d7e32d35430dbc603dd89422fac8~tplv-k3u1fbpfcp-watermark.image?)</a>

- 打印 `zhangsan.__proto__`

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/742a22b08e15437a9f45ac4e034dc8b1~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/742a22b08e15437a9f45ac4e034dc8b1~tplv-k3u1fbpfcp-watermark.image?)</a>

- 打印 `Student.prototype`

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/840bc1b222984b9bbe5f022f6d621319~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/840bc1b222984b9bbe5f022f6d621319~tplv-k3u1fbpfcp-watermark.image?)</a>

`zhangsan.__proto__` 与 `Student.prototype` 的打印是一样的，为什么呢？
- 我们在一个类或者 function下定义方法就是使用 `Student.prototype.learn` 的形式
- 创建实例，即 new 的时候到底做了什么
    - 首先创建一个新的空对象
    - **然后将空对象的 `__proto__` 指向构造函数的原型**即：`obj.__proto__ = Student.prototype`
    - 将 this 指向这个空对象并执行构造函数，apply
    - 构造函数有返回值则返回返回值，否则返回这个空对象
    ```
    // 代码实现
    function myNew(Con, ...args) {
        // 创建一个新的空对象
        let obj = {};

        // 将这个空对象的__proto__指向构造函数的原型，即 obj.__proto__ = Con.prototype;
        Object.setPrototypeOf(obj, Con.prototype);

        // 将this指向空对象
        let res = Con.apply(obj, args);

        // 对构造函数返回值做判断，然后返回对应的值
        return res instanceof Object ? res : obj;
    }
    ```
- 为什么 `obj.__proto__ = Student.prototype`，因为 new 做了这件事情，并且我们在类/function 中定义中就是这样去声明一个方法的

#### 仔细看前面的打印
Function 是所有函数的构造函数，图解：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27fd01a341f6419a85d4af05fad84b12~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/27fd01a341f6419a85d4af05fad84b12~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/64c04aa9014040a581994941394c236d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/64c04aa9014040a581994941394c236d~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f5bd8e2ac4e74c26b479fcd381b8a80c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f5bd8e2ac4e74c26b479fcd381b8a80c~tplv-k3u1fbpfcp-watermark.image?)</a>



