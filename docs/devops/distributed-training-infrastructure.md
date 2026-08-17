---
title: 分布式训练：Data、Tensor、Pipeline Parallel、DDP 与 FSDP
description: 从单卡放不下和训练过慢出发，比较数据、参数和流水线并行的状态分布、通信和检查点。
category: devops
part: 第七部分：分布式训练基础设施
chapter: 32
tags:
  - Distributed Training
  - DDP
  - FSDP
prerequisites:
  - 理解 GPU、显存和网络
outcomes:
  - 区分常见并行策略
  - 识别计算、通信、存储和恢复需求
practice:
  type: decision
  result: 设计一张两节点训练拓扑
  verify:
    - 策略选择能回到瓶颈
    - 不提供未经实测的训练吞吐
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# 分布式训练：Data、Tensor、Pipeline Parallel、DDP 与 FSDP

单卡装不下模型，于是把训练进程扩到八张 GPU；显存问题缓解了，step time 却更长。原因是选择了与瓶颈不匹配的并行方式：数据并行复制整份模型，不能解决参数本身放不下；张量并行虽分片计算，却把高频通信放到了较慢的跨节点网络。


<InfraFigure src="/images/ai-infra/distributed-training-infrastructure/hero.png" alt="训练数据、模型参数和流水线阶段分布到多张 GPU 的插画"
  icon="training" caption="并行策略决定参数、梯度、激活和优化器状态分别存在哪里，以及何时通信。" />


## 不同并行策略到底拆分了哪一种状态

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Data Parallel | 每个 rank 处理不同数据并持有模型副本，反向后同步梯度。DDP 是常见实现。 |
| Tensor Parallel | 把单层矩阵等张量计算切到多个 rank，层内高频通信，对拓扑敏感。 |
| Pipeline Parallel | 把不同层放到不同阶段，用 micro-batch 填充流水线，会产生 bubble 与阶段负载平衡问题。 |
| FSDP | 在数据并行组内分片参数、梯度和优化器状态，并在需要计算时聚合相应参数。 |
| Checkpoint | 足以恢复模型、优化器、调度器、随机状态和数据进度的一致快照，不只是权重文件。 |

## 排障时最容易走错的岔路

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| GPU 数增加 | 通信、数据读取和慢 rank 会限制扩展效率 | 拆开 compute、collective、input 时间 |
| 显存下降 | 可能换来更频繁的参数聚合或 CPU offload | 测 step time 与带宽 |
| loss 一致 | 数据采样、随机状态或梯度缩放仍可能不同 | 固定种子并核对全局 batch |
| 保存了权重 | 优化器和 sampler 缺失时不能等价续训 | 演练从 checkpoint 恢复 |

::: warning 不要用重启代替诊断
恢复服务和解释故障是两个目标。紧急止损后仍要回到原始日志、指标与状态转换，避免同类问题重复出现。
:::

## 一次训练 step 中计算与通信如何交错

```mermaid
flowchart LR
  S0["取数前向"]
  S1["反向求梯度"]
  S2["同步状态"]
  S3["更新与保存"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

### 1. Data/Ranks 怎样完成取数前向

各 rank 读取不重复或按策略采样的数据，执行本地前向并保存激活。

这一动作的可观察结果是 sampler state、forward time、activation memory。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 2. 反向求梯度：Autograd 持有当前状态

从 loss 反向计算梯度，可能触发分片参数聚合。

可以从这些位置确认结果：backward spans、memory peak。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 同步状态发生时，先看 Collective Backend

按策略执行 AllReduce、AllGather 或 ReduceScatter。

这里不靠猜测，优先读取 collective duration、bytes、straggler。

### 从 更新与保存 留下的证据回到 Optimizer/Checkpoint

更新一致参数并在安全 step 写入可恢复快照。

决定下一步前需要看到 global_step、optimizer state、manifest。

## 先从瓶颈选择策略，而不是从框架名称开始

决策表是机制推演。目标硬件、模型和网络未实测，不能把它当成配置推荐。

```text
model fits, need more samples/sec -> DDP candidate
model states do not fit          -> FSDP/ZeRO candidate
single layer compute too large   -> tensor parallel candidate
many layers across devices       -> pipeline parallel candidate
cross-node network is slow       -> keep high-frequency TP within node when possible
```

实际系统常组合策略，例如节点内 Tensor Parallel、节点间 Data Parallel。组合后 world size、进程组、检查点和容错更复杂。选择前要建立显存组成、每 step 通信量、拓扑和恢复时间目标，不能只比较“支持多少卡”。



## 最后回到适用范围

通信量公式和扩展效率必须结合实现版本、拓扑、dtype 与 overlap 行为。这里没有真实多机训练实验，也不提供未经测量的吞吐。

分布式训练的状态分布明确后，下一篇深入 DeepSpeed ZeRO，逐级看优化器、梯度和参数怎样被分片，以及 Offload 把压力转移到哪里。
