## 正常流

**我们可以用一句话来描述正常流的排版行为，那就是：依次排列，排不下了换行。**

## 正常流的原理

在 CSS 标准中，规定了如何排布每一个文字或者盒的算法，这个算法依赖一个排版的“当前
状态”，CSS 把这个当前状态称为“格式化上下文（formatting context）”。

我们可以认为排版过程是这样的：

- 格式化上下文 + 盒 / 文字 = 位置
- formatting context + boxes/charater = positions

当我们要把正常流中的一个盒或者文字排版，需要分成三种情况处理。

- **当遇到块级盒**：排入块级格式化上下文。
- **当遇到行内级盒或者文字**：首先尝试排入行内级格式化上下文，如果排不下，那么创
  建一个行盒，先将行盒排版（行盒是块级，所以到第一种情况），行盒会创建一个行内级
  格式化上下文。
- **遇到 float 盒**：把盒的顶部跟当前行内级上下文上边缘对齐，然后根据 float 的方
  向把盒的对应边缘对到块级格式化上下文的边缘，之后重排当前行盒。

我们以上讲的都是一个块级格式化上下文中的排版规则，实际上，页面中的布局没有那么简
单，一些元素会在其内部创建新的块级格式化上下文，这些元素有

- 浮动元素；
- 绝对定位元素；
- 非块级但仍能包含块级元素的容器（如 inline-blocks, table-cells,
  table-captions）；
- 块级的能包含块级元素的容器，且属性 overflow 不为 visible。

写一个自适应宽

```
<div class="outer">
    <div class="fixed"></div>
    <div class="auto"></div>
</div>


.fixed {
    display:inline-block;
    vertical-align:top;
}
.auto {
    margin-left:-200px;
    padding-left:200px;
    box-sizing:border-box;
    width:100%;
    display:inline-block;
    vertical-align:top;
}
```
