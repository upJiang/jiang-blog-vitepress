---
title: TypeScript 收窄、类型守卫与 satisfies
description: 沿控制流图解释 typeof、in、instanceof、自定义守卫、可辨识联合、穷尽检查和 satisfies 的保真校验。
category: frontend
part: TypeScript
chapter: 24
tags:
  - TypeScript
  - Narrowing
  - satisfies
prerequisites:
  - 联合类型与控制流基础
outcomes:
  - 写出可靠类型守卫
  - 区分注解、断言与 satisfies
practice:
  type: implementation
  result: 实现未知响应的解析和穷尽状态机
  verify:
    - 非法输入停在边界
    - 新增联合成员触发编译错误
evidence: official
updated: 2026-08-11
---

# TypeScript 收窄、类型守卫与 satisfies

联合类型描述“可能是什么”，收窄利用当前控制流中的证据排除不可能分支。编译器会跟踪赋值、返回、条件和可达性形成控制流图，不只是看到一条 if 就永久修改变量类型。

## 内建守卫的证据范围

`typeof` 适合原始类型，但 `typeof null === 'object'`；`Array.isArray` 识别跨 Realm 数组；`instanceof` 依赖原型和 Symbol.hasInstance；`in` 判断属性存在，包括原型链和可选属性。每种守卫的运行时语义决定它能证明什么。

真值判断会同时排除 `0、''、false、null、undefined`。若业务只排除 nullish，应写 `value != null` 或显式比较，不能误删合法空值。

## 自定义守卫与断言函数

`value is User` 是函数对编译器的承诺，编译器不会检查实现是否真的验证了 User。守卫应接收 unknown，逐层验证对象、字段和数组元素；否则错误守卫比断言更危险，因为它看起来像运行时证据。

断言函数 `asserts value is User` 失败时应抛出结构化错误，成功返回后收窄当前路径。适合入口校验和测试辅助，不适合用空函数欺骗类型系统。

## 可辨识联合和穷尽检查

统一的字面量字段让 switch 精确收窄。default 分支把值赋给 never，可在新增成员时触发编译错误。运行时仍保留 assertNever，防止未校验外部值进入。

```ts
type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'not-found' }
  | { kind: 'error'; reason: string }

function message(result: Result<string>): string {
  switch (result.kind) {
    case 'ok': return result.value
    case 'not-found': return '没有结果'
    case 'error': return result.reason
    default: return assertNever(result)
  }
}
```

message 先读取 kind 选择唯一分支，ok 输出 value，not-found 输出空结果提示，error 输出原因；default 只应接收 never。新增状态却没有分支时编译失败，若未校验的运行时对象绕过类型进入，assertNever 仍应抛出可诊断异常而不是静默返回。

输入状态决定唯一分支，输出始终是字符串。新增 `cancelled` 后 default 不再接收 never，提醒所有消费方处理。

## 注解、断言与 satisfies

类型注解把变量视为目标类型，可能宽化字面量；断言要求编译器相信开发者；`satisfies` 检查表达式可赋给目标，又保留表达式自身较精确类型。

配置对象需要验证 key 和 value，同时保留具体 key 联合时，`satisfies Record<Route, Config>` 很合适。它不改变运行时值，也不是外部 JSON 校验器。

## 失效与验证

异步回调、函数调用和可变别名可能让先前属性判断失效。收窄局部变量比反复读取可变深层属性稳定。类型测试覆盖每种联合成员、非法守卫输入和新增成员；运行时测试覆盖 Schema 错误路径。

面试追问要能指出守卫的运行证据、谓词不受编译器验证这一风险，以及 satisfies 为什么既不同于注解也不同于 as const。

## 控制流图怎样保存和撤销收窄

编译器不是简单扫描上一行 `if`。它为变量建立控制流节点，记录赋值、条件、提前返回和合流点。某条分支 `return` 后，后续路径可以排除该分支的类型；两个分支重新汇合时，变量类型会合并。重新赋值会基于声明类型重新计算，而不是永远保持上一次收窄。

```ts
type Result =
  | { kind: 'ok'; value: string }
  | { kind: 'retry'; afterMs: number }
  | { kind: 'error'; message: string }

function render(result: Result): string {
  switch (result.kind) {
    case 'ok': return result.value
    case 'retry': return `稍后重试：${result.afterMs}`
    case 'error': return result.message
    default: return assertNever(result)
  }
}
```

`kind` 是运行时真实字段，case 分支把对象收窄到一个成员。新增联合成员后，default 中的参数不再是 `never`，构建立即失败。这里的 exhaustiveness 是编译期回归门禁；若外部 JSON 根本没有合法 kind，仍要先经过 Schema。

代码执行顺序是读取 kind、进入唯一 case、输出字符串；非法输入在运行时 Schema 阶段失败，未知分支由 assertNever 抛出异常，不能把编译期收窄当作网络数据校验。

## 守卫函数的信任边界

`value is User` 是开发者给编译器的承诺，函数体不会被证明真的覆盖 User。错误谓词与断言同样危险。可复用守卫应从小谓词组合，覆盖 null、数组、原型污染字段和嵌套错误，并用 property-based 或表格用例同时验证 true/false 两侧。

异步边界需要额外小心。对 `state.current` 做判断后进入 `await`，其他任务可能改变可变状态；把已验证值复制到局部常量，或在恢复后重新校验版本。闭包捕获可变对象时也不能把创建时的收窄当成未来调用时仍成立。

`satisfies` 最适合“校验声明且保留表达式推断”，例如路由表、主题 Token 和事件映射。它不会冻结对象；需要不可变字面量时再组合 `as const`，并检查 readonly 是否会影响下游 API。

## 官方依据

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 4.9: The satisfies Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
