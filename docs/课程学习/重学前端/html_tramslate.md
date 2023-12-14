> 替换型元素是把文件的内容引入，替换掉自身位置的一类标签。

#### 为什么 link 一个 CSS 要用 href，而引入 js 要用 src 呢？

凡是替换型元素，都是使用 src 属性来引用文件的，链接型元素是使用 href 标签的。

## script

script 标签的两种用法：

```
<script type="text/javascript">
console.log("Hello world!");
</script>


<script type="text/javascript" src="my.js"></script>
```

这个例子中，我们展示了两种 script 标签的写法，一种是直接把脚本代码写在 script 标
签之间，另一种是把代码放到独立的 js 文件中，用 src 属性引入。

## img

img 标签的作用是引入一张图片。这个标签是没有办法像 script 标签那样作为非替换型标
签来使用的，它必须有 src 属性才有意义。

如果一定不想要引入独立文件，可以使用 data uri，我们来看个实际的例子：

```
 <img src='data:image/svg+xml;charset=utf8,<svg version="1.1" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="100" style="fill:rgb(0,0,255);stroke-width:1;stroke:rgb(0,0,0)"/></svg>'/>
```

这个例子中我们使用了 data uri 作为图片的 src，这样，并没有产生独立的文件，客观上
做到了和内联相同的结果，这是一个常用的技巧。

此处要重点提到一个属性，**alt 属性**，这个属性很难被普通用户感知，对于视障用户非
常重要，可以毫不夸张地讲，给 img 加上 alt 属性，已经做完了可访问性的一半。

img 标签还有一组重要的属性，那就是 **srcset 和 sizes**，它们是 src 属性的升级版
（所以我们前面讲 img 标签必须有 src 属性，这是不严谨的说法）。

这两个属性的作用是在不同的屏幕大小和特性下，使用不同的图片源。下面一个例子也来自
MDN，它展示了 srcset 和 sizes 的用法

```
<img srcset="elva-fairy-320w.jpg 320w,
             elva-fairy-480w.jpg 480w,
             elva-fairy-800w.jpg 800w"
     sizes="(max-width: 320px) 280px,
            (max-width: 480px) 440px,
            800px"
     src="elva-fairy-800w.jpg" alt="Elva dressed as a fairy">
```

srcset 提供了根据屏幕条件选取图片的能力，但是其实更好的做法，是使用 picture 元素
。

## picture

picture 元素可以根据屏幕的条件为其中的 img 元素提供不同的源，它的基本用法如下：

```
<picture>
  <source srcset="image-wide.png" media="(min-width: 600px)">
  <img src="image-narrow.png">
</picture>
```

picture 元素的设计跟 audio 和 video 保持了一致（稍后我会为你讲解这两个元素），它
跟 img 搭配 srcset 和 sizes 不同，它使用 source 元素来指定图片源，并且支持多个。

## video

在 HTML5 早期的设计中，video 标签跟 img 标签类似，也是使用 src 属性来引入源文件
的，不过，我想应该是考虑到了各家浏览器支持的视频格式不同，现在的 video 标签跟
picture 元素一样，也是提倡使用 source 的。

下面例子是一个古典的 video 用法：

```
<video controls="controls" src="movie.ogg">
</video>
```

这个例子中的代码用 src 来指定视频的源文件。但是因为一些历史原因，浏览器对视频的
编码格式兼容问题分成了几个派系，这样，对于一些兼容性要求高的网站，我们使用单一的
视频格式是不合适的。

现在的 video 标签可以使用 **source** 标签来指定接入多个视频源。

```
<video controls="controls" >
  <source src="movie.webm" type="video/webm" >
  <source src="movie.ogg" type="video/ogg" >
  <source src="movie.mp4" type="video/mp4">
  You browser does not support video.
</video>
```

从这个例子中，我们可以看到，source 标签除了支持 media 之外，还可以使用 type 来区
分源文件的使用场景。

video 中还支持一种标签：track。

track 是一种播放时序相关的标签，它最常见的用途就是字幕。track 标签中，必须使用
srclang 来指定语言，此外，track 具有 kind 属性，共有五种。

- subtitles：就是字幕了，不一定是翻译，也可能是补充性说明。
- captions：报幕内容，可能包含演职员表等元信息，适合听障人士或者没有打开声音的人
  了解音频内容。
- descriptions：视频描述信息，适合视障人士或者没有视频播放功能的终端打开视频时了
  解视频内容。
- chapters：用于浏览器视频内容。
- metadata：给代码提供的元信息，对普通用户不可见。

一个完整的 video 标签可能会包含多种 track 和多个 source，这些共同构成了一个视频
播放所需的全部信息。

## audio

跟 picture 和 video 两种标签一样，audio 也可以使用 source 元素来指定源文件。我们
看一下例子：

```
<audio controls>
  <source src="song.mp3" type="audio/mpeg">
  <source src="song.ogg" type="audio/ogg">
  <p>You browser does not support audio.</p>
</audio>
```

但比起 video，audio 元素的历史问题并不严重，所以使用 src 也是没有问题的。

## iframe

> 这个标签能够嵌入一个完整的网，不过，在移动端，iframe 受到了相当多的限制，它无
> 法指定大小，里面的内容会被完全平铺到父级页面上。

同时很多网页也会通过 http 协议头禁止自己被放入 iframe 中。

iframe 标签也是各种安全问题的重灾区。opener、window.name、甚至 css 的 opacity 都
是黑客可以利用的漏洞。

因此，在 2019 年，当下这个时间点，任何情况下我都不推荐在实际开发中用以前的
iframe。当然，不推荐使用是一回事，因为没人能保证不遇到历史代码，我们还是应该了解
一下 iframe 的基本用法：

```
<iframe src="http://time.geekbang.org"></iframe>
```

这个例子展示了古典的 iframe 用法。

在新标准中，为 iframe 加入了 sandbox 模式和 srcdoc 属性，这样，给 iframe 带来了
一定的新场景。我们来看看例子：

```
<iframe sandbox srcdoc="<p>Yeah, you can see it <a href="/gallery?mode=cover&amp;amp;page=1">in my gallery</a>."></iframe>
```

这个例子中，使用 srcdoc 属性创建了一个新的文档，嵌入在 iframe 中展示，并且使用了
sandbox 来隔离。这样，这个 iframe 就不涉及任何跨域问题了。
