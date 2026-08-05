---
title: "字符串算法"
description: "处理字符串扫描、窗口、映射与边界条件。"
category: frontend
tags: ["字符串", "TypeScript"]
updated: 2026-08-04
order: 130
depth: reference
series: "算法与数据结构"
---
# 字符串算法

JavaScript 字符串是不可变的 UTF-16 code unit 序列。`length`、下标与 `slice` 以 code unit 计数，不一定等于 Unicode code point，更不一定等于用户看到的字素簇。算法题常假设 ASCII；工程代码必须先声明字符模型，否则 emoji、组合音标和区域旗帜会让“反转”“长度”“窗口”出现错误。

## 三种字符单位

```ts
const text = 'A😀e\u0301'
console.log(text.length)       // UTF-16 code units
console.log([...text].length) // code points
```

`[...text]` 按 code point 迭代，能保持 😀 的代理对，但 `e + combining acute` 仍会被拆开。用户感知字符使用 `Intl.Segmenter`：

```ts
function graphemes(text: string, locale = 'und'): string[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' })
  return [...segmenter.segment(text)].map((part) => part.segment)
}

function reverseText(text: string): string {
  return graphemes(text).reverse().join('')
}
```

如果题目限定小写英文字母，数组下标和长度可直接使用；请把约束写进签名/注释，而不是让实现看似支持所有字符串。

## 回文：规范化是题目的一部分

“忽略大小写与非字母数字”时，先定义 Unicode 策略。下面示例使用 Unicode property escape 和 code point 数组：

```ts
function isPalindrome(input: string): boolean {
  const values = Array.from(input.normalize('NFC').toLocaleLowerCase('und'))
    .filter((character) => /[\p{Letter}\p{Number}]/u.test(character))

  let left = 0
  let right = values.length - 1
  while (left < right) {
    if (values[left] !== values[right]) return false
    left += 1
    right -= 1
  }
  return true
}
```

时间 O(n)，规范化数组空间 O(n)。对超大文本可双端迭代，但 Unicode 分段与规范化仍复杂。`toLocaleLowerCase('und')` 不解决所有语言等价；搜索/身份比较应采用产品明确的 locale 与规范，安全标识符通常不要做宽泛 Unicode 模糊匹配。

## 最多删除一个字符成为回文

首次不匹配时，答案若存在，只可能删除左或右当前字符；分别验证剩余区间：

```ts
function validPalindromeAfterOneDeletion(text: string): boolean {
  const values = Array.from(text)

  function rangeIsPalindrome(left: number, right: number): boolean {
    while (left < right) {
      if (values[left] !== values[right]) return false
      left += 1
      right -= 1
    }
    return true
  }

  let left = 0
  let right = values.length - 1
  while (left < right && values[left] === values[right]) {
    left += 1
    right -= 1
  }
  return left >= right ||
    rangeIsPalindrome(left + 1, right) ||
    rangeIsPalindrome(left, right - 1)
}
```

主扫描与最多两次剩余扫描仍 O(n)，不是递归指数搜索。输入为空/单字符返回 true。

## 最长无重复子串：窗口不变量

维护窗口 `[left,right]` 内字符不重复，Map 记录每个字符最后位置。遇到重复时，left 只能前进：

```ts
function longestUniqueSubstring(text: string): number {
  const values = Array.from(text)
  const lastIndex = new Map<string, number>()
  let left = 0
  let best = 0

  for (let right = 0; right < values.length; right += 1) {
    const character = values[right]!
    const previous = lastIndex.get(character)
    if (previous !== undefined && previous >= left) left = previous + 1
    lastIndex.set(character, right)
    best = Math.max(best, right - left + 1)
  }
  return best
}
```

若直接 `left=previous+1` 而不判断 previous 是否仍在窗口，left 会倒退。时间 O(n)，空间 O(字符集大小)。返回用户感知字符长度则把 values 换成 graphemes。

## 字符异位词与频率

限定 ASCII 小写可用长度 26 的 Int32Array；通用 code point 用 Map。先规范化，再计数：

```ts
function areAnagrams(left: string, right: string): boolean {
  const a = Array.from(left.normalize('NFC'))
  const b = Array.from(right.normalize('NFC'))
  if (a.length !== b.length) return false

  const counts = new Map<string, number>()
  for (const value of a) counts.set(value, (counts.get(value) ?? 0) + 1)
  for (const value of b) {
    const next = (counts.get(value) ?? 0) - 1
    if (next < 0) return false
    if (next === 0) counts.delete(value)
    else counts.set(value, next)
  }
  return counts.size === 0
}
```

排序比较是 O(n log n)，计数期望 O(n)。locale 语言学意义的“相同”不是简单 anagram，应另用 Collator/领域规则。

## 子串匹配：从朴素到 KMP

文本 n、模式 m。朴素算法每个起点比较，最坏 O(nm)。KMP 为模式构造最长相等真前后缀 `lps`，失配时复用已知匹配：

```ts
function buildLps(pattern: string): number[] {
  const lps = new Array<number>(pattern.length).fill(0)
  for (let i = 1, length = 0; i < pattern.length;) {
    if (pattern[i] === pattern[length]) lps[i++] = ++length
    else if (length > 0) length = lps[length - 1]!
    else lps[i++] = 0
  }
  return lps
}

function indexOfKmp(text: string, pattern: string): number {
  if (pattern.length === 0) return 0
  const lps = buildLps(pattern)
  for (let i = 0, j = 0; i < text.length;) {
    if (text[i] === pattern[j]) {
      i += 1
      j += 1
      if (j === pattern.length) return i - j
    } else if (j > 0) j = lps[j - 1]!
    else i += 1
  }
  return -1
}
```

这里按 UTF-16 code unit 返回与 JS `indexOf` 一致的下标；若按 code point，先数组化且返回单位要明确。时间 O(n+m)，空间 O(m)。工程上优先内建 `indexOf/includes`，学习 KMP 是理解失配信息，而不是替代引擎优化。

## 正则表达式不是通用解析器

正则适合局部格式和模式搜索，不适合嵌套语法或需要精确错误恢复的语言。用户可控正则/模式可能导致灾难性回溯（ReDoS）；限制模式来源、输入长度，选择线性引擎或超时隔离。

验证数字不能只 `/\d+/`，它会接受子串。若要求十进制字面量：

```ts
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

function parseFiniteDecimal(input: string): number | null {
  const text = input.trim()
  if (!decimalPattern.test(text)) return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}
```

金融金额不应用 binary floating point 直接计算，可用最小货币单位整数或 Decimal 库；格式化优先 Intl.NumberFormat，不手写千分位假定所有 locale 都用逗号/三位分组。

## 切片与格式化

`slice(start,end)` 支持负索引且不包含 end；`substring` 负值按 0、会交换 start/end；`substr(start,length)` 已废弃。统一使用 slice 降低认知成本。

数组分块/字符串截断若面向 UI，需要按 grapheme，不能切断 emoji；后端字段限制通常按字节或 code point，必须与协议一致。UTF-8 字节数可用 `TextEncoder().encode(text).byteLength`。

```ts
function truncateGraphemes(text: string, max: number): string {
  if (!Number.isInteger(max) || max < 0) throw new RangeError('invalid max')
  const parts = graphemes(text)
  return parts.length <= max ? text : `${parts.slice(0, max).join('')}…`
}
```

## 字符串构建与复杂度

字符串不可变，循环中前置拼接 `result = char + result` 可能反复复制。反转用数组收集后 join。解析器通常维护索引并最后 slice，避免每步生成子串。

长文本流式处理还要处理 chunk 边界：UTF-8 字节可能跨 chunk，使用 TextDecoder 的 stream 模式；一行/一个协议帧可能跨 chunk，保留 carry。不能假设每次网络 read 是完整字符串消息。

## 验证

属性测试适合字符串算法：反转两次得到规范化后的原值；任意回文与其反转相同；KMP 与内建 indexOf 对随机 ASCII 输入一致；最长无重复结果不超过 code point 数且实际窗口无重复。

边界覆盖空串、单字符、全部相同、代理对、组合字符、不同 normalization、超长输入和恶意正则。每个 API 明确返回下标单位。字符串算法真正的难点往往不在双指针，而在你是否先说清“一个字符究竟是什么”。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
