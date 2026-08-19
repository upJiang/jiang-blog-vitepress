---
title: 条件类型、infer、映射类型与模板字面量
description: 把联合分发、infer 匹配、键重映射和递归类型拆成可计算步骤，并控制复杂类型的性能与可读性。
category: frontend
part: TypeScript
chapter: 26
tags:
  - TypeScript
  - Conditional Types
  - Mapped Types
prerequisites:
  - 泛型与联合类型
outcomes:
  - 手算条件类型结果
  - 组合可维护的工具类型
practice:
  type: implementation
  result: 实现 Awaited、DeepReadonly 和事件名称映射
  verify:
    - never、联合分发和递归深度有用例
    - 类型错误能指向业务含义
evidence: official
updated: 2026-08-11
---

# 条件类型、infer、映射类型与模板字面量

条件类型根据类型关系选择分支，`infer` 在匹配时提取局部类型，映射类型按键集合重建对象结构，模板字面量类型组合字符串字面量。它们都在 TypeScript 的类型计算阶段工作，用来从已有 API 推导新契约；浏览器或 Node 不会执行这些类型表达式。

高级类型不是在编译器里运行任意 JavaScript，而是在类型关系上匹配、分支和重建结构。读复杂工具类型时，先代入一个具体类型逐步化简，比一次看完整表达式可靠。

## 条件类型与联合分发

`T extends U ? X : Y` 判断 T 是否可赋给 U。左侧是裸类型参数时，传入联合会对每个成员分发，再把结果联合。`ToArray<string | number>` 因此得到 `string[] | number[]`，不是 `(string | number)[]`。

用 `[T] extends [U]` 包住两侧可停止分发。`never` 是空联合，分发后仍是 never，这是许多条件类型出现意外结果的原因。
## infer 从匹配位置提取

`infer` 只能出现在条件类型 extends 分支的模式中。`T extends PromiseLike<infer V> ? V : T` 从 thenable 位置提取值类型；函数返回、参数元组和数组元素也可用同一思想。

重载函数提取通常基于最后一个可见签名，不能靠 ReturnType 自动模拟逐个重载解析。递归 Awaited 还要处理 null/undefined、thenable 和递归深度，优先使用标准工具类型而不是随意重写。
## 映射类型重建对象

映射类型遍历 `keyof T`，可通过 `+/-readonly`、`+/-?` 修改修饰符，通过 `as` 重映射或过滤键。模板字面量把字符串联合组合成事件名或 getter 名。

```ts
type ChangeEvents<T extends object> = {
  [K in keyof T as K extends string ? `${K}Changed` : never]: (value: T[K]) => void
}

type Model = { title: string; count: number }
type ModelEvents = ChangeEvents<Model>
```

映射过程逐个读取 Model 的字符串键，把键输出为带 Changed 后缀的新名称，并让回调参数保持原字段类型。Symbol 键被过滤成 never；字段联合扩大时会生成对应事件联合。运行时不会自动创建这些函数，真正事件表仍要由对象或生成逻辑提供并验证。

输出含 `titleChanged(value: string)` 与 `countChanged(value: number)`。Symbol key 被明确过滤；如果协议需要 Symbol，就不能用字符串模板表示。
## 递归类型的成本

DeepReadonly 要区分函数、数组、Map 和普通对象。对所有 object 盲目递归会改变函数签名或内建类型。深度过大、联合过宽和多层分发会增加编辑器与 tsc 实例化成本，并产生难读错误。

公共 API 应优先返回可命名的领域类型。复杂工具放在内部并配类型测试，必要时限制递归深度。类型越聪明不代表使用体验越好。
## 验证方法

为每个工具列出具体输入、期望输出和 `@ts-expect-error` 反例。使用 `type-fest` 等成熟库前仍要确认其版本、边界和 tsconfig 前提。升级 TypeScript 后运行类型测试和编译性能诊断，避免工具类型行为变化或实例化爆炸。

这组类型工具需要能手工推演分发过程，解释 `infer` 的模式匹配，并用键重映射表达协议。类型计算影响可读性或编译性能时，应改用更直接的公开类型。
## 分发条件类型的逐项轨迹

当检查项是裸类型参数 `T extends U ? X : Y`，传入联合会逐成员执行再合并。`ToArray<string | number>` 得到 `string[] | number[]`，不是 `(string | number)[]`。用元组包裹两侧 `[T] extends [U]` 可以关闭分发，因为此时检查对象不再是裸 T。

```ts
type ToArray<T> = T extends unknown ? T[] : never
type ToArrayTogether<T> = [T] extends [unknown] ? T[] : never

type Distributed = ToArray<string | number>
type Together = ToArrayTogether<string | number>
```

手算时先代入联合成员，再执行 extends 判断，最后 union 结果。`never` 在分发中没有成员，因此经常直接消失；需要检测 never 时也要用元组包裹。这套轨迹能解释大量“条件类型为什么突然变 never”的问题。

类型计算的执行顺序是拆分联合、逐项匹配、产出数组类型、再合并输出；不满足约束的分支输出 never。它只发生在编译期，运行时不会创建数组或检查值，异常输入仍需业务校验器处理。
## infer、映射和键重映射怎样协作

`infer` 只能在条件类型的匹配位置声明候选。例如从 `PromiseLike<infer V>` 提取 V，从函数 `(...args: infer P) => infer R` 提取参数元组与返回值。遇到重载签名时推断通常基于最后一个签名，不能把它当成逐个重载执行。

映射类型遍历 PropertyKey 联合，修饰符 `+/-readonly`、`+/-?` 改变属性约束，`as` 子句可以过滤或重命名 key。把事件配置 `{ click: MouseEvent }` 映射为 `onClick` 回调时，模板字面量只处理 string key；symbol/number 必须显式排除或另建分支。

复杂递归类型的调试顺序是：先用具体单层输入观察中间别名；再关闭联合分发；随后检查函数、数组与内建对象是否被错误递归；最后用 `tsc --extendedDiagnostics` 比较实例化数量。类型性能问题会拖慢编辑器和 CI，属于真实工程成本。
## 官方依据

- [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
