链表题目中，有一类会涉及到反复的遍历。涉及反复遍历的题目，题目本身虽然不会直接跟
你说“你好，我是一道需要反复遍历的题目”，但只要你尝试用常规的思路分析它，你会发现
它一定涉及反复遍历；同时，涉及反复遍历的题目，还有一个更明显的特征，就是它们往往
会涉及相对复杂的链表操作，比如反转、指定位置的删除等等。

解决这类问题，我们用到的是双指针中的“快慢指针”。快慢指针指的是两个一前一后的指针
，两个指针往同一个方向走，只是一个快一个慢。快慢指针严格来说只能有俩，不过实际做
题中，可能会出现一前、一中、一后的三个指针，这种超过两个指针的解题方法也叫“多指
针法”。

快慢指针+多指针，双管齐下，可以帮助我们解决链表中的大部分复杂操作问题。

## 快慢指针——删除链表的倒数第 N 个结点

> 真题描述：给定一个链表，删除链表的倒数第 n 个结点，并且返回链表的头结点。说明
> ：给定的 n 保证是有效的。

示例：<br> 给定一个链表: 1->2->3->4->5->null, 和 n = 2. <br> 当删除了倒数第二个
结点后，链表变为 1->2->3->5->null. <br>

### 思路：

不使用快慢指针的双层循环，将倒数往后变成正数往前，并结合 dummy 结点：

- 删除倒数的第 n 个结点，我们可以转换成正数，先遍历一遍链表获取长度 len
- 正数为: m = len - n + 1 ; 比如 len:7 n：2 那么我们需要删除的是：6 = 7 - 2 + 1
- 当遍历到 len-n 时，删除 此时的 next 即可
- 弊端：！两层循环

### 快慢指针登场（快慢指针相差的距离就是 n）

思路：

- 定义两个指针：slow 和 fast，全部指向链表的起始位——dummy 结点，它们之间相差的步
  数（距离/结点数）就是题目中的 n
- 当 fast 指针走到底了 !fast.next，那么 slow 此时的位置就是题目中倒数第 n -1 的
  位置，此时改变 slow 的 next： slow.next = slow.next.next

```
const removeNthFromEnd = function(head, n) {
    // 初始化 dummy 结点
    const dummy = new ListNode()
    // dummy指向头结点
    dummy.next = head
    // 初始化快慢指针，均指向dummy
    let fast = dummy
    let slow = dummy

    // 快指针闷头走 n 步
    while(n!==0){
        fast = fast.next
        n--
    }

    // 快慢指针一起走
    while(fast.next){
        fast = fast.next
        slow = slow.next
    }

    // 慢指针删除自己的后继结点
    slow.next = slow.next.next
    // 返回头结点
    return dummy.next
};
```

## 多指针法——链表的反转

> 完全反转一个链表: 定义一个函数，输入一个链表的头结点，反转该链表并输出反转后链
> 表的头结点。

示例: <br> 输入: 1->2->3->4->5->NULL <br> 输出: 5->4->3->2->1->NULL <br>

**处理链表的本质，是处理链表结点之间的指针关系。**
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/171260bdb3250b83~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/171260bdb3250b83~tplv-t2oaga2asx-watermark.awebp)</a>

转换成：

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/171260d3c16a73ec~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/171260d3c16a73ec~tplv-t2oaga2asx-watermark.awebp)</a>

通过反转指针，就是改变 cur.next = pre

```
// 反转指针
cur.next = pre;
// pre 往前走一步
pre = cur;
// cur往前走一步
cur = next;
```

编码实现：

```
const reverseList = function(head) {
    // 初始化前驱结点为 null
    let pre = null;
    // 初始化目标结点为头结点
    let cur = head;
    // 只要目标结点不为 null，遍历就得继续
    while (cur !== null) {
        // 记录一下 next 结点
        let next = cur.next;
        // 反转指针
        cur.next = pre;
        // pre 往前走一步
        pre = cur;
        // cur往前走一步
        cur = next;
    }
    // 反转结束后，pre 就会变成新链表的头结点
    return pre
};

// 递归实现
const ReverseList = function(head)
{
    if(head === null || head.next === null) return head;

    // 在脑海中想象一下，其实就是把下一项的 next 链子反过来指向了自己，然后把自己的 next 给删掉。
    // 重复递归就像是一个不断把右手搭到左边的感觉,再把左边清空
    head.next.next = head;
    head.next = null;

    return ReverseList(head.next);
};
```

### 局部反转一个链表

> 真题描述：反转从位置 m 到 n 的链表。请使用一趟扫描完成反转。

示例: 输入: 1->2->3->4->5->NULL, m = 2, n = 4 输出: 1->4->3->2->5->NULL

思路：

- 更上面的反转差不多，我们反转的是一个区间
- 当遍历到 m 时，我们需要记住这个区间起始点 m：leftHead = m；因为反转后这个
  m.next 指向最后一个遍历结点的 pre
- 并且记住区间的第一个结点 start，因为反转后这个 start.next 要指向区间的 next

```
// 入参是头结点、m、n
const reverseBetween = function(head, m, n) {
    // 定义pre、cur，用leftHead来承接整个区间的前驱结点
    let pre,cur,leftHead
    // 别忘了用 dummy 嗷
    const dummy = new ListNode()
    // dummy后继结点是头结点
    dummy.next = head
    // p是一个游标，用于遍历，最初指向 dummy
    let p = dummy
    // p往前走 m-1 步，走到整个区间的前驱结点处
    for(let i=0;i<m-1;i++){
        p = p.next
    }
    // 缓存这个前驱结点到 leftHead 里
    leftHead = p
    // start 是反转区间的第一个结点
    let start = leftHead.next
    // pre 指向start
    pre = start
    // cur 指向 start 的下一个结点
    cur = pre.next
    // 开始重复反转动作
    for(let i=m;i<n;i++){
        let next = cur.next
        cur.next = pre
        pre = cur
        cur = next
    }
    //  leftHead 的后继结点此时为反转后的区间的第一个结点
    leftHead.next = pre
    // 将区间内反转后的最后一个结点 next 指向 cur
    start.next=cur
    // dummy.next 永远指向链表头结点
    return dummy.next
};
```

## 总结

快慢指针就是通过快慢的距离差，来完成题目中倒数第几或者是间隔的问题。

多指针用来完成一些链表反转或者是局部反转问题,局部反转要考虑区间首尾的处理，记住
区间第一个节点以及上一个节点用于最后一步的反转

```
cur.next = pre
pre = cur
cur = next
```

也可以使用递归方法实现完全反转，通过不断改变 cur.next.next = cur;cur.next =
null,这么一个右手搭左边，把左边清空的感觉
