链表的命题规律：
- 链表的处理：合并、删除等（删除操作画个记号，重点中的重点！）
- 链表的反转及其衍生题目
- 链表成环问题及其衍生题目

## 链表的合并
>真题描述：将两个有序链表合并为一个新的有序链表并返回。新链表是通过拼接给定的两个链表的所有结点组成的。 

示例：输入：1->2->4, 1->3->4 输出：1->1->2->3->4->4

我们回忆一下数组，题目逻辑是一样，数组使用的是双指针法，以第一个数组为底，长度为两数组之后。指针同时从末尾开始往左移动，通过判断两数组值移动赋值。

在链表里面，没有索引这个概念，它就像一个链子，我们只要改变了 next 指向，就会改变整个链表的长度。所以在这题中，我们只需要定义一个链表，然后从头开始比较两个链表初始位置的大小，将较小的顺序插入新链表中，然后改变被插入的head等于它的 next 即可，同时改变新链表的当前 head。后面将剩余的链表末段指向新链表末尾即可。

```
const mergeTwoLists = function(l1, l2) {
  // 定义头结点，确保链表可以被访问到
  let head = new ListNode()
  // cur 这里就是咱们那根“针”
  let cur = head
  // “针”开始在 l1 和 l2 间穿梭了
  while(l1 && l2) {
      // 如果 l1 的结点值较小
      if(l1.val<=l2.val) {
          // 先串起 l1 的结点
          cur.next = l1
          // l1 指针向前一步
          l1 = l1.next
      } else {
          // l2 较小时，串起 l2 结点
          cur.next = l2
          // l2 向前一步
          l2 = l2.next
      }
      
      // “针”在串起一个结点后，也会往前一步
      cur = cur.next 

  }
  
  // 处理链表不等长的情况
  cur.next = l1!==null?l1:l2
  // 返回起始结点
  return head.next
};
```

## 链表结点的删除
>真题描述：给定一个`排序链表`，删除所有重复的元素，使得每个元素只出现一次。

示例：<br>
输入: 1->1->2->3->3 <br>
输出: 1->2->3

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e6f3b38195ccf~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e6f3b38195ccf~tplv-t2oaga2asx-watermark.awebp)</a>

思路：因为是有序链表，在满足 cur != null && cur.next != null 下判断 cur.val === cur.next.val 即可,注意通过 while 循环时要改变 cur 的 head （cur = cur.next;）
```
const deleteDuplicates = function(head) {
    // 设定 cur 指针，初始位置为链表第一个结点
    let cur = head;
    // 遍历链表
    while(cur != null && cur.next != null) {
        // 若当前结点和它后面一个结点值相等（重复）
        if(cur.val === cur.next.val) {
            // 删除靠后的那个结点（去重）
            cur.next = cur.next.next;
        } else {
            // 若不重复，继续遍历
            cur = cur.next;
        }
    }
    return head;
};
```

## 删除问题的延伸——dummy 结点登场
>真题描述：给定一个排序链表，删除所有含有重复数字的结点，只保留原始链表中 没有重复出现的数字。

示例：<br>
输入: 1->2->3->3->4->4->5<br>
输出: 1->2->5<br>

思路：
- 跟上面一道题很像，只是要把相同的都删掉不做保留，试想一下，如果当走到 cur.val === cur.next.val ，我们是无法删除 cur 这个结点的，因为我们无法拿到的它的前驱结点并改变，或者说我们的第一个结点没有前驱结点，没办法删除。
- `dummy 结点`，就是咱们**人为制造出来的第一个结点的前驱结点**。我们定义一个新链表 dummy，把 dummy 的 next 指向目标链表，这样就为目标链表的首部创建了前驱结点，就能够进行删除了。但要注意我们比较的应该是：dummy.next.val === dummy.next.next.val,

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e7109a0a2ad77~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/17/170e7109a0a2ad77~tplv-t2oaga2asx-watermark.awebp)</a>

这样一来，如果想要删除两个连续重复的值为 1 的结点，我们只需要把 dummy 结点的 next 指针直接指向 2：

```
const deleteDuplicates = function(head) {
    // 极端情况：0个或1个结点，则不会重复，直接返回
    if(!head || !head.next) {
        return head
    }
    // dummy 登场
    let dummy = new ListNode() 
    // dummy 永远指向头结点
    dummy.next = head   
    // cur 从 dummy 开始遍历
    let cur = dummy 
    // 当 cur 的后面有至少两个结点时
    while(cur.next && cur.next.next) {
        // 对 cur 后面的两个结点进行比较
        if(cur.next.val === cur.next.next.val) {
            // 若值重复，则记下这个值
            let val = cur.next.val
            // 反复地排查后面的元素是否存在多次重复该值的情况
            while(cur.next && cur.next.val===val) {
                // 若有，则删除
                cur.next = cur.next.next 
            }
        } else {
            // 若不重复，则正常遍历
            cur = cur.next
        }
    }
    // 返回链表的起始结点
    return dummy.next;
};
```

## 链表总结
链表的处理思维跟数组完全不同，我们应该忘记那些双指针，对撞指针，Map，
- 增删聚焦在改变 next 中，
- 判断 cur.val === cur.next.val ，
- 修改当前结点指向：cur = cur.next
- 返回链表头 head（dummy.next）
- 无法处理的就增加一个前驱结点，使用 dummy 结点。