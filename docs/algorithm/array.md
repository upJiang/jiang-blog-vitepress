## Map 的妙用——两数求和问题
>真题描述： 给定一个整数数组 nums 和一个目标值 target，请你在该数组中找出和为目标值的那 两个 整数，并返回他们的数组下标。

给定 nums = [2, 7, 11, 15], target = 9
因为 nums[0] + nums[1] = 2 + 7 = 9 所以返回 [0, 1]

最淳朴的解法：两层循环来遍历同一个数组；第一层循环遍历的值记为 a，第二层循环时遍历的值记为 b；若 a+b = 目标值，那么 a 和 b 对应的数组下标就是我们想要的答案。但是这样做的时间复杂度是：O(n^2)

记住一个结论：**几乎所有的求和问题，都可以转化为求差问题**。 这道题就是一个典型的例子，通过把求和问题转化为求差问题，事情会变得更加简单。

思路：使用 Map 去存储已经遍历过的数字及其对应的索引值，**map 的 key 是遍历的数字，值是索引**。<br>
判断依据：差值就是 taget 值减去遍历的数字，如果差值在 Map 记录中存在，那么答案就出来了，就是当前的数字以及 Map 记录中 key 为差值的那一项

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/16/171815cf9cc83f3f~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/4/16/171815cf9cc83f3f~tplv-t2oaga2asx-watermark.awebp)</a>

使用 for 循环实现
```
const twoSum = (nums, target)=> {
    // 这里我用对象来模拟 map 的能力
    const diffs = {}
    // 缓存数组长度
    const len = nums.length
    // 遍历数组
    for(let i=0;i<len;i++) {
        // 判断 target 值减去当前遍历数字是否存在于 Map 中，存在则找到答案啦
        if(diffs[target-nums[i]] !== undefined) {
            // 若存在，返回这个差值对应的 Map key值的索引，以及当前索引
            return [diffs[target - nums[i]], i]
        }
        // 若不存在，则记录当前值
        diffs[nums[i]]=i
    }
};
```
使用 map 实现
```
const twoSum = (nums, target)=> {
    // 这里我用对象来模拟 map 的能力
    const diffs = new Map()
    // 缓存数组长度
    const len = nums.length

    for(let i=0;i<len;i++) {
        console.log(diffs);
        // 判断 target 值减去当前遍历数字是否存在于 Map 中，存在则找到答案啦
        if(diffs.get(target - nums[i]) !== undefined) {
            // 若存在，返回这个差值对应的 Map key值的索引，以及当前索引
            return [diffs.get(target - nums[i]), i]
        }
        // 若不存在，则记录当前值
        diffs.set(nums[i],i)
    }
};
```

## 强大的双指针法(数组一定要有序)
>合并两个有序数组：给你两个有序整数数组 nums1 和 nums2，请你将 nums2 合并到 nums1 中，使 nums1 成为一个有序数组。

输入:<br>
nums1 = [2,3,6,7,8], m = 5 <br>
nums2 = [3,4,5], n = 3 <br>
输出: [1,3,3,4,5,6,7,8] <br>

思路：
- 将 nums1 的长度变成两数组之和，即：nums1 = [2,3,6,7,8,0,0,0]，nums1 尾部索引 为 k = m + n -1
- 定义两个指针，head 分别指向两个数组的尾部, 分别为 m - 1,n - 1 
- 当两个指针都大于0时，比较对应值的大小，较大的那一方指针向前移动一位，nums1 的指针也向前移动一位，并且 nums1[k] = 较大值
- 遍历到最后，如果 m > n，因为我们初始化的时候就是拿的 nums1，所以不需要做任何操作；如果 m < n，那么我们把 nums2 后面那几个没有比较的数据插入到 nums1 即可

```
const merge = function(nums1, m, nums2, n) {
    // 初始化两个指针的指向，初始化 nums1 尾部索引k
    let i = m - 1, j = n - 1, k = m + n - 1
    // 当两个数组都没遍历完时，较大那一方的指针向前移动一位，并且 nums1 的指针 k 也向前移动一位
    while(i >= 0 && j >= 0) {
        // 取较大的值，从末尾往前填补
        if(nums1[i] >= nums2[j]) {
            nums1[k] = nums1[i] 
            i-- 
        } else {
            nums1[k] = nums2[j] 
            j-- 
        }
        k--
    }
    // nums2 留下的情况，特殊处理一下,把 nums2 后面那几个没有比较的数据插入到 nums1 
    while(j>=0) {
        nums1[k] = nums2[j]  
        k-- 
        j--
    }
    return nums1
};
console.log(merge([2,3,6,7,8],5,[3,4,5],3));  // [1,3,3,4,5,6,7,8]
```

## 三数求和问题(对撞指针法)
>真题描述：给你一个包含 n 个整数的数组 nums，判断 nums 中是否存在三个元素 a，b，c ，使得 a + b + c = 0 ？请你找出所有满足条件且**不重复**的三元组。

给定数组 nums = [-1, 0, 1, 2, -1, -4]， 满足要求的三元组集合为： [ [-1, 0, 1], [-1, -1, 2] ]

<a data-fancybox title="img" href="https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/15/170de65ecf8b277f~tplv-t2oaga2asx-watermark.awebp">![img](https://p1-jj.byteimg.com/tos-cn-i-t2oaga2asx/gold-user-assets/2020/3/15/170de65ecf8b277f~tplv-t2oaga2asx-watermark.awebp)</a>

思路：
- 双指针法只适用有序的数组，通过 sort 对数组先进行排序。定义结果数组 res = []
- 循环遍历数组，每次固定当前遍历值 nums[i]，定义两个指针分别位于固定值后面的首尾:j = i+1（首）,k = arr.length - 1。明白 k 肯定大于 j 的，如果遇到相同数据直接跳过 continue
- 遍历时，在满足 j < k 的条件下：判断 nums[i] + nums[j] + nums[k] = 0。如果大于0，说明 k 偏大，需要左移，即 k--；如果小于0，说明 j 偏小，需要右移 即 j++。同时如果遇到相同的数据则直接跳过进行移动操作。
- 在遍历过程中，遇到满足条件的将 res.push([nums[i],nums[j],nums[k]])，并且两个指针都要移动，并且判断是否遇到相同数据情况

```
const threeSum = function(nums) {
    // 用于存放结果数组
    let res = [] 
    // 给 nums 排序
    nums = nums.sort((a,b)=>{
        return a-b
    })
    // 缓存数组长度
    const len = nums.length
    // 注意我们遍历到倒数第三个数就足够了，因为左右指针会遍历后面两个数
    for(let i=0;i<len-2;i++) {
        // 左指针 j
        let j=i+1 
        // 右指针k
        let k=len-1   
        // 如果遇到重复的数字，则跳过
        if(i>0&&nums[i]===nums[i-1]) {
            continue
        }
        while(j<k) {
            // 三数之和小于0，左指针前进
            if(nums[i]+nums[j]+nums[k]<0){
                j++
               // 处理左指针元素重复的情况
               while(j<k&&nums[j]===nums[j-1]) {
                    j++
                }
            } else if(nums[i]+nums[j]+nums[k]>0){
                // 三数之和大于0，右指针后退
                k--
               
               // 处理右指针元素重复的情况
               while(j<k&&nums[k]===nums[k+1]) {
                    k--
                }
            } else {
                // 得到目标数字组合，推入结果数组
                res.push([nums[i],nums[j],nums[k]])
                
                // 左右指针一起前进
                j++  
                k--
               
                // 若左指针元素重复，跳过
                while(j<k&&nums[j]===nums[j-1]) {
                    j++
                }  
               
               // 若右指针元素重复，跳过
               while(j<k&&nums[k]===nums[k+1]) {
                    k--
                }
            }
        }
    }
    
    // 返回结果数组
    return res
};
```

## 总结
学到了两个方法：Map保存遍历值（求和转求差）、双指针法（同位置移动、固定值+对撞指针）仅针对有序数组

当遇到求和的问题，要转换成求差，通过Map去保存遍历数据，达到降低时间复杂度的效果

当遇到 “有序”和“数组”：立刻把双指针法调度进你的大脑内存。普通双指针走不通，立刻想对撞指针！

即便数组题目中并没有直接给出“有序”这个关键条件，我们在发觉普通思路走不下去的时候，也应该及时地尝试手动对其进行排序试试看有没有新的切入点——没有条件，创造条件也要上。

指针法好像就是，在满足条件的情况下，移动的时候比较大小，然后选择移动的目标或者方向，判断条件