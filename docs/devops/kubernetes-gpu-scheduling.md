---
title: Kubernetes GPU 调度、共享、MIG 与自动扩缩容
description: 从资源请求进入设备发现、标签、污点、亲和性、拓扑、共享、MIG、队列和扩缩容信号。
category: devops
part: 第五部分：Kubernetes AI Infra
chapter: 24
tags:
  - Kubernetes
  - GPU Scheduling
  - MIG
prerequisites:
  - 理解 Kubernetes 核心对象和 GPU 显存
outcomes:
  - 设计 GPU Workload 放置策略
  - 选择能反映推理压力的扩缩容信号
practice:
  type: decision
  result: 完成一张 GPU 调度决策表
  verify:
    - 设备数量和显存边界不混淆
    - 未在真实集群验证的结论被标记
evidence: official
updated: 2026-08-11
---

# Kubernetes GPU 调度：请求一张卡之后还缺哪些决策

两个模型 Pod 都请求一张 GPU，其中一个需要 70GB 显存，另一个只需要 8GB。若节点都只暴露相同资源名，Scheduler 看到的是设备数量，不知道模型权重、KV Cache 和上下文是否能放入目标卡。平台必须把设备能力与工作负载需求转成可调度标签、资源或准入规则。

GPU 调度包含发现、分配、隔离、拓扑、共享和扩缩容。Kubernetes 提供通用机制，具体设备语义来自插件、节点标签和平台控制器。

## 基本分配路径

Device Plugin 向 Kubelet 报告健康设备和扩展资源。Pod 在 `limits` 中请求资源后，Scheduler 只选择有足够可分配数量的节点；Kubelet 再让插件为容器分配具体设备。普通扩展资源通常不能超卖，也不会按显存自动分数。

节点标签可表达 GPU 型号、显存档位、架构、互联和驱动池。Node Affinity 选择能力，Taint/Toleration 把专用 GPU 节点留给授权工作负载。标签必须由可信节点组件维护，不能允许普通租户伪造。

## 隔离、共享与切分

整卡分配提供清晰故障与性能边界，但小模型可能浪费容量。Time-slicing 让多个工作负载轮流使用 GPU，提升共享率，却不自动提供显存与性能隔离。MPS 等机制改变进程共享执行方式，也需要匹配安全与支持边界。

MIG 在支持的 GPU 上把硬件划成具有计算和显存资源的实例，隔离比简单时间共享更明确。可用 Profile、实例数量和重新配置过程依赖具体硬件。MIG 不是任意大小显存切片，工作负载必须请求平台暴露的具体资源类型。

## 多 GPU 拓扑

Tensor Parallel 与分布式训练对 GPU 之间带宽和延迟敏感。同一节点的 GPU 可能通过 NVLink、NVSwitch 或 PCIe 连接，跨节点还依赖网络与 RDMA。只满足“有 N 张 GPU”可能得到性能很差或不支持的组合。

平台可以使用节点池、拓扑标签、Pod Affinity 和调度扩展把相关 Rank 放在合适故障域。还要考虑 CPU NUMA、网卡、存储和 Host Memory，GPU 并非孤立资源。

## 自动扩缩容看什么信号

CPU 利用率通常不能直接代表 LLM Serving 压力。更合适信号包括等待队列、最老请求年龄、准入拒绝、活动序列、Batch Token、TTFT、KV Cache 压力和目标模型路由流量。

扩容存在模型下载、加载和预热延迟。若从零副本启动需要数分钟，HPA 在流量到来后才扩容无法满足短时 SLO。可以保留最小热容量、预测扩容或使用排队吸收受控突发。

缩容先 Drain：停止新请求，等待或取消在途序列，释放 Gateway 路由，再删除 Pod。只看指标下降立即结束实例，会中断长生成。模型 Cache 和本地制品清理也要有独立生命周期。

## 调度决策表

| 需求 | 可用机制 | 仍需平台验证 |
| --- | --- | --- |
| 独占设备 | 扩展资源 Request | 模型与 KV 是否放得下 |
| 指定架构/显存档 | Label + Affinity | 标签真实性、Kernel 兼容 |
| 专用节点 | Taint + Toleration | 租户权限与容量保留 |
| 小任务共享 | Time-slicing/MPS | 显存、延迟与故障隔离 |
| 硬件切分 | MIG Profile | Profile 支持与重配影响 |
| 多卡通信 | 节点池/拓扑约束 | NVLink/RDMA 与 Rank 配置 |
| 自动扩缩 | 自定义指标 + HPA/KEDA 等 | 冷启动、Drain 与队列上限 |

## 过载先准入，不能只等扩容

扩容速度总有上限，GPU 资源也可能暂时不可获得。Gateway 和 Serving 应按模型、租户、Token 预算与资源槽限制进入量，给排队设置最大长度和 Deadline，必要时快速拒绝或路由到受控降级模型。

扩容是恢复容量的手段，准入是保护当前请求的边界。没有准入时，新副本尚未 Ready，所有请求已经进入旧实例，排队超时又触发客户端重试，最终形成放大。

当前环境没有 Kubernetes 集群和 NVIDIA GPU，本篇没有运行调度实验。实际验证应覆盖整卡、共享或 MIG 的资源可见性，模型显存上限，多卡拓扑，扩容到 Ready 的时间，缩容 Drain，以及设备或节点故障后的请求终态。
