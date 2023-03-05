
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fbe92a68cf324537b3ab6665597a4ae3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fbe92a68cf324537b3ab6665597a4ae3~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/914d115b46eb4a1885dd1c723d83ae8c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/914d115b46eb4a1885dd1c723d83ae8c~tplv-k3u1fbpfcp-watermark.image?)</a>

## parse 解析 HTML（HTML ==> DOM 树 + CSSOM 树）
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/447bc4e797554f28ac7c67ae54a2cd1c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/447bc4e797554f28ac7c67ae54a2cd1c~tplv-k3u1fbpfcp-watermark.image?)</a>

### document DOM树
#### 拿到这个 HTML 字符串之后，为了方便操作，将 HTML 转换成对象(树结构),同时也提供了 js 操作 html 的能力
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/92d14d6d15894575a1304ec8068c8636~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/92d14d6d15894575a1304ec8068c8636~tplv-k3u1fbpfcp-watermark.image?)</a>

### CSS DOM树
css 也同理，会生成一个 css DOM树，其中根节点是样式表
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de88d625a96a48759cc831c6438ed930~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de88d625a96a48759cc831c6438ed930~tplv-k3u1fbpfcp-watermark.image?)</a>

#### 样式表:
- 浏览器默认样式表(下面是chrome 源码的默认样式表)
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/95c4068998494d42b37b928ea8ca877d~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/95c4068998494d42b37b928ea8ca877d~tplv-k3u1fbpfcp-watermark.image?)</a>
- `<link xxx>` 外部样式表`
- `<style>` 内部样式表
- `stlye` 内联样式表(行内样式表)

可以通过 `document.styleSheets` 获取网页下的所有样式表，也可以操作样式表

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4ccdb0efe75546c98e16d91f69efcd6e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4ccdb0efe75546c98e16d91f69efcd6e~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/be4fc351bbac44e6b2da6a11e9be4c07~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/be4fc351bbac44e6b2da6a11e9be4c07~tplv-k3u1fbpfcp-watermark.image?)</a>

### HTML 解析过程
#### HTML解析遇到 CSS 
为了提高解析效率，**浏览器会启动一个预解析器先先下载和解析 CSS** （生成 css DOM 还是交给渲染主线程，只是帮忙做一些解析工作）,**CSS 解析是在另一个线程上执行，因此 CSS 不会阻塞HTML的解析**

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/07741e3122f34c1d826d8c9072131d35~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/07741e3122f34c1d826d8c9072131d35~tplv-k3u1fbpfcp-watermark.image?)</a>

HTML解析遇到 CSS 总结：
- 解析过程中遇到 CSS 解析 CSS，遇到 JS 解析 JS。为了提高效率，浏览器在开始解析前，会启动一个预解析的线程，率先下载 HTML 中的外部 CSS 文件和外部的 JS 文件。
- 如果主线程解析到 `link` 位置，此时外部的 CSS 文件还没有下载解析好，主线程不会等待，继续解析后续的 HTML。这是因为 CSS 的下载和解析是在预解析线程中进行的。这就是 CSS 不会阻塞 HTML 解析的根本原因

#### HTML解析遇到 JS    
- 渲染主线程遇到 JS 时**必须暂停一切行为，等待下载执行完后才能继续**，因为 JS 代码有可能会改动 HTML上的 DOM 元素
- 预解析线程可以分担一点下载 jS 任务

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/140d83e032da44689d90a778024974bf~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/140d83e032da44689d90a778024974bf~tplv-k3u1fbpfcp-watermark.image?)</a>

HTML解析遇到 JS 总结：
- 当主线程解析到 `script` 位置时，会停止解析 HTML，等待 JS 文件下载并将全局代码解析执行完成后，才能继续解析 HTML。
- 这是因为 JS 代码的执行过程可能会修改当前的 DOM 树，所以 DOM 树的生成必须暂停。这就是 JS 阻塞 HTML 解析的根本原因。

**HTML 解析完成后，会得到 DOM 树和 CSSOM 树**，浏览器的默认样式、内部样式、外部样式、行内样式都会包含在 CSSOM 树中。

## style 样式计算 （DOM 树 + CSSOM 树 ==> Computed DOM 树）
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b0f69acb44f64d4cbb7f5d54c57bf731~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b0f69acb44f64d4cbb7f5d54c57bf731~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e55c97777d0d402785c3eb19531fb42a~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e55c97777d0d402785c3eb19531fb42a~tplv-k3u1fbpfcp-watermark.image?)</a>

获取所有计算好的样式 `getComputedStyle`

总结：
- 在样式计算中，主线程会遍历得到的 DOM 树，依次为树中的每个节点计算出它最终的样式，称之为 `Computed Style`
- 在这一过程中，很多预设值会变成绝对值，比如 `red` 会变成 `rgb(255,0,0)`，相对单位会变成绝对单位，比如 `em` 会变成 `px`
- 这一步完成后，会得到一颗带有样式的 DOM 树。

## layout 布局 （Computed DOM 树 ==> 布局树）
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/465028eb54ad418696e8928ca94b3123~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/465028eb54ad418696e8928ca94b3123~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6de297d1134602ac0322322c3b85fd~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5c6de297d1134602ac0322322c3b85fd~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 布局阶段会依次遍历 DOM 树（样式计算后得到的 DOM 树）的每一个节点，计算每个节点的几何信息。例如节点的宽高，相对包含块的位置。
- 大部分时候，**DOM 树和布局树并非一一对应**
- 比如 `display:none` 的节点没有几何信息，因此不会生成到布局树，又比如使用了伪元素选择器，虽然 DOM 树中不存在这些伪元素节点，但它拥有几何信息，所以会生成到布局树中。还有匿名行盒、匿名块盒等等都会导致 DOM 树和布局树无法一一对应。

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c766cd5044644dd0a1eeef950b4d061e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c766cd5044644dd0a1eeef950b4d061e~tplv-k3u1fbpfcp-watermark.image?)</a>

- 比如说 `<head><>link>` 标签等，是被隐藏的，因为浏览器默认让它隐藏。

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bca87e9153a24b098bc86965605c5b37~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bca87e9153a24b098bc86965605c5b37~tplv-k3u1fbpfcp-watermark.image?)</a>

- 获取布局树的信息，布局树并不是 DOM 树，它是其它的对象(浏览器C++写的)
```
document.body.clientWidth
```

## layer 分层 （布局树 ==> 分层）
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/486e6f06f869409186654030be2410a6~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/486e6f06f869409186654030be2410a6~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 主线程会使用一套复杂的策略对整个布局树进行分层。
- 分层的好处在于，将来某一个层改变后，仅会对该层进行后续处理，从而提高效率。
- 滚动条、堆叠上下文、transform、opacity 等样式都会或多或少的影响分层结果，也可以通过 `will-change` 属性告诉浏览器这个节点未来将会改变，从而更大程度的影响分层结果。
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9aac9432af9347349656dc27d7c1dd09~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9aac9432af9347349656dc27d7c1dd09~tplv-k3u1fbpfcp-watermark.image?)</a>

## paint 绘制 (分层后 ==> 为每一层生成如何绘制的指令)
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/133ecccc0f484f07a2b8e120035b88b5~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/133ecccc0f484f07a2b8e120035b88b5~tplv-k3u1fbpfcp-watermark.image?)</a>

渲染主线程做到这一步就到此为止，剩余工作交给其它线程完成：

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/83e4e6a97ddd49999f3f53a1325e6024~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/83e4e6a97ddd49999f3f53a1325e6024~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 主线程会为每个层单独绘制指令集，用于描述这一层的内容该如何画出来。


## tiling 分块 (每个图层 ==> 在合成线程中分成多个小区域)
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/571a07d142c540c585b5f46a2844e6a2~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/571a07d142c540c585b5f46a2844e6a2~tplv-k3u1fbpfcp-watermark.image?)</a>

>合成线程也是渲染进程开启的
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/740d4ff850c94827a7d562203dd928a9~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/740d4ff850c94827a7d562203dd928a9~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3c6304dfa7fd45679bd072428ef4e522~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3c6304dfa7fd45679bd072428ef4e522~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 完成绘制后，主线程将每个图层的绘制信息提交个合成线程，剩余工作将由合成线程完成。
- 合成线程首先对每个图层进行分块，将其划分为更多的小区域。
- 它会从线程池中拿取多个线程来完成分块工作

## raster 光栅化 （块 ==> 在GPU进程中将每个块变成位图）
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/528002e1456f419b8d722403eec6c3fd~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/528002e1456f419b8d722403eec6c3fd~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cf10f83210f0438da4a27caf3cd624cc~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cf10f83210f0438da4a27caf3cd624cc~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/46028b0a10c044ffabf3c7effacb2601~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/46028b0a10c044ffabf3c7effacb2601~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 分块完成后，进入光栅化阶段。
- 合成线程会将块信息交给 GPU 进程，以极高的速度完成光栅化。
- GPU 进程会开启多个线程来完成光栅化，并且优先处理靠近视口区域的块。
- 光栅化的结果，就是一块一块的位图。

## draw 画 (位图 ==> GPU 最终呈现)
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5b0db449c0db4205bf243c936c768eb7~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5b0db449c0db4205bf243c936c768eb7~tplv-k3u1fbpfcp-watermark.image?)</a>

总结：
- 合成线程拿到每个层、每个块的位图后，生成一个个指引(quad)信息。
- 指引会标识出每个位图应该画到屏幕的哪个位置，以及会考虑到旋转、缩放等变形。**变形发生在合成线程中，与渲染主线程无关，这就是 transform 效率高的本质原因**。
- 合成线程会把 quad 提交给 GPU 进程，由 GPU 进程产生系统调用，提交给 GPU 硬件，完成最终的屏幕成像。

## 完整过程
渲染主线程：

HTML ==> DOM 树 + CSSOM 树 ==> Computed DOM 树(样式计算后) ==> 布局树 ==> 分层 ==> 绘制(为每一层生成如何绘制的指令)

合成线程：
分块(每个图层 ==> 在合成线程中分成多个小区域) 

GPU:
光栅化(块 ==> 在GPU进程中将每个块变成位图) ==> 画(最终呈现)

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dfb90e8ccdab48a1be7c079922b1d8af~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dfb90e8ccdab48a1be7c079922b1d8af~tplv-k3u1fbpfcp-watermark.image?)</a>

## 常见问题
### 什么是 reflow（回流）？
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b9074bb1a7e48c998d2013f883e6d70~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b9074bb1a7e48c998d2013f883e6d70~tplv-k3u1fbpfcp-watermark.image?)</a>

- reflow 的本质就是改变了 CSSOM 树，进而改变了Computed DOM 树(样式计算后生成的树)，导致需要重新计算 layout 树。
- 为了避免连续的多次操作导致布局树的反复计算，浏览器会合并这些操作，当 JS 代码全部完成后再进行统一计算。所以，**改动属性造成的 reflow 是异步完成的**。
- 为了避免 JS 获取布局信息无法及时获取最新的布局信息，浏览器会在**获取属性立即 reflow**

### 什么是 repaint (重绘)？
<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/08df54b4a7e14b788bad68d2293f1813~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/08df54b4a7e14b788bad68d2293f1813~tplv-k3u1fbpfcp-watermark.image?)</a>

- 重绘的本质改变了计算样式树，但**布局树未改动，就是重新根据分层信息计算了绘制指令**，比如只改变 dom 的可见样式（颜色）
- 由于元素的布局信息也属于可见样式，所以 reflow 一定会引起 repaint。

### 为什么 transform 效率高？
<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/412dcf031167408cb93feeeafc2091c4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/412dcf031167408cb93feeeafc2091c4~tplv-k3u1fbpfcp-watermark.image?)</a>

- 因为 transform 既不胡影响布局也不会影响绘制指令，**它影响的只是渲染流程的最后一个 draw 阶段**。
- 由于 draw 阶段在合成线程中，所以 transform 的变化几乎不会影响渲染主线程。反之，渲染主线程无论如何忙碌，甚至卡死，也不会影响 transform 的变化。所以 transform 的效率高。