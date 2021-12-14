这章主要来看两个过程：如何解析请求回来的 HTML 代码，DOM 树又是如何构建的。


<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/409000ffc25044b79ee8e7a15254cf6c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/409000ffc25044b79ee8e7a15254cf6c~tplv-k3u1fbpfcp-watermark.image?)</a>

## 解析代码
HTML 的结构不算太复杂，我们日常开发需要的 90% 的“词”（指编译原理的术语 token，表示最小的有意义的单元），种类大约只有标签开始、属性、标签结束、注释、CDATA 节点几种。

实际上有点麻烦的是，由于 HTML 跟 SGML 的千丝万缕的联系，我们需要做不少容错处理。“

### 1. 词（token）是如何被拆分的
首先我们来看看一个非常标准的标签，会被如何拆分：
```
<p class="a">text text text</p>
```
可以把这段代码依次拆成词（token）：
- `<p “标签开始”的开始`；
- class=“a” 属性；
- `> “标签开始”`的结束；
- text text text 文本；
- `</p>`标签结束。

这是一段最简单的例子，类似的还有什么呢？现在我们可以来来看看这些词（token）长成啥样子：

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cdc2871ef465415e9ab0667b24773fea~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cdc2871ef465415e9ab0667b24773fea~tplv-k3u1fbpfcp-watermark.image?)</a>

根据这样的分析，现在我们讲讲浏览器是如何用代码实现，我们设想，代码开始从 HTTP 协议收到的字符流读取字符。

在接受第一个字符之前，我们完全无法判断这是哪一个词（token），不过，随着我们接受的字符越来越多，拼出其他的内容可能性就越来越少。

比如，假设我们接受了一个字符“ < ” 我们一下子就知道这不是一个文本节点啦。

之后我们再读一个字符，比如就是 x，那么我们一下子就知道这不是注释和 CDATA 了，接下来我们就一直读，直到遇到“>”或者空格，这样就得到了一个完整的词（token）了。

实际上，我们每读入一个字符，其实都要做一次决策，而且这些决定是跟“当前状态”有关的。在这样的条件下，浏览器工程师要想实现把字符流解析成词（token），最常见的方案就是使用状态机。

### 2. 状态机
绝大多数语言的词法部分都是用状态机实现的。那么我们来把部分词（token）的解析画成一个状态机看看：

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ac1971a5f69541f281ed139b55506a69~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ac1971a5f69541f281ed139b55506a69~tplv-k3u1fbpfcp-watermark.image?)</a>