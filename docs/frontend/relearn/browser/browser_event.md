---
title: "DOM 事件系统"
description: "从点击一个嵌套按钮开始，观察事件目标、捕获、冒泡、默认行为和事件委托。"
category: frontend
tags: ["Browser", "Event"]
updated: 2026-08-05
order: 570
depth: reference
series: "重学前端"
---
# DOM 事件系统

事件系统把宿主发生的输入或状态变化封装成 Event，再沿一条事件路径调用监听器。路径包含捕获、目标和冒泡阶段；Shadow DOM、默认行为、取消策略和指针捕获会改变可观察结果。

## 事件对象记录一次派发

Event 至少包含 type、target、currentTarget、bubbles、cancelable 和 defaultPrevented 等信息。target 是最初的目标，currentTarget 在每个监听器执行时指向当前节点。

~~~js
button.addEventListener('click', (event) => {
  console.log(event.target)
  console.log(event.currentTarget)
})
~~~

同一个 Event 对象会在一次 dispatch 中被多个监听器看到。异步回调里再读取 currentTarget 往往得到 null，因为派发已经结束。需要跨异步保存时，显式保存节点或必要字段。

## 浏览器先计算事件路径

调用 `dispatchEvent` 或宿主派发事件时，浏览器会根据目标、祖先、Shadow root 和相关窗口建立 event path。事件进入 Shadow DOM 时可能被 retarget，外部代码看到的 target 不一定是内部真实节点；`event.composedPath()` 才能查看允许暴露的路径。

事件路径建立后，后续 DOM 移动不会把同一次派发改成另一条路径。监听器内部删除节点、添加监听器或改变冒泡属性，不会重新计算已经开始的阶段。

## 捕获、目标、冒泡是三个阶段

祖先监听器使用 `capture: true` 在捕获阶段先运行。到达 target 后，目标节点上的捕获监听器和冒泡监听器按注册顺序参与。事件若 `bubbles: true`，再沿祖先向上冒泡。

~~~js
for (const [node, label] of [
  [document, 'document'],
  [container, 'container'],
  [button, 'button'],
]) {
  node.addEventListener('click', () => console.log(`${label}:bubble`))
  node.addEventListener('click', () => console.log(`${label}:capture`), { capture: true })
}
~~~

事件委托依赖冒泡，在稳定的祖先节点上监听一次，再用 `closest` 和 `contains` 判断业务目标。委托边界要考虑 Shadow DOM 和 `composed`，不能假设所有事件都能跨根冒泡。

## stopPropagation 不等于停止当前节点

`stopPropagation()` 阻止事件继续向其他节点传播，但当前节点上尚未执行的同类型监听器仍可能运行。`stopImmediatePropagation()` 才会阻止当前节点后续监听器，并继续阻止传播。

取消默认行为使用 `preventDefault()`，前提是事件 `cancelable`。它不会停止冒泡，也不会撤销已经由脚本执行的副作用。passive 监听器中调用 preventDefault 通常会被忽略并产生警告。

~~~js
link.addEventListener('click', (event) => {
  if (!event.ctrlKey) {
    event.preventDefault()
  }
})
~~~

事件取消、传播停止和业务状态回滚是三件事，代码里应分开表达。

## 监听器选项决定生命周期

`once` 在第一次调用后移除监听器，`signal` 可以由 AbortController 统一取消，`capture` 参与路径阶段，`passive` 向浏览器声明监听器不会取消默认滚动。

移除监听器时，type、callback 和 capture 需要匹配。把匿名函数重复传给 `removeEventListener` 不会成功。组件卸载时用 AbortSignal 集中清理，能减少跨页面泄漏。

## 焦点事件与键盘事件有不同路径

focus 和 blur 默认不冒泡，focusin 和 focusout 可以冒泡。键盘事件反映按键输入，不应直接当成字符，输入法组合、快捷键和可访问性设备都可能改变事件序列。

自定义控件要维护 focus ring、键盘操作、`aria-* ` 状态和真实按钮语义。只监听 click 会漏掉键盘和辅助技术触发的激活。

## 指针捕获会改变后续目标

拖拽开始后调用 `setPointerCapture(pointerId)`，后续指针事件会继续发给捕获元素，即使指针离开它的几何区域。结束、取消或元素移除时要释放状态，并处理 pointercancel。

触摸、鼠标和笔输入优先使用 Pointer Events 统一模型。滚动区域上的 touch/pointer 监听应根据是否需要取消默认滚动选择 passive 策略，不能为了“保险”全部设为非 passive。

## 自定义事件是同步派发

`dispatchEvent` 会同步执行监听器，并返回是否没有被取消。它不会把回调安排到任务队列，也不会自动跨窗口传播。

~~~js
const changed = new CustomEvent('settingschange', {
  bubbles: true,
  cancelable: true,
  detail: { source: 'user' },
})

const accepted = panel.dispatchEvent(changed)
console.log(accepted)
~~~

跨组件通信如果需要异步解耦，应使用消息、状态存储或任务调度；自定义事件只解决当前 DOM 树中的同步通知。
