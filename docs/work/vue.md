## vue-cropper
vue-cropper 插件会根据设备的缩放比输出结果图片

需要设置参数high
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