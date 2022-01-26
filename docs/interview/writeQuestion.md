## promise 篇
### 实现 promise
分析一下基本原理：
1. Promise 是一个类，在执行这个类的时候会传入一个执行器，这个执行器会立即执行
2. Promise 会有三种状态
    - Pending 等待
    - Fulfilled 完成
    - Rejected 失败
3. 状态只能由 Pending --> Fulfilled 或者 Pending --> Rejected，且一但发生改变便不可二次修改；
4. Promise 中使用 resolve 和 reject 两个函数来更改状态；
5. then 方法内部做的事情就是状态判断
    - 如果状态是成功，调用成功回调函数
    - 如果状态是失败，调用失败回调函数

实现代码
```
// MyPromise.js

// 先定义三个常量表示状态
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";


// 新建 MyPromise 类
class MyPromise {
    constructor(executor) {
        // executor 是一个执行器，进入会立即执行
        // 并传入resolve和reject方法
        executor(this.resolve, this.reject);
    }

    // 储存状态的变量，初始值是 pending
    status = PENDING;

    // resolve和reject为什么要用箭头函数？
    // 如果直接调用的话，普通函数this指向的是window或者undefined
    // 用箭头函数就可以让this指向当前实例对象
    // 成功之后的值
    value = null;
    // 失败之后的原因
    reason = null;

    // 存储成功回调函数
    // onFulfilledCallback = null;
    onFulfilledCallbacks = [];
    // 存储失败回调函数
    // onRejectedCallback = null;
    onRejectedCallbacks = [];

    // 更改成功后的状态
    resolve = (value) => {
        // 只有状态是等待，才执行状态修改
        if (this.status === PENDING) {
            // 状态修改为成功
            this.status = FULFILLED;
            // 保存成功之后的值
            this.value = value;
            // ==== 新增 ====
            // resolve里面将所有成功的回调拿出来执行
            while (this.onFulfilledCallbacks.length) {
                // Array.shift() 取出数组第一个元素，然后（）调用，shift不是纯函数，取出后，数组将失去该元素，直到数组为空
                this.onFulfilledCallbacks.shift()(value);
            }
        }
    };

    // 更改失败后的状态
    // 更改失败后的状态
    reject = (reason) => {
        // 只有状态是等待，才执行状态修改
        if (this.status === PENDING) {
            // 状态成功为失败
            this.status = REJECTED;
            // 保存失败后的原因
            this.reason = reason;
            // ==== 新增 ====
            // resolve里面将所有失败的回调拿出来执行
            while (this.onRejectedCallbacks.length) {
                this.onRejectedCallbacks.shift()(reason)
            }
        }
    }


    then(onFulfilled, onRejected) {
        // 判断状态
        if (this.status === FULFILLED) {
            // 调用成功回调，并且把值返回
            onFulfilled(this.value);
        } else if (this.status === REJECTED) {
            // 调用失败回调，并且把原因返回
            onRejected(this.reason);
        } else if (this.status === PENDING) {
            // ==== 新增 ====
            // 因为不知道后面状态的变化，这里先将成功回调和失败回调存储起来
            // 等待后续调用
            this.onFulfilledCallbacks.push(onFulfilled);
            this.onRejectedCallbacks.push(onRejected);
        }
    }
}

module.exports = MyPromise;
```
实现结果
```
const MyPromise = require('./MyPromise')
const promise = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        resolve('success')
    }, 2000);
})

promise.then(value => {
    console.log(1)
    console.log('resolve', value)
})

promise.then(value => {
    console.log(2)
    console.log('resolve', value)
})

promise.then(value => {
    console.log(3)
    console.log('resolve', value)
})

// 1
// resolve success
// 2
// resolve success
// 3
// resolve success
```
### 实现 promise.all
思路：
1. 判断传入的是数组类型
2. 定义数组保存每一个 promise 的返回结果，同时开始计数，当数量等于传入的数组长度，则执行完成
3. 如果遇到 reject，直接返回 reject 的失败原因，如果全部成功，则返回结果数组

实现方法
```
function PromiseAll(promises) {
    return new Promise((resolve, reject) => {
        // 判断传入的必须是数组
        if (!Array.isArray(promises)) {
            throw new TypeError("promises must be an array")
        }
        let result = [] // 保存结果
        let count = 0  // 用于判断是否全部执行完
        promises.forEach((promise, index) => {
            promise.then((res) => {
                console.log("res", res);
                result[index] = res
                count++
                count === promises.length && resolve(result)  //全部执行完后输出结果
            }, (err) => {
                reject(err)
            })
        })
    })
}

module.exports = PromiseAll;
```
实现结果
```
const PromiseAll = require('./promiseAll')

const promise1 = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('success1')
    }, 5000);
})

const promise2 = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('success2')
    }, 1000);
})

const promise3 = new Promise((resolve, reject) => {
    reject('error')
})

PromiseAll([promise1, promise2, promise3]).then((res) => {
    console.log("全部执行完成", res);
}).catch((error) => {
    console.log("执行异常", error)
})

//执行结果，如果没有 reject，输出 ['success1','success1']，reject 输出 error
```
### 实现 promise.finally
实现代码
```
// 由于无法知道promise的最终状态，所以finally的回调函数中不接收任何参数，
// 它仅用于无论最终结果如何都要执行的情况
// 并且finally之后，还可以继续then。并且会将值原封不动的传递给后面的then

Promise.prototype.myFinally = function (cb) {
    // 此处的 this 是一个 pending状态的 promise，resolve(cb())会执行 finally 的代码
    // promise后有可能还是一个promise，finally需要原封不动的返回 return结果
    return this.then((value) => {
        return Promise.resolve(cb()).then(function () {
            return value
        })
    }, (err) => {
        return Promise.resolve(cb()).then(function () {
            throw err
        })
    })
}

const promise = new Promise((resolve, reject) => {
    resolve('success')
})

promise.then((res) => {
    return new Promise((resolve) => {
        resolve('success1')
    })
}).myFinally(() => {
    console.log("执行finally");
}).then((res) => {
    console.log("finally后，原封不动返回值", res);
})

// 输出：执行finally finally后，原封不动返回值 success1
```
### 实现 promise.allSettled
实现代码
```
function allSettled(promises) {
    if (promises.length === 0) return Promise.resolve([])

    const _promises = promises.map(
        item => item instanceof Promise ? item : Promise.resolve(item)
    )
    return new Promise((resolve, reject) => {
        const result = []
        let unSettledPromiseCount = _promises.length

        _promises.forEach((promise, index) => {
            promise.then((value) => {
                result[index] = {
                    status: 'fulfilled',
                    value
                }

                unSettledPromiseCount -= 1
                // resolve after all are settled
                if (unSettledPromiseCount === 0) {
                    resolve(result)
                }
            }, (reason) => {
                result[index] = {
                    status: 'rejected',
                    reason
                }

                unSettledPromiseCount -= 1
                // resolve after all are settled
                if (unSettledPromiseCount === 0) {
                    resolve(result)
                }
            })
        })

    })
}

module.exports = allSettled;

// 思路：
// 当所有的 promise 都执行完了把结果组成数组，包含状态以及 value。
// 首先判断传入的 promise 数组长度，为0直接返回空数组
// 如果 promise 中没有 reslove 或 reject 的，我们只处理 reslove 或 reject 的，所以没有会直接跳出不执行，停止
// 通过计数 -1 ，以及包装结果，返回全部正常结束的最终结果
```
实现结果
```
const promiseAllSettled = require('./promiseAllSettled')

const promise1 = new Promise((resolve, reject) => {
    resolve('success1')
})

const promise2 = new Promise((resolve, reject) => {
    // resolve('success2')
    console.log("sdf");
})

const promise3 = new Promise((resolve, reject) => {
    reject('error')

})

promiseAllSettled([promise1, promise2, promise3]).then((res) => {
    console.log("AllSettled全部执行完成", res);
})

// 执行结果
//  全部执行完成 [
//     { status: 'fulfilled', value: 'success1' },
//     { status: 'fulfilled', value: 'success2' },
//     { status: 'rejected', reason: 'error' }
//   ]
```
### 实现 promise.any
实现方法
```
function promiseAny(promiseArr) {
    let index = 0
    return new Promise((resolve, reject) => {
        if (promiseArr.length === 0) return
        promiseArr.forEach((p, i) => {
            Promise.resolve(p).then(val => {
                resolve(val)

            }, err => {
                index++
                if (index === promiseArr.length) {
                    reject(new AggregateError('All promises were rejected'))
                }
            })
        })
    })
}

module.exports = promiseAny;

// 思路：
// 计数，当遇到成功状态，就返回这个结果，当全部都失败，就返回失败信息
```
实现结果
```
// 执行 promise 数组，当遇到一个 成功状态，就返回这个成功结果，如果全部失败，就返回 失败提示// 执行所有的 promise，返回所有的 promise 状态与结果，reject不影响过程

const promiseAny = require('./promiseAny')

const promise1 = new Promise((resolve, reject) => {
    resolve('success1')
})

const promise2 = new Promise((resolve, reject) => {
    resolve('success2')
})

const promise3 = new Promise((resolve, reject) => {
    reject('error')
})

promiseAny([promise1, promise2, promise3]).then((res) => {
    console.log("promiseAny结果", res);
})

// 执行结果
// promiseAny结果 success1
```
## array 数组篇
### 实现数组去重
```
//ES6 提供的 Set 去重
function unique(arr) {
    const result = new Set(arr);
    return [...result];
    // return Array.from(result); //不兼容ie
    //使用扩展运算符将Set数据结构转为数组
}

// filter 配合 indexOf，
//使用 indexOf 获取当前内容的下标，这个下标必须跟当前 index 相等，不想等说明出现在别的地方，是重复的需过滤
function unique(arr) {
    return arr.filter(function (item, index, arr) {
        return arr.indexOf(item) === index;
    })
}

// reduce
let arr = [1, 2, 2, 4, null, null].reduce((accumulator, current) => {
    return accumulator.includes(current) ? accumulator : accumulator.concat(current);
}, []);
```
### foreach
```
Array.prototype.myForEach = function (callbackFn) {
    // 判断this是否合法
    if (this === null || this === undefined) {
        throw new TypeError("Cannot read property 'myForEach' of null");
    }
    // 判断callbackFn是否合法
    if (Object.prototype.toString.call(callbackFn) !== "[object Function]") {
        throw new TypeError(callbackFn + ' is not a function')
    }
    // 取到执行方法的数组对象和传入的this对象
    var _arr = this, thisArg = arguments[1] || window;
    for (var i = 0; i < _arr.length; i++) {
        // 执行回调函数
        callbackFn.call(thisArg, _arr[i], i, _arr);
    }
}
```
### reduce
先理解 reduce 的用法：
```
array.reduce(function(accumulator, currentValue, currentIndex, array), initialValue)
```
接受四个参数：
- accumulator 累加器，当前执行的结果
- currentValue 当前执行的值
- currentIndex 当前执行的index
- array 正在被执行的数组
- initialValue 初始值

必须要 retuen，这样后续才能获取之前的值，继续进行操作

看例子：
```
// 计数
// 无初始值
let total = [1, 2, 3, 4].reduce((accumulator, current) => accumulator += current); // 10

// 有初始值
let total = [1, 2, 3, 4].reduce((accumulator, current) => accumulator += current, 90); // 100

// 数组去重
let arr = [1, 2, 2, 4, null, null].reduce((accumulator, current) => {
    return accumulator.includes(current) ? accumulator : accumulator.concat(current);
}, []);
```
实现代码
```
Array.prototype.myReduce = function (callbackFn) {
    var _arr = this, accumulator = arguments[1];
    var i = 0;
    // 判断是否传入初始值
    if (accumulator === undefined) {
        // 没有初始值的空数组调用reduce会报错
        if (_arr.length === 0) {
            throw new Error('initVal and Array.length>0 need one')
        }
        // 初始值赋值为数组第一个元素
        accumulator = _arr[i];
        i++;
    }
    for (; i < _arr.length; i++) {
        // 计算结果赋值给初始值
        accumulator = callbackFn(accumulator, _arr[i], i, _arr)
    }
    return accumulator;
}

// 思路：
// 判断是否传入初始值，如果没有传入初始值并且，第一个数组还是空的，就返回异常，否则将数组的第一项作为初始值
// 开始循环数组，迭代执行传入的方法，传入四个值
// 接受四个参数：
// - accumulator 累加器，当前执行的结果
// - currentValue 当前执行的值
// - currentIndex 当前执行的index
// - array 正在被执行的数组
// - initialValue 初始值
```

## 节流防抖
节流： 多次触发同一个函数，同一段时间内只执行一次，所以节流会稀释函数的执行频率

>可以看出节流的主要原理就是利用时间差（当前和上次执行）来过滤中间过程触发的函数执行。控制是否在开始时会立即触发一次，及最后一次触发是否执行,添加取消的功能
```
function throttle(fn, wait, options = { leading: true, trailing: false }) {
    let timer;
    let previous = 0;

    const { leading, trailing } = options;

    const throttled = function (...args) {
        const now = +new Date();

        if (leading === false && !previous) previous = now;
        if (timer) clearTimeout(timer);

        if (now - previous > wait) {
            fn.apply(this, args);
            previous = now;
        } else if (trailing) {
            // 更新timer
            timer = setTimeout(() => {
                fn.apply(this, args);
                previous = 0;
                timer = null;
            }, wait);
        }
    }
    throttled.cancel = () => {
        clearTimeout(timer);
        timer = null;
        previous = 0;
    }

    return throttled;
}
```

防抖： 按最后一次算。比如说“停止输入5s后才发送请求”，防止多次点击  (比较常用)

>可以看出debounce函数的实现原理就是通过计时器延迟函数执行，短时间内再次触发时重置并添加新计时器。
```
//第一次触发可以立即执行，并且有取消功能
function debounce(fn, wait = 1000, immediate = false) {
  let timer = null;

  function debounced(...args) {
    // 重置计时器
    if (timer) clearTimeout(timer);

    // 首次立即执行
    if (immediate && !timer) {
      fn.apply(this, ...args);

      timer = setTimeout(() => {
        timer = null;
      }, wait);

      return;
    }

    // 新计时器
    timer = setTimeout(() => {
      fn.apply(this, ...args);
      timer = null;
    }, wait);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
```
