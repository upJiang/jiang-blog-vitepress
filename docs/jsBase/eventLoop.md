event loop 分为宏任务跟微任务，是单线程

宏任务：就是由宿主（node,浏览器）主动发起的 script,settimeout,setInterval...

微任务：就是由javascript引擎发起，就是由代码产生的，也就是只有promise的then跟process.nexktick

![Image.png](https://i.loli.net/2021/08/01/DozyCFaQRxHTheW.png)

## 执行顺序
1.先执行宏任务中的scrpte中的同步代码

2.同步代码执行完毕，执行异步代码中的宏任务跟微任务，微任务优先于宏任务，即then，nextick这些要比settimeout这些先执行

3.异步中的微任务执行完毕后，执行异步中的宏任务，如果异步中的宏任务还有微任务，执行完这一层异步中的宏任务后，继续执行里面的微任务

4.如果在异步队列中有 process.nextTick，则先执行，可以认为这个优先于promise

>简单总结一句话就是：同步任务结束后，先处理微观任，然务后处理宏观任务，宏观任务内部处理重复上述动作。

```
console.log('start');

setTimeout(() => {
console.log('s1');
    new Promise(resolve => {
        console.log('p2');
        resolve(true);
    }).then(() => {
         console.log('then2');
    });
});

function task() {
    console.log('task');
}

new Promise(resolve => {
    console.log('p1');
    resolve(true);
}).then(() => {
    console.log('then');
});

task();

console.log('end');

执行顺序：start p1 task end (同步任务) then (微任务) s1(宏任务) p2 then2(宏任务中的微任务，循环) 

现实中的场景：
settimeout(()=>{
    console.log("1")
},2000)
settimeout(()=>{
    console.log("2")
},1000)
//请求的同步代码
{
    2000毫秒后完成
}
这个时候如何输出，两秒后同时输出2，1，2比1快
```