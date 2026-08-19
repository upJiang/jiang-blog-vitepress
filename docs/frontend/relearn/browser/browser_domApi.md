---
title: "DOM API 与节点操作"
description: "从节点身份理解创建、移动、克隆、Range 与变更观察"
category: frontend
tags: ["Browser","DOM API"]
updated: 2026-08-05
order: 560
depth: reference
series: "重学前端"
---
# DOM API 与节点操作

DOM API 操作的是一棵有身份的树。节点移动会改变原树，克隆才会产生新身份；属性字符串、IDL property、样式声明和事件监听器也各有自己的存储位置。理解这些边界，比记住一长串方法名更重要。

## 节点身份决定比较结果

`Node` 是 Document、Element、Text、Comment 和 DocumentFragment 等节点的共同接口。节点用对象身份比较，两个内容相同的元素仍不相等。

~~~js
const a = document.createElement('p')
const b = document.createElement('p')

console.log(a === b) // false
console.log(a.isEqualNode(b)) // true
~~~

`isEqualNode` 比较节点类型、名称、属性和子树，不能证明两个节点在文档中的位置相同。需要判断包含关系使用 `contains`，需要判断相对位置使用 `compareDocumentPosition`。
## 插入 API 会移动已有节点

`append`、`appendChild`、`insertBefore` 和 `replaceWith` 接收的节点如果已有父节点，会先从旧位置移除，再插入新位置。它们不会隐式复制。

~~~js
const list = document.querySelector('ul')
const first = list.querySelector('li:first-child')
const second = list.querySelector('li:nth-child(2)')

second.appendChild(first)
~~~

执行后 first 成为 second 的子节点，事件监听器和节点身份仍然保留。跨 Document 移动节点可能需要 `adoptNode`，从另一个文档复制则使用 `importNode`。跨文档的自定义元素还可能触发 adoptedCallback。

`DocumentFragment` 是临时的父节点。把 fragment 插入文档时，实际插入的是它的子节点，fragment 本身会变空。它适合组织批量插入，但“使用 fragment 必然更快”不是语言保证，最终成本取决于布局失效和节点数量。
## cloneNode 只复制树和属性

`cloneNode(false)` 复制当前节点，`cloneNode(true)` 递归复制子树。它不会复制通过 `addEventListener` 注册的监听器、闭包状态或某些外部资源连接。复制带 id 的模板还要重新生成唯一标识，避免标签和 ARIA 引用冲突。

文本修改优先使用 `textContent`。把不可信字符串写入 `innerHTML` 会把它交给 HTML 解析器，形成注入风险。需要解析受控模板时，也要把来源、允许标签和清洗策略写进边界。
## Attribute 与 property 是两层状态

HTML attribute 是元素节点上的字符串特性。DOM property 是 JavaScript 对象暴露的 IDL 属性，两者只在规范明确映射时同步。

~~~html
<input id="age" value="18" disabled>
~~~

~~~js
const input = document.querySelector('#age')

console.log(input.getAttribute('value')) // 18
console.log(input.value) // 当前控件值
input.value = '20'
console.log(input.getAttribute('value')) // 18
~~~

表单的 `value` attribute 常作为初始值，`value` property 保存当前值。`checked`、`selected` 也有类似的默认状态与当前状态区别。布尔 attribute 只要存在就表示 true，`disabled="false"` 仍然是禁用。
## 查询结果的时间语义不同

`querySelectorAll` 返回静态 NodeList。旧式的 `getElementsByClassName`、`getElementsByTagName` 通常返回 live collection，后续 DOM 变化会改变其长度与成员。

~~~js
const live = document.getElementsByClassName('item')
const snapshot = document.querySelectorAll('.item')

const added = document.createElement('div')
added.className = 'item'
document.body.append(added)

console.log(live.length)
console.log(snapshot.length)
~~~

循环修改 live collection 时，索引可能因节点移动而变化。要固定遍历对象，先用 `Array.from` 复制。不要根据“某选择器更快”做长期结论，现代引擎会对不同查询建立索引和缓存，真实页面应以性能记录为准。
## Range 记录两个边界点

`Range` 不只是保存两个元素。边界由容器节点和 offset 组成，文本节点的 offset 是字符位置，元素节点的 offset 是子节点之间的位置。

~~~js
const paragraph = document.querySelector('p')
const range = document.createRange()

range.selectNodeContents(paragraph)
const fragment = range.extractContents()
document.querySelector('#preview').append(fragment)
~~~

`extractContents` 会从原树移走范围内内容，跨节点范围可能拆分文本节点并克隆部分祖先。Selection API 通常持有一个或多个 Range，但用户选区、编辑器模型和 DOM Range 不是同一层的数据结构。
## 观察变更要区分时机

MutationObserver 在当前任务结束后的微任务检查点交付记录。它报告节点、属性和字符数据变化，不会替代事件，也不会告诉你最终布局尺寸。

观察回调里继续修改 DOM，新的记录可能进入下一次微任务处理。批量更新时应合并记录，避免在回调中逐条触发布局读取。要观察用户输入、焦点和默认行为，使用事件系统；要观察尺寸，使用 ResizeObserver；要观察可见区域交叉，使用 IntersectionObserver。
## 命名空间和自定义元素不能靠字符串猜

SVG、MathML 和 HTML 的元素创建需要正确命名空间。使用 `document.createElementNS` 时要传入目标 namespace，否则同名标签可能得到错误接口和样式行为。

自定义元素的构造、升级、连接和属性变化由 Custom Elements 生命周期控制。直接写入未知标签的 attribute 后，元素何时升级取决于定义注册时机。测试时要覆盖“先创建后 define”和“先 define 后创建”两种顺序。

排查 DOM 问题时，记录节点身份、父子关系、attribute、property、事件监听注册点和观察器回调顺序。不要只截一张 Elements 面板截图，截图无法说明节点是被移动、克隆还是重新创建。
