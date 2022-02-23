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