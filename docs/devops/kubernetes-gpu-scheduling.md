---
title: Kubernetes 怎样调度 GPU？整卡、共享、MIG 与扩缩容如何选择
description: 从扩展资源和节点标签开始，解释整卡、GPU 型号、显存、拓扑、MIG、时间共享、MPS、队列与扩缩容信号。
category: devops
part: 第五部分：Kubernetes AI Infra
chapter: 24
tags:
  - Kubernetes
  - GPU Scheduling
  - MIG
prerequisites:
  - 理解 Kubernetes 调度、GPU Device Plugin 和显存账本
  - 理解推理请求、队列和 KV Cache
outcomes:
  - 为不同模型选择 GPU 调度和共享方式
  - 从请求压力而不是单一 GPU 利用率设计扩缩容
practice:
  type: decision
  result: 完成一张 GPU 调度决策表
  verify:
    - 设备数量、显存、型号和拓扑边界不混淆
    - 未在真实集群验证的结论明确标记
evidence: official
updated: 2026-08-18T00:00:00.000Z
---
# Kubernetes 怎样调度 GPU？整卡、共享、MIG 与扩缩容如何选择

Pod 写了 `nvidia.com/gpu: 1`，只表达“需要一个被插件公开的资源单位”。它没有说明显存必须多大、GPU 之间是否需要高速互联、两个 Pod 能不能共享一张卡，也没有告诉 Autoscaler 什么时候应该扩容。单看 GPU 数量，可能把 10 GB 模型放到显存不足的设备，也可能把需要 AllReduce 的两个 Pod 放到通信很慢的节点。

调度要先定义任务形状。整卡独占适合需要稳定容量和强隔离的推理或训练，MIG 适合硬件支持的固定切片，时间共享适合低利用率且能接受抖动的任务，队列和扩缩容则处理请求随时间变化的问题。每种选择都改变资源单位、失败方式和监控字段。

::: info GPU 调度的准确含义

Kubernetes GPU 调度是根据 Pod 的资源请求、节点可分配资源、标签、污点、亲和性和拓扑约束，选择一个或多个 Node，并由设备插件分配设备。调度器只使用它能看到的资源模型，不会自动读取模型显存公式或推理延迟。

整卡、MIG 实例和共享时间片在 Kubernetes 中可能对应不同扩展资源名。它们的隔离、可见设备和容量不能互相替换。平台必须把资源名与硬件事实写入文档和监控。

:::

## 扩展资源怎样表示“我需要一张 GPU”

Device Plugin 向 kubelet 注册扩展资源，常见名称是 `nvidia.com/gpu`。Node 的 `Capacity` 和 `Allocatable` 显示可分配数量，Pod 的 `resources.limits` 写请求。Scheduler 根据整数资源做过滤与绑定，kubelet 再把具体设备交给 Runtime。

这个资源单位默认不包含显存和算力细节。两张不同型号 GPU 都可能各显示数量 1，但显存、Tensor Core、互联和支持的 dtype 不同。没有标签约束时，Pod 可能随机落到任一型号，启动后才在加载或 Kernel 阶段失败。

资源名也可能来自 MIG Device Plugin 或共享插件，例如某个 MIG Profile 的独立名字。名字表达的是插件公开的设备类别，不是 Kubernetes 自己定义的统一语义。升级插件或切换模式后，旧 PodSpec 可能再也匹配不到资源。

请求与限制通常必须相等，不能写半张整卡的十进制值。时间共享或 MPS 方案可以让多个 Pod 使用一个物理设备，但其资源名、准入和限制由插件实现。应用不能从“请求成功”推断自己拥有固定显存。

预检要读取 Node Allocatable、资源名、已绑定 Pod、设备 UUID 与标签。只看 YAML 不知道当前集群发布了哪种资源。资源模型变化要同时更新调度策略、配额、监控和运行手册。

这里的“调度一张 GPU”表示 Scheduler 先按扩展资源做可行性判断，再把 Pod 绑定到某个 Node；真正把哪一个设备 UUID 放进容器由 kubelet、Device Plugin 和 Runtime 完成。它解决的是放置和分配，不直接承诺显存、带宽或模型算子一定可用。比如一个 80 GB GPU 与一个 24 GB GPU 都把数量报告为 1，若模型需要 40 GB，资源数量检查通过也可能在加载阶段失败。

整卡、MIG、时间共享和 MPS 的差异也从资源所有权体现。整卡通常把设备独占给一个 Pod，MIG 把支持的 GPU 切成带固定边界的实例，时间共享让多个进程轮流使用同一设备，MPS 改变进程提交与并发方式。它们的隔离、显存保证和故障影响不同，不能只换一个资源名称就当成同一种调度。

为了把选择依据固定下来，下面的表格只列检查维度，不声称任何具体集群已经启用这些模式。

| 方案 | 资源声明表达什么 | 主要边界 | 适合先验证的证据 |
| --- | --- | --- | --- |
| 整卡 | 一个 Pod 持有一张设备 | 粗粒度，空闲容量不能给别人 | UUID、显存峰值、独占关系 |
| MIG | 一个 Profile 实例 | 只能使用该实例的算力和显存 | Profile、设备可见性、故障域 |
| 时间共享 | 插件定义的可调度份额 | 争用会改变尾延迟，没有固定显存保证 | 调度份额、上下文切换、p95 延迟 |
| MPS | 多进程共享提交通道 | 需要特定驱动和进程管理，隔离语义不同 | 进程关系、错误传播、吞吐曲线 |

表格后还要回到业务条件。在线 Serving 通常先固定模型所需显存与尾延迟，再选择可提供这些边界的设备模式；如果只是让小实验共享空闲 GPU，时间共享可能足够，但不能把实验结果直接当生产 SLO。
## 型号、显存和 Compute Capability 怎样加入调度条件

节点标签可以表达 GPU 型号、架构、显存档位、区域和驱动族。例如 `accelerator.example.com/model=A`、`accelerator.example.com/memory-gib=80`。标签值要由受信任的 Node Feature Discovery 或管理员写入，普通 Pod 不能自行声明“我是 80 GB”。

Pod 用 Node Affinity 要求必要标签，用 Preferred 选择更合适但允许回退的标签。必要条件过多会让 Pod 长期 Pending，条件过少会让模型加载到错误硬件。对于量化 Kernel、BF16 或特殊算子，Compute Capability 是启动前必须满足的条件。

显存标签只是容量上界的粗粒度描述。当前节点还可能被其他工作负载占用，MIG Profile 会分割可用容量，驱动和 Context 也有基线。模型权重、激活和 KV Cache 账本要先给出每卡最低余量，再决定标签范围。

多卡 Pod 请求同一型号的两张 GPU，并不自动得到连续显存。张量并行要知道每个 Rank 的分片、通信接口和设备顺序。调度策略可用拓扑标签或 Node Feature Discovery 发现信息，最终仍要在候选 Node 跑 NCCL 和最小模型。

硬件标签有时效性。驱动升级、MIG 重配置或设备替换后，旧标签可能失真。节点上线前和维护后都要执行设备发现与标签校验，把标签来源和时间写入 Node 注释或外部资产记录。
## Taint、Affinity 和拓扑怎样避免错误放置

GPU 专用节点通常加 Taint，例如在线推理池只允许带对应 Toleration 的 Pod。Toleration 只表示“不因为这个污点被排除”，还要有 Node Affinity 选择正确池。给所有命名空间自动注入 Toleration 会让隔离失效，普通工作负载可能消耗昂贵设备。

Pod Anti-Affinity 可以把同一模型副本分散到不同 Node，避免一台机器故障同时丢失全部副本。Topology Spread Constraint 能按 Node、Zone 或自定义域平衡 Pod。GPU 资源紧张时，严格分散可能无法调度，需要明确是优先可用性还是优先启动。

拓扑不仅是可用区。PCIe Root Complex、NUMA、NVLink、NVSwitch 和跨机网络都会影响多 GPU 通信。设备插件分配两个整数不等于两张卡路径相同。训练和张量并行需要在调度后检查实际拓扑，推理单卡一般不需要为跨卡通信付出约束。

节点选择还要考虑模型卷。PVC 可能绑定某个可用区，Pod 的 GPU Affinity 又要求另一域，二者交集为空时 Pending。Scheduler 事件会说明约束冲突，但需要同时看 Pod、PVC 和 StorageClass。

调度约束是期望状态。节点池扩容后，新节点必须带相同标签、污点和驱动能力。Autoscaler 只按 Pod 未调度原因选择 Node Group，模板缺少标签会让扩容后 Pod 仍 Pending。
## 整卡独占解决什么问题，边界在哪里

整卡独占让一个 Pod 获得 Device Plugin 分配的一张完整 GPU，通常有固定显存、计算单元和错误隔离边界。模型服务容易建立容量账本，GPU OOM 主要来自自身权重、激活和 KV Cache，而不是邻居突发占用。训练和高吞吐推理常选择这种模式。

独占不等于无限资源。进程仍可把一张卡的显存占满，多个 Worker 仍会重复加载权重，Kernel 仍会被低效请求拖慢。GPU 利用率低可能是负载小或 CPU 等待，不能因此把一张卡随意拆给不兼容租户。

整卡的成本是利用率和启动速度。小模型低 QPS 时，一张卡长期空闲，按请求量扩缩又受冷启动影响。把多个小服务放到同一物理卡需要共享方案和更复杂的容量隔离，不能只改 `replicas`。

整卡 Pod 还要考虑发布峰值。滚动更新需要新旧副本并存，节点没有额外 GPU 时 rollout 会卡住。独立候选 Node 或 Gateway 切流可以避免原地更新强占资源，但需要保留回滚设备。

独占的验证包括设备 UUID 稳定、显存基线、同节点其他进程为空、最小模型运行和进程退出后资源回收。若使用 MIG 或共享插件，验证标准会变化，不能沿用整卡截图。
## MIG 是什么，怎样与整卡区分

MIG 是部分 NVIDIA 数据中心 GPU 支持的硬件分区能力。一个物理 GPU 可以划分成多个具有固定计算和显存资源的 GPU Instance，设备插件再把某种 Profile 暴露成可调度资源。实例之间比普通时间共享有更明确的硬件边界，但共享同一物理卡的电源和部分系统资源。

MIG Profile 决定每个实例的显存、计算切片和可见能力。不同 Profile 不是任意大小的虚拟显卡，创建数量受硬件布局约束。模型能装入某 Profile 不代表能使用完整 GPU 的峰值带宽，Kernel 和 Tensor Core 支持也要看实例。

Kubernetes 调度 MIG 资源时，Pod 请求的是插件公开的 Profile 资源名，而不是 `nvidia.com/gpu` 的整卡名。切换节点的 MIG 配置会销毁或重建实例，已经运行的 Pod 可能受影响。节点池要固定 Profile，维护操作先 Drain 并记录配置。

MIG 适合多个小模型或需要固定显存边界的租户。它不适合需要跨整卡共享全部 HBM、跨实例高频通信或模型刚好超过单个 Profile 的任务。把一个大模型拆到多个 MIG 实例通常不能替代支持拓扑的张量并行。

监控要同时记录物理 GPU、GPU Instance、Compute Instance 与 Pod 映射。`nvidia-smi` 的 MIG 输出和 Kubernetes 资源名需要对应。只按物理卡聚合会把多个租户的显存和延迟混在一起。
## 时间共享和 MPS 怎样改变资源边界

时间共享让多个进程轮流使用同一物理 GPU，设备插件可能为它们公开多个可调度单位。它提高低利用率场景的设备填充率，但显存通常仍由多个进程共同占用，某个进程泄漏或突发可能影响邻居。调度单位不代表固定 GiB。

MPS 是 NVIDIA 的多进程服务机制，让多个进程通过服务端共享 GPU 上下文和执行资源。它可以减少上下文切换并提供部分执行配额，具体隔离能力和支持范围依赖架构与配置。MPS 不是 MIG，不能把两者的故障边界互换。

共享模式的核心问题是容量准入。每个模型权重、激活和 KV Cache 都要在同一物理显存中，平台必须为总和加上峰值余量。仅按 Pod 数量或共享份额调度，会让加载阶段才出现 OOM。

共享还会引入延迟抖动。邻居运行长 Prefill 或大 Kernel 时，当前租户 TTFT 和 TPOT 会升高。在线 SLO 严格的服务通常使用整卡或 MIG；离线评测、低 QPS embedding 和可重试任务更容易接受时间共享。

共享故障要区分进程级和设备级。单个容器 OOM 可以由上层重建，非法访问或设备重置可能影响同卡其他进程。运行手册必须说明是否允许驱动重置、如何迁移其他租户，以及监控按哪一级告警。
## 调度 GPU 不等于调度显存

GPU 扩展资源是离散资源，显存是连续容量。请求一张卡后，Scheduler 不知道模型需要 18 GB 还是 78 GB。平台可用型号和显存标签做预筛选，应用启动时再检查真实余量，Gateway 根据 Cache 预算做请求准入。

一个 20 GB 模型在 24 GB 卡上可能装不下，因为权重之外还要有 Context、工作区和 Cache。另一个 10 GB 模型在 16 GB MIG Profile 中可能足够，但同样的模型在长上下文和多并发下仍 OOM。资源合同要写模型、上下文和并发，而不只是“能启动”。

调度共享 GPU 时，设备插件公开的单位可能是时间片，显存仍不受 Kubernetes Limit 直接保护。应用需要知道自己可见的物理设备和预算，或由平台采用 MIG 等硬件隔离。没有这种边界，不应承诺多租户互不影响。

节点已有进程也会改变余量。守护监控、持久化缓存、编译器和另一个 Worker 都可能占显存。空载基线、模型加载基线和最大请求峰值要分别采样，设备容量表只提供理论上限。

正确的调度设计把离散资源、连续容量和时间压力分层。Kubernetes 负责“放在哪里”，Serving Engine 负责“能否接这个请求”，Gateway 负责“租户是否有权和配额”。三者边界清楚，OOM 才能在更早一层变成拒绝。
## 扩缩容应该看什么信号

GPU utilization 是设备采样窗口内有 Kernel 的比例，不能单独代表用户延迟。Decode 可能显存带宽受限而 GPU utilization 看起来一般，或者 GPU 100% 但请求都已取消。扩缩容要把队列、活跃序列、Token 到达率、TTFT、TPOT 和显存余量结合。

队列长度适合表达“请求已经等待”，但不同 Token 量的请求成本差异大。按输入和预估输出 Token 计算工作量，再观察 waiting/running 比例，能比请求数更接近引擎压力。扩容控制器要平滑窗口，避免短暂突发反复创建 GPU Node。

GPU Node 扩容有长冷启动。云实例创建、驱动初始化、Device Plugin 注册、模型下载和 Warmup 都可能需要时间。Autoscaler 看到 Pending Pod 后才开始扩容，用户请求已经在 Gateway 队列等待。预测到达或预热池可以降低这段时间，但要承担空闲成本。

缩容不能只看一段时间 GPU 利用率低。先确认没有运行序列、队列为空、Cache 已释放、流量权重已移走，且 Node 上没有训练检查点或重要缓存。Drain 过程要允许长请求完成或被取消。MIG 重配置和时间共享还需要额外的租户迁移。

扩缩容指标按层设告警：Gateway 队列超时影响用户，Engine running 上限触发准入，Node Pending 说明供给不足，GPU 温度或错误说明硬件风险。指标都要带模型、版本、租户和设备标签，避免把一个大模型的压力平均到整个集群。
## Scheduler 的过滤和打分怎样决定最终 Node

Scheduler 先做过滤。Node 必须有足够的 CPU、内存和扩展 GPU 资源，满足 Node Selector、Affinity、Taint、Volume 拓扑、端口和 Pod 级约束。任何一项不满足，Node 直接被排除。过滤后的候选数量为零，Pod 保持 Pending，不会因为“某台看起来很空”而强行绑定。

候选不止一个时，Scheduler 或插件进行打分。资源均衡、亲和性偏好、拓扑、镜像本地性和自定义评分会影响排序。评分不是容量证明。一个有本地模型缓存的 Node 可能得分更高，但它的可用显存仍要由设备分配和应用检查。

调度扩展可以通过 Scheduler Framework、调度插件或独立调度器加入 GPU 拓扑信息。自定义逻辑要维护版本和失败回退。插件报错时，Pod 应保持 Pending 并给出事件，不能静默落到没有通信能力的 Node。

Pod 一旦绑定，默认不会因为另一台 Node 变得更合适而自动迁移。迁移需要控制器删除重建、Descheduler 或发布系统参与。模型冷启动长，频繁重新调度会增加下载和预热成本。节点标签变化后，已运行 Pod 也不自动重新检查所有合同。

调度记录包括候选 Node 数、过滤原因、最终 Node、资源名、设备 UUID 和绑定时间。没有这些字段，排查“为什么落在这台卡”只能凭当前标签猜测。
## Device Plugin 健康状态怎样影响可调度资源

插件注册资源后还要持续上报设备健康。硬件错误、驱动失联或插件重启可能让 Allocatable 减少，新的 Pod 不应继续分配坏设备。已经运行的 Pod 是否被终止取决于插件和平台策略，资源数变化本身不等于应用已经安全迁移。

设备健康与显存压力不同。显存接近上限是应用容量问题，通常由准入和 Engine 处理；GPU Xid、ECC 或设备重置是硬件与驱动问题，可能影响同卡进程。两个信号要分别告警和恢复，不能把所有“GPU 不好用”都交给 Autoscaler。

Device Plugin DaemonSet 重启期间，kubelet 可能暂时没有扩展资源注册。已有 Pod 是否继续取决于 Runtime 与设备节点，新的 Pod 会 Pending。发布插件前要分批重启 Node，观察 Allocatable、测试 Pod 和业务流量。

MIG 重配置会改变设备实例和资源名。插件重新注册后，旧 Pod 的设备身份可能失效。运维先 Cordon、Drain，再重配 MIG、启动插件和验证每个 Profile，最后放回流量。直接在线切 Profile 会把正在运行的进程置于未知状态。

监控应记录插件注册时间、资源总数、健康数、Allocate 错误和 Node Condition。只看 Node Ready 会漏掉“节点活着但没有 GPU 资源”的状态。
## 多租户怎样在设备和请求之间分配公平性

Kubernetes ResourceQuota 可以限制一个 Namespace 的 GPU 资源请求，但它不认识租户 Token、模型大小和请求优先级。在线推理的公平性还要在 Gateway 和 Engine 队列实现。租户 A 请求很多短 Prompt，租户 B 少量长 Prompt，按 Pod 数量配额会产生不同 GPU 压力。

平台可以为租户分配模型、GPU Profile、并发、输入 Token 和输出 Token 预算。Gateway 先做身份与配额判断，Scheduler 负责 Pod 位置，Engine 负责活跃序列和 KV Block。租户不应直接传本地模型路径、设备索引或任意并行参数。

优先级决定过载时谁先获得队列位置。在线请求高于离线评测，但高优先级也要有上限，防止一个租户持续挤占所有 GPU。低优先级任务支持取消、检查点和重试，才能被抢占。抢占事件、排队时间和完成率进入租户账单与审计。

共享 GPU 时，公平性还包括显存峰值和延迟干扰。时间片只限制执行机会，不一定限制权重与 KV Cache 总量。MIG 给出更明确的容量边界，但 Profile 数量有限。选择共享模式要把租户威胁模型、SLO 和成本一起评估。

公平性不是简单轮询。长请求占用的 KV Block 时间更久，先到先得可能让短请求队头阻塞。Engine 可按 Token、截止时间或抢占策略调度，平台需要记录策略和取消代价。无论采用哪种策略，都应有有界队列和明确的 429、503 或过载错误。
## 调度和推理指标怎样关联

调度层记录 Pod Pending 时长、绑定耗时、Node 资源和扩容等待。容器层记录启动、模型下载、加载、Warmup 与 Ready 时间。引擎层记录队列、Batch、KV Cache、TTFT、TPOT、吞吐、抢占和取消。用户层记录请求成功率、错误、SLO 和成本。

同一条时间线需要 Deployment Revision、Pod UID、Node 名、GPU UUID、模型 Revision 和请求 ID。Pod 重建后名称可能相似，GPU MIG 实例也会变化，缺少这些标签会把不同运行混在一条曲线中。

一个典型现象是 GPU utilization 低、Pod Ready、但 TTFT 很高。可能请求在 Gateway 等待 Token 配额，或 Engine waiting 队列很长，不能直接判定 GPU 供给不足。另一现象是 GPU 100%、TTFT 正常但 TPOT 变差，可能内存带宽或邻居干扰成为限制。

扩容策略要用窗口和滞后。队列超过阈值触发扩容，连续稳定低于阈值才缩容，并为 Node 冷启动预留时间。冷启动过程中已有请求不能无限堆积，Gateway 需要返回有界超时或降级模型。策略参数来自历史分布和隔离压测，不从一张截图拍板。

容量报告应把“需要更多 GPU”和“当前设备坏了”分开。前者扩大 Node Pool，后者隔离 Node 或恢复驱动。把硬件错误当成需求扩容，只会不断增加坏节点成本。
## 调度失败和恢复怎样留下证据

如果 Pod 长期 Pending，先保存 Pod Spec、Scheduler 事件、Node Allocatable、标签、污点和 PVC 状态。不要先修改多个约束。一次只改变资源、标签或拓扑中的一个变量，再观察过滤原因是否变化。

如果 Pod 已绑定但设备注入失败，保存 kubelet、Runtime、Toolkit 和 Device Plugin 日志，以及容器创建事件。若只有某一镜像失败，比较镜像库、RuntimeClass 和环境；若所有 Pod 失败，检查 Node 组件和驱动。

如果容器能看到 GPU 但 OOM，读取每卡权重基线、激活、工作区、KV Cache 和邻居进程。调整请求上限、上下文或模型前，确认错误发生在加载、Warmup、Prefill 还是 Decode。修复后用相同请求集重复，不能仅以 Pod Ready 判定。

如果节点驱动报错，先停止新调度，按租户与优先级迁移或取消工作。Drain 前确认 PodDisruptionBudget 和检查点，保留 GPU UUID、错误码和时间。节点恢复后从宿主、容器、模型、协议四层验收，再解除 Cordon。

回滚调度配置也要有版本。恢复旧 Node Pool、旧 MIG Profile 或旧资源名后，Deployment 可能仍引用新资源，必须同时恢复 PodSpec、标签、插件和 Gateway 路由。所有变更记录镜像、模型和集群版本，避免只回滚一半。

MIG 配置变更还要先计算实例数量与模型分布。一个 Profile 能容纳权重不代表能容纳最大 KV Cache，多个实例同时 Warmup 还会竞争物理卡带宽。候选环境应分别启动单实例、全部实例和混合模型，记录每个实例的显存、TTFT、TPOT、错误和回收。没有这些数据，只能说“资源名可调度”，不能说“租户隔离有效”。
## 一个调度决策表怎样帮助选方案

下面的表格把常见任务放到资源边界中。它是选择入口，不是性能承诺，具体设备、引擎和安全要求仍要验证。

| 工作负载 | 首选资源模式 | 主要理由 | 需要补的验证 |
| --- | --- | --- | --- |
| 大模型在线生成 | 整卡或多卡独占 | 容量和延迟较稳定 | 权重、KV Cache、拓扑、取消 |
| 多个小模型服务 | MIG 或固定切片 | 给每个实例明确容量 | Profile、Kernel、显存隔离 |
| 低 QPS embedding | 时间共享 | 设备填充率更高 | 延迟抖动、显存总和、邻居影响 |
| 多卡训练 | 整卡加拓扑约束 | 需要通信带宽和稳定设备 | NCCL、NUMA、故障恢复 |
| 离线评测队列 | 共享或可抢占 | 能接受等待和重试 | 检查点、抢占、配额 |

阅读表格时先看“主要理由”，再看验证列。表格无法表达一个模型的真实 Token 分布，也不能证明共享安全。平台需要把选择结果转成 Node Pool、资源名、Label、Taint、优先级与监控规则。
## 一次 GPU 请求从 Pending 到扩容怎样推演

输入是两个在线副本各请求一张 80 GB GPU，集群当前只有两张卡且每张已被旧版本占用。新版本 Deployment 创建后，Scheduler 发现没有可分配资源，Pod 保持 Pending，事件记录 `Insufficient nvidia.com/gpu`。此时没有容器日志，模型和探针都还没执行。

Autoscaler 观察未调度 Pod，并根据 GPU Node Pool 模板创建一台带相同驱动、标签、Taint 和 Device Plugin 的 Node。Node 加入后，Allocatable 出现一张 GPU，Scheduler 绑定一个 Pod。kubelet 通过 Runtime 注入设备，模型加载和 Warmup 完成，Readiness 成功，Gateway 才增加流量权重。

假设第二个 Pod 被标签误导到 16 GB MIG Profile。它也可能成功创建容器，但权重或 KV Cache 在加载阶段 OOM，Startup 失败，Endpoint 不出现。调度事件不会告诉你模型装不下，显存账本和应用日志才是失败证据。修正 Affinity 或 Profile 后再启动。

在线流量进入后，长 Prompt 使 waiting Token 和 KV Cache 迅速增长。GPU utilization 只有 70%，但 p95 TTFT 超过目标，队列继续增加。扩容信号应来自队列和 Token 压力，不能因为 utilization 未到 90% 就等待。新 Node 冷启动完成前，Gateway 按 Token 预算拒绝超限请求。

流量稳定下降后，旧 Node 上 running 和 waiting 都为零，Cache 回基线，Gateway 移走权重。Drain 成功，Node 才允许缩容。验证包括新旧 Pod 的模型 Revision、请求成功率、取消回收和每卡显存，不能只看节点数量变回原值。

本次推演没有在真实集群创建 Node 或 GPU Pod。实际执行需要记录集群版本、插件配置、Node 型号、MIG Profile、扩容时间、模型加载时间和 SLO。整卡、共享与 MIG 的选择也必须在目标硬件上补充干扰和故障测试。

如果把扩容阈值只设为 GPU 利用率 80%，这次长 Prompt 场景可能不会触发扩容，因为设备受显存带宽和队列限制，利用率采样没有达到阈值。增加 Token 到达率和 waiting 序列后，信号才覆盖真实压力。验证结果要写“哪一个信号触发了动作”，不能只写“扩容成功”。

缩容前还要验证新旧 Pod 的设备身份没有混淆。旧 Pod Drain 后，GPU UUID 或 MIG Instance 应不再有进程，Cache 与队列回到基线，测试请求只进入新 Revision。否则节点数变少了，旧进程仍占卡，下一次调度依然会 Pending。

审查记录还要保留 Pending、Ready、开始接流量和开始缩容四个时间点，才能把调度等待、冷启动和业务排队区分开。
