---
title: "DOCTYPE、DTD 与标准模式"
description: "从一次布局差异理解现代 DOCTYPE 和历史兼容模式"
category: frontend
tags: ["HTML","DOCTYPE"]
updated: 2026-08-05
order: 320
depth: reference
series: "重学前端"
---
# DOCTYPE、DTD 与标准模式

DOCTYPE 是 HTML 文档开头的声明，现代浏览器主要根据它选择 standards mode 或 quirks mode。DTD（Document Type Definition，文档类型定义）属于 SGML/XML 时代的文档约束机制，HTML5 的 `<!doctype html>` 并不会让浏览器按某个 DTD 校验整页。

## HTML 文档的基本边界

一个完整文档通常包含 doctype、html、head 和 body。HTML token 的标签名、属性名和文本内容有各自规则，解析器还会为缺失的 html、head、body 节点补出默认结构。

~~~html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Example</title>
  </head>
  <body>
    <main>Content</main>
  </body>
</html>
~~~

标签名在 HTML 解析中通常按 ASCII 不区分大小写，属性可以省略部分引号，但生产代码仍应使用双引号并保持明确闭合。布尔属性只看存在性，`disabled="false"` 仍表示 disabled。

## DOCTYPE 影响兼容模式

推荐的 HTML5 doctype 是短字符串 `<!doctype html>`。缺失、拼写异常或出现在文档前的非空字符可能触发 quirks mode，盒模型、表格高度和尺寸计算随之采用历史兼容规则。

兼容模式是文档级状态，不是某个元素的属性。用 DevTools 的 document.compatMode 检查：

~~~js
console.log(document.compatMode) // CSS1Compat 或 BackCompat
~~~

DOCTYPE 不能修复无效标签、样式错误或旧版浏览器行为。它只决定解析和布局时采用的兼容分支。

## 注释、实体与字符引用

HTML 注释使用 `<!-- ... -->`，不能嵌套 `--`。注释不会形成可见文本，但会进入 DOM 的 Comment 节点，脚本可以读取它。

字符引用分为命名引用和数字引用。它们在文本、属性和特定原始文本状态中的解析规则不同。HTML 中的 `&lt;` 与直接写小于号不等价，属性值还要考虑引号和空格。

~~~html
<p title="&quot;quoted&quot;">&lt;safe&gt;</p>
~~~

把用户输入拼进 HTML 时，不能只替换一个字符。根据插入上下文选择文本节点、属性 API 或经过审计的 sanitizer，避免 HTML、URL、CSS 和 JavaScript 上下文混淆。

## DTD、XML 与 HTML 解析器的差异

XML 文档可以通过 DTD 声明元素、属性和实体，解析器可能对不符合约束的输入报错。浏览器按 text/html 处理的页面使用 HTML tokenizer 和 tree builder，忽略或特殊处理许多 XML 风格语法。

使用 `application/xhtml+xml` 时，文档进入 XML 解析路径，未闭合标签可能让整页进入解析错误状态。扩展名、DOCTYPE 和 MIME type 需要一起检查，不能只根据文件后缀判断。

Processing instruction 在 HTML 中通常按注释或文本处理，不能把 `<?xml ...?>` 放进 text/html 页面期待 XML 声明生效。

## 用标准工具验证而不是看源码

用不同 doctype、前导空白、未闭合标签、实体和 XHTML MIME type 建立最小页面。分别记录 compatMode、DOM 结构、解析错误界面和盒模型尺寸，再检查服务端 Content-Type。

验证只覆盖当前浏览器版本。若页面需要被 XML 工具、邮件客户端或爬虫消费，还要在目标解析器中单独跑 schema 或 DTD 校验。
