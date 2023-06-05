重点掌握的三个命题：
- 迭代法实现二叉树的先、中、后序遍历 
- 二叉树层序遍历的衍生问题
- 翻转二叉树 

## “遍历三兄弟”的迭代实现  
>题目描述：给定一个二叉树，返回它的前序（先序）遍历序列。

示例:<br>
输入: [1,null,2,3]
```
1   
 \   
  2   
 /  
3 
```
输出: [1,2,3] <br> 
进阶: 递归算法很简单，你可以通过迭代算法完成吗？ <br>

二叉树的格式
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

**先序遍历**<br>
思路：
- 明白前序遍历就是：先遍历`根结点`、然后`遍历左孩子`、最后`遍历右孩子`
- 定义一个栈用来承接树的内容，我们对树进行入栈，入栈顺序为 `右-左`，根节点的值直接 push 到结果数组里。
- 那么当我们出栈的时候就是按照 `左-右` 的顺序了，我们每次把结点值 push 到结果数组。
- 当栈空时，返回结果

编码实现
```
const preorderTraversal = function(root) {
  // 定义结果数组
  const res = []  
  // 处理边界条件
  if(!root) {
      return res
  }
  // 初始化栈结构
  const stack = [] 
  // 首先将根结点入栈
  stack.push(root)  
  // 若栈不为空，则重复出栈、入栈操作
  while(stack.length) {
      // 将栈顶结点记为当前结点
      const cur = stack.pop() 
      // 当前结点就是当前子树的根结点，把这个结点放在结果数组的尾部
      res.push(cur.val)
      // 若当前子树根结点有右孩子，则将右孩子入栈
      if(cur.right) {
          stack.push(cur.right)
      }
      // 若当前子树根结点有左孩子，则将左孩子入栈
      if(cur.left) {
          stack.push(cur.left)
      }
  }
  // 返回结果数组
  return res
};
```
**后序遍历**<br>
那么如果是后序遍历的话，遍历顺序应该是 `左-右-根`。<br>
思路
- 我们在 push 结果的时候，使用 unshift 置换一下顺序，输出结果本来是 `根-左-右` 变成了 `右-左-根`
- 那么我们再把 `右-左` 变成 `左-右` 即可，把左右入栈的顺序调整一下即可

代码实现
```
const postorderTraversal = function(root) {
  // 定义结果数组
  const res = []  
  // 处理边界条件
  if(!root) {
      return res
  }
  // 初始化栈结构
  const stack = [] 
  // 首先将根结点入栈
  stack.push(root)  
  // 若栈不为空，则重复出栈、入栈操作
  while(stack.length) {
      // 将栈顶结点记为当前结点
      const cur = stack.pop() 
      // 当前结点就是当前子树的根结点，把这个结点放在结果数组的头部
      res.unshift(cur.val)
      // 若当前子树根结点有左孩子，则将左孩子入栈
      if(cur.left) {
        stack.push(cur.left)
      }  
      // 若当前子树根结点有右孩子，则将右孩子入栈
      if(cur.right) {
        stack.push(cur.right)
      }
  }
  // 返回结果数组
  return res
};
```
**中序遍历**<br>
思路：<br>
- 中序遍历的序列规则是 `左-中-右` ，这意味着我们必须首先定位到最左的叶子结点。在这个定位的过程中，必然会途径目标结点的父结点、爷爷结点和各种辈分的祖宗结点
- 途径过的每一个结点，我们都要及时地把它入栈。这样当最左的叶子结点出栈时，第一个回溯到的就是它的父结点，然后就在最左节点处开始左右遍历处理结果

```
const inorderTraversal = function(root) {
  // 定义结果数组
  const res = []  
  // 初始化栈结构
  const stack = []   
  // 用一个 cur 结点充当游标
  let cur = root  
  // 当 cur 不为空、或者 stack 不为空时，重复以下逻辑
  while(cur || stack.length) {
      // 这个 while 的作用是把寻找最左叶子结点的过程中，途径的所有结点都记录下来 
      while(cur) {
          // 将途径的结点入栈
          stack.push(cur)  
          // 继续搜索当前结点的左孩子
          cur = cur.left  
      }
      // 取出栈顶元素
      cur = stack.pop()  
      // 将栈顶元素入栈
      res.push(cur.val)  
      // 尝试读取 cur 结点的右孩子
      cur = cur.right
  }
  // 返回结果数组
  return res
};
```
代码深度解析
- 1. 两个 while ：内层的 while 的作用是在寻找最左叶子结点的过程中，把途径的所有结点都记录到 stack 里。记录工作完成后，才会走到外层 while 的剩余逻辑里——这部分逻辑的作用是从最左的叶子结点开始，一层层回溯遍历左孩子的父结点和右侧兄弟结点，进而完成整个中序遍历任务。  
- 2. 外层 while 的两个条件： cur 的存在性和stack.length 的存在性，各自是为了限制什么？
    - 1. stack.length 的存在性比较好理解， stack 中存储的是没有被推入结果数组 res 的待遍历元素。只要 stack 不为空，就意味着遍历没有结束， 遍历动作需要继续重复。 
    - 2. cur 的存在性就比较有趣了。它对应以下几种情况： 
        - 1. 初始态， cur 指向 root 结点，只要 root 不为空， cur 就不为空。此时判断了 cur 存在后，就会开始最左叶子结点的寻找之旅。这趟“一路向左”的旅途中， cur 始终指向当前遍历到的左孩子。 
        - 2. 第一波内层 while 循环结束， cur 开始承担中序遍历的遍历游标职责。 cur 始终会指向当前栈的栈顶元素，也就是“一路向左”过程中途径的某个左孩子，然后将这个左孩子作为中序遍历的第一个结果元素纳入结果数组。假如这个左孩子是一个叶子结点，那么尝试取其右孩子时就只能取到 null ，这个 null 的存在，会导致内层循环 while 被跳过，接着就直接回溯到了这个左孩子的父结点，符合 左->根  的序列规则  
        - 3. 假如当前取到的栈顶元素不是叶子结点，同时有一个右孩子，那么尝试取其右孩子时就会取到一个存在的结点。 cur 存在，于是进入内层 while 循环，重复“一路向左”的操作，去寻找这个右孩子对应的子树里最靠左的结点，然后去重复刚刚这个或回溯、或“一路向左”的过程。如果这个右孩子对应的子树里没有左孩子，那么跳出内层 while 循环之后，紧接着被纳入 res 结果数组的就是这个右孩子本身，符合 根->右 的序列规则

## 层序遍历的衍生问题    
>题目描述：给你一个二叉树，请你返回其按 层序遍历 得到的节点值。 （即逐层地，从左到右访问所有节点）。

示例：<br>
二叉树：[3,9,20,null,null,15,7], 
```
  3
 / \
9  20
  /  \
 15   7
```
返回其层次遍历结果：
```
[
[3],
[9,20],
[15,7]
]
```
思路：<br>
我们在对二叉树进行层序遍历时，每一次 while 循环其实都对应着二叉树的某一层。只要我们在进入while循环之初，记录下这一层结点个数，然后将这个数量范围内的元素 push 进同一个数组，就能够实现二叉树的分层。

```
/**
 * @param {TreeNode} root
 * @return {number[][]}
 */
const levelOrder = function(root) {
    // 初始化结果数组
    const res = []  
    // 处理边界条件
    if(!root) {
        return res
    }  
    // 初始化队列
    const queue = []   
    // 队列第一个元素是根结点
    queue.push(root)  
    // 当队列不为空时，反复执行以下逻辑
    while(queue.length) {
        // level 用来存储当前层的结点
        const level = []  
        // 缓存刚进入循环时的队列长度，这一步很关键，因为队列长度后面会发生改变
        const len = queue.length  
        // 循环遍历当前层级的结点
        for(let i=0;i<len;i++) {
            // 取出队列的头部元素
            const top = queue.shift()  
            // 将头部元素的值推入 level 数组
            level.push(top.val)
            // 如果当前结点有左孩子，则推入下一层级
            if(top.left) {
                queue.push(top.left)
            }
            // 如果当前结点有右孩子，则推入下一层级
            if(top.right) {
                queue.push(top.right)
            }
        }
        // 将 level 推入结果数组
        res.push(level)
    }
    // 返回结果数组
    return res
};
```
## 翻转二叉树
>题目描述：翻转一棵二叉树。

示例：
输入：
```
     4
   /   \
  2     7
 / \   / \
1   3 6   9
```
输出：
```
     4
   /   \
  7     2
 / \   / \
9   6 3   1
```
**思路分析**<br>
这道题是一道非常经典的递归应用题。<br>
一棵二叉树，经过翻转后会有什么特点？答案是每一棵子树的左孩子和右孩子都发生了交换。既然是“每一棵子树”，那么就意味着重复，既然涉及了重复，就没有理由不用递归。<br>
于是这道题解题思路就非常明确了：以递归的方式，遍历树中的每一个结点，并将每一个结点的左右孩子进行交换。<br>
```
/**
 * @param {TreeNode} root
 * @return {TreeNode}
 */
const invertTree = function(root) {
    // 定义递归边界
    if(!root) {
        return root;
    }
    // 递归交换右孩子的子结点
    let right = invertTree(root.right);
    // 递归交换左孩子的子结点
    let left = invertTree(root.left);
    // 交换当前遍历到的两个左右孩子结点
    root.left = right;
    root.right = left;
    return root;
};
```
