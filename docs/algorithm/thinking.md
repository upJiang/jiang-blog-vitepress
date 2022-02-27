“思想”并不是一坨剪不断理还乱、学了只能用来吹水的虚无概念。“思想”本质上就是套路，而且是普适性非常强的套路

在研究递归问题时，我觉得很有必要先了解 for 循环里面的递归是怎么一个执行顺序，否则直接往下学会很懵逼，看不懂代码
## 循环下的递归执行
先看一段代码：
```
let num = 1
function cycle(){
    console.log("111")
    if(num<3){
        num++
        console.log("222")
        cycle()
        console.log("num",num)
    }
    console.log("最后执行")
}
cycle()

执行结果：
111
222
111
222
111
最后执行
num 3
最后执行
num 3
最后执行
```
第二段代码
```
function cycle(num){
    if(num === 3){
         return   
    }
    console.log("111")
    for(let i=0;i<3;i++){
        console.log("222")
        cycle(num+1)
        console.log("333")
    }
    console.log("最后执行")
}
cycle(0)

这个执行就是下面解法的过程
```
递归是一个同步执行的过程，代码执行中会先把递归执行完，递归就是内部函数，当遇到内部函数可以想象是把它外层的外部函数先入栈，然后当递归执行完了，再把外部函数依次出栈执行。

## 全排列问题-递归思想
>题目描述：给定一个没有重复数字的序列，返回其所有可能的全排列。
```
示例：   
输入: [1,2,3]
输出: [
[1,2,3],
[1,3,2],
[2,1,3],
[2,3,1],
[3,1,2],
[3,2,1]
]
```
这题的结果数量应该就是 m*(m-1) = 6

我们这样去思考，题目中不变的是“坑位”，我们手里有三张牌，我们要把牌发到坑位中。第一个坑位有三张牌能选，第二个坑位有两张，第三个坑位没得选。<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/3/171da9a215aa6c68~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/3/171da9a215aa6c68~tplv-t2oaga2asx-watermark.awebp)</a>

我们把它装换成一棵树看看：<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/3/171da9a21d81055e~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/5/3/171da9a21d81055e~tplv-t2oaga2asx-watermark.awebp)</a>

现在来看，这个问题不就是一个 DFS 问题，解题思路就是递归。

<a data-fancybox title="image.png" href="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49133bf5ae984a3c8ba5cb9a5bb37252~tplv-k3u1fbpfcp-watermark.image?">![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/49133bf5ae984a3c8ba5cb9a5bb37252~tplv-k3u1fbpfcp-watermark.image?)</a>

[如果实在还是不懂可以看这个视频](https://www.bilibili.com/video/av795444055?from=search&seid=11104532396806146862&spm_id_from=333.337.0.0)

```
const permute = (nums)=>{
    let res = [] // 结果数组
    dfs([]) // 传入的 path 用来接收当前的排序内容
    function dfs(path){
        // 当 path 的长度等于数组 nums 的长度时，则 把结果放到 res 中
        if(path.length === nums.length){
            res.push([...path])  // 将 path 结果深拷贝放入 res 中，不深拷贝的话后面结果都是同一个地址
            return
        }

        // 遍历 nums 数组，去给 path 赋值
        for(let i = 0;i< nums.length;i++){
            // 当 path 中存在遍历值，则跳出 continue
            if(path.includes(nums[i])){
                continue
            }

            // 如果 path 不存在当前遍历值
            path.push(nums[i])  // 将当前遍历值放到 path 中

            // 然后递归调用 dfs，将 path 传入，只有当 path 的长度满足要求了才 return
            dfs(path)
            // 这个语句其实就是回溯，此时已经获取到了一个结果 path
            // 当递归执行完了，他会继续执行之前入栈后的代码（path.pop()），执行多少次，得看它被入栈了多少次，这里取决于 path.includes(nums[i])
            // 此时结点就是在最后一层，它需要返回到第二层甚至是第一层
            // 至于返回到那一层取决于 pop 掉一个值后，当前的遍历循环中是否满足 path.includes(nums[i]，不满足则继续回溯，继续 pop
            // 就相当于二叉树的左序遍历。
            path.pop()
        }
    }
    // 返回结果
    return res
}
```
我们也可以使用一个 Map 去记录已经取过的值，避免重复
```
const permute = function(nums) {
  // 缓存数组的长度
  const len = nums.length
  // curr 变量用来记录当前的排列内容
  const curr = []
  // res 用来记录所有的排列顺序
  const res = []
  // visited 用来避免重复使用同一个数字
  const visited = {}
  // 定义 dfs 函数，入参是坑位的索引（从 0 计数）
  function dfs(nth) {
      // 若遍历到了不存在的坑位（第 len+1 个），则触碰递归边界返回
      if(nth === len) {
          // 此时前 len 个坑位已经填满，将对应的排列记录下来
          res.push(curr.slice())
          return 
      }
      // 检查手里剩下的数字有哪些
      for(let i=0;i<len;i++) {
          // 若 nums[i] 之前没被其它坑位用过，则可以理解为“这个数字剩下了”
          if(!visited[nums[i]]) {
              // 给 nums[i] 打个“已用过”的标
              visited[nums[i]] = 1
              // 将nums[i]推入当前排列
              curr.push(nums[i])
              // 基于这个排列继续往下一个坑走去
              dfs(nth+1) 
              // nums[i]让出当前坑位
              curr.pop()
              // 下掉“已用过”标识
              visited[nums[i]] = 0
          }
      }
  }
  // 从索引为 0 的坑位（也就是第一个坑位）开始 dfs
  dfs(0)
  return res
};
```

## 组合问题：变化的“坑位”，不变的“套路”