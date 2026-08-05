---
title: "语义化 HTML"
description: "用原生元素表达文档结构和交互语义"
category: frontend
tags: ["HTML","Semantics"]
updated: 2026-08-04
order: 340
depth: reference
series: "重学前端"
---
# 语义化 HTML

语义化不是把 `div` 换成几个看起来更现代的标签。一个 HTML 元素同时参与内容模型、默认样式、键盘与焦点行为、表单协议、DOM 接口和无障碍映射。正确选择元素，等于复用浏览器已经实现并被跨平台测试的契约。

## 从用户任务选择元素

先问“用户要完成什么”，再选择元素。跳转到地址使用 `a[href]`，触发当前页面动作使用 `button`，输入布尔值使用 checkbox，提交一组字段使用 form。视觉形状不能决定语义：看起来像卡片的整块区域，内部可能同时有标题链接和收藏按钮，不能用一个大按钮包住所有交互。

```html
<article class="article-summary">
  <h2>
    <a href="/docs/reliability-patterns">重试、去重、回放与降级</a>
  </h2>
  <p>讨论副作用、幂等键和失败恢复。</p>
  <button type="button" aria-pressed="false">收藏</button>
</article>
```

如果给 `div` 添加 `role="button"`，浏览器不会自动补齐 Tab 焦点、Enter/Space 激活、禁用状态和表单行为。原生元素优先不是风格偏好，而是减少自建协议的成本。

## 内容模型约束结构

HTML 为元素定义 flow、phrasing、interactive、heading、sectioning 等内容类别，并为每个元素规定允许的父子内容。约束不是为了让 validator 好看，而是避免交互嵌套和解析恢复造成不一致。例如链接通常不能包含交互式后代，按钮的内容模型也禁止 interactive content。

```html
<!-- 错误方向：交互控件嵌套，事件和焦点语义冲突 -->
<a href="/detail">
  查看详情
  <button type="button">收藏</button>
</a>
```

应拆成同级控件，再用 CSS 完成视觉布局。遇到复杂组件时同时运行 HTML validator、键盘测试和 accessibility tree 检查，因为静态类型并不能覆盖运行时拼装出的无效结构。

## sectioning 不会自动计算标题级别

`article`、`section`、`nav`、`aside` 表达区域意义。`section` 通常应该有可识别标题，但不能为了加一个容器就滥用。更重要的是，早期 HTML5 outline algorithm 没有被浏览器和辅助技术一致实现；把每个 section 都写成 `h1`，不会可靠地产生期望的层级。

```html
<main>
  <h1>Agent 工程手册</h1>
  <section aria-labelledby="evaluation-heading">
    <h2 id="evaluation-heading">评测体系</h2>
    <section aria-labelledby="offline-heading">
      <h3 id="offline-heading">离线样本</h3>
    </section>
  </section>
</main>
```

标题级别应反映实际文档层级。不要按字号选择 `h1-h6`，样式由 CSS 负责。跳级并非语法上永远禁止，但会让读屏标题导航和文档扫描更难理解，应有明确理由。

## Landmark 与可访问名称

`header`、`footer` 的 landmark 映射依赖上下文；它们位于 `article` 或 `section` 内时，不一定映射为页面级 banner/contentinfo。页面通常应有一个主要 `main`。多个 `nav` 或互相同类的区域需要可访问名称以便区分。

```html
<nav aria-label="主导航">...</nav>
<nav aria-label="文章目录">...</nav>
```

不要给每个容器都加 role。原生元素已有隐式语义，重复 role 往往没有收益，冲突 role 还可能覆盖正确映射。检查浏览器 accessibility 面板时，应关注 role、name、state 和层级，而不是只看 DOM 标签名。

## `em`、`strong`、`b` 与视觉粗体

语义元素表达内容含义：`em` 是语气强调，嵌套会增加强调程度；`strong` 表示重要、严重或紧急；`b` 用于吸引注意但不增加重要性。单纯需要字重时用 CSS 类，不应让语义随视觉稿变化。

```html
<p><strong>警告：</strong>删除后无法从当前版本恢复。</p>
<p><span class="metric-label">请求成功率</span> 99.95%</p>
```

同理，`i` 不等于“斜体按钮”，`blockquote` 不等于缩进容器，`table` 不等于二维布局工具。语义应在关闭 CSS 后仍能解释内容结构。

## 表单语义是一套协议

表单控件需要 label、name、类型、错误说明和状态。placeholder 不能替代 label；它会随输入消失，也可能对比度不足。按钮应显式设置 type，避免组件被放进 form 后意外提交。

```html
<form id="profile-form">
  <label for="display-name">显示名称</label>
  <input
    id="display-name"
    name="displayName"
    autocomplete="name"
    aria-describedby="display-name-hint"
    required
  >
  <p id="display-name-hint">2 至 40 个字符。</p>
  <button type="submit">保存</button>
</form>
```

客户端校验改善交互但不是安全边界，服务端仍必须验证。错误出现后应与字段建立可访问关系，并把焦点或错误摘要策略纳入测试。

## 验证方法

1. 只用键盘完成跳转、输入、提交和关闭操作。
2. 关闭 CSS，检查阅读顺序和标题层级是否仍成立。
3. 在 accessibility tree 中检查 role/name/state。
4. 运行 HTML validator 和 axe 等自动检查，再做人工读屏验证。
5. 对动态组件覆盖加载、空、错误、禁用和更新后的状态通知。

自动扫描只能发现规则已知的问题，不能判断链接文本是否真正描述目标、标题层级是否符合业务结构。因此可访问性验收必须包含人工任务流。

## 参考资料

- [WHATWG HTML：Semantics](https://html.spec.whatwg.org/multipage/dom.html#semantics-2)：内容模型与元素语义的基础定义。
- [WHATWG HTML：Sections](https://html.spec.whatwg.org/multipage/sections.html)：sectioning、heading 与页面区域规范。
- [HTML Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/)：HTML 元素到平台无障碍 API 的映射。
- [Web Platform Tests：html/semantics](https://github.com/web-platform-tests/wpt/tree/master/html/semantics)：语义元素与行为的公开测试用例。
