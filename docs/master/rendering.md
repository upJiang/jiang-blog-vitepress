
<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fbe92a68cf324537b3ab6665597a4ae3~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fbe92a68cf324537b3ab6665597a4ae3~tplv-k3u1fbpfcp-watermark.image?)</a>

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/914d115b46eb4a1885dd1c723d83ae8c~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/914d115b46eb4a1885dd1c723d83ae8c~tplv-k3u1fbpfcp-watermark.image?)</a>

## 解析 HTML
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

