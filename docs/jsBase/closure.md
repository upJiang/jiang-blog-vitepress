>闭包是指有权访问另一个函数作用域中的变量的函数。
>闭包的创建方法：一个函数中嵌套另外一个函数，并且将这个函数return出去，然后将这个return出来的函数保存到了一个变量中，那么就创建了一个闭包。
## 闭包的作用
1. 可以读取函数内部的变量
2. 让这些变量的值始终保存在内存中
3. 可以做缓存
4. 外部函数可以访问内部函数的变量
5. 变量和参数不会被垃圾回收

>一般不要使用闭包，避免产生不可回收的变量，产生内存泄露，加大内存消耗

## 应用场景
### settmeout传入第一个参数
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0e345dc8604049f7beeb99384cc1180d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0e345dc8604049f7beeb99384cc1180d~tplv-k3u1fbpfcp-watermark.image?)</a>

### 创建独立的环境，保存变量

清楚闭包：闭包函数 = null
