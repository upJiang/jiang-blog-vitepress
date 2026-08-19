---
title: KMP 字符串匹配：前缀函数与失配回退
description: 从朴素匹配重复比较的问题进入最长相等真前后缀，逐步推导前缀表和失配时的状态转移。
category: algorithms
part: 查找与字符串
chapter: 21
tags:
  - KMP
  - 字符串
  - TypeScript
prerequisites:
  - 字符串与数组基础
outcomes:
  - 手算前缀函数
  - 解释 KMP 为什么不回退主串指针
practice:
  type: implementation
  result: 实现前缀函数与 KMP 搜索
  verify:
    - 重复模式和空模式语义明确
    - 比较次数符合线性复杂度推导
evidence: public-source
updated: 2026-08-11
---
# KMP 字符串匹配：前缀函数与失配回退

朴素匹配在失配后把模式串整体右移，再从模式开头比较，已经确认相等的字符会被重复检查。KMP 用模式自身的前缀信息决定回退位置，文本指针始终向前，因此匹配时间为 `O(n + m)`。

## 前缀函数保存最长真前后缀

对模式 `pattern[0..i]`，`prefix[i]` 表示它的最长相等真前缀与真后缀长度。“真”表示不能等于整个字符串。

模式 `ababaca` 的部分前缀函数可手算：

~~~text
a       -> 0
ab      -> 0
aba     -> 1   (a)
abab    -> 2   (ab)
ababa   -> 3   (aba)
ababac  -> 0
ababaca -> 1   (a)
~~~

这个长度也是失配后仍可保留的已匹配前缀长度。

## 构建前缀表时复用旧边界

~~~ts
function buildPrefix(pattern: string[]): number[] {
  const prefix = new Array<number>(pattern.length).fill(0)

  for (let index = 1; index < pattern.length; index += 1) {
    let matched = prefix[index - 1]

    while (
      matched > 0 &&
      pattern[index] !== pattern[matched]
    ) {
      matched = prefix[matched - 1]
    }

    if (pattern[index] === pattern[matched]) matched += 1
    prefix[index] = matched
  }

  return prefix
}
~~~

进入每轮时，matched 是前一个前缀的最长边界长度。新字符不匹配时，不必从零开始，候选边界自身的最长边界仍可能成功，所以跳到 `prefix[matched - 1]`。

不能写成 `matched -= 1`，那会检查很多不可能成为边界的长度，最坏退回二次复杂度。

## 匹配阶段不回退文本指针

~~~ts
function indexOfKmp(text: string, pattern: string): number {
  const textUnits = Array.from(text)
  const patternUnits = Array.from(pattern)
  if (patternUnits.length === 0) return 0

  const prefix = buildPrefix(patternUnits)
  let matched = 0

  for (let index = 0; index < textUnits.length; index += 1) {
    while (
      matched > 0 &&
      textUnits[index] !== patternUnits[matched]
    ) {
      matched = prefix[matched - 1]
    }

    if (textUnits[index] === patternUnits[matched]) matched += 1

    if (matched === patternUnits.length) {
      return index - patternUnits.length + 1
    }
  }

  return -1
}
~~~

当 matched 为 k 时，当前文本后缀与模式前 k 个字符相等。失配回退只改变 k，当前文本字符会与新的候选位置继续比较。文本 index 每轮只增加一次。

## 为什么 while 总次数是线性

matched 增加最多跟字符比较次数同阶，while 每次又让 matched 严格减小。整个构建和匹配过程中，增加与回退总次数都受输入长度线性约束，因此时间 `O(n + m)`，前缀表空间 `O(m)`。

## JavaScript 字符单位影响返回下标

上例用 `Array.from` 按 Unicode 码点比较，返回的也是码点下标；原生 `String.prototype.indexOf` 返回 UTF-16 码元下标。若调用方要用结果执行 `slice`，两种口径不能混用。

组合字符和 emoji 序列还可能包含多个码点。按用户字形匹配需要先用 `Intl.Segmenter` 分段，并决定 Unicode normalization。规范化会改变下标映射，API 应返回分段索引或额外维护原始位置。

## 验证前缀函数与匹配

对短随机字符串，用朴素实现作为参考，比较是否命中和返回位置。前缀表每个位置再用切片穷举验证：长度小于整个前缀，前后字符串相等，并且没有更长候选。

覆盖空模式、模式长于文本、重复字符、重叠匹配、emoji 和组合字符。若要找所有匹配，命中后把 matched 回退到 `prefix[matched - 1]`，才能保留重叠答案。
