---
title: 函数重载、协变逆变与组件回调类型
description: 从回调替换安全进入参数逆变、返回值协变、strictFunctionTypes、重载解析和 React/Vue 事件回调设计。
category: frontend
part: TypeScript
chapter: 27
tags:
  - TypeScript
  - Variance
  - Overload
prerequisites:
  - 函数类型与继承基础
outcomes:
  - 解释函数可赋值条件
  - 选择联合、泛型或重载
practice:
  type: implementation
  result: 验证一组回调和重载契约
  verify:
    - 不安全回调被编译器拒绝
    - 实现签名覆盖所有重载
evidence: official
updated: 2026-08-11
---

# 函数重载、协变逆变与组件回调类型

函数重载为同一函数声明多种调用形状，协变和逆变描述类型在返回值、参数位置的兼容方向。两者属于 TypeScript 的函数类型检查，用来让 API 表达调用者可见的契约，同时拒绝不安全的组件回调；运行时仍只有一个 JavaScript 实现。

系统需要一个能处理所有 Animal 的回调，却传入只会处理 Dog 的函数。如果调用方随后传 Cat，运行时就会失败。函数参数的兼容方向与普通返回值不同，这是理解回调类型和组件事件 API 的关键。

## 返回值协变、参数逆变

需要返回 Animal 的位置，可以使用返回 Dog 的函数，因为 Dog 至少具备 Animal 能力。需要接收 Dog 的位置，可以使用接收 Animal 的函数，因为它能处理任何 Dog。反过来，把只接收 Dog 的函数当成接收 Animal，会接受其无法处理的 Cat。

在 strictFunctionTypes 下，普通函数类型参数按更安全方向检查；方法位置为兼容历史保留差异。回答“TypeScript 是协变还是逆变”必须指出类型位置，不能给整个语言贴单一标签。

## 重载的三层签名

重载签名对调用方可见，实现签名必须足够宽以覆盖所有重载，却通常不对调用方直接开放。运行时只有一个函数体，要靠类型守卫分支。

```ts
function parse(input: string): URL
function parse(input: ArrayBuffer): Uint8Array
function parse(input: string | ArrayBuffer): URL | Uint8Array {
  if (typeof input === 'string') return new URL(input)
  return new Uint8Array(input)
}
```

输入与输出存在离散关联时重载清晰；只需接受联合且返回同一类型时直接用联合；可由输入类型参数推导时优先泛型。堆叠几十个重载通常意味着数据模型需要重构。

## 组件回调和双变风险

React/Vue 组件公开 `onChange` 时应表达组件真实会传出的值。为了让窄回调“好用”而放宽成 any，会把错误推到运行时。DOM 事件、领域值和可选 meta 参数要分层，避免调用方依赖内部事件对象。

函数返回 void 的目标类型允许实现返回值但调用方忽略它，这服务于 `forEach` 等 API；它不表示实现必须没有 return。async 回调传给期望 void 的位置可能产生未处理 rejection，应明确等待或捕获。

## 验证与排查

写入可接受和应拒绝的回调赋值、重载调用与组件 props 类型测试。开启 strict，不用 bivariant hack 掩盖自有 API。运行测试再确认每个重载分支与声明一致。

函数参数的方差可以从替换安全推导，再联系 `strictFunctionTypes`、方法差异、void 回调和重载实现签名验证具体行为。

## 用生产者和消费者判断方向

若类型参数只作为返回值产生，它通常协变：返回更具体的 `Admin` 可以替代返回 `User`。若只作为参数被消费，它应逆变：能够处理所有 `User` 的函数，才能放到“至少会收到 Admin”的位置；只能处理 Admin 的函数不能接受普通 User。参数与返回都出现时通常不变，除非编译器能证明其他关系。

```ts
type Consumer<T> = (value: T) => void
type Producer<T> = () => T

declare const consumeUser: Consumer<User>
declare const produceAdmin: Producer<Admin>

const consumeAdmin: Consumer<Admin> = consumeUser
const produceUser: Producer<User> = produceAdmin
```

这不是术语记忆，而是替换后的运行安全：调用者可以给 consumeAdmin 传任何 Admin，而 consumeUser 都能处理；调用者只期待 User，produceAdmin 给出的 Admin 一定满足。

调用链先按目标函数类型检查参数方向，再执行实现函数并返回值；若参数不能覆盖所有可能输入，编译期拒绝，运行时不会自动补救。测试应包含错误回调、重载未覆盖分支和 async rejection 边界。

## 重载解析的真实顺序

调用点只看到重载签名，编译器按候选签名判断参数是否适用并选择最匹配项；实现签名必须足够宽以覆盖全部重载，却不会直接暴露给调用方。把最宽的 catch-all 重载放在前面，会吞掉后面的精确结果。联合参数如果不需要不同返回关系，优先写单个联合签名；只有输入形状与返回类型存在明确映射时使用重载。

组件回调应测试三层：父组件能否传入合法处理器；组件内部调用参数是否满足公开契约；运行时触发是否与声明一致。第三方声明出现双变或错误 overload 时，先做本地类型适配层和运行测试，不在业务里铺满断言。

## 官方依据

- [Type Compatibility: Comparing Functions](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions)
- [More on Functions: Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [TSConfig: strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)
