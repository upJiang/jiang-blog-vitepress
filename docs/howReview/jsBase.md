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
