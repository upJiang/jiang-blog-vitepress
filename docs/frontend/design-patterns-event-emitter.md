---
title: 设计模式与 EventEmitter：从变化点选择结构
description: 用事件总线、策略、观察者、发布订阅、代理和工厂解决具体变化，避免把模式名称当答案。
category: frontend
part: 基础与手写
chapter: 22
tags:
  - JavaScript
  - Design Pattern
  - EventEmitter
prerequisites:
  - 函数、对象与模块基础
outcomes:
  - 区分观察者和发布订阅
  - 设计可释放、可诊断的事件系统
practice:
  type: implementation
  result: 实现支持 once、off 和错误隔离的 EventEmitter
  verify:
    - 重复订阅和迭代中退订有测试
    - 监听器异常不会破坏内部状态
evidence: public-source
updated: 2026-08-11
---

# 设计模式与 EventEmitter：从变化点选择结构

支付渠道按地区变化，适合策略；对象状态变化要通知直接观察者，适合观察者；跨模块通过事件中心解耦，接近发布订阅。模式不是类名清单，而是对依赖方向、创建时机和变化维度的选择。

## 观察者与发布订阅的差别

观察者模式中 Subject 通常知道观察者接口并直接通知。发布订阅在发布者与订阅者之间加入 Broker 或 Event Bus，双方只约定主题和消息。后者耦合更低，却更难追踪事件来源、顺序、失败和生命周期。

前端全局 Event Bus 很容易变成隐藏状态系统。关键业务状态更适合显式 store、URL 或父子数据流；事件适合瞬时通知，必须有命名、payload 类型和所有者。

## EventEmitter 的状态与迭代语义

内部 Map 从事件名映射到监听器集合。`on` 返回取消函数；`once` 用包装器调用后移除；`emit` 应对监听器快照迭代，避免回调内 off/on 改变当前遍历。异常策略要明确：同步抛出会中断后续监听器，隔离捕获则需要错误上报通道。

```ts
type Events = {
  saved: { id: string }
  failed: { id: string; reason: string }
}

class EventEmitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(payload: any) => void>>()

  on<K extends keyof T>(event: K, listener: (payload: T[K]) => void): () => void {
    const group = this.listeners.get(event) ?? new Set()
    group.add(listener)
    this.listeners.set(event, group)
    return () => this.off(event, listener)
  }

  off<K extends keyof T>(event: K, listener: (payload: T[K]) => void): void {
    const group = this.listeners.get(event)
    group?.delete(listener)
    if (group?.size === 0) this.listeners.delete(event)
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(payload)
    }
  }
}
```

泛型让事件名与 payload 关联，快照保证当前 emit 语义稳定。`any` 被限制在内部异构存储边界；更严格实现可用映射类型封装。异步监听器需要另一个 `emitAsync` 契约，并选择串行、并行、失败快返或收集结果，不能让同步 emit 悄悄忽略 Promise rejection。

## 其他模式怎样落到前端

策略把可替换算法作为函数注入，例如价格格式化或重试判断；工厂根据配置创建实现并隐藏构造细节；代理在访问前后增加缓存、权限或日志，但不能把服务端授权下放到前端；适配器把第三方接口转换成领域契约；责任链适合一组可短路的校验或中间件。

模式会增加间接层。只有存在真实变化点、多个实现或独立测试边界时才值得引入。为一个固定 if/else 建立十个类，是把模式当仪式。

## 生命周期、诊断与测试

组件订阅后必须在卸载时调用取消函数。开发环境可在阈值后警告监听器数量，帮助发现泄漏；事件日志记录 event、关联 ID 和耗时，不记录敏感 payload。

测试重复订阅、off 不存在监听器、once、emit 中退订、emit 中新增、监听器抛错和递归 emit。先定义语义再断言，不依赖 Set 当前迭代的偶然行为。

面试讲设计模式时，应从具体变化和依赖图开始，说明不用模式会怎样、引入后新增了什么成本，并给出失效和调试路径。

## 事件系统的可观察协议

一次 `emit('saved', payload)` 的可诊断轨迹应包含 emitter、event、listener snapshot、开始/结束时间和异常策略。同步 emitter 如果 listener 返回 Promise，调用方必须知道结果是否被等待；把异步 listener 当同步调用会产生 unhandled rejection 和“emit 已成功但副作用未完成”的假象。

事件 payload 要有版本或兼容规则。新增字段通常向后兼容，改变字段含义或删除字段则需要新事件名/版本；跨窗口、Worker 或网络传输还要做结构化克隆与来源校验。全局总线不应承载需要查询当前值的状态，否则刷新、回放和新订阅者都会错过事实。

`once` 的移除时机要先于调用还是调用成功后再移除，决定递归 emit 和异常时是否再次触发；常见选择是先移除，确保一次语义，并在调用异常时单独上报。事件循环、递归深度和监听器数量都应有上限/告警。

## 官方依据

- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [DOM EventTarget](https://dom.spec.whatwg.org/#interface-eventtarget)
- [MDN: CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
