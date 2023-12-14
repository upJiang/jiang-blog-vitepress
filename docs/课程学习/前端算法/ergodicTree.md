## 二叉树的遍历——命题思路解读

以一定的顺序规则，逐个访问二叉树的所有结点，这个过程就是二叉树的遍历。按照顺序规
则的不同，遍历方式有以下四种：

- 先序遍历
- 中序遍历
- 后序遍历
- 层次遍历

按照实现方式的不同，遍历方式又可以分为以下两种：

- 递归遍历（先、中、后序遍历）
- 迭代遍历（层次遍历）

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/14/17177af5d863f478~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/14/17177af5d863f478~tplv-t2oaga2asx-watermark.awebp)</a>

假如在保证“左子树一定先于右子树遍历”这个前提，那么遍历的可能顺序也不过三种：

- **根结点** -> 左子树 -> 右子树
- 左子树 -> **根结点** -> 右子树
- 左子树 -> 右子树 -> **根结点**

**所谓的“先序”、“中序”和“后序”，“先”、“中”、“后”其实就是指根结点的遍历时机。**

## 遍历方法图解与编码实现

树的结构：

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

**代码都相同，只是输出结点值得时机不同**

### 先序遍历

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

    //如果没有左右子树就是null，再次进来就return出去了
    // 递归遍历左子树
    preorder(root.left)
    // 递归遍历右子树
    preorder(root.right)
}
```

### 中序遍历

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f098b2bd1f9a~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f098b2bd1f9a~tplv-t2oaga2asx-watermark.awebp)</a>

```
// 所有遍历函数的入参都是树的根结点对象
function inorder(root) {
    // 递归边界，root 为空
    if(!root) {
        return
    }

    // 递归遍历左子树
    inorder(root.left)
    // 输出当前遍历的结点值
    console.log('当前遍历的结点值是：', root.val)
    // 递归遍历右子树
    inorder(root.right)
}
```

### 后序遍历

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714efce7db2cdff~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714efce7db2cdff~tplv-t2oaga2asx-watermark.awebp)</a>

```
function postorder(root) {
    // 递归边界，root 为空
    if(!root) {
        return
    }

    // 递归遍历左子树
    postorder(root.left)
    // 递归遍历右子树
    postorder(root.right)
    // 输出当前遍历的结点值
    console.log('当前遍历的结点值是：', root.val)
}
```

## 总结代码：

打印时机注意一下即可

```
function treeLoop(root){
    if(!root) return
    treeLoop(root.left)
    treeLoop(root.right)
}
```
