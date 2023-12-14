并发（concurrency）和并行（parallelism）区别

- 并发是宏观概念，我分别有任务 A 和任务 B，
  在`一段时间内通过任务间的切换完成了这两个任务`，这种情况就可以称之为并发。
- 并行是微观概念，假设 CPU 中存在两个核心，那么我就可以同时完成任务
  A、B。`同时完成多个任务`的情况就可以称之为并行。

## Generator

```
function *foo(x) {
  let y = 2 * (yield (x + 1))
  let z = yield (y / 3)
  return (x + y + z)
}
let it = foo(5)
console.log(it.next())   // => {value: 6, done: false}
console.log(it.next(12)) // => {value: 8, done: false}
console.log(it.next(13)) // => {value: 42, done: true}
```

- 首先 `Generator` 函数调用和普通函数不同，它会返回一个迭代器
- 当执行第一次 `next` 时，传参会被忽略，并且函数暂停在 `yield (x + 1)` 处，所以
  返回 `5 + 1 = 6`
- 当执行第二次 `next` 时，传入的参数等于上一个 `yield` 的返回值，如果你不传参
  ，`yield` 永远返回 `undefined`。此时 `let y = 2 * 12`，所以第二个 `yield` 等于
  `2 * 12 / 3 = 8`
- 当执行第三次 `next` 时，传入的参数会传递给 `z`，所以 `z = 13, x = 5, y = 24`，
  相加等于 `42`

## Promise

`Promise` 翻译过来就是承诺的意思，这个承诺会在未来有一个确切的答复，并且该承诺有
三种状态，分别是：

- 等待中（pending）
- 完成了 （resolved）
- 拒绝了（rejected）

这个承诺一旦从等待状态变成为其他状态就永远不能更改状态了，也就是说一旦状态变为
resolved 后，就`不能再次改变`

如果你在 then 中 使用了 return，那么 return 的值会被 Promise.resolve() 包装

```
Promise.resolve(1)
  .then(res => {
    console.log(res) // => 1
    return 2 // 包装成 Promise.resolve(2)
  })
  .then(res => {
    console.log(res) // => 2
  })
```

[可以直接学习手写 promise](https://blog.junfeng530.xyz/docs/interview/writeQuestion.html#promise-%E7%AF%87)

## async 及 await

一个函数如果加上 `async` ，那么该函数就会返回一个 `Promise`

```
async function test() {
  return "1"
}
console.log(test()) // -> Promise {<resolved>: "1"}
```

`async` 就是将函数返回值使用 `Promise.resolve()` 包裹了下，和 `then` 中处理返回
值一样，并且 `await` 只能配套 `async` 使用

```
async function test() {
  let value = await sleep()
}
```

`await` 内部实现了 `generator`，其实 `await` 就是 `generator` 加上 `Promise` 的
语法糖，且内部实现了自动执行 `generator`。

## 常用定时器函数

常见的定时器函数有 `setTimeout、setInterval、requestAnimationFrame`。

### setTimeout

如果前面的代码影响了性能，就会导致 setTimeout 不会按期执行。<br> 通过代码去修正
setTimeout，从而使定时器相对准确。思路就是通过计算时间间隔来调整下一次循环间隔时
间

```
let period = 60 * 1000 * 60 * 2
let startTime = new Date().getTime()
let count = 0
let end = new Date().getTime() + period
let interval = 1000
let currentInterval = interval

function loop() {
  count++
  // 代码执行所消耗的时间
  let offset = new Date().getTime() - (startTime + count * interval);
  let diff = end - new Date().getTime()
  let h = Math.floor(diff / (60 * 1000 * 60))
  let hdiff = diff % (60 * 1000 * 60)
  let m = Math.floor(hdiff / (60 * 1000))
  let mdiff = hdiff % (60 * 1000)
  let s = mdiff / (1000)
  let sCeil = Math.ceil(s)
  let sFloor = Math.floor(s)
  // 得到下一次循环所消耗的时间
  currentInterval = interval - offset
  console.log('时：'+h, '分：'+m, '毫秒：'+s, '秒向上取整：'+sCeil, '代码执行时间：'+offset, '下次循环间隔'+currentInterval)

  setTimeout(loop, currentInterval)
}

setTimeout(loop, currentInterval)
```

如果你有循环定时器的需求，其实完全可以通过 requestAnimationFrame 来实现

```
function setInterval(callback, interval) {
  let timer
  const now = Date.now
  let startTime = now()
  let endTime = startTime
  const loop = () => {
    timer = window.requestAnimationFrame(loop)
    endTime = now()
    if (endTime - startTime >= interval) {
      startTime = endTime = now()
      callback(timer)
    }
  }
  timer = window.requestAnimationFrame(loop)
  return timer
}

let a = 0
setInterval(timer => {
  console.log(1)
  a++
  if (a === 3) cancelAnimationFrame(timer)
}, 1000)`
```

首先 `requestAnimationFrame` 自带函数节流功能，基本可以保证在 `16.6` 毫秒内只执
行一次（不掉帧的情况下），并且该函数的延时效果是精确的，没有其他定时器时间不准的
问题，当然你也可以通过该函数来实现 `setTimeout`。

## Event Loop

微任务包括 `process.nextTick ，promise ，MutationObserver`，其中
`process.nextTick` 为 Node 独有。

宏任务包括
`script ， setTimeout ，setInterval ，setImmediate ，I/O ，UI rendering`。

Event Loop 执行顺序

- 首先执行同步代码，这属于宏任务
- 当执行完所有同步代码后，执行栈为空，查询是否有异步代码需要执行
- 执行所有微任务
- 当执行完所有微任务后，如有必要会渲染页面
- 然后开始下一轮 Event Loop，执行宏任务中的异步代码，也就是 setTimeout 中的回调
  函数

```
console.log('script start')

async function async1() {
  await async2()
  console.log('async1 end')
}
async function async2() {
  console.log('async2 end')
}
async1()

setTimeout(function() {
  console.log('setTimeout')
}, 0)

new Promise(resolve => {
  console.log('Promise')
  resolve()
})
  .then(function() {
    console.log('promise1')
  })
  .then(function() {
    console.log('promise2')
  })

console.log('script end')
// script start => async2 end => Promise => script end => promise1 => promise2 => async1 end => setTimeout
```

首先先来解释下上述代码的 `async` 和 `await` 的执行顺序。当我们调用 `async1` 函数
时，会马上输出 `async2 end`，并且函数返回一个 `Promise`，接下来在遇到 `await` 的
时候会就让出线程开始执行 `async1` 外的代码，所以我们完全可以把 `await` 看成是让
出线程的标志。

然后当同步代码全部执行完毕以后，就会去执行所有的异步代码，那么又会回到 `await`
的位置执行返回的 `Promise` 的 `resolve` 函数，这又会把 `resolve` 丢到微任务队列
中，接下来去执行 `then` 中的回调，当两个 `then` 中的回调全部执行完毕以后，又会回
到 `await` 的位置处理返回值，这时候你可以看成是
`Promise.resolve(返回值).then()`，然后 `await` 后的代码全部被包裹进了 `then` 的
回调中，所以 `console.log('async1 end')` 会优先执行于 `setTimeout`。

这里很多人会有个误区，认为微任务快于宏任务，其实是错误的。因为宏任务中包括了
script ，浏览器会先执行一个宏任务，接下来有异步代码的话才会先执行微任务。
