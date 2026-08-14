---
title: SSE、WebSocket 与流式页面
description: 从任务进度页面出发，选择单向或双向通道，并处理游标、重连、心跳和慢消费者。
category: frontend
part: 现代前端：安全与通信
chapter: 12
tags:
  - SSE
  - WebSocket
prerequisites:
  - HTTP 与事件监听
outcomes:
  - 选择实时协议
  - 实现断线恢复状态机
practice:
  type: implementation
  result: 设计一条可重放的进度流
  verify:
    - 重复事件不会重复更新
    - 断线后从游标继续
evidence: public-source
updated: 2026-08-06T00:00:00.000Z
---

# SSE、WebSocket 与流式页面

SSE 是服务端通过一个持续的 HTTP 响应向浏览器发送文本事件的单向通道；WebSocket 是握手后由客户端和服务端双向发送消息的长连接协议。两者位于页面状态与后端事件服务之间，用来减少轮询延迟，但都不替业务保存任务状态、权限或幂等结果。

页面只展示后台任务进度时，数据主要从服务端流向浏览器，SSE 通常更简单。它支持事件 ID 和自动重连。只有客户端也需要持续高频发送，或消息主要是二进制时，WebSocket 的全双工通道才更合适。

最小客户端连接一条 SSE，保存最后应用的序号，并在断线后继续。慢消费者、页面卸载与多 Tab 还需要各自的资源和状态处理。

## 按数据方向选择流式协议

| 需求 | 首选 |
| --- | --- |
| 任务进度、通知、生成文本 | SSE |
| 高频双向协作或二进制 | WebSocket |
| 低频状态、兼容兜底 | 条件轮询 |

```mermaid
sequenceDiagram
  participant B as 浏览器
  participant S as 事件服务
  B->>S: 连接 after=80
  S-->>B: 81, 82, 83
  B--xS: 网络中断
  B->>S: 重连 after=83
  S-->>B: 84 及之后
```

连接只负责传输，任务状态和事件序列保存在服务端。连接关闭不等于任务失败。

## 事件应用与游标推进

事件包含 sequence、eventId、type 与 payload。浏览器解析并成功更新本地状态后，才保存最后 sequence。重复事件按 eventId 或 sequence 忽略，发现缺口则暂停应用并请求重放。

下面是最小 EventSource 示例。输入是任务事件 URL，输出是按序更新的状态；cleanup 关闭连接，避免组件卸载后继续接收。

```ts
export function subscribeTask(
  url: string,
  apply: (event: TaskEvent) => void,
  onGap: (expected: number, received: number) => void
) {
  const endpoint = new URL(url, location.href)
  endpoint.searchParams.delete('after')
  const cursorKey = `sse:${endpoint.origin}${endpoint.pathname}${endpoint.search}:cursor`
  const savedCursor = sessionStorage.getItem(cursorKey)
  if (savedCursor) endpoint.searchParams.set('after', savedCursor)

  const source = new EventSource(endpoint, { withCredentials: true })
  let appliedSequence = Number(savedCursor ?? 0)

  source.onmessage = (message) => {
    const event = TaskEventSchema.parse(JSON.parse(message.data))
    if (event.sequence <= appliedSequence) return
    if (event.sequence !== appliedSequence + 1) {
      source.close()
      onGap(appliedSequence + 1, event.sequence)
      return
    }
    apply(event)
    appliedSequence = event.sequence
    sessionStorage.setItem(cursorKey, String(event.sequence))
  }

  source.onerror = () => {
    // EventSource 会按服务器 retry 提示或默认策略重连。
  }

  return () => source.close()
}
```

代码使用运行时 Schema 校验不可信事件。刷新页面后，新连接通过 `after` 查询参数恢复应用已经确认的游标；收到消息后先去重、检查缺口、更新页面，最后才写入 `sessionStorage`。序号跳跃时关闭连接并调用 `onGap`，页面据此读取新快照；JSON 解析失败、Schema 不匹配或 `apply` 抛错时也不会推进游标，生产实现还应把这些错误交给页面错误状态和观测系统。

原生 EventSource 的自动重连还有另一套浏览器内机制：服务端在事件中发送 `id: 83` 后，浏览器会记住该 ID，并在同一个 EventSource 自动重连时发送 `Last-Event-ID: 83`。页面刷新会创建新对象，应用若要从持久游标恢复，仍需像示例一样显式传 `after`，或先读取快照。EventSource 不能让业务代码随意添加请求头；需要自定义 Authorization、POST 或二进制流时，要改用基于 `fetch` 的流式读取，并自行实现解析和重连。

## 快照恢复与游标过期

首次进入页面先获取任务快照及 sequence，再订阅后续事件。若游标早于服务端保留窗口，接口明确返回 cursor expired，页面重新获取快照。悄悄跳到最新会漏掉不可合并状态。

终态到达后关闭连接。页面隐藏时是否保持连接取决于业务：短任务可以继续，长时间后台页可以关闭并在恢复时用快照重连。多 Tab 可以各自连接，也可以通过 BroadcastChannel 共享，但共享方案要处理 leader 退出与权限变化。

## 客户端背压与渲染节流

生成文本事件太密时，逐条触发 React/Vue 渲染会卡住主线程。接收层先合并可合并增量，再按动画帧或固定小批更新 UI；终态与错误立即处理。浏览器 WebSocket 的 `bufferedAmount` 只能反映发送缓冲，不能证明对端已经应用消息。

自定义重连使用指数退避与抖动，并限制最大等待时间。原生 EventSource 主要接受事件流中的 `retry:` 字段控制重连间隔；普通 HTTP `Retry-After` 不能直接当成所有 EventSource 实现都会遵守的应用契约。网络恢复后还要避免所有 Tab 同时冲击接口。

## WebSocket 多了哪些工作

WebSocket 需要应用消息协议、ACK、顺序、重放、心跳、入站限速和消息大小。握手时认证不代表每条写命令都有权限，服务端仍按当前用户与对象授权。页面发送队列有上限，断线时明确哪些命令可重试。

浏览器测试应穿过真实 Nginx/CDN，检查首事件延迟和分段到达。以 Nginx 为例，事件路由通常需要关闭代理缓冲并拉长读取超时；具体配置仍应由部署环境验证：

```nginx
location /api/events/ {
  proxy_pass http://event_service;
  proxy_http_version 1.1;
  proxy_buffering off;
  proxy_read_timeout 1h;
}
```

先用 `curl -N` 观察事件是否逐条到达，再到浏览器模拟睡眠唤醒、离线、切流和后台 Tab。localhost 能工作不能证明代理链没有缓冲。

## 做一次断线、重复和慢消费实验

让测试服务每 200ms 发送递增序号事件，客户端成功应用事件后才保存游标。收到第 5 条后主动断网，服务端继续产生到第 9 条；恢复网络后从游标 5 回放第 6 至 9 条，并故意重复发送第 8 条。

| 观察 | 正确行为 |
| --- | --- |
| 断线 | UI 保留最后已确认状态，不宣告任务失败 |
| 重连 | 使用最后成功游标补齐缺口 |
| 重复事件 | 按任务 ID + 序号去重 |
| 游标过期 | 获取最新快照，再建立新游标 |
| 高频文本增量 | 接收层合并后批量渲染 |
| 终态 | 立即应用并关闭连接 |

SSE 测试要经过真实 Nginx/CDN，记录首事件和分段到达时间，防止代理缓冲。WebSocket 场景再增加心跳、应用 ACK、入站限速、消息大小和发送缓冲测试。协议连接成功不代表消息业务成功，每条命令仍要认证、授权与幂等。

页面隐藏、系统睡眠和多 Tab 会改变连接生命周期。产品可以选择后台保持、关闭后恢复或共享连接，但要明确 leader 退出和权限撤销时怎样清理。先保证状态可重建，再追求连接永不断开。
