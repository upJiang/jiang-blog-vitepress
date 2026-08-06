---
title: "HTML 标准与语言设计"
description: "从源码到 DOM，理解 HTML 的解析、容错与元素行为"
category: frontend
tags: ["HTML","Standard"]
updated: 2026-08-05
order: 310
depth: reference
series: "重学前端"
---
# HTML 标准与语言设计

把一段 HTML 交给浏览器，它能显示出来，不代表源码会原样变成 DOM。浏览器会识别字符、拆分标签，并在结构错误时按标准修复。理解这条链路，才能解释“Elements 面板为什么和源码不同”，也能避免 SSR、水合和无障碍问题。

## 先分清 HTML、DOM 和浏览器

HTML 是描述文档的语言，DOM 是浏览器解析后提供给 JavaScript 的对象树。`<button>` 不只是一个外观标签，它还对应 `HTMLButtonElement`，自带键盘、焦点和表单行为。

浏览器在收到页面后，大致经历下面五步：

```mermaid
flowchart LR
  A[响应字节] --> B[按编码解码]
  B --> C[识别标签和文本]
  C --> D[按规则构造 DOM]
  D --> E[样式、脚本与可访问树]
```

其中“构造 DOM”不是简单的字符串转对象。解析器会维护当前所在位置、打开的元素以及表格等特殊上下文，所以错误输入也会得到确定结果。

## 用一个错误嵌套观察解析结果

假设我们想把 `div` 放进一段文字中。按照 HTML 的内容模型，`p` 不能包含 `div` 这样的块级结构。浏览器不会停下来报错，而会在遇到 `div` 时提前结束 `p`。

先记住预期：源码看起来只有一个 `p` 开始标签；运行后，DOM 中会出现被浏览器补出的结束位置。下面用临时容器做实验，不会修改当前页面的正文。

```js
const host = document.createElement('div')
host.innerHTML = '<p>第一段<div>块级内容</div>段尾'

console.log(host.innerHTML)
console.log([...host.children].map((node) => node.tagName))
```

输入是一段不符合内容模型的 HTML。`innerHTML` 触发片段解析，关键行为是解析器在 `div` 前关闭 `p`；输出的 DOM 结构因此和源码缩进不同。这个例子说明调试结构问题时应查看实际 DOM，不能只看模板文件。

## 为什么标准既限制作者又要求浏览器容错

HTML 标准同时面对两类对象：写页面的人，以及实现浏览器的人。

- 作者规则告诉我们哪些结构有效，便于编辑器、校验器和团队尽早发现错误。
- 浏览器规则规定错误输入如何恢复，避免同一份旧页面在不同浏览器中生成完全不同的树。

容错解决的是兼容性，不是质量问题。无效嵌套仍可能让 CSS 选择器失效、读屏顺序改变，或让服务端输出的树与客户端框架预期不一致。

## HTML 和 XML 的解析规则不同

响应头为 `text/html` 时使用 HTML 解析器；`application/xhtml+xml` 才使用 XML 解析器。文件扩展名和代码风格不能覆盖 MIME 类型。

这一区别最容易在自闭合写法中看到。`img`、`meta` 本来就是 void element，不需要结束标签；普通 HTML 元素写成 `<div />`，斜线也不会让它获得 XML 的自闭合语义。SVG、MathML 进入外来内容状态后，又会采用各自的名称和闭合规则。

## 元素语义也是标准的一部分

解析只回答“树怎么生成”，元素定义还回答“它怎样工作”。例如按钮关联表单后，未指定 `type` 时通常具有提交行为；链接需要 `href` 才具有完整链接语义。用 `div` 模拟按钮，要自己补齐焦点、Enter/Space 激活、禁用状态和辅助技术映射。

判断一个 HTML 结论时，可以按四层检查：

| 层次 | 要回答的问题 | 常用工具 |
| --- | --- | --- |
| 源码 | 写法是否符合作者规则 | HTML validator |
| 解析 | 最终生成了什么 DOM | Elements、`outerHTML` |
| 行为 | 元素如何响应操作 | 键盘测试、DOM API |
| 语义 | 辅助技术读到什么 | Accessibility tree |

## 常见误解与失败结果

如果只验证“页面能显示”，错误嵌套可能一直潜伏到组件组合或水合阶段。看到浏览器自动补标签时，也不要把它当成浏览器随意猜测；恢复步骤由解析算法规定。

还要避开三个常见结论：HTML 现在采用 Living Standard，不应把“HTML5”理解为永远冻结的版本；DOM 是解析结果，不是源文件的镜像；`/>` 不是 `text/html` 中普通元素的通用闭合操作符。

## 怎样继续验证

先把问题缩成一个独立页面，固定 `Content-Type` 和字符编码，再比较 View Source、Elements、DOM 属性与可访问树。跨浏览器行为应查询或编写 Web Platform Tests；单个浏览器版本的现象只能证明该实现当时的结果。

## 参考资料

- [WHATWG HTML：Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)：tokenization、tree construction 与错误恢复。
- [WHATWG HTML：Semantics](https://html.spec.whatwg.org/multipage/dom.html#semantics-2)：元素语义与内容模型。
- [WHATWG DOM Standard](https://dom.spec.whatwg.org/)：节点、事件和 DOM 接口。
- [Web Platform Tests：HTML](https://github.com/web-platform-tests/wpt/tree/master/html)：跨浏览器公开测试。
