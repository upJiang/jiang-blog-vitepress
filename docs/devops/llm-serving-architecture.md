---
title: LLM Serving：从模型文件到稳定推理 API
description: 拆开准入、调度、推理引擎、流式传输、用量统计和观测，建立模型服务的职责边界。
category: devops
part: 第三部分：LLM Serving
chapter: 13
tags:
  - LLM Serving
  - Inference
prerequisites:
  - 会调用模型 API
outcomes:
  - 解释 Serving 的控制流和数据流
  - 定义延迟、吞吐、队列和错误指标
practice:
  type: walkthrough
  result: 画出一次推理请求生命周期
  verify:
    - 每个阶段都有输入输出
    - 服务健康与回答质量不会混为一谈
evidence: official
updated: 2026-08-17T00:00:00.000Z
---
# LLM Serving：从模型文件到稳定推理 API

健康检查返回 200，第一条真实请求却等待一分钟后 OOM。原因是探针只检查 HTTP 进程存在，权重仍在加载；加载完成后，默认最大上下文又让 KV Cache 预留吃掉剩余显存。模型服务“启动了”和“能按目标请求形状稳定服务”是两个状态。


<InfraFigure src="/images/ai-infra/llm-serving-architecture/hero.png" alt="模型制品进入 Serving 进程后经过队列、调度和流式输出的插画"
  icon="server" caption="Serving 的责任从加载可用模型开始，到每个请求释放计算与缓存资源结束。" />


## Serving 层拥有哪段生命周期

先把术语放回系统位置。只记名字，遇到故障时仍然不知道应该去哪个进程或存储找证据。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Model Artifact | 配置、Tokenizer、权重和必要代码组成的可追溯输入，必须锁定 revision 与摘要。 |
| Scheduler | 决定哪些请求在本轮进入 Prefill 或 Decode，以及它们如何共享批次和显存。 |
| Readiness | 实例已加载目标 revision，并能接受约定请求的可路由状态；不是进程存活的同义词。 |
| TTFT/TPOT | TTFT 是请求到首个 Token 的时间；TPOT 描述首 Token 之后相邻输出 Token 的平均或分位时间，二者瓶颈不同。 |

::: tip 判断原则
定义一个组件时，同时说清它不负责什么。能回答输入从哪里来、状态存在哪里、输出交给谁，才算理解。
:::

## 从冷启动到请求资源释放

```mermaid
flowchart LR
  S0["准备制品"]
  S1["加载设备"]
  S2["调度请求"]
  S3["流式完成"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 1. 准备制品：Artifact Loader 持有当前状态

校验配置、Tokenizer、权重分片和架构兼容性。

可以从这些位置确认结果：revision、digest、缺失文件。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 加载设备发生时，先看 Serving Process

分配权重、运行时工作区与缓存预算，执行最小预热。

这里不靠猜测，优先读取 显存账本、load duration、ready=false。

### 从 调度请求 留下的证据回到 Scheduler

根据输入长度、并发与预算安排 Prefill/Decode。

决定下一步前需要看到 queue_ms、running/waiting、batch tokens。

### 4. Output Processor 怎样完成流式完成

采样、解码、发送事件并在取消或终态释放 KV block。

这一动作的可观察结果是 first_token、finish_reason、freed blocks。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 用状态表定义“已就绪”而不是猜测

以下是解释性状态，不对应某个引擎固定日志格式。输入是模型 revision 和启动配置；只有所有前置状态满足，入口才应把流量送入实例。

```text
process=alive
artifact.revision=4f92c1 digest=sha256:...
tokenizer.loaded=true
weights.loaded=true device_count=2
warmup.completed=true
scheduler.accepting=true
readiness=true
```

若 process alive 但 weights.loaded=false，liveness 应保持成功以免加载被反复重启，readiness 则必须失败。预热只能验证一组受控输入，不代表最大上下文、峰值并发或所有采样参数可用；这些属于容量和兼容测试。

## 看起来相似，故障边界却不同

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| GPU 利用率 100% | 可能是有效计算，也可能长请求占满批次或 Kernel 忙等 | 同时看吞吐、队列、TTFT 和输出进度 |
| TTFT 高 | 排队、长输入 Prefill、Prefix 未命中或入口缓冲都可能贡献 | 按时间戳拆开 queue 与 prefill |
| TPOT 抖动 | 动态批次、采样、慢客户端或显存换入换出都可能影响 | 关联 batch 与请求形状 |
| 健康检查成功 | 探针可能只检查 HTTP 端口 | 把目标 revision 与 scheduler accepting 纳入 readiness |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

Serving 不决定用户权限、知识范围和最终计费，它接收经过规范化的请求并报告真实 usage 与终态。引擎指标命名会随版本变化，结论应记录版本、模型、硬件和配置；本章不提供未经实测的吞吐数字。

理解 Serving 边界后，下一篇从 Hugging Face 模型仓库开始，完成开源模型制品的选择、下载、校验和首次部署决策。
