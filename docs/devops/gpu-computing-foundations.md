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

**GPU** 的全称是 Graphics Processing Unit，中文通常叫图形处理器。它最初为大量像素和顶点执行相似计算，后来逐步成为通用并行计算设备。GPU 内部有大量执行资源，适合把同一种运算同时应用到许多数据上；操作系统调度、复杂分支和单线程低延迟任务通常仍由 CPU 负责。

## GPU 与 CPU 的硬件取舍

GPU 和 CPU 都能执行程序，硬件资源的分配方向不同。CPU 把更多晶体管用于复杂控制、大缓存、分支预测和少量强核心，目标是尽快完成一条不规则任务；GPU 用更多执行单元和更高的设备内存带宽处理规则、可并行的数据，目标是在同一时间完成更多相似运算。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| CPU | 少量强大核心配合大缓存和复杂控制，负责操作系统、串行协调、分支密集逻辑和低延迟任务。 |
| GPU | 大量并行执行单元配合高带宽设备内存，对许多数据执行相似运算。 |
| Throughput | 单位时间完成的工作总量；吞吐增加不代表单个请求延迟一定下降。 |
| Arithmetic Intensity | 每搬运一个字节执行多少计算。计算密度低的任务更容易受内存带宽限制。 |

程序通常由 CPU 发起：准备输入，分配 GPU 内存，把数据复制到设备，启动 Kernel，等待或异步接收结果。GPU 并不是脱离 CPU 独立工作的“更快处理器”，它是整条计算链中的并行执行设备。

## AI 为什么使用 GPU

神经网络训练和推理包含大量矩阵乘法。矩阵里的许多乘加可以并行执行，模型权重还可以在多个请求之间长驻显存，正好能利用 GPU 的执行单元和内存带宽。训练反向传播、推理中的线性层和注意力计算都具有这种特征。

分词、JSON 解析、权限判断、网络调度和复杂业务分支依然更适合 CPU。一个 AI 服务常见的结构是 CPU 负责请求控制和数据准备，GPU 负责张量计算，最后由 CPU 组织响应。只测 GPU Kernel 会漏掉排队、数据搬运和后处理。

## 用计算量与搬运量判断任务是否值得放到 GPU

把一个只处理单条短文本的小函数搬到 GPU 后，延迟可能反而上升。Kernel 本身很快，输入却要先从主机内存复制到显存，再启动 Kernel 并同步结果；数据搬运和调度开销可能超过实际计算。

下面是决策表而非基准结果。输入是任务特征；输出是应优先验证的瓶颈。真实结论必须在目标硬件上测量。

```text
small + branch-heavy + latency-sensitive -> CPU/control path first
large dense matrix + reusable device data -> GPU candidate
large bytes + few operations             -> memory-bandwidth bound
many tiny kernels                        -> launch/synchronization bound
CPU preprocessing slower than GPU        -> pipeline bottleneck
```

优化时要测完整 Pipeline。GPU Kernel 快，不代表用户看到的首 Token 延迟就低；批次、输入长度、排队和 CPU 预处理都可能决定最终结果。

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

### 准备数据：CPU/Host Memory

解析输入、分配连续张量并选择 dtype 与布局。

决定下一步前需要看到 shape、strides、host allocation。

### 搬到设备：PCIe/NVLink DMA

把必要字节传入设备内存，可与计算重叠但不能凭空消失。

这一动作的可观察结果是 H2D bytes、copy duration。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 执行 Kernel：GPU SM

把大量同构线程映射到执行资源，读取数据并累加结果。

可以从这些位置确认结果：kernel duration、occupancy、bandwidth。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 返回同步：Runtime/CPU

等待依赖完成，复制或消费结果并处理错误。

这里不靠猜测，优先读取 D2H bytes、synchronization、error status。

## GPU 利用率不能直接解释性能

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
