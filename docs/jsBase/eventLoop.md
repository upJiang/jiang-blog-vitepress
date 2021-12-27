event loop 分为宏任务跟微任务，是单线程

宏任务：就是由宿主（node,浏览器）主动发起的 script,settimeout,setInterval...

微任务：就是由javascript引擎发起，就是由代码产生的，也就是只有promise的then跟process.nexktick

<a data-fancybox title="image.png" href="https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0b2b30bf679342379cd9902ee5910714~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0b2b30bf679342379cd9902ee5910714~tplv-k3u1fbpfcp-watermark.image?)</a>

## 执行顺序
1.先执行script中的同步代码

2.同步代码执行完毕，执行异步代码中的微任务，微任务优先于宏任务，即then，nextick,promise这些要比settimeout这些先执行

3.执行异步中的所有微任务（不管顺序，只要不遇到宏任务）执行完毕后，在执行过程中，会把遇到的宏任务添加到‘宏任务栈’中

4.执行‘宏任务栈’，先添加的先执行，在里面还是先执行微任务，遇到宏任务又添加到‘宏任务栈’中，于此循环往复，直到全部执行完毕

>简单总结一句话就是：同步任务结束后，先处理微任务，然后处理宏任务，宏观任务内部处理重复上述动作。

#### 微任务始终先于宏任务
```
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