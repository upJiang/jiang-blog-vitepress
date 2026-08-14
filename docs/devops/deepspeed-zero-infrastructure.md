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
updated: 2026-08-11T00:00:00.000Z
---
# DeepSpeed ZeRO：状态分片、Offload 与显存边界

DeepSpeed ZeRO 是在数据并行训练中分片 Optimizer State、梯度和参数的显存优化方案，Offload 还能把部分状态移到 CPU 内存或存储。它位于训练框架的状态管理与 GPU 显存之间，用通信和数据搬运换取更大的可训练模型，不等于压缩模型权重。

数据并行的每张 GPU 都保存完整参数、梯度和 Optimizer State。模型越大，重复状态越快耗尽显存。ZeRO 的核心不是压缩这些状态，而是让不同 Data Parallel Rank 只拥有其中一部分，并在计算需要时通信。

理解 ZeRO 要追踪三类状态在哪里、何时收集、何时归约、如何更新和怎样写检查点。Stage 数字越高，分片越彻底，通信、调度和恢复也越复杂。

## ZeRO 在分布式训练中的位置

ZeRO（Zero Redundancy Optimizer）是 DeepSpeed 在数据并行训练中管理参数、梯度和 Optimizer State 的分片策略。它位于训练框架的状态管理和通信层，不是新的优化器，也不会替模型选择学习率。每个 Rank 仍处理自己的数据，只是把重复保存的状态分摊出去，并在计算阶段临时收集需要的部分。

理解 ZeRO 时要把“谁拥有状态”和“什么时候需要完整状态”分开。Stage 1、2、3 是同一条训练路径逐步增加分片范围，不是三个互不相干的产品名。

## 三类主要状态

参数参与前向和反向；梯度由反向产生；Optimizer State 例如 Adam 的一阶、二阶矩与 Master Weight 用于更新。混合精度下，Optimizer State 往往比低精度参数占用更多字节。

传统 Data Parallel 每 Rank 持有完整三类状态。ZeRO 在 Data Parallel Group 内切分所有权，同时保持逻辑上等价的训练更新。

## ZeRO 三个阶段

| Stage | 分片内容 | 主要通信变化 | 容量特点 |
| --- | --- | --- | --- |
| 1 | Optimizer State | 更新时分布式处理 | 参数与梯度仍重复 |
| 2 | Optimizer State + Gradient | ReduceScatter 等 | 进一步减少梯度重复 |
| 3 | Optimizer + Gradient + Parameter | 计算前按需 AllGather 参数 | 常驻状态最少，通信最复杂 |

Stage 1 每个 Rank 更新自己拥有的 Optimizer 分片，再让参数保持一致。Stage 2 进一步让梯度归约后只保留目标分片。Stage 3 连参数也分片，模块执行前收集需要的参数，完成后释放或重新分片。

把一个 Step 展开后，状态变化更容易核对：

| 阶段 | ZeRO-1 | ZeRO-2 | ZeRO-3 |
| --- | --- | --- | --- |
| 前向 | 完整参数 | 完整参数 | AllGather 当前模块参数，计算后可重新分片 |
| 反向 | 完整梯度 | ReduceScatter 后保留梯度分片 | 按模块收集参数并产生梯度分片 |
| 更新 | 只更新本 Rank 的 Optimizer 分片 | 更新 Optimizer 与梯度分片 | 更新三类分片状态 |
| Checkpoint | 可能需要聚合参数 | 可保存分片状态 | 记录参数、梯度、优化器分片与布局 |

表格描述的是逻辑过程，具体通信由 DeepSpeed 配置、Bucket 和并行组决定。做容量推演时，逐行写出“常驻什么、临时收集什么、何时释放”，比只记住 Stage 数字更可靠。

## 通信没有消失

状态分片减少显存重复，却需要 Collective 让每个 Rank 获得当前计算所需数据。通信能否与前向/反向重叠、Bucket 多大、模块粒度如何，都会影响吞吐和峰值内存。

小 Bucket 产生更多启动开销，大 Bucket 提高峰值内存；预取太积极可能抵消节省，太保守又让计算等待。配置需要以模型结构、互联和实际 Trace 为依据。

## Offload 把压力转移到哪里

ZeRO-Offload 可以把 Optimizer、参数或相关状态放到 CPU 主存，进一步降低 GPU 显存。NVMe Offload 使用更大但更慢的存储。容量得到扩展，代价是 PCIe、主存、磁盘带宽和 CPU 计算。

若搬运无法与 GPU 计算重叠，GPU 会等待。Pinned Memory 提高传输能力也占用主存资源。Offload 方案必须同时规划 CPU 核、主存、NUMA、PCIe 与 NVMe，而不是只看 GPU OOM 是否消失。

## 初始化与模型构建

超大模型在 Python 构造阶段就可能先在单 Rank 创建完整参数，再来不及分片。ZeRO-3 等方案提供分片初始化路径，模型构建代码和权重加载方式要配合。自定义模块若在普通属性里保留完整 Tensor，也可能绕过分片。

参数共享、动态访问和外部权重使用需要确认框架支持。模型能完成一个 Step 不代表所有保存、评估和生成路径都安全。

## Checkpoint 与恢复

每 Rank 保存分片能避免在单 GPU 聚合完整状态，但恢复必须知道 World Size、分片布局、版本和训练进度。转换为完整权重用于推理是独立操作，可能需要 CPU/磁盘空间。

Checkpoint 先写候选目录与 Manifest，核对所有 Rank 分片和校验和后再标记完成。失败的半成品不进入最新恢复指针。恢复后要验证 Step、Optimizer、随机数和数据采样，而不只检查权重可读。

## 怎样选择 Stage

若模型能放单卡且瓶颈是计算，普通 DDP 可能更简单；Optimizer State 是主要压力时先考虑 Stage 1；梯度也成为问题时评估 Stage 2；参数无法常驻时才需要 Stage 3 或其他模型并行。Stage 选择还要结合 TP/PP 和硬件拓扑。

当前没有 DeepSpeed 集群，无法提供吞吐或显存节省实测。有效的推演应列出每个 Rank 在前向、反向、更新和 Checkpoint 阶段拥有的状态，以及对应 Collective 与存储路径。只有状态所有权与通信能够对上，配置才有可解释性。
