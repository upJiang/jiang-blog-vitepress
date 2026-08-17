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

vLLM 进程显示 Ready，调用 /v1/models 却返回模型名不一致；换了 --tensor-parallel-size 后服务能启动，但请求一来就 OOM。vLLM 的参数不是一张“性能开关表”，每个参数都在改变模型身份、调度预算、并行布局或接口契约。

## 启动参数怎样映射到运行状态

| 参数/配置 | 影响的状态 | 核对方式 |
| --- | --- | --- |
| model + revision | 权重、Tokenizer 和公开身份 | 记录制品摘要与 config |
| dtype / quantization | 权重与激活的表示 | 确认引擎支持和质量边界 |
| max-model-len | 上下文上限、KV 预算 | 与业务输入分布对照 |
| tensor-parallel-size | 设备分片和通信 | GPU 数量、拓扑和日志 |
| gpu-memory-utilization | KV/工作区可用余量 | 观察加载和第二请求行为 |

启动成功只证明初始化路径完成，不能证明配置适合第二个长请求。公开 model id 也不应随意从本地目录名推导，Gateway 需要稳定别名和 Revision 记录。

## OpenAI 兼容请求的最小链路

```bash
curl https://model.example.test/v1/models
curl https://model.example.test/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"my-model","messages":[{"role":"user","content":"hi"}],"stream":true}'
```

第一条请求确认服务公布的模型身份，第二条确认协议和流式事件。示例没有伪造性能结果，也没有假定特定 vLLM 版本支持所有参数。实际使用要固定版本并核对官方启动参数和兼容性说明。

## 故障从日志和状态分层看

| 症状 | 优先证据 | 常见根因 |
| --- | --- | --- |
| 进程启动失败 | 加载日志、GPU 可见性、权重文件 | 路径、架构、驱动或显存 |
| /health 正常但请求 503 | 队列、模型状态、上游连接 | Readiness 与请求准入不一致 |
| 第二请求 OOM | 输入/输出 Token、KV 使用、显存快照 | max length、并发或碎片 |
| 流式不增量 | 响应头、代理缓冲、客户端读取 | SSE/代理配置，不一定是 vLLM |

把 nvidia-smi、Serving 日志、网关 trace 和请求形状放在同一时间线上，才知道是模型加载、调度还是入口问题。

## 模型切换不能只替换目录

切换模型需要更新制品摘要、能力声明、Tokenizer、上下文上限、成本和健康检查。旧实例要继续服务已有流式连接，新实例通过最小推理和合同测试后再接流量。下一篇把权重精度、量化和制品版本放到显存账本中。

## 从“可启动”到“可接流量”之间还差什么

候选实例至少要通过四类检查：模型身份与 tokenizer 一致，兼容接口能完成非流式和流式请求，取消能停止生成，观测能关联 request_id、model_revision 和 usage。只有这些条件都通过，Readiness 才有资格把实例加入网关路由。

多卡配置还要额外核对 rank、可见 GPU、通信路径和故障时的清理。单次启动日志没有错误不代表第二个实例、第二个请求或模型切换稳定。把失败样本和启动参数放进 Release Manifest，回滚时才能还原同一运行条件。

## 故障定位要从请求形状回到启动参数

当 OOM 或拒绝发生时，把 prompt/output Token、并发、model_revision、max-model-len、dtype、tensor parallel 和 GPU 状态写到同一条诊断记录。这样才能判断是某一长请求突破上限，还是参数为所有请求预留了过多 KV。

只调低 gpu-memory-utilization 可能减少引擎可用缓存，也可能让其他工作区有余量。每个调整都有代价，候选环境应以同一请求集比较 TTFT、TPOT、错误和显存峰值，再决定是否提升。
