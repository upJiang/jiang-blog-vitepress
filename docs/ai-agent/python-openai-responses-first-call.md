---
title: 用 Python 调用一次 Responses API
description: 从环境、凭证和请求字段走到同步输出、usage、流式事件和错误分类。
category: ai-agent
part: 模型、调用与 Agent 基础
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

Responses API 是模型服务的统一调用入口。调用方提交文本、图像或文件等输入，模型返回消息、文本、结构化内容、工具调用等输出项目。字段和状态的完整定义以 [Responses API 官方参考](https://developers.openai.com/api/docs/api-reference/responses) 为准。本文使用最小的文本输入，但响应对象仍按完整协议处理，因为将来加入工具或结构化输出后，`output` 不一定只有一段文本。

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

`input` 不只接受一个字符串，也可以由多条带角色的输入项目组成。字符串适合一次性的短任务，调用方已经把资料和问题整理成一份完整输入；消息形式适合需要保留角色、分开来源或携带不同内容类型的请求。两种写法最后都会进入模型上下文，却不能随意互换。把开发者规则、检索证据和用户问题拼成一个无标记字符串后，应用很难解释某句话来自哪里，也难以在日志脱敏时只移除用户内容。

消息形式也不等于自动拥有会话。每次调用仍要明确本次提交了哪些历史，或者显式使用服务支持的会话关联能力。应用数据库里有十轮 Message，而请求只传了最后一轮，模型就看不到前九轮；反过来，把整个数据库记录不加筛选地传入，会把旧范围、过期证据和无关工具结果一起带进当前调用。

输入超过模型上下文时，失败策略应当显式选择。官方接口的 `truncation` 默认是 `disabled`，超出上下文会返回请求错误；使用 `auto` 时，服务可能从会话前部移除项目以适配窗口。自动截断适合调用方接受丢失早期内容的场景，却不适合依赖初始约束、审批记录或成对工具调用的任务。更可控的做法是在调用前估算预算，保留不可删除项，并把省略原因写进请求快照。

请求快照至少保存模型名、规则版本、输入摘要、调用时间和应用侧 request_id。密钥、完整 Authorization 头、含隐私的原始问题不进入普通日志。需要复现时，通过受控存储中的稳定 ID 读取原始材料。

## 准备 Python 环境和凭证

先准备 Python 3.10 或更高版本。没有 Python 时，从 [Python 官方下载页](https://www.python.org/downloads/)选择当前系统的安装包；macOS 安装后运行 `python3 --version`，Windows 安装器需要勾选把 Python 加入 PATH，并在新终端运行 `python --version`。

<figure class="doc-shot">
  <img src="/images/install/python-downloads.png" alt="Python 官方下载页，展示各平台安装入口" loading="lazy">
  <figcaption>Python 官方下载入口。安装包只解决解释器，虚拟环境、SDK 和 API 凭证仍需按下面步骤单独确认。</figcaption>
</figure>

OpenAI 的 [Developer Quickstart](https://developers.openai.com/api/docs/quickstart#install-the-openai-sdk-and-run-an-api-call) 给出了 Python SDK 的安装和第一次 Responses 调用，[SDK 仓库](https://github.com/openai/openai-python) 记录版本变更和完整接口。下面先创建独立虚拟环境，避免把依赖写进系统 Python：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install openai
python -c "import openai; print(openai.__version__)"
```

Windows PowerShell 的激活命令是 `.venv\Scripts\Activate.ps1`。最后一条命令应输出已安装 SDK 的版本号；出现 `ModuleNotFoundError` 时，先确认当前终端已经激活 `.venv`，并检查 `python -m pip --version` 指向的路径，不要直接反复全局安装。

下图截取自 OpenAI 官方 Quickstart 的 Python 标签，安装命令、最小调用和运行方式都在同一区域。官方页面会持续更新，复制代码时仍以链接中的当前内容为准。

<figure class="doc-shot">
  <img src="/images/ai-agent/openai-python-sdk-install.png" alt="OpenAI Developer Quickstart 中的 Python SDK 安装与 Responses API 示例" loading="lazy">
  <figcaption>OpenAI Developer Quickstart 的 Python 安装与第一次 Responses 调用。</figcaption>
</figure>

SDK 安装成功后，`OpenAI()` 默认从环境读取凭证。代码不接收明文密钥参数，仓库里也不保存 `.env` 的真实值：

```bash
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

应用 request_id 与 `response.id` 解决不同问题。前者在网络调用之前创建，可以关联本地校验、每次重试和最终交付；后者由模型服务返回，只能证明某次服务端 Response 的身份。第一次尝试超时后又发起第二次，两次尝试仍属于同一个应用请求，却可能只有第二次拿到 Response ID。日志应保存一对多关系，不能用最后一个 ID 覆盖整条时间线。

调用代码还要明确谁拥有重试。若 SDK、模型网关和业务服务各自重试两次，一次用户请求可能产生多次调用，外层却只看到一次等待。通常由模型网关统一限制尝试次数，业务层只决定是否发起新的业务尝试；底层 SDK 的重试配置也要计入同一预算。这样才能根据 attempt 还原每次等待、异常和 usage，避免把隐式重试误认为单次模型延迟。

## 读取文本、响应状态和 usage

`response.output_text` 适合读取聚合文本，但它不是完整 Response 的替代品。解析器先看 `status`，再检查 `output` 中是否存在当前业务需要的项目类型。没有文本可能意味着模型提出了工具调用、返回拒绝内容、响应处于不完整状态，或确实完成但没有生成可用文本。

官方 Response 对象包含 `error` 和 `incomplete_details`。状态不完整时，应用保留这两个字段以及当前输出，按停止原因决定是否允许展示局部结果。需要完整 JSON 或完整引用列表的场景，局部输出通常不能交付；普通聊天可以把它标成中断内容，但不能伪装成完整回答。

`output` 是 Output Item 数组，不保证第一个项目就是文本消息，也不保证所有项目的 `content` 形状相同。加入 Tool Calling、结构化输出或其他能力后，同一个 Response 可能包含不同类型的项目。解析器先按项目类型分派，再读取该类型允许的字段。把代码写死成 `response.output[0].content[0].text`，第一次文本调用也许能工作，协议一扩展就会把工具调用当成属性缺失。

内部结果可以保留两份视图。一份是方便页面展示的聚合文本，来源是 SDK 的 `output_text`；另一份是经过类型化转换的输出项目，供工具运行时、结构化结果解析器或审计代码使用。两份视图都关联同一个 Response ID。上层如果只需要普通文本，可以读取第一份；需要判断下一动作时，必须查看第二份，不能靠“文本是否为空”猜测模型的决定。

响应解析还要防止“部分可读”掩盖协议问题。某个文本项目解析成功，而同一 Response 中另一个必需项目无法识别时，适配层应返回带原始类型的解析错误或明确标记部分结果。静默跳过未知项目会让 SDK 升级后的新类型消失在日志里，业务层却仍把响应写成 completed。

`usage` 用来核对资源，而不是判断内容真假。当前接口会返回 `input_tokens`、`output_tokens` 和 `total_tokens`，细分对象还可能包含缓存 Token 或推理 Token。应用保存供应商返回的值，不根据字符串长度自行补造。Fake 测试可以提供固定 usage 样本来验证字段映射，但报告不能把这个样本写成线上实测。

usage 也不直接等于最终账单。模型、缓存、批处理或供应商计费规则可能影响价格，适配层只保存原始用量和模型身份，计费服务再按当时有效的价格版本计算。若 Response 没有可用 usage，记录 missing 比根据文本长度估算更可靠；估算值若用于容量预警，应放在单独字段，不能冒充服务返回值。

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

流式客户端适合写成一个小状态机。初始状态是 pending，收到创建事件后进入 streaming；文本 delta 只追加到当前缓冲区，不改变终态；完成事件携带的 Response 经过解析和业务检查后进入 completed。错误事件进入 failed，迭代器在没有完成事件的情况下结束则进入 interrupted。completed、failed 和 interrupted 都是终态，后到的 delta 不应继续修改文本。

状态机还要处理重复消费。页面重连、代理重试或上层事件转发可能让同一段内容再次到达。若协议或转发层提供稳定事件身份，应按身份去重；没有稳定身份时，适配层至少不能在自动重连后把旧缓冲区和一次全新的请求直接拼接。最简单的边界是每次模型调用分配独立 run_id，缓冲区只接受该 run_id 的事件。

用户取消与网络断开不是同一件事。取消表示调用方明确要求停止，应尝试关闭流并把上层任务写成 cancelled；网络断开只说明当前传输通道丢失，服务端是否仍在生成需要结合 SDK 能力和应用运行时判断。两者都不能仅凭页面不再收到 delta 就写成 completed。

## 认证、限流、超时和空响应怎样区分

错误分类从“请求是否发出”开始。

**本地配置错误**，密钥或模型配置缺失。程序直接失败，不调用 SDK，不重试。修复动作是补齐配置或停止部署。

**认证错误**，服务拒绝凭证或项目权限。重复发送同一凭证不会恢复，应检查密钥来源、项目和请求目标。日志保留 HTTP 状态、错误类型和脱敏请求标识。

**限流错误**，当前配额或速率不允许继续。调用方读取服务返回的错误与重试提示，将等待时间计入总 Deadline，并采用有限退避。任务剩余时间不足时直接返回暂不可用，不在后台无限排队。

**网络超时**，客户端在期限内没有拿到确定结果。它不能证明服务端一定没有处理请求。纯生成请求可以在预算内重试；带外部副作用的流程需要稳定请求身份和上层幂等保护，不能仅凭超时重复执行。

**模型响应不完整**，已经收到 Response，但 `status` 或 `incomplete_details` 表示没有完整结束。应用依据输出用途处理局部内容。需要完整结构时拒绝，允许草稿时也要标明未完成。

**空文本**，`output_text` 为空。继续检查 `output`，区分 Tool Call、拒绝、非文本项目与真正的异常空输出。只判断 `if not output_text` 会把几种控制路径压成同一个错误。

错误对象进入内部稳定枚举，例如 `configuration_error`、`authentication_error`、`rate_limited`、`timeout`、`incomplete_response` 和 `missing_expected_output`。SDK 升级改变异常类时，只修改适配层；业务层根据稳定枚举决定重试、提示或终止。

重试条件由错误类型、请求性质和剩余 Deadline 共同决定。本地配置、认证失败、非法参数和业务拒绝通常需要改配置或改输入，原样重试没有意义。限流、连接中断和部分服务错误可以进入有限重试，但每次等待和调用都从同一总 Deadline 扣除。适配层还应给出 `retryable` 和原始错误类别，由上层决定是否还有预算，不在底层 SDK 外再套一个无限循环。

一次纯文本生成没有外部工具副作用，超时后的有限重试风险较低，但仍可能产生两份供应商侧调用与用量记录。日志要让两次尝试共享应用 request_id，并为每次尝试保存独立 attempt、Response ID 或未知结果。将第二次成功覆盖第一次超时，会使成本和延迟无法归因。

错误日志至少回答四个问题：请求是否离开本地进程，服务是否返回了可识别响应，当前尝试消耗了多少时间，调用方下一步能做什么。日志不保存完整输入和密钥；调试所需的正文通过受控 request_id 回查。这样既能区分认证、限流和超时，也不会为了排障复制敏感上下文。

## 用 Fake Adapter 测试无密钥路径

无密钥测试验证应用控制逻辑，不模拟模型智能。Fake Client 记录 `responses.create` 收到的参数，再返回最小 Response 形状。测试可以稳定断言 model、instructions 和 input，没有网络波动，也不会产生真实用量。

第一组用例检查入口：缺少 `OPENAI_MODEL` 时调用次数为零；输入为空时在本地拒绝；有效配置只发出一次请求。第二组覆盖响应：completed 文本可以解析，incomplete 不能写成成功，Tool Call 不能被误判为空响应。第三组让适配器抛出认证、限流和超时错误，检查稳定错误类型与可重试性。

测试矩阵还要覆盖 Output Item 的组合，而不只测一个正常字符串。可以准备“单个文本消息”“多个文本片段”“只有 Tool Call”“文本加未知项目”“completed 但聚合文本为空”五组 Response。每组都断言内部项目列表、聚合文本、状态和错误类型。未知项目是否允许透传由适配器契约决定，但不能静默变成空文本。

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

在线验证也不应直接复用生产业务请求。准备一条不含隐私、答案可以人工检查的最小输入，先验证同步文本，再验证流式终态；需要测限流或超时时使用隔离配置和明确预算。验证记录保存实际命令、依赖版本和脱敏标识，不把一次成功扩写成“服务稳定”或“该模型适合生产”的结论。

## 真实调用与生产适配的边界

教程代码可以直接访问 SDK Response，业务代码最好通过模型网关转换成稳定内部对象。网关负责模型配置、超时、错误映射、Trace、用量归因和日志脱敏，上层只接收文本、输出项目、状态与稳定错误。SDK 字段变化被限制在适配层，不会扩散到每个业务服务。

模型网关仍只完成一次调用。Conversation、Turn、Message、工具执行、重试预算和最终终态由 Agent Runtime 保存。需要多轮对话时，上层明确选择历史或使用服务提供的会话能力；需要 Tool Calling 时，上层校验并执行候选动作。两者都不能靠在网关里追加一个无限循环临时完成。

生产接入至少补齐四类验证：使用真实凭证的最小联调；认证、限流和超时的错误映射；不同 Output Item 的契约测试；流式断线与客户端取消。涉及敏感资料时，还要确认输入日志、供应商数据设置和内部存储策略符合当前要求。

模型网关对上层暴露的对象可以很小，但字段含义要稳定。一个可用的 `ModelResult` 通常包含调用 ID、模型、完成状态、聚合文本、类型化输出项目、usage 和稳定错误；流式接口则输出类型化事件，并在终态提供同一份结果对象。同步和流式若使用两套互不兼容的错误枚举，业务层会在切换展示方式时得到不同恢复行为。

发布新适配器前，可以用旧版契约样本做回放：相同的 Fake Response 应得到相同内部状态，认证与超时仍映射到原有错误，未知项目明确进入兼容分支。真实联调只验证供应商协议和凭证，不能替代这些确定性回归。模型、SDK 或请求字段升级后，也应重新检查 `output` 类型、流式事件和 usage 映射，而不是只确认还能打印 `output_text`。

一次调用到这里有了明确边界：请求字段有来源，Response 中的文本、工具调用和不完整状态能够分开，usage 只用于资源核对，每种失败也对应不同恢复动作。返回形状能够解析之后，还要继续检查字段内容是否可信。
