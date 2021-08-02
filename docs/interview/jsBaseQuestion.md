## js如何获取元素顶部距离浏览器的距离
document.documentElement.scrollTop

## axios跟ajax的区别
axios就是promise封装的ajax，相当于jq跟js

## 遍历对象的方式，可以遍历原型吗？
for in    以任意顺序遍历一个对象的除Symbol以外的可枚举属性

Object.keys() 返回一个由一个给定对象的自身可枚举属性组成的数组

## 如何判断一个属性是属于对象本身还是属于他的原型？
用hasownproperty

## nodejs了解什么
 比如express用来搭建本地服务器 require exports导入导出  文件系统模块fs，path 获取文件绝对路径 __dirname __filename 全局对象global

 ## 计时器倒计时三天，如何计算误差最小
1. 使用 requestAnimationFrame（按照屏幕刷新率去定时调用，一般默认60ms)，在这个方法中重新获取当前时间去抵消误差，减去差值），但对于要求60ms延迟以下的要考虑别的方法。
2. 使用 web Worker将定时函数作为独立线程执行
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

## css中毛玻璃如何实现
只是用到了 css 滤镜（filter）中的 blur 属性

[css中毛玻璃如何实现](https://www.cnblogs.com/ivan5277/p/10007273.html)

## rem跟em的区别
移动端1rem默认16px,字体大小16px

rem 单位翻译为像素值是由 html 元素的字体大小决定的。 此字体大小会被浏览器中字体大小的设置影响，除非显式重写一个具体单位。

em 单位转为像素值，取决于他们使用的字体大小。 此字体大小受从父元素继承过来的字体大小，除非显式重写与一个具体单位。

## AJAX的原理
Ajax的工作原理相当于在用户和服 务器之间加了—个中间层(AJAX引擎),使用户操作与服务器响应异步化。并不是所有的用户请求都提交给服务器,像—些数据验证和数据处理等都交给 Ajax引擎自己来做, 只有确定需要从服务器读取新数据时再由Ajax引擎代为向服务器提交请求。

Ajax其核心有 JavaScript、XMLHTTPRequest、DOM对象组成，通过XmlHttpRequest对象来向服务器发异步请求，从服务器获得数据， 然后用JavaScript来操作DOM而更新页面。这其中最关键的一步就是从服务器获得请求数据。让我们来了解这几个对象。

## git与svn的区别
a、存储方式不一样<br/>
     Git按照元数据的方式将文件的一个版本存入了一个类似与K/V数据库，而SVN是按照文件的方式进行一个存储

b、使用方式不一样<br/>
    从本地把文件推送到远程服务，SVN只需要commit而Git需要add、commit、push三个步骤
    使用SVN开发者只要把文件修改了，只要commit其他开发人员就可以直接checkout下来
    但是Git就不相同了，Git如果要从本地将修改后的文件提交进入远程仓库再从远程仓库将其他开发者修改后的文件

## 什么是事件委托？
事件代理又称事件委托，是javaScript中绑定事件的常用技巧。顾名思义，‘事件代理’就是把原本需要绑定的事件委托给父元素，让父元素负责事件监听。事件代理的原理是DOM元素的事件冒泡。使用事件代理的好处是可以提高性能

比方说对于li的一些监听操作，不在li上写，在ul上写，这样就减少了监听的次数

## dom树节点和渲染树节点一一对应吗，有什么是dom树会有，渲染树不会有的节点 

不是一一对应，比如head节点，dom树+cssRules = 渲染树，但并不是必须等DOM树及CSSOM树加载完成后才开始合并构建渲染树。三者的构建并无先后条件，亦非完全独立，而是会有交叉，并行构建。因此会形成一边加载，一边解析，一边渲染的工作现象。

构建渲染树，根据渲染树计算每个可见元素的布局，并输出到绘制流程，将像素渲染到屏幕上。

对于一个HTML文档来说，不管是内联还是外链的css，都会阻碍后续的dom渲染，但是不会阻碍后续dom的解析

[参考](https://blog.csdn.net/Gbing1228/article/details/103575756)

## equestIdleCallback是干什么用的
requestIdleCallback会在帧结束时并且有空闲时间。或者用户不与网页交互时，执行回调

[参考](https://www.lagou.com/lgeduarticle/105035.html)

## 浏览器渲染页面的原理及流程
>js会阻塞dom树的构建，因为js可能会改变dom树的结构，无法预知，所以只能停止dom树的构建，等待js完成。所以js一般要在最后写

![Image.png](https://i.loli.net/2021/08/02/mhQ5A3iqaB9UdNI.png)

[参考](https://www.cnblogs.com/chenyoumei/p/9156849.html)

## 关键渲染路径详述
就是优化首页加载

[参考](https://www.cnblogs.com/zechau/p/5979683.html)

## 为什么说script标签建议放在body下面？
JS代码在加载完之后是立即执行的，且JS代码执行时会阻塞页面的渲染。

## 为什么说script标签会阻塞页面的渲染呢？渲染线程和js引擎线程不是分开的吗？
JS属于单线程，当我们在加载script标签内容的时候，渲染线程会被暂停，因为script标签里可能会操作DOM的，所以如果你加载script标签又同时渲染页面肯定就冲突了，因此说渲染线程(GUI)和js引擎线程互斥。