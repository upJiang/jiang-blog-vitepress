---
title: 模型制品、精度、量化与推理优化
description: 讲清 Config、Tokenizer、Safetensors、FP32、FP16、BF16、INT8、INT4、量化校准和性能验证。
category: devops
part: 第三部分：LLM Serving
chapter: 18
tags:
  - Model Artifact
  - Precision
  - Quantization
prerequisites:
  - 理解模型部署与 GPU 显存
outcomes:
  - 估算权重与运行显存
  - 判断量化收益和质量风险
practice:
  type: decision
  result: 制作一份模型制品与精度清单
  verify:
    - 权重和 Tokenizer Revision 匹配
    - 性能与质量使用同一候选版本验证
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# 模型制品、精度、量化与推理优化

一个 7B 模型按 4 bit 粗算只要约 3.5 GB，部署到 8 GB GPU 仍然 OOM。粗算只包含权重有效位数，没有包括量化 scale/zero point、KV Cache、激活、工作区和框架开销；更重要的是，文件标为 INT4 不代表当前 GPU 和引擎会用高效 INT4 Kernel 执行。



## 从模型文件到实际显存不能只乘一个位数

```mermaid
flowchart LR
  S0["核对制品"]
  S1["估算权重"]
  S2["估算运行态"]
  S3["对比候选"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

先看完整路径，再进入局部配置。这样即使组件名字变化，也能知道失败发生在交接之前还是之后。

### 核对制品：Artifact Pipeline

确认 config、Tokenizer、权重格式、量化配置和 revision 匹配。

这里不靠猜测，优先读取 manifest、tensor dtype、quant config。

### 估算权重：Capacity Planner

参数量乘以每参数存储并加入分组元数据、未量化层与分片缓冲。

决定下一步前需要看到 文件大小、理论 bytes、加载峰值。

### 估算运行态：Serving/GPU

加入 KV Cache、激活、workspace、通信与碎片预算。

这一动作的可观察结果是 VRAM ledger、max context、concurrency。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

### 对比候选：Evaluation

在相同模型版本、输入集和终止参数上比较质量、延迟与成本。

可以从这些位置确认结果：task metrics、TTFT/TPOT、error cases。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

## 精度名称到底描述了什么

这里先暂停操作，把容易混用的概念拆开。定义的价值在于划清责任，而不是增加名词数量。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| FP32/FP16/BF16 | 浮点格式拥有不同指数与尾数范围。BF16 动态范围接近 FP32但精度较低，是否更快取决于硬件与内核。 |
| INT8/INT4 | 用较少整数位表示量化值，配合 scale 等元数据近似原浮点权重或激活。 |
| Weight-only Quantization | 主要压缩权重，激活和部分计算仍用浮点；对 KV Cache 占用未必有同等收益。 |
| Calibration | 用代表性数据确定量化范围或参数。校准分布偏离真实输入会放大质量损失。 |

::: tip 判断原则
不要从产品名推断能力。把可观察输入、持久状态、失败终态和下游交接点写出来。
:::

## 文件完整不等于制品可加载

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 模型文件更小 | 加载时可能转码或创建更大运行表示 | 比较加载前后 tensor dtype 与显存 |
| 量化后更快 | 内核不支持或批次太小可能没有收益 | 在目标硬件和请求分布实测 |
| 平均质量接近 | 关键长尾、结构化输出或特定语言可能退化 | 保留领域回归集和失败样本 |
| 权重能放下 | KV Cache 与工作区仍会使并发请求 OOM | 把上下文与并发纳入账本 |

::: warning 先保留现场
如果先重启、扩容或删除对象，最早失败可能被覆盖。先确认对象身份、版本和时间线，再决定处理动作。
:::

## 先做透明的下界估算，再保留未知预算

下面的 Python 只估算原始权重下界。输入为参数量和每参数位数，输出为十进制 GB 与二进制 GiB；它刻意不声称等于实际显存。

```python
def weight_lower_bound(parameters: int, bits: int) -> tuple[float, float]:
    raw_bytes = parameters * bits / 8
    return raw_bytes / 1e9, raw_bytes / (1024 ** 3)

gb, gib = weight_lower_bound(7_000_000_000, 4)
print(f"raw lower bound: {gb:.2f} GB / {gib:.2f} GiB")
```

预期输出约为 3.50 GB / 3.26 GiB，只是数学下界。实际要读取量化格式的 group size、scale、zero point、未量化 embedding/head、加载临时副本和 Serving 预算。若引擎不支持该格式，可能反量化到更高精度，显存与速度都会不同。



## 把结论限制在证据范围内

不能只用通用榜单决定量化方案。精度选择是制品、硬件、Kernel、请求形状、质量阈值和成本共同形成的候选决策；所有性能结论都应记录这些条件。

精度与显存把问题带到了 GPU。下一阶段先不写 CUDA，从 CPU/GPU 架构与数据路径开始，理解 AI 为什么适合 GPU、什么时候反而不适合。
