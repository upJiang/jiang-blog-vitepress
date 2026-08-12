# AI Infra 工程入门学习路线

> 从能调用模型 API，走到能设计、部署、观测、扩展和恢复企业级 AI Platform。

## 路线目标

这条路线面向三类读者：准备转向 AI Infra 的后端工程师，希望深入运行底层的 AI 应用工程师，以及需要建设企业模型平台的开发者。完成全部章节后，读者应能解释一条 AI 请求从入口到 GPU 的完整生命周期，设计模型服务、Agent 与 RAG 基础设施，并为容量、安全、发布和恢复给出可验证方案。

路线不假设读者已经拥有 NVIDIA GPU 或 Kubernetes 集群。涉及 GPU、CUDA、多卡训练和集群调度的章节以机制、配置语义和决策推演为主，不使用未经实测的性能数字。Python、FastAPI、SQL 与通用配置示例则要求可以独立理解和验证。

## 八阶段总览

```mermaid
flowchart LR
  A[运行底座] --> B[AI Backend]
  B --> C[LLM Serving]
  C --> D[GPU 基础]
  D --> E[Kubernetes]
  E --> F[企业 AI Platform]
  F --> G[分布式训练]
  G --> H[交付与综合项目]
```

这不是按名词堆叠的目录。前一阶段提供后一阶段需要的输入：Linux 与容器解释服务怎样运行，AI Backend 提供状态和任务设施，Serving 把模型变成服务，GPU 与 Kubernetes提供计算和调度，平台层再把这些能力封装成可治理产品。

## 第一阶段：认识 AI Infra 与运行底座

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 1 | AI Infra 全景、岗位职责与学习路径 | 用应用、数据、模型、计算、平台和可靠性六层划清职责 |
| 2 | Linux 服务运行与证据化排障 | 从进程、端口、权限、内存和磁盘定位启动与运行故障 |
| 3 | DNS、TCP、TLS、HTTP 与代理请求链 | 沿网络层次定位请求断点并分配超时预算 |
| 4 | OCI 镜像、容器隔离、cgroup 与进程生命周期 | 解释镜像、容器、进程、资源限制和信号的关系 |
| 5 | Docker Compose 组织本地 AI 服务栈 | 连接 API、数据库、Redis、Worker 与对象存储 |
| 6 | Nginx、TLS、模型 API 与 SSE 流式入口 | 处理反向代理、缓冲、长连接和安全热加载 |

阶段产物是一张可排障的运行拓扑。读者应能指出请求在哪个进程、端口和容器里运行，以及失败时先看哪一层证据。

## 第二阶段：AI Backend 基础设施

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 7 | Python typing、asyncio、线程与多进程 | 为网络、分词和解析任务选择正确并发模型 |
| 8 | FastAPI 构建 OpenAI 兼容 LLM 服务 | 实现校验、路由、普通响应、SSE、Token 用量和错误契约 |
| 9 | Redis 的缓存、Session、限流与任务角色 | 为短期状态选择数据结构、TTL 和失效边界 |
| 10 | PostgreSQL、JSONB、pgvector、索引与连接池 | 管理用户、Prompt、Agent 状态和 Embedding 数据 |
| 11 | 消息队列与 Worker 任务平面 | 隔离在线请求和文档解析、Embedding、评测等后台任务 |
| 12 | 模型与文档对象存储 | 设计分段上传、校验、版本、预签名 URL 和清理流程 |

阶段产物是一套 AI Backend 数据流：请求内只完成需要即时反馈的工作，长任务通过可恢复队列执行，业务状态保存在持久存储，对象与数据库能够对账。

## 第三阶段：LLM Serving

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 13 | 从模型文件到稳定推理 API | 拆开准入、调度、引擎、流式输出、用量和观测 |
| 14 | Hugging Face 与首次开源模型部署 | 核对许可证、Revision、Config、Tokenizer 和权重 |
| 15 | Tokenize、Prefill、Decode 与流式推理 | 解释 TTFT、TPOT、采样和停止条件来自哪里 |
| 16 | Continuous Batching、PagedAttention 与 KV Cache | 理解动态调度、显存 Block、前缀复用和公平性 |
| 17 | vLLM 服务、兼容接口与排障 | 读懂启动参数、模型加载、Readiness、请求和错误 |
| 18 | 模型制品、精度、量化与推理优化 | 比较 FP32、FP16、BF16、INT8、INT4 的容量和质量边界 |

阶段产物是一份模型服务设计：模型版本可追溯，接口兼容范围明确，延迟和吞吐指标有统一口径，容量结论不会脱离模型、请求分布和硬件。

## 第四阶段：GPU 基础

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 19 | 并行计算、矩阵乘与 GPU 吞吐 | 区分 CPU 延迟优化与 GPU 吞吐设计 |
| 20 | CUDA Thread、Block、Grid、Warp 与 SM | 推演 Kernel 从 Host 启动到设备执行的层级 |
| 21 | Driver、CUDA Runtime、HBM/VRAM 与显存诊断 | 建立权重、激活、工作区和 KV Cache 显存账本 |

阶段产物是一张计算与显存判断表。它用于回答“为什么适合 GPU”“模型为什么放不下”“何时需要多卡”，而不是背诵硬件型号。

## 第五阶段：Kubernetes AI Infra

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 22 | Kubernetes 控制面与 AI 工作负载 | 理解期望状态、Pod、Deployment、Service 与 Ingress |
| 23 | GPU Operator、模型卷与探针 | 解释 GPU 从节点进入 Pod 以及模型实例何时真正就绪 |
| 24 | GPU 调度、共享、MIG 与自动扩缩容 | 选择设备、拓扑、隔离方式和反映推理压力的扩容信号 |

阶段产物是一套静态可审查的 AI Workload 设计。Kubernetes 负责声明、调谐和放置，但模型能否放入显存、批处理是否合理、回答质量是否合格仍由平台负责。

## 第六阶段：企业级 AI Platform

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 25 | LLM Gateway | 统一 API Key、模型路由、限流、Token、成本和错误语义 |
| 26 | 多模型管理平台 | 建立模型注册、版本、能力、部署、健康和切换控制面 |
| 27 | Agent Runtime | 管理 LangGraph、MCP、工具、状态、并发、取消和恢复 |
| 28 | RAG Infra | 连接解析、切片、Embedding、向量索引、检索、重排和发布 |
| 29 | AI 可观测性与 SLO | 关联 Trace、Metric、Log、模型、GPU、质量和成本 |
| 30 | 容量、压测与成本 | 用请求分布、队列和 Little's Law 建立容量模型 |
| 31 | 多租户、Secret、数据、模型与审计 | 将权限和不可信边界贯穿网关、Agent、RAG 与 Serving |

阶段产物是一张控制面与数据面分离的平台架构。业务使用稳定模型标识，供应商和部署实例可以替换；身份、预算、版本和权限由确定性系统控制。

## 第七阶段：分布式训练基础设施

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 32 | Data、Tensor、Pipeline Parallel、DDP 与 FSDP | 按瓶颈选择并行策略并规划检查点 |
| 33 | DeepSpeed ZeRO 与 Offload | 推演参数、梯度和 Optimizer State 的分片所有权 |
| 34 | NCCL、Collective、AllReduce 与多机通信 | 从 Rank、拓扑、网络和同步点定位通信故障 |

阶段产物是一张训练拓扑与资源表。路线只建立基础设施判断能力，不用没有目标硬件的理论数字冒充真实训练结果。

## 第八阶段：交付与综合项目

| 章 | 主题 | 学习结果 |
| --- | --- | --- |
| 35 | CI/CD、SBOM、签名与不可变制品 | 让代码、模型和配置版本可追溯并跨环境提升 |
| 36 | 候选验证、迁移、切流、回滚、备份与恢复 | 区分应用回滚、数据回退和灾难恢复 |
| 37 | Enterprise AI Platform 综合设计 | 串联 Gateway、Agent、RAG、vLLM、GPU、存储、观测与发布 |

最终设计包必须覆盖正常请求、过载、取消、模型故障、知识发布、版本切换和恢复路径。每个模块都要写清输入、状态、输出、所有者、观测证据和停止条件。

## 完成标准

完成路线不以“读完 37 篇”为标准。读者应能独立完成以下判断：

- 从用户请求追踪到网关、Agent、检索、模型服务和 GPU；
- 解释数据库、Redis、队列和对象存储分别保存什么状态；
- 为模型版本、显存、并发、队列和成本建立统一口径；
- 设计多租户权限、Secret、审计和不可信内容边界；
- 给出可验证、可回滚、可恢复的 AI Platform 发布方案。

路线对应的岗位方向包括 AI Infra Engineer、LLM Platform Engineer、AI Platform Engineer 和 Agent Infrastructure Engineer。岗位名称会变化，稳定的能力仍是：让模型与 Agent 以可交付、可观测、可扩展、可治理和可恢复的方式运行。
