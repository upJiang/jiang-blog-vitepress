方式：typeof()，instanceof，Object.prototype.toString.call()

1.typeof()：只能区分基本类型即：number、string、undefined、boolean、object。

```
* 1."undefined"——如果这个值未定义;
* 2."boolean"——如果这个值是布尔值;
* 3."string"——如果这个值是字符串;
* 4."number"——如果这个值是数值;
* 5."object"——如果这个值是对象或 null;
* 6."function"——如果这个值是函数。
* 7."symbol"——es6新增的symbol类型
```

2.instanceof： 用来判断对象是不是某个构造函数的实例。会沿着原型链找的

3.Object.prototype.toString.call() 判断某个对象属于哪种内置类型
![Image.png](https://i.loli.net/2021/08/01/JjM5IL3uaAoCrqi.png)

判断是否是数组：
* Array.isArray(arr)
* Object.prototype.toString.call(arr) === '[Object Array]'
* arr instanceof Array
* array.constructor === Arra
