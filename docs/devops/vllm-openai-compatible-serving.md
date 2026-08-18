---
title: vLLM 服务、OpenAI 兼容接口与故障定位
description: 从启动参数、模型加载和 Readiness 进入普通请求、流式请求、并行策略、显存配置与错误分层。
category: devops
part: 第三部分：LLM Serving
chapter: 17
tags:
  - vLLM
  - OpenAI Compatible API
prerequisites:
  - 理解模型制品、推理生命周期和 GPU 栈
outcomes:
  - 解释 vLLM 服务启动与请求路径
  - 诊断模型加载、显存和接口错误
practice:
  type: diagnosis
  result: 完成一份 vLLM 启动与排障设计
  verify:
    - 兼容范围被明确声明
    - 不提供未经目标硬件实测的吞吐数字
evidence: official-guided-operation
updated: 2026-08-17T00:00:00.000Z
---
# vLLM 服务、OpenAI 兼容接口与故障定位

vLLM 进程打印了 HTTP server started，但 `/v1/models` 返回的名称与客户端请求不一致；修正名称后，第二条长请求又触发 OOM。接口问题和容量问题发生在不同边界，不能都归结为“vLLM 没启动好”。排查应按制品、设备、引擎、HTTP 协议和请求形状分层。



## 一条 vLLM 启动命令实际上固定了哪些契约

这些参数只有和启动阶段、引擎状态以及请求形状对应起来，才有排障价值；单独背参数名无法解释 OOM 或模型名不匹配。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| served-model-name | 暴露给兼容 API 的逻辑模型名，可与本地路径不同；客户端路由应以明确名称匹配。 |
| tensor-parallel-size | 把单个模型的张量计算分布到多设备，要求拓扑和通信支持，不等于启动多个独立副本。 |
| gpu-memory-utilization | 引擎用于规划可占用显存比例的配置之一，不是“百分之百不会 OOM”的保证。 |
| max-model-len | 允许的上下文上限，会影响 KV Cache 容量和请求准入；不应无条件沿用模型声明最大值。 |

::: tip 判断原则
每个启动参数都要能落到一条可观察证据，例如模型列表、显存账本或请求终态。
:::

## 启动失败和请求失败要在哪一层分开

```mermaid
flowchart LR
  S0["参数解析"]
  S1["引擎初始化"]
  S2["HTTP 就绪"]
  S3["请求执行"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 参数解析：vLLM CLI

解析模型、revision、精度、并行和服务名。

可以从这些位置确认结果：命令行、版本、unknown argument。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 引擎初始化：Engine

读取配置、加载权重、建立执行器和 KV Cache。

这里不靠猜测，优先读取 load logs、device mapping、OOM。

### HTTP 就绪：API Server

暴露模型列表和 Chat/Completions 兼容子集。

决定下一步前需要看到 `/v1/models`、schema error。

### 请求执行：Scheduler

校验长度、排队并流式输出，处理取消与终态。

这一动作的可观察结果是 queue、TTFT、finish_reason、engine error。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 先验证接口契约，再扩大请求形状

vLLM 的安装方式取决于 GPU 厂商、驱动和 PyTorch 后端，入口是 [vLLM GPU 安装文档](https://docs.vllm.ai/en/latest/getting_started/installation/gpu/)。当前官方文档要求 Linux 和 Python 3.10 到 3.13；Windows 需要 WSL 或社区方案，不能直接照搬 Linux 生产环境结论。

![vLLM 官方安装页，按 GPU、CPU 和 TPU 区分硬件路径](/images/install/vllm-installation.png)

先在官方页面选择硬件标签，再复制对应命令。截图只用于定位入口，不代表当前机器已经满足驱动、显存或 Python 条件。

NVIDIA CUDA 环境可以先创建全新的 Python 3.12 环境，让 `uv` 根据已安装驱动选择 PyTorch 后端：

```bash
uv venv --python 3.12 --seed --managed-python
source .venv/bin/activate
uv pip install vllm --torch-backend=auto

vllm --version
python -c "import torch; print(torch.version.cuda); print(torch.cuda.is_available())"
```

`vllm --version` 只证明包可以导入和启动 CLI；`torch.cuda.is_available()` 为 `True` 才说明当前 Python 环境能初始化 CUDA。AMD ROCm、Intel XPU 和 Apple Silicon 的包、Python 版本与功能范围不同，应在官方页面切换对应设备标签，不要套用这组 NVIDIA 命令。

下面是解释性启动示例，需按安装的 vLLM 版本核对参数；`REPLACE_WITH_COMMIT` 与 GPU 数量必须替换。本机没有执行真实 GPU 启动，因此不提供虚构的加载结果或吞吐数字。

```bash
vllm serve org/model \
  --revision REPLACE_WITH_COMMIT \
  --served-model-name internal-chat \
  --dtype bfloat16 \
  --max-model-len 8192 \
  --tensor-parallel-size 2

curl -sS http://127.0.0.1:8000/v1/models
curl -N http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"internal-chat","messages":[{"role":"user","content":"hello"}],"stream":true}'
```

先用最小输入确认模型名、响应字段和 `[DONE]`，再逐步增加输入长度、输出上限和并发，这样 OOM 才能关联到请求形状。参数随 vLLM 版本变化，应记录 `vllm --version` 和完整启动命令。命令成功不代表两张 GPU 的 P2P/NCCL 拓扑适合目标负载。

## 接口可达不等于请求能完成

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 404/model not found | 客户端 model 与 served name 不一致 | 比较 `/v1/models` 和路由配置 |
| 启动时 OOM | 权重、工作区或 cache 初始化已超预算 | 减少并行/长度前先建立显存账本 |
| 第二请求 OOM | 并发 KV Cache 或峰值工作区超过预算 | 记录每个请求 token 数和 block 使用 |
| 流突然断开 | 引擎错误、客户端取消、代理超时或进程退出均可能 | 对齐 API、engine、代理和系统日志 |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

vLLM 的 OpenAI 兼容能力取决于版本和端点，不应承诺所有字段完全一致。模型热切换可能需要新进程与显存双占，最稳妥的发布通常是候选实例加载验证后切流。本章没有真实 GPU 或多卡实测数字。

Serving 能否装下模型，最终回到制品字节和数值格式。下一篇拆开 FP32、FP16、BF16、INT8、INT4、量化校准与质量验证。
