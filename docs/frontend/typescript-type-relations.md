---
title: TypeScript 类型关系与结构化类型系统
description: 从赋值兼容进入子类型、结构化类型、对象新鲜度、联合与交叉，解释 TypeScript 有意保留的不健全边界。
category: frontend
part: TypeScript
chapter: 23
tags:
  - TypeScript
  - Type Relations
prerequisites:
  - TypeScript 基础类型
outcomes:
  - 推导赋值兼容关系
  - 识别结构化类型的收益与风险
practice:
  type: implementation
  result: 用编译用例验证类型关系
  verify:
    - 正反例与编译结果一致
    - any 和断言不会被误称为安全
evidence: official
updated: 2026-08-11
---

# TypeScript 类型关系与结构化类型系统

TypeScript 类型关系规定两个类型能否赋值、调用或作为回调传递；结构化类型系统按成员形状比较，不按类型名称比较。检查发生在 TypeScript 编译阶段，用来约束接口、函数和组件之间的数据边界。代码变成 JavaScript 后，这些关系不会继续验证网络或存储里的值。

函数要求 `{ id: string }`，传入 `{ id, name, role }` 的变量可以；直接传对象字面量却可能因额外字段报错。这不是类型系统自相矛盾，而是结构化兼容与对象字面量新鲜度检查作用在不同位置。

## 结构决定兼容性

TypeScript 通常不要求类型显式声明同一父类。源类型拥有目标类型要求的全部成员，成员类型也兼容，就可以赋值。这让普通对象、第三方库和渐进迁移容易组合。

```ts
type Identified = { id: string }
const account = { id: 'u-1', name: 'Jiang' }
const identified: Identified = account
```

赋值后变量的静态类型是 Identified，运行时对象仍有 name；类型注解不会删除字段。结构化也会产生意外兼容，例如两个语义不同但形状相同的 string ID。需要阻止混用时可用带 unique symbol 的品牌类型，但品牌仍是静态约束，运行时校验另行负责。

## 新鲜对象与额外属性

对象字面量直接出现在目标位置时，编译器额外检查拼写错误和未知字段。先赋给变量后，普通结构兼容只关心目标所需成员。`satisfies` 可以检查对象符合目标约束，同时保留更精确的推断，是配置对象常用方案。

绕过错误使用 `as` 会隐藏真正拼写问题。应判断 API 是否允许扩展字段：不允许则精确建模，允许则用泛型、索引签名或显式扩展类型表达。

## 联合、交叉与集合直觉

联合 `A | B` 表示值属于任一集合，未收窄前只能访问两者共同安全成员；交叉 `A & B` 要同时满足两者。属性冲突可能把交叉成员推成 never，不能把交叉简单理解为对象 spread。

`never` 是空集合，可赋给任意类型；`unknown` 是安全顶层，任意值可赋给它但不能直接使用；`any` 同时绕过输入和输出关系，会污染后续推断。`{}` 也不是“空对象”，它通常接受大多数非 null/undefined 值。

## 不健全边界

数组协变、索引访问、函数参数和声明文件为了生态兼容保留部分不健全行为。开启 strict 与 noUncheckedIndexedAccess 能收紧常见漏洞，但不能把编译通过当作运行证明。

验证类型关系要写“应通过”和配合 `@ts-expect-error` 的“应失败”用例，运行 `tsc --noEmit`。若预期错误消失，测试本身会失败，能发现 TypeScript 升级后的行为变化。

结构化类型还要结合额外属性检查、品牌类型、顶层与底层类型以及运行时边界理解。“鸭子类型”只描述了兼容关系的一部分。

## 编译器怎样比较两个对象类型

把 `Source` 赋给 `Target` 时，可以按一条可手算的链路检查：先处理 `any`、`unknown`、`never` 等特殊类型；再展开联合或交叉关系；随后确认 Target 的每个必需属性都能在 Source 找到；最后递归比较属性、调用签名、索引签名和泛型参数。私有或受保护成员会引入声明来源约束，因此两个形状相同的类也未必兼容。

```ts
interface Target {
  readonly id: string
  notify(value: string): void
}

interface Source {
  id: 'u-1'
  notify(value: string | number): void
  role: 'admin'
}

declare const source: Source
const target: Target = source
```

`id` 的字面量集合是 `string` 的子集；`notify` 能接受更宽的输入，因此作为消费者可以替代目标。要注意方法语法为兼容历史存在双变行为，函数属性在 `strictFunctionTypes` 下检查更严格。设计自己的回调 API 时使用函数属性并写负向类型测试，避免依赖双变漏洞。

## 联合关系的执行推演

判断 `A | B` 是否可赋给 `T`，需要 A 和 B 都可赋给 T；判断 S 是否可赋给 `A | B`，只需找到一个兼容分支。交叉则要求同时成立。这个方向能解释为什么联合值在未收窄前只能使用共有能力，也能解释条件类型的分发结果。

对象新鲜度只对特定对象字面量位置增加检查，不等于 TypeScript 存在“精确对象类型”。如果协议禁止额外字段，编译期新鲜度远远不够：变量、JSON 和 spread 都可能带入额外属性，仍需运行时 Schema 的 strict 模式或服务端契约。

排查兼容性错误时先把复杂别名拆成最小 Source/Target，再打开 `--noErrorTruncation` 查看完整关系；泛型错误则固定一个具体类型参数，确认问题发生在约束、推断还是最终赋值。不要从报错最深处盲目加 `as unknown as`，它会切断整个证明链。

## 官方依据

- [TypeScript Handbook: Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TSConfig: strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)

## 迁移复核：TypeScript 类型关系与结构化类型系统
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
