后面的输出其实都是看前面then返回的什么状态，如果没返回任何东西则默认走then，
如果抛出异常或者reject，看后面是否有处理reject的err，如果有则先执行，然后继续看返回的状态继续操作，当然reject的err只能处理上一个promise的返回，如果没有则往下找catch，catch是可以处理它上面所有未被处理的异常。

总结：处理完上一个状态后，看当前返回的状态继续执行，没有返回默认then，然后继续回调回调，chath处理上面所有未被处理，reject的err仅处理上一个promise的返回

```
return new Promise((resolve,reject)=>{
    reject("reject")
  }).then((res)=>{
     console.log("resolve",res)
  },err=>{
     console.log("reject",err)
     //resolve("resolve")  输出resolve1然后下一个then
    //  return Promise.reject("reject") 输出reject1然后下一个then
    // throw new Error('nono')  输出reject1然后下一个then
    //  return 100 输出resolve1 100然后下一个then
  }).then((res)=>{
     console.log("resolve1",res)
  },err=>{
     console.log("reject1",err)
  }).catch(err=>{
    console.log("catch1",err)
  })
  .then((res)=>{
     console.log("resolve2",res)
  },err=>{
     console.log("reject2",err)
  }).catch(err=>{
    console.log("catch2",err)
  })
```