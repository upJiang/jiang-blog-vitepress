---
title: "栈与括号匹配"
description: "利用后进先出不变量解决匹配、撤销与表达式问题。"
category: frontend
tags: ["栈", "TypeScript"]
updated: 2026-08-05
order: 140
depth: reference
series: "算法与数据结构"
---
# 栈与括号匹配

栈只允许从同一端压入和弹出，维持 LIFO（Last In, First Out，后进先出）。嵌套结构中，最后打开的边界必须最先关闭，因此括号匹配、语法解析、撤销和深度优先遍历都能用栈表达。

## 括号匹配的不变量

扫描字符串前缀后，栈中按出现顺序保存所有尚未闭合的左括号，栈顶是下一次唯一允许闭合的类型。任何右括号若与栈顶不匹配，后续字符都无法修复这段前缀。

~~~ts
const openingByClosing = new Map<string, string>([
  [')', '('],
  [']', '['],
  ['}', '{'],
])

function isBalanced(source: string): boolean {
  const stack: string[] = []

  for (const character of source) {
    if (character === '(' || character === '[' || character === '{') {
      stack.push(character)
      continue
    }

    const expected = openingByClosing.get(character)
    if (expected === undefined) continue
    if (stack.pop() !== expected) return false
  }

  return stack.length === 0
}
~~~

这个合同忽略非括号字符。若输入是程序源码，字符串、模板、注释和正则里的括号不应参与匹配，需要使用语言 tokenizer，不能继续用字符循环冒充解析器。

## 失败为什么可以立即返回

遇到右括号时有两种失败：栈空表示没有可配对的左括号，栈顶类型不同表示嵌套顺序错误。两种情况都发生在当前前缀，追加任何字符都无法改变已经出现的顺序，所以可以立即返回 false。

扫描结束后栈非空，说明仍有未闭合左括号。每个字符最多压栈或弹栈一次，时间 `O(n)`，最坏额外空间 `O(n)`。

## 栈可以保存状态而不只保存值

表达式求值时，栈项可能包含运算符、优先级和源码位置；DFS 栈项可能包含节点与下一条边；撤销栈保存命令和逆操作。只保存一个值常会丢掉恢复现场所需的信息。

~~~ts
type Frame<T> = {
  node: T
  nextChild: number
}
~~~

把递归改成显式栈时，Frame 要能表示“函数暂停在哪里”。只压节点适合简单前序遍历，无法直接复现需要回溯后处理的递归。

## 单调栈丢弃不可能再成为答案的元素

寻找每个位置右侧第一个更大值时，可以让栈保存尚未找到答案的下标，并保持对应值单调不增。

~~~ts
function nextGreater(values: number[]): number[] {
  const answer = new Array<number>(values.length).fill(-1)
  const stack: number[] = []

  for (let index = 0; index < values.length; index += 1) {
    while (
      stack.length > 0 &&
      values[stack[stack.length - 1]] < values[index]
    ) {
      const previous = stack.pop()
      if (previous !== undefined) answer[previous] = values[index]
    }
    stack.push(index)
  }

  return answer
}
~~~

一个下标被压入一次、弹出一次，总操作是 `O(n)`。不能因为代码有 while 就判成 `O(n²)`，复杂度要数整个执行序列。

## 实现边界

JavaScript Array 的 `push/pop` 适合栈，均摊成本低。共享栈用于异步流程时要明确任务隔离和取消，避免一个请求弹出另一个请求的状态。递归调用栈由运行时管理，深度过大可能抛出 RangeError，显式栈则受可用内存限制并更容易设置预算。

测试括号算法时覆盖空串、只含左括号、只含右括号、交叉嵌套、深嵌套和混合文本。单调栈再覆盖重复值、递增、递减和空数组，并与 `O(n²)` 参考实现随机对比。
