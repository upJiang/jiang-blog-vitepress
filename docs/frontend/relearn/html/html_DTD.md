---
title: "DOCTYPE、DTD 与标准模式"
description: "厘清历史 DTD 与现代 HTML doctype 的关系"
category: frontend
tags: ["HTML","DOCTYPE"]
updated: 2026-08-04
order: 320
depth: reference
series: "重学前端"
---
# DOCTYPE、DTD 与标准模式

现代 HTML 文档开头的 `<!doctype html>` 不是一份供浏览器下载的 DTD，也不是决定页面可以使用哪些标签的版本开关。它的现实职责是让浏览器进入 no-quirks mode，避免为二十多年前页面保留的兼容布局规则污染现代页面。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>Example Document</title>
  </head>
  <body></body>
</html>
```

## 历史为什么会留下 DTD

HTML 4.01 曾以 SGML application 的方式定义，常见 doctype 带有 public identifier 和 system identifier，并区分 Strict、Transitional、Frameset。XHTML 1.0 又使用 XML 语法表达相近的词汇表。这段历史解释了旧页面里的长字符串，但不能推出“现代 HTML 仍是 SGML 子集”或“浏览器按远程 DTD 校验页面”。现实浏览器拥有专门的 HTML tokenizer 和 tree builder，并不会在解析每个页面时联网下载 W3C DTD。

```html
<!-- 历史材料：HTML 4.01 Strict，不应作为新页面模板 -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">
```

HTML Living Standard 保留少量 legacy doctype string，是为了让生成器或历史文档能够被识别，而不是鼓励继续选择 HTML 4 的三套词汇表。新文档使用短 doctype 即可。

## 三种文档模式

浏览器通过 doctype 的名称、public identifier、system identifier 和缺失情况选择模式。规范中的分类比“有 doctype/没有 doctype”更细：

| 模式 | 目的 | 典型触发 | 工程含义 |
| --- | --- | --- | --- |
| no-quirks | 现代标准行为 | `<!doctype html>` | 新页面唯一合理目标 |
| limited-quirks | 保留少量旧兼容 | 某些 XHTML/Transitional 标识 | 迁移旧站点时才会遇到 |
| quirks | 模拟旧浏览器布局 | 缺失或特定历史 doctype | 盒模型、表格等行为可能不同 |

运行时可以直接读取模式：

```js
const modes = {
  CSS1Compat: 'no-quirks 或 limited-quirks',
  BackCompat: 'quirks'
}
console.log(document.compatMode, modes[document.compatMode])
```

`document.compatMode` 无法区分 no-quirks 与 limited-quirks。需要精确研究时，应构造不同 doctype 的独立文档，并对照 compat 规范和 WPT，而不是根据这一属性做业务分支。

## 斜线、CDATA 和处理指令的误区

在 `text/html` 中，void elements（如 `img`、`meta`、`link`）本来就没有结束标签；尾部斜线可以出现在语法中，但不是 XML 式“自闭合操作符”。普通 HTML 元素不能因此自闭合：

```html
<div class="notice" />这段文本仍可能进入 div
<img src="status.png" alt="任务已完成">
```

HTML 文档也不存在可以包住任意文本的通用 `<![CDATA[...]]>` 节点语法。CDATA section 属于 XML；在 HTML 解析中只有 SVG、MathML 等特定外来内容状态对 CDATA 有特殊处理。脚本和样式内容由各自的 raw text / script data 解析状态处理，同样不能据此把不可信字符串直接拼入页面。

所谓 processing instruction 也不能按 HTML 的通用节点能力使用。`<?target data?>` 在 `text/html` 解析流程中不会像 XML 文档那样得到可靠的 `ProcessingInstruction` 节点。如果确实需要 XML 处理指令，必须使用 XML MIME、XML 解析器和对应工具链。

## 字符引用不由现代 DTD 下载决定

`&lt;`、`&amp;`、`&#60;` 和 `&#x3c;` 属于 HTML character reference 语法。命名字符引用集合由 HTML 标准定义，浏览器不会为了识别 `&nbsp;` 去抓取外部实体文件。

```html
<p>&lt;script&gt; 是显示文本，不是脚本元素。</p>
<p>&#x1F680; 与 &#128640; 使用同一个 Unicode 码点。</p>
```

字符引用也不是通用安全编码器。正确转义取决于上下文：HTML 文本、属性、URL、JavaScript 字符串和 CSS token 需要不同处理。防 XSS 应使用框架的上下文编码、DOM 文本 API、可信模板和 CSP 等多层控制，不能只替换 `<` 与 `&`。

## 验证模式差异

建立两个内容完全相同、只改变 doctype 的页面，比较 `document.compatMode` 和目标元素的 computed style。不要在生产页面动态插入 doctype：解析模式在创建文档时确定。

```js
const box = document.querySelector('.box')
const style = getComputedStyle(box)
console.table({
  compatMode: document.compatMode,
  width: style.width,
  boxSizing: style.boxSizing
})
```

这项实验用于理解历史兼容，而不是为 quirks 页面继续增加条件分支。迁移策略应是补齐现代 doctype、修复因此暴露的布局依赖，再用视觉回归测试确认差异。

## 参考资料

- [WHATWG HTML：The DOCTYPE](https://html.spec.whatwg.org/multipage/syntax.html#the-doctype)：现代 doctype 的作者语法要求。
- [WHATWG HTML：Determining the document mode](https://html.spec.whatwg.org/multipage/parsing.html#the-initial-insertion-mode)：解析器选择 quirks mode 的具体算法。
- [WHATWG Quirks Mode Standard](https://quirks.spec.whatwg.org/)：需要兼容的历史 CSS 行为清单。
- [Web Platform Tests：quirks](https://github.com/web-platform-tests/wpt/tree/master/quirks)：不同文档模式的公开回归测试。

