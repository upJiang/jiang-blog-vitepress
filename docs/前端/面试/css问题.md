## 行内元素有哪些？块级元素有哪些？ 空(void)元素有哪些？
```
行内元素：span、img、input...
块级元素：div、footer、header、section、p、h1...h6...
空元素：br、hr...

元素之间的转换问题：
display: inline;  			把某元素转换成了行内元素      ===>不独占一行的，并且不能设置宽高
display: inline-block; 	把某元素转换成了行内块元素		 ===>不独占一行的，可以设置宽高
display: block;					把某元素转换成了块元素			   ===>独占一行，并且可以设置宽高
```