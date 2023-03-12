着重掌握的排序算法，主要是以下5种：
- 基础排序算法：
    - 冒泡排序
    - 插入排序
    - 选择排序
- 进阶排序算法
    - 归并排序
    - 快速排序

## 冒泡排序
记住两层都是等于0开始，第二层循环时 j<len -1 -i 为最优即可
### 最简单版本
```
[5, 3, 2, 4, 1]

[3, 5, 2, 4, 1]
 ↑  ↑

[3, 2, 5, 4, 1]
    ↑  ↑

[3, 2, 4, 5, 1]
       ↑  ↑

[3, 2, 4, 1, 5]
          ↑ ↑
```
思路：不考虑优化：就是利用两层循环，循环对比相邻的两个数到末尾，每次都把较大的往右移动，每一轮遍历都能把较大的移动到末尾
```
function bubbleSort(arr) {
    // 缓存数组长度
    const len = arr.length  
    // 外层循环用于控制从头到尾的比较+交换到底有多少轮
    for(let i=0;i<len;i++) {  
        // 内层循环用于完成每一轮遍历过程中的重复比较+交换
        for(let j=0;j<len-1;j++) {
            // 若相邻元素前面的数比后面的大
            if(arr[j] > arr[j+1]) {  
                // 交换两者
                [arr[j], arr[j+1]] = [arr[j+1], arr[j]]
                // 或者使用
                let temp = arr[j]
                arr[j] = arr[j + 1]
                a[j + 1] = temp
            }
        }
    }
    // 返回数组
    return arr
}
```
### 改进版冒泡排序的编码实现
当走完第 n 轮循环的时候，数组的后 n 个元素就已经是有序的。下面实现不遍历后面排好序的写法：
```
function betterBubbleSort(arr) {
    const len = arr.length  
    for(let i=0;i<len;i++) {
        // 注意差别在这行，我们对内层循环的范围作了限制
        for(let j=0;j<len-1-i;j++) {
            if(arr[j] > arr[j+1]) {
                [arr[j], arr[j+1]] = [arr[j+1], arr[j]]
            }
        }
    }
    return arr
}
```

### 最好情况下的冒泡排序
有时候数组它本身就是排好序的，这就是最好情况，那么遇到这种情况如何实现 0(n) 的时间复杂度

通过添加 flag 判断里面那层循环是否做过交换即可
```
function betterBubbleSort(arr) {
    const len = arr.length  
    
    for(let i=0;i<len;i++) {
        // 区别在这里，我们加了一个标志位
        let flag = false
        for(let j=0;j<len-1-i;j++) {
            if(arr[j] > arr[j+1]) {
                [arr[j], arr[j+1]] = [arr[j+1], arr[j]]
                // 只要发生了一次交换，就修改标志位
                flag = true
            }
        }
        
        // 若一次交换也没发生，则说明数组有序，直接放过
        if(flag == false)  return arr;
    }
    return arr
}
```

## 选择排序
思路：<br>
选择，顾名思义就是有选择的把最小的排到前面。<br>
打个比方，有5个数的数组，一开始先把5个当中的最小放第一位，然后把剩余四个的最小放第二位，，，以此下去就排序好了。<br>
但是，有个关键点就是如何把后面比较的最小结果放到前面位置，就是根据你当前遍历的index，arr[index] = 比较的最小值，也就是交换一下位置即可<br>
```
function selectSort(arr)  {
  // 缓存数组长度
  const len = arr.length 
  // 定义 minIndex，缓存当前区间最小值的索引，注意是索引
  let minIndex  
  // i 是当前排序区间的起点
  for(let i = 0; i < len - 1; i++) { 
    // 初始化 minIndex 为当前区间第一个元素
    minIndex = i  
    // i、j分别定义当前区间的上下界，i是左边界，j是右边界
    for(let j = i; j < len; j++) {  
      // 若 j 处的数据项比当前最小值还要小，则更新最小值索引为 j
      if(arr[j] < arr[minIndex]) {  
        minIndex = j
      }
    }
    // 如果 minIndex 对应元素不是目前的头部元素，则交换两者
    if(minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]
    }
  }
  return arr
}
```
在时间复杂度这方面，选择排序没有那么多弯弯绕绕：最好情况也好，最坏情况也罢，两者之间的区别仅仅在于元素交换的次数不同，但都是要走内层循环作比较的。因此选择排序的三个时间复杂度都对应两层循环消耗的时间量级： O(n^2)。

## 插入排序
思路：
- 把数组首位看作是有序序列，从arr[1] 开始遍历
- 遍历时，a[i] 每次都跟前面的做对比，只有当a[i] < a[i-1] 时，就把这个a[i]插入到这个位置中
    - 为了不直接改变原数组，我们需要为i 跟 a[i] 做一个替身，用于遍历。 let j = i;temp = arr[i]  
    - ```
         while(j > 0 && arr[j-1] > temp) {
             // 如果是，则将 j 前面的一个元素后移一位，为 temp 让出位置
              arr[j] = arr[j-1]   
              j--
         }
      ```

编码实现
```
function insertSort(arr) {
  // 缓存数组长度
  const len = arr.length
  // temp 用来保存当前需要插入的元素
  let temp  
  // i用于标识每次被插入的元素的索引
  for(let i = 1;i < len; i++) {
    // j用于帮助 temp 寻找自己应该有的定位
    let j = i
    temp = arr[i]  
    // 判断 j 前面一个元素是否比 temp 大
    while(j > 0 && arr[j-1] > temp) {
      // 如果是，则将 j 前面的一个元素后移一位，为 temp 让出位置
      arr[j] = arr[j-1]   
      j--
    }
    // 循环让位，最后得到的 j 就是 temp 的正确索引
    arr[j] = temp
  }
  return arr
}
```
插入排序的时间复杂度
- 最好时间复杂度：它对应的数组本身就有序这种情况。此时内层循环只走一次，整体复杂度取决于外层循环，时间复杂度就是一层循环对应的 O(n)。
- 最坏时间复杂度：它对应的是数组完全逆序这种情况。此时内层循环每次都要移动有序序列里的所有元素，因此时间复杂度对应的就是两层循环的 O(n^2)
- 平均时间复杂度：O(n^2)

## 总结
- 1、冒泡排序 ==》对比+交换 ==》最好情况复杂度为O(n)，最坏也是O(n^2)
- 2、选择排序 ==》选择最小的元素到 当前区间 的最前边 ==》时间复杂度O(n^2)
- 3、插入排序 ==》选择后面的元素插入到前面的 有序数组 ==》时间复杂度一般为O(n^2)
