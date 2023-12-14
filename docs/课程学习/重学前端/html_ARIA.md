ARIA 全称为 Accessible Rich Internet Applications，它表现为一组属性，是用于可访
问性的一份标准。关于可访问性，它被提到最多的，就是它可以为视觉障碍用户服务，但是
，这是一个误解。

实际上，可访问性其实是一个相当大的课题，它的定义包含了各种设备访问、各种环境、各
种人群访问的友好性。不单单是永久性的残障人士需要用到可访问性，健康的人也可能在特
定时刻处于需要可访问性的环境。

**role** 的作用是描述一个非标准的 tag 的实际作用。比如用 div 做 button，那么设置
div 的 role="button"，辅助工具就可以认出这实际上是个 button。

**aria** 的意思是 Accessible Rich Internet Application，aria-\* 的作用就是描述这
个 tag 在可视化的情境中的具体信息。比如：

```
<div role="checkbox" aria-checked="checked"></div>
```

辅助工具就会知道，这个 div 实际上是个 checkbox 的角色，为选中状态。

#### aria-label

正常情况下，会在表单里给 input 组件指定对应的 label，当用户 tab 到输入框时，读屏
软件就会读出相应 label 里的文本。

```
<label for="username">用户名：</label><input type="text" id="username"/>
```

当没有给输入框设计对应的 label 文本的位置时，aria-label 属性为组件指定内置的文本
标签。它不在视觉上呈现。

```
<input type="text" aria-label="用户名"/>
```

此时，当焦点落到该输入框时，读屏软件就会读出 aria-label 里的内容，即"用户名"。
aria-label 只有加在可被 tab 到的元素上，读屏才会读出其中的内容。以下情况，也是可
以读出的：

```
<span tabindex="0″ aria-label="标签提示内容">可被tab的span标签</span>
```

#### aria-labelledby

当想要的标签文本已在其他元素中存在时，可以将其值为该元素的 id。

```
<div role="form" aria-labelledby="form-title">
<span id="form-title">使用手机号码注册</span>
<form>……</form>
</div>
```

表单区添加了 role="form"，当跳转到该区域时，不仅会读出"表单区"，也会读出"使用手
机号码注册"。

如果一个元素同时有 aria-labelledby 和 aria-label，读屏软件会优先读出
aria-labelledby 的内容

## 综述

我们先整体来看看，ARIA 给 HTML 元素添加的一个核心属性就是 role，我们来看一个例子
：

```
<span
    role="checkbox"
    aria-checked="false"
    tabindex="0"
    aria-labelledby="chk1-label">
</span>
<label id="chk1-label">Remember my preferences</label>
```

这里我们给一个 span 添加了 checkbox 角色，这样，表示我们这个 span 被用于
checkbox，这意味着，我们可能已经用 JS 代码绑定了这个 span 的 click 事件，并且以
checkbox 的交互方式来处理用户操作。

同时，ARIA 系统还提供了一系列 ARIA 属性给 checkbox 这个 role，这意味着，我们可以
通过 HTML 属性变化来理解这个 JavaScript 组件的状态，读屏软件等三方客户端，就可以
理解我们的 UI 变化，这正是 ARIA 标准的意义。

role 的定义是一个树形的继承关系，我们先来理解一下它的整体结构：
<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f00966c831d344259a379ee753cbafd5~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f00966c831d344259a379ee753cbafd5~tplv-k3u1fbpfcp-watermark.image?)</a>

其中，widget 表示一些可交互的组件，structure 表示文档中的结构，window 则代表窗体
。

## Widget 角色

这一类角色跟我们桌面开发中的控件类似，它表示一个可交互的组件，它们有：

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7d9683de5be74b0d9a04c91fd07f871e~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7d9683de5be74b0d9a04c91fd07f871e~tplv-k3u1fbpfcp-watermark.image?)</a>
我们这里按照继承关系给出一份列表和简要说明：

<a data-fancybox title="image.png" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/08f6208df2b64874b07bcaf7d2502d47~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/08f6208df2b64874b07bcaf7d2502d47~tplv-k3u1fbpfcp-watermark.image?)</a>
ARIA role 允许多继承，这里有些角色我没有重复写。

注意，这些 role 可以出现在任何一个 HTML 元素之上，同时要注意，这些 ARIA 属性，不
会真实地改变任何一个元素的行为，比如，我们刚才讲的 checkbox，即使我们给一个 span
添加了 Checkbox 角色，我们也需要用 JavaScript 编写相应的逻辑。

这些 widget 同时还会带来对应的 ARIA 属性，比如，我们的 Checkbox 角色，会带来两个
属性：

- aria-checked 表示复选框是否已经被选中；
- aria-labelledby 表示复选框对应的文字。

而 Button 角色，则会带来另外两个属性：

- aria-pressed 按钮是否已经被按下；
- aria-expanded 按钮控制的目标是否已经被展开。

除了它们本身的属性之外，可交互组件还有继承来的属性，比如，switch 角色继承了
checkbox，因此，它也可以使用 aria-checked 属性。

在 WAI-ARIA 标准中，你可以找到所有的角色和对应的属性，我们这里就不一一列举了。

- https://www.w3.org/TR/wai-aria/

很多这些 ARIA 属性都是需要在 JavaScript 中维护的。

如果我们要实现一份组件库，这些 widget role 和它们对应的 aria 属性是非常好的参考
。

如果你是组件的实现者，也希望你在实现组件时把对应的 ARIA 属性自动维护好

除了简单的 widget，还有一些比较复杂的角色，需要多个角色一起配合。我们来逐个了解
一下。

- Combobox 是一个带选项的输入框，我们常见的搜索引擎，一般都会提供这样的输入框，
  当输入时，它会提供若干提示选项。
- Grid 是一个表格，它会分成行、列，行列又有行头和列头表示行、列的意义。
- Tablist 是一个可切换的结构，一般被称为选项卡，它包含了 tab 头和 tabpanel，在
  tab 容器中，可能包含各种组件。
- Listbox 是一个可选中的列表，它内部具有角色为 Option 的选项。
- Menu 是指菜单，菜单中可以加入嵌套的菜单项（Menuitem 角色），除了普通菜单项，还
  可以有 Menuitemcheckbox 带复选框的菜单栏和 Menuitemradio 带单选框的菜单栏。
- Radiogroup 是一组互斥的单选框的容器，它的内部可以由若干个角色为 radio 的单选框
  。
- Tree 是树形控件，它的内部含有 Treeitem 树形控件项，它还有一种升级形式是
  Treegrid。

## structure 角色

结构角色其实跟 HTML5 中不少新标签作用重合了，这里建议优先使用 HTML5 标签。

这部分角色的作用类似于语义化标签，但是内容稍微有些不同，我们这里就不详细讲解了，
仅仅给出一张图供你参考：

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0e9d437311b446aa961a16b164117580~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0e9d437311b446aa961a16b164117580~tplv-k3u1fbpfcp-watermark.image?)</a>
注：separator 在允许焦点时属于组件，在不允许焦点时属于文档结构。

这里我们需要特别提出 Landmark 角色这个概念，Landmark 角色直接翻译是地标，它是
ARIA 标准中总结的 Web 网页中最常见的 8 个结构，Landmark 角色实际上是 section 的
子类，这些角色在生成页面摘要时有很大可能性需要被保留，它们是：

<a data-fancybox title="image.png" href="https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f0f73a421024c49b56e5149ddcf84a4~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f0f73a421024c49b56e5149ddcf84a4~tplv-k3u1fbpfcp-watermark.image?)</a>

## window 角色

在我们的网页中，有些元素表示“新窗口”，这时候，会用到 window 角色。window 系角色
非常少，只有三个角色：

- window
  - dialog
    - alertdialog

dialog 可能会产生“焦点陷阱”，也就是说，当这样的角色被激活时，焦点无法离开这个区
域。

## 总结

我们以 ARIA 角色为中心，讲解了 ARIA 定义的语义体系。我们可以把 ARIA 分为三类。

- Widget 角色：主要是各种可交互的控件。
- 结构角色：文档的结构。
- 窗体角色：弹出的窗体。
