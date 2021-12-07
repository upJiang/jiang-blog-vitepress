>HTML 中，链接有两种类型。一种是超链接型标签，一种是外部资源链接。

链接的家族中有 a 标签、area 标签和 link 标签。


![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5155254ec926497cbb10d9f04ac9e31e~tplv-k3u1fbpfcp-watermark.image?)

## link 标签
link 标签也是元信息的一种，在很多时候，它也是不会对浏览器产生任何效果的，link 标签会生成一个链接，它可能生成超链接，也可能生成外部资源链接（唯一一个会生成外部资源链接的链接）。

link 标签的链接类型主要通过 rel 属性来区分

### 超链接类 link 标签
>超链接型 link 标签是一种被动型链接，在用户不操作的情况下，它们不会被主动下载。

ink 标签具有特定的 rel 属性，会成为特定类型的 link 标签。产生超链接的 link 标签包括：具有 rel=“canonical” 的 link、具有 rel="alternate"的 link、具有 rel=“prev” rel="next"的 link 等等。

#### canonical 型 link
```
<link rel="canonical" href="...">
```
这个标签提示页面它的主 URL，在网站中常常有多个 URL 指向同一页面的情况，搜索引擎访问这类页面时会去掉重复的页面，这个 link 会提示搜索引擎保留哪一个 URL。
#### alternate 型 link
```
<link rel="alternate" href="...">
```
这个标签提示页面它的变形形式，这个所谓的变形可能是当前页面内容的不同格式、不同语言或者为不同的设备设计的版本，这种 link 通常也是提供给搜索引擎来使用的。

alternate 型的 link 的一个典型应用场景是，页面提供 rss 订阅时，可以用这样的 link 来引入：
```
<link rel="alternate" type="application/rss+xml" title="RSS" href="...">
```

#### prev 型 link 和 next 型 link
>在互联网应用中，很多网页都属于一个序列，比如分页浏览的场景，或者图片展示的场景，每个网页是序列中的一个项。

这种时候，就适合使用 prev 和 next 型的 link 标签，来告诉搜索引擎或者浏览器它的前一项和后一项，这有助于页面的批量展示。

因为 next 型 link 告诉浏览器“这是很可能访问的下一个页面”，HTML 标准还建议对 next 型 link 做预处理
#### 其它超链接类的 link
其它超链接类 link 标签都表示一个跟当前文档相关联的信息，可以把这样的 link 标签视为一种带链接功能的 meta 标签。

- rel=“author” 链接到本页面的作者，一般是 mailto: 协议
- rel=“help” 链接到本页面的帮助页
- rel=“license” 链接到本页面的版权信息页
- rel=“search” 链接到本页面的搜索页面（一般是站内提供搜索时使用）

### 外部资源类 link 标签
外部资源型 link 标签会被主动下载，并且根据 rel 类型做不同的处理。外部资源型的标签包括：具有 icon 型的 link、预处理类 link、modulepreload 型的 link、stylesheet、pingback。

#### icon 型 link
>这类链接表示页面的 icon。多数浏览器会读取 icon 型 link，并且把页面的 icon 展示出来。

icon 型 link 是唯一一个外部资源类的元信息 link，其它元信息类 link 都是超链接，这意味着，icon 型 link 中的图标地址默认会被浏览器下载和使用。

如果没有指定这样的 link，多数浏览器会使用域名根目录下的 favicon.ico，即使它并不存在，所以从性能的角度考虑，**建议一定要保证页面中有 icon 型的 link**。

只有 icon 型 link 有有效的 sizes 属性，HTML 标准允许一个页面出现多个 icon 型 link，并且用 sizes 指定它适合的 icon 尺寸。

#### 预处理类 link
>我们都知道，导航到一个网站需要经过 dns 查询域名、建立连接、传输数据、加载进内存和渲染等一系列的步骤。

预处理类 link 标签就是允许我们控制浏览器，提前针对一些资源去做这些操作，以提高性能（当然如果你乱用的话，性能反而更差）。

列一下这些 link 类型：
- dns-prefetch 型 link 提前对一个域名做 dns 查询，这样的 link 里面的 href 实际上只有域名有意义。
- preconnect 型 link 提前对一个服务器建立 tcp 连接。
- prefetch 型 link 提前取 href 指定的 url 的内容。
- preload 型 link 提前加载 href 指定的 url。
- prerender 型 link 提前渲染 href 指定的 url。

#### modulepreload 型的 link
>modulepreload 型 link 的作用是预先加载一个 JavaScript 的模块。这可以保证 JS 模块不必等到执行时才加载。

这里的所谓加载，是指完成下载并放入内存，并不会执行对应的 JavaScript。
```
<link rel="modulepreload" href="app.js">
<link rel="modulepreload" href="helpers.js">
<link rel="modulepreload" href="irc.js">
<link rel="modulepreload" href="fog-machine.js">
<script type="module" src="app.js">
```
这个例子来自 HTML 标准，我们假设 app.js 中有 import “irc” 和 import “fog-machine”, 而 irc.js 中有 import “helpers”。这段代码使用 moduleload 型 link 来预加载了四个 js 模块。

尽管，单独使用 script 标签引用 app.js 也可以正常工作，但是我们通过加入对四个 JS 文件的 link 标签，使得四个 JS 文件有机会被并行地下载，这样提高了性能。

#### stylesheet 型 link
```
<link rel="stylesheet" href="xxx.css" type="text/css">
```
基本用法是从一个 CSS 文件创建一个样式表。**这里 type 属性可以没有，如果有，必须是"text/css"才会生效**。

rel 前可以加上 alternate，成为 rel=“alternate stylesheet”，此时必须再指定 title 属性。

这样可以为页面创建一份变体样式，一些浏览器，如 Firefox 3.0，支持从浏览器菜单中切换这些样式，当然了，大部分浏览器不支持这个功能，所以仅仅从语义的角度了解一下这种用法即可。

#### pingback 型 link
这样的 link 表示本网页被引用时，应该使用的 pingback 地址，这个机制是一份独立的标准，遵守 pingback 协议的网站在引用本页面时，会向这个 pingback url 发送一个消息。

## a 标签
>a 标签是“anchor”的缩写，它是锚点的意思，所谓锚点，实际上也是一种比喻的用法，古代船舶用锚来固定自己的位置，避免停泊时被海浪冲走，所以 anchor 标签的意思也是标识文档中的特定位置。

a 标签其实同时充当了链接和目标点的角色，当 a 标签有 href 属性时，它是链接，当它有 name 时，它是链接的目标。

具有 href 的 a 标签跟一些 link 一样，会产生超链接，也就是在用户不操作的情况下，它们不会被主动下载的被动型链接。

重点的内容是，a 标签也可以有 rel 属性，我们来简单了解一下，首先是跟 link 相同的一些 rel，包括下面的几种。
- alternate
- author
- help
- license
- next
- prev
- search

这些跟 link 语义完全一致，不同的是，a 标签产生的链接是会实际显示在网页中的，而 link 标签仅仅是元信息。

除了这些之外，a 标签独有的 rel 类型：
- tag 表示本网页所属的标签；
- bookmark 到上级章节的链接。

a 标签还有一些辅助的 rel 类型，用于提示浏览器或者搜索引擎做一些处理：
- nofollow 此链接不会被搜索引擎索引；
- noopener 此链接打开的网页无法使用 opener 来获得当前页面的窗口；
- noreferrer 此链接打开的网页无法使用 referrer 来获得当前页面的 url；
- opener 打开的网页可以使用 window.opener 来访问当前页面的 window 对象，这是 a 标签的默认行为。

a 标签基本解决了在页面中插入文字型和整张图片超链接的需要，但是如果我们想要在图片的某个区域产生超链接，那么就要用到另一种标签了——area 标签。

## area 标签
>area 标签与 a 标签非常相似，不同的是，它不是文本型的链接，而是**区域型的链接**。

area 标签支持的 rel 与 a 完全一样

area 是整个 html 规则中唯一支持非矩形热区的标签，它的 shape 属性支持三种类型。
- 圆形：circle 或者 circ，coords 支持三个值，分别表示中心点的 x,y 坐标和圆形半径 r。
- 矩形：rect 或者 rectangle，coords 支持两个值，分别表示两个对角顶点 x1，y1 和 x2，y2。
- 多边形：poly 或者 polygon，coords 至少包括 6 个值，表示多边形的各个顶点。

因为 area 设计的时间较早，所以不支持含有各种曲线的路径，但是它也是唯一一个支持了非矩形触发区域的元素，所以，对于一些效果而言，area 是必不可少的。

area 必须跟 img 和 map 标签配合使用。使用示例如下（例子来自 html 标准）。
```
<p>
 Please select a shape:
 <img src="shapes.png" usemap="#shapes"
      alt="Four shapes are available: a red hollow box, a green circle, a blue triangle, and a yellow four-pointed star.">
 <map name="shapes">
  <area shape=rect coords="50,50,100,100"> <!-- the hole in the red box -->
  <area shape=rect coords="25,25,125,125" href="red.html" alt="Red box.">
  <area shape=circle coords="200,75,50" href="green.html" alt="Green circle.">
  <area shape=poly coords="325,25,262,125,388,125" href="blue.html" alt="Blue triangle.">
  <area shape=poly coords="450,25,435,60,400,75,435,90,450,125,465,90,500,75,465,60"
        href="yellow.html" alt="Yellow star.">
 </map>
</p>
```
这个例子展示了在一张图片上画热区并且产生链接，分别使用了矩形、圆形和多边形三种 area。


