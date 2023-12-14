## 环形链表基本问题——如何判断链表是否成环？

> 真题描述：给定一个链表，判断链表中是否有环。

示例：<br> 输入：[3,2,0,4]（链表结构如下图） 输出：true <br> 解释：链表中存在一
个环 <br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/1712658d244622c4~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/1712658d244622c4~tplv-t2oaga2asx-watermark.awebp)</a>

思路：

- 从头开始遍历这个链表，所到之处，都定义一个 head.flag = true
- 如果遍历过程中遇到了 head.flag 为 true ,就说明重复了，那么就是有环

```
// 入参是头结点
const hasCycle = function(head) {
    // 只要结点存在，那么就继续遍历
    while(head){
        // 如果 flag 已经立过了，那么说明环存在
        if(head.flag){
            return true;
        }else{
            // 如果 flag 没立过，就立一个 flag 再往下走
            head.flag = true;
            head = head.next;
        }
    }
    return false;
};
```

## 环形链表衍生问题——定位环的起点

> 真题描述：给定一个链表，返回链表开始入环的第一个结点。 如果链表无环，则返回
> null。

示例：<br> 输入：head = [3,2,0,-4]（如下图） 输出：tail connects to node index 1
解释：链表中有一个环，其尾部连接到第二个结点。<br>
<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/1712658d244622c4~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/29/1712658d244622c4~tplv-t2oaga2asx-watermark.awebp)</a>

思路就是把第一次遇到 head.flag 为 true 的节点返回即可

```
const detectCycle = function(head) {
    while(head){
        if(head.flag){
            return head;
        }else{
            head.flag = true;
            head = head.next;
        }
    }
    return null;
};
```

## 总结

记住连边成环的判断思路：遍历打 flag，再次遇到 flag 为 true 即成环
