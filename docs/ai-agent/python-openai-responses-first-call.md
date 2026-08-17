---
title: "用 Python 调用一次 Responses API"
description: "从环境、凭证和请求字段走到同步输出、usage、流式事件和错误分类。"
category: ai-agent
part: "模型、调用与 Agent 基础"
stageKey: foundations
chapter: 3
sequence: 3
slug: python-openai-responses-first-call
tags:
  - "Python"
  - "OpenAI"
  - "Responses API"
sourceKey: ai-python-openai-responses-first-call
dependsOn:
  - "messages-tokens-context"
updated: '2026-08-17'
lastUpdated: false
---
# 用 Python 调用一次 Responses API

第一次接入模型服务时，最重要的目标很小：发送一份能解释的请求，收到一份能分类的响应。能打印出一句话，只能证明最短链路曾经走通；要把这次调用接进应用，还得知道输入由哪些字段组成、响应为什么结束、Token 怎样计量，以及失败发生在本地配置、HTTP 传输还是模型响应阶段。

本文只讨论一次 **Responses API** 调用。会话持久化、工具执行、Agent 循环和业务授权属于后面的应用层。贯穿示例是一条知识解释请求：用户问远程访问申请通常需要哪些条件，应用提供一段已经确认的制度摘要，让模型把它整理成易读说明。模型没有账号查询工具，因此不能回答“你的账号为什么被拒绝”。

::: info 这次调用要观察的对象

- 请求：`model`、`instructions`、`input` 和输出上限。
- 响应：`id`、`status`、`output`、`output_text`、`usage`、`error` 与 `incomplete_details`。
- 终态：完成、不完整、失败、取消，或 HTTP 请求根本没有建立。

:::

## Responses API 解决什么问题

Responses API 是模型服务的统一调用入口。调用方提交文本、图像或文件等输入，模型返回消息、文本、结构化内容、工具调用等输出项目。本文使用最小的文本输入，但响应对象仍按完整协议处理，因为将来加入工具或结构化输出后，`output` 不一定只有一段文本。

它解决的是一次模型请求的传输与响应组织问题。应用把输入交给服务，服务生成 Response，并用 `status`、`error`、`incomplete_details` 和若干 Output Item 描述结果。SDK 提供 `output_text` 这样的便捷属性，将输出项目中的文本聚合起来，省去第一次调用时遍历多层对象的代码。

这层 API 不知道当前登录用户是谁，也不会自动读取业务数据库。即使请求返回 `status="completed"`，也只表示模型服务完成了这次生成。账号是否存在、制度是否为当前版本、用户能否看到某份资料，都要由业务程序在调用前后确认。

可以把一次调用拆成三层结果：

| 层次 | 可观察证据 | 能说明什么 |
| --- | --- | --- |
| 传输 | HTTP 状态、异常类型、请求 ID | 请求是否到达服务，或客户端在哪一步失败 |
| 模型 | Response `status`、Output Item、`error` | 生成是否完成，返回了哪类项目 |
| 业务 | 权限、版本、证据和字段校验 | 结果是否允许交付给当前用户 |

三层要分别记录。把 HTTP 200 直接写成业务成功，会让空文本、工具调用和不完整响应被当作正常答案；把业务拒绝写成模型失败，又会让排障人员沿错误方向检查密钥和网络。

## 请求由哪些字段组成

最小文本请求包含 `model` 和 `input`。`model` 指定实际调用的模型，`input` 是本次要处理的内容。工程代码通常还会使用 `instructions` 保存本次调用的开发者规则，将“怎样回答”和“用户问什么”分开。模型名从部署配置读取，文章示例使用 `OPENAI_MODEL`，避免把可能过期或当前账号不可用的名称固化在业务函数里。

```python
response = client.responses.create(
    model=model,
    instructions=(
        "只依据输入中的制度摘要回答。"
        "资料没有说明的账号状态必须明确说无法确认。"
    ),
    input=(
        "制度摘要：远程访问需要设备合规检查和审批。"
        "问题：远程访问申请通常需要哪些条件？"
    ),
)
```

`instructions` 会进入模型上下文，但它不是服务端权限策略。写一句“不要查询其他租户”不能代替数据库过滤，也不能阻止一个权限过宽的工具读取隐藏数据。真正的身份、租户、知识版本和工具范围由服务端装配，模型不负责填写这些字段。

较长回答可以使用 `max_output_tokens` 设置生成上限。官方接口将它定义为可生成 Token 的上界，其中可能同时包含可见输出和推理 Token。它是资源限制，不是最低篇幅要求。设置过小可能得到不完整响应，设置很大也不会强迫模型写满。

Responses API 还支持 `tools`、`tool_choice`、结构化文本格式、会话状态和缓存相关字段。这些字段会改变协议，需要在对应主题中单独处理。第一次调用只保留能解释的最小集合，调试时才能快速确认问题出在输入、模型选择还是响应解析。

请求快照至少保存模型名、规则版本、输入摘要、调用时间和应用侧 request_id。密钥、完整 Authorization 头、含隐私的原始问题不进入普通日志。需要复现时，通过受控存储中的稳定 ID 读取原始材料。

## 准备 Python 环境和凭证

安装官方 Python SDK 后，`OpenAI()` 默认从环境读取凭证。代码不接收明文密钥参数，仓库里也不保存 `.env` 的真实值。

```bash
python -m pip install openai
export OPENAI_API_KEY="..."
export OPENAI_MODEL="当前账号可用的模型 ID"
```

启动前先区分两类本地配置错误。`OPENAI_API_KEY` 缺失意味着请求还不具备认证材料，程序应在创建真实 Client 之前停止；`OPENAI_MODEL` 缺失意味着应用不知道要调用哪个模型，同样不应发送请求。二者都不需要网络重试。

代理、证书、DNS 和出口限制属于网络环境。它们可能让客户端在建立连接前失败，也可能造成读取超时。排查时记录异常类型、目标主机和耗时，不打印密钥。企业代理修改 TLS 证书时，还要确认 Python 进程使用的证书链，而不是把所有连接错误归为“API 不可用”。

凭证有效也不代表某个模型一定可用。账号权限、项目配置和模型可用范围可能不同，因此模型 ID 应由环境配置或模型网关管理。遇到模型不可用的错误时，检查当前项目的配置与响应错误，不要在代码里静默换成另一个模型。静默切换会改变质量、成本和功能支持，却没有留下路由证据。

生产环境通常把 API Key 放入密钥管理服务，在进程启动或请求作用域内注入。轮换密钥时需要明确旧连接怎样失效。日志只记录“凭证已装配”及密钥版本标识，不能记录值本身。

## 发出第一次同步请求

同步调用会等待完整 Response 返回，最适合观察第一条链路。共享示例把 SDK 适配器和输出检查放在一起，并允许测试传入 Fake Client：

<<< ../../examples/ai-agent/openai_responses.py

调用顺序可以按下面五步读：

1. 读取并校验模型配置，缺失时不创建网络请求。
2. 组装 `model`、`instructions` 和 `input`。
3. 调用 `client.responses.create(...)`。
4. 检查 Response 状态与输出项目，再读取文本。
5. 将 SDK 对象转换成应用内部结果，保存请求 ID、用量和终止原因。

同步函数的返回点只有两个方向。正常方向得到 Response；异常方向由 SDK 抛出认证、限流、连接或服务错误。业务代码不要用一个宽泛的 `except Exception` 把它们统一改成“模型暂不可用”，否则调用方不知道能否重试，也无法区分配置问题与服务抖动。

这次示例的输入包含制度摘要，输出应当解释“设备合规检查和审批”这两个条件。若模型声称当前用户的设备不合规，文本虽然语法完整，业务校验仍应拒绝，因为输入没有提供该用户的设备状态。这是一次调用最值得保留的反例：传输成功、模型完成、业务失败可以同时成立。

请求超时由应用的总 Deadline 决定。假设入口还剩八秒，模型客户端最多只能使用这八秒中的一部分，内部重试不能重新获得完整时限。同步 API 本身不会替应用管理跨步骤 Deadline，适配层要把剩余时间显式传入客户端配置。

## 读取文本、响应状态和 usage

`response.output_text` 适合读取聚合文本，但它不是完整 Response 的替代品。解析器先看 `status`，再检查 `output` 中是否存在当前业务需要的项目类型。没有文本可能意味着模型提出了工具调用、返回拒绝内容、响应处于不完整状态，或确实完成但没有生成可用文本。

官方 Response 对象包含 `error` 和 `incomplete_details`。状态不完整时，应用保留这两个字段以及当前输出，按停止原因决定是否允许展示局部结果。需要完整 JSON 或完整引用列表的场景，局部输出通常不能交付；普通聊天可以把它标成中断内容，但不能伪装成完整回答。

`usage` 用来核对资源，而不是判断内容真假。当前接口会返回 `input_tokens`、`output_tokens` 和 `total_tokens`，细分对象还可能包含缓存 Token 或推理 Token。应用保存供应商返回的值，不根据字符串长度自行补造。Fake 测试可以提供固定 usage 样本来验证字段映射，但报告不能把这个样本写成线上实测。

一次可交付的文本结果至少满足以下条件：

- Response 已完成，且没有未处理的错误。
- 输出中存在预期的文本项目，聚合结果非空。
- 文本通过当前任务的结构、权限、版本和证据校验。
- request_id、Response ID、模型和 usage 已关联到同一次调用。

若输出是 Tool Call，当前步骤的结果就不是最终答案。运行时读取工具名和参数候选，完成参数校验、授权与执行后，再把工具结果送入下一次模型调用。第一次调用文章到这里停止，不把后续 Agent 循环偷偷塞进一个 `output_text` 判断中。

## 流式事件怎样到达

流式调用在请求中设置 `stream=True`，SDK 返回可以迭代的事件流。Responses API 使用带类型的语义事件。文本输出常见的生命周期包括 `response.created`、若干 `response.output_text.delta`、`response.output_text.done` 和 `response.completed`；发生协议或服务错误时还可能收到 `error` 等事件。

```python
stream = client.responses.create(
    model=model,
    input="解释远程访问申请的通用条件",
    stream=True,
)

parts: list[str] = []
completed = False

for event in stream:
    if event.type == "response.output_text.delta":
        parts.append(event.delta)
    elif event.type == "response.completed":
        completed = True
    elif event.type == "error":
        raise RuntimeError("stream_failed")

if not completed:
    raise RuntimeError("stream_ended_without_completion")
text = "".join(parts)
```

真实代码应使用 SDK 当前版本提供的事件类型，而不是假定每个事件都有 `delta`。消息项目、工具参数、拒绝和完成状态各有自己的事件。把所有 payload 强行拼成字符串，会把工具参数或错误对象混进用户可见文本。

浏览器看到文字逐步出现，不等于任务已经完成。客户端只能在收到完成事件并通过业务校验后，将本次调用标记为 completed。连接中途断开时，已经显示的是局部输出。普通对话可以提示中断后重新请求；存在工具副作用或长任务状态时，不能简单重发整个调用，需要由上层 Runtime 保存事件和恢复位置。

流式输出会增加内容审核难度。完整结果可以在交付前统一检查，增量文本却已经到达客户端。高风险场景可以先在服务端缓冲到句子或完成结果，通过检查后再发；是否接受更高首字延迟，要由业务风险决定。

## 认证、限流、超时和空响应怎样区分

错误分类从“请求是否发出”开始。

**本地配置错误**，密钥或模型配置缺失。程序直接失败，不调用 SDK，不重试。修复动作是补齐配置或停止部署。

**认证错误**，服务拒绝凭证或项目权限。重复发送同一凭证不会恢复，应检查密钥来源、项目和请求目标。日志保留 HTTP 状态、错误类型和脱敏请求标识。

**限流错误**，当前配额或速率不允许继续。调用方读取服务返回的错误与重试提示，将等待时间计入总 Deadline，并采用有限退避。任务剩余时间不足时直接返回暂不可用，不在后台无限排队。

**网络超时**，客户端在期限内没有拿到确定结果。它不能证明服务端一定没有处理请求。纯生成请求可以在预算内重试；带外部副作用的流程需要稳定请求身份和上层幂等保护，不能仅凭超时重复执行。

**模型响应不完整**，已经收到 Response，但 `status` 或 `incomplete_details` 表示没有完整结束。应用依据输出用途处理局部内容。需要完整结构时拒绝，允许草稿时也要标明未完成。

**空文本**，`output_text` 为空。继续检查 `output`，区分 Tool Call、拒绝、非文本项目与真正的异常空输出。只判断 `if not output_text` 会把几种控制路径压成同一个错误。

错误对象进入内部稳定枚举，例如 `configuration_error`、`authentication_error`、`rate_limited`、`timeout`、`incomplete_response` 和 `missing_expected_output`。SDK 升级改变异常类时，只修改适配层；业务层根据稳定枚举决定重试、提示或终止。

## 用 Fake Adapter 测试无密钥路径

无密钥测试验证应用控制逻辑，不模拟模型智能。Fake Client 记录 `responses.create` 收到的参数，再返回最小 Response 形状。测试可以稳定断言 model、instructions 和 input，没有网络波动，也不会产生真实用量。

第一组用例检查入口：缺少 `OPENAI_MODEL` 时调用次数为零；输入为空时在本地拒绝；有效配置只发出一次请求。第二组覆盖响应：completed 文本可以解析，incomplete 不能写成成功，Tool Call 不能被误判为空响应。第三组让适配器抛出认证、限流和超时错误，检查稳定错误类型与可重试性。

流式 Fake 按顺序产生 created、两个文本 delta 和 completed，期望聚合文本只写入一次。再加入 error、缺少 completed、重复 delta 和乱序项目，确认客户端不会因为已经显示了字符就提前提交终态。

```text
输入：model="configured-model"，input="解释申请条件"
调用：responses.create 被调用 1 次
事件：created -> delta("需要") -> delta("审批") -> completed
输出：text="需要审批"，status="completed"

失败注入：第二个 delta 后连接结束
输出：status="interrupted"，不得保存为完整答案
```

Fake 测试无法证明凭证、网络和真实模型可用。在线验证应单独执行，记录 SDK 版本、模型 ID、时间、脱敏请求 ID、Response 状态和 usage。没有实际执行时，文章只能说明联调条件，不能写“实测通过”或编造返回内容。

## 真实调用与生产适配的边界

教程代码可以直接访问 SDK Response，业务代码最好通过模型网关转换成稳定内部对象。网关负责模型配置、超时、错误映射、Trace、用量归因和日志脱敏，上层只接收文本、输出项目、状态与稳定错误。SDK 字段变化被限制在适配层，不会扩散到每个业务服务。

模型网关仍只完成一次调用。Conversation、Turn、Message、工具执行、重试预算和最终终态由 Agent Runtime 保存。需要多轮对话时，上层明确选择历史或使用服务提供的会话能力；需要 Tool Calling 时，上层校验并执行候选动作。两者都不能靠在网关里追加一个无限循环临时完成。

生产接入至少补齐四类验证：使用真实凭证的最小联调；认证、限流和超时的错误映射；不同 Output Item 的契约测试；流式断线与客户端取消。涉及敏感资料时，还要确认输入日志、供应商数据设置和内部存储策略符合当前要求。

这篇文章完成后的判断标准很具体：能指出请求字段来自哪里，能从 Response 区分文本、工具调用和不完整状态，能解释 usage 的用途，也能让每种失败落到不同恢复动作。下一篇结构化输出会继续处理“返回形状可解析”与“字段内容可信”之间的区别。
