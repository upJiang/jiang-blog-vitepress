---
title: Continuous Batching、PagedAttention 与 KV Cache
description: 比较静态批处理和连续批处理，解释 KV Block、请求调度、Prefix Cache、公平性和显存压力。
category: devops
part: 第三部分：LLM Serving
chapter: 16
tags:
  - vLLM
  - PagedAttention
  - KV Cache
prerequisites:
  - 理解推理生命周期
outcomes:
  - 推演动态批处理调度
  - 解释吞吐、延迟和缓存复用取舍
practice:
  type: decision
  result: 完成一张批处理调度表
  verify:
    - 长短请求影响被解释
    - 跨租户缓存不会越过安全边界
evidence: official
updated: 2026-08-11T00:00:00.000Z
---
# Continuous Batching、PagedAttention 与 KV Cache

Continuous Batching 是模型服务在每次推理迭代重新组合活跃序列的动态批处理方式；PagedAttention 用分页映射管理 KV Cache；KV Cache 保存各序列已经计算过的注意力键和值。它们位于请求调度与 GPU Kernel 之间，用来提高执行槽利用率并控制显存碎片，而不是让显存容量失去上限。

一个 Batch 里有七个短回答和一个长回答。若系统等八个请求全部结束才接收下一批，七条计算槽会长期空闲。Continuous Batching 允许完成的序列离开，并在后续迭代加入新序列，把 GPU 的执行批次从“固定请求集合”变成动态调度状态。

它优化的是设备利用与总体吞吐，不保证每个请求延迟都下降。Batch 越大、长短请求越混合，单步执行、排队和公平性也会变化。

## 静态批处理与连续批处理

静态批处理先收集一组输入，统一执行，等待全部完成后释放 Batch。它适合离线、形状接近的任务，控制简单。在线生成的输出长度不可预测，短请求会被长请求拖住。

连续批处理在每个调度步查看活动序列、待执行 Token 和可用显存。完成、取消或失败的序列释放位置，新请求可以在后续步加入。Prefill 与 Decode 的计算形态不同，引擎还需要决定二者如何共享执行预算。

## 一张调度推演

| 调度步 | A | B | C | 新动作 |
| --- | --- | --- | --- | --- |
| 1 | Prefill | Prefill | 等待 | A、B 建立 KV |
| 2 | Decode | Decode | 等待 | 输出 A1、B1 |
| 3 | 完成 | Decode | Prefill | 释放 A，接纳 C |
| 4 | 空闲 | Decode | Decode | 输出 B3、C1 |
| 5 | 接纳 D | 完成 | Decode | 释放 B |

表中的一个“位置”不等于固定显存切片。调度器还要计算 Token Budget、Sequence 数、KV Block 和设备工作区。新 Prefill 可能很大，若无控制会拉长已有 Decode 的 Token 间隔。

## KV Cache 为什么需要分页思想

每个序列的 KV Cache 会随 Token 增长。若为最大上下文预留连续大块显存，大量空间会闲置；序列长度不同也容易产生碎片。PagedAttention 借鉴虚拟内存分页思想，把逻辑序列的 KV 映射到固定大小物理 Block，Block 不必在显存中连续。

逻辑 Block 表属于请求状态，记录每段 Token 的物理位置。序列增长时按需分配，结束时回收；共享前缀可以让多个逻辑序列引用相同只读 Block。分页降低浪费并支持灵活调度，但元数据、Block 大小和复制仍有成本。

## Prefix Cache 复用什么

Prefix Cache 复用相同 Token 前缀已经计算出的 KV，而不是缓存最终答案。命中条件必须落到 Token ID 序列，并绑定模型 Revision、Tokenizer、Chat Template、Adapter 和影响 Attention 的配置。文本看起来相同但模板不同，不应命中。

系统提示、私有文档和工具结果可能包含敏感信息。即使 KV 不直接还原为文本，跨租户共享仍需明确安全模型。保守做法是把租户或安全域加入 Cache Namespace，并禁止不可信输入改变共享缓存所有权。

## 吞吐、延迟和公平性怎样冲突

更大的 Batch 往往提高总 Token/s，却可能增加新请求排队和每 Token 等待。优先处理短请求能改善平均延迟，却可能让长请求饥饿；只按先来先服务，又可能被超长 Prefill 占住执行预算。

调度策略需要模型化租户权重、等待时间、输入长度、输出预算和 Deadline。指标至少包括待处理请求、活动序列、Batch Token、Prefill/Decode 时间、抢占、Cache Block 使用和各长度档位延迟。

## 抢占与换出说明容量不足

当 KV Cache 不足，引擎可能暂停、重计算或换出某些序列。它可以避免立即失败，但会增加延迟和数据搬运。频繁抢占不是免费的扩容方式，而是容量、并发或请求上限需要调整的信号。

可选措施包括降低最大序列数、限制上下文和输出、调整模型并行、增加实例或使用更小模型。`gpu_memory_utilization` 等参数只改变引擎预算，不能突破物理显存，也不能替代真实请求分布测试。

## 验证调度器看哪些场景

单独测试短输入短输出、长输入短输出、短输入长输出和混合负载。观察 TTFT、TPOT、总吞吐、取消释放、长请求饥饿和缓存命中。再用不同并发与到达率重复，避免只跑固定 Closed-loop 并发得出过度乐观结论。

Continuous Batching、PagedAttention 与 Prefix Cache 分别解决动态执行、显存映射和前缀复用。三者相互影响，却不是同一个概念；把输入、状态变化和验证指标分开，才可能安全调参。
