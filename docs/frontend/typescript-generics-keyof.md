---
title: TypeScript 泛型、keyof 与索引访问类型
description: 从输入输出关系推导类型参数、约束、默认参数、keyof、typeof 和 T[K]，避免无意义泛型与宽化。
category: frontend
part: TypeScript
chapter: 25
tags:
  - TypeScript
  - Generics
  - keyof
prerequisites:
  - 函数与对象类型
outcomes:
  - 为 API 保留输入输出关联
  - 约束动态属性访问
practice:
  type: implementation
  result: 实现类型安全的选择器和请求客户端
  verify:
    - 错误键在编译期被拒绝
    - 返回类型随输入精确变化
evidence: official
updated: 2026-08-11
---

# TypeScript 泛型、keyof 与索引访问类型

函数参数写成 `object`，返回值只能是宽泛对象；写成泛型 T，调用方的具体类型可以沿输入传播到输出。泛型的价值是表达位置之间的关系，不是把每个函数都加上尖括号。

## 类型参数必须参与关系

只出现一次的 T 通常没有建立关系，可能用 unknown 更清楚。T 同时出现在参数和返回值，或连接两个参数时，编译器才能从调用推断具体类型。

下面的代码在开启 strict 的 TypeScript 项目中检查，不依赖运行时类型库。输入是一份具体对象和属性键，目标是让编译器保留二者关系并推断精确返回值；测试还会传入不存在的键，确认错误在构建阶段出现而不是落到 undefined 后继续传播。

```ts
function getProperty<T extends object, K extends keyof T>(target: T, key: K): T[K] {
  return target[key]
}

const article = { id: 'a-1', views: 12 }
const views = getProperty(article, 'views') // number
```

调用 getProperty 时，编译器从 article 推断 T，从字面量 views 推断 K，再把返回值计算为 T[K] 的 number；错误键在调用阶段失败。函数运行时只是执行普通属性读取，Proxy getter 仍可能抛异常，外部对象也要先经过校验，泛型不会创建缺失字段。

T 保存对象结构，K 被约束为其键，T[K] 取得对应属性类型。错误 key 在编译期被拒绝，返回值不会退化为联合。运行时仍可能遇到 getter 抛错或代理行为，静态关系不取消对象语义。

## keyof、typeof 与索引访问

`keyof T` 产生已知键联合；类型位置的 `typeof value` 取得变量静态类型；`T[number]` 可取得数组元素类型。字符串索引签名会影响 keyof，数值 key 在 JavaScript 对象中还涉及字符串化，不能总假设只有 string。

`as const` 防止字面量宽化并递归添加 readonly 语义，适合从常量推导联合。它不冻结运行时对象；需要不可变运行时值仍要 Object.freeze 或数据策略。

## 约束和默认参数

`T extends HasId` 表示 T 至少具有 id，同时保留额外字段。约束不是继承实例，也不会运行时检查。默认类型参数用于调用方没有推断结果时的默认，不应隐藏无法推断的设计问题。

泛型 React 组件或 Vue 工具要确保 JSX/模板能推断参数；如果调用端不断显式写复杂泛型，公开 API 可能过度抽象。优先从 props 或 Schema 推断。

## 请求客户端的边界

`request<T>()` 如果只把 JSON 断言成 T，是“调用方指定任何答案”。更安全的 API 接收运行时 parser，并从 parser 返回类型推断 T。这样泛型连接校验器输出与 Promise 返回，而不是制造信任。

验证时用 `@ts-expect-error` 检查非法 key，用运行测试检查属性不存在和 parser 失败。面试继续追问应能解释 `keyof typeof`、索引访问分发、约束与默认值，以及何时不用泛型。

## 泛型推断不是“自动填空”

调用泛型函数时，编译器从每个参数位置收集候选类型，再根据约束、协变/逆变位置和上下文返回类型求解 T。多个候选冲突时可能得到联合、共同上界或退化到约束。若 T 只出现在返回值，调用点没有输入证据，`parse<T>()` 往往只是换一种断言。

```ts
function pluck<T, K extends keyof T>(rows: readonly T[], key: K): Array<T[K]> {
  return rows.map((row) => row[key])
}

const rows = [{ id: 'a', score: 1 }, { id: 'b', score: 2 }]
const scores = pluck(rows, 'score') // number[]
// @ts-expect-error 属性不存在，错误应停在调用边界
pluck(rows, 'missing')
```

T 由 rows 推断，K 同时受 `keyof T` 约束并由第二个实参推断，返回 `T[K]` 保留属性值类型。若把 key 写成 string，函数体只能靠索引签名；若把返回值写成 unknown[]，调用方又丢失关系。泛型的价值是保存输入之间、输入与输出之间的约束，不是减少几个类型名。

## 组件 API 中的推断链

数据表组件常见关系是 `rows: T[]`、`columns: Column<T>[]`、`render(value: T[K], row: T)`。把所有列塞进一个宽泛联合会让 K 丢失关联；可用列工厂函数在每次创建列时捕获 K，再把结果作为只读列集合传给组件。React JSX 与 Vue SFC 对泛型组件的推断能力受框架和工具链版本影响，库应提供最小 consumer fixture，而不是只在类型游乐场验证。

公开 API 如果需要调用方连续填写四五个类型参数，通常意味着信息没有放在可推断输入上。优先让 Schema、默认值或配置对象成为类型来源；只有确实无运行输入的工厂才暴露显式类型参数。

## 官方依据

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook: keyof](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript Handbook: Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
