[jquery中文文档地址](https://www.jquery123.com/)

## 选择器
### 基本选择器
![fGuB4g.png](https://z3.ax1x.com/2021/08/09/fGuB4g.png)

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
![fGu6vn.png](https://z3.ax1x.com/2021/08/09/fGu6vn.png)

### 可见性选择器
![fGuo8J.png](https://z3.ax1x.com/2021/08/09/fGuo8J.png)

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
![fGujUO.png](https://z3.ax1x.com/2021/08/09/fGujUO.png)

### 表单对象选择器
![fGKp2d.png](https://z3.ax1x.com/2021/08/09/fGKp2d.png)

## 属性操作
![fGKEa8.png](https://z3.ax1x.com/2021/08/09/fGKEa8.png)

![fGKn2j.png](https://z3.ax1x.com/2021/08/09/fGKn2j.png)

![fGKQrq.png](https://z3.ax1x.com/2021/08/09/fGKQrq.png)

![fGKlq0.png](https://z3.ax1x.com/2021/08/09/fGKlq0.png)

## 内容由上往下顺序显示
![fGKGIU.png](https://z3.ax1x.com/2021/08/09/fGKGIU.png)

## 动画
![fGKUz9.png](https://z3.ax1x.com/2021/08/09/fGKUz9.png)

![fGKws1.png](https://z3.ax1x.com/2021/08/09/fGKws1.png)

### 自定义动画
![fGK0qx.png](https://z3.ax1x.com/2021/08/09/fGK0qx.png)

![fGM9FU.png](https://z3.ax1x.com/2021/08/09/fGM9FU.png)

![fGMmTK.png](https://z3.ax1x.com/2021/08/09/fGMmTK.png)