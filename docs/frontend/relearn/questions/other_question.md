---
title: "前端常见问题与判断框架"
description: "用规范、最小实验和工程约束回答前端开放问题"
category: frontend
tags: ["FAQ"]
updated: 2026-08-05
order: 660
depth: reference
series: "重学前端"
---
# 前端常见问题与判断框架

前端开放题经常没有一句话标准答案。“`section` 能不能和 `div` 混用”“Promise 和定时器谁先执行”“图片应该限制多大”，都依赖术语、运行环境和业务目标。可靠的回答应能说明事实来自哪里、反例怎样运行，以及项目里如何验证。

## 先学会四步判断

```mermaid
flowchart LR
  A[定义术语和环境] --> B[查询规范承诺]
  B --> C[构造最小反例]
  C --> D[加入工程约束]
  D --> E[写成可回归测试]
```

例如问“计时器是不是 0ms 后立即执行”，先确认环境是浏览器还是 Node.js，再查调度语义，然后用同步阻塞作为反例，最后讨论 UI 是否允许延迟。下面九类问题都按这套方法回答。

## 1. `section` 和 `div` 能混用吗

可以。`section` 表示围绕主题组织的章节，通常有可识别标题；`div` 没有额外语义，适合布局、分组或脚本挂载。一个 section 内使用 div 作为网格容器很正常。

判断重点不是“语义标签数量”，而是该区域是否真的有主题、标题能否说明用途。导航、按钮、输入等交互继续优先使用 `a`、`button`、`input`，不要用 ARIA 给 div 拼一套残缺行为。验证时查看标题层级、键盘路径和 accessibility tree。

## 2. 闭包保存了什么

函数创建时会关联外层词法环境，离开创建位置后仍可沿环境链访问其中绑定，这个组合通常称为闭包。它能封装状态，也可能让大对象、DOM 或订阅存活更久。

下面的预期结果是连续得到 1 和 2，因为两个调用共享同一个 `value` 绑定，而外部代码无法直接写这个局部变量。

```js
function createCounter() {
  let value = 0
  return () => ++value
}

const next = createCounter()
console.log(next(), next()) // 1 2
```

输入是一次 `createCounter()` 调用，关键逻辑是返回函数继续引用 `value`；输出证明状态在调用之间保留。工程中还要在组件销毁时释放监听器与定时器，并借助 Heap Snapshot 的引用链判断闭包是否意外保留对象。

## 3. class、构造函数和类型是什么关系

ECMAScript class 是运行时对象机制的语法，实例方法仍通过原型查找。TypeScript 类型在编译后通常被擦除，不能让网络 JSON 自动成为可信实例。`instanceof` 检查构造器的 prototype 是否出现在对象原型链中，跨 Realm 时还可能因构造器身份不同而失败。

方法简写和函数属性也并非所有能力相同：对象方法不是构造器，箭头函数没有自己的 `this` 和 `[[Construct]]`，命名函数表达式则拥有函数体内可见的局部名字。选择语法时看构造需求、`this`、异步/生成器语义与堆栈可读性，不从一次微基准推导性能规则。

外部输入应使用 Schema 或字段校验；业务对象身份根据稳定协议判断，不依赖 `Object.prototype.toString` 充当万能类型证明。

## 4. 为什么 `2 ** 53` 不是安全整数

安全整数要求本身及相邻整数能被 IEEE 754 双精度数唯一、精确地区分。`2 ** 53` 可以表示，但它与下一个整数发生冲突，因此 `Number.MAX_SAFE_INTEGER` 是 `2 ** 53 - 1`。

```js
const boundary = 2 ** 53

console.log(Number.isSafeInteger(boundary - 1)) // true
console.log(Number.isSafeInteger(boundary))     // false
console.log(boundary === boundary + 1)          // true
```

输入是安全范围边界，第三个输出显示两个数学上不同的整数落到同一个 Number 表示。超范围整数标识可使用 BigInt 或字符串；金额还需规定最小单位、舍入和序列化协议。`Number.EPSILON` 也不是所有浮点比较的固定容差，应结合数值尺度和领域误差。

## 5. Promise、任务和微任务怎样排序

Promise executor 在构造时同步执行，fulfilled 后的 reaction 进入微任务。当前任务的调用栈清空后，浏览器执行微任务检查点，再获得渲染机会并选择后续任务。HTML 规范使用 task，“宏任务”只是教学词汇。

复杂题先记录当前同步栈，再记录本轮新增的微任务与各 task source 的后续工作。不要背一份永久日志顺序：后台节流、计时器钳制和宿主调度会影响具体时机，递归微任务还会推迟输入和绘制。完整实验见[事件循环与任务队列](/docs/frontend/relearn/javascript/js_eventLoop)。

## 6. 命中测试和事件捕获一样吗

不一样。浏览器先根据布局、绘制顺序、`pointer-events` 等做命中测试，确定事件目标；然后构造事件路径，依次执行捕获、目标和冒泡监听器。Shadow DOM 还可能根据 composed 属性和封装边界重新定位公开 target。

元素“点不到”时先检查覆盖层、布局和命中；监听器“顺序不对”时再看 `event.composedPath()`、`eventPhase`、target 与 currentTarget。两类现象使用不同证据，完整实验见[DOM 事件系统](/docs/frontend/relearn/browser/browser_event)。

## 7. `rem`、`vw` 和响应式布局怎样选

`rem` 相对根字号，适合需要跟随用户字号的文本和间距；`vw` 相对视口宽度，适合确实由视口决定的尺寸。它们解决不同问题，不存在“新单位淘汰旧单位”。

一个稳健布局通常先使用正常流、Flex/Grid、`min()`、`max()` 或 `clamp()` 设置边界，再在必要时引入容器或媒体查询。全部文字只用 vw 缩放，会在宽屏过大、窄屏过小，也会削弱用户字号偏好。验收覆盖 200% 缩放、长词、系统大字号、横竖屏和动态内容。

## 8. 前端监控只用 `window.onerror` 够吗

不够。同步异常、未处理 Promise、资源加载、框架错误边界、动态 import、请求失败和业务不变量需要不同采集入口。事件还要经过隐私清洗、Release 关联、Source Map 符号化、稳定分组、采样和告警治理。

监控 SDK 自身失败不能阻断业务，上传内容应去除 Token、Cookie、表单正文和敏感 URL。观察到一条错误也不等于知道影响范围，应结合受影响版本、路由模板、用户数与回归状态。相关实现见[Sentry、Source Map 与前端可观测性](/docs/frontend/sentry-sourcemap)。

## 9. 图片和性能预算能统一定一个数字吗

不能脱离页面任务规定“所有图片 50 KB”。图片是否为 LCP 资源、视觉质量、尺寸、格式、缓存与目标设备都会改变取舍。性能工作也不只看资源体积，还要观察 LCP、INP、CLS、请求瀑布、长任务和业务可用时间。

先定义代表用户路径和设备，再测基线、提出单一假设、只改一个主要变量，并比较护栏指标。没有真实用户数据时明确标注 Lab 结果，不推断业务收益。完整方法见[Web 性能工程](/docs/frontend/web-performance)。

## 正常回答和失败回答的区别

| 层次 | 正常回答 | 容易失败的回答 |
| --- | --- | --- |
| 规范 | 说明平台承诺和版本范围 | 用个人习惯代替事实 |
| 现象 | 给出最小输入和可观察结果 | 只背最终日志 |
| 工程 | 补充数据规模、兼容和故障成本 | 宣布一种方案永远最好 |
| 验证 | 给出测试、指标或 DevTools 路径 | 以“线上没出事”结束 |

问题缺少浏览器、框架版本、输入规模或业务目标时，先补条件再判断。回答可以短，但应让读者知道结论在哪些条件下成立，以及条件变化后从哪里重新验证。

## 参考资料

- [ECMAScript Language Specification](https://tc39.es/ecma262/)
- [WHATWG HTML：Web application APIs](https://html.spec.whatwg.org/multipage/webappapis.html)
- [WHATWG DOM](https://dom.spec.whatwg.org/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
