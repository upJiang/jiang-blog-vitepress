---
title: Kubernetes 是什么？它怎样让容器服务保持在期望状态
description: 从声明式期望状态与调谐开始，解释控制面、Node、Pod、Deployment、Service、探针、配置、存储和一次发布过程。
category: devops
part: 第五部分：Kubernetes AI Infra
chapter: 22
tags:
  - Kubernetes
  - Pod
  - Deployment
prerequisites:
  - 理解 Linux 进程、网络和容器
  - 会阅读 YAML
outcomes:
  - 解释 Kubernetes 的调谐模型和核心对象
  - 沿对象状态定位模型服务为何没有接到流量
practice:
  type: walkthrough
  result: 完成一张 AI 工作负载对象图
  verify:
    - 对象之间的控制与选择关系明确
    - Kubernetes 不被描述为理解模型语义
evidence: official
updated: 2026-08-18T00:00:00.000Z
---
# Kubernetes 是什么？它怎样让容器服务保持在期望状态

Docker 能启动一个模型服务容器，但生产环境还要处理机器故障、副本数量、滚动更新、服务发现、配置、资源争用和健康检查。手工登录每台服务器执行命令，规模稍大就会出现状态不一致：某台仍运行旧镜像，某个进程退出后没人重启，负载均衡还在把请求发给加载失败的实例。

Kubernetes 用 API 对象记录“希望系统是什么样”，再由控制器不断读取现状并尝试靠近期望。它不理解模型效果，也不知道一次生成是否正确。它能管理的是容器、副本、网络入口、资源声明、配置和状态转换。把这条边界讲清，才能知道 Pod 显示 Running 为什么仍然可能无法服务。

::: info Kubernetes 的准确含义

Kubernetes 是用于编排容器化工作负载的开源系统。用户通过 API 提交期望状态，例如运行三个使用某镜像的副本；控制面保存对象并进行调谐，Node 上的组件负责把 Pod 变成真实容器。

Kubernetes 不是容器运行时，也不是云主机。它通常调用 containerd、CRI-O 等运行时创建容器，运行在虚拟机或物理机组成的集群上。它提供编排原语，应用仍要自己实现业务健康、数据一致性、取消和安全边界。

:::

## Kubernetes 为什么使用期望状态而不是命令清单

命令式管理告诉机器“现在启动一个容器”。命令成功以后，进程可能退出、机器可能重启，原命令不会自动再次执行。声明式管理提交“始终希望有三个副本”，控制器发现只剩两个时，会创建新的 Pod。重点从一次命令结果变成持续比较期望和现状。

期望状态保存在 API 对象的 `spec` 中，控制器和节点报告的观察结果通常进入 `status`。两者可能暂时不同。Deployment 的 `spec.replicas` 是 3，`status.readyReplicas` 只有 1，表示调谐还没完成或遇到失败，并不表示 API 写入失败。

调谐循环会重复运行，因此操作要尽量幂等。控制器看到缺少 Pod 就创建，看到多余 Pod 就删除，看到目标已经满足就等待下一次事件。多个控制器分别负责副本、节点、Endpoint、证书或扩缩容，它们通过对象字段协作，不依赖一段只运行一次的脚本。

这种模型解决机器变化快和操作可恢复的问题，也带来最终一致的观察方式。刚提交 Deployment 后立刻查询，Pod 可能还没创建；Pod 创建后镜像可能正在拉取；容器启动后模型仍可能加载。运维需要沿对象状态等待，而不是把 API 返回 201 当成服务就绪。

Kubernetes 的边界是它只能调谐已声明和可观察的状态。若 Readiness 只检查端口，模型内部加载失败但 HTTP 仍返回 200，控制面会把错误实例当成 Ready。正确的应用探针和状态接口仍由服务实现。

例如 Deployment 的期望副本数是 2，Scheduler 先为 Pod 找 Node，kubelet 再拉取镜像并启动容器，应用把模型加载完成后才把 Readiness 变为成功。期间 API Server 可能已经返回对象创建成功，Service 也可能暂时没有可用 Endpoint。读者可以把“对象已写入、Pod 已运行、实例已就绪、请求已成功”当成四个不同证据。

Kubernetes 负责持续调谐这些对象，却不理解模型的 Token、Prompt 或质量。它能重启退出的容器、重新分配副本和更新 Service Endpoint，不能判断模型回答是否有引用，也不能替 Gateway 结算一次流式请求。AI 平台把应用状态做成探针和指标，控制面才有足够事实做出放置和恢复动作。

## API Server、etcd、Scheduler 和 Controller Manager 各做什么

API Server 是集群控制面的入口。`kubectl`、控制器和其他组件都通过它读取或修改对象。它负责认证、授权、Admission、Schema 校验和持久化前的处理。直接修改 etcd 绕过 API Server 会破坏契约，不是正常运维方式。

etcd 是保存 Kubernetes API 状态的一致性键值存储。Deployment、Pod、Secret 元数据和 Lease 等对象最终写入其中。etcd 不保存容器文件系统和模型权重，也不执行调度。备份 etcd 能恢复控制面对象，不能替代数据库、对象存储和模型制品备份。

Scheduler 观察尚未绑定 Node 的 Pod，根据资源请求、亲和性、污点、拓扑等约束选择 Node，再写入绑定结果。它不负责在节点启动容器，也不会等待模型加载。Pod Pending 常发生在这里，事件会给出资源不足或约束不满足的原因。

Controller Manager 运行许多控制器。Deployment Controller 创建 ReplicaSet，ReplicaSet Controller 创建或删除 Pod，Node Controller 处理节点状态。控制器只操作 API 对象，不直接 SSH 到节点。Cloud Controller Manager 还可以连接云负载均衡、磁盘和节点 API。

控制面组件的分工可以从对象写入和 Watch 关系看出来。API Server 可访问不代表 Scheduler 正常；Scheduler 正常也不代表 Node 能拉镜像。健康检查和故障域要分别覆盖这些角色。

## Node、kubelet 和容器运行时怎样把 Pod 变成进程

Node 是运行工作负载的机器。每个 Node 通常有 kubelet、容器运行时和网络组件。kubelet 观察已绑定到本节点的 PodSpec，调用 CRI 接口让运行时拉取镜像、创建 Sandbox 和容器，再把容器状态、探针结果和资源情况报告给 API Server。

容器运行时负责镜像与容器生命周期。containerd 创建 Namespace、cgroup 和进程，Kubernetes 不亲自实现这些 Linux 隔离。Pod Sandbox 提供共享网络等基础环境，同一 Pod 的容器可以通过 localhost 通信，也共享部分 Namespace 与 Volume。

CNI 插件为 Pod 配置网络，给它分配 IP 并设置路由或隧道。kube-proxy 或数据平面实现 Service 转发，具体实现可能是 iptables、IPVS 或 eBPF。Pod 启动但网络插件失败时，容器可能卡在创建 Sandbox 之前。

kubelet 还执行 Startup、Readiness 和 Liveness 探针，管理 Volume Mount，并根据 Pod 终止流程向容器发送信号。节点磁盘压力、内存压力和 PID 压力会变成 Condition，调度或驱逐策略据此行动。Node Ready 只是节点心跳和基础状态，不保证每个设备插件都正常。

AI 节点还会安装 GPU Driver、Container Toolkit 与 Device Plugin。它们在后两篇单独展开。基础关系不变：Scheduler 先绑定 Pod，kubelet 再根据声明请求本地资源并启动容器。

## Pod 是什么，为什么它不是一台小虚拟机

Pod 是 Kubernetes 可以调度的最小工作负载单元。一个 Pod 包含一个或多个紧密协作的容器，共享同一个网络身份和声明的 Volume。最常见情况是一个应用容器，加上需要同生命周期的 Sidecar 或初始化容器。

Pod 不是虚拟机。容器共享 Node 内核，Pod 没有完整独立操作系统。Pod IP 也不是永久地址；Pod 重建后 UID 和 IP 会变化。客户端不应把某个 Pod IP 写死，稳定访问要通过 Service 或其他服务发现机制。

Pod 的 Phase 只有 Pending、Running、Succeeded、Failed、Unknown 等粗粒度。Running 表示至少一个容器正在运行或启动/重启过程中，不表示应用 Ready。容器状态、Condition、Restart Count、事件和日志才解释具体情况。

一个 Pod 可以有 Init Container，按顺序完成模型元数据检查、配置生成或权限准备。大模型制品下载通常耗时长，是否放 Init Container 要看重试、共享缓存和并发下载设计。Init 失败时主容器不会启动，证据在 Init 状态而不是应用日志。

Pod 是易失对象。Deployment 更新、节点故障或驱逐都会创建新 Pod，应用不能把唯一状态只写在容器可写层。模型缓存可以用节点盘或 PVC 加速，真实版本身份仍要从制品清单恢复。

## Deployment、ReplicaSet 和 Pod 怎样组成副本控制

Deployment 管理一组无状态或可替换的 Pod 版本。它的 Pod Template 包含镜像、命令、环境、资源和探针。Template 改变后，Deployment 创建新的 ReplicaSet，并按更新策略逐步增加新副本、减少旧副本。

ReplicaSet 保证与 Label Selector 匹配的 Pod 数量。Deployment 通常是它的上层所有者。手工删除一个 Pod，ReplicaSet 会补一个；手工直接修改由 Deployment 管理的 ReplicaSet，下一次调谐可能被覆盖。运维应修改拥有期望状态的上层对象。

Selector 是控制关系的核心。Deployment 的 Selector 必须与 Pod Template Label 对应，且创建后通常不能随意改变。标签过宽可能误选其他 Pod，过窄则控制不到自己的副本。Service 也用 Selector 选择 Pod，但它与 Deployment 没有直接所有权关系。

滚动更新参数 `maxUnavailable` 和 `maxSurge` 决定新旧副本并存数量。模型服务冷启动长，若 Startup 与 Readiness 没设计好，新 Pod 可能迟迟不接流量；资源又被新旧模型同时占用，集群需要有峰值容量。GPU 独占时，多一个 Surge Pod 就需要多一张可调度 GPU。

Deployment 适合可替换实例。需要稳定网络身份和有序存储的工作负载可能使用 StatefulSet；一次性任务使用 Job；每个节点一个组件使用 DaemonSet。对象选择取决于生命周期，不取决于“是不是 AI”。

## Service 和 EndpointSlice 怎样把变化的 Pod 变成稳定入口

Service 为一组 Pod 提供稳定虚拟 IP、DNS 名和端口。它通过 Selector 找到 Pod，控制器再生成 EndpointSlice，记录可接流量的 IP 和端口。客户端访问 Service 名，不需要知道后端 Pod 重建后的新地址。

Service 不负责创建 Pod，也不检查模型语义。没有 Endpoint 时，先检查 Selector 是否匹配、Pod 是否 Ready、端口是否正确。Deployment 三个 Ready Pod 不代表某个 Service 一定选中它们；Service Selector 写错一个 Label 就会得到空集合。

Readiness 会影响 Endpoint 的 Ready 状态。Pod 容器启动、端口监听，但 Readiness 仍失败时，通常不会接收普通 Service 流量。这个行为用于加载模型和 Warmup，避免把请求送给只完成进程启动的实例。

Service 的 `targetPort` 是 Pod 容器实际监听端口，`port` 是 Service 对内暴露端口。命名端口能减少数字重复，但名称也必须匹配。`ClusterIP` 只在集群内，`NodePort` 和 `LoadBalancer` 扩大入口，安全策略要随范围变化。

Headless Service 不分配普通 ClusterIP，DNS 返回 Pod 地址，适合某些有状态发现或集群通信。普通模型 API 通常更需要负载均衡入口。选型前先确定客户端要稳定 VIP、直接发现副本，还是通过专门 Gateway 路由。

## Ingress、Gateway 和反向代理位于哪一层

Ingress 是描述 HTTP/HTTPS 路由的一类 API，需要 Ingress Controller 才会生效。对象可以把域名和路径映射到 Service，Controller 再配置 Nginx、Envoy 或云负载均衡。只创建 Ingress 资源而集群没有对应 Controller，不会自动出现公网入口。

Gateway API 提供更清楚的角色和路由模型，能表达 Listener、HTTPRoute 与跨命名空间授权。具体支持仍取决于实现。LLM Gateway 还会在这层或其后处理 API Key、模型别名、Token 限额、请求取消与计费，这些不是 Kubernetes Ingress 自动提供的能力。

请求链通常是外部负载均衡、Ingress/Gateway Controller、Service、EndpointSlice、Pod。每一跳都有自己的地址、TLS 和超时。SSE 需要代理关闭不合适的缓冲并保持足够长的读取超时；Pod 正常不代表外层代理配置正确。

NetworkPolicy 控制 Pod 间允许的网络流量，前提是 CNI 实现支持。它不替代应用鉴权，也不管理外部用户余额。模型 Serving Pod 可以只允许 Gateway、监控和受控运维来源访问，避免绕过限流直接调用。

入口故障定位按链路分层：DNS 是否解析，LoadBalancer 是否有地址，Controller 是否接受路由，Service 是否有 Endpoint，Pod 是否 Ready，应用是否返回正确协议。把所有 502 都归为“Pod 挂了”会漏掉前几层。

## ConfigMap、Secret 和环境变量怎样进入容器

ConfigMap 保存非敏感配置，Secret 保存需要受控访问的数据。两者都可以作为环境变量或 Volume 文件进入 Pod。Secret 在 API 中的 Base64 只是编码，不等于加密；集群还要配置 etcd 静态加密、RBAC、审计和外部 Secret 管理。

环境变量在进程启动时读取，ConfigMap 更新后不会自动改变已经存在的环境。Volume 投影可能在一段时间后更新文件，但应用是否重新加载由自己决定。需要稳定发布时，常用配置内容 Hash 进入 Pod Template，内容变化触发新 ReplicaSet。

模型 API Key、对象存储凭证和数据库密码不应写进镜像或公开 YAML。Pod 的 ServiceAccount 也不应获得读取整个命名空间 Secret 的权限。优先使用短期工作负载身份或外部 Secret Provider，并限制哪些 Pod 能引用。

配置有版本和 Schema。把不存在的模型路径写进 ConfigMap，Kubernetes 只会成功挂载字符串，不会知道业务错误。Startup Probe、启动日志和配置校验命令要把错误变成 Pod 可观察状态。

删除 Secret 也不会让已读取值立刻从进程内存消失。凭证轮换需要新旧重叠窗口、应用重载和回滚方案。Kubernetes 负责分发，业务系统负责真实认证和轮换语义。

## CPU、内存请求与限制怎样影响调度和运行

Resource Request 表示 Scheduler 为 Pod 预留和选择 Node 时使用的需求。Limit 表示容器可使用的上限或运行时约束。CPU Request 影响调度和份额，CPU Limit 可能造成 Throttling；内存超过 Limit 常由内核 OOM Kill，容器被重启。

只写 Limit 不写 Request，或反过来，会受到命名空间策略和 QoS 影响。模型服务要把 CPU Tokenize、主存加载、共享内存和 GPU 需求都写出来。GPU 扩展资源通常 request 等于 limit，以整数设备分配，具体由 Device Plugin 实现。

临时存储也要考虑。模型下载到容器层可能占满 Node 磁盘并触发驱逐。`emptyDir` 可以设置大小和介质，内存型 `emptyDir` 会计入内存。持久缓存使用 PVC 或节点缓存时，要说明一致性和清理。

Request 是容量合同，不是性能保证。Node 上其他工作负载、NUMA、磁盘和网络仍会影响延迟。对 AI 服务而言，CPU Request 太低会让 GPU 等 Tokenizer，内存太低会在权重加载到 Device 前被 OOM Kill。

事件中的 `Insufficient cpu`、`Insufficient memory` 或扩展资源不足属于调度阶段；容器 `OOMKilled` 属于运行阶段。两种“资源不够”证据位置不同，修复也不同。

## Startup、Readiness 和 Liveness 探针有什么区别

Startup Probe 保护慢启动应用。在它成功之前，Liveness 和 Readiness 的失败不会按普通方式处理。大模型下载、加载权重、建立通信和 Warmup 可能耗时很长，Startup 时间窗应覆盖合理上限，又不能无限掩盖卡死。

Readiness 回答“现在是否可以接流量”。模型加载完成、最小推理成功、依赖可用并且实例未 Drain 后才应 Ready。Readiness 失败通常不会重启容器，只把 Endpoint 移出流量。过载是否暂时 NotReady 要谨慎，频繁抖动会让剩余副本更忙。

Liveness 回答“进程是否已经无法自行恢复”。只检查 TCP 端口会漏掉 GPU Worker 死亡；把外部数据库短暂失败写进 Liveness 又会造成所有副本重启。探针应验证进程内部不可恢复状态，依赖故障用 Readiness 或降级表达。

三种探针的失败动作不同，不能指向同一个无条件 200 的路径。探针自身要轻量、有超时，不发昂贵生成请求。真实模型路径可以在 Startup 或后台自检中低频执行，再把结果汇总到健康状态。

终止时，Pod 先进入 Terminating，Endpoint 移除，PreStop 和 SIGTERM 让应用停止接新请求并 Drain。`terminationGracePeriodSeconds` 要覆盖最长允许请求或取消策略。超时后 kubelet 会强制结束，未写完的流式请求需要明确失败语义。

## Namespace、ServiceAccount 和 RBAC 怎样划分权限

Namespace 给一组名字和策略划出逻辑范围。不同 Namespace 可以各有一个同名 Service，完整 DNS 会包含 Namespace。它方便按团队、环境或租户组织对象，但不是强安全虚拟机；Node、CRD 和部分资源仍是集群范围，网络与存储也需要额外策略。

Pod 通过 ServiceAccount 获得访问 Kubernetes API 的工作负载身份。默认情况下不应让模型服务读取所有 Pod、Secret 或执行创建资源。Role 描述某个 Namespace 中允许的资源与动词，RoleBinding 把权限授给用户、组或 ServiceAccount。集群范围权限使用 ClusterRole 与相应绑定。

最小权限要从应用真实调用推导。一个只提供推理 API 的 Pod 通常不需要调用 Kubernetes API；一个模型控制器可能需要读取自定义资源和更新状态，却不需要删除 Secret。使用通配符会让容器被攻破后的影响扩大。权限检查可以用 `kubectl auth can-i`，还要测试明确拒绝的动作。

ResourceQuota 和 LimitRange 在 Namespace 维度限制总资源或提供默认值。它们能防止某一环境无限创建 CPU、内存和部分扩展资源，但不理解 Token、模型大小和业务预算。GPU 资源是否被配额计数要看资源名和策略配置。

Namespace 删除会级联清理其中对象，是高风险操作，不应用作普通应用重启。生产、测试和临时验证要有清楚边界，自动化脚本必须显式传入 Namespace。审计日志记录谁对哪个对象执行了什么请求，不能只保留容器日志。

## Volume、PV 和 PVC 怎样保存容器之外的数据

Volume 把存储挂载进 Pod。`emptyDir` 与 Pod 生命周期绑定，Pod 被重新创建后内容消失；ConfigMap、Secret 和 Downward API 属于投影数据；CSI Volume 可以连接块存储、文件系统或对象存储适配。选哪种取决于数据生命周期和访问模式。

PersistentVolume 是集群可用存储的表示，PersistentVolumeClaim 是工作负载提出的容量和访问模式请求。StorageClass 可以动态创建后端卷。PVC 绑定成功只说明存储资源准备好，挂载权限、文件格式和应用读写仍可能失败。

模型权重可以放镜像、对象存储、PVC 或节点缓存。大模型塞进镜像会让拉取和发布很重；共享文件系统便于多个 Pod 读取，但冷启动受带宽影响；节点缓存速度快，却需要校验版本和清理。无论放哪儿，模型 ID、Revision、文件 Hash 和 Tokenizer 都要形成制品身份。

多个 Pod 同时读取同一 PVC，需要后端支持对应 Access Mode。`ReadWriteOnce` 的语义与具体 CSI 拓扑有关，不能把名称简单理解为“全世界只能一个 Pod”。跨可用区挂载还受 Volume Topology 限制，Scheduler 会同时考虑 Pod 和卷的位置。

PVC 不是数据库备份。卷删除策略、快照、恢复测试和应用一致性要单独设计。Serving 缓存通常可以重建，数据库和用户文档则需要可靠备份。把两类数据放同一个卷，会让清理缓存变成危险操作。

## Node Selector、亲和性和污点怎样限制放置位置

Scheduler 先检查硬资源，再处理 Node Selector、Node Affinity、Pod Affinity、Anti-Affinity、Taint/Toleration 和拓扑分布。Node Selector 是简单标签匹配，例如要求某 CPU 架构；Node Affinity 能表达必须满足和尽量满足的多组条件。

Taint 表示 Node 拒绝没有相应 Toleration 的 Pod。专用 GPU Node 常加 Taint，避免普通工作负载占用昂贵节点。Toleration 只允许 Pod 被考虑，不保证它一定被调度到该 Node，还要配合 Affinity 或资源请求。

Pod Anti-Affinity 可以让副本分散到不同 Node 或可用区，降低单节点故障影响。Topology Spread Constraint 更直接地约束标签匹配 Pod 在拓扑域中的差异。严格约束提高可用性，也可能在资源紧张时让 Pod 长期 Pending。

优先级和抢占用于资源竞争。高优先级 Pod 可能让低优先级 Pod 被驱逐，为自己腾出调度空间。模型服务的在线副本、离线评测和训练任务可以有不同优先级，但抢占会中断真实工作，必须让低优先级任务支持恢复。

这些策略写在 PodSpec 后就成为期望状态的一部分。事件里的 `node(s) didn't match affinity`、`untolerated taint` 和 `topology spread` 是直接证据。随意给所有 Pod 增加 Toleration 只会绕过隔离，不能解决资源模型。

## 滚动发布、暂停和回滚分别改变什么

Deployment 更新 Pod Template 后产生新的 Revision 和 ReplicaSet。RollingUpdate 按 `maxSurge`、`maxUnavailable` 推进，新 Pod Ready 后才逐步替换旧 Pod。`progressDeadlineSeconds` 用于报告进度失败，不会自动替应用证明新版本正确。

暂停 rollout 会停止继续处理新的 Template 变化，适合合并多项修改或暂时调查；它不会自动停止当前所有容器。回滚把 Deployment Template 恢复到历史 Revision，控制器再执行一次新的调谐。旧 ReplicaSet 是否还保留受 RevisionHistoryLimit 影响。

Kubernetes 原生 Rollout 判断主要看副本与 Ready 状态。新镜像返回错误模型、用错 Tokenizer 或计费异常，只要探针成功也可能完成发布。业务验证要通过测试租户、固定输入、模型版本字段和协议合同补上。

模型服务滚动更新经常遇到容量峰值。旧模型占一张 GPU，新 Pod 还需要一张，资源不足时新 Pod Pending，旧 Pod 又不能先删。可以预留 Surge 容量、使用 `maxUnavailable` 接受暂时少副本，或者走独立候选后切 Gateway。选择要写明可用性代价。

回滚前要确认配置和数据仍兼容。新版本若修改数据库或缓存格式，仅换回旧镜像可能无法运行。Deployment 管理容器版本，不管理业务 Schema 的向后兼容。发布记录要把镜像 digest、配置 Hash、模型 Revision 与迁移状态绑定。

## 一份最小 Deployment 和 Service 怎样连接

下面的 YAML 只展示对象关系，镜像、端口、资源和探针路径必须替换。它没有在真实集群执行，也没有包含 GPU 与模型卷。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: model-api
  template:
    metadata:
      labels:
        app: model-api
    spec:
      containers:
        - name: api
          image: registry.example/model-api@sha256:replace-me
          ports:
            - name: http
              containerPort: 8000
          resources:
            requests:
              cpu: "2"
              memory: 4Gi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: model-api
spec:
  selector:
    app: model-api
  ports:
    - name: http
      port: 80
      targetPort: http
```

Deployment Selector、Pod Label 和 Service Selector 使用同一 `app` 值。容器 Ready 后，EndpointSlice 才会出现 Pod IP，Service 80 端口转到容器 8000。若把 Pod Label 改成 `model-api-v2` 而 Service 未改，Deployment 仍可能健康，Service 却没有后端。

静态验证可以用 YAML 解析器、`kubectl apply --dry-run=client` 和集群 Schema 工具。Server-side dry-run 还会经过目标集群的 Admission，但它会访问集群。真正运行验证需要隔离命名空间，观察 rollout、Endpoint 和请求。

## 怎样用对象状态和事件定位失败

排查从拥有期望状态的对象开始。`kubectl get deployment` 查看期望、副本与可用数，`kubectl describe deployment` 查看 Condition 和事件；再找到对应 ReplicaSet 与 Pod。直接从某条容器日志开始，容易漏掉 Pod 根本没被调度、镜像没拉到或 Init Container 失败。

Pod Pending 时读取 Scheduler 事件和 PodSpec，确认资源、Affinity、Taint、PVC 与 Admission。Pod 进入 Running 但反复重启时，查看各容器的当前与上一次状态、退出码、Reason 和 previous logs。`CrashLoopBackOff` 是重试退避现象，不是根因名称。

Pod Running 却无流量时，检查 Ready Condition、探针事件、Service Selector 和 EndpointSlice。Endpoint 已存在但请求失败，再查 NetworkPolicy、端口、应用协议和代理。每一步都要求上一步有证据，避免在网络、容器和应用之间随机试命令。

下面是一组只读命令顺序。资源名和 Namespace 需要替换，输出可能包含内部地址，公开前要脱敏。

```bash
kubectl -n demo get deploy,rs,pod,svc,endpointslice
kubectl -n demo describe pod model-api-xxxxx
kubectl -n demo logs model-api-xxxxx -c api --previous
kubectl -n demo get events --sort-by=.lastTimestamp
```

第一条建立对象关系，第二条给出调度、拉取和探针证据，第三条只在容器曾重启时读取上一次日志，第四条补齐时间顺序。日志没有错误不代表 Pod 已 Ready，事件没有新条目也不代表应用响应正确。最终仍需从真实入口发最小请求，并保存状态码、响应模型版本和时间。

事件有保留时间，容器日志也可能随重建消失。生产集群要把事件、审计和应用日志发送到持久系统，并保留 Pod UID、Node、镜像 digest 与 request ID。只保存 Pod 名会在重建后混淆两个不同实例，时间线也无法复原。

## 一次提交怎样从 YAML 走到可访问服务

输入是上面的 Deployment 与 Service。客户端把对象提交给 API Server，认证、授权和 Admission 通过后写入存储。Deployment Controller 创建 ReplicaSet，ReplicaSet 创建两个 Pod，Scheduler 分别选择 Node。kubelet 拉取镜像、创建容器并运行 Readiness。

状态按对象逐步变化：Deployment observedGeneration 更新，Pod 从 Pending 到 Running，容器变为 Ready，EndpointSlice 加入两个地址。集群内客户端解析 `model-api` DNS，连接 Service 虚拟 IP，数据平面选择一个 Ready Endpoint，容器返回结果。这是成功输出。

现在把 Readiness 路径写错为 `/healthz-missing`。容器仍 Running，应用日志显示端口监听，Probe 记录 404，Pod Ready 为 false，EndpointSlice 没有可用地址。失败证据横跨 Pod Condition、事件和 Endpoint，而不是“网络坏了”。修正路径后新 Probe 成功，Endpoint 出现，测试请求返回预期模型版本。

验证还要删除一个 Pod，ReplicaSet 应补回；更新镜像 digest 后，观察新 ReplicaSet 创建且旧副本只在新副本 Ready 后减少；发送 SIGTERM 时实例先离开 Endpoint，再结束进程。若任何一步不符合，保留对象 YAML、事件、Condition、日志和请求输出。

Kubernetes 在这次推演中只保证对象调谐与流量边界。输出内容是否正确、Token 是否计费、取消是否释放 GPU 仍由模型服务和 Gateway 验证。控制面成功与业务成功需要两套证据。

两套证据要用同一镜像 digest、Pod UID 和请求时间关联，否则集群状态与业务响应可能来自不同版本，无法形成一次完整验证。

验证记录缺一项都要标明未执行。
