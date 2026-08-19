---
title: "字符串算法"
description: "从字符单位开始，学习规范化、双指针与滑动窗口。"
category: frontend
tags: ["字符串", "TypeScript"]
updated: 2026-08-05
order: 130
depth: reference
series: "算法与数据结构"
---
# 字符串算法

JavaScript String 保存 UTF-16 码元序列。算法里的“字符”可能指码元、Unicode 码点或用户看到的 grapheme cluster（字形簇）。先确定单位，再谈下标、长度、窗口和复杂度。

## 三种字符单位给出不同长度

~~~ts
const value = '👩‍💻'

console.log(value.length)
console.log(Array.from(value).length)

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
console.log([...segmenter.segment(value)].length)
~~~

`length` 按 UTF-16 码元，Array.from 按码点，Segmenter 按字形簇。切片 API 使用码元下标，把码点下标直接传给 slice 会切错位置。

本文的滑动窗口按 Unicode 码点处理，并返回码点长度。
## 无重复最长子串的窗口不变量

窗口 `[left, right]` 中没有重复码点，Map 保存每个码点最近一次出现的位置。遇到重复字符时，left 跳到旧位置后一位，但不能向左退。

~~~ts
function longestUniqueCodePoints(source: string): number {
  const characters = Array.from(source)
  const lastIndex = new Map<string, number>()
  let left = 0
  let best = 0

  for (let right = 0; right < characters.length; right += 1) {
    const character = characters[right]
    const previous = lastIndex.get(character)

    if (previous !== undefined && previous >= left) {
      left = previous + 1
    }

    lastIndex.set(character, right)
    best = Math.max(best, right - left + 1)
  }

  return best
}
~~~

若重复位置已经在窗口左侧，不应移动 left。写成无条件 `left = previous + 1` 会让窗口倒退，并可能把重复字符重新纳入。

每个 right 前进一次，left 只向右跳，时间 `O(n)`。Map 最多保存不同码点数，空间 `O(min(n, alphabet))`。
## 规范化决定视觉相同是否相等

`é` 可以是一个预组字符，也可以由 `e` 加组合重音构成。码点序列不同，直接相等和 Map 键也不同。

~~~ts
const first = 'é'
const second = 'é'

console.log(first === second) // false
console.log(first.normalize('NFC') === second.normalize('NFC')) // true
~~~

搜索、去重和标识符是否规范化是产品合同。规范化会改变长度和索引，若要高亮原文，需要保存规范化位置到原始位置的映射。

大小写折叠也受 locale 影响。用户名、安全标识符和自然语言搜索不能共享一条简单 `toLowerCase` 规则。
## 滑动窗口只适合连续区间

窗口方法依赖目标能通过扩张和收缩维护。子序列允许跳过字符，编辑距离允许替换删除，它们通常需要双指针、动态规划或自动机。看到字符串问题不能默认套窗口。
## 大字符串与流式输入

Array.from 会复制整个码点数组，空间 `O(n)`。超大输入或流式文本可以用迭代器维护递增位置，但若要返回原始码元下标，还需累计每个码点的 UTF-16 长度。

正则表达式的 `u` 和 `v` 标志会改变 Unicode 语义，分词与匹配应固定标志和运行时版本。用户字形边界依赖 Intl 数据，也要在目标环境验证。
## 参考实现与性质测试

短字符串可枚举所有连续子串，检查是否无重复并取最大长度，与窗口结果比较。测试覆盖空串、全相同、重复跨窗口、代理对、组合字符和 ZWJ emoji，并明确每个样例按哪种字符单位断言。
