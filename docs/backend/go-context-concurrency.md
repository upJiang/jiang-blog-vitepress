---
title: "Goroutine、Context、取消与背压"
description: "用结构化并发管理生命周期、资源上限和慢消费者。"
category: backend
tags: ["Go", "Concurrency"]
updated: 2026-08-04
order: 130
depth: core
series: "Go 服务工程"
---
# Goroutine、Context、取消与背压

Goroutine 创建便宜，不代表可以无限创建；Channel 能传值，不自动定义所有权、关闭和失败语义；Context 能广播取消，也不会强制不合作的函数停止。可靠并发的关键，是让每个并发单元属于一个明确生命周期，并让生产速度受最慢资源约束。

## 结构化并发的三个问题

启动 Goroutine 前回答：谁等待它、谁能取消它、它的错误交给谁。如果三个问题没有答案，就可能产生泄漏、吞错或进程关闭时遗留工作。

```go
func BuildAll(ctx context.Context, items []Item, limit int) ([]Artifact, error) {
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(limit)
	results := make([]Artifact, len(items))

	for index, item := range items {
		index, item := index, item
		g.Go(func() error {
			artifact, err := buildOne(ctx, item)
			if err != nil { return fmt.Errorf("build item %s: %w", item.ID, err) }
			results[index] = artifact
			return nil
		})
	}
	if err := g.Wait(); err != nil { return nil, err }
	return results, nil
}
```

父函数等待所有子任务；任一失败取消同组；SetLimit 限制并发。不同索引写不同 slice 元素在此模型中可行，但若 append、共享 map 或复合状态，就要锁/单所有者聚合。循环变量捕获在不同 Go 版本语义有所变化，显式局部绑定仍让意图清晰。

## Context 是取消树，不是参数袋

入口创建 Context，调用链向下传递。不要存进 struct，不传 nil，不用 string key 装业务参数。值只放请求范围、跨 API 边界必要的信息，key 使用私有类型。

```go
func callDependency(ctx context.Context, budget time.Duration) error {
	deadline, ok := ctx.Deadline()
	if ok && time.Until(deadline) < budget {
		return context.DeadlineExceeded
	}
	child, cancel := context.WithTimeout(ctx, budget)
	defer cancel()
	return dependency.Call(child)
}
```

每个阻塞操作选择小于剩余总预算的 timeout。函数在 select/循环边界检查 `ctx.Done()`，数据库/HTTP 调用使用 Context 版本。取消是协作式的；CPU 长循环若从不检查，就不会及时停止。

不要把取消统一包装成 Internal。`context.Canceled` 常表示客户端离开或父任务终止，`DeadlineExceeded` 表示预算耗尽；日志和指标语义不同。

## Channel 所有权与关闭规则

通常由唯一发送方关闭 Channel，接收方不关闭不知道是否仍有发送者的通道。关闭表示“不再产生值”，不是广播任意错误；错误通过 errgroup、单独结果或带 error 的消息传递。

```go
func Produce(ctx context.Context, source Source) <-chan Item {
	out := make(chan Item, 16)
	go func() {
		defer close(out)
		for source.Next() {
			select {
			case out <- source.Item():
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}
```

发送和接收都必须可被取消，否则下游提前退出后上游永远阻塞发送。不要通过 `recover` 掩盖 send on closed channel；那是所有权设计错误。

## 有界流水线与背压

```mermaid
flowchart LR
  A[Reader] -->|bounded channel| B[Parse workers]
  B -->|bounded channel| C[Transform workers]
  C -->|bounded channel| D[Writer]
```

Channel 容量是短暂抖动缓冲，不是无限队列。容量过大会推迟背压并增加内存，过小可能降低吞吐；基于阶段延迟、对象大小和允许积压测量。若上游到达率长期高于下游处理率，必须限流、扩容或拒绝，不能只增大 buffer。

```go
func transformStage(ctx context.Context, in <-chan Item, workers int) <-chan Result {
	out := make(chan Result, workers*2)
	var wg sync.WaitGroup
	wg.Add(workers)
	for i := 0; i < workers; i++ {
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done(): return
				case item, ok := <-in:
					if !ok { return }
					result := transform(item)
					select {
					case out <- result:
					case <-ctx.Done(): return
					}
				}
			}
		}()
	}
	go func() { wg.Wait(); close(out) }()
	return out
}
```

生产代码还要传递 transform 错误并取消整组；示例重点是通道关闭和取消路径。

## Semaphore 与资源池不是同一件事

`errgroup.SetLimit` 或带容量 Channel 可限制任务并发，但数据库自身还有连接池。应用并发上限应不大于最紧资源，且为健康检查、事务提交和其他请求保留余量。多个实例总并发一起计算。

外部 API 同时有并发、RPS 和 token/成本限制，需要 semaphore + rate limiter + deadline。只限制 Goroutine 数不控制每个任务内存；大文件按流/块处理并限制在途字节。

## Fan-out/Fan-in 的顺序与失败语义

并行执行会打乱完成顺序。若输出需要输入顺序，结果携带 index 并由单聚合器重排；重排缓冲也要有上限。若一个分支失败，明确是 fail-fast、收集部分结果，还是记录失败后继续。`errgroup` 默认适合 fail-fast，不等于所有业务都如此。

```go
type indexedResult struct { Index int; Value Artifact; Err error }
```

部分成功必须作为协议返回，不能吞错误后给出完整成功。涉及副作用时每项幂等，重试只处理失败项。

## 慢消费者和流式连接

SSE/WebSocket/gRPC stream 的客户端可能不读。每连接无限 goroutine + 无限发送队列会耗尽内存。使用有界队列、写 deadline 和滞后策略：可覆盖进度合并，关键事件不可丢，超预算发送 resync/断开。

```go
func enqueue(conn *Connection, event Event) error {
	select {
	case conn.outbound <- event:
		return nil
	default:
		if event.Coalescible() { return conn.replaceLatest(event) }
		return ErrSlowConsumer
	}
}
```

网络写操作要受 Context/deadline 控制。心跳只能检测连接，不能代替业务事件持久化和重放。

## 锁、原子与单所有者

优先让一个 Goroutine 拥有可变状态，通过消息输入；简单共享计数用 atomic；复合不变量用 Mutex。不要为了“无锁”构建难以证明的协议。

Mutex 临界区短且不做网络调用。复制含 Mutex 的 struct 会复制锁状态，相关类型用指针接收者并通过 `go vet -copylocks` 检查。`sync.Map` 适合特定读多/键独立模式，不是普通 map 的默认替代。

Race detector 找到数据竞争，不证明逻辑原子性。例如两个操作分别加锁但“检查后执行”跨锁窗口，仍可能违反业务不变量。

## Timer、Ticker 与泄漏

循环创建 `time.After` 会持续分配 Timer；长期循环使用 `NewTimer`/`Reset` 并正确 stop/drain。Ticker 用完 `Stop()`。每次 retry、心跳和租约续期都必须随 Context 结束。

```go
ticker := time.NewTicker(10 * time.Second)
defer ticker.Stop()
for {
	select {
	case <-ctx.Done(): return ctx.Err()
	case <-ticker.C: renewLease(ctx)
	}
}
```

不要在 goroutine 内 `log.Fatal`/`os.Exit`，它会跳过全进程清理。

## 服务关闭是一棵取消树

根 Context 由 signal 创建。先 readiness false，停止新工作，再取消消费者/后台循环，HTTP Server Shutdown 排空，等待 errgroup，最后关闭数据库与遥测。每个循环必须响应根 Context。

```go
root, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
defer stop()
group, ctx := errgroup.WithContext(root)
group.Go(func() error { return api.Run(ctx) })
group.Go(func() error { return worker.Run(ctx) })
if err := group.Wait(); err != nil && !errors.Is(err, context.Canceled) {
	logger.Error("service stopped", "error", err)
}
```

实际 Web 与 Worker 常拆进程，结构原则相同。排空有 deadline，超时后记录未完成任务并依靠持久租约恢复。

## 验证：泄漏、取消和容量

| 场景 | 必须证明 |
| --- | --- |
| 下游提前失败 | 上游发送者全部退出 |
| 父 Context 取消 | 数据库、HTTP、Timer 和 Worker 停止 |
| 慢消费者 | 内存稳定，按策略断开/降采样 |
| 一项失败 | fail-fast 或部分成功符合协议 |
| 并发达到上限 | 不再创建无限在途工作 |
| SIGTERM | 停止接单、在途排空、资源关闭 |
| 运行数小时 | goroutine 数和 heap 不持续增长 |

```go
func TestPipelineStopsWhenConsumerReturns(t *testing.T) {
	baseline := runtime.NumGoroutine()
	ctx, cancel := context.WithCancel(context.Background())
	out := startPipeline(ctx, infiniteSource())
	<-out
	cancel()

	require.Eventually(t, func() bool {
		return runtime.NumGoroutine() <= baseline+allowedRuntimeNoise
	}, time.Second, 10*time.Millisecond)
}
```

Goroutine 数测试有运行时噪声，结合 `goleak`、pprof goroutine profile 和稳定压测。运行 `go test -race ./...`、`go vet ./...`；注入慢数据库、卡住 HTTP、通道不消费和重复取消。

## 常见误区

- 每个元素一个 goroutine，没有上限和等待者。
- Context 存在 struct 或用作业务参数 Map。
- Channel 由接收方关闭，或多个发送者争抢关闭。
- 下游退出后上游发送不监听取消。
- 通过巨大 buffer 隐藏长期供需失衡。
- 并发数只按 CPU，不考虑连接池、内存和外部配额。
- Race detector 通过就认为业务并发正确。
- Timer/Ticker 和后台循环不随根 Context 关闭。
- 流式慢客户端拥有无限发送队列。

## 参考资料

- [Go context](https://pkg.go.dev/context)：取消、截止时间和值传播的标准接口与使用约束。
- [Go Blog: Pipelines and cancellation](https://go.dev/blog/pipelines)：有界流水线、fan-out/fan-in 和提前退出。
- [x/sync errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)：关联 goroutine 的错误传播与取消。
- [Go Race Detector](https://go.dev/doc/articles/race_detector)：数据竞争检测的能力和不能覆盖的业务并发错误。
