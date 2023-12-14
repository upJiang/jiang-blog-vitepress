## 语义标签

#### HTML 的有些标签实际上就是必要的，甚至必要的程度可以达到：如果没有这个标签，文字会产生歧义的程度。em，强调标签

```
今天我吃了一个<em>苹果</em>。
今天我吃了<em>一个</em>苹果。
```

#### 作为标题摘要的语义类标签

从 HTML 5 开始，我们有了 section 标签，这个标签可不仅仅是一个“有语义的 div”，它
会改变 h1-h6 的语义。section 的嵌套会使得其中的 h1-h6 下降一级，因此，在 HTML5
以后，我们只需要 section 和 h1 就足以形成文档的树形结构：

```
<section>
    <h1>HTML语义</h1>
    <p>balah balah balah balah</p>
    <section>
        <h1>弱语义</h1>
        <p>balah balah</p>
    </section>
    <section>
        <h1>结构性元素</h1>
        <p>balah balah</p>
    </section>
......
</section>
```

这段代码同样会形成前面例子的标题结构：

- HTML 语义
  - 弱语义
  - 结构性元素

#### 作为整体结构的语义类标签

我们正确使用整体结构类的语义标签，可以让页面对机器更友好。比如，这里一个典型的
body 类似这样：

```
<body>
    <header>
        <nav>
            ……
        </nav>
    </header>
    <aside>
        <nav>
            ……
        </nav>
    </aside>
    <section>……</section>
    <section>……</section>
    <section>……</section>
    <footer>
        <address>……</address>
    </footer>
</body>
```

- header，如其名，通常出现在前部，表示导航或者介绍性的内容。
- footer，通常出现在尾部，包含一些作者信息、相关链接、版权信息等。

header 和 footer 一般都是放在 article 或者 body 的直接子元素，但是标准中并没有明
确规定，footer 也可以和 aside，nav，section 相关联（header 不存在关联问题）。

- aside 表示跟文章主体不那么相关的部分，它可能包含导航、广告等工具性质的内容。

aside 很容易被理解为侧边栏，实际上二者是包含关系，侧边栏是 aside，aside 不一定是
侧边栏。

aside 和 header 中都可能出现导航（nav 标签），二者的区别是，header 中的导航多数
是到文章自己的目录，而 aside 中的导航多数是到关联页面或者是整站地图。

最后 footer 中包含 address，这是个非常容易被误用的标签。address 并非像 date 一样
，表示一个给机器阅读的地址，而是表示“文章（作者）的联系方式”，address 明确地只关
联到 article 和 body。
