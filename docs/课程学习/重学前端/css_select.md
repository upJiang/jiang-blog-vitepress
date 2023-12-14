> 选择器的基本意义是：根据一些特征，选中元素树上的一批元素。

- 简单选择器：针对某一特征判断是否选中元素。
- 复合选择器：连续写在一起的简单选择器，针对元素自身特征选择单个元素
- 复杂选择器：由“（空格）”“ >”“ ~”“ +”“ ||”等符号连接的复合选择器，根据父元素或
  者前序元素检查单个元素。
- 选择器列表：由逗号分隔的复杂选择器，表示“或”的关系。

## 简单选择器

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a845c432fe004641bc2dad01b8bd4e13~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a845c432fe004641bc2dad01b8bd4e13~tplv-k3u1fbpfcp-watermark.image?)</a>

### 类型选择器和全体选择器

> 根据一个元素的标签名来选中元素

```
div {

}
```

我们还必须要考虑 HTML 或者 XML 元素的命名空间问题。

比如我们的 svg 元素，实际上在： http://www.w3.org/2000/svg 命名空间之下。

svg 和 HTML 中都有 a 元素，我们若要想区分选择 svg 中的 a 和 HTML 中的 a，就必须
用带命名空间的类型选择器。

```
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JS Bin</title>
</head>
<body>
<svg width="100" height="28" viewBox="0 0 100 28" version="1.1"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <desc>Example link01 - a link on an ellipse
  </desc>
  <a xlink:href="http://www.w3.org">
    <text y="100%">name</text>
  </a>
</svg>
<br/>
<a href="javascript:void 0;">name</a>
</body>
</html>

@namespace svg url(http://www.w3.org/2000/svg);
@namespace html url(http://www.w3.org/1999/xhtml);
svg|a {
  stroke:blue;
  stroke-width:1;
}

html|a {
  font-size:40px
}
```

这里有一个特殊的选择器，就是“ \* ” ，它称为全体选择器，可以选中任意元素。它的用
法跟类型选择器是完全一致的

### id 选择器与 class 选择器

> id 选择器和 class 选择器都是针对特定属性的选择器。id 选择器是“#”号后面跟随 id
> 名，class 选择器是“.”后面跟随 class 名

```
#myid {
  stroke:blue;
  stroke-width:1;
}

.mycls {
  font-size:40px
}
```

### 属性选择器

属性选择器根据 HTML 元素的属性来选中元素。属性选择器有四种形态。

- 第一种，[att] 直接在方括号中放入属性名，是检查元素是否具有这个属性，只要元素有
  这个属性，不论属性是什么值，都可以被选中。

- 第二种，[att=val] 精确匹配，检查一个元素属性的值是否是 val。
- 第三种，[att~=val] 多种匹配，检查一个元素的值是否是若干值之一，这里的 val 不是
  一个单一的值了，可以是用空格分隔的一个序列
- 第四种，[att|=val] 开头匹配，检查一个元素的值是否是以 val 开头，它跟精确匹配的
  区别是属性只要以 val 开头即可，后面内容不管。

有些 HTML 属性含有特殊字符，这个时候，可以把 val 用引号括起来，形成一个 CSS 字符
串。CSS 字符串允许使用单双引号来规避特殊字符，也可以用反斜杠转义，这样，就可以表
示出任意属性值啦。

### 伪类选择器

伪类选择器是一系列由 CSS 规定好的选择器，它们以冒号开头。伪类选择器有普通型和函
数型两种。伪类中最常用的部分：树结构关系伪类。

#### 树结构关系伪类选择器

:root 伪类表示树的根元素，在选择器是针对完整的 HTML 文档情况，我们一般用 HTML 标
签即可选中根元素。但是随着 scoped css 和 shadow root 等场景出现，选择器可以针对
某一子树来选择，这时候就很需要 root 伪类了。

- :empty 伪类表示没有子节点的元素，这里有个例外就是子节点为空白文本节点的情况。
- :nth-child 和 :nth-last-child 这是两个函数型的伪类，CSS 的 An+B 语法设计的是比
  较复杂的，我们这里仅仅介绍基本用法。我们还是看几个例子：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/128f31c9db444593b8f264c42c771917~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/128f31c9db444593b8f264c42c771917~tplv-k3u1fbpfcp-watermark.image?)</a>

- :nth-last-child 的区别仅仅是从后往前数。
- :first-child :last-child 分别表示第一个和最后一个元素。
- :only-child 按字面意思理解即可，选中唯一一个子元素。

of-type 系列，是一个变形的语法糖，S:nth-of-type(An+B) 是:nth-child(|An+B| of S)
的另一种写法。

以此类推，还有 nth-last-of-type、first-of-type、last-of-type、only-of-type。

#### 链接与行为伪类选择器

> 链接与行为是第一批设计出来的伪类，也是最常用的一批。

- :any-link 表示任意的链接，包括 a、area 和 link 标签都可能匹配到这个伪类。
- :link 表示未访问过的链接， :visited 表示已经访问过的链接。
- :hover 表示鼠标悬停在上的元素。
- :active 表示用户正在激活这个元素，如用户按下按钮，鼠标还未抬起时，这个按钮就处
  于激活状态。
- :focus 表示焦点落在这个元素之上。
- :target 用于选中浏览器 URL 的 hash 部分所指示的元素。

在 Selector Level 4 草案中，还引入了 target-within、focus-within 等伪类，用于表
示 target 或者 focus 的父容器。

#### 逻辑伪类选择器

:not 伪类。这个伪类是个函数型伪类，它的作用时选中内部的简单选择器命中的元素。

```
*|*:not(:hover)
```

选择器 3 级标准中，not 只支持简单选择器，在选择器 4 级标准，则允许 not 接受一个
选择器列表，这意味着选择器支持嵌套，仅靠 not 即可完成选择器的一阶真值逻辑完备，
但目前还没有看到浏览器实现它。

在 Selector Level 4 草案中，还引入了:is :where :has 等逻辑伪类，但是它们有一些违
背了选择器匹配 DOM 树不回溯的原则，所以这部分设计最终的命运如何还不太确定。

#### 其它伪类选择器

还有一些草案中或者不常用的选择器，你仅做大概了解即可。

- 国际化：用于处理国际化和多语言问题。
  - dir
  - lang
- 音频 / 视频：用于区分音视频播放状态。
  - play
  - pause
- 时序：用于配合读屏软件等时序性客户端的伪类。
  - current
  - past
  - future
- 表格：用于处理 table 的列的伪类。
  - nth-col
  - nth-last-col

## 选择器的组合

> 选择器列表是用逗号分隔的复杂选择器序列；复杂选择器则是用空格、大于号、波浪线等
> 符号连接的复合选择器；复合选择器则是连写的简单选择器组合。

根据选择器列表的语法，选择器的连接方式可以理解为像四则运算一样有优先级。

- 第一优先级
  - 无连接符号
- 第二优先级
  - “空格”
  - “~”
  - “+”
  - “>”
  - “||”
- 第三优先级
  - “,”

例如以下选择器：

```
.c,.a>.b.d {
    /*......*/
}
```

例子中的“ .b.d ”，表示选中的元素必须同时具有 b 和 d 两个 class。

复杂选择器是针对节点关系的选择，它规定了五种连接符号。

- **“空格”**：后代，表示选中所有符合条件的后代节点， 例如“ .a .b ”表示选中所有具
  有 class 为 a 的后代节点中 class 为 b 的节点。
- **“>”** ：子代，表示选中符合条件的子节点，例如“ .a>.b ”表示：选中所有“具有
  class 为 a 的子节点中，class 为 b 的节点”。
- **“~”** : 后继，表示选中所有符合条件的后继节点，后继节点即跟当前节点具有同一个
  父元素，并出现在它之后的节点，例如“ .a~.b ”表示选中所有具有 class 为 a 的后继
  中，class 为 b 的节点。
- **“+”**：直接后继，表示选中符合条件的直接后继节点，直接后继节点即
  nextSlibling。例如 “.a+.b ”表示选中所有具有 class 为 a 的下一个 class 为 b 的
  节点。
- **“||”**：列选择器，表示选中对应列中符合条件的单元格。

## 选择器的优先级

> CSS 标准用一个三元组 (a, b, c) 来构成一个复杂选择器的优先级。

- id 选择器的数目记为 a；
- 伪类选择器和 class 选择器的数目记为 b；
- 伪元素选择器和标签选择器数目记为 c；
- “\*” 不影响优先级。

CSS 标准建议用一个足够大的进制，获取“ a-b-c ”来表示选择器优先级。

```
specificity = base * base * a + base * b + c
```

看个常见的例子：

```
<div id="my" class="x y z">text<div>


.x {
    background-color:lightblue;
}
.z {
    background-color:lightblue;
}
.y {
    background-color:lightgreen;
}

输出的是y的颜色
```

在这个例子中，“.x ”和“.z ”都指定了背景色为浅蓝色，但是因为“.y ”规则在最后，所以
最终显示结果为浅绿色。另外一个需要注意的是，选择器的优先级是针对复杂选择器的优先
级，选择器列表不会合并计算优先级。

```
<div id="my" class="x y z">text<div>

.x, .z {
    background-color:lightblue;
}
.y {
    background-color:lightgreen;
}

输出的是y的颜色
```

这里选择器列表“ .x, .z”命中了 div，但是它的两项分别计算优先级，所以最终优先级仍
跟“ .y” 规则相同。

以上就是选择器优先级的相关规则了，虽然我们这里介绍了详细的计算方式，但是我认为选
择器的使用上，如果产生复杂的优先级计算，代码的可读性一定是有问题的。

所以实践中，建议你“根据 id 选单个元素”“class 和 class 的组合选成组元素”“tag 选择
器确定页面风格”这样的简单原则来使用选择器，不要搞出过于复杂的选择器。

## 伪元素

> 伪元素的语法跟伪类相似，但是实际产生的效果却是把不存在的元素硬选出来。

目前兼容性达到可用的伪元素有以下几种。

- ::first-line 元素的第一行
- ::first-letter 元素的第一个字母
- ::before
- ::after

### ::first-line

> 元素的第一行

```
<p>This is a somewhat long HTML
paragraph that will be broken into several
lines. The first line will be identified
by a fictional tag sequence. The other lines
will be treated as ordinary lines in the
paragraph.</p>


p::first-line {
    text-transform: uppercase
}
```

这一段代码把段落的第一行字母变为大写。注意这里的第一行指的是**排版后显示的第一
行**，跟 HTML 代码中的换行无关。

### ::first-letter

> 指第一个字母。首字母变大并向左浮动是一个非常常见的排版方式。

```
<p>This is a somewhat long HTML
paragraph that will be broken into several
lines. The first line will be identified
by a fictional tag sequence. The other lines
will be treated as ordinary lines in the
paragraph.</p>

p::first-letter {
    text-transform: uppercase;
    font-size:2em;
    float:left;
}
```

CSS 标准只要求 ::first-line 和 ::first-letter 实现有限的几个 CSS 属性，都是文本
相关，这些属性是下面这些。<br>
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5bb6b72a446842bc969ff868e38b0836~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5bb6b72a446842bc969ff868e38b0836~tplv-k3u1fbpfcp-watermark.image?)</a>

### ::before ::after

::before 表示在元素内容之前插入一个虚拟的元素，::after 则表示在元素内容之后插入
。

这两个伪元素所在的 CSS 规则必须指定 content 属性才会生效，我们看下例子：

```
<p class="special">I'm real element</p>


p.special::before {
    display: block;
    content: "pseudo! ";
}
```

这里要注意一点，::before 和 ::after 还支持 content 为 counter，如：

```
<p class="special">I'm real element</p>
p.special::before {
    display: block;
    content: counter(chapno, upper-roman) ". ";
}
```

这对于实现一些列表样式是非常有用的。
