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

主串中有大量 `a`，模式是 `aaaaab`。朴素匹配每次在最后一个字符失配后，把模式整体右移一位，再重复比较前面的 `a`。KMP 保存“模式已经匹配部分自身包含多少可复用信息”，失配时只回退模式状态，不回退主串索引。

## 前缀函数保存什么

对模式 `pattern[0..i]`，`prefix[i]` 表示它的最长相等真前缀和真后缀长度。“真”表示不能等于整个字符串。例如 `ababaca` 的前缀表为 `[0, 0, 1, 2, 3, 0, 1]`。

当已经匹配长度为 `matched`，下一个字符失配时，`pattern[0..matched-1]` 既是主串刚匹配的后缀，也是模式前缀。我们寻找它更短的相等前后缀，即 `prefix[matched - 1]`，作为新的已匹配长度。若仍失配，继续沿前缀表回退。

```text
模式：a b a b a c a
索引：0 1 2 3 4 5 6
前缀：0 0 1 2 3 0 1

在已匹配 ababa 后遇到失配：
matched 5 -> prefix[4] 3 -> 已知 aba 仍可复用
```

这不是把模式移动固定距离，而是在模式前缀构成的状态链上跳转。主串当前位置尚未被新状态比较，所以外层索引无需后退。

## 构建前缀表

构建过程本身也是一次 KMP。`matched` 表示当前候选前后缀长度；失配时沿已经计算好的前缀表缩短，匹配时增长一位。

```ts
function buildPrefix(pattern: string): number[] {
  const prefix = Array<number>(pattern.length).fill(0)
  let matched = 0

  for (let index = 1; index < pattern.length; index += 1) {
    while (matched > 0 && pattern[index] !== pattern[matched]) {
      matched = prefix[matched - 1]
    }
    if (pattern[index] === pattern[matched]) matched += 1
    prefix[index] = matched
  }
  return prefix
}

function kmpIndexOf(text: string, pattern: string): number {
  if (pattern.length === 0) return 0
  const prefix = buildPrefix(pattern)
  let matched = 0

  for (let index = 0; index < text.length; index += 1) {
    while (matched > 0 && text[index] !== pattern[matched]) {
      matched = prefix[matched - 1]
    }
    if (text[index] === pattern[matched]) matched += 1
    if (matched === pattern.length) return index - pattern.length + 1
  }
  return -1
}
```

空模式返回 0，与常见 `indexOf` 语义一致，但这是 API 契约而不是 KMP 自动决定的。搜索成功时，当前主串索引是匹配末尾，因此起点为 `index - pattern.length + 1`。若要找全部匹配，记录起点后不能把 `matched` 清零，而应回退到 `prefix[matched - 1]`，这样才能发现重叠匹配。

## 为什么是线性复杂度

看起来 `while` 嵌套在 `for` 内，似乎会到 `O(nm)`。实际 `matched` 每次增加最多一，回退只会消耗此前增加的长度。构建前缀表时索引单调前进，`matched` 的增减总次数是线性的；搜索主串时主串索引同样从不回退。

因此预处理是 `O(m)`，搜索是 `O(n)`，额外空间是 `O(m)`。这个证明依赖势能分析，而不是声称“每个字符只比较一次”；某些字符可能参与多次模式比较，但总比较次数仍受线性上界约束。

## Unicode 与实际字符串边界

JavaScript 的字符串索引按 UTF-16 code unit，不一定按用户看到的字符。模式只含 ASCII 时没有问题；若要求按 Unicode code point 匹配，可先用 `Array.from` 转换，但返回索引将不再是原字符串的 code unit 偏移。若要求按字素簇匹配，还需要 `Intl.Segmenter` 等分段能力。工程接口必须先约定索引单位。

## 验证与常见错误

测试包含空模式、模式长于主串、完全重复、重叠匹配、首字符多次失配和 Unicode 样本。再用随机短字符串把结果与原生 `indexOf` 比较，作为属性测试基准。

常见错误包括把 `matched = prefix[matched]` 写成自循环、失配只回退一次、成功后忘记处理重叠，以及把前缀表误称为“失配后移动距离”。排查时打印 `textIndex、matched、比较字符、回退后 matched`，执行链会比观察最终 `-1` 更有用。

面试追问的重点通常是手算前缀表、证明主串不回退和解释复杂度。若只背出代码却无法说明 `prefix[matched - 1]` 为什么仍然可能匹配，就还没有掌握 KMP 的状态含义。

## 前缀函数的递推证明

计算 `pi[i]` 时，`j=pi[i-1]` 表示当前前缀候选长度。若 `pattern[i] !== pattern[j]`，新的候选只能是长度 j 的真前缀的最长 border，即继续令 `j=pi[j-1]`；这一步不会跳过可能答案，因为任何更长候选都已被失配排除。匹配后 j 加一，`pi[i]=j`。

搜索阶段维护 `j` 为已经匹配的模式前缀长度。主串字符失配时只回退 j，不回退 i；每次回退都跳到更短 border，所有 i/j 总移动次数线性，因此预处理 O(m)、搜索 O(n)，空间 O(m)。

空模式的返回契约要先定：原生 `indexOf('')` 返回 0，某些算法题要求 -1；Unicode 索引还要声明 code unit、code point 或 grapheme。用随机短串和 `indexOf` 对拍，再打印每次回退证明状态转移。

前缀函数的通用推导可对照 [CP-Algorithms 的 Prefix Function 说明](https://cp-algorithms.com/string/prefix-function.html)，空模式和返回位置可对照 [MDN 的 `indexOf` 参考](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf)。随机对拍和回退轨迹仍是本文实现的验证依据。
