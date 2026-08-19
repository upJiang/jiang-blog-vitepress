---
title: Effect 生命周期、依赖与资源清理
description: 把 Effect 视为外部系统同步过程，解释依赖比较、cleanup、竞态、Strict Mode 检查和无需 Effect 的场景。
category: frontend
part: React
chapter: 35
tags:
  - React
  - useEffect
prerequisites:
  - Hooks 状态与闭包
outcomes:
  - 按资源所有权设计 Effect
  - 消除请求和订阅竞态
practice:
  type: implementation
  result: 实现可取消请求与可释放订阅
  verify:
    - 切换参数不会显示旧响应
    - 卸载后没有监听器和定时器残留
evidence: official
updated: 2026-08-11
---

# Effect 生命周期、依赖与资源清理

Effect 是 React 在 Commit 后让已显示 UI 与外部系统保持同步的生命周期协议。它位于组件状态与网络连接、事件监听、定时器或第三方控件之间；setup 建立资源，cleanup 撤销同一资源，依赖数组决定何时替换这段同步关系。

快速从用户 A 切到用户 B，A 的慢请求最后返回并覆盖 B，说明请求的资源所有权没有跟随依赖变化。问题不在 fetch 是否“支持 React”，而在旧同步过程没有被取消或禁止提交结果。

## Effect 的正确问题模型

Effect 用于让已提交 UI 与 React 之外的系统保持同步，例如网络连接、浏览器事件、定时器或第三方控件。setup 建立资源，cleanup 撤销同一资源。依赖变化时先清理旧同步，再以新值建立；卸载时只清理。

纯派生值应在 Render 计算，用户动作应在事件处理器执行。为了把 `firstName + lastName` 写入另一个 state 而创建 Effect，会多一次提交并制造短暂不一致。
## 依赖数组是代码事实

Effect 内读取的响应式值都应进入依赖。React 使用 `Object.is` 比较新旧依赖，引用每次新建会导致重复同步。解决方式不是删除依赖，而是移动不必要对象、稳定真正的协议参数，或重新划分资源所有权。

```tsx
function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setUser(null)

    loadUser(userId, controller.signal)
      .then(setUser)
      .catch(error => {
        if (error.name !== 'AbortError') reportError(error)
      })

    return () => controller.abort()
  }, [userId])

  return user ? <ProfileView user={user} /> : <Loading />
}
```

每次 userId 变化都会先执行旧 cleanup，使旧请求收到取消信号，再创建新 Controller 和请求；成功输出只来自当前 Effect 拥有的调用。AbortError 被当作预期终止，其他异常进入观测和错误状态，卸载后也不会继续持有网络资源。

输入是 userId，资源是对应请求，cleanup 通过 AbortSignal 取消旧拥有者。仅设置 `ignore = true` 可以阻止旧结果写入，但不会停止网络和下游工作；支持取消时应传递取消信号。
## Strict Mode 为什么额外执行

开发环境可能执行 setup、cleanup、再 setup，用来暴露不可逆初始化和缺失清理。正确 Effect 对这条序列应与单次 setup 在用户观察上等价。关闭 Strict Mode 只会隐藏资源泄漏。

支付、创建订单等业务命令不能因页面“已显示”自动执行，应由明确用户事件或服务端幂等流程拥有。Effect 适合订阅订单状态，不适合发起不可重复扣款。
## 竞态、错误和恢复

请求可能乱序、超时、失败或在卸载后返回。组件应定义 loading、ready、empty、error 状态，取消旧请求，并决定重试由用户、数据层还是路由框架负责。盲目在 Effect catch 中立即重试会形成无界循环。

订阅类资源还要确保 handler 引用和移除调用匹配。使用匿名函数分别 add/remove 会留下监听器。定时器、Observer、WebSocket 和第三方实例都应由创建它们的 Effect 返回 cleanup。
## 验证清理是否完整

使用可控延时让 A 比 B 晚返回，快速切换参数，确认页面只显示 B；卸载组件后检查 Network 的取消状态和监听器数量。用假时钟验证定时器 cleanup，用开发 Strict Mode 验证 setup/cleanup 对称。

若 Effect 不断循环，先列出每次 setup 修改了哪些 state、这些 state 是否又改变依赖。若依赖对象不稳定，检查它是否真需成为外部协议的一部分。“空数组等于 componentDidMount”会漏掉 cleanup、闭包快照和开发环境检查。
## 依赖比较和提交时序

每次 Render 创建新的 Effect 描述，依赖数组按位置使用 `Object.is` 比较。任一依赖变化，提交后的 passive flush 先运行上一已提交 Effect 的 cleanup，再运行本次 setup。未提交 Render 的 Effect 不会启动；因此在 Render 中创建连接既无法获得这项保证，也会在被丢弃时泄漏。

```text
commit A: setup(query=A)
render B（可能中断）: 不启动 Effect
commit B: cleanup(query=A) -> setup(query=B)
unmount: cleanup(query=B)
```

这条提交时间线也解释了 Strict Mode 的压力测试：额外 setup -> cleanup -> setup 要求资源可以重复建立和释放。用全局布尔值跳过第二次 setup，只会掩盖真实的卸载和重连问题。
## 请求竞态的所有权

Effect 中的请求至少需要“旧结果不可提交”保证。AbortController 能请求取消，但服务端可能已处理、某些客户端也可能无法真正中止，因此还要用 generation/requestId 判断响应是否仍属于当前依赖。写请求若有外部副作用，取消 UI 等待不等于业务回滚，必须依赖幂等键和服务端状态机。

很多 Effect 可以删除：从 props 派生展示值应在 Render 计算，用户点击提交应在事件处理器执行，缓存数据应由专门数据层提供一致快照。保留的 Effect 应能说出它在同步哪个外部系统、资源所有者是谁、cleanup 如何证明无残留。
## 官方依据

- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
