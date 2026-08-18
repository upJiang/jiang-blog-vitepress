---
title: TTFT、TPOT、吞吐、队列、容量与成本
description: 用到达率、并发、服务时间、Little’s Law、开放负载和单位成本建立容量判断。
category: devops
part: 第六部分：企业级 AI Platform
chapter: 30
tags:
  - Capacity
  - Load Test
  - Cost
prerequisites:
  - 理解推理生命周期和观测指标
outcomes:
  - 设计不会自我欺骗的压测
  - 拆分托管模型和自托管 GPU 成本
practice:
  type: diagnosis
  result: 填写一张不含虚构数据的容量模板
  verify:
    - 指标口径和请求分布固定
    - 结论包含模型、版本、硬件和时间窗口
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# TTFT、TPOT、吞吐、队列、容量与成本

压测工具设置 20 个并发用户，结果显示服务每秒能处理 30 个请求，于是团队按这个数字规划生产。真实流量到来后，用户输入更长、输出上限更高，开放到达率在过载时继续施压，队列迅速增长。固定并发的闭环压测会在服务变慢时自动减少新请求，恰好掩盖了过载。



## 一次容量实验要固定哪些变量

```mermaid
flowchart LR
  S0["建立样本"]
  S1["施加到达"]
  S2["观察系统"]
  S3["形成决策"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

先看完整路径，再进入局部配置。这样即使组件名字变化，也能知道失败发生在交接之前还是之后。

### 建立样本：Workload Designer

固定模型版本并从真实分布抽样输入/输出长度、stream 和能力。

这里不靠猜测，优先读取 scenario mix、token histogram。

### 施加到达：Load Generator

用明确 open/closed 模型和阶梯负载发送带 deadline 请求。

决定下一步前需要看到 offered rate、client errors。

### 观察系统：Telemetry

记录准入、队列、TTFT、TPOT、完成率、GPU 与依赖。

这一动作的可观察结果是 per-stage histogram、saturation。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 形成决策：Capacity Planner

在 SLO 和质量门槛内选择可持续区间并计算冗余与单位成本。

可以从这些位置确认结果：safe capacity、headroom、cost/result。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

## 容量数字为什么必须带请求分布和负载模型

这里先暂停操作，把容易混用的概念拆开。定义的价值在于划清责任，而不是增加名词数量。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Open-loop Load | 按外部到达率发送请求，不因上一请求变慢而自动降速，更接近突发入口流量。 |
| Closed-loop Load | 虚拟用户完成一个请求后再发下一个，适合交互流程但可能在过载时自我节流。 |
| Little’s Law | 稳定系统中平均在途数量 L 等于到达率 λ 乘平均停留时间 W，用于核对口径而非预测一切。 |
| Saturation | 瓶颈资源接近极限后，新增负载主要转化为排队和尾延迟，而非等比例吞吐。 |
| Unit Cost | 总资源或供应商费用除以成功且符合质量门槛的结果，不能只除以请求尝试数。 |

::: tip 判断原则
不要从产品名推断能力。把可观察输入、持久状态、失败终态和下游交接点写出来。
:::

## 平均吞吐不能代表尾延迟

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| QPS 更高 | 可能牺牲输出长度、完成率或质量 | 同时固定 token 分布和终态 |
| GPU util 低 | 受 KV 容量、CPU、网络或排队策略限制 | 找第一个饱和资源 |
| 平均成本低 | 失败尝试、空回答或缓存命中口径可能被排除 | 按合格成功结果核算 |
| 自动扩容触发 | 新实例加载模型前仍没有 Ready 容量 | 计入冷启动与排队预算 |

::: warning 先保留现场
如果先重启、扩容或删除对象，最早失败可能被覆盖。先确认对象身份、版本和时间线，再决定处理动作。
:::

## 用 Little’s Law 检查数据口径是否自洽

Python 计算仅作数学核对。输入为稳定窗口平均到达率和平均停留时间；输出平均在途请求。示例数值不是任何服务实测。

```python
arrival_rate_per_second = 4.0
average_time_in_system_seconds = 2.5
average_in_flight = arrival_rate_per_second * average_time_in_system_seconds
print(average_in_flight)  # illustrative result: 10.0
```

若观测显示平均在途远离 10，应检查窗口是否稳定、是否漏掉取消/超时、到达率是否用完成率代替，以及 queue time 是否包含。Little’s Law 不告诉你下一台 GPU 能提升多少，只帮助发现测量口径矛盾。



## 把结论限制在证据范围内

容量结论必须附模型 revision、引擎、硬件、精度、上下文、并发、采样时间和负载生成器限制。本章不生成虚构性能表，也不将云厂商标称值当生产容量。

容量与成本可衡量后，还要确保平台不会用高效方式泄露数据或执行危险动作。下一篇沿不可信输入穿过网关、RAG、Agent 和模型建立安全边界。
