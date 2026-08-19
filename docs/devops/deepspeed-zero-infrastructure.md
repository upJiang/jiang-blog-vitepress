---
title: DeepSpeed ZeRO 是什么？参数、梯度和优化器状态怎样分片
description: 从训练显存账本开始，解释 ZeRO Stage 1、2、3、参数聚合、通信、Offload、初始化、配置、检查点与恢复。
category: devops
part: 第七部分：分布式训练与交付
chapter: 33
tags:
  - DeepSpeed
  - ZeRO
  - Sharding
prerequisites:
  - 理解数据并行、参数、梯度、优化器和 Collective
  - 理解训练 Checkpoint 与 GPU/CPU 内存
outcomes:
  - 区分 ZeRO 三个阶段分片的状态
  - 推演一次参数聚合、反向分片和检查点恢复
practice:
  type: walkthrough
  result: 完成一份 ZeRO 分片状态与配置推演
  verify:
    - 显存节省与通信、CPU、I/O 代价同时说明
    - 未在真实多卡环境运行的配置只做静态检查
evidence: official-guided-operation
updated: 2026-08-18T00:00:00.000Z
---
# DeepSpeed ZeRO 是什么？参数、梯度和优化器状态怎样分片

普通数据并行让每张 GPU 保存完整参数、完整梯度和完整优化器状态。GPU 增加后样本吞吐提高，这三类训练状态却在每个 Rank 重复，占用总显存的大部分。大模型可能因此无法在单卡放下，即使集群总显存足够。ZeRO 的思路是把这些冗余状态分片，需要计算时再通过通信获取。

DeepSpeed 是包含训练优化、并行、Offload 和推理能力的开源库，ZeRO 是其中的状态分片技术家族。Stage 1、2、3 分别扩大分片范围，显存减少越多，通信、初始化、Checkpoint 与调试越复杂。本文只解释机制和配置边界，没有在真实多卡环境测量节省比例与吞吐。

::: info ZeRO 的准确含义

ZeRO 是 Zero Redundancy Optimizer，通过在数据并行 Rank 之间分片优化器状态、梯度和参数，减少每张设备上的重复训练状态。不同 Stage 决定分片到哪一类状态。

ZeRO 不改变模型数学定义，也不自动解决激活显存。Activation Checkpointing、序列并行和模型并行仍可能需要。分片还会引入 Collective、CPU 或 NVMe 访问和复杂 Checkpoint。

:::

## 训练参数、梯度和优化器状态分别占多少

参数是模型当前权重，反向产生同形状梯度，Adam 优化器为每个参数保存一阶矩、二阶矩，混合精度还可能保存 FP32 主权重。一个 BF16 参数 2 字节，梯度可能 2 字节，FP32 主权重和两个矩各 4 字节，简化账本已达到每参数 16 字节。

这个数字只描述模型状态，不含激活、临时工作区、通信 Buffer、分配器和 CUDA Context。不同框架对梯度和主权重 dtype 不同，8-bit Optimizer 也改变字节。部署前读取实际配置，不把 16 字节当常数。

普通 DDP 在每个 Rank 复制模型状态。四个 Rank 各持完整 16 字节账本，集群总状态约是单份四倍。ZeRO 利用数据并行 Rank 已经共同训练同一参数的事实，让每个 Rank 只拥有一部分持久状态。

分片不等于计算时永远只看本地数据。某层前向需要完整或对应权重，反向要组合梯度，优化器更新需要本地分片状态。通信发生的时机和数据量决定性能。

显存账本应按阶段采样：初始化、前向峰值、反向峰值、优化器 Step 和 Checkpoint。最终常驻下降不代表聚合峰值一定下降，Bucket 大小和 Prefetch 会改变瞬时占用。

DeepSpeed ZeRO 是训练时的状态分片实现。它利用数据并行 Rank 共同计算同一个逻辑模型这一事实，把参数、梯度或优化器状态分给不同 Rank 持有，减少每个进程保存的重复副本。ZeRO 不会把计算、通信和恢复凭空消除，某个阶段需要完整参数时仍要聚合，参数更新后还要保持所有 Rank 的逻辑模型一致。

例如四个 Rank 使用 Adam，Stage 1 可以让每个 Rank 只保存四分之一优化器状态，Stage 2 再把梯度归约到对应 Rank，Stage 3 连参数也只持有分片，某一层计算前再暂时 AllGather。每个阶段改变的是状态所有权和通信时机，不是模型的数学定义。完整参数装得下时，Stage 3 的额外通信可能不值得；参数本身装不下时，Stage 1 和 2 又无法解决启动峰值。

ZeRO 与张量并行的区别是分片维度不同。ZeRO 主要在数据并行组内分配持久状态，张量并行把一层的计算张量拆到设备，流水线并行按层分阶段。16 张卡不一定意味着 ZeRO 分片度是 16，若数据并行组只有 4，状态公式应使用 4。容量和通信日志必须记录实际 DP 组成员。

下表只表达理想所有权，真实峰值还要加激活、通信 Buffer、工作区和分配器预留。

| 方案 | 参数 | 梯度 | 优化器状态 | 典型通信 |
| --- | --- | --- | --- | --- |
| DDP | 每 Rank 完整 | 每 Rank 完整 | 每 Rank 完整 | 梯度 AllReduce |
| Stage 1 | 完整 | 完整 | 按 DP 分片 | 更新后参数同步 |
| Stage 2 | 完整 | 按 DP 分片 | 按 DP 分片 | Reduce-Scatter 梯度 |
| Stage 3 | 按层按需聚合 | 按 DP 分片 | 按 DP 分片 | 参数 AllGather 与梯度 Reduce-Scatter |

读表时要同时问“谁持有”和“什么时候需要”。如果只记住“Stage 3 最省显存”，就会漏掉 Prefetch、外部参数、通信超时和 Checkpoint 重分片这些运行边界。

一次容量估算可以把理想公式和实际峰值分开。假设 7B 参数、BF16 权重和梯度、FP32 主权重与 Adam 状态，单份持久状态约 16P 字节；四个数据并行 Rank 的 Stage 3 理想分片约为 4P，但某层 AllGather、激活、工作区和通信 Bucket 会在短时间叠加。模型能否在 24 GB 卡上运行，要看峰值采样，不只看除法结果。

这也是 Offload 的边界。Optimizer Offload 把已分片的状态放到 CPU，Parameter Offload 还会把参数搬到 CPU 或 NVMe；GPU 显存下降，主存、PCIe、NUMA、I/O 和同步等待增加。诊断时同时记录 GPU allocated/reserved、CPU RSS、Pinned Memory、NVMe 吞吐和 Step time，不能把 CPU OOM 误报成 CUDA OOM。
## ZeRO Stage 1 怎样分片优化器状态

Stage 1 在数据并行 Rank 之间分片优化器状态。每个 Rank 仍保存完整参数和完整梯度，但只负责一部分参数的 Adam 矩与主权重。优化器 Step 后，各 Rank 需要交换更新后的参数分片，使所有 Rank 重新拥有一致完整参数。

它主要减少 Adam 等优化器的冗余，适合优化器状态占大头、完整参数和梯度仍能装下的情况。与普通 DDP 相比，通信和状态管理增加，但参数计算路径变化较小。

四 Rank 时，理想情况下每个 Rank 只持约四分之一优化器状态。实际还有 Bucket、对齐和小参数，不能精确等分。某些参数组或稀疏状态也可能特殊处理。

Checkpoint 要保存每个 Rank 的优化器分片，以及可恢复的完整或分片参数。缺少一个 Optimizer Shard 时，可以加载权重做推理，却不能无损继续训练。Manifest 记录 World Size、Stage 和分片映射。

Stage 1 不减少激活，也不解决完整模型参数单卡装不下。若问题在参数或梯度，继续看 Stage 2/3 或张量并行，不能只增加 Rank 期待自动切权重。
## ZeRO Stage 2 怎样继续分片梯度

Stage 2 在 Stage 1 基础上再分片梯度。反向期间，各 Rank 产生梯度，通过 Reduce-Scatter 把对应参数的梯度聚合并交给负责 Rank。每个 Rank 只持自己分片的最终梯度和优化器状态，参数仍完整复制。

普通 AllReduce 让每个 Rank 得到完整梯度，Stage 2 只需要负责分片。通信总量和时序由实现 Bucket 决定，可以与反向重叠。Bucket 太大增加峰值，太小增加启动开销，配置需在目标网络验证。

梯度分片要求 Optimizer Step 严格按所有权执行。参数组、梯度裁剪和全局 Norm 需要分布式计算。直接访问 `param.grad` 假设每个 Rank 都有完整梯度的自定义代码，可能在 Stage 2 下失效。

梯度累积期间是否分片和同步由配置决定。使用 `no_sync`或特殊 Accumulation 要确认 DeepSpeed 版本支持。Global Batch、Loss Scaling 和 Overflow 决策仍要在 Rank 间一致。

Stage 2 仍保存完整参数，模型参数本身超过单卡时无法启动。它适合参数能放下，但梯度与优化器让显存不足的训练。Offload Optimizer 可进一步把分片状态放 CPU，代价是传输和 CPU 内存。
## ZeRO Stage 3 怎样按层聚合参数

Stage 3 把参数也分片。每个 Rank 平时只保存自己拥有的参数分片，某层要计算时，通过 AllGather 或类似通信暂时取得该层需要的参数，计算结束后可释放非本地部分。反向和更新再用 Reduce-Scatter 分配梯度。

这能让模型参数总量分散到多个 Rank，使普通数据并行单卡装不下的模型成为可能。代价是前向和反向都增加参数通信，性能高度依赖网络、Bucket、Prefetch 和层顺序。

参数不是一次全模型聚合，而是按模块和调度窗口预取。Prefetch 提前拉取下一层参数以重叠计算，Reuse Distance 决定何时保留。保留更多减少通信但增加峰值，过早释放降低显存却可能重复聚合。

自定义模块若在 `forward`外访问参数，或者多个模块共享权重，ZeRO 需要知道外部参数依赖。框架提供注册和 Gathered Parameters 上下文。忽略这些边界可能得到参数缺失、错误初始化或隐式全量聚合。

Stage 3 的调试要区分持久分片、临时完整参数和 Offload Buffer。`nvidia-smi`看到的瞬时峰值不等于分片失败。内存快照、通信 Trace 和 DeepSpeed 日志共同说明哪一层发生聚合。
## Stage 1、2、3 的差异怎样比较

下面的表格用于复查状态所有权。它不包含激活和工作区，也不表示显存一定按 World Size 线性下降。

| 阶段 | 参数 | 梯度 | 优化器状态 | 主要新增通信 |
| --- | --- | --- | --- | --- |
| 普通 DDP | 每 Rank 完整 | 每 Rank 完整 | 每 Rank 完整 | 梯度 AllReduce |
| Stage 1 | 每 Rank 完整 | 每 Rank 完整 | 分片 | 更新参数交换 |
| Stage 2 | 每 Rank 完整 | 分片 | 分片 | Reduce-Scatter 梯度 |
| Stage 3 | 分片并按需聚合 | 分片 | 分片 | 参数 AllGather 与梯度 Reduce-Scatter |

选择先看哪个状态装不下。优化器为主可从 Stage 1/2 评估，参数单卡装不下需要 Stage 3 或模型并行。更高 Stage 不是默认更好，通信和代码兼容可能让较低 Stage 吞吐更高。
## Bucket、Prefetch 和通信重叠怎样影响峰值

ZeRO 把参数与梯度分成 Bucket 批量通信。大 Bucket 减少 Collective 启动次数，更容易利用带宽，却需要更大连续 Buffer；小 Bucket 降低峰值，启动和调度开销增加。默认值只是一种平衡。

Overlap Communication 让反向计算一层时通信已完成梯度，前向计算当前层时 Prefetch 下一层参数。重叠要求 Stream 依赖正确、网络和计算都有余量。通信已占满互联时，提前发送不一定更快。

`stage3_prefetch_bucket_size`、`reduce_bucket_size`等字段会随 DeepSpeed 版本变化。配置按目标版本官方 Schema 核对，不能复制旧博客。未识别字段要让启动失败，不静默忽略。

峰值发生在参数聚合、激活和通信 Buffer 同时存在时。只用“状态总字节除 World Size”估算会低估。候选运行在每层和 Step 阶段采样显存，记录 Bucket、模块和 Rank。

性能调优一次改变一个 Bucket 或 Prefetch 参数，在相同模型、Batch 和网络测 Step time、显存峰值和通信。更快但 OOM 边界变窄，需要在容量计划中保留余量。
## Optimizer Offload 和 Parameter Offload 做什么

Optimizer Offload 把每 Rank 拥有的优化器状态放 CPU 主存，在更新时使用 CPU 计算或在 CPU/GPU 间传输。它减少 GPU 显存，增加主存、内存带宽和 PCIe 压力。CPU 核心不足会让 Optimizer Step 拖慢。

Parameter Offload 进一步把参数分片放 CPU 或 NVMe，需要计算时再搬到 GPU。它能运行更大模型，但频繁传输可能让 GPU 等待。NVMe 带宽和延迟远低于 HBM，适合容量优先的场景，不是无损扩容。

Pinned Memory 能提高异步传输，过多会影响系统。Offload Buffer 数量和大小进入主存账本。多个训练 Job 共享 Node 时，CPU 和 NVMe 可能先成为瓶颈，Kubernetes Request 要声明足够资源。

Offload 错误可能表现为主存 OOM Kill、I/O 超时、NVMe 空间不足或训练 Step 抖动，不是 CUDA OOM。监控同时看 GPU、RSS、Page Fault、磁盘吞吐和 CPU 时间。

选择 Offload 前先尝试状态分片、Activation Checkpoint、Batch 和模型并行，再比较 time-to-quality 与成本。能跑不代表值得跑，长时间 GPU 等待可能让总成本更高。
## 初始化时怎样避免先创建完整模型

普通 PyTorch 代码先在每个 Rank 构造完整模型，再让 ZeRO 分片。模型单卡连初始化都放不下时，分片还没开始就 OOM。DeepSpeed 提供分片初始化上下文，让参数创建时直接分布或放在替代设备。

初始化顺序要覆盖模型构造、权重加载和自定义参数。某个子模块在上下文外创建大张量，仍会完整落到每 Rank。日志和内存快照检查初始化峰值，不能只看训练 Step。

预训练权重可能是统一格式或已有并行 Shard。加载器读取 Manifest，按目标 Stage 和 World Size 分发。一个 Rank 读取全部权重再广播，会占主存和网络；流式加载与分片读取降低峰值。

随机初始化需要各 Rank 协同，保证逻辑模型参数一致而分片不同。种子、参数创建顺序和共享权重影响结果。小模型对照全量参数 Hash 或聚合检查，确认没有重复初始化。

初始化完成后运行一小步前向和反向，再保存并恢复 Checkpoint。只启动到第一个日志不证明参数所有权和优化器状态正确。
## DeepSpeed 配置怎样表达 ZeRO

下面 JSON 只展示常见结构，字段和默认值必须按目标 DeepSpeed 版本核对。它未在真实多卡环境执行。

```json
{
  "train_micro_batch_size_per_gpu": 2,
  "gradient_accumulation_steps": 8,
  "bf16": { "enabled": true },
  "zero_optimization": {
    "stage": 3,
    "overlap_comm": true,
    "contiguous_gradients": true,
    "reduce_bucket_size": 50000000,
    "stage3_prefetch_bucket_size": 50000000,
    "offload_optimizer": {
      "device": "cpu",
      "pin_memory": true
    }
  }
}
```

Micro Batch 与累积决定 Global Batch，还要乘数据并行大小。Stage 3 分片参数和梯度，Optimizer Offload 到 CPU。两个 Bucket 数字只是示例，不能直接复制到任意模型。JSON 不能写注释，所以解释放在代码块后。

静态检查使用 JSON Schema、字段类型、Batch 公式和版本。候选运行打印实际生效配置、World Size 和每 Rank 状态。未知字段、Batch 不一致和不支持 dtype 应在启动时失败。
## ZeRO Checkpoint 怎样保存和恢复分片

每个 Rank 保存自己的参数、梯度相关状态、优化器和元数据，Coordinator 写 Tag 和 Manifest。完整 Checkpoint 属于同一个 global step 和 World Size，缺失一个 Rank 目录就不能无损恢复训练。

推理通常需要聚合为普通模型权重或让推理引擎理解分片。聚合工具会消耗 CPU 主存和磁盘，输出要重新计算 Hash 并验证。训练 Checkpoint 不能直接当 Hugging Face 可部署目录，除非格式合同明确。

改变 World Size 或 Stage 恢复可能需要重分片。框架支持范围按版本核对，未支持时先转换为统一权重再重新初始化优化器，语义与无损续训不同。操作记录原布局和目标布局。

保存采用临时目录、每 Rank 完成标记和最终 Manifest。对象存储上传失败可重试，但 ready 标记只在全部 Hash 通过后写。清理保留最近和已验证恢复点，不能只看目录时间。

恢复演练在隔离作业加载、跑一步、比较 global step、Loss、学习率和状态。文件数量齐全不等于参数正确，抽样聚合参数和 Optimizer 状态也要检查。
## 三个 Stage 的理想内存怎样计算

假设模型有 P 个参数，BF16 参数和梯度各 2P 字节，FP32 主权重、Adam 一阶矩和二阶矩共 12P 字节，模型状态合计约 16P。普通 DDP 每 Rank 都保存约 16P。四 Rank 的 Stage 1 理想上保存参数 2P、梯度 2P、优化器 12P/4，总约 7P。

Stage 2 继续把梯度分片，理想常驻约参数 2P、梯度 2P/4、优化器 12P/4，总约 5.5P。Stage 3 再把参数分片，理想持久状态约 16P/4，也就是 4P。这个计算帮助理解趋势，不含参数聚合、Bucket、激活和工作区。

以 70 亿参数为例，P=7e9，4P 字节约 28GB。Stage 3 四卡理想训练状态仍可能超过一张 24GB GPU，加上激活更不可能直接运行。使用八卡、Offload、Activation Checkpoint 或更低状态精度仍需评估。

小参数、共享权重、对齐和未分片 Buffer 会让实际不按整数平均。Rank 0 还可能承担额外元数据或聚合。容量由峰值最大的 Rank 决定，报告每 Rank 而不是只给平均。

运行测量在模型初始化后、前向峰值、反向、Optimizer 和 Checkpoint 分别采样 allocated、reserved、CPU RSS 和通信 Buffer。只有这些数据能把理想公式校准成目标配置。
## ZeRO 的数据并行组怎样完成通信

ZeRO 在数据并行组内分片状态。若训练同时使用张量并行和流水线，并不是所有 World Rank 都共同分片同一参数。每个参数属于特定的数据并行组，组大小决定分片份数。日志必须打印组成员。

Stage 2 的 Reduce-Scatter 把梯度按所有权分发，Stage 3 的 AllGather 在模块计算前取回参数。Optimizer 更新完成后，参数分片保持在负责 Rank，下一层或下一步再按需聚合。通信和计算通过不同 Stream 重叠时要有依赖。

World Size 不等于 ZeRO 分片度。16 卡训练可能 DP=2、TP=4、PP=2，ZeRO 只在大小 2 的数据并行组内分片，理想节省只有二分之一。把总卡数代入内存公式会严重低估。

通信组创建顺序必须在所有 Rank 一致。一个 Rank 因配置不同加入另一组，Collective 会永久等待或报错。启动时保存 rank、local rank、DP/TP/PP 坐标和组 ID，排障先确认拓扑。

网络性能也按组看。Stage 3 参数聚合频繁，DP 组跨慢网络时 Step time 上升；可以调整拓扑，让张量与 ZeRO 组位于高速域，或者改变并行组合。选择需要真实模型 Profiler，不能只凭网络标称带宽。
## Activation Checkpointing 与 ZeRO 分别节省什么

ZeRO 减少参数、梯度和优化器状态的重复，Activation Checkpointing 减少前向保存的激活。大模型训练常同时使用，因为状态和激活是两份不同账本。只开 ZeRO 后仍在长序列前向 OOM，问题可能是激活。

Checkpointing 只保存部分层输入，反向时重新运行前向以恢复中间激活。显存下降，计算增加。与 Stage 3 结合时，重算前向可能再次触发参数 AllGather，通信也会增加。框架会尝试保留参数或 Prefetch，实际行为按版本测量。

Checkpoint 边界影响效果。每层都重算节省多但开销大，按若干层分段在显存和计算之间平衡。随机操作如 Dropout 需要保存或重放 RNG 状态，确保反向重算与原前向一致。

长序列还可使用序列并行、FlashAttention 和更小 Micro Batch。它们改变激活或 Kernel，不减少 Optimizer。容量设计把每项对应到状态，避免同时打开多个开关却不知道哪个有效。

验证用相同 Global Batch 和数据比较 Loss、梯度、Step time、显存和通信。Checkpointing 带来的浮点差异在容差内，系统性偏差或 Dropout 不一致需要修复。
## 自定义层和共享参数为什么容易与 Stage 3 冲突

Stage 3 假设参数在模块 `forward`边界按需聚合。自定义代码如果在外部直接读取 `module.weight`、在 `forward`之后缓存参数引用，或让一个模块使用另一个模块的参数，ZeRO 可能不知道何时准备完整值。

共享 Embedding 与输出头是常见例子。框架需要注册 External Parameter 或在 Gathered Parameters 上下文中访问。只在 Rank 0 聚合完整权重做保存，其他 Rank 要按协议参与，不能私自读取分片。

动态创建参数也有风险。Optimizer 初始化后新增 Parameter 可能没有分片和状态，训练看似运行却不更新。模型构造、Adapter 加载和参数冻结要在 DeepSpeed 初始化边界内完成，状态变化写入 Checkpoint。

某些代码依赖参数 `.numel()`、shape 或 dtype，分片后本地张量表示可能不同。DeepSpeed 提供安全查询和上下文，业务代码不要把本地分片大小当模型完整大小。评测与日志也要避免遍历并打印全部参数造成聚合峰值。

兼容测试从小模型开始，比较单卡和 Stage 3 的前向、梯度与更新。再测试保存、加载、权重共享、冻结与 Adapter。框架示例能运行不证明自定义模块兼容。
## 常见失败怎样按初始化、通信和存储定位

初始化 OOM 说明完整参数或加载峰值在分片前出现，检查分片初始化上下文、权重加载和临时张量。训练前向 OOM 检查参数 Bucket 与激活，反向 OOM 检查梯度 Bucket 和 Checkpointing，Optimizer 阶段检查 Offload 与 CPU 主存。

Collective 超时要先找缺失 Rank、组拓扑和最早错误。一个 Rank 先因 OOM 退出，其他 Rank 只看到 NCCL timeout，通信不是根因。每 Rank 日志按时间对齐，保留第一个异常和 job ID。

CPU Offload 慢或 OOM 时，查看 RSS、Pinned Memory、NUMA、CPU 线程和 Page Fault。NVMe Offload 失败检查空间、I/O、文件权限和临时目录。它们不会在 GPU Metric 中给出完整原因。

Checkpoint 恢复失败检查 Tag、Manifest、World Size、Stage、分片数量和 Hash。只缺 Optimizer Shard 时可以选择重新开始 Optimizer，但必须明确这是新训练轨迹，不能标无损恢复。

参数更新不一致可能来自 Overflow、梯度缩放、外部参数、错误组和迟到 Rank。小步参数摘要与全局 Norm 帮助定位。看到 Loss 还在下降不代表所有 Rank 参数一致。
## ZeRO 性能评测怎样避免只看显存

评测固定模型、数据、Global Batch、Micro Batch、累积、硬件、网络和软件版本。分别运行普通 DDP 或可行基线、Stage 1、2、3 和 Offload 候选。记录每 Rank 显存峰值、CPU RSS、Step time、通信、样本/Token 吞吐和 Loss。

显存节省让更大 Micro Batch 可行，吞吐可能提高；Stage 3 通信也可能让 Step 变慢。比较时一组固定 Batch 看系统开销，另一组用每方案最大安全 Batch 看可达吞吐，两个结果分开报告。

Warmup 排除首次 JIT 和缓存，正式窗口覆盖多个 Checkpoint 周期。只测十步会漏掉保存与内存爬升。Profiler 采样短窗口，避免长时间全量 Trace 影响结果。

缩放测试改变 DP 组大小，观察状态字节与通信是否符合预期。World Size 增加但 ZeRO 组不变时，显存不会按总卡数下降。拓扑变化也记录，跨节点结果不与单节点直接比较。

性能通过后再做故障恢复、Checkpoint 和质量。一个配置跑得快但无法恢复或数值不稳定，不是可用候选。当前无真实硬件时，只能验证 JSON、内存公式和测试脚本，不填写加速比。
## 怎样选择 Stage 而不是默认开启 Stage 3

选择从单卡和普通 DDP 账本开始。完整参数、梯度和 Optimizer 都能装下，目标只是提高吞吐，DDP 最简单。Optimizer 导致 OOM 而参数和梯度余量充足，Stage 1 可能足够；梯度也占用明显，评估 Stage 2；参数本身装不下才进入 Stage 3 或模型并行。

通信环境决定上限。单节点高速互联可以承受更频繁的参数聚合，跨节点慢网络可能让 Stage 3 效率很差。CPU 主存富余、PCIe 可接受时 Optimizer Offload 可行；CPU 本身紧张则会把问题转移。

模型代码兼容也影响选择。大量外部参数、自定义 Optimizer 和动态模块需要更多 Stage 3 适配。先在 Stage 2 验证训练正确和 Checkpoint，再升级 Stage 3，能缩小排障范围。一次同时打开 Stage 3、Offload、Checkpoint 和多个并行策略，很难知道哪个造成差异。

候选表记录每方案最大 Micro Batch、Global Batch、显存、CPU、Step time、通信、恢复和质量。Stage 3 显存最低但 time-to-quality 更长时，资源成本未必最低。目标是满足模型规模和训练时间，不是追求最高 Stage。

版本升级后重新评估。DeepSpeed、PyTorch 和模型架构改变 Bucket、Offload 或参数访问行为，旧配置不自动适用。配置文件保存版本和验证日期，未复测标为 stale。
## 训练分片怎样转换成可部署模型

训练完成的 ZeRO Checkpoint 包含并行和 Optimizer 状态，Serving 通常需要标准权重、Tokenizer、Config 和 Manifest。转换任务读取同一个 Checkpoint Tag，聚合或重分片参数，去掉训练专用状态，输出到临时目录并计算文件 Hash。

聚合可能需要大量 CPU 主存和磁盘，不能直接在正在训练的 GPU Node 执行并抢占资源。独立转换 Job 声明容量，失败后临时目录清理。最终目录只在所有 Shard、Config 和 Tokenizer 通过时发布。

转换后用小模型加载、固定 Tokenize、若干前向和生成样本比较训练端权重。浮点与并行布局可能有容差，系统性输出差异要阻止发布。量化是另一步候选，不能在转换时静默改变 dtype。

Registry 记录来源 Checkpoint、global step、ZeRO Stage、World Size、转换工具、目标格式和 Hash。这样推理回归可以追到训练状态。只写“latest”会让相同模型名指向不同权重。

旧训练 Checkpoint 按恢复策略保留，部署制品按发布回滚保留。两者引用和清理不同。删除部署模型不应删除唯一续训点，删除训练 Optimizer 也不影响已验证推理权重。
## 一次 Stage 3 训练步骤怎样完成

输入是四 Rank、Stage 3、BF16、Optimizer Offload CPU 的训练任务。每个 Rank 持四分之一参数和优化器状态。前向到某层时，Rank 组 AllGather 该层参数，执行计算并按策略释放非本地部分；反向再次需要参数并产生梯度。

梯度通过 Reduce-Scatter 聚合到负责 Rank。梯度累积达到设定步数后，各 Rank 在 CPU 更新自己分片优化器状态和参数，再进入下一 global step。状态记录参数分片、Bucket、通信、CPU 更新和内存峰值。

假设 Rank 1 在参数 AllGather 时网络超时。其他 Rank 等待 Collective 并最终失败，global step 不提交。最后完整 Checkpoint 在 step 500，作业整体结束并释放租约。失败证据包括 Collective、Rank、参数 Bucket 和网络状态。

恢复作业验证四个 Shard 和 Manifest，从 step 500 加载相同 Stage 与 World Size。第一步聚合参数、Loss 和梯度范数在容差内，Optimizer 继续更新。若缺 Rank 1 Shard，恢复应明确失败，不从其他分片猜一个状态。

当前文章没有执行这个四卡 Stage 3 任务。真实验证需记录 DeepSpeed、PyTorch、CUDA、NCCL、模型、网络、CPU 主存、每 Rank 显存、Step time 和恢复结果，静态 JSON 通过不能替代这些证据。
