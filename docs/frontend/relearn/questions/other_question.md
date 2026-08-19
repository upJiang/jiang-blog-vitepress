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

开放问题很少只有一句固定答案。先确定规范对象、宿主环境和输入，再用最小样本区分语言结论、浏览器实现与工程取舍。下面用几类常见问题演示这种方法。

## section 还是 div

`section` 表示文档中有主题的分组，通常应能用标题命名。`div` 是无语义容器，适合布局和脚本挂载。混合使用没有问题，关键是 section 是否真的形成文档结构。

检查 Accessibility 面板的 heading 和 landmark，再用键盘、读屏器验证导航。不要为了“语义化比例”把每个容器都改成 section。

## 闭包到底保存什么

闭包由函数代码和它创建时可访问的词法环境组成。函数被带到原作用域之外，仍能通过环境记录访问绑定。

~~~js
function createCounter() {
  let value = 0
  return () => {
    value += 1
    return value
  }
}

const next = createCounter()
console.log(next(), next()) // 1 2
~~~

保存的是绑定关系，后续写入可被同一环境中的闭包看到。对象泄漏常来自闭包可达链长期保留大对象，验证时用 Heap Snapshot 查看 retaining path。

## 安全整数为什么不包含 2 的 53 次方

`2 ** 53` 本身可以被 Number 精确表示，但它旁边的每个整数已经不能逐一表示。`Number.isSafeInteger` 的“安全”要求该整数能被精确表示，并且不会与另一个数学整数映射到同一 Number。

~~~js
console.log(Number.isSafeInteger(2 ** 53)) // false
console.log(2 ** 53 === 2 ** 53 + 1) // true
~~~

边界由 ECMAScript 规范定义，不应根据旧引擎实验猜测。超出范围的整数用 BigInt 或字符串协议，并明确 JSON 传输方式。

## Promise 顺序怎样分析

先执行当前任务中的同步代码。Promise reaction 与 `queueMicrotask` 在入队时进入微任务队列，当前任务结束后的检查点会持续排空微任务。定时器达到条件后才成为可调度任务。

分析时逐行记录“执行了什么”和“新工作何时入队”。不要给微任务标记“属于哪个宏任务”，规范更关心队列与检查点；浏览器的 HTML Event Loop 和 Node.js 的 libuv 也应分开。

## import 为什么能看到新值

ES Module 的 import 是对导出绑定的 live binding，不是导入时复制一份普通值。模块实例化先建立绑定关系，求值阶段再写入。

~~~js
// state.js
export let count = 0
export const increment = () => { count += 1 }

// view.js
import { count, increment } from './state.js'
increment()
console.log(count) // 1
~~~

导入方不能给 count 重新赋值。循环依赖还会受到模块实例化顺序和暂时性死区影响，不能把它简化成一个 getter 实现。

## 方法简写和函数属性有什么差异

对象方法简写会建立 `[[HomeObject]]`，供 `super` 查找使用；命名函数表达式在函数体内还拥有自己的局部名称。两者的 name 推断、construct 能力和语法位置也可能不同。

日常方法优先用方法简写，确实需要函数自引用时使用命名函数表达式。验证不要只打印 function.name，还要覆盖 super、new 和函数体内引用。

## 浏览器怎样找到指针目标

浏览器基于布局、绘制顺序、transform、clip、pointer-events 和 Shadow DOM 等信息做 hit testing，得到事件目标，再建立事件路径。捕获阶段是派发路径的一部分，不是用来“从外到内寻找目标”的碰撞算法。

指针捕获、iframe 和覆盖层会改变后续 target。调试时同时看几何、层叠上下文和 composedPath。

## undefined 与 null 怎样区分

`undefined` 是语言值，也有同名全局属性；`null` 是字面量。变量可以先保存 null 再保存其他值，这叫给绑定重新赋值，与修改 null 值本身无关。

现代严格模式和模块中不应依赖覆盖全局 undefined。判断 API 状态时先定义缺失、空值和未加载的业务含义，再选择类型。

## const 会让对象不可变吗

const 约束绑定不能重新指向另一个值，对象内容仍可修改。需要不可变数据时使用更新约定、只读类型、冻结或持久化数据结构，并理解 Object.freeze 只做浅冻结。

选择 const 的主要理由是表达绑定不变，不能宣称它天然提升运行性能。

## 性能监控如何开始

先选用户任务和指标，再同时采集版本、设备、网络与错误。Web Vitals 适合观察加载和交互，业务 mark/measure 适合具体流程，错误上报还要处理 source map、采样、隐私和重复聚合。

实验室 trace 用于定位原因，真实用户监控用于确认分布。固定图片大小或请求数量阈值只能作为预算，不能替代页面目标和真实测量。

## 最小证据怎样写

每个结论至少附输入、环境、观察点、输出和边界。代码能运行只证明当前样本，规范能解释允许行为，生产决策还要加入兼容性、可访问性、安全和回滚成本。
