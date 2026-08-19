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

函数参数写成 `object`，返回值只能是宽泛对象；写成泛型 T，调用方的具体类型可以沿输入传播到输出。泛型用于表达多个位置之间的类型关系，没有参与关系的类型参数只会增加调用成本。

## 类型参数保存输入与输出的关系

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

## 调用点如何完成泛型推断

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

T 由 rows 推断，K 同时受 `keyof T` 约束并由第二个实参推断，返回 `T[K]` 保留属性值类型。若把 key 写成 string，函数体只能靠索引签名；若把返回值写成 unknown[]，调用方又会丢失关系。

## 约束和默认参数限定可接受输入

`T extends HasId` 表示 T 至少具有 id，同时保留额外字段。约束不会创建继承实例，也不提供运行时检查。默认类型参数用于调用方没有推断结果时的默认，不应掩盖无法推断的 API 设计。

调用端如果要连续填写多个复杂类型参数，往往说明公开 API 没有把类型信息放进可推断的输入。优先从 props、Schema、默认值或配置对象推断，仅在确实没有运行输入的工厂中暴露显式类型参数。

## 运行时解析补上静态类型的证据

`request<T>()` 只把 JSON 断言成 T 时，调用方可以指定任意返回类型。更可靠的 API 接收运行时 parser，再从 parser 的返回值推断 T。泛型由此连接校验结果与 Promise 返回，非法数据在网络边界失败。

类型测试用 `@ts-expect-error` 检查非法 key，运行时测试覆盖属性不存在和 parser 失败。两类测试分别证明编译期关系与外部输入校验，不能相互替代。

## 组件 API 保留行与列的推断链

数据表组件常见关系是 `rows: T[]`、`columns: Column<T>[]`、`render(value: T[K], row: T)`。把所有列塞进一个宽泛联合会让 K 丢失关联；可用列工厂函数在每次创建列时捕获 K，再把结果作为只读列集合传给组件。

React JSX 与 Vue SFC 的泛型推断会随框架和工具链变化，组件库需要在真实消费项目中保留最小 fixture，并在升级 TypeScript 或 JSX 插件后重新执行类型测试。

## 官方依据

- [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook: keyof](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript Handbook: Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)

## 迁移复核：TypeScript 泛型、keyof 与索引访问类型
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
