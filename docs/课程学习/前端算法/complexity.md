评价算法的两个重要依据——`时间复杂度`和`空间复杂度`

## 时间复杂度

代码段执行的次数。

```
function traverse2(arr) {
    var outLen = arr.length

    for(var i=0;i<outLen;i++) {
        var inLen = arr[i].length

        for(var j=0;j<inLen;j++) {
            console.log(arr[i][j])
        }
    }
}
```

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f38044f931dd~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f38044f931dd~tplv-t2oaga2asx-watermark.awebp)</a>

算法的时间复杂度，它反映的不是算法的逻辑代码到底被执行了多少次，而是随着输入规模的增大，算法对应的执行总次数的一个`变化趋势`

遍历 N 维数组，需要 N 层循环，我们只需要关心其最内层那个循环体被执行多少次就行了。<br> 规模为 `n*n` 的二维数组遍历时，最内层的循环会执行 `n*n` 次，其对应的时间复杂度是 O(n^2)。

常见的时间复杂度表达，除了多项式以外，还有 logn。我们一起来看另一个算法：

```
function fn(arr) {
    var len = arr.length

    for(var i=1;i<len;i=i*2) {
        console.log(arr[i])
    }
}
```

假设 i 在以 i=i\*2 的规则递增了 x 次之后，i<n 开始不成立（反过来说也就是 i>=n 成立）。那么此时我们要计算的其实就是这样一个数学方程：

```
2^x >= n
```

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f5c2b41495c3~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f5c2b41495c3~tplv-t2oaga2asx-watermark.awebp)</a>

也就是说，只有当 x 小于 log2n 的时候，循环才是成立的、循环体才能执行。注意涉及到对数的时间复杂度，底数和系数都是要被简化掉的。那么这里的 O(n) 就可以表示为：

```
O(n) = logn
```

常见的时间复杂度按照从小到大的顺序排列，有以下几种： <a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f67c52dc8d15~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/6/1714f67c52dc8d15~tplv-t2oaga2asx-watermark.awebp)</a>

## 空间复杂度

空间复杂度是对一个算法在运行过程中临时占用存储空间大小的量度。和时间复杂度相似，它是内存增长的趋势。<br> 常见的空间复杂度有 `O(1)`、`O(n)` 和 `O(n^2)`。

```
function traverse(arr) {
    var len = arr.length
    for(var i=0;i<len;i++) {
        console.log(arr[i])
    }
}
```

在 `traverse` 中，占用空间的有以下变量：

```
arr
len
i
```

后面尽管咱们做了很多次循环，但是这些都是时间上的开销。循环体在执行时，并没有开辟新的内存空间。因此，整个 traverse 函数对内存的占用量是恒定的，它对应的空间复杂度就是 `O(1)`。

下面我们来看另一个 🌰，此时我想要初始化一个规模为 n 的数组，并且要求这个数组的每个元素的值与其索引始终是相等关系，我可以这样写：

```
function init(n) {
    var arr = []
    for(var i=0;i<n;i++) {
        arr[i] = i  // 这时 arr 是变化的
    }
    return arr
}
```

在这个 `init` 中，涉及到的占用内存的变量有以下几个：

```
n
arr
i
```

注意这里这个 arr，它并不是一个一成不变的数组。**arr 最终的大小是由输入的 n 的大小决定的，它会随着 n 的增大而增大、呈一个线性关系。因此这个算法的空间复杂度就是 O(n)**。由此我们不难想象，假如需要初始化的是一个规模为 n\*n 的数组，那么它的空间复杂度就是 O(n^2) 啦。
