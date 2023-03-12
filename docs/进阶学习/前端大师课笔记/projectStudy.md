#### 网站图标的两张引入方式
- 将 `favicon.ico` 直接放到根目录下
- 将 `favicon.ico` 放到文件目录下，并在 `index.html` 中引入
```
<link rel="shortcut icon" href="./assets/favicon.ico" type="image/x-icon">
```

#### 使用 `+变量` 将变量转换成 number 类型，代替 Number() 强转
#### 在做一些列表滚动，需要计算高度时，在草稿上给它画出来
#### 当我们需要对一个数组添加属性时，可以使用构造函数对这个数组的每一项进行添加，也能够添加原型方法
```
// goodsList 是一个数组，每一项需要添加 checked 属性
const goodsList = [
    {
        price:1,
        num:2
    }
]
function UIGodds(g){
    this.checked = false
    this.data = g
}

const newGoodsList = goodsList.map((item)=>new UIGoods(item))

// 添加原型方法，比方说上面的数据需要计算一个 price * num
UIGoods.prototype.getTotalPrice = function(){
    return this.data.price * this.data.num
}
```
ES6 class 写法
```
class UIGodds {
    constructor(g) {
        this.checked = false
        this.data = g
    }
    getTotalPrice() {
        return this.data.price * this.data.num
    }
    // 增加更多页面对象需要的方法，面向对象编程
    xxx(){

    }
}
```
#### document.querySelector(.xx 或 #xx 或 p...) 去代替 getElementById...
#### 实现一些比较复杂的动画时，应该考虑使用原生 JS + annimation
#### 一个动画的过渡在 JS 中全局执行，如果想让它渲染出过渡效果，可以 强行 reflow，随便获取一个 dom 元素的属性
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5346a76287bd4d789ff06dbc8b2682a8~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5346a76287bd4d789ff06dbc8b2682a8~tplv-k3u1fbpfcp-watermark.image?)</a>