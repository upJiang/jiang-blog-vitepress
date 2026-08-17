---
title: CUDA 执行模型：Thread、Block、Grid、Warp 与 SM
description: 沿一次 Kernel Launch 解释 Host/Device、线程层级、Warp 调度、SM 资源、同步和内存访问。
category: devops
part: 第四部分：GPU 基础
chapter: 20
tags:
  - CUDA
  - Kernel
  - SM
prerequisites:
  - 理解 GPU 并行计算
outcomes:
  - 推演 CUDA Kernel 的执行层级
  - 识别分支和访存对利用率的影响
practice:
  type: walkthrough
  result: 完成一张 CUDA 执行映射图
  verify:
    - 层级关系和资源所有者明确
    - 未使用真实 GPU 的内容标为机制推演
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# CUDA 执行模型：Thread、Block、Grid、Warp 与 SM

一个向量加法 Kernel 在数据量变大后没有继续加速。代码创建了很多 Thread，但每个 Block 使用过多寄存器，导致一个 SM 同时驻留的 Block 变少；分支又让同一 Warp 内线程走不同路径。线程数量只是工作描述，硬件能否并行执行还受 SM 资源和访存方式约束。


<InfraFigure src="/images/ai-infra/cuda-programming-model/hero.png" alt="CUDA Grid 中的 Block 和 Thread 被调度到多个 SM 与 Warp 的插画"
  icon="grid" caption="Grid 描述工作，SM 承载 Block，Warp 是实际调度的一组线程。" />


## Thread、Block、Grid、Warp 与 SM 如何对应

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Thread | CUDA 程序里的最小逻辑工作项，拥有索引和私有寄存器视图；不等于一个独立 CPU 核心。 |
| Block | 可在同一 SM 上协作的一组 Thread，可共享 shared memory 并进行 block 内同步。 |
| Grid | 一次 Kernel launch 创建的全部 Block，描述整个并行工作域。 |
| Warp | 硬件调度的一组相邻线程，NVIDIA 常见为 32；分支不同会分批执行路径。 |
| SM | GPU 上执行 Warp 的多处理器，拥有有限寄存器、shared memory 和调度槽位。 |

## 排障时最容易走错的岔路

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 线程很多 | SM 资源限制让它们分批执行，不会全部同时运行 | 看 Block 资源与驻留数量 |
| occupancy 高 | 访存不合并或计算依赖仍可能慢 | 结合 stall reason 与带宽 |
| Kernel launch 没报错 | 异步错误可能在同步或后续 API 才出现 | 检查 launch error 并在诊断时同步 |
| if 很少 | Warp 内不同线程走不同分支仍会串行化路径 | 分析分支与线程索引相关性 |

::: warning 不要用重启代替诊断
恢复服务和解释故障是两个目标。紧急止损后仍要回到原始日志、指标与状态转换，避免同类问题重复出现。
:::

## 一次 Kernel launch 怎样落到硬件资源

```mermaid
flowchart LR
  S0["配置启动"]
  S1["放置 Block"]
  S2["调度 Warp"]
  S3["完成同步"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

### 1. Host CUDA Runtime 怎样完成配置启动

指定 gridDim、blockDim、stream 和参数并提交 Kernel。

这一动作的可观察结果是 launch config、runtime error。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 2. 放置 Block：GPU Scheduler 持有当前状态

按寄存器、shared memory 与线程上限把 Block 分配到 SM。

可以从这些位置确认结果：resident blocks、resource limit。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 调度 Warp发生时，先看 SM Warp Scheduler

选择就绪 Warp 发射指令，等待内存时切换其他 Warp。

这里不靠猜测，优先读取 eligible warps、stall reason。

### 从 完成同步 留下的证据回到 Stream/Host

Kernel 按依赖完成，错误可能在之后同步点才暴露。

决定下一步前需要看到 event、synchronize result、last error。

## 从线程索引读懂最小 Kernel

CUDA C++ 示例展示一维映射，需 NVIDIA CUDA Toolkit 和真实 GPU 才能编译运行；这里仅解释语义，不报告运行结果。输入为两个长度 n 的 float 数组，输出为逐元素和。

```cpp
__global__ void add(const float* a, const float* b, float* out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) out[i] = a[i] + b[i];
}

int threads = 256;
int blocks = (n + threads - 1) / threads;
add<<<blocks, threads>>>(a, b, out, n);
```

`threadIdx.x` 是 Block 内索引，`blockIdx.x * blockDim.x` 给出 Block 在全局数组中的起点，边界判断保护最后不足一整 Block 的元素。连续线程访问连续 float 有利于合并访存。256 并非通用最优值；寄存器、shared memory 和具体架构会改变 occupancy。



## 最后回到适用范围

Block 只能在单个 SM 上执行，普通 block 同步不能跨 Grid。不同 GPU 架构的 SM 资源和调度细节不同，代码正确性与性能结论要分开。

CUDA 描述了工作怎样执行，实际部署还需要驱动、Runtime、设备内存和诊断工具共同工作。下一篇建立显存账本并读懂 nvidia-smi 的边界。
