---
title: DeepSpeed ZeRO：状态分片、Offload 与显存边界
description: 拆开参数、梯度和 Optimizer State，逐级解释 ZeRO-1、2、3、通信、CPU/NVMe Offload 和恢复。
category: devops
part: 第七部分：分布式训练基础设施
chapter: 33
tags:
  - DeepSpeed
  - ZeRO
  - Offload
prerequisites:
  - 理解数据并行和训练显存
outcomes:
  - 推演 ZeRO 各阶段的状态所有权
  - 判断 Offload 的容量收益和带宽代价
practice:
  type: walkthrough
  result: 完成一张 ZeRO 状态分片表
  verify:
    - 状态分布和通信阶段一致
    - DeepSpeed 不被描述为消除通信成本
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# DeepSpeed ZeRO：状态分片、Offload 与显存边界

开启 ZeRO-3 后每张卡显存显著下降，训练却周期性停顿，检查点保存也比预期慢。参数不再常驻每个 rank，需要在层计算前 AllGather；同时 CPU Offload 让 PCIe 和主机内存成为新瓶颈。ZeRO 不是“免费显存”，而是用状态分片与数据移动换容量。


<InfraFigure src="/images/ai-infra/deepspeed-zero-infrastructure/hero.png" alt="DeepSpeed ZeRO 将优化器状态、梯度与参数分片到多个 Rank 的插画"
  icon="shards" caption="ZeRO 逐级消除数据并行中的状态复制，但每一次取回状态都需要通信或 Offload 带宽。" />


## 参数、梯度和优化器状态为什么占用不同份额

先把术语放回系统位置。只记名字，遇到故障时仍然不知道应该去哪个进程或存储找证据。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Parameters | 模型可训练权重；混合精度训练可能同时保留低精度计算副本和 FP32 master weights。 |
| Gradients | 反向传播产生的参数更新方向，大小通常与可训练参数相关。 |
| Optimizer State | Adam 等优化器为每个参数维护一阶、二阶矩等状态，常比权重本身占更多字节。 |
| ZeRO-1/2/3 | 依次分片优化器状态、再分片梯度、再分片参数，级别越高通信和生命周期管理越复杂。 |
| Offload | 把部分状态移到 CPU 或 NVMe，释放 GPU 显存但增加 PCIe、内存或存储访问。 |

::: tip 判断原则
定义一个组件时，同时说清它不负责什么。能回答输入从哪里来、状态存在哪里、输出交给谁，才算理解。
:::

## ZeRO-3 的一层参数怎样被取回又释放

```mermaid
flowchart LR
  S0["持有分片"]
  S1["聚合计算"]
  S2["归约梯度"]
  S3["更新释放"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 1. 持有分片：Each Rank 持有当前状态

每个 rank 常驻自己负责的参数、梯度与优化器分片。

可以从这些位置确认结果：partition map、resident bytes。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 聚合计算发生时，先看 Process Group

层执行前 AllGather 所需参数，形成短期完整计算视图。

这里不靠猜测，优先读取 allgather bytes、prefetch、peak memory。

### 从 归约梯度 留下的证据回到 Collective

反向后 ReduceScatter 梯度到所有者 rank。

决定下一步前需要看到 reduce-scatter time、overlap。

### 4. Optimizer/Runtime 怎样完成更新释放

本地更新状态，释放非所有者参数并按 manifest 保存分片。

这一动作的可观察结果是 optimizer step、checkpoint shards。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 用状态表理解 ZeRO 级别，而不是背配置项

表格描述概念所有权，实际内存还包含激活、通信 bucket、碎片和临时聚合。

```text
stage 0: parameters replicated, gradients replicated, optimizer replicated
stage 1: parameters replicated, gradients replicated, optimizer sharded
stage 2: parameters replicated, gradients sharded,   optimizer sharded
stage 3: parameters sharded,   gradients sharded,   optimizer sharded
```

“sharded”不表示计算时永远只需要分片；ZeRO-3 会按层临时聚合参数，所以峰值取决于最大层、预取和 bucket。若 world size 或分片布局变化，检查点恢复可能需要转换或完整权重聚合，必须预先演练。

## 看起来相似，故障边界却不同

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 显存降低 | 通信和主机内存可能成为瓶颈 | 看 AllGather/ReduceScatter 与 offload I/O |
| 开启 Offload | CPU RAM、NUMA、PCIe 或 NVMe 队列可能不足 | 建立主机侧容量和带宽账本 |
| checkpoint 文件齐全 | 缺 manifest、版本或某 rank 分片仍不可恢复 | 隔离环境执行恢复 |
| 增加 bucket | 可能提高带宽利用也可能抬高峰值显存 | 在目标模型和拓扑验证 |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

DeepSpeed 配置项和默认行为随版本变化，必须对照目标版本官方文档。ZeRO 解决复制状态，不消除激活、通信和检查点成本。本章未进行真实训练性能测试。

ZeRO 的核心操作依赖 Collective。下一篇沿一次梯度 AllReduce 进入 NCCL、Rank、Communicator、Ring/Tree 和多机网络故障。
