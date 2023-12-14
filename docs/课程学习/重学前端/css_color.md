## RGB 颜色

我们在计算机中，最常见的颜色表示法是 RGB 颜色，它符合光谱三原色理论：**红、绿、
蓝**三种颜色的光可以构成所有的颜色。

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/afd4eb263df44169b15122dc9154337d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/afd4eb263df44169b15122dc9154337d~tplv-k3u1fbpfcp-watermark.image?)</a>

为什么是这三种颜色呢？这跟人类的视神经系统相关，人类的视觉神经分别有对红、绿、蓝
三种颜色敏感的类型。

现代计算机中多用 **0 - 255** 的数字表示每一种颜色，这正好占据了一个字节，每一个
颜色就占据三个字节。

红绿蓝三种颜色的光混合起来就是白光，没有光就是黑暗，所以在 RGB 表示法中，三色数
值最大表示白色，三色数值为 0 表示黑色。

## CMYK 颜色

如果你上过小学美术课，应该听过“红黄蓝”三原色的说法，这好像跟我们说的不太一样。实
际上是这样的，颜料显示颜色的原理是它吸收了所有别的颜色的光，只反射一种颜色，所以
颜料三原色其实是红、绿、蓝的补色，也就是：品红、黄、青。因为它们跟红、黄、蓝相近
，所以有了这样的说法。
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/07a43b0d3e604dafa384282ed5242c6d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/07a43b0d3e604dafa384282ed5242c6d~tplv-k3u1fbpfcp-watermark.image?)</a>

在印刷行业，使用的就是这样的三原色（品红、黄、青）来调配油墨，这种颜色的表示法叫
做 CMYK，它用一个四元组来表示颜色。

你一定会好奇，为什么它比三原色多了一种，其实答案并不复杂，在印刷行业中，黑色颜料
价格最低，而品红、黄、青颜料价格较贵，如果要用三原色调配黑色，经济上是不划算的，
所以印刷时会单独指定黑色。

对 CMYK 颜色表示法来说，同一种颜色会有多种表示方案，但是我们参考印刷行业的习惯，
会尽量优先使用黑色。

## HSL 颜色

人类对颜色的认识却并非来自自己的神经系统，当我们把阳光散射，可以得到七色光：红橙
黄绿蓝靛紫，实际上，阳光接近白光，它包含了各种颜色的光，它散射之后，应该是个基本
连续的。这说明对人的感知来说，颜色远远大于红、绿、蓝。

因此，HSL 这样的颜色模型被设计出来了，它用一个值来表示人类认知中的颜色，我们用专
业的术语叫做色相（H）。加上颜色的纯度（S）和明度（L），就构成了一种颜色的表示。

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/90f7cfba72dc4644a9b11e29cb3c0590~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/90f7cfba72dc4644a9b11e29cb3c0590~tplv-k3u1fbpfcp-watermark.image?)</a>

## 其它颜色

RGBA 是代表 Red（红色）、Green（绿色）、Blue（蓝色）和 Alpha 的色彩空间。RGBA 颜
色被用来表示带**透明度**的颜色，实际上，Alpha 通道类似一种颜色值的保留字。在 CSS
中，Alpha 通道被用于透明度，所以我们的颜色表示被称作 RGBA，而不是
RGBO（Opacity）。

为了方便使用，CSS 还规定了名称型的颜色，它内置了大量（140 种）的**颜色名称**。不
过这里我要挑出两个颜色来讲一讲：金（gold）和银（silver）。

果你使用过这两个颜色，你会发现，金（gold）和银（silver）的视觉表现跟我们想象中的
金色和银色相差甚远。与其被叫做金色和银色，它们看起来更像是难看的暗黄色和浅灰色。

为什么会这样呢？在人类天然的色彩认知中，实际上混杂了很多其它因素，金色和银色不仅
仅是一种颜色，它还意味着一定的镜面反光程度，在同样的光照条件下，金属会呈现出更亮
的色彩，这并非是用一个色值可以描述的，这就引出了我们接下来要讲的渐变。

## 渐变

在 CSS 中，background-image 这样的属性，可以设为渐变。CSS 中支持两种渐变，一种
是**线性渐变**，一种是**放射性渐变**，我们先了解一下它们的基本用法：

线性渐变的写法是：

```
linear-gradient(direction, color-stop1, color-stop2, ...);
```

这里的 direction 可以是方向，也可以是具体的角度。例如：

- to bottom
- to top
- to left
- to right
- to bottom left
- to bottom right
- to top left
- to top right
- 120deg
- 3.14rad

以上这些都是合理的方向取值。

color-stop 是一个颜色和一个区段，例如：

- rgba(255,0,0,0)
- orange
- yellow 10%
- green 20%
- lime 28px

我们组合一下，产生一个“真正的金色”的背景：

```
<style>
#grad1 {
    height: 200px;
    background: linear-gradient(45deg, gold 10%, yellow 50%, gold 90%);
}
</style>
<div id="grad1"></div>
```

放射性渐变需要一个中心点和若干个颜色：

```
radial-gradient(shape size at position, start-color, ..., last-color);
```

当我们应用的每一种颜色都是 HSL 颜色时，就产生了一些非常有趣的效果，比如，我们可
以通过变量来调整一个按钮的风格：

```
<style>
.button {
    display: inline-block;
    outline: none;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    font: 14px/100% Arial, Helvetica, sans-serif;
    padding: .5em 2em .55em;
    text-shadow: 0 1px 1px rgba(0,0,0,.3);
    border-radius: .5em;
    box-shadow: 0 1px 2px rgba(0,0,0,.2);
    color: white;
    border: solid 1px ;
}

</style>
<div class="button orange">123</div>


var btn = document.querySelector(".button");
var h = 25;
setInterval(function(){
  h ++;
  h = h % 360;
  btn.style.borderColor=`hsl(${h}, 95%, 45%)`
  btn.style.background=`linear-gradient(to bottom,  hsl(${h},95%,54.1%),  hsl(${h},95%,84.1%))`
},100);
```

## 形状

CSS 中的很多属性还会产生形状，比如我们常见的属性：

- border
- box-shadow
- border-radius

这些产生形状的属性非常有趣，我们也能看到很多利用它们来产生的 CSS 黑魔法。然而，
这里我有一个相反的建议，我们仅仅把它们用于基本的用途，把 border 用于边框、把阴影
用于阴影，把圆角用于圆角，所有其它的场景，都有一个更好的替代品：datauri+svg。
