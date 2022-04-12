## var、let 及 const 区别
为什么要存在提升这个事情呢，其实提升存在的根本原因就是为了`解决函数间互相调用的情况`
```
function test1() {
    test2()
}
function test2() {
    test1()
}
test1()
```
**var `变量提升`，会`挂载 window` 上**
```
console.log(a) // undefined
var a = 1

等用于：
var a
console.log(a) // undefined
a = 1
```
**let 暂时性死区，在声明之前使用会报错**
```
console.log(a)  // 报错
let a = 1
```

总结：
- 函数提升优先于变量提升，函数提升会把整个函数挪到作用域顶部，变量提升只会把声明挪到作用域顶部
- `var` 存在提升，我们能在声明之前使用。`let、const` 因为暂时性死区的原因，不能在声明前使用
- `var` 在全局作用域下声明变量会导致变量挂载在 `window` 上，其他两者不会
- `let` 和 `const` 作用基本一致，但是后者声明的变量不能再次赋值
