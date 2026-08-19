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

## 控制流图保存并合并分支证据

编译器会为变量建立控制流节点，记录赋值、条件、提前返回和合流点。某个分支提前返回后，后续路径可以排除该分支的类型；两个分支重新汇合时，变量类型会重新合并。赋值则以声明类型为上限重新计算，不会永久保留上一次收窄。

属性证据还受别名和可变性影响。把深层属性复制到局部常量，能减少后续函数调用或异步恢复使证据失效的情况；对象本身仍来自外部输入时，运行时校验不能省略。

## 自定义守卫与断言函数

`value is User` 是函数对编译器的承诺，编译器不会检查实现是否真的验证了 User。守卫应接收 unknown，逐层验证对象、字段和数组元素；否则错误守卫比断言更危险，因为它看起来像运行时证据。可复用守卫可以由小谓词组合，并用表格用例或 property-based 测试同时覆盖 true 与 false 两侧。

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

`satisfies` 也不会冻结对象。需要不可变字面量时可以组合 `as const`，同时检查 readonly 是否符合下游 API 的输入要求。

## 收窄在可变与异步边界失效

异步回调、函数调用和可变别名可能让先前属性判断失效。对 `state.current` 做判断后进入 `await`，其他任务可能已经改变状态；可以复制已验证值到局部常量，或在恢复后重新校验版本。闭包捕获可变对象时，也不能把创建时的收窄当成未来调用时仍成立。

类型测试需要覆盖每种联合成员、非法守卫输入和新增成员；运行时测试覆盖 Schema 的拒绝路径、嵌套错误与原型链边界。编译期穷尽检查和运行时输入验证保护的是两条不同边界。

## 官方依据

- [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 4.9: The satisfies Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)

## 迁移复核：TypeScript 收窄、类型守卫与 satisfies
把这套机制迁移到真实前端时，先确认它运行在哪一层：浏览器解析与调度、框架渲染、构建工具、网络协议或应用状态。相邻层可以互相影响，却不能用框架术语替代浏览器事实，也不能用一次视觉正确推断生命周期和资源已经正确释放。

验证同时覆盖首次加载、更新、卸载或离开页面、错误恢复和低性能设备。交互组件保留键盘路径、焦点、可访问名称与响应式边界；异步逻辑检查取消、竞态和迟到结果；构建结果检查产物图、缓存和 Source Map。

性能优化先用 Performance、Network、Memory 或框架 Profiler 找到时间和资源归属，再改变代码。示例中的阈值、设备与数据规模只用于解释机制，项目结论需要在目标浏览器和真实产物上复测。
