## 深度优先（DFS -> D:depth 深度）——栈结构

**深度优先搜索的核心思想，是试图穷举所有的完整路径。**

就好比迷宫游戏，只要有出口就一定能走出去，就算把所有路都走一遍，坚持向当前道路的
深处挖掘--像这样将“深度”作为前进的第一要素的搜索方法，就是所谓的“深度优先搜索”。

看看迷宫结构：<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/18/1718dd0887578d3d~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/18/1718dd0887578d3d~tplv-t2oaga2asx-watermark.awebp)</a>

每走一步都是一个入栈操作，A-B-E-G-I 就是入栈后想要的结果，那些黑色的就是入栈后的
出栈。所以深度优先的本质就是栈的出栈入栈

### DFS 与二叉树的遍历

现在我们站在深度优先搜索的角度，重新理解一下二叉树的先序遍历过程：<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714ec42acc57e04~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714ec42acc57e04~tplv-t2oaga2asx-watermark.awebp)</a>

```
// 所有遍历函数的入参都是树的根结点对象
function preorder(root) {
    // 递归边界，root 为空
    if(!root) {
        return
    }

    // 输出当前遍历的结点值
    console.log('当前遍历的结点值是：', root.val)
    // 递归遍历左子树
    preorder(root.left)
    // 递归遍历右子树
    preorder(root.right)
}
```

其实二叉树的遍历就是一个深度遍历的过程，在这个递归函数中，递归式用来先后遍历左子
树、右子树（分别探索不同的道路），递归边界在识别到结点为空时会直接返回（撞到了南
墙）。因此，我们可以认为，递归式就是我们选择道路的过程，而递归边界就是死胡同。二
叉树的先序遍历正是深度优先搜索思想的递归实现。可以说深度优先搜索过程就类似于树的
先序遍历、是树的先序遍历的推广。

在二叉树遍历的递归实现里，完全没有栈的影子——这东西似乎和栈没有什么直接联系啊，为
啥咱们还说深度优先搜索的本质是栈呢？

- 首先，函数调用的底层，仍然是由栈来实现的。JS 会维护一个叫“函数调用栈”的东西
  ，preorder 每调用一次自己，相关调用的上下文就会被 push 进函数调用栈中；待函数
  执行完毕后，对应的上下文又会从调用栈中被 pop 出来。因此，即便二叉树的递归调用
  过程中，并没有出现栈这种数据结构，也依然改变不了递归的本质是栈的事实。
- 其次，DFS 作为一种思想，它和树的递归遍历一脉相承、却并不能完全地画上等号——DFS
  的解题场景其实有很多，其中有一类会要求我们记录每一层递归式里路径的状态，此时就
  会强依赖栈结构（这一点会在下一节的真题实战中体现得淋漓尽致）。

## 广度优先（BFS -> B:braod 宽广）——队列结构

与深度优先搜索不同的是，广度优先搜索（BFS）并不执着于“一往无前”这件事情。它关心
的是眼下自己能够直接到达的所有坐标，其动作有点类似于“扫描”———比如说站在 B 这个岔
路口，它会只关注 C、D、E 三个坐标，至于 F、G、H、I 这些遥远的坐标，现在不在它的
关心范围内：

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/17190ddba3cdc06c~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/17190ddba3cdc06c~tplv-t2oaga2asx-watermark.awebp)</a>

当遍历到 C、D 时，入队会马上出队，因为 C、D 都找不到最终结果，其实广度优先就是先
进行层级（层序）遍历，判断层级结点有没有答案，有答案才继续；深度优先就一条路走到
黑，撞到墙壁了再回头。

### BFS 实战：二叉树的层序遍历

现在回顾一下这个二叉树实例，我们使用层序遍历实现：
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/1719130c81086dbb~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/1719130c81086dbb~tplv-t2oaga2asx-watermark.awebp)</a>

看到“层次”关键字，大家应该立刻想到“扫描”；想到“扫描”，就应该立刻想到 BFS。因此层
序遍历，我们就用 BFS 的思路来实现。

结构:

```
const root = {
  val: "A",
  left: {
    val: "B",
    left: {
      val: "D"
    },
    right: {
      val: "E"
    }
  },
  right: {
    val: "C",
    right: {
      val: "F"
    }
  }
};
```

实现：

```
function BFS(root) {
    const queue = [] // 初始化队列queue
    // 根结点首先入队
    queue.push(root)
    // 队列不为空，说明没有遍历完全
    while(queue.length) {
        const top = queue[0] // 取出队头元素
        // 访问 top
        console.log(top.val)
        // 如果左子树存在，左子树入队
        if(top.left) {
            queue.push(top.left)
        }
        // 如果右子树存在，右子树入队
        if(top.right) {
            queue.push(top.right)
        }
        queue.shift() // 访问完毕，队头元素出队
    }
}
```

## 总结

深度优先

- 深度 depth，所以是 DFS
- 深度，那就是一直往里往深挖掘再回头，类似于二叉树的先序遍历
- 本质是栈，所有的 push 都是入栈，走错路了退回去就是 pop 出栈

广度优先

- 广度 broad，所以是 BFS
- 广度，就是先遍历同一层的，也就是层序遍历，二叉树的层序遍历
- 本质是队列，进来都是 push，然后发现这个 push 进来的没啥用就丢掉 shift
