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

JavaScript 中 `'😀'.length` 是 2，因为字符串按 UTF-16 code unit 计数；用户看到的却是一个字符。`e` 加组合音标又可能是两个 code point、一个字素簇。字符串题若不先声明字符单位，反转、长度和窗口都可能算错。

本篇先区分 code unit、code point 和字素簇，再用“无重复最长子串”学习滑动窗口。回文和反转沿用同一原则：先决定规范化与字符模型，再选择算法。

## 三种字符单位

| 单位 | JavaScript 方式 | 适用 |
| --- | --- | --- |
| UTF-16 code unit | `text.length`、下标 | ASCII 题、协议明确使用 UTF-16 |
| Unicode code point | `Array.from(text)` | 保持代理对 |
| 字素簇 | `Intl.Segmenter` | 用户感知字符 |

`Array.from('😀')` 保持 emoji 代理对，但 `e + combining acute` 仍会拆开。面向用户的编辑与反转使用 `Intl.Segmenter`，并在目标浏览器验证支持。算法题限定小写英文字母时，可以直接按 code unit，但约束要写清。

## 步骤一：规范化是题目的一部分

判断“忽略大小写和非字母数字的回文”时，需要说明 Locale、Unicode 正规化和允许字符。`normalize('NFC')` 能合并等价组合形式，Unicode property escape 能识别更广泛的字母数字。安全标识符的规范化规则则要遵循对应协议，不能随意大小写折叠。

双指针回文保持一个不变量：`left` 左侧与 `right` 右侧已经匹配，下一步只比较尚未确认的两端。遇到不符合规则的字符时移动对应指针，直到相遇。

## 步骤二：滑动窗口解决连续区间

题目：给定字符串，求不含重复 code point 的最长连续子串长度。朴素方法从每个起点向右扩展，最坏 O(n²)。滑动窗口利用重复字符的上次位置，一次扫描完成。

输入先转为 code point 数组。窗口 `[left, right]` 始终没有重复；若当前字符上次出现在窗口内，left 跳到旧位置之后。下面是完整 TypeScript 实现。

```ts
function longestUniqueSubstring(input: string): number {
  const chars = Array.from(input)
  const lastSeen = new Map<string, number>()
  let left = 0
  let best = 0

  for (let right = 0; right < chars.length; right += 1) {
    const char = chars[right]!
    const previous = lastSeen.get(char)
    if (previous !== undefined && previous >= left) {
      left = previous + 1
    }
    lastSeen.set(char, right)
    best = Math.max(best, right - left + 1)
  }

  return best
}
```

输入 `abba` 时，第二个 `b` 让 left 从 0 跳到 2；最后一个 `a` 的旧位置 0 已在窗口外，left 不能倒退。每个位置访问常数次，时间 O(n)，Map 最坏保存 O(n) 个字符。

## 手工推演

| right | 字符 | left | 当前窗口 | best |
| ---: | --- | ---: | --- | ---: |
| 0 | a | 0 | a | 1 |
| 1 | b | 0 | ab | 2 |
| 2 | b | 2 | b | 2 |
| 3 | a | 2 | ba | 2 |

若要求按字素簇计算，把 `Array.from` 替换为 `Intl.Segmenter` 产出的 segment 数组，窗口逻辑不变。算法与字符切分是两个边界。

## 边界与失败结果

空串返回 0，单字符返回 1，全部相同返回 1。测试加入 emoji、组合字符和旗帜，明确期望基于 code point 还是字素簇。不要对任意 Unicode 使用简单 `split('')` 反转，它会拆开代理对。

字符串不可变，循环中反复拼接可能产生隐藏复制。大量片段优先收集后 `join`，再在目标引擎用代表数据验证。正则也应检查灾难性回溯风险，不能把复杂模式当作免费的一行实现。

## 参考资料

- [ECMAScript String](https://tc39.es/ecma262/multipage/text-processing.html)
- [Unicode Normalization](https://unicode.org/reports/tr15/)
- [Intl.Segmenter](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
