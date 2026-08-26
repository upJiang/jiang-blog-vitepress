---
title: MCP 一次调用如何走完生命周期：会话、消息与传输关闭
description: 用一次只读工具调用建立 MCP 的 Session 不变量，解释 request id、progressToken、取消、断线恢复与 stdio/HTTP 关闭怎样影响消息归属。
category: ai-agent
part: 工具、MCP 与 Skill
stageKey: tools
chapter: 11
sequence: 11
slug: mcp-protocol-lifecycle
tags:
  - MCP
  - JSON-RPC
  - Lifecycle
sourceKey: ai-mcp-protocol-lifecycle
dependsOn:
  - mcp-foundations-boundaries
updated: '2026-08-25'
lastUpdated: false
---

# MCP 一次调用如何走完生命周期：会话、消息与传输关闭

[上一篇](/docs/ai-agent/mcp-foundations-boundaries)已经区分 Host、Client 和 Server 的职责。本篇把问题收窄到一件更容易出错的事：一条 MCP 连接中，一次工具调用怎样从“还不能运行”走到“已经收口”，中途的响应、进度、取消和断线为什么不能混成同一种状态。

贯穿案例是一条只读的 `search_policy` 查询。工具名、查询文本和消息编号都是教学值；协议事实以 [MCP 2025-06-18 规范](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)为准。本文不讨论用户授权、检索结果是否足以回答，以及业务动作是否已经完成。

## 一条连接先要取得什么资格

stdio 子进程已经启动，或 HTTP 地址已经返回响应，只能证明字节通道存在。MCP 把正常通信放在初始化之后，Client 必须先发送 `initialize`，声明自己支持的协议版本、能力和实现信息，Server 再返回选定版本、服务端能力和实现信息。

Client 接受响应后发送 `notifications/initialized`。在这之前，Client 不应发送除 `ping` 之外的其他请求；Server 也不应在收到 initialized 前主动发起普通请求。初始化失败或版本无法互相支持时，连接不能进入正常操作阶段。

这一步建立的是协议资格，不是业务权限。即使初始化成功，Host 仍要在自己的权限层决定是否允许当前用户查阅某类制度。

```text
transport ready
  → initialize
  ← negotiated version and capabilities
  → notifications/initialized
  → operation becomes legal
```

因此，第一条测试先检查“工具调用是否发生在 initialized 之后”。工具最终能返回结果，无法补上缺失的初始化资格。

## 能力声明为什么还不是工具合同

初始化响应中的 `tools` 能力只表示 Server 支持工具这一类协议功能。它没有告诉 Client 当前目录里一定存在 `search_policy`，也没有给出该工具最新的输入 Schema。

进入运行阶段后，Client 才能调用 `tools/list` 读取名称、描述和 `inputSchema`。目录可能分页，必须按 `nextCursor` 继续读取，直到没有下一页，才能把当前目录当作完整候选集。

如果 Server 在初始化能力中声明 `listChanged`，目录变化时可以发送 `notifications/tools/list_changed`。收到通知后，Host 需要重新发现目录，再处理已经交给模型的旧工具候选。拒绝旧 Schema 还是重新规划，属于 Host 的新鲜度策略，不是 MCP 统一规定的回复。

这里形成了一个明确的依赖顺序：初始化让“工具协议”可用，`tools/list` 才让“某个工具的当前合同”可用。把能力字段当成工具存在证明，会让调用在 Schema 已变化时继续执行。

## 同一个 Session 中，什么决定响应归属

MCP 的消息遵循 JSON-RPC 2.0。Request 必须有字符串或整数 `id`，不能是 `null`；正常 Response 会带回对应的 `id`。取消或传输异常可能没有 Response。更严格的一条规则决定了实现能否安全处理乱序响应：同一请求方在同一 Session 内不能再次使用已经用过的 request `id`。

这条规则直接决定消息归属。假设请求方先用 `id = 7` 查询，等待超时后错误地把 `7` 分给下一次查询。旧请求的迟到 Response 到达时，接收方无法仅靠这个数字知道它属于哪一次等待，新的调用就可能被错误完成。

因此，Session 内应维护一个已经用过的 request id 集合。完成、失败、取消或超时都不能把 id 放回可用池。

请求的 `id` 只在正常成功或错误 Response 存在时完成配对。它不负责进度，也不表示业务幂等。

若发送方希望接收进度，可以在请求 `_meta` 中放置 `progressToken`。Request 的接收方可以在 `notifications/progress` 中回传同一个 Token，发送方据此找到活动调用。`search_policy` 的通常方向是 Server 向 Client 报告进度，但 MCP 允许任一方发送进度。这个 Token 只在相关请求活动期间有意义，不能拿已经完成的 Token 更新另一条调用。

取消通知使用 `notifications/cancelled`，其 `requestId` 引用要取消的在途 Request。它是单向的停止意图，不会产生“取消成功”的 Response。接收方可能已经完成、无法取消，或根本不知道这个请求，于是可以忽略通知。

三种字段可以在应用内部映射到同一个 invocation，但协议职责不同：

| 字段 | 作用范围 | 终态或限制 |
| --- | --- | --- |
| Request `id` | 一次 Request 与正常成功或错误 Response | 取消或传输异常可能没有 Response；同一 Session 内对同一请求方不得复用 |
| `progressToken` | 活动调用的零到多条进度通知 | 完成、取消生效或观察终止时停止，不能用来完成请求 |
| 取消 `requestId` | 取消通知指向一条在途 Request | 只表达停止意图，不证明工作已经停止 |

Streamable HTTP 还可能有 `Mcp-Session-Id` 和 SSE event ID。Session ID 标识一组 HTTP 逻辑交互，event ID 只帮助恢复某条 SSE 流；它们都不配对 JSON-RPC Response，也不能当作业务幂等键。

现在，`search_policy` 的调用至少需要两组状态：Session 级的已用 request id，和调用级的活动 progress token。接下来观察调用仍在运行时，时间和控制消息怎样改变这些状态。

## 进度怎样影响等待，却不能取消上限

进度通知说明接收方仍在报告工作。它不是最终结果，也不能证明工具已经找到可用制度。`progress` 应保持递增，`total` 可以省略；操作完成、取消生效或传输观察终止后，不应继续发送该调用的进度。即使没有最终 Response，进度活动也必须收口。

Host 通常为一次请求设置两只时钟。一只普通请求超时用来发现没有消息的故障；收到合法进度时，可以按本地策略重置它。规范建议另一只最大超时限制整个等待时间，不能因为进度持续到达而被无限推迟。这两只时钟属于 Host 策略，不是 MCP 的统一字段。

```text
call started
  ├─ matching progress → update observation, maybe reset idle timer
  ├─ final response → settle this request id
  └─ maximum deadline → send cancellation and stop waiting
```

这个分支解释了两个常见误判。一直有进度，不代表工作最终一定成功；达到最大期限，也不代表 Server 已经停止。Host 只能把自己的等待状态收口，Server 是否释放资源要看它的处理和后续回执。

取消发生在控制层。Client 发出 `notifications/cancelled` 后，应把本地调用标为“不再等待”，并记录原因。迟到的 Response 仍可能到达，它只能进入诊断或回放记录，不能重新打开已结束的等待者。

因此，超时、取消和迟到响应的测试必须同时检查两个对象：本地等待状态是否结束，以及消息是否被错误地投递给新调用。只验证一个 `cancelled` 日志，无法证明 request id 的不复用规则真的生效。

## 断线时，哪些状态还可以观察

Streamable HTTP 的 SSE 流断开，表示 Client 暂时失去观察通道，不表示 Server 已经收到取消，也不表示 `search_policy` 已经失败。Server 可能继续处理原请求。

若 Server 为 SSE 事件提供 event ID 并支持恢复，Client 可以用 `Last-Event-ID` 重新发起 GET，请求同一条流的后续事件。恢复只针对原流的游标，不能把另一条流的消息拼进来；Server 不支持恢复时，Client 不能把重连当作可靠交付。

HTTP Session 是更大的边界。Server 可以在初始化响应中分配 `Mcp-Session-Id`，之后的请求带上它。若 Server 已清理该 Session，旧 ID 的请求会得到 404。Client 这时要去掉旧 ID，重新执行初始化，得到一个新 Session。

新 Session 不继承旧 Session 的状态：旧目录需要重新发现，旧的活动 progress token 不再有效，旧请求的迟到 Response 也不能分配给新 Session。Request id 的“不复用”约束按 Session 分界，但新 Session 仍应避免把旧消息带入新等待者。

这也是为什么“断线恢复”和“重新初始化”不能写成同一个重连分支。前者尝试补回原流，后者承认旧逻辑 Session 已失效；两者对可回放证据和未完成调用的处理不同。

## 传输关闭时，为什么没有 shutdown RPC

MCP 没有通用的 `shutdown` Request 或 Notification。Client 自创一个 `shutdown` 方法，Server 可以按未知方法处理。协议把关闭交给传输层，所以 stdio 和 HTTP 需要分别收口。

stdio 通常由 Client 启动 Server 子进程。正常关闭可以先关闭子进程的输入流并等待自然退出；超过本地等待期限后，再按进程管理策略发送 `SIGTERM`，仍不退出才强制结束。记录时要区分“输入已关闭”“进程自然退出”“收到终止信号”和“被强制结束”，否则无法判断资源是否真的收口。

HTTP 关闭连接只结束传输。若使用了 Streamable HTTP Session，Client 不再需要该 Session 时还可以向 MCP endpoint 发送 DELETE；Server 可以不允许主动删除并返回 405。连接关闭和逻辑 Session 删除是两个动作，前者不自动证明后者已经完成。

关闭前，Host 还要处理本地等待表和未消费消息。已结束的调用不能被迟到 Response 重开，新的 Request 也不应在关闭后的传输上发送。对于写操作，是否已经产生外部效果必须向领域服务查询，不能用 MCP 的 request id 或 Session ID 推断。

## 用三类测试回放一条完整轨迹

一个成功轨迹可以写成：

```text
initialize(id=1)
  → initialized
  → tools/list（读完分页）
  → tools/call(id=2, progressToken=policy-search-progress)
  → progress(progressToken=policy-search-progress)
  → response(id=2)
  → transport close
```

这里的数字和 Token 只是教学值。测试要验证的是不变量，而不是日志长得像这几行。

第一类是消息归属测试。先完成 `id=2` 的调用，再尝试复用 `id=2`，请求方应在 Session 内拒绝这个选择；再让旧请求的迟到 Response 到达，不能让它完成新等待者。并行调用的响应可以乱序，但每条 Response 只能按自己的 request id 归属。

第二类是时间和控制测试。没有进度时，普通超时应结束等待并发出取消；有合法进度时可以重置普通时钟；按规范建议设置的最大期限应在进度持续时仍结束等待。取消通知未知、迟到或目标已完成时，调用不能被伪装成“已撤销”。

第三类是传输分支测试。SSE 断线只改变可观察性，恢复时只能补回同一条流；Session 404 后必须重新初始化，不能复用旧目录和活动 Token；stdio 要检查输入流关闭与子进程退出，HTTP 要分别检查连接关闭和可选 DELETE。

内存传输适合验证本端状态、id 集合和迟到消息路由，真实 SDK 或互操作测试才适合核对具体传输实现。两类测试都不能证明用户有业务权限、检索内容真实，或外部写操作已经回滚。

## 回到这一次调用

`search_policy` 能否安全运行，先取决于初始化是否完成，再取决于工具目录是否是当前合同。调用开始后，request id 让正常响应不串线，progressToken 只描述活动进度，取消 requestId 只表达停止意图。取消或传输异常可以没有 Response，Session 失效、SSE 恢复和传输关闭又分别改变可观察状态。

这套生命周期回答的是“消息走到了哪里、哪一个等待者可以被结束、连接怎样收口”。它不回答用户是否有权查询，也不把工具回执提升为业务事实。下一篇会把这些边界落到 Python Server、Client 和可运行测试，继续验证参数错误、工具回执和资源关闭。
