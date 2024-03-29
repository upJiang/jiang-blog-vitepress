## vue-cropper

vue-cropper 插件会根据设备的缩放比输出结果图片

需要设置参数 high

```
:cropperData="{
    autoCrop: true, // 是否默认生成截图框
    autoCropWidth: 351, // 默认生成截图框宽度
    autoCropHeight: 130, // 默认生成截图框高度
    enlarge: 2, // 截图比例
    fixedBox: true, // 是否开启截图框宽高固定比例
    infoTrue: true,
    high: false, //是否按照设备的dpr 输出等比例图片，必须为false，否则会根据设备变化
}"

```

## 添加 keepalive 的页面偶然会出现 Node.insertBefore: Argument 1 is not an object

解决方案：升级 vite 版本，vite 旧版本在打包模式在 production 会出现问题<br>
[参考这个](https://juejin.cn/post/7070365788485468191)，在使用 keepAlive 的页面
使用单根，用 div 包裹整个 template

## unplugin-vue-components 自动导入导致开发加载缓慢，一直 dependencies updated, reloading page

解决方案：安装 yarn add vite-plugin-optimize-persist vite-plugin-package-config
-D。会自动在 package.json 生成好依赖，其实就是利用
`optimizeDeps: {include: ["xxx"];}`这个 vite 配置预构建

## 原生复制功能 navigator.clipboard Cannot read property 'writeText' of undefined

直接使用这个方式

```
const copyToClipboard = (textToCopy: string) => {
  // 创建text area
  let textArea = document.createElement("textarea");
  textArea.value = textToCopy;
  // 使text area不在viewport，同时设置不可见
  textArea.style.position = "absolute";
  textArea.style.opacity = "0";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise((res, rej) => {
    // 执行复制命令并移除文本框
    document.execCommand("copy") ? res("success") : rej();
    textArea.remove();
  });
};
```
