---
title: 用 Python 调用一次 Responses API
description: 按真实调用顺序准备凭证、发送请求、读取输出和 usage，再处理流式事件与错误。
category: ai-agent
part: 模型与 Agent 基础
stageKey: foundations
chapter: 3
sequence: 3
slug: python-openai-responses-first-call
tags:
  - Python
  - OpenAI
  - Responses API
sourceKey: ai-python-openai-responses-first-call
dependsOn:
  - messages-tokens-context
updated: '2026-08-14'
lastUpdated: false
---
# 用 Python 调用一次 Responses API

Responses API 把文本输入、工具调用和流式事件放在同一响应模型中。第一次调用只做一件事：发送一个问题，完整读回文本、状态和 usage。工具循环留到后面的文章。

## 请求由模型、指令和输入组成

OpenAI 的[开发者快速开始](https://developers.openai.com/api/docs/quickstart)使用 `OpenAI()` 创建客户端。SDK 默认从 `OPENAI_API_KEY` 环境变量读取密钥，代码仓库和前端构建产物都不应保存密钥。

示例把模型名放在 `OPENAI_MODEL`，避免教程替读者选择一个会随时间变化的默认值。

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -U openai
export OPENAI_API_KEY="替换为自己的密钥"
export OPENAI_MODEL="替换为账号可用的模型 ID"
```

`instructions` 放这次请求的开发者规则，`input` 放用户问题。应用如果还要传历史、图片或工具结果，可以把 `input` 改为结构化列表。

## 发出第一次同步请求

下面的文件只有 `main()` 会导入真实 SDK，`create_response` 本身接受一个窄接口，因此无密钥测试可以传入 Fake Client。

<<< ../../examples/ai-agent/openai_responses.py

运行命令是：

```bash
python examples/ai-agent/openai_responses.py
```

真实调用需要有效密钥、可用模型和网络。仓库测试只验证应用传给 SDK 的字段，不会伪造“真实模型已调用”的结果。

## 读取正文、状态和 usage

`response.output_text` 是 SDK 汇总后的文本便捷字段。它适合纯文本入门，接入工具和多模态后仍应遍历 `response.output`，根据每个 item 的 `type` 处理消息、工具调用或其他结果。

`response.status` 表示响应状态。`response.usage` 记录输入和输出消耗，具体字段以当前 SDK 类型和 API 返回为准。日志可以记录响应 ID、状态、耗时和 Token 统计，但不要记录密钥、完整私有 Prompt 或未脱敏文档。

## 流式事件按类型到达

将 `stream=True` 传给 `client.responses.create` 后，SDK 返回可迭代事件流。官方的[流式响应说明](https://developers.openai.com/api/docs/guides/streaming-responses)列出了常见事件：`response.created`、`response.output_text.delta`、`response.completed` 和 `error`。

```python
stream = client.responses.create(
    model=os.environ["OPENAI_MODEL"],
    input="什么是 Agent 循环？",
    stream=True,
)

for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
    elif event.type == "response.completed":
        print("\ncompleted")
```

文本 delta 只能说明有内容到达。持久化最终答案、扣减业务额度或把 Turn 标记为完成，应等待完成事件并检查最终响应。

## 四类失败的证据不同

认证失败通常有 HTTP 401，先检查密钥是否存在、是否被错误地带入前端，以及客户端使用了哪个项目配置。限流或额度问题常见 HTTP 429，需要读取错误体和响应头，再按服务规则决定退避或停止。

客户端超时可能没有完整 HTTP 响应，不能据此断言服务端没有处理请求；有副作用的业务需要幂等键。连接错误要检查 DNS、代理和 TLS。API 返回完成状态但没有可用文本，则属于应用层空响应，应保存响应 ID 和输出 item 类型，而不是统一改写成“模型超时”。

## 无密钥测试验证的是适配层

`yarn ai-agent:examples` 会用 Fake Responses Client 检查模型名和问题是否原样传入。这能证明本地适配函数的输入装配，没有证明认证、供应商延迟、模型质量或线上流式行为。在线验证应单独执行，并明确记录模型 ID、SDK 版本和运行时间。
