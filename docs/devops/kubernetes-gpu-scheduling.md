---
title: Kubernetes GPU 调度、共享、MIG 与自动扩缩容
description: 从资源请求进入设备发现、标签、污点、亲和性、拓扑、共享、MIG、队列和扩缩容信号。
category: devops
part: 第五部分：Kubernetes AI Infra
chapter: 24
tags:
  - Kubernetes
  - GPU Scheduling
  - MIG
prerequisites:
  - 理解 Kubernetes 核心对象和 GPU 显存
outcomes:
  - 设计 GPU Workload 放置策略
  - 选择能反映推理压力的扩缩容信号
practice:
  type: decision
  result: 完成一张 GPU 调度决策表
  verify:
    - 设备数量和显存边界不混淆
    - 未在真实集群验证的结论被标记
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# Kubernetes GPU 调度、共享、MIG 与自动扩缩容

两个各申请一张 GPU 的 Pod 被放到同一节点，单看资源数量完全合法；但它们需要跨 GPU 高频通信，而该节点两张卡只通过较慢路径连接。另一个 10 GB 模型任务因为资源名只表达“一张卡”，被调度到显存不足的设备。GPU 调度不能只数卡，还要把型号、显存、拓扑和共享模式变成可验证约束。


<InfraFigure src="/images/ai-infra/kubernetes-gpu-scheduling/hero.png" alt="Kubernetes 调度器根据 GPU 型号、MIG、拓扑与队列把工作负载放到节点的插画"
  icon="scheduler" caption="调度器分配声明的资源；显存、拓扑和共享策略需要额外的设备与平台语义。" />


## Kubernetes 默认 GPU 资源为什么不够表达推理需求

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Device Allocation | 默认扩展资源通常以整数独占分配设备，不允许 CPU 式小数 request。 |
| MIG | 部分 NVIDIA GPU 可划分为具有独立计算与显存资源的硬件实例，profile 决定能力。 |
| Time Slicing | 多个工作负载时间共享设备，增加并发可用性，但通常不提供硬件级显存隔离。 |
| Topology | GPU 之间以及 GPU 到 CPU/NIC 的连接关系，会影响多卡通信和数据路径。 |
| Autoscaling Signal | 触发扩缩容的观测量；CPU 利用率往往不能反映模型队列与首 Token 压力。 |

## 排障时最容易走错的岔路

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 申请 1 GPU | 没有表达型号、显存或互联要求 | 增加经治理的节点标签与准入规则 |
| 共享后利用率提高 | 邻居干扰、显存 OOM 和尾延迟可能恶化 | 按租户与工作负载测隔离 |
| 副本增加 | 模型加载慢或没有空闲 GPU，Ready 容量未增加 | 看 Pending 与 Ready 而非 desired replicas |
| 队列有任务 | 可能任务需求永远无节点满足 | 暴露不可调度原因和最大等待时间 |

::: warning 不要用重启代替诊断
恢复服务和解释故障是两个目标。紧急止损后仍要回到原始日志、指标与状态转换，避免同类问题重复出现。
:::

## 一次 GPU Workload 放置要通过哪些过滤

```mermaid
flowchart LR
  S0["表达需求"]
  S1["过滤节点"]
  S2["分配设备"]
  S3["运行扩缩"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

### 1. Workload Spec 怎样完成表达需求

声明设备数量、型号/显存标签、MIG profile、亲和性和优先级。

这一动作的可观察结果是 requests、node affinity、tolerations。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 2. 过滤节点：Scheduler 持有当前状态

排除资源不足、污点不容忍和拓扑不满足的节点。

可以从这些位置确认结果：FailedScheduling reason。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 分配设备发生时，先看 Kubelet/Device Plugin

选择具体 GPU 或 MIG 实例并注入容器。

这里不靠猜测，优先读取 allocation、device IDs、plugin logs。

### 从 运行扩缩 留下的证据回到 Queue/Autoscaler

根据等待工作、TTFT 与容量目标增加副本或节点。

决定下一步前需要看到 queue age、ready capacity、scale events。

## 用决策表而不是一份万能 YAML 选择共享方式

以下为机制决策推演，实际能力取决于 GPU 型号、Device Plugin 和集群配置。

```text
strict memory + failure isolation -> dedicated GPU or suitable MIG profile
bursty low-duty development jobs  -> consider time slicing with quotas
tensor parallel serving           -> require compatible GPU topology
batch training waiting for cards  -> queue + priority + gang scheduling
online inference autoscaling      -> queue/TTFT/readiness, not CPU alone
```

MIG profile 是明确资源单元，time slicing 多数情况下只是调度共享；两者不能混为“切显存”。多卡任务若不能同时获得全部设备，可能长期占住部分资源或启动失败，需要 gang/queue 语义。扩容新节点还包含驱动、镜像和模型加载时间，不能等 SLO 已经违约才触发。



## 最后回到适用范围

标签必须由可信节点发现和平台策略维护，不能让普通租户伪造。MIG、time slicing、MPS 等具体支持随硬件和插件版本变化；本章只讲决策语义，没有真实集群或性能实测。

计算资源被集群正确安排后，平台层还要把多个模型和供应商统一成稳定入口。下一阶段从 LLM Gateway 的身份、路由、限流、用量与错误契约开始。
