栈与队列相关的问题就比较微妙了，很多时候相关题目中压根不会出现“栈”、“队列”这样的关键字，但只要你深入到真题里去、对栈和队列的应用场景建立起正确的感知，那么很多线索都会在分析的过程中被你轻松地挖掘出来。
## 栈-“有效括号”问题
可以记下一个规律：题目中若涉及括号问题，则很有可能和栈相关。
>题目描述：给定一个只包括 '('，')'，'{'，'}'，'['，']' 的字符串，判断字符串是否有效。

示例 1: <br>
输入: "()" <br>
输出: true <br>
示例 2: <br>
输入: "([)]" <br>
输出: false <br>

思路：
- **关键思路就是栈入栈跟出栈的对称性，恰好括号也是对称的。最后一个入栈的左括号，第一个出栈的右括号一定要与之匹配**
- 定义一个Map，key 为左括号，value 为右括号
- 定义一个栈stack []，遍历字符串，将遇到的左括号映射的右括号:`stack.push(leftToRight[ch])`入栈
- 遇到的右括号必须要满足 stack.pop() <返回的是pop掉的值，即左括号映射的右括号> === 遇到的右括号，如果不满足或者stack.length === 0：即没有左括号右括号就出现了。那么就返回false
- 最后遍历完后，stack应该是空的，return !stack.length

```
// 用一个 map 来维护左括号和右括号的对应关系
const leftToRight = {
  "(": ")",
  "[": "]",
  "{": "}"
};

/**
 * @param {string} s
 * @return {boolean}
 */
const isValid = function(s) {
  // 结合题意，空字符串无条件判断为 true
  if (!s) {
    return true;
  }
  // 初始化 stack 数组
  const stack = [];
  // 缓存字符串长度
  const len = s.length;
  // 遍历字符串
  for (let i = 0; i < len; i++) {
    // 缓存单个字符
    const ch = s[i];
    // 判断是否是左括号，这里我为了实现加速，没有用数组的 includes 方法，直接手写判断逻辑
    if (ch === "(" || ch === "{" || ch === "[") stack.push(leftToRight[ch]);
    // 若不是左括号，则必须是和栈顶的左括号相配对的右括号
    else {
      // 若栈不为空，且栈顶的左括号没有和当前字符匹配上，那么判为无效
      if (!stack.length || stack.pop() !== ch) {
        return false;
      }
    }
  }
  // 若所有的括号都能配对成功，那么最后栈应该是空的
  return !stack.length;
};
```

## 栈问题进阶-每日温度问题
>题目描述: 根据每日气温列表，请重新生成一个列表，对应位置的输出是需要再等待多久温度才会升高超过该日的天数。如果之后都不会升高，请在该位置用 0 来代替。

示例：
例如，给定一个列表 temperatures = [73, 74, 75, 71, 69, 72, 76, 73]，你的输出应该是 [1, 1, 4, 2, 1, 1, 0, 0]。

最简单的方式就是两层 for 循环，第二层遍历的数字每次都与第一层的数字比较大小，统计索引的差值。这种做法在时间复杂度上不是很好。

使用栈的方式：
- 初始化一个结果数组：const res = (new Array(len)).fill(0) //  初始化结果数组，注意数组定长，占位为0
- 初始化一个栈 stack，`用于存储递减的温度对应的索引`，这个栈一定是递减的，并且每个数字只 push 一次
    - 这个逻辑有点绕，我们比较的时候，只会比较入栈后的数据与当前遍历的数据，并且数组的数据只会入栈一次，而且这个栈的数据一定是递减的
    - 比如说 [9,8,7,6,5,10],在遍历第一个 9 时，在不满足 arr[i] > 栈顶：arr[stack[stack.length - 1]] 时，我们只入栈不出栈，通过这个限制条件保证栈都是递减的
    - 当遇到 10 时，arr[i] > 栈顶：arr[stack[stack.length - 1]]：10 > 9,我们将栈顶 10 对应的索引 pop掉，并且10 的结果就是当前10的索引跟当前i的差值：res[top] = i - top 
    - **注意注意：这个时候你已经遍历完了，进入到了  while(stack.length && T[i] > T[stack[stack.length-1]]) 的条件中，这时我们不断的把栈 pop掉，一直循环 while 把前面的 [9,8,7,6,5]的结果都计算出来，并且都应该是跟10这个数字的差值。**很多人看不懂解题思路就是这里没理解好！！！

上代码：
```
// 入参是温度数组
const dailyTemperatures = function(T) {
    const len = T.length // 缓存数组的长度 
    const stack = [] // 初始化一个栈   
    const res = (new Array(len)).fill(0) //  初始化结果数组，注意数组定长，占位为0
    for(let i=0;i<len;i++) {
      // 若栈不为0，且存在打破递减趋势的温度值
      while(stack.length && T[i] > T[stack[stack.length-1]]) {
        // 将栈顶温度值对应的索引出栈
        const top = stack.pop()  
        // 计算 当前栈顶温度值与第一个高于它的温度值 的索引差值
        res[top] = i - top 
      }
      // 注意栈里存的不是温度值，而是索引值，这是为了后面方便计算
      stack.push(i)
    }
    // 返回结果数组
    return res 
};
```

## 栈的设计——“最小栈”问题
>题目描述：设计一个支持 push ，pop ，top 操作，并能在常数时间内检索到最小元素的栈。

push(x) —— 将元素 x 推入栈中。<br>
pop() —— 删除栈顶的元素。<br>
top() —— 获取栈顶元素。<br>
getMin() —— 检索栈中的最小元素。<br>

示例:<br>
MinStack minStack = new MinStack();<br>
minStack.push(-2);<br>
minStack.push(0);<br>
minStack.push(-3);<br>
minStack.getMin(); --> 返回 -3.<br>
minStack.pop();<br>
minStack.top(); --> 返回 0.<br>
minStack.getMin(); --> 返回 -2.<br>

**解法一**
思路：其中push、pop、top 都比较简单，之前也学过了。针对于 getMin() 可以遍历一遍整个栈，定义一个值 minValue ，遍历时遇到比 minValue 还小的就将它赋值给 minValue。
但是这种做法的时间复杂度时 0(n)。先上代码：
```
/**
 * 初始化你的栈结构
 */
const MinStack = function() {
  this.stack = []
};

/** 
 * @param {number} x
 * @return {void}
 */
// 栈的入栈操作，其实就是数组的 push 方法
MinStack.prototype.push = function(x) {
  this.stack.push(x)
};

/**
 * @return {void}
 */
// 栈的入栈操作，其实就是数组的 pop 方法
MinStack.prototype.pop = function() {
  this.stack.pop()
};

/**
 * @return {number}
 */
// 取栈顶元素，咱们教过的哈，这里我本能地给它一个边界条件判断（其实不给也能通过，但是多做不错哈）
MinStack.prototype.top = function() {
  if(!this.stack || !this.stack.length) {
      return 
  }
  return this.stack[this.stack.length - 1]
};

/**
 * @return {number}
 */
// 按照一次遍历的思路取最小值
MinStack.prototype.getMin = function() {
    let minValue = Infinity  
    const  { stack } = this
    for(let i=0; i<stack.length;i++) {
        if(stack[i] < minValue) {
            minValue = stack[i]
        }
    }
    return minValue
};
```

**解法二**
思路：如何实现时间复杂度 0(1)，
- 其实就是我们在用户操作 push、pop 的时候就以给它把最小值存储起来了。我们新增一个辅助栈，这个辅助栈是递减的
- 在 push 时，除了正常栈的操作，我们还要判断当前入栈值是否比辅助栈的栈顶小，只有比较小才能入栈
- 在 pop 时，除了正常栈的操作，我们还要判断当前出栈值在辅助栈是否存在，存在，则辅助栈也要出栈
- 在上两个步骤完成后，那么这个正常栈的最小值就是辅助栈的栈顶了

上代码：
```
const MinStack = function() {
    this.stack = [];
    // 定义辅助栈
    this.stack2 = [];
};

/** 
 * @param {number} x
 * @return {void}
 */
MinStack.prototype.push = function(x) {
    this.stack.push(x);
    // 若入栈的值小于当前最小值，则推入辅助栈栈顶
    if(this.stack2.length == 0 || this.stack2[this.stack2.length-1] >= x){
        this.stack2.push(x);
    }
};

/**
 * @return {void}
 */
MinStack.prototype.pop = function() {
    // 若出栈的值和当前最小值相等，那么辅助栈也要对栈顶元素进行出栈，确保最小值的有效性
    if(this.stack.pop() == this.stack2[this.stack2.length-1]){
        this.stack2.pop();
    }
};

/**
 * @return {number}
 */
MinStack.prototype.top = function() {
    return this.stack[this.stack.length-1];
};

/**
 * @return {number}
 */
MinStack.prototype.getMin = function() {
    // 辅助栈的栈顶，存的就是目标中的最小值
    return this.stack2[this.stack2.length-1];
};
```

## 总结：
栈-后进先出，就像一个底部封闭的瓶子。

当遇到`“括号”`，就要想到栈的对称性，利用入栈的栈顶与第一个出栈的值对应的关系解题。

每日温度这种题，以及栈的最小值问题，都利用到了`递减栈`的概念，利用递减栈，可以实现降低时间复杂度。

比如`每日温度`这题，一开始很绕，其实它就是实现了一个递减栈，把数据入栈后，再通过 while 去处理数据，pop 栈取值，达到只循环一次的目的

栈最小值问题，就是新增辅助栈的递减，在实际 push、pop 过程中就把最小值给计算出来了。
