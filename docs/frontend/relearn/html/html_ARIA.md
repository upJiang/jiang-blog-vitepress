---
title: "ARIA 与可访问性语义"
description: "坚持原生优先并在必要时补充角色、状态与关系"
category: frontend
tags: ["ARIA","Accessibility"]
updated: 2026-08-04
order: 350
depth: reference
series: "重学前端"
---
# ARIA 与可访问性语义

ARIA 的作用是向无障碍 API 补充 role、state、property 和元素关系。它不会改变 DOM 行为，不会自动提供键盘交互，也不会修复错误的焦点管理。第一条工程原则因此不是“多加 ARIA”，而是优先使用具有正确原生语义和行为的 HTML 元素。

## 语义、行为和状态必须同时成立

```html
<button type="button" aria-pressed="false">固定到顶部</button>
```

原生 `button` 已提供焦点与键盘激活，ARIA 只补充“可切换按钮”的按下状态。状态变化时应用必须同步更新属性：

```js
const button = document.querySelector('button[aria-pressed]')

button.addEventListener('click', () => {
  const next = button.getAttribute('aria-pressed') !== 'true'
  button.setAttribute('aria-pressed', String(next))
})
```

如果业务确实只能从无语义元素起步，`role="button"` 仍不会使其自动响应 Enter/Space、进入 Tab 顺序或表现 disabled。这意味着实现者必须补齐所有交互，并持续对照 ARIA Authoring Practices。通常改用原生按钮更可靠。

## role 不是任意标签

每个 role 都有允许、要求和继承的状态属性。例如 checkbox 的 `aria-checked` 使用 `true`、`false`、`mixed` 或未定义状态，`checked` 不是合法值。角色和属性不匹配时，辅助技术可能忽略信息。

| UI 概念 | 优先实现 | 常见状态 | 额外行为责任 |
| --- | --- | --- | --- |
| 普通按钮 | `button` | `disabled` | 浏览器已提供激活行为 |
| 切换按钮 | `button` | `aria-pressed` | 点击后同步状态 |
| 复选框 | `input[type=checkbox]` | `checked/indeterminate` | 原生表单协议 |
| 展开按钮 | `button` | `aria-expanded`、`aria-controls` | 控制目标可见性和焦点 |
| 对话框 | `dialog` 或对话框模式 | `aria-modal`、名称 | 初始焦点、关闭、焦点恢复 |

不要把普通文本加入 Tab 顺序只为让读屏“读到”。读屏有浏览模式和焦点模式，非交互内容本来就能被导航。滥用 `tabindex="0"` 会制造冗长的键盘停止点。

## 可访问名称是算法结果

控件名称可能来自关联 `label`、元素内容、`aria-labelledby`、`aria-label` 等多个来源，优先级由 Accessible Name and Description Computation 定义，而不是“只有可 Tab 元素才读 aria-label”。名称应描述控件用途，并尽量复用可见文本。

```html
<h2 id="dialog-title">删除文档</h2>
<p id="dialog-description">删除后只能从版本历史恢复。</p>
<dialog aria-labelledby="dialog-title" aria-describedby="dialog-description">
  <button type="button" value="cancel">取消</button>
  <button type="button" value="confirm">删除</button>
</dialog>
```

`aria-labelledby` 可引用多个 id，并通常优先于 `aria-label`。不要同时堆叠多个相互冲突的名称来源。图标按钮没有可见文字时可使用 `aria-label="关闭"`；若已有文字，通常无需重复标记。

## 关系属性不是行为引用

`aria-controls` 表达控件与目标的关系，但不会帮你显示目标；`aria-expanded` 描述当前展开状态，但不会自动切换；`aria-describedby` 提供补充描述，但不会做表单校验。业务状态是单一事实源，视觉、DOM 和 ARIA 必须从同一状态更新。

```js
const trigger = document.querySelector('#filter-trigger')
const panel = document.querySelector('#filter-panel')

function setExpanded(expanded) {
  trigger.setAttribute('aria-expanded', String(expanded))
  panel.hidden = !expanded
}
```

只更新 CSS class 而遗漏 ARIA，会让视觉状态与辅助技术状态分裂；只更新 ARIA 而不改变可见内容，同样是错误。

## Dialog 不会自动产生完整焦点陷阱

仅写 `role="dialog"` 不会创建模态行为。原生 `<dialog>.showModal()` 会进入 top layer，并使外部文档 inert，但应用仍需设置可访问名称、选择合理的初始焦点、支持关闭，并在关闭后把焦点恢复到触发元素。复杂内容还要决定焦点放在第一个控件还是静态标题上。

```js
const openButton = document.querySelector('#open-settings')
const dialog = document.querySelector('#settings-dialog')

openButton.addEventListener('click', () => dialog.showModal())
dialog.addEventListener('close', () => openButton.focus())
```

Escape 关闭由原生 dialog 的 cancel 行为支持，产品若拦截必须有明确原因。嵌套弹层、异步关闭和卸载触发器时，需要单独测试焦点恢复失败路径。

## 动态信息与 live region

不是每个状态变化都应该朗读。与当前操作直接相关、不会获得焦点的结果，可用 `role="status"`（通常是 polite）通知；必须立即打断的严重告警才考虑 alert。先把容器放进 DOM，再改变其文本，通常比连容器一起动态插入更容易被观察。

```html
<p id="save-status" role="status" aria-atomic="true"></p>
```

```js
document.querySelector('#save-status').textContent = '设置已保存'
```

高频进度、流式 token 或鼠标移动不应逐次进入 live region，否则会形成信息洪泛。应节流并只播报对任务有意义的阶段。

## 验证不能只靠 DOM

至少覆盖键盘操作、浏览器 accessibility tree、自动规则和真实读屏。对自定义 widget，按 APG 的 keyboard interaction 表逐项建立测试；对名称和状态，在 Chrome/Firefox Accessibility 面板确认计算结果；对跨实现差异，查询 ARIA-AT 或 WPT。

```ts
// Playwright 示例：检查面向辅助技术的最终名称和状态
await expect(page.getByRole('button', { name: '固定到顶部' }))
  .toHaveAttribute('aria-pressed', 'false')
```

自动化能证明契约没有明显回退，但不能替代读屏用户完成真实任务。发布门禁应把两者分开记录。

## 参考资料

- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)：角色、状态、属性及其约束的规范定义。
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)：常见 widget 的模式与键盘交互参考。
- [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/)：可访问名称与描述的计算算法。
- [ARIA-AT Community Group](https://github.com/w3c/aria-at)：辅助技术互操作性测试与公开用例。

