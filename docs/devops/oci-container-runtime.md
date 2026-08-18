---
title: 什么是镜像和容器？OCI、Namespace 与 cgroup 如何隔离进程
description: 从一份 OCI 镜像到容器进程，解释文件层、rootfs、运行时、Namespace、cgroup、PID 1、挂载、端口和停止过程。
category: devops
part: 第一部分：认识 AI Infra 与运行底座
chapter: 4
tags:
  - OCI
  - Container
  - cgroup
prerequisites:
  - 理解 Linux 进程、端口和信号
outcomes:
  - 区分镜像、容器与进程
  - 解释隔离、资源限制和退出怎样共同作用
practice:
  type: walkthrough
  result: 完成一张容器运行与停止证据链
  verify:
    - 镜像身份可以回到 digest
    - 容器内进程、资源、挂载和信号均有证据
evidence: official
updated: 2026-08-18T00:00:00.000Z
---
# 什么是镜像和容器？OCI、Namespace 与 cgroup 如何隔离进程

把模型 API 放进容器后，代码仍由 Linux 进程执行。容器没有自己的内核，也不会把应用故障变成另一类问题。它为进程准备一套文件系统视图、网络视图、进程编号和资源限制，再按镜像声明的命令启动进程。应用依旧要读取配置、绑定端口、处理请求和响应 SIGTERM。

“镜像能运行”“容器正在运行”和“模型服务已经就绪”是三个状态。镜像是静态制品；容器是一次运行环境；模型服务是否可用由容器内进程和依赖决定。只看到容器状态 Up，无法知道端口是否监听、模型是否加载、挂载是否有正确权限。

::: info 镜像和容器的区别

**镜像是一组可寻址的只读文件层以及创建进程所需的配置。容器是运行时根据镜像和启动参数创建的隔离进程环境。**

同一镜像可以创建多个容器，每个容器有自己的可写层、进程和网络身份。删除容器不会修改镜像，重新构建同名标签也不保证内容相同，确定内容要使用 digest。

:::

## 镜像是什么，为什么它不等于压缩后的程序目录

容器镜像包含文件系统层和配置。文件层保存应用、依赖和基础系统文件的变化，配置保存默认命令、环境、工作目录、用户和端口说明。镜像不是一个正在运行的系统，它没有 PID、内存占用和监听 socket。

镜像层通常按内容摘要寻址。构建时每条会改变文件系统的指令可能产生新层，多个镜像可以共享相同层。拉取镜像时，客户端先取得 manifest，再按摘要下载缺失的 config 和 layer blob。摘要校验让接收方确认内容没有在传输中被替换。

标签是便于人使用的可变名称，比如 `model-api:latest`。仓库可以把同一个标签重新指向新 manifest，因此两台机器在不同时间拉取 `latest`，可能获得不同内容。digest 是由内容计算的不可变标识，生产部署需要记录实际 digest，回滚时才能知道恢复的是哪一份制品。

镜像也不是完整部署合同。运行时还会从命令行或 Compose、Kubernetes 配置加入环境变量、Secret、Volume、网络和资源限制。同一个 digest 在不同配置下可以产生不同结果。排查应同时记录镜像身份和运行参数，不能用“镜像相同”推断环境相同。

```bash
docker image inspect local/model-api:release-42 \
  --format '{{json .RepoDigests}} {{json .Config.Entrypoint}} {{json .Config.Cmd}}'
docker image inspect local/model-api:release-42 \
  --format '{{.Id}} {{.Architecture}}/{{.Os}}'
```

第一条读取仓库 digest 与默认启动配置，第二条显示本地镜像 ID 和目标平台。inspect 输出证明本机保存的元数据，不证明远端仓库仍把标签指向相同内容，也不证明该架构能在当前节点运行。多架构镜像使用同一 tag 时，manifest list 会按平台选择不同 manifest。

镜像的“静态”边界很重要。它可以被复制、签名和扫描，也可以在没有容器的机器上解包查看，但它不会自己获得网络身份、Secret 或 GPU。启动时传入的环境、挂载和资源限制决定了同一个 digest 以什么方式运行。比如开发机上的镜像包含配置文件，生产容器改用 Secret 挂载后，文件层摘要没变，运行结果却可能不同。

## OCI 是什么，它规范了哪些交接点

OCI 是 Open Container Initiative 的缩写。它维护镜像格式规范、运行时规范和分发规范，让镜像构建工具、仓库、容器引擎与低层运行时能够围绕共同格式交接。OCI 不是一个必须安装的单独守护进程，也不是 Docker 的另一种名称。

Image Specification 描述 manifest、config、layer 和内容寻址。Distribution Specification 描述客户端怎样与 Registry 交换 manifest 和 blob。Runtime Specification 描述把 rootfs 与 `config.json` 交给运行时后，怎样创建容器进程、namespace、mount 和 hook。

Docker、containerd、CRI-O 和 runc 位于不同层。Docker CLI 把用户命令发给 Docker Engine；Engine 管理镜像、网络和容器，可使用 containerd 管理容器生命周期；runc 按 OCI Runtime Specification 创建低层容器进程。不同产品组合可能变化，排障时要先确认当前环境实际使用哪个组件。

共同规范降低了工具间交换成本，不表示所有实现行为完全相同。日志位置、网络插件、镜像垃圾回收、rootless 模式和安全默认值仍由具体产品决定。某个 Docker 命令成功，也不能直接证明 Kubernetes 节点上的 CRI 运行路径相同。

## 镜像从 Registry 到本机经历了什么

Registry 是保存和分发镜像 manifest 与 blob 的服务。客户端请求一个 tag 时，Registry 返回当前对应的 manifest 或 manifest index。多架构镜像先返回平台列表，客户端根据操作系统和 CPU 架构选择具体 manifest，再下载 config 与每个 layer。

下载过程按 digest 校验内容，已经存在的 layer 可以复用。网络中断后重试某个 blob，不需要重新下载全部镜像。客户端看到“Pull complete”说明所需内容已经进入本地内容存储，仍不代表运行配置中的 Secret、Volume 和设备已经准备好。

私有 Registry 还需要鉴权和证书信任。`unauthorized` 发生在分发接口权限，`x509` 错误发生在 TLS 身份验证，`manifest unknown` 表示请求的 tag 或 digest 不存在。把三类错误都归结为镜像拉取失败，会让人去错误位置修改密码或证书。

镜像内容也有供应链边界。digest 能确认得到的内容与引用一致，不能说明构建来源可信、依赖没有漏洞或许可证允许使用。部署流程还要登记源码提交、构建系统、SBOM 和签名。运行节点验证签名后再允许镜像进入候选环境，校验策略不能只写在人工操作说明里。

清理本地镜像前要建立引用关系。运行中的容器、停止的回滚容器和候选版本可能共同依赖 layer。按来源不明的 tag 批量 prune，容易删掉唯一回滚制品。稳定后保留当前版本和一个已验证回滚版本，再按明确镜像 ID 处理无引用内容。

## 容器引擎怎样把配置交给运行时

用户执行 `docker run` 或编排系统创建 Pod 后，高层引擎先解析镜像、环境、挂载、网络和资源参数。它为容器创建唯一身份，准备快照与网络，再让低层运行时按 OCI bundle 中的 rootfs 和 `config.json` 创建进程。低层运行时不负责长期提供业务 API，它完成内核对象创建和进程启动。

Kubernetes 使用 CRI 与容器运行时交互。kubelet 根据 PodSpec 请求创建 Pod sandbox 和容器，containerd 或 CRI-O 处理镜像与生命周期，再调用 OCI runtime。CNI 插件配置 Pod 网络，CSI 插件处理存储。Pod 创建失败时，要看失败落在镜像、sandbox、网络、挂载还是应用启动，不能只检查 Docker CLI。

运行时配置包括进程参数、环境、用户、capability、rlimit、namespace、mount 和 cgroup 路径。镜像提供默认值，运行配置可以覆盖 entrypoint、command 和 environment。最终值来自多层合并，`docker inspect` 或 PodSpec 才能说明当前容器实际使用什么。

启动后，运行时或 shim 保持与主进程的生命周期关系，保存退出码并处理标准输入输出。守护进程重启时，容器进程是否继续运行取决于实现和 shim 设计。看到引擎服务恢复，不能推断容器业务状态没有中断，仍要检查进程、网络和健康状态。

这条调用链也解释了日志分散的位置。镜像拉取失败可能在引擎日志，CNI 失败在网络插件，应用导入错误在容器 stdout/stderr，OOM 在 cgroup 与内核事件。问题报告只写“容器起不来”没有足够信息，需要保留创建事件和低层错误。

## 文件层怎样组成 rootfs 和容器可写层

运行时把镜像的多个文件层按顺序合并成 rootfs，也就是容器进程看到的根文件系统。后面的层可以增加、替换或用 whiteout 标记删除前层路径。进程读取 `/app/server.py` 时，联合文件系统决定最终来自哪一层。

容器启动后通常再叠加一个可写层。应用写入未挂载路径时，变化进入这个容器专属层。容器删除后，可写层随容器消失；镜像层保持只读，也不会因为容器写文件而改变。把数据库、上传文档或模型缓存只放在可写层，重建容器后数据就可能丢失。

copy-on-write 会在第一次修改镜像层文件时复制相应数据到可写层。大量随机写和大文件更新可能带来额外开销。日志更适合写标准输出或明确 Volume，数据库使用专门持久卷，模型权重可以通过只读镜像层、对象存储下载或只读 Volume 提供，选择要结合更新频率和大小。

rootfs 改变的是进程的路径视图，不改变宿主机内核。容器内看到 `/etc/hosts`、`/proc` 和 `/dev`，其中一些由运行时动态生成或挂载。读取容器内文件不能假设它来自镜像层，`docker inspect` 的 Mounts 和运行时配置才说明实际来源。

## Namespace 是什么，它怎样改变进程看到的系统

Linux Namespace 把一类内核资源划分为多个视图。同一宿主机上的进程可以共享内核，却看到不同进程号、网络接口、挂载点、主机名、用户映射和 IPC 对象。容器隔离主要由这些内核能力实现，不需要启动一个完整虚拟机内核。

PID Namespace 让容器内进程拥有独立编号。宿主机可能看到业务进程 PID 18420，容器内看到 PID 1。数字不同，指向同一个内核任务。容器内 `ps` 只能看到该 Namespace 可见的进程，宿主机管理员仍能看到容器进程。

Network Namespace 提供独立网络接口、路由表、socket 和防火墙视图。容器内监听 `0.0.0.0:8000`，只是在容器网络命名空间的接口上监听，宿主机公网端口不会自动出现。容器引擎需要 veth、bridge、NAT 或代理规则完成端口发布。

Mount Namespace 决定进程看到哪些挂载。一个 Volume 可以在宿主机和容器中使用不同路径与读写模式。UTS Namespace 隔离 hostname，IPC Namespace 隔离部分进程间通信。User Namespace 可以把容器内 UID 映射为宿主机另一个 UID，减少容器 root 对宿主机的权限。

Namespace 提供隔离视图，不是安全边界的全部。容器仍共享内核，内核漏洞、过宽 capability、特权容器、宿主机 socket 挂载都可能扩大权限。安全配置还需要 seccomp、LSM、只读文件系统、最小 capability 和受控设备访问。

共享内核也是容器与虚拟机最根本的区别。虚拟机由 Hypervisor 提供虚拟硬件，来宾操作系统会启动自己的内核；容器进程直接向宿主机内核发起系统调用。容器因此启动快、额外占用小，同一节点也能容纳更多实例，但它不能加载与宿主机不兼容的内核，更不能依靠镜像携带另一个操作系统内核。Linux 容器镜像中的 `/bin`、`/lib` 和包管理器属于用户空间，看到这些目录不代表容器拥有一套独立 Linux。

这种区别会改变故障归属。容器内 Python 报导入错误，通常检查镜像文件和启动环境；所有容器同时出现系统调用异常，则要检查宿主机内核、运行时和安全策略。需要运行不同内核、隔离不可信租户或满足更强合规边界时，虚拟机往往更合适。也可以让容器运行在虚拟机中，用虚拟机划租户边界，再用容器交付应用，两种机制不是互斥选项。

下面的表把几种常被混为一谈的状态放在一起。它的用途不是给容器打分，而是让排查者知道每个结论需要从哪里取证。

| 要确认的事实 | 容器机制提供的证据 | 不能由该证据推出的结论 |
| --- | --- | --- |
| 进程看到独立 PID 和网络 | Namespace 归属、接口与进程视图 | 宿主机内核已经与进程隔离 |
| 进程受内存和 CPU 边界约束 | cgroup 配置、计数与事件 | 应用一定有足够资源完成请求 |
| 文件来自指定镜像 | manifest、layer digest 与 rootfs | 运行时挂载没有覆盖该路径 |
| 主进程仍在运行 | 容器状态、PID 与退出码 | API 已经就绪并能正确回答请求 |

表中每一行都故意保留了一个推理边界。比如 PID Namespace 能解释容器内外编号为什么不同，却不能证明容器拥有独立内核；容器状态为 Running 只说明主进程没退出，还要继续请求就绪接口、检查依赖和模型加载状态。把证据限定在它真正能证明的范围内，才能避免“容器正常，所以应用正常”这种过早结论。

## Capability、seccomp 和 rootless 分别限制什么

传统 Unix 把许多高权限操作集中在 root 用户。Linux capability 把这些权限拆成较小单元，比如绑定特权端口、修改网络配置或绕过部分文件权限。容器进程可以丢弃不需要的 capability，即使 UID 为 0，也不拥有完整宿主机 root 能力。

`--privileged` 会显著扩大设备和 capability 权限，并放松多项安全限制。它可能让诊断命令暂时成功，却隐藏实际需要哪一项权限。正式配置应从默认能力集合继续删除，确有需要时只增加明确 capability，并记录调用的系统能力和风险。

seccomp 按系统调用过滤进程能够请求的内核接口。应用被过滤时可能收到 `EPERM` 或被终止，错误看上去像普通权限问题。AppArmor、SELinux 等 LSM 还会按安全策略限制路径、网络和执行。文件 mode 正确但仍 Permission denied 时，需要检查安全上下文和审计日志。

rootless 容器让引擎和容器进程在宿主机普通用户权限下运行，通常结合 User Namespace 映射 UID。它降低守护进程或容器逃逸后的宿主机权限，网络、低端口、cgroup 和设备访问能力也可能受限。GPU 容器采用 rootless 前要核对运行时和设备映射支持，不能从普通 CPU 容器成功推断。

安全边界还包括挂载。把 `/var/run/docker.sock` 放进容器，容器内程序可以请求引擎创建高权限容器，效果接近取得宿主机控制权。只读文件系统也挡不住已挂载的可写宿主机目录。每个 mount、device 和 capability 都要能回答哪个功能确实依赖它。

```bash
docker inspect api --format '{{.State.Pid}}'
host_pid=$(docker inspect api --format '{{.State.Pid}}')
sudo nsenter -t "$host_pid" -n ip addr
sudo nsenter -t "$host_pid" -p ps -ef
```

这组命令先取得宿主机 PID，再进入目标网络或 PID Namespace 读取状态。`nsenter` 需要高权限，会看到目标容器内部信息，只适合受控诊断。输出能解释容器内网络与进程视图，不能证明 cgroup 资源限制和挂载权限正确。

## cgroup 是什么，它怎样限制和统计资源

cgroup 是 control group 的缩写。Linux 内核用它把进程组织成层级，并限制、统计或控制 CPU、内存、PIDs 和 I/O 等资源。Namespace 回答“进程能看见什么”，cgroup 回答“进程能用多少资源以及用了多少”，两者不能互换。

容器运行时把容器进程放入一个 cgroup。内存上限小于宿主机空闲内存时，容器仍可能在自己的边界内触发 OOM。CPU quota 限制一段周期内可用的 CPU 时间，达到配额后线程会被 throttled，进程仍是 Running，接口延迟却会升高。

PIDs 限制控制 cgroup 能创建的任务数量。程序大量启动线程或子进程达到上限时，`fork` 或线程创建失败。文件描述符上限属于另一套资源限制，不能只增加 PIDs。I/O 控制可以限制块设备吞吐，模型加载慢也可能是磁盘 I/O 被限而不是 CPU 不足。

cgroup v2 使用统一层级，常见文件包括 `memory.current`、`memory.max`、`memory.events`、`cpu.stat` 和 `pids.current`。具体容器路径由运行时和服务管理器组织，不应该在脚本中硬编码长目录。先从 `/proc/<pid>/cgroup` 找到归属，再读取相应层级。

```bash
cat /proc/1/cgroup
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.events
cat /sys/fs/cgroup/cpu.stat
```

这些路径以 cgroup v2 且命令在目标 cgroup 内为前提。`memory.max` 为 `max` 表示未设置该项硬上限，不等于宿主机内存无限。`oom_kill` 计数增长说明该 cgroup 发生过 OOM Kill，仍需对齐时间和进程日志。

## 容器日志和资源指标怎样对齐

容器运行时通常捕获主进程的标准输出和标准错误，并按日志驱动保存或转发。应用写容器内普通文件时，`docker logs` 看不到；文件又未挂载时，容器删除后日志一起消失。容器应用优先写 stdout/stderr，采集、轮转和保留交给运行平台。

`docker logs --since` 可以按时间读取，具体日志格式和保留由 daemon 配置决定。无限增长的 json-file 日志会占满宿主机磁盘，轮转需要在部署前设置。日志中仍要脱敏，不因为容器是临时对象就记录完整 Token、Prompt 和 Secret。

运行指标要同时看容器边界和宿主机。`docker stats` 提供 CPU、内存、网络和块 I/O 的概览，数值来自 cgroup 和运行时统计。CPU 百分比的计算口径可能按多核展开，内存展示也可能扣除部分缓存，跨工具比较前要确认定义。

应用指标解释业务状态。容器 CPU 高可能是模型分词、压缩或忙循环；GPU 服务 CPU 低也可能在等待设备。把请求率、队列、错误、延迟和容器资源按同一实例标签关联，才能知道资源变化是否影响用户请求。

容器重启会产生新 PID，有时还会产生新容器 ID。日志与指标只用短容器名可能把多个生命周期混在一起。记录镜像 digest、容器 ID、启动时间和应用版本，故障回放才能区分旧实例和新实例。

## 重建容器时怎样保护数据和回滚点

更新镜像或运行配置通常需要创建新容器。重启旧容器只会复用原配置，不会自动读取新的镜像 tag、端口、挂载或环境。Compose 的 recreate 和 Kubernetes 的新 Pod 会建立新可写层与进程身份，持久数据必须放在独立 Volume 或外部服务。

重建前先列出 Mounts、命名卷、网络、环境来源和镜像 digest。数据库卷需要一致备份和恢复验证，模型缓存若可从可信制品重建，可以按缓存处理。日志卷和上传目录属于哪种数据，要由业务恢复要求决定，不能只看目录名称。

候选容器应使用独立名称和端口或同网络旁路启动，不先删除旧容器。验证镜像身份、健康接口、关键请求和停止流程后，再修改入口路由。旧容器保留到观察期结束，回滚只需要把流量切回，不依赖现场重新拉取旧 tag。

回滚应用容器不一定能回滚数据。新版本已经写入旧版本无法理解的字段时，简单切回会继续失败。数据库采用向前兼容的 expand/contract 迁移，先增加新结构并让新旧版本都能读写，稳定后再删除旧结构。容器制品不可变，数据演进另有生命周期。

清理时按引用清单逐项删除无用候选、旧可写层和明确过期镜像包。运行中镜像、当前版本、唯一回滚版本、数据库和卷不能进入批量清理。清理前后记录容器、镜像和磁盘占用，确认释放对象与预期一致。

## PID 1 为什么影响信号和子进程回收

容器启动命令创建的主进程通常成为容器 PID Namespace 中的 PID 1。它决定容器何时被视为退出：主进程退出，运行时通常认为容器生命周期结束，即使其他子进程短暂存在。把一个不相关的 Shell 留作 PID 1，业务进程崩溃后容器可能仍显示 Running。

PID 1 在 Linux 中有特殊信号行为。业务进程通过 Shell 脚本启动时，如果脚本没有使用 `exec` 替换自身，停止信号先到 Shell，Shell 未必转发给 Python 或 Serving 子进程。容器达到停止宽限后被 SIGKILL，应用就失去清理与释放 KV Cache 的机会。

父进程还要回收退出子进程。长期运行的应用不断创建命令子进程却不调用 wait，会留下僵尸。可以让应用正确处理，也可以使用轻量 init 负责信号转发与回收。是否需要 init 取决于进程模型，不是所有容器都必须加一层。

下面两个启动方式行为不同：

```dockerfile
# Shell form 会先启动 /bin/sh
CMD python -m app

# Exec form 直接让 Python 成为容器主进程
CMD ["python", "-m", "app"]
```

Exec form 避免额外 Shell，信号更直接。若入口脚本要做迁移和模板渲染，脚本末尾应使用 `exec "$@"` 把 PID 1 交给业务进程。应用仍要实现 SIGTERM 处理，Exec form 本身不会自动完成优雅退出。

## Volume 和 bind mount 怎样改变文件与权限

Volume 是由容器引擎管理的数据存储，bind mount 则把宿主机明确路径挂到容器路径。两者都会覆盖镜像中同一路径的内容。镜像包含 `/app/config.yaml`，运行时把空目录挂到 `/app`，容器内就看不到原文件，这不是镜像构建失败。

挂载有只读和读写模式。模型权重适合只读挂载，日志或上传目录需要受控写入。容器内进程的 UID/GID 与宿主机文件所有者不匹配时会出现 Permission denied；把容器用户改成 root 只会隐藏映射问题并扩大权限。

Volume 生命周期独立于容器。重建容器通常不会删除命名卷，显式删除 Volume 才会清除数据。匿名卷名称可能随配置变化产生多份数据，排障需要从 `docker inspect` 确认实际 Source、Destination、Mode 与 RW，不根据 Compose 文件猜当前容器一定采用最新配置。

```bash
docker inspect api --format '{{json .Mounts}}'
docker exec api id
docker exec api stat -c '%A %U:%G %n' /app/models /app/logs
```

`docker exec` 在正在运行的容器中启动新进程，它继承容器环境却不一定和主进程拥有完全相同的当前目录、umask 和打开文件。用它检查静态权限很有帮助，不能用一次手工命令成功证明主进程初始化时也成功。

## 容器端口为什么需要发布或服务发现

容器内应用在 Network Namespace 中监听端口。另一个位于同一容器网络的容器可以通过服务名和容器端口访问，宿主机外部客户端通常需要端口发布或反向代理。`EXPOSE 8000` 只是镜像元数据说明，不会自动创建宿主机监听。

`-p 127.0.0.1:18000:8000` 把宿主机回环地址的 18000 映射到容器 8000。外部机器不能直连宿主机回环，但同机 Nginx 可以使用它。`-p 8000:8000` 常绑定所有宿主机接口，可能意外暴露内部服务，安全边界需要明确。

容器间访问不能使用 `localhost` 指向另一个容器。`localhost` 总是当前 Network Namespace 自身。Compose 默认网络为服务名提供 DNS，API 应连接 `db:5432`，不是 `127.0.0.1:5432`。名称解析成功仍要等待数据库就绪，并处理运行中断线。

```bash
docker port api
docker exec api ss -ltnp
docker network inspect ai-stack_default
curl -fsS http://127.0.0.1:18000/health
```

这四条命令分别检查端口发布、容器内监听、网络成员和宿主机入口。容器内监听缺失时修改 NAT 没有作用；容器内正常而宿主机失败，再检查发布地址与规则。分层证据和上一章网络方法一致，只是命令执行位置发生了变化。

## 从 create 到 stop，容器经历哪些状态

容器创建时，运行时准备可写层、挂载、Namespace、cgroup 和进程配置。start 才执行进程。主进程退出后容器进入 stopped 或 exited，退出码与 OOM 状态保存在运行时元数据中。restart 会使用已有容器配置重新启动，recreate 会生成新容器，二者对可写层和配置更新的影响不同。

健康检查是容器附加状态，不改变主进程生命周期。进程运行但健康检查失败，容器可能显示 unhealthy；是否自动重启由上层管理策略决定。健康命令应检查本容器能力，不能依赖一个永远返回 0 的进程存在检查。

停止通常先向主进程发送 SIGTERM，等待停止宽限，再发送 SIGKILL。应用先停止接收新流量，等待在途请求和任务到可恢复点，最后退出。宽限小于业务 Deadline 时，优雅退出没有足够时间，应该调整请求边界或支持检查点，而不是无限延长停止时间。

```bash
docker inspect api --format '{{json .State}}'
docker stop --time 90 api
docker inspect api --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} finished={{.State.FinishedAt}}'
```

停止命令会改变容器状态，正式环境执行前必须确认目标身份和流量。只读排障先用 inspect 和 logs。`OOMKilled=true` 说明运行时记录了 OOM Kill，仍需读取 cgroup 和内核事件确认时间与限制，不能因此直接增大所有节点内存。

## 用同一个容器完成一次证据化排查

假设容器 Up，外部访问健康接口失败。先读取镜像 digest、主进程 PID、退出和健康状态；再检查 Mounts、NetworkSettings 和资源限制。进入容器确认应用监听地址，随后从同网络容器测试服务名，最后测试宿主机或代理入口。

| 现象 | 能确认的范围 | 下一步证据 |
| --- | --- | --- |
| 镜像已拉取 | manifest 与层已保存在本机 | 运行配置、平台与文件完整性 |
| 容器 Up | 主进程尚未退出 | 端口、readiness、模型与依赖 |
| 容器内 8000 LISTEN | Network Namespace 内有监听 | 发布端口、服务发现和代理 |
| OOMKilled 为 true | cgroup 内发生过 OOM Kill | memory.max、memory.events、显存和时间线 |
| 文件 Permission denied | 当前身份无法访问路径 | UID/GID、逐级目录、挂载模式与安全策略 |
| stop 后仍等待 | 主进程或子进程未按时退出 | PID 1、信号转发、在途请求和宽限 |

修复后重建容器，核对新容器仍使用预期 digest、挂载和限制。然后重复容器内、同网络和入口三层请求，观察 SIGTERM 能否到达业务进程。镜像、容器、Namespace、cgroup、挂载和端口共同影响同一个 Linux 进程，任何一项都不能单独证明服务可用。
