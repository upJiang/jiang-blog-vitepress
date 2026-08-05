---
title: "CSS 动画与过渡"
description: "区分 transition、animation 与合成友好属性"
category: frontend
tags: ["CSS","Animation"]
updated: 2026-08-04
order: 410
depth: reference
series: "重学前端"
---
# CSS 动画与过渡

## animation 属性和 transition 属性

了解一下 animation 属性的基本用法:

```text
@keyframes mykf
{
  from {background: red;}
  to {background: yellow;}
}

div
{
    animation:mykf 5s infinite;
}
```

这里展示了 animation 的基本用法，实际上 animation 分成六个部分：

- animation-name 动画的名称，这是一个 keyframes 类型的值

- animation-duration 动画的时长；

- animation-timing-function 动画的时间曲线；

- animation-delay 动画开始前的延迟；

- animation-iteration-count 动画的播放次数；

- animation-direction 动画的方向。

transition 与 animation 相比来说，是简单得多的一个属性。它有四个部分：

- transition-property 要变换的属性；

- transition-duration 变换的时长；

- transition-timing-function 时间曲线；

- transition-delay 延迟。

这里的四个部分，可以重复多次，指定多个属性的变换规则。

实际上，有时候我们会把 transition 和 animation 组合，抛弃 animation 的 timing-function，以编排不同段用不同的曲线。

```text
@keyframes mykf {
  from { top: 0; transition:top ease}
  50% { top: 30px;transition:top ease-in }
  75% { top: 10px;transition:top ease-out }
  to { top: 0; transition:top linear}
}
```

## 现代规范校订

现代 CSS 还应结合 Cascade Layers、容器查询、逻辑属性和新的颜色空间理解。历史语法可以帮助理解演进，但实现决策必须以目标浏览器支持矩阵为准。

## 规范要点与现代边界

动画应表达状态变化而不是掩盖状态不清。优先使用 transform 和 opacity 等合成友好属性，避免对布局属性做高频动画；为 prefers-reduced-motion 提供降级；过渡只在状态确实发生时触发。调试时检查合成层数量、长任务和动画结束后的焦点位置。

把结论放回可复现条件：浏览器版本、文档模式、输入数据、网络和设备都会影响结果。遇到与旧教材不同的行为，先查现行规范和实现说明，再用最小样例验证；如果规范只定义可观察结果，就不要把某个引擎的内部结构写成跨浏览器保证。

## 运行验证

| 验证项 | 方法 | 通过条件 |
| --- | --- | --- |
| 语义 | 对照现行规范和 MDN 兼容性说明 | 结论有适用范围 |
| 行为 | 最小页面、Node 脚本或 DevTools 复现 | 结果与预期一致 |
| 工程 | 运行类型检查、测试和性能采样 | 没有新增回归 |

```text
现象 -> 假设 -> 最小复现 -> 观测证据 -> 修复 -> 回归测试
```

## 参考资料

- https://www.w3.org/TR/css-syntax-3/
- https://developer.mozilla.org/en-US/docs/Web/CSS

## 动画的运行时边界

`transition` 适合两个已知状态之间的短暂变化，`animation` 适合由关键帧和迭代次数描述的时间线。两者都不会自动管理业务状态、焦点或可访问名称。应在状态类变化时触发动画，而不是依赖页面加载后永久播放；结束后要保持最终状态，避免用户看到视觉状态和 DOM 状态不一致。

```css
.panel {
  opacity: 0;
  transform: translateY(.5rem);
  transition: opacity 160ms ease, transform 160ms ease;
}
.panel[data-open="true"] {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .panel { transition-duration: 1ms; }
}
```

性能验证要同时看主线程长任务、合成层、内存和输入响应。对 width、height、top、left 等几何属性做高频动画可能反复触发布局；改用 transform 也不是无条件更快，过多图层会增加栅格化和显存成本。使用 DevTools Performance 记录真实设备，并检查动画中断后键盘焦点仍然可见。

## 动画状态机

复杂组件应把 `closed`、`opening`、`open` 和 `closing` 当作可观察状态，动画只是状态之间的视觉过渡。用户在动画中再次点击、按 Escape、切换路由或关闭 `prefers-reduced-motion` 时，状态机必须有确定结果。监听 `animationend` 或 transition 事件时校验事件目标，并在卸载时清理监听器；不能用一个全局定时器假定每台设备的时长一致。

图片、字体和阴影也会影响动画的首帧和绘制成本。使用 Performance 面板检查帧率、长任务、栅格化和布局次数，再决定是否拆分节点或减少效果。动画结束后应把内容保持在最终可访问状态，并让屏幕阅读器感知真正的展开/收起属性。对于加载、提交和错误反馈，优先用静态状态、进度文本和可取消操作表达结果，动画只做短暂反馈。这样即使浏览器禁用动画、设备性能不足或用户开启减少动效，功能和状态仍然完整。
状态变化的原因应由 DOM 属性或组件状态表达，不能只靠颜色和位移让用户猜测。
当动画被取消时，组件仍要保持可操作并及时清理监听器。
减少动效时保留状态反馈，不要让用户失去对进度的判断。
键盘和触摸输入都要能中断或完成状态切换。
动画时长应服务反馈而非拖延操作。
为低端设备保留无动画路径。
也要检查动画结束后的焦点和滚动位置。
避免只验证理想路径。
关注中断和恢复。
保证状态可见。
并兼顾键盘操作。
也保留降级。
动画不应阻塞核心操作。
反馈要及时。
且可取消。
。
