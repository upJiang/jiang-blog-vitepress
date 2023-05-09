## 行内元素有哪些？块级元素有哪些？ 空(void)元素有哪些？
```
行内元素：span、img、input...
块级元素：div、footer、header、section、p、h1...h6...
空元素：br、hr...

元素之间的转换问题：
display: inline;  			把某元素转换成了行内元素      ===>不独占一行的，并且不能设置宽高
display: inline-block; 	把某元素转换成了行内块元素		  ===>不独占一行的，可以设置宽高
display: block;					把某元素转换成了块元素	  ===>独占一行，并且可以设置宽高
```

## CSS选择符有哪些？哪些属性可以继承？
```
CSS选择符：
    通配（*）
    id选择器（#）
    类选择器（.）
    标签选择器（div、p、h1...）
    相邻选择器(+)
    后代选择器(ul li)
    子元素选择器（ > ）
    属性选择器(a[href])
    
CSS属性哪些可以继承：
		文字系列：font-size、color、line-height、text-align...
***不可继承属性：border、padding、margin...
```

## CSS优先级算法如何计算？
```
优先级比较：!important > 内联样式 > id > class > 标签 > 通配

CSS权重计算：
第一：内联样式（style）  权重值:1000
第二：id选择器  				 权重值:100
第三：类选择器 				  权重值:10
第四：标签&伪元素选择器   权重值:1
第五：通配、>、+         权重值:0
```

## 用CSS画一个三角形
```
{
    width: 0;
    height: 0;

    border-left:100px solid transparent;
    border-right:100px solid transparent;
    border-top:100px solid transparent;
    border-bottom:100px solid #ccc;
}
```

## ::before 和 :before 中双冒号和单冒号 有什么区别？
单冒号 : 是伪类
双冒号是 :: 伪元素

- 在 `CSS` 中伪类一直用 : 表示，如 `:hover, :active` 等
- 伪元素在 `CSS1` 中已存在，当时语法是用 : 表示，如 `:before` 和 `:after`
- 后来在 `CSS3` 中修订，伪元素用 :: 表示，如 `::before` 和 `::after`，以此区分伪元素和伪类
- 由于低版本 IE 对双冒号不兼容，开发者为了兼容性各浏览器，继续使使用 `:after` 这种老语法表 示伪元素。

## ios 系统中元素被触摸时产生的半透明灰色遮罩怎么去掉
```
<style>
	a,button,input,textarea{
		-webkit-tap-highlight-color: rgba(0,0,0,0);
	}
</style>
```

## 禁止 ios 长按时触发系统的菜单，禁止 ios & android 长按时下载图片
```
html,body{
	touch-callout: none;
	-webkit-touch-callout: none;
	
	user-select:none;
	-webkit-user-select:none;
}
```

## 禁止 ios 和 android 用户选中文字
```
html,body{
	user-select:none;
	-webkit-user-select:none;
}
```
## CSS的盒模型
```
在HTML页面中的所有元素都可以看成是一个盒子
盒子的组成：内容content、内边距padding、边框border、外边距margin
盒模型的类型：
    标准盒模型
        margin + border + padding + content
    IE盒模型
        margin + content(border + padding)
控制盒模型的模式：box-sizing:content-box（默认值，标准盒模型）、border-box（IE盒模型）;
```