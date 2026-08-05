---
title: "事件循环与任务队列"
description: "理解浏览器任务、微任务、渲染机会和阻塞"
category: frontend
tags: ["JavaScript","Event Loop"]
updated: 2026-08-04
order: 480
depth: reference
series: "重学前端"
---
# 事件循环与任务队列

event loop 分为宏任务跟微任务，是单线程

宏任务：就是由宿主（node,浏览器）主动发起的 script,settimeout,setInterval...

微任务：就是由 javascript 引擎发起，就是由代码产生的，也就是只有 promise 的 then 跟 process.nexktick



## 执行顺序

1.先执行 script 中的同步代码

2.同步代码执行完毕，执行异步代码中的微任务，微任务优先于宏任务，即 then，nextick,promise 这些要比 settimeout 这些先执行

3.执行异步中的所有微任务（不管顺序，只要不遇到宏任务）执行完毕后，在执行过程中，会把遇到的宏任务添加到‘宏任务栈’中

4.执行‘宏任务栈’，先添加的先执行，在里面还是先执行微任务，遇到宏任务又添加到‘宏任务栈’中，于此循环往复，直到全部执行完毕

> 简单总结一句话就是：同步任务结束后，先处理微任务，然后处理宏任务，宏观任务内部处理重复上述动作。

#### 微任务始终先于宏任务

```text
setTimeout(()=>{
    console.log("c5")
    setTimeout(()=>{
        console.log("c9")
        new Promise(function(resolve, reject){
           resolve()
        }).then(() =>{
            console.log("c10")
        })
    }, 0)
    new Promise(function(resolve, reject){
           resolve()
        }).then(() =>{
            console.log("c6")
        })
}, 0)
var r = new Promise(function(resolve, reject){
    console.log("c1")
    resolve()
});
r.then(() => {
    var begin = Date.now();
    while(Date.now() - begin < 1000);
    console.log("c2")
    new Promise(function(resolve, reject){
        resolve()
    }).then(() =>{
        console.log("c3");
        setTimeout(()=> console.log("c7"), 0)
        new Promise(function(resolve, reject){
           resolve()
        }).then(() =>{
            console.log("c4")
            setTimeout(()=>{
                setTimeout(()=>{
                 console.log("c11")
                }, 0)
                 console.log("c8")
            }, 0)
        })
    })
});

执行顺序：c1 - c11
```

## promise

> Promise 是 JavaScript 语言提供的一种标准化的异步管理方式，它的总体思想是，需要进行 io、等待或者其它异步操作的函数，不返回真实结果，而返回一个“承诺”，函数的调用方可以在合适的时机，选择等待这个承诺兑现（通过 Promise 的 then 方法的回调）。

基本用法：

```text
function sleep(duration) {
    return new Promise(function(resolve, reject) {
        setTimeout(resolve,duration);
    })
}
sleep(1000).then( ()=> console.log("finished"));
```

## 现代规范校订

规范内部术语用于解释语言行为，不等同于浏览器或引擎必须采用的具体数据结构。工程代码同时需要 TypeScript 静态约束和运行时输入校验。

## 规范要点与现代边界

事件循环讨论的是任务何时获得执行机会，不是“异步就并行”。微任务会在当前任务结束后连续清空，过量排队可能阻塞渲染；网络回调、定时器、渲染机会和用户输入受浏览器调度影响。性能问题要用 Performance 面板和长任务数据验证。

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

- https://tc39.es/ecma262/
- https://developer.mozilla.org/en-US/docs/Web/JavaScript

## 任务、微任务和渲染机会

一次任务执行完后，浏览器会清理微任务队列，随后才可能进行渲染和处理下一轮任务。`queueMicrotask`、Promise reaction 和 MutationObserver 回调都属于微任务语义；`setTimeout`、用户输入和网络回调属于任务来源，具体排序受规范和浏览器调度影响。连续创建微任务会让页面长时间无法绘制，因此“把工作放到 Promise.then”不是性能优化。

```js
button.addEventListener('click', () => {
  queueMicrotask(() => console.log('after current task'))
  setTimeout(() => console.log('later task'), 0)
})
```

需要让出渲染机会时，可以拆分批处理并在帧间调度；需要取消时使用 AbortController 或任务令牌。用 Performance 面板检查长任务、输入延迟和绘制时间，而不是只根据 console 顺序判断。Node.js 的事件循环阶段与浏览器不同，不能把两者的调度细节混成一个模型。

## 可取消的异步任务

```js
async function loadData(signal) {
  const response = await fetch('/api/data', { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const controller = new AbortController()
loadData(controller.signal).catch((error) => {
  if (error.name !== 'AbortError') report(error)
})
```

取消只代表调用者不再等待或继续消费结果，不保证底层网络立即停止；服务端任务还需要自己的取消和超时协议。队列、Promise 和 UI 状态应有唯一所有者，避免组件卸载后回调继续写入已失效状态。用 fake timer 或浏览器 Trace 验证排序，但不要把测试时序当作跨环境保证。
