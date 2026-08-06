---
title: "HTML 解析与 DOM 构建"
description: "从字节流理解 tokenizer、tree builder、容错与脚本阻塞"
category: frontend
tags: ["Browser","DOM"]
updated: 2026-08-05
order: 540
depth: reference
series: "重学前端"
---
# HTML 解析与 DOM 构建

把不完整的 `<table><p>text<tr><td>x` 交给浏览器，Elements 中的树不会机械复制标签顺序。HTML 解析器按状态把字符变成 token，再按插入模式构造 DOM；遇到历史页面中的错误结构时，它会执行标准化恢复。

## 从响应字节到 DOM

```mermaid
flowchart LR
  A[响应字节] --> B[确定编码并解码]
  B --> C[Tokenizer 产生 token]
  C --> D[Tree builder 选择插入模式]
  D --> E[创建、关闭或重排节点]
  E --> F[可观察 DOM]
```

常见 token 包括 start tag、end tag、character、comment 和 DOCTYPE。Tokenizer 有 data、tag open、attribute value、script data 等多种状态；Tree builder 维护打开元素栈、活动格式化元素和当前 insertion mode。一个简化栈模型解释不了表格和格式化元素恢复。

## 步骤一：观察源码与 DOM 的差异

预期结果是浏览器补全 table 结构，并可能把不适合当前位置的文字/段落移到 table 前。我们只观察标准解析结果，不尝试用几十行 JavaScript 重写 HTML parser。

实验在浏览器控制台运行，使用 `template` 是为了创建一个不直接影响当前正文的文档片段。它仍会调用浏览器原生 HTML fragment parser；我们比较的是输入字符串与输出 DOM，不把控制台打印的格式化缩进当作规范结果。若要验证完整文档的 head/body 或文档模式，应改用独立页面，因为片段解析没有完整导航的全部上下文。

```js
const template = document.createElement('template')
template.innerHTML = '<table><p>text<tr><td>x'

console.log(template.content.firstElementChild?.outerHTML)
console.log(template.content.textContent)
```

输入是一段表格上下文中的错误 HTML，关键逻辑是 `innerHTML` 使用 fragment parsing，并根据 template 内容上下文构造节点；输出中的标签补全和节点位置由解析算法决定。调试时同时比较原响应、View Source 和实际 DOM，模板缩进不能代替解析结果。

## 步骤二：理解状态机为什么必要

字符 `<` 在普通文本、script、注释和属性值中的含义不同，解析器需要根据当前状态决定下一个 token。字符引用也按上下文处理；脚本内容不会简单使用“找到最近 `</script>` 的正则”实现所有行为。

Tree builder 收到 token 后根据 in head、in body、in table 等模式处理。省略的 html/head/body、tbody 等元素可能被自动插入；`p` 会在某些 start tag 前自动关闭；格式化元素错误嵌套可能触发 adoption agency algorithm。

这些规则解释了浏览器容错的一致性，也解释了服务端渲染与客户端水合为什么怕无效嵌套：服务器字符串与框架预期树可能不同。

## 步骤三：脚本怎样影响流式解析

浏览器可以边接收边解析 HTML。遇到没有 async/defer 的 classic 外链脚本时，解析通常暂停，等待脚本下载与执行，因为脚本可能通过 `document.write()` 改变后续输入。样式表还可能阻塞依赖样式的脚本执行。

defer 脚本下载时不阻塞解析，按文档顺序在解析完成后、DOMContentLoaded 前执行；async 下载完成后执行，不保证顺序；module 按依赖图准备，默认具有 defer 式行为。动态插入脚本还有自己的 async 与执行规则。

浏览器可能使用 preload scanner 提前发现资源，但这是优化，不改变可观察解析语义。依赖它补救深层脚本注入或迟发现 LCP 资源，性能仍会不稳定。

## 步骤四：innerHTML 的边界

`innerHTML` 使用片段解析，上下文元素会影响结果，例如 table、select 和 SVG。它会替换子树并可能触发自定义元素生命周期，不会保留旧子节点上用 `addEventListener` 注册的监听器。

把不可信字符串交给 innerHTML 会形成注入风险。普通文本使用 `textContent`；确需富文本时使用经过审计的 sanitizer、Trusted Types 和 CSP 等分层控制。解析器容错不是安全清洗器。

## 失败结果与验证

故意把 `div` 放进 `p`，检查 DOM 中 p 是否提前关闭；把 `tr` 放到错误上下文，观察它是否被忽略或重排。随后运行 HTML validator，区分“浏览器恢复后的结果”和“作者写法是否符合要求”。

若页面首屏停顿，Performance 中查看 Parser、Evaluate Script 和网络瀑布，确认是 parser-blocking script、CSS 依赖还是主线程长任务。只看到 DOMContentLoaded 变晚，不能直接断言网络慢。

## 参考资料

- [HTML Standard：Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)
- [HTML Standard：The stack of open elements](https://html.spec.whatwg.org/multipage/parsing.html#the-stack-of-open-elements)
- [HTML Standard：Scripting](https://html.spec.whatwg.org/multipage/scripting.html)
- [Web Platform Tests：HTML parsing](https://github.com/web-platform-tests/wpt/tree/master/html/syntax/parsing)
