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
updated: 2026-08-11
---

# 模型制品、精度与量化：文件变小不等于服务一定更快

一个 4-bit 模型文件能放进显存，实际生成却比 BF16 更慢。量化减少了权重存储和搬运，但目标 GPU、量化格式或 Kernel 没有高效支持，反量化与计算路径抵消了收益。优化必须同时验证容量、延迟、吞吐和质量。

模型制品是一组共同决定行为的文件与版本，不是一份权重。精度和量化又是制品格式、加载方式与运行 Kernel 的共同契约。

## 制品由哪些部分组成

| 组成 | 说明 | 失配后果 |
| --- | --- | --- |
| Config | 架构、层数、维度、上下文等 | 引擎无法构建或行为错误 |
| Tokenizer | 词表、规则、特殊 Token | Token ID 与模型语义不一致 |
| Chat Template | 消息到 Token 序列的转换 | 角色、停止和工具格式错误 |
| Weight Shards | 参数分片与索引 | 缺文件、加载到错误参数 |
| Generation Config | 默认采样与 Stop | 输出行为变化 |
| Adapter/Quant Config | LoRA 或量化元数据 | Kernel、尺度和权重不匹配 |

Safetensors 以可安全映射和快速读取为目标，避免 Pickle 任意代码执行风险；格式更安全不代表来源可信，仍需固定 Revision、校验和、许可证与供应链扫描。

## 精度代表什么

FP32 提供较大动态范围和精度，权重约占每参数 4 字节。FP16 约 2 字节，但指数范围较小；BF16 同为约 2 字节，指数范围接近 FP32，尾数精度较低。硬件对不同数据类型的支持会改变实际性能。

训练还包含梯度、Optimizer State、Master Weight 和激活，内存远大于单份权重。推理没有完整训练状态，却需要工作区、激活、CUDA Graph 与随并发增长的 KV Cache。

## 权重大小怎样粗估

参数数乘每参数字节得到理论权重下限。例如 7B 参数的 FP16/BF16 权重约为 14GB 十进制，FP32 约 28GB；INT8 理论约 7GB，INT4 理论约 3.5GB。实际文件还包含分片、元数据、尺度、零点和可能未量化参数。

这个计算不能直接决定 GPU。运行显存可写成：权重 + 固定工作区 + 峰值激活 + KV Cache + 通信 Buffer + 安全余量。输入长度、最大输出、活动序列和并行方式改变后几项。

## 量化在做什么

量化把浮点值映射到较低位宽表示，并保存尺度，某些方法还保存零点、分组或异常通道。Post-training Quantization 使用已训练模型转换；量化感知训练在训练时模拟误差；Weight-only 只压权重，W8A8 等方案还量化激活。

INT8、INT4 只是位宽标签，不能唯一说明算法。GPTQ、AWQ、GGUF 中的量化类型和其他格式拥有不同校准、分组与 Kernel 生态。引擎支持某个位宽，不等于支持任意量化制品。

## 质量风险怎样评估

量化误差可能影响长上下文、代码、数学、工具参数、少数语言和边界样本，不能只比较几个聊天问题。先冻结评测集、Prompt/Template、采样参数和基线 Revision，再同时测任务指标、结构化输出通过率、安全拒答和人工样本。

若量化候选未通过质量门，应回到更高精度、换算法或对关键层保留更高精度。不能因为显存目标已经达成就降低业务正确性标准。

## 推理优化不只量化

可选手段还包括 Continuous Batching、Prefix Cache、FlashAttention 类 Kernel、Tensor Parallel、模型蒸馏、限制上下文和最大输出。每项优化作用在不同瓶颈：计算、访存、显存、排队或请求规模。

优化顺序应从指标开始。TTFT 高先拆排队与 Prefill，TPOT 高看 Decode 与 Batch，OOM 看显存组成，吞吐低看设备利用和请求形状。一次只改变少量变量，并记录模型、引擎、硬件和数据集。

## 制品发布清单

发布记录包含仓库与 Revision、许可证、完整文件列表、校验和、Tokenizer 与模板、数据类型、量化算法与配置、目标引擎版本、硬件条件、容量结果、质量 Eval 和回滚制品。

同一制品从候选提升到生产，不在生产节点重新转换。模型文件能加载、接口契约通过、容量符合 SLO、质量不退化且旧制品可恢复，才算完成一次精度或量化升级。
