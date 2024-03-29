[前端万字面经](https://juejin.cn/post/6992767550543265829)

[37 个 JavaScript 基本面试问题和解答](https://mp.weixin.qq.com/s/STRtbYjyPO7dQWRDtiQOlQ)

## 倒计时用 setTimeout 还是 setInterval

setInterval 是每隔 n 秒加一个任务执行，只要执行内容的延迟时间没超过 n 秒，那么必
然准确执行，不受影响。setTimeout 每次执行则会消耗执行内容的时间。所以倒计时用
setInterval 比较好

## js 如何获取元素顶部距离浏览器的距离

document.documentElement.scrollTop

## axios 跟 ajax 的区别

axios 就是 promise 封装的 ajax，相当于 jq 跟 js

## 遍历对象的方式，可以遍历原型吗？

for in 以任意顺序遍历一个对象的除 Symbol 以外的可枚举属性

Object.keys() 返回一个由一个给定对象的自身可枚举属性组成的数组

## 如何判断一个属性是属于对象本身还是属于他的原型？

用 hasownproperty

## nodejs 了解什么

比如 express 用来搭建本地服务器 require exports 导入导出 文件系统模块 fs，path
获取文件绝对路径 **dirname **filename 全局对象 global

## 计时器倒计时三天，如何计算误差最小

1. 使用 requestAnimationFrame（按照屏幕刷新率去定时调用，一般默认 60ms)，在这个
   方法中重新获取当前时间去抵消误差，减去差值），但对于要求 60ms 延迟以下的要考
   虑别的方法。
2. 使用 web Worker 将定时函数作为独立线程执行

```
// worker 解决方案
let worker = new Worker('./preciseTiming.js')
// preciseTiming.js
var startTime = new Date().getTime();
var count = 0;
setInterval(function(){
    count++;
    console.log(`${count}---${(new Date().getTime() - (startTime + count * 1000)}`);
}, 1000);
```

## === 与 == 的区别

===包括类型相等

## css 中毛玻璃如何实现

只是用到了 css 滤镜（filter）中的 blur 属性

[css 中毛玻璃如何实现](https://www.cnblogs.com/ivan5277/p/10007273.html)

## rem 跟 em 的区别

移动端 1rem 默认 16px,字体大小 16px

rem 单位翻译为像素值是由 html 元素的字体大小决定的。 此字体大小会被浏览器中字体
大小的设置影响，除非显式重写一个具体单位。

em 单位转为像素值，取决于他们使用的字体大小。 此字体大小受从父元素继承过来的字体
大小，除非显式重写与一个具体单位。

## AJAX 的原理

Ajax 的工作原理相当于在用户和服 务器之间加了—个中间层(AJAX 引擎),使用户操作与服
务器响应异步化。并不是所有的用户请求都提交给服务器,像—些数据验证和数据处理等都交
给 Ajax 引擎自己来做, 只有确定需要从服务器读取新数据时再由 Ajax 引擎代为向服务器
提交请求。

Ajax 其核心有 JavaScript、XMLHTTPRequest、DOM 对象组成，通过 XmlHttpRequest 对象
来向服务器发异步请求，从服务器获得数据， 然后用 JavaScript 来操作 DOM 而更新页面
。这其中最关键的一步就是从服务器获得请求数据。让我们来了解这几个对象。

## git 与 svn 的区别

a、存储方式不一样<br/> Git 按照元数据的方式将文件的一个版本存入了一个类似与 K/V
数据库，而 SVN 是按照文件的方式进行一个存储

b、使用方式不一样<br/> 从本地把文件推送到远程服务，SVN 只需要 commit 而 Git 需要
add、commit、push 三个步骤 使用 SVN 开发者只要把文件修改了，只要 commit 其他开发
人员就可以直接 checkout 下来 但是 Git 就不相同了，Git 如果要从本地将修改后的文件
提交进入远程仓库再从远程仓库将其他开发者修改后的文件

## 什么是事件委托？

事件代理又称事件委托，是 javaScript 中绑定事件的常用技巧。顾名思义，‘事件代理’就
是把原本需要绑定的事件委托给父元素，让父元素负责事件监听。事件代理的原理是 DOM
元素的事件冒泡。使用事件代理的好处是可以提高性能

比方说对于 li 的一些监听操作，不在 li 上写，在 ul 上写，这样就减少了监听的次数

## dom 树节点和渲染树节点一一对应吗，有什么是 dom 树会有，渲染树不会有的节点

不是一一对应，比如 head 节点，dom 树+cssRules = 渲染树，但并不是必须等 DOM 树及
CSSOM 树加载完成后才开始合并构建渲染树。三者的构建并无先后条件，亦非完全独立，而
是会有交叉，并行构建。因此会形成一边加载，一边解析，一边渲染的工作现象。

构建渲染树，根据渲染树计算每个可见元素的布局，并输出到绘制流程，将像素渲染到屏幕
上。

对于一个 HTML 文档来说，不管是内联还是外链的 css，都会阻碍后续的 dom 渲染，但是
不会阻碍后续 dom 的解析

[参考](https://blog.csdn.net/Gbing1228/article/details/103575756)

## equestIdleCallback 是干什么用的

requestIdleCallback 会在帧结束时并且有空闲时间。或者用户不与网页交互时，执行回调

[参考](https://www.lagou.com/lgeduarticle/105035.html)

## 浏览器渲染页面的原理及流程

> js 会阻塞 dom 树的构建，因为 js 可能会改变 dom 树的结构，无法预知，所以只能停
> 止 dom 树的构建，等待 js 完成。所以 js 一般要在最后写

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3d03fc74582348268cceca5334ea4b6d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3d03fc74582348268cceca5334ea4b6d~tplv-k3u1fbpfcp-watermark.image?)</a>

[参考](https://www.cnblogs.com/chenyoumei/p/9156849.html)

## 关键渲染路径详述

就是优化首页加载

[参考](https://www.cnblogs.com/zechau/p/5979683.html)

## 为什么说 script 标签建议放在 body 下面？

JS 代码在加载完之后是立即执行的，且 JS 代码执行时会阻塞页面的渲染。

## 为什么说 script 标签会阻塞页面的渲染呢？渲染线程和 js 引擎线程不是分开的吗？

JS 属于单线程，当我们在加载 script 标签内容的时候，渲染线程会被暂停，因为 script
标签里可能会操作 DOM 的，所以如果你加载 script 标签又同时渲染页面肯定就冲突了，
因此说渲染线程(GUI)和 js 引擎线程互斥。

## null == undefined

```
console.log( undefined == null )  //true
```

undefined 和 null 都是 false ,所有他们是 true ? 错误
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e8c2c58d6009b~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e8c2c58d6009b~tplv-t2oaga2asx-watermark.awebp)</a>

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e8c4c6155aef8~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e8c4c6155aef8~tplv-t2oaga2asx-watermark.awebp)</a>

## 当静态资源 cdn 挂掉怎么办？怎么切换另一个？

```
<script src="http://cdn.static.runoob.com/libs/jquery/1.10.2/jquery.min.js"></script>
<script>window.jQuery || document.write('<script src="js/vendor/jquery-1.10.2.min.js"><\/script>')</script>
```

思路其实就是判断引入的资源是否存在，不存在使用 document.write 写入另一个 cdn 或
者本地资源

## 如何中断请求？

使用 axios 的 cancelToken,用法

```
const CancelToken = axios.CancelToken;
const source = CancelToken.source();
axios.get('/user/12345', {//get请求在第二个参数
    cancelToken: source.token
}).catch(function(thrown) {
});
axios.post('/user/12345', {//post请求在第三个参数
    name: 'new name'
}, {
    cancelToken: source.token
});
source.cancel('不想请求了');
用法二
```

## 为什么使用 css3 动画比 js 动画 更快？

CSS3 动画也被称为`补间动画`，原因是只需要添加关键帧的位置，其他的未定义的帧会被
自动生成。我们只需要设置几个关键帧的位置。<br> 优势：

- 浏览器可以对动画进行优化
- 帧速不好的浏览器，CSS3 可以自然降级兼容
- 代码简单，调优方向固定

JS 动画是逐帧动画，在时间帧上绘制内容，一帧一帧的，所以他的可再造性很高，几乎可
以完成任何你想要的动画形式。但是由于逐帧动画的内容不一样，会增加制作的负担，占用
比较大的资源空间。<br> 优势：

- 细腻的动画
- 可控性高
- 炫酷高级的动画

对比：<br> 使用 js 必然会涉及到几何属性的改变那么必然导致`回流`，会造成浏览器在
不断的计算页面，主线程中还有其他的重要任务在运行，因而可能会受到干扰导致线程阻塞
，从而丢帧。

而 CSS 的动画是运行在合成线程中的，不会阻塞主线程，并且在合成线程中完成的动作不
会触发回流和重绘。JS 动画运行在 CPU，而 CSS 动画运行在 GPU。总的来说， CSS 动画
的渲染成本小，并且它的执行效率高于 JavaScript 动画

**CSS 动画比 JS 动画流畅的前提**

- CSS 动画比较少或者不触发 pain 和 layout，即重绘和重排时。例如通过改变如下属性
  生成的 css 动画，这时整个 CSS 动画得以在 compositor thread 完成（而 JS 动画则
  会在 main thread 执行，然后触发 compositor 进行下一步操作）：
  - backface-visibility：该属性指定当元素背面朝向观察者时是否可见（3D，实验中的
    功能）；
  - opacity：设置 div 元素的不透明级别；
  - perspective 设置元素视图，该属性只影响 3D 转换元素；
  - perspective-origin：该属性允许您改变 3D 元素的底部位置；
  - transform：该属性应用于元素的 2D 或 3D 转换。这个属性允许你将元素旋转，缩放
    ，移动，倾斜等。
- JS 在执行一些昂贵的任务时，main thread 繁忙，CSS 动画由于使用了 compositor
  thread 可以保持流畅；
- 部分属性能够启动 3D 加速和 GPU 硬件加速，例如使用 transform 的 translateZ 进行
  3D 变换时；
- 通过设置 will-change 属性，浏览器就可以提前知道哪些元素的属性将会改变，提前做
  好准备。待需要改变元素的时机到来时，就可以立刻实现它们，从而避免卡顿等问题。
  - 不要将 will-change 应用到太多元素上，如果过度使用的话，可能导致页面响应缓慢
    或者消耗非常多的资源。
  - 例如下面的代码就是提前告诉渲染引擎 box 元素将要做几何变换和透明度变换操作，
    这时候渲染引擎会将该元素单独实现一帧，等这些变换发生时，渲染引擎会通过合成线
    程直接去处理变换，这些变换并没有涉及到主线程，这样就大大提升了渲染的效率。
    - ```
         .box {will-change: transform, opacity;}
      ```

## 判断数据类型

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
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/20d73f4ba81649f89ad96bbf244b50c3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/20d73f4ba81649f89ad96bbf244b50c3~tplv-k3u1fbpfcp-watermark.image?)</a>

判断是否是数组：

- Array.isArray(arr)
- Object.prototype.toString.call(arr) === '[Object Array]'
- arr instanceof Array
- array.constructor === Arra

## Promise 链式调用

后面的输出其实都是看前面 then 返回的什么状态，如果没返回任何东西则默认走 then，
如果抛出异常或者 reject，看后面是否有处理 reject 的 err，如果有则先执行，然后继
续看返回的状态继续操作，当然 reject 的 err 只能处理上一个 promise 的返回，如果没
有则往下找 catch，catch 是可以处理它上面所有未被处理的异常。

总结：处理完上一个状态后，看当前返回的状态继续执行，没有返回默认 then，然后继续
回调回调，chath 处理上面所有未被处理，reject 的 err 仅处理上一个 promise 的返回

```
return new Promise((resolve,reject)=>{
    reject("reject")
  }).then((res)=>{
     console.log("resolve",res)
  },err=>{
     console.log("reject",err)
     //resolve("resolve")  输出resolve1然后下一个then
    //  return Promise.reject("reject") 输出reject1然后下一个then
    // throw new Error('nono')  输出reject1然后下一个then
    //  return 100 输出resolve1 100然后下一个then
  }).then((res)=>{
     console.log("resolve1",res)
  },err=>{
     console.log("reject1",err)
  }).catch(err=>{
    console.log("catch1",err)
  })
  .then((res)=>{
     console.log("resolve2",res)
  },err=>{
     console.log("reject2",err)
  }).catch(err=>{
    console.log("catch2",err)
  })
```

## 纯函数

1. 相同输入永远会获得相同输出
2. 自包含（不会使用外部变量）
3. 无副作用

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ddebc9223334dbba96f009cd0c0008b~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ddebc9223334dbba96f009cd0c0008b~tplv-k3u1fbpfcp-watermark.image?)</a>

## null 和 undefined 的区别

```
1. 作者在设计js的都是先设计的null（为什么设计了null：最初设计js的时候借鉴了java的语言）
2. null会被隐式转换成0，很不容易发现错误。
3. 先有null后有undefined，出来undefined是为了填补之前的坑。

具体区别：JavaScript的最初版本是这样区分的：null是一个表示"无"的对象（空对象指针），转为数值时为0；undefined是一个表示"无"的原始值，转为数值时为NaN。
```

## JS 判断变量是不是数组，你能写出哪些方法？

var arr = [1,2,3];

```
Array.isArray( arr )
arr instanceof Array
Object.prototype.toString.call(arr).indexOf('Array') > -1
Array.prototype.isPrototypeOf(arr)
arr.constructor.toString().indexOf('Array') > -1
```

## slice 是干嘛的、splice 是否会改变原数组

```
1. slice是来截取的
	参数可以写slice(3)、slice(1,3)、slice(-3)
	返回的是一个新的数组
2. splice 功能有：插入、删除、替换
	返回：删除的元素
	该方法会改变原数组
```
