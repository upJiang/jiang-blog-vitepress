## 基本算法技能
### 反转字符串
将字符串通过split方法转换成数组 =》 使用 reverse 反转数组顺序 =》 在通过 join 方法拼接回去
```
const str = 'juejin'  
const res = str.split('').reverse().join('')

console.log(res) // nijeuj
```
也可以使用这个方法判断一个字符串是否是`回文字符串`(正着读和倒着读都一样的字符串)<br>
判断回文也可根据：从中间位置“劈开”，那么两边的两个子串在内容上是完全对称的
```
function isPalindrome(str) {
    // 缓存字符串的长度
    const len = str.length
    // 遍历前半部分，判断和后半部分是否对称
    for(let i=0;i<len/2;i++) {
        if(str[i]!==str[len-i-1]) {
            return false
        }
    }
    return true
}   
```

## 高频真题解读
### 回文字符串的衍生问题
>真题描述：给定一个非空字符串 s，最多删除一个字符。判断是否能成为回文字符串。

示例 1:<br>
输入: "aba"<br>
输出: True<br>
示例 2:<br>
输入: "abca"<br>
输出: True<br>
解释: 你可以删除c字符。<br>
注意: 字符串只包含从 a-z 的小写字母。字符串的最大长度是50000。<br>