---
title: "栈与括号匹配"
description: "利用后进先出不变量解决匹配与表达式问题。"
category: frontend
tags: ["栈", "TypeScript"]
updated: 2026-08-04
order: 140
depth: reference
series: "算法与数据结构"
---
# 栈与括号匹配

栈保存“最近开始但尚未完成”的工作，后进先出。括号匹配保存尚未闭合的左括号，表达式求值保存操作数/运算符，DFS 保存待探索节点，单调栈保存仍可能影响后续答案的候选。选择栈的依据不是题目出现“匹配”，而是未完成关系具有嵌套顺序。

## 有效括号

扫描左括号入栈；遇到右括号时，栈顶必须是对应左括号：

```ts
function isValidBrackets(input: string): boolean {
  if (input.length % 2 !== 0) return false

  const expectedOpen = new Map<string, string>([
    [')', '('], [']', '['], ['}', '{']
  ])
  const stack: string[] = []

  for (const character of input) {
    const open = expectedOpen.get(character)
    if (open === undefined) {
      if (character !== '(' && character !== '[' && character !== '{') return false
      stack.push(character)
    } else if (stack.pop() !== open) {
      return false
    }
  }
  return stack.length === 0
}
```

不变量：处理完前缀后，stack 从底到顶恰好是该前缀中尚未闭合的左括号；任何右括号只能闭合最近一个未闭合左括号。若允许普通字符，应明确跳过策略；本实现只接受六种括号，避免把任意字符误作左括号。

每个字符最多入/出栈一次，时间 O(n)，空间 O(n)。空串按“没有不匹配括号”返回 true。

## 表达式求值与运算顺序

逆波兰表达式把操作符放在操作数之后，遇数字入栈，遇操作符弹出右、左操作数：

```ts
function evaluateRpn(tokens: readonly string[]): number {
  const stack: number[] = []

  for (const token of tokens) {
    if (/^[+-]?\d+$/.test(token)) {
      stack.push(Number(token))
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) throw new SyntaxError('missing operand')

    switch (token) {
      case '+': stack.push(left + right); break
      case '-': stack.push(left - right); break
      case '*': stack.push(left * right); break
      case '/':
        if (right === 0) throw new RangeError('division by zero')
        stack.push(Math.trunc(left / right))
        break
      default: throw new SyntaxError(`unknown operator: ${token}`)
    }
  }
  if (stack.length !== 1) throw new SyntaxError('invalid expression')
  return stack[0]!
}
```

减法/除法的弹出顺序不能反。复杂表达式解析还需 tokenizer、优先级和一元运算，不能直接用 `eval` 处理不可信输入。

## 单调栈：每日温度

给每一天求之后第一个更高温度的距离。栈保存尚未找到答案的索引，并保证对应温度从栈底到栈顶单调不增：

```ts
function daysUntilWarmer(temperatures: readonly number[]): number[] {
  const answer = new Array<number>(temperatures.length).fill(0)
  const stack: number[] = []

  for (let current = 0; current < temperatures.length; current += 1) {
    while (
      stack.length > 0 &&
      temperatures[current]! > temperatures[stack.at(-1)!]!
    ) {
      const previous = stack.pop()!
      answer[previous] = current - previous
    }
    stack.push(current)
  }
  return answer
}
```

当当前温度更高，它是栈顶位置遇到的第一个更高值，因为中间日已经扫描且未使其出栈。相等温度不能弹出（题目要求严格更高）。每个索引入栈、出栈至多一次，时间 O(n)，空间 O(n)。

同类题包括下一个更大元素、柱状图最大矩形、接雨水。单调方向和弹出条件必须从“栈里候选仍可能成为谁的答案”推导，不能死记。

## 最小栈：同步维护聚合值

要求 push/pop/top/getMin 都 O(1)。可以每层同时记录到当前的最小值：

```ts
class MinStack {
  private readonly values: Array<{ value: number; minimum: number }> = []

  push(value: number): void {
    const previous = this.values.at(-1)?.minimum
    this.values.push({ value, minimum: previous === undefined ? value : Math.min(value, previous) })
  }

  pop(): number | undefined { return this.values.pop()?.value }
  top(): number | undefined { return this.values.at(-1)?.value }
  minimum(): number | undefined { return this.values.at(-1)?.minimum }
}
```

不变量：第 i 层 minimum 等于 `[0,i]` 所有 value 的最小值，pop 时聚合状态随该层一起移除。另一种双栈方案只在新值 `<=` 当前最小时压入最小栈，必须包含相等，否则弹出一个重复最小值会错误丢失最小值。

## 用栈模拟递归

递归调用栈隐式保存返回位置和局部状态；显式栈需要自己保存足够帧信息。二叉树前序只需节点栈，后序可能保存 visited 标志。不是所有递归简单 push 参数就能等价，尤其在递归调用前后都有工作时。

显式栈避免 JavaScript 深递归溢出，并可暂停/恢复、设置节点预算。它不会减少算法本身空间：树高 h 时两者通常 O(h)。

## 验证

括号用例覆盖空、奇数长度、错误类型、错误嵌套和末尾未闭合；RPN 覆盖负数、非交换操作、缺操作数和除零；每日温度与 O(n²) 小规模 oracle 比较；MinStack 随机 push/pop 后与 `Math.min(...当前值)` 比较。

栈题的证明通常围绕两点：栈中每个元素代表哪一类“未完成工作”，以及弹出时为什么当前输入已经给出它的最终答案。能说清这两点，才不是只会套 push/pop。

## 源码与规范

- [ECMAScript 规范](https://tc39.es/ecma262/)：数组、字符串、Map/Set、排序与数值语义的语言依据。
- [Open Data Structures](https://opendatastructures.org/)：数组、链表、栈、队列、树、哈希和图算法的公开教材与复杂度推导。
- [VisuAlgo](https://visualgo.net/en)：数据结构与经典算法状态变化的可视化辅助；正确性仍以不变量和测试证明。
- 个人实验材料已匿名化；本文只抽取通用机制，不建立项目映射。
