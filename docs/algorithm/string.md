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

常规解法：遍历字符串，每次遍历都删掉当前元素，再判断是否是回文字符串，当有true时则成功返回。

**使用对撞指针解法思路：**
- 将指针指向首位，i = 0,j = len -1，满足 i < j && s[i] === s[j] 时两边同时往中间靠,这时候遍历过的双外层一定是互相相等，满足回文的，那么接下来我们只需要判断内层是否满足
- 当遇到不相等时 s[i] !== s[j]，我们要分别判断一下 ,如果满足则符合条件 return true
    - 1.删掉s[i]，判断内层满不满足回文： s[i +1] 到 s [j]
    - 2.删掉s[j]，判断内层满不满足回文： s[i] 到 s [j - 1]

简单理解就是，对撞指针往中间靠，判断一下分别删除左右两个值后内层是否满足回文。这样做可以减少循环次数！
```
const validPalindrome = function(s) {
    // 缓存字符串的长度
    const len = s.length
   
    // i、j分别为左右指针
    const i = 0,j = len - 1
    
    // 当左右指针均满足对称时，一起向中间前进
    while(i < j&&s[i] === s[j]){
        i ++
        j --
    }
    
    // 尝试判断跳过左指针元素后字符串是否回文
    if(isPalindrome(i+1,j)) {
      return true
    }
  
    // 尝试判断跳过右指针元素后字符串是否回文
    if(isPalindrome(i,j-1)) {
        return true
    }
  
    // 工具方法，用于判断字符串是否回文
    const isPalindrome = (i,j)=>{
        while(i < j){
            if(s[i] !== s[j]){
                return false
            }
            i++
            j--
        }
        return true
    }
      
    // 默认返回 false
    return false 
};
```

### 字符串匹配问题——正则表达式初相见
真题描述： 设计一个支持以下两种操作的数据结构：<br>
void addWord(word) <br>
bool search(word) <br>
search(word) 可以搜索文字或正则表达式字符串，字符串只包含字母 . 或 a-z 。 <br>
. 可以表示任何一个字母。 <br>

示例:
```
addWord("bad")
addWord("dad")
addWord("mad")
search("pad") -> false
search("bad") -> true
search(".ad") -> true
search("b..") -> true
说明:
你可以假设所有单词都是由小写字母 a-z 组成的。
```

思路：
- 定义一个 Map 去保存所有 add 进来的字符串，我们以字符串的长度作为key，把相同长度的值存到一个数组中，这样能大大降低查询的复杂度。
- 查找时，先匹配字符串长度 =》 再判断是否含有. 没有直接判断是否全等即可
- 若有., 通过正则判断是否符合
    - ```
        const reg = new RegExp(word)
        return this.words[len].some((item) => {
             return reg.test(item)
        })
      ```

这里主要学习
- 使用 Map 去保存数据，将字符串长度作为 key 降低查询的复杂度
- 学习 xx.prototype.addWord 的方式去给构造函数添加方法，后面通过new 对象调用方法
- 通过 new RegExp 去匹配正则

```
/**
 * 构造函数
 */
const WordDictionary = function () {
  // 初始化一个对象字面量，承担 Map 的角色
  this.words = {}
};

/**
  添加字符串的方法
 */
WordDictionary.prototype.addWord = function (word) {
  // 若该字符串对应长度的数组已经存在，则只做添加
  if (this.words[word.length]) {
    this.words[word.length].push(word)
  } else {
    // 若该字符串对应长度的数组还不存在，则先创建
    this.words[word.length] = [word]
  }

};

/**
  搜索方法
 */
WordDictionary.prototype.search = function (word) {
  // 若该字符串长度在 Map 中对应的数组根本不存在，则可判断该字符串不存在
  if (!this.words[word.length]) {
    return false
  }
  // 缓存目标字符串的长度
  const len = word.length
  // 如果字符串中不包含‘.’，那么一定是普通字符串
  if (!word.includes('.')) {
    // 定位到和目标字符串长度一致的字符串数组，在其中查找是否存在该字符串
    return this.words[len].includes(word)

  }

  // 否则是正则表达式，要先创建正则表达式对象
  const reg = new RegExp(word)

  // 只要数组中有一个匹配正则表达式的字符串，就返回true
  return this.words[len].some((item) => {
    return reg.test(item)
  })
 };

 使用：const WordD = new WordDictionary()
       WordD.addWord('asd)
```

### 正则表达式更进一步——字符串与数字之间的转换问题
>真题描述：请你来实现一个 atoi 函数，使其能将字符串转换成整数。

#### 分析：

1. 该函数会根据需要丢弃无用的开头空格字符，直到寻找到第一个非空格的字符为止——暗示你拿到字符串先去空格；
```
// 去除空格
let str = '      +10086'
str.trim() // '+10086'
```

2. 当我们寻找到的第一个非空字符为正或者负号时，则将该符号与之后面尽可能多的连续数字组合起来，作为该整数的正负号——暗示你识别开头的“+”字符和“-”字符；该字符串除了有效的整数部分之后也可能会存在多余的字符，这些字符可以被忽略，它们对于函数不应该造成影响——暗示你见到非整数字符就刹车；
```
// 使用正则匹配
/\s*([-\+]?[0-9]*).*/

\s 空格
()里面的保留，[] 里面的满足任何一个都行，
\+ 转义 +号 
.* 排除非数字
```
- 首先，\s 这个符号，意味着空字符，它可以用来匹配回车、空格、换行等空白区域，这里，它用来被匹配空格。`*这个符号，跟在其它符号后面，意味着“前面这个符号可以出现0次或多次。\s*`，这里的意思就是空格出现0次或多次，都可被匹配到。
- 接着 () 出现了。() 圈住的内容，就是我们要捕获起来额外存储的东西。
- []中的匹配符之间是“或”的关系，也就是说只要能匹配上其中一个就行了。这里[]中包括了-和\+，-不必说匹配的是对应字符，这个\+之所以加了一个斜杠符，是因为+本身是一个有特殊作用的正则匹配符，这里我们要让它回归+字符的本义，所以要用一个\来完成转义。
- [0-9]*结合咱们前面铺陈的知识，这个就不难理解了，它的意思是 0-9 之间的整数，能匹配到0个或多个就算匹配成功。
- 最后的 .这个是任意字符的意思，`.*用于字符串尾部匹配非数字的任意字符。我们看到.*是被排除捕获组之外的`，所以说这个东西其实也不会被额外存储，它被“摘除”了。

3. 说明： 假设我们的环境只能存储 32 位大小的有符号整数，那么其数值范围为 [−2^31, 2^31 − 1]。如果数值超过这个范围，请返回 INT_MAX (2^31 − 1) 或 INT_MIN (−2^31) ——暗示......这都不是暗示了，这是明示啊！直接告诉你先把这俩边界值算出来，摆在那做卡口就完了。
```
// 计算最大值
const max = Math.pow(2,31) - 1
// 计算最小值
const min = -max - 1    
```

#### 获取捕获结果
JS 的正则相关方法中， `test()`方法返回的是一个布尔值，单纯判断“是否匹配”。要想获取匹配的结果，我们需要调度`match()`方法：
```
const reg = /\s*([-\+]?[0-9]*).*/
const groups = str.match(reg)
```
match() 方法是一个在字符串中执行查找匹配的String方法，它返回一个数组，在未匹配到时会返回 null。<br>
如果我们的正则表达式尾部有 g 标志，match()会返回与完整正则表达式匹配的所有结果，但不会返回捕获组。 <br>
**这里我们没有使用g标志，match()就会返回第一个完整匹配（作为数组的第0项）及其相关的捕获组（作为数组的第1及第1+项）。** <br>
这里我们只定义了一个捕获组(我们写的()括号就是捕获组)，因此可以从 `groups[1]` 里拿到我们捕获的结果。<br>

### 编码实现
```
// 入参是一个字符串
const myAtoi = function(str) {
    // 编写正则表达式
    const reg = /\s*([-\+]?[0-9]*).*/
    // 得到捕获组
    const groups = str.match(reg)  // 不考虑临界限制，到这里获取 groups[1] 就完成了


    // 计算最大值
    const max = Math.pow(2,31) - 1
    // 计算最小值
    const min = -max - 1
    // targetNum 用于存储转化出来的数字
    let targetNum = 0
    // 如果匹配成功
    if(groups) {
        // 尝试转化捕获到的结构
        targetNum = +groups[1]
        // 注意，即便成功，也可能出现非数字的情况，比如单一个'+'
        if(isNaN(targetNum)) {
            // 不能进行有效的转换时，请返回 0
            targetNum = 0
        }
    }
    // 卡口判断
    if(targetNum > max) {
        return max
    } else if( targetNum < min) {
        return min
    }
    // 返回转换结果
    return targetNum
};
```

主要学习到：
- Math.pow 用法获取指数的大小 2^31 ==》  Math.pow(2,31)
- 学习正则表达式的基础
    - \ 转移
    - () 捕获组
    - [] 满足其一均可返回
    - .* 非数字的任意字符
    - text() 返回是否匹配，true/false
    - match() 
        - 有g：返回与完整正则表达式匹配的所有结果，但不会返回捕获组
        - 没有g：返回第一个完整匹配（作为数组的第0项）及其相关的捕获组（作为数组的第1及第1+项），比如上面我们定义了一个()，结果取 arr[1]
