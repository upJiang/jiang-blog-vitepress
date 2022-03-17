二叉搜索树定义：
- 是一棵空树
- 是一棵由根结点、左子树、右子树组成的树，同时左子树和右子树都是二叉搜索树，且`左子树`上所有结点的数据域都`小于等于`根结点的数据域，`右子树`上所有结点的数据域都`大于等于`根结点的数据域

简单来说就是树的左边数据都要比根数据的小，右边的都要比根数据的大，，，即从左到右递增的感觉

<a data-fancybox title="img" href="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/81507c52878942b08f5f5a781ee8944c~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp">![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/81507c52878942b08f5f5a781ee8944c~tplv-k3u1fbpfcp-zoom-in-crop-mark:1304:0:0:0.awebp)</a>

关于二叉搜索树，高频操作：
- 查找数据域为某一特定值的结点
- 插入新结点
- 删除指定结点

### 查找数据域为某一特定值的结点
假设这个目标结点的数据域值为 `n`，我们借助二叉搜索树数据域的有序性，可以有以下查找思路：
- 1. 假设这个目标结点的数据域值为 n，我们借助二叉搜索树数据域的有序性，可以有以下查找思路：
- 2. 若当前遍历到的结点对应的数据域值刚好等于n，则查找成功，返回。
- 3. 若当前遍历到的结点对应的数据域值大于目标值n，则应该在左子树里进一步查找，设置下一步的遍历范围为 `root.left` 后，继续递归。
- 4. 若当前遍历到的结点对应的数据域值小于目标值n，则应该在右子树里进一步查找，设置下一步的遍历范围为 `root.right` 后，继续递归。

编码实现
```
function search(root, n) {
    // 若 root 为空，查找失败，直接返回
    if(!root) {
        return 
    }
    // 找到目标结点，输出结点对象
    if(root.val === n) {
        console.log('目标结点是：', root)
    } else if(root.val > n) {
        // 当前结点数据域大于n，向左查找
        search(root.left, n)
    } else {
        // 当前结点数据域小于n，向右查找
        search(root.right, n)
    }
}
```

### 插入新结点
思路：<br>
其实跟查找数据域是一样的，从根结点开始，把我们希望插入的数据值和每一个结点作比较。若大于当前结点，则向右子树探索；若小于当前结点，则向左子树探索。最后找到的那个空位，就是它合理的栖身之所。
```
function insertIntoBST(root, n) {
    // 若 root 为空，说明当前是一个可以插入的空位
    if(!root) { 
        // 用一个值为n的结点占据这个空位
        root = new TreeNode(n)
        return root
    }
    
    if(root.val > n) {
        // 当前结点数据域大于n，向左查找
        root.left = insertIntoBST(root.left, n)
    } else {
        // 当前结点数据域小于n，向右查找
        root.right = insertIntoBST(root.right, n)
    }

    // 返回插入后二叉搜索树的根结点
    return root
}
```
### 删除指定结点
思路：<br>
- 1. 结点不存在，定位到了空结点。直接返回即可。
- 2. 需要删除的目标结点没有左孩子也没有右孩子——它是一个叶子结点，删掉它不会对其它结点造成任何影响，直接删除即可。
- 3. 需要删除的目标结点存在左子树，那么就去左子树里寻找小于目标结点值的最大结点，用这个结点覆盖掉目标结点
- 4. 需要删除的目标结点存在右子树，那么就去右子树里寻找大于目标结点值的最小结点，用这个结点覆盖掉目标结点
- 5. 需要删除的目标结点既有左子树、又有右子树，这时就有两种做法了：要么取左子树中值最大的结点，要么取右子树中取值最小的结点。两个结点中任取一个覆盖掉目标结点，都可以维持二叉搜索树的数据有序性

```
function deleteNode(root, n) {
    // 如果没找到目标结点，则直接返回
    if(!root) {
        return root
    }
    // 定位到目标结点，开始分情况处理删除动作
    if(root.val === n) {
        // 若是叶子结点，则不需要想太多，直接删除
        if(!root.left && !root.right) {
            root = null
        } else if(root.left) {
            // 寻找左子树里值最大的结点
            const maxLeft = findMax(root.left)
            // 用这个 maxLeft 覆盖掉需要删除的当前结点  
            root.val = maxLeft.val
            // 覆盖动作会消耗掉原有的 maxLeft 结点
            root.left = deleteNode(root.left, maxLeft.val)
        } else {
            // 寻找右子树里值最小的结点
            const minRight = findMin(root.right)
            // 用这个 minRight 覆盖掉需要删除的当前结点  
            root.val = minRight.val
            // 覆盖动作会消耗掉原有的 minRight 结点
            root.right = deleteNode(root.right, minRight.val)
        }
    } else if(root.val > n) {
        // 若当前结点的值比 n 大，则在左子树中继续寻找目标结点
        root.left = deleteNode(root.left, n)
    } else  {
        // 若当前结点的值比 n 小，则在右子树中继续寻找目标结点
        root.right = deleteNode(root.right, n)
    }
    return root
}

// 寻找左子树最大值
function findMax(root) {
    while(root.right) {
        root = root.right
    }
    return root 
}

// 寻找右子树的最小值
function findMin(root) {
    while(root.left) {
        root = root.left
    }
    return root
}
```
### 二叉搜索树的特性
**二叉搜索树的中序遍历序列是有序的！**

### 真题实战
>题目描述：给定一个二叉树，判断其是否是一个有效的二叉搜索树。

例：
```
    2
   / \
  1   3
true

    5
   / \
  1   4
     / \
    3   6
false
解释: 输入为: [5,1,4,null,null,3,6]。
根节点的值为 5 ，但是其右子节点值为 4 。
```
思路：
空树的判定比较简单，关键在于非空树的判定：需要递归地对非空树中的左右子树进行遍历，检验每棵子树中是否都满足 `左 < 根 < 右` 这样的关系（注意题中声明了不需要考虑相等情况）。
```
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
const isValidBST = function(root) {
  // 定义递归函数
  function dfs(root, minValue, maxValue) {
      // 若是空树，则合法
      if(!root) {
          return true
      }
      // 若右孩子不大于根结点值，或者左孩子不小于根结点值，则不合法
      if(root.val <= minValue || root.val >= maxValue) return false
      // 左右子树必须都符合二叉搜索树的数据域大小关系
      return dfs(root.left, minValue,root.val) && dfs(root.right, root.val, maxValue)
  }
  // 初始化最小值和最大值为极小或极大
  return dfs(root, -Infinity, Infinity)
};
```
编码复盘:

递归过程中，起到决定性作用的是这两个判定条件：
- 左孩子的值是否小于根结点值
- 右孩子的值是否大于根结点值

在递归式中，如果单独维护一段逻辑，用于判定当前是左孩子还是右孩子，进而决定是进行大于判定还是小于判定，也是没问题的。但是在上面的编码中我们采取了一种更简洁的手法，通过设置 `minValue` 和 `maxValue` 为极小和极大值，来确保 `root.val <= minValue || root.val >= maxValue` 这两个条件中有一个是一定为 `false` 的。

比如当前我需要检查的是 `root` 的左孩子，那么就会进入 `dfs(root.left, minValue,root.val)` 这段逻辑。这个`dfs`调用将最大值更新为了`root`根结点的值，将当前`root`结点更新为了左孩子结点，同时保持最小值为 `-Infinity` 不变。进入 dfs逻辑后，`root.val <= minValue || root.val >= maxValue` 中的 `root.val <= minValue` 一定为 `false` ，起决定性作用的条件实际是 `root.val >= maxValue`（这里这个 maxValue 正是根结点的数据域值)。若`root.val >= maxValue`返回 `true`，就意味着左孩子的值大于等于（也就是不小于）根结点的数据域值，这显然是不合法的。此时整个或语句都会返回`true`，递归式返回`false`，二叉搜索树进而会被判定为不合法。

### 将排序数组转化为二叉搜索树
>题目描述：将一个按照升序排列的有序数组，转换为一棵高度平衡二叉搜索树。

本题中，一个高度平衡二叉树是指一个二叉树每个节点 的左右两个子树的高度差的绝对值不超过 1。<br>
示例:<br>
给定有序数组: [-10,-3,0,5,9],<br>
一个可能的答案是：[0,-3,9,-10,null,5]，它可以表示下面这个高度平衡二叉搜索树：<br>
```
      0
     / \
   -3   9
   /   /
 -10  5
```
思路：<br>

可以看到答案好像是在数组中间把中间值拿出来，然后形成一棵树。如果是偶数个数，那么我们提取中间的左边或者右边都能保证两个子树的高度差不超过1。

**“以中间元素为根结点，将数组提成树”**这种操作，可以保证根结点左右两侧的子树高度绝对值不大于1。要想保证每一棵子树都满足这个条件，我们只需要对有序数组的每一个对半分出来的子序列都递归地执行这个操作即可。

编码实现
```
/**
 * @param {number[]} nums
 * @return {TreeNode}
 */
const sortedArrayToBST = function(nums) {
    // 处理边界条件
    if(!nums.length) {
        return null
    }
    
    // root 结点是递归“提”起数组的结果
    const root = buildBST(0, nums.length-1)

    // 定义二叉树构建函数，入参是子序列的索引范围
    function buildBST(low, high) {
        // 当 low > high 时，意味着当前范围的数字已经被递归处理完全了
        if(low > high) {
            return null
        }
        // 二分一下，取出当前子序列的中间元素，Math.floor( 45.95) = 45 向下取整;
        const mid = Math.floor(low + (high - low)/2)  
        // 将中间元素的值作为当前子树的根结点值
        const cur = new TreeNode(nums[mid]) 
        // 递归构建左子树，范围二分为[low,mid)
        cur.left = buildBST(low,mid-1)
        // 递归构建右子树，范围二分为为(mid,high]
        cur.right = buildBST(mid+1, high)
        // 返回当前结点
        return cur
    }
    // 返回根结点
    return root
};
```

### 什么是平衡二叉树
>平衡二叉树（又称 AVL Tree）指的是任意结点的左右子树高度差绝对值都不大于1的二叉搜索树。

#### 为什么要有平衡二叉树
平衡二叉树的出现，是为了降低二叉搜索树的查找时间复杂度。

**二叉搜索树的妙处就在于它把“二分”这种思想以数据结构的形式表达了出来**。在一个构造合理的二叉搜索树里，我们可以通过对比当前结点和目标值之间的大小关系，缩小下一步的搜索范围（比如只搜索左子树或者只搜索右子树），进而规避掉不必要的查找步骤，降低搜索过程的时间复杂度。

为了保证二叉搜索树能够确实为查找操作带来效率上的提升，我们有必要在构造二叉搜索树的过程中维持其平衡度，这就是平衡二叉树的来由。
