---
title: "ARIA 与可访问性语义"
description: "从一个切换按钮理解角色、名称、状态和键盘行为"
category: frontend
tags: ["ARIA","Accessibility"]
updated: 2026-08-05
order: 350
depth: reference
series: "重学前端"
---
# ARIA 与可访问性语义

可访问性树是浏览器把 DOM、原生语义、状态和可见文本转换后交给辅助技术的接口。ARIA（Accessible Rich Internet Applications）主要补充角色、名称、状态和关系，不能替代正确的 HTML 元素，也不会自动提供键盘行为。

## 先让原生元素承担语义

按钮、链接、输入框、标题、列表和表格已经带有用户代理定义的 role、键盘方式和状态。优先选择能表达意图的元素，再用 ARIA 补充缺失信息。

~~~html
<button type="button" aria-expanded="false" aria-controls="menu">
  Settings
</button>
<nav id="menu" hidden>...</nav>
~~~

把 `div` 加上 `role="button"` 只改变部分可访问语义，Enter、Space、焦点、禁用状态和点击反馈仍需自己实现。控件若已经是 button，再添加相同 role 只会增加噪声。
## 可访问名称来自一条计算规则

辅助技术需要知道“这个控件叫什么”。名称可能来自关联的 `label`、元素文本、`aria-labelledby`、`aria-label` 或特定属性。名称来源有优先级，空的 `aria-label` 还可能把可见文本隐藏掉。

~~~html
<label for="email">Email</label>
<input id="email" name="email" autocomplete="email">
~~~

图标按钮要提供可访问名称，装饰性图像使用空 alt。标题、链接和按钮的可见文字要能解释目的，不能用“点击这里”替代目标。使用 `aria-labelledby` 时，引用的 id 必须存在且保持唯一。
## role、state、property 是不同信息

role 描述节点是什么，state 描述当前是否展开、选中、忙碌或禁用，property 描述标签、值和关系。ARIA 属性不会自动和业务状态同步。

~~~html
<div role="progressbar"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-valuenow="40">
</div>
~~~

进度改变时同步更新 aria-valuenow。折叠面板要同步 `aria-expanded` 和目标节点的显示状态，选项卡要维护 tab、tablist、tabpanel 的关联、选择状态和键盘移动。只写一组静态属性会让读屏器得到过期状态。
## Widget role 带着交互契约

checkbox、combobox、dialog、menu、tab、slider 等 widget role 不是视觉类名，它们对应焦点、键盘和状态约定。自定义 widget 需要实现完整交互，再用自动化工具和屏幕阅读器检查。

例如自定义列表框通常要决定焦点放在容器还是选项，使用 roving tabindex 还是 aria-activedescendant，Home、End、上下键和 Escape 各做什么。移动焦点时还要滚动可见，关闭弹层时把焦点还给触发按钮。
## structure role 描述文档关系

main、navigation、complementary、region、article、list 和 heading 让辅助技术快速跳转。landmark 不宜重复堆叠同名区域，`region` 通常需要可访问名称，标题层级应反映内容结构而不是字体大小。

~~~html
<main>
  <h1>Account</h1>
  <section aria-labelledby="security-title">
    <h2 id="security-title">Security</h2>
  </section>
</main>
~~~

HTML heading 已经能表达多数结构，不要用 `aria-level` 修补混乱的 DOM。隐藏装饰内容可使用 `aria-hidden="true"`，但不能把可交互元素或当前焦点节点藏起来。
## window role 与模态对话框

dialog、alertdialog、application、document 等 role 影响辅助技术的导航模式。模态对话框要设置名称，限制焦点在对话框内部，阻止背景操作，并在关闭后恢复原焦点。原生 `<dialog>` 的 `showModal()`、`close()` 和 `returnValue` 能提供部分基础行为，但内容语义和焦点管理仍需测试。

ARIA 不会绕过浏览器权限、同源策略或用户辅助技术设置。验证时同时检查 Accessibility 面板中的 role/name/state、键盘 Tab 顺序、屏幕阅读器朗读和不同缩放。
