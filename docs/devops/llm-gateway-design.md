---
title: LLM Gateway：API Key、路由、限流、Token 与成本
description: 沿一次多模型请求解释身份、能力路由、配额、限流、预算、用量、错误映射和流式透传。
category: devops
part: 第六部分：企业级 AI Platform
chapter: 25
tags:
  - LLM Gateway
  - Rate Limit
  - Usage
prerequisites:
  - 理解 FastAPI 与 LLM Serving
outcomes:
  - 设计稳定的模型网关契约
  - 隔离供应商差异和业务身份
practice:
  type: implementation
  result: 完成一张网关请求状态表
  verify:
    - 模型路由有确定性输入
    - 未知结果不会被盲目重试或重复计费
evidence: anonymized-practice
updated: 2026-08-17T00:00:00.000Z
---
# LLM Gateway：API Key、路由、限流、Token 与成本

客户端只发送了一次请求，账单里却出现两次模型费用。网关在上游超时后自动切换供应商，但第一个请求其实已经开始生成；因为没有 attempt 状态和幂等边界，第二次调用变成了重复消费。可靠网关不能把重试当作 HTTP 客户端默认功能，它必须知道请求是否可能已经产生副作用。


<InfraFigure src="/images/ai-infra/llm-gateway-design/hero.png" alt="LLM Gateway 将带身份的请求经过限流、模型路由和用量记录送到多个上游的插画"
  icon="gateway" caption="网关把业务身份与供应商协议分开，并为每次尝试记录确定性路由和用量状态。" />


## LLM Gateway 比普通反向代理多负责哪些状态

先把术语放回系统位置。只记名字，遇到故障时仍然不知道应该去哪个进程或存储找证据。

| 概念 | 在这条链路中的含义 |
| --- | --- |
| Principal | 由 API Key 或令牌解析出的用户、租户和权限主体，不能信任请求体自报身份。 |
| Capability Routing | 根据逻辑模型能力、区域、上下文、工具支持和策略选择 deployment，而不是在业务代码硬编码供应商名。 |
| Quota/Rate Limit | Quota 控制一段周期总预算，rate limit 控制短窗口速率；两者应以主体和能力为维度。 |
| Attempt | 一次请求对某个上游的具体调用记录，包含开始、可能送达、用量和终态，用来判断能否重试。 |

::: tip 判断原则
定义一个组件时，同时说清它不负责什么。能回答输入从哪里来、状态存在哪里、输出交给谁，才算理解。
:::

## 一次请求如何形成可计费且可解释的决定

```mermaid
flowchart LR
  S0["认证准入"]
  S1["预算路由"]
  S2["调用尝试"]
  S3["结算终态"]
  S0 --> S1
  S1 --> S2
  S2 --> S3
```

箭头表示状态的先后依赖，不表示所有步骤都在同一进程或同一台机器完成。下面沿链路逐段展开。

### 1. 认证准入：Gateway 持有当前状态

解析 Key、租户、模型权限与请求大小。

可以从这些位置确认结果：principal、401/403、request_id。若完全没有证据，先判断请求是否到达本阶段；若记录冲突，则对齐 request_id、实例和时间窗口。

### 预算路由发生时，先看 Policy Engine

原子预留速率/配额并选择满足能力的 deployment。

这里不靠猜测，优先读取 route reason、reservation、policy version。

### 从 调用尝试 留下的证据回到 Provider Adapter

转换协议、传递 deadline 并记录响应是否开始。

决定下一步前需要看到 attempt_id、upstream status、first byte。

### 4. Usage Ledger 怎样完成结算终态

按可信 usage 与终态结算、释放预留或标记待核对。

这一动作的可观察结果是 prompt/output tokens、billing state。处理动作应晚于取证，否则重启或重试可能覆盖最早的失败现场。

## 错误契约要告诉客户端下一步能不能做

下面是内部错误映射示例，不代表任何供应商固定格式。输入是上游结果与 attempt 状态，输出是稳定的网关错误类别。

```json
{
  "error": {
    "code": "upstream_timeout_unknown_outcome",
    "message": "The upstream outcome is unknown.",
    "request_id": "req_demo",
    "retryable": false
  }
}
```

连接建立前失败通常可以安全选择另一 deployment；请求体已发送或流已开始后结果可能未知，盲目重试会重复生成和计费。`retryable` 应由确定性状态机产生，不由模型或客户端猜测。对外 message 可简化，对内必须保留 attempt_id 和上游证据。

## 看起来相似，故障边界却不同

| 表面现象 | 实际可能发生的事 | 下一步证据 |
| --- | --- | --- |
| 429 | 可能是速率、并发、Token 预算或供应商配额，不是一种原因 | 返回稳定 code 与 Retry-After |
| 上游 5xx | 可能尚未接收请求，也可能已经处理后响应丢失 | 根据连接和响应进度决定重试 |
| usage 缺失 | 流被取消或供应商未返回最终 usage | 进入待核对状态，不能随意记零 |
| 故障切换成功 | 能力、数据区域、价格或输出行为可能已改变 | 路由策略记录候选兼容条件 |

::: warning 容易误判
一条成功命令只能证明它覆盖的那一层。重启后的短暂恢复也不是根因已经消失，改变状态前先保存最早证据。
:::



## 这套判断方法的边界

网关不应解析 Prompt 来猜租户权限，也不应把原始正文放入指标标签。API Key 只保存不可逆摘要或受保护引用；费用是版本化价格乘可信 usage 的账本结果，不应只靠实时内存计数。

网关需要一份稳定的逻辑模型目录，才能在部署变化时保持业务标识不变。下一篇建立多模型平台的注册、能力、版本、健康和切换模型。
