队列掌握要点：
- 栈向队列的转化
- 双端队列
- 优先队列

## 如何用栈实现一个队列？
题目描述：使用栈实现队列的下列操作：<br>
push(x) -- 将一个元素放入队列的尾部。<br>
pop() -- 从队列首部移除元素。<br>
peek() -- 返回队列首部的元素。<br>
empty() -- 返回队列是否为空。<br>
示例:<br>
MyQueue queue = new MyQueue();<br>
queue.push(1);<br>
queue.push(2);<br>
queue.peek(); // 返回 1<br>
queue.pop(); // 返回 1<br>
queue.empty(); // 返回 false<br>

思路：<br>
栈，后进先出；队列，先进先出。`进站`都是在队尾（栈顶）用 push，最本质的区别是：**是`出站`往哪出**：栈是栈顶出（对应数组的 `pop`  方法），队列是队头出（对应数组的 `unshift` 方法）

我们必须使用栈的思想去处理队列，那么要解决的问题就是使用栈的出站方式去完成队列的出站：<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/171735fc8ee608ea~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/171735fc8ee608ea~tplv-t2oaga2asx-watermark.awebp)</a>

我们再定义一个辅助栈，把 stack1 的数组依次 push 到 stack2 中，那么当 stack2 出栈的时候，顺序正是队列的出站方式<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/17173813ab3377b1~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/17173813ab3377b1~tplv-t2oaga2asx-watermark.awebp)</a>

注意：当 stack2 中有值时，必须当 stack2 中的所有值都出站完毕，才能继续往 stack2 push。这样才能保证出栈的顺序。<br>
我们最后实现的 pop 方法也必须是 stack2 中出站的<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/171738289370743a~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/13/171738289370743a~tplv-t2oaga2asx-watermark.awebp)</a>

上代码：
```
const myQueue = function(){
    // 定义两个栈
    this.stack1 = []
    this.stack2 = []
}

// 入栈是不变的
MyQueue.prototype.push = function (x) {
  // 直接调度数组的 push 方法
  this.stack1.push(x);
};

// 处理出站
MyQueue.prototype.pop = function () {
  // 当 stack2 为空时才能给 stack2 入栈，保证顺序
  if (this.stack2.length <= 0) {
    // 当 stack1 不为空时，出栈
    while (this.stack1.length > 0) {
      // 将 stack1 出栈的元素推入 stack2
      this.stack2.push(this.stack1.pop());
    }
  }
  // 为了达到逆序的目的，我们只从 stack2 里出栈元素
  return this.stack2.pop();
};

// 返回队列首部的元素,其实队列就是 stack2 的栈顶,但是我们要判断 stack2 是否为空，为空要把 stack1 的内容都 push 进来
MyQueue.prototype.peek = function () {
  if (this.stack2.length <= 0) {
    // 当 stack1 不为空时，出栈
    while (this.stack1.length > 0) {
      // 将 stack1 出栈的元素推入 stack2
      this.stack2.push(this.stack1.pop());
    }
  }
  // 缓存 stack2 的长度
  const stack2Len = this.stack2.length;
  return stack2Len && this.stack2[stack2Len - 1];
};

// 当两个栈都空时，队列才为空
MyQueue.prototype.empty = function () {
  // 若 stack1 和 stack2 均为空，那么队列空
  return !this.stack1.length && !this.stack2.length;
};
```

## 认识双端队列
**双端队列就是允许在队列的两端进行插入和删除的队列。**

体现在编码上，最常见的载体是既允许使用 `pop`、`push` 同时又允许使用 `shift`、`unshift` 的数组：
```
const queue = [1,2,3,4] // 定义一个双端队列   
queue.push(1) // 双端队列尾部入队 
queue.pop() // 双端队列尾部出队   
queue.unshift(1) // 双端队列头部入队
queue.shift() // 双端队列头部出队 
```

### 滑动窗口问题
>题目描述：给定一个数组 nums 和滑动窗口的大小 k，请找出所有滑动窗口里的最大值。

示例：<br>
输入: nums = [1,3,-1,-3,5,3,6,7], 和 k = 3 输出: [3,3,5,5,6,7]<br>
解释: 滑动窗口的位置<br>
[1 3 -1] -3 5 3 6 7<br>
1 [3 -1 -3] 5 3 6 7<br>
1 3 [-1 -3 5] 3 6 7<br>
1 3 -1 [-3 5 3] 6 7<br>
1 3 -1 -3 [5 3 6] 7<br>
1 3 -1 -3 5 [3 6 7]<br>
最大值分别对应：<br>
3 3 5 5 6 7<br>
 
根据之前在数组以及链表中学习的知识，这道题我们很快就能想到使用指针法解决，应该是双指针的快慢指针，我们定义快指针比慢指针相差 窗口大小 - 1 ，当快指针跑完了，也就计算完了。<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/171915c3ae13a951~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/171915c3ae13a951~tplv-t2oaga2asx-watermark.awebp)</a>

直接上代码：
```
// 传进来的是数组nums，以及窗口大小k
const maxSlidingWindow = function (nums, k) {
  // 缓存数组的长度
  const len = nums.length;
  // 定义结果数组
  const res = [];
  // 初始化左指针
  let left = 0;
  // 初始化右指针
  let right = k - 1;
  // 当数组没有被遍历完时，执行循环体内的逻辑
  while (right < len) {
    // 计算当前窗口内的最大值
    const max = calMax(nums, left, right);
    // 将最大值推入结果数组
    res.push(max);
    // 左指针前进一步
    left++;
    // 右指针前进一步
    right++;
  }
  // 返回结果数组
  return res;
};

// 这个函数用来计算最大值，也能直接使用这个代替：Math.max
function calMax(arr, left, right) {
  // 处理数组为空的边界情况
  if (!arr || !arr.length) {
    return;
  }
  // 初始化 maxNum 的值为窗口内第一个元素
  let maxNum = arr[left];
  // 遍历窗口内所有元素，更新 maxNum 的值
  for (let i = left; i <= right; i++) {
    if (arr[i] > maxNum) {
      maxNum = arr[i];
    }
  }
  // 返回最大值
  return maxNum;
}
```
但是这个解法的复杂度应该是数组长度n * 窗口大小k : O(nk)

**我们使用双端队列来实现线性时间复杂度 0(n)**

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/171918a1ae330dd3~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/19/171918a1ae330dd3~tplv-t2oaga2asx-watermark.awebp)</a><br>

思路：0(nk) ==> 0(n) 就要把 k 去掉 ，我们**维护一个`递减的双端队列`,并且保证这个双端队列的队头一定是最大值**，我们最后要的结果就是这个最大值。跟栈问题的每日温度思路其实有点异曲同工
- 定义双端队列 deque = []，遍历数组数组nums时，为了满足双端队列的递减性，当 `deque.length && 队列的队尾(nums[deque[deque.length - 1]]) < nums[i]`,即遍历到的数据比我们的队列队尾值要大，那么就不满足递减了
    - 需要将队尾的值出队，即：deque.pop()，直到 nums[i] >= 队尾元素
- 有两个关键节点：
    - 当队头 deque[0] 已经不在滑动窗口了：`deque[0] <= i - k`，这时需要出队:`deque.shift()`，因为它已经没意义了
    - 当遍历元素的个数大于滑动窗口大小时，我们把队头的元素 push 到结果数组即可

上代码：
```
// 传进来的是数组nums，以及窗口大小k
const maxSlidingWindow = function (nums, k) {
  // 缓存数组的长度
  const len = nums.length;
  // 初始化结果数组
  const res = [];
  // 初始化双端队列
  const deque = [];
  // 开始遍历数组
  for (let i = 0; i < len; i++) {
    // 当队尾元素小于当前元素时
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) {
      // 将队尾元素（索引）不断出队，直至队尾元素大于等于当前元素
      deque.pop();
    }
    // 入队当前元素索引（注意是索引）
    deque.push(i);
    // 当队头元素的索引已经被排除在滑动窗口之外时
    while (deque.length && deque[0] <= i - k) {
      // 将队头元素索引出队
      deque.shift();
    }
    // 判断滑动窗口的状态，只有在被遍历的元素个数大于 k 的时候，才更新结果数组
    if (i >= k - 1) {
      res.push(nums[deque[0]]);
    }
  }
  // 返回结果数组
  return res;
};
```

## 总结
用栈实现队列:<br>
定义两个栈，其中辅助栈是正常栈的逆序，也就是队列要的结果，保证辅助栈顺序的要点是：必须在辅助栈为空时才能入栈。push 操作是相同，在 pop 中要注意判断辅助栈为空时将正常栈的值push过去。

滑动窗口最大值：<br>
常规做法就是快慢指针

双端队列法：维护一个`递减趋势的双端队列`，滑动窗口想要的结果其实就是队头的数据，在遍历时注意赋结果值的条件，以及队头元素的及时剔除

