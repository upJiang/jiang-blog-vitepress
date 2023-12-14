> CSS 的顶层样式表由两种规则组成的规则列表构成，一种被称为 at-rule，也就是 at 规
> 则，另一种是 qualified rule，也就是普通规则。

## at 规则 @

- @charset ： https://www.w3.org/TR/css-syntax-3/
- @import ：https://www.w3.org/TR/css-cascade-4/
- @media ：https://www.w3.org/TR/css3-conditional/
- @page ： https://www.w3.org/TR/css-page-3/
- @counter-style ：https://www.w3.org/TR/css-counter-styles-3
- @keyframes ：https://www.w3.org/TR/css-animations-1/
- @fontface ：https://www.w3.org/TR/css-fonts-3/
- @supports ：https://www.w3.org/TR/css3-conditional/
- @namespace ：https://www.w3.org/TR/css-namespaces-3/

### @charset

> @charset 用于提示 CSS 文件使用的字符编码方式，它如果被使用，必须出现在最前面。
> 这个规则只在给出语法解析阶段前使用，并不影响页面上的展示效果。

```
@charset "utf-8";
```

### @import

> @import 用于引入一个 CSS 文件，除了 @charset 规则不会被引入，@import 可以引入
> 另一个文件的全部内容。

```
@import "mystyle.css";
@import url("mystyle.css");
```

```
@import [ <url> | <string> ]
        [ supports( [ <supports-condition> | <declaration> ] ) ]?
        <media-query-list>? ;
```

通过代码，我们可以看出，import 还支持 supports 和 media query 形式。

### @media

> media 就是大名鼎鼎的 media query 使用的规则了，它能够对设备的类型进行一些判断
> 。在 media 的区块内，是普通规则列表。

```
@media print {
    body { font-size: 10pt }
}
```

### @page

> page 用于分页媒体访问网页时的表现设置，页面是一种特殊的盒模型结构，除了页面本
> 身，还可以设置它周围的盒。比如打印机

```
@page {
  size: 8.5in 11in;
  margin: 10%;

  @top-left {
    content: "Hamlet";
  }
  @top-right {
    content: "Page " counter(page);
  }
}
```

### @counter-style

> counter-style 产生一种数据，用于定义列表项的表现。

```
@counter-style triangle {
  system: cyclic;
  symbols: ‣;
  suffix: " ";
}
```

### @key-frames

> keyframes 产生一种数据，用于定义动画关键帧。

```
@keyframes diagonal-slide {

  from {
    left: 0;
    top: 0;
  }

  to {
    left: 100px;
    top: 100px;
  }

}
```

### @fontface

> fontface 用于定义一种字体，icon font 技术就是利用这个特性来实现的。

```
@font-face {
  font-family: Gentium;
  src: url(http://example.com/fonts/Gentium.woff);
}

p { font-family: Gentium, serif; }
```

### @support

support 检查环境的特性，它与 media 比较类似。低版本不支持

### @namespace

用于跟 XML 命名空间配合的一个规则，表示内部的 CSS 选择器全都带上特定命名空间。

### @viewport

用于设置视口的一些特性，不过兼容性目前不是很好，多数时候被 HTML 的 meta 代替。

### 其它

除了以上这些，还有些目前不太推荐使用的 at 规则。

- @color-profile 是 SVG1.0 引入的 CSS 特性，但是实现状况不怎么好。
- @document 还没讨论清楚，被推迟到了 CSS4 中。
- @font-feature-values 。

## 普通规则

qualified rule 主要是由选择器和声明区块构成。声明区块又由属性和值构成。

- 普通规则
  - 选择器
  - 声明列表
    - 属性
    - 值
      - 值的类型
      - 函数

### 选择器

语法结构<br>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3615a0fff44c479882a614b256dde600~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3615a0fff44c479882a614b256dde600~tplv-k3u1fbpfcp-watermark.image?)</a><br>
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9294e2fdd7ca4bf8b3de9ae9fd25fca6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9294e2fdd7ca4bf8b3de9ae9fd25fca6~tplv-k3u1fbpfcp-watermark.image?)</a>

### 声明：属性和值

> 声明部分是一个由“属性: 值”组成的序列。

属性是由中划线、下划线、字母等组成的标识符，CSS 还支持使用反斜杠转义。我们需要注
意的是：属性不允许使用连续的两个中划线开头，这样的属性会被认为是 CSS 变量。

在`CSS Variables` 标准中，以双中划线开头的属性被当作变量，与之配合的则是 var 函
数：

```
:root {
  --main-color: #06c;
  --accent-color: #006;
}
/* The rest of the CSS file */
#foo h1 {
  color: var(--main-color);
}
```

CSS 属性值可能是以下类型。

- CSS 范围的关键字：initial，unset，inherit，任何属性都可以的关键字。
- 字符串：比如 content 属性。
- URL：使用 url() 函数的 URL 值。
- 整数 / 实数：比如 flex 属性。
- 维度：单位的整数 / 实数，比如 width 属性。
- 百分比：大部分维度都支持。
- 颜色：比如 background-color 属性。
- 图片：比如 background-image 属性。
- 2D 位置：比如 background-position 属性。
- 函数：来自函数的值，比如 transform 属性。

CSS 支持一批特定的计算型函数：

- calc()
- max()
- min()
- clamp()
- toggle()
- attr()

**calc()** 函数是基本的表达式计算，它支持加减乘除四则运算。在针对维度进行计算时
，calc() 函数允许不同单位混合运算，这非常的有用。

```
section {
  float: left;
  margin: 1em; border: solid 1px;
  width: calc(100%/3 - 2*1em - 2*1px);
}
```

**max()、min() 和 clamp()** 则是一些比较大小的函数，max() 表示取两数中较大的一个
，min() 表示取两数之中较小的一个，clamp() 则是给一个值限定一个范围，超出范围外则
使用范围的最大或者最小值。

toggle() 函数在规则选中多于一个元素时生效，它会在几个值之间来回切换，比如我们要
让一个列表项的样式圆点和方点间隔出现，可以使用下面代码：

```
ul { list-style-type: toggle(circle, square); }
```

attr() 函数允许 CSS 接受属性值的控制。
