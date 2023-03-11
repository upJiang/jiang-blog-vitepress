一个方法加上async后，返回的就是一个promise

let a = await aa() 此时a得到的是promise返回的结果

如果没有await则返回一个promise

await只能接受resolve，所以如果有reject跟catch必须要要用try catch包裹起来