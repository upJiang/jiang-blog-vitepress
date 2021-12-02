[jquery中文文档地址](https://www.jquery123.com/)

## 选择器
### 基本选择器

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/314f7fe64646435a9fc47ed526df4071~tplv-k3u1fbpfcp-watermark.image?)

### 筛选选择器
```
#a li:first  第一个
#a li:last  最后一个
#a li:eq(0)  选择第几个
#a li:gt(2)  从第三个开始
#a li:lt(2)  小于3之前的 
#a li:odd  偶数个
#a li:even  奇数个
#a li:not(.item)  在a的li中排除掉class为item的
:first 前面啥都不写 等同于 *:first
:header 选择所有的h标签
:focus 获取焦点的标签 如input:focus
:root 根元素，其实就是html标签，body
:target 锚点指向的元素 即页面url中 地址后面#aaa 中的aaa标签
:lang(zh)  指定语言
```

### 内容选择器

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/371a1ff258f242af9caebdd45d8285eb~tplv-k3u1fbpfcp-watermark.image?)

### 可见性选择器

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8229ea3a22d94ce1821c0aae068b88e3~tplv-k3u1fbpfcp-watermark.image?)

### 属性选择器  img[alt]
```
[attrName] 包含这个属性就行
[attrName=value] 等于
[attrName！=value] 不等于
[attrName^=value] 以value开头
[attrName$=value] 以value结尾
[attrName*=value] 包含有value的
[][][]   多个属性
```

### 子元素选择器 $(#a li:first-child)
```
在一个标签下的所有节点
:first-child  第一个
:last-child 最后一个
:nth-child(index)  从1开始
:nth-last-child(index)  末尾第1个开始
:only-child  只有一个（li）标签

在一个标签下的所有相同节点（li）
:first-of-type
。。。同上
```
### 表单选择器
![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1a243cf786694abc944ca28e65b3016d~tplv-k3u1fbpfcp-watermark.image?)

### 表单对象选择器
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1d9779b90f4a4b009a30e9205ff85121~tplv-k3u1fbpfcp-watermark.image?)

## 属性操作
![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7a3c914a37674824942cdf449a470a34~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8c6ef7e8c26e498d95a94bfa5a0c35d0~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/74ac91180560498f8c5593614db4cb6f~tplv-k3u1fbpfcp-watermark.image?)


![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fb11b16b846f42cc8d01f5a3cc53dcff~tplv-k3u1fbpfcp-watermark.image?)

## 内容由上往下顺序显示

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/611f7bd3fb4646c8885f433eff136116~tplv-k3u1fbpfcp-watermark.image?)

## 动画

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b13008710a81487b87141c374722ce24~tplv-k3u1fbpfcp-watermark.image?)


![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fe795160768c4dd2abd63162dc3a03ca~tplv-k3u1fbpfcp-watermark.image?)

### 自定义动画

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5e5bb16e19974b5aa6f60f8c0aab9567~tplv-k3u1fbpfcp-watermark.image?)


![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a43a55647d8844be93d4f6f8af43f6f9~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e9edffae8980460e995b74f203e645d0~tplv-k3u1fbpfcp-watermark.image?)