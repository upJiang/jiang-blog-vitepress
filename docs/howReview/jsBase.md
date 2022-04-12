## 原始类型
>原始类型存储的都是值，是没有函数可以调用的。'1'.toString() 可以使用是因为在这种情况下，'1' 已经不是原始类型了，而是被强制转换成了 String 类型也就是对象类型，所以可以调用 toString 函数。

- boolean
- null
- undefined
- number
- string
- symbol

## 对象（Object）类型
在 JS 中，除了原始类型那么其他的都是对象类型了

对象类型和原始类型不同的是，`原始类型存储的是值`，`对象类型存储的是地址（指针）`。

- 修改对象数据的时候，修改的是同一个地址上的内容，`双方都会变化
    ```
        const a = []
        const b = a
        b.push(1)
        console.log(a,b)  // 相同值
    ```
- 假如 a 跟 b 在同一个地址，当给 b `重新给对象分配一个对象时，会出现分歧`，这时 a 跟 b 会指向不同的地址
    ```
        let a = { name:'jiang',address:'shenzhen' }
        let b = a
        b.name = 'liu'
        b = { ooxx:'hhh' }
        console.log(a,j)  // { name:'liu',address:'shenzhen'} { ooxx:'hhh' }
    ```

## typeof vs instanceof
#### typeof 是否能正确判断类型？
`typeof` 对于原始类型来说，除了 `null` 都可以显示正确的类型
```
typeof 1 // 'number'
typeof '1' // 'string'
typeof undefined // 'undefined'
typeof true // 'boolean'
typeof Symbol() // 'symbol'
```
`typeof` 对于对象来说，除了函数都会显示 `object`，所以说 `typeof` 并不能准确判断变量到底是什么类型
```
typeof [] // 'object'
typeof {} // 'object'
typeof console.log // 'function'
```
如果我们想判断一个对象的正确类型，这时候可以考虑使用 instanceof，但不能判断原始类型
```
const Person = function() {}
const p1 = new Person()
p1 instanceof Person // true

var str1 = new String('hello world')
str1 instanceof String // true


var str = 'hello world'
str instanceof String // false,
```

## 类型转换
在 JS 中类型转换只有三种情况
- 转换为布尔值
- 转换为数字
- 转换为字符串

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/15/16716dec14421e47~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/15/16716dec14421e47~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

## 四则运算符 + *
加法运算符不同于其他几个运算符，它有以下几个特点：
- 运算中其中一方为字符串，那么就会把另一方也转换为字符串
- 如果一方不是字符串或者数字，那么会将它转换为数字或者字符串
```
1 + '1' // '11'
true + true // 2
4 + [1,2,3] // "41,2,3"
```
解析：
- 对于第一行代码来说，触发特点一，所以将数字 1 转换为字符串，得到结果 '11'
- 对于第二行代码来说，触发特点二，所以将 true 转为数字 1
- 对于第三行代码来说，触发特点二，所以将数组通过 toString 转为字符串 1,2,3，得到结果 41,2,3

另外对于加法还需要注意这个表达式 'a' + + 'b'
```
'a' + + 'b' // -> "aNaN"
```
因为 `+ 'b'` 等于 `NaN`，所以结果为 `"aNaN"`，你可能也会在一些代码中看到过 `+ '1'` 的形式来快速获取 `number` 类型。

那么对于除了加法的运算符来说，只要其中一方是数字，那么另一方就会被转为数字
```
4 * '3' // 12
4 * [] // 0
4 * [1, 2] // NaN
```

## this
```
function foo() {
  console.log(this.a)  // 1. 对于直接调用 foo 来说，不管 foo 函数被放在了什么地方，this 一定是 window
}
var a = 1
foo()

const obj = {
  a: 2,
  foo: foo
}
obj.foo()  // 2. 对于 obj.foo() 来说，我们只需要记住，谁调用了函数，谁就是 this，所以在这个场景下 foo 函数中的 this 就是 obj 对象

const c = new foo()  //  3. 对于 new 的方式来说，this 被永远绑定在了 c 上面，不会被任何方式改变 this

function a() {
  return () => {
    return () => {
      console.log(this)
    }
  }
}
console.log(a()()()) // 4. 箭头函数其实是没有 this 的，箭头函数中的 this 只取决包裹箭头函数的第一个普通函数的 this,因为包裹箭头函数的第一个普通函数是 a，所以此时的 this 是 window。另外对箭头函数使用 bind 这类函数是无效的。
```
- 对于`直接调用 foo `来说，不管 foo 函数被放在了什么地方，this 一定是 `window`
- 对于 `obj.foo()` 来说，我们只需要记住，谁调用了函数，谁就是 this，所以在这个场景下 foo 函数中的 this 就是 `obj 对象`
- 对于 `new` 的方式来说，this 被`永远绑定在了 c 上面，不会被任何方式改变 this`
- `箭头函数`其实是没有 this 的，箭头函数中的 this 只取决`包裹箭头函数的第一个普通函数的 this`,因为包裹箭头函数的第一个普通函数是 a，所以此时的 this 是 window。另外对箭头函数使用 bind 这类函数是无效的。

**bind 的方式**<br>
讨论`多次 bind` 后的 this 指向:
```
let a = {}
let fn = function () { console.log(this) }
fn.bind().bind(a)() // => ?

// fn.bind().bind(a) 等于
let fn2 = function fn1() {
  return function() {
    return fn.apply()
  }.apply(a)
}
fn2()
```
可以从上述代码中发现，不管我们给函数 bind 几次，fn 中的 this `永远由第一次 bind 决定`

**总结**<br>
首先，`new` 的方式优先级最高，接下来是 `bind` 这些函数，然后是 `obj.foo()` 这种调用方式，最后是 `foo 这种调用方式`，同时，箭头函数的 `this` 一旦被绑定，就不会再被任何方式所改变。<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/15/16717eaf3383aae8~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/15/16717eaf3383aae8~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

## == vs ===
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/19/167c4a2627fe55f1~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/12/19/167c4a2627fe55f1~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

## 闭包
闭包的定义其实很简单：`函数 A 内部有一个函数 B，函数 B 可以访问到函数 A 中的变量，那么函数 B 就是闭包。`。在 JS 中，闭包存在的意义就是让我们可以`间接访问函数内部的变量`。
```
function A() {
  let a = 1
  window.B = function () {
      console.log(a)
  }
}
A()
B() // 1
```
深入研究可以看重学前端的闭包模块

## 深拷贝，浅拷贝
浅拷贝：浅拷贝是创建一个新对象，这个对象有着原始对象属性值的一份精确拷贝。`如果属性是基本类型，拷贝的就是基本类型的值，如果属性是引用类型，拷贝的就是内存地址` ，所以如果其中一个对象改变了这个地址，就会影响到另一个对象。

深拷贝：深拷贝是将一个对象从内存中完整的拷贝一份出来,从堆内存中`开辟一个新的区域存放新对象`,且修改新对象不会影响原对象。

深入研究可以看基础篇的深拷贝、浅拷贝

## 原型
当我们在浏览器中打印 `obj` 时会发现有一个 `__proto__` 属性:
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d2c5a6bcccc4~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d2c5a6bcccc4~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

原型也是一个对象，并且这个对象中包含了很多函数，所以我们可以得出一个结论：`对于 obj 来说，可以通过 __proto__ 找到一个原型对象，在该对象中定义了很多函数让我们来使用`。

在上面的图中我们还可以发现一个 constructor 属性，也就是构造函数<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d329ec98ec0b~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d329ec98ec0b~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

打开 constructor 属性我们又可以发现其中还有一个 prototype 属性，并且这个属性对应的值和先前我们在 __proto__ 中看到的一模一样。所以我们又可以得出一个结论：`原型的 constructor 属性指向构造函数，构造函数又通过 prototype 属性指回原型`，但是并不是所有函数都具有这个属性，Function.prototype.bind() 就没有这个属性。

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d387e4189ec8~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2018/11/16/1671d387e4189ec8~tplv-t2oaga2asx-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

其实原型链就是多个对象通过 `__proto__` 的方式连接了起来。为什么 `obj` 可以访问到 `valueOf` 函数，就是因为 `obj` 通过原型链找到了 `valueOf` 函数。
- `Object` 是所有对象的爸爸，所有对象都可以通过 `__proto__` 找到它
- `Function` 是所有函数的爸爸，所有函数都可以通过 `__proto__` 找到它
- 函数的 `prototype` 是一个对象
- 对象的 `__proto__` 属性指向原型，`__proto__` 将对象和原型连接起来组成了原型链