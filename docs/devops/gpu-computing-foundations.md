---
title: GPU 基础：是什么、怎么工作，以及 AI 为什么使用它
description: 先定义 GPU、主机与设备的数据路径，再用矩阵乘解释并行执行、显存、带宽和 AI 工作负载取舍。
category: devops
part: 第四部分：GPU 基础
chapter: 19
tags:
  - GPU
  - Parallel Computing
prerequisites:
  - 了解 CPU 与内存基础
outcomes:
  - 解释 GPU 适合深度学习的原因
  - 判断任务是否值得迁移到 GPU
practice:
  type: decision
  result: 完成一张 CPU 与 GPU 工作负载比较表
  verify:
    - 并行度、数据搬运和批量都被考虑
    - 不会把所有计算都归为 GPU 更快
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# GPU 基础：是什么、怎么工作，以及 AI 为什么使用它

把一个只处理单条短文本的小函数搬到 GPU 后，延迟反而上升。Kernel 本身很快，但输入先从主机内存复制到显存，启动 Kernel，再把结果复制回来；数据搬运和调度开销超过了计算。GPU 不是“更快的 CPU”，它依赖足够并行、足够规则、足够大的工作量来摊薄固定成本。


<InfraFigure src="/images/ai-infra/gpu-computing-foundations/hero.png" alt="CPU 控制流与 GPU 大规模并行计算单元处理矩阵数据的对比插画"
  icon="gpu" caption="GPU 用大量并行执行资源换取规则计算的吞吐，CPU 更擅长低延迟控制与复杂分支。" />


## 用计算量与搬运量判断任务是否值得迁移

下面是决策表而非基准结果。输入是任务特征；输出是应优先验证的瓶颈。真实结论必须在目标硬件上测量。

```text
small + branch-heavy + latency-sensitive -> CPU/control path first
large dense matrix + reusable device data -> GPU candidate
large bytes + few operations             -> memory-bandwidth bound
many tiny kernels                        -> launch/synchronization bound
CPU preprocessing slower than GPU        -> pipeline bottleneck
```

模型推理适合 GPU，因为线性层、注意力等包含大规模矩阵运算，且权重可长驻显存。但分词、JSON、权限判断和许多调度仍适合 CPU。优化时要测整条 pipeline，GPU kernel 快不代表用户看到的 TTFT 就低。

## CPU 和 GPU 的硬件取舍有什么不同

理解下面这些词时，要同时回答输入、状态和输出分别在哪里。它们不是可以互换的产品标签。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| CPU | 少量强大核心配合大缓存和复杂控制，擅长低延迟、分支、操作系统和串行协调。 |
| GPU | 大量并行执行单元配合高带宽设备内存，擅长对大量数据执行相似运算。 |
| Throughput | 单位时间完成的工作总量；提高吞吐不保证单个请求延迟同步下降。 |
| Arithmetic Intensity | 每搬运一个字节执行多少计算。计算密度低的任务更容易受内存带宽限制。 |

::: tip 判断原则
遇到新术语，先问它改变了哪份状态；如果没有状态所有者，这个名词暂时不能指导排障。
:::

## 一次矩阵计算为何要先经过数据路径

```mermaid
flowchart LR
  S0["准备数据"]
  S1["搬到设备"]
  S2["执行 Kernel"]
  S3["返回同步"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

图里每个节点都要产生可观察结果；没有结果时，上一节点是否真正交付就是第一项检查。

### 从 准备数据 留下的证据回到 CPU/Host Memory

解析输入、分配连续张量并选择 dtype 与布局。

决定下一步前需要看到 shape、strides、host allocation。

### 2. PCIe/NVLink DMA 怎样完成搬到设备

把必要字节传入设备内存，可与计算重叠但不能凭空消失。

这一动作的可观察结果是 H2D bytes、copy duration。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 3. 执行 Kernel：GPU SM 持有当前状态

把大量同构线程映射到执行资源，读取数据并累加结果。

可以从这些位置确认结果：kernel duration、occupancy、bandwidth。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 返回同步发生时，先看 Runtime/CPU

等待依赖完成，复制或消费结果并处理错误。

这里不靠猜测，优先读取 D2H bytes、synchronization、error status。

## 同一个症状，下一步证据可能完全不同

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| GPU util 低 | 批次小、CPU 喂不饱、频繁同步或等待 I/O | 看时间线和数据搬运，不先加卡 |
| Kernel 很快 | 端到端被 H2D、排队或后处理主导 | 比较 kernel 与全请求耗时 |
| 显存还有空间 | 计算单元、带宽或调度仍可能饱和 | 同时观察吞吐与延迟 |
| 批次越大越好 | 吞吐可能增加但排队、显存和尾延迟恶化 | 按 SLO 和请求分布选批次 |

::: warning 结论的边界
示例输出用于建立判断路径，不应被当成目标环境的真实结果。版本、硬件和请求形状变化后要重新验证。
:::



## 哪些结论还需要真实环境验证

FLOPS 是理论计算能力指标，不能直接换算业务吞吐。Tensor Core、精度支持、带宽和软件栈都会改变结果。本章不声称在真实 GPU 上完成性能实验。

GPU 的宏观取舍明确后，下一篇进入 CUDA 执行模型，跟随一次 Kernel launch 看 Thread、Block、Grid、Warp 和 SM 如何对应。
