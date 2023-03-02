
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



