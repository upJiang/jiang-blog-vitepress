---
title: Python 第一次调用真实模型：请求、响应、usage、错误与流式输出
description: 使用 OpenAI Responses API 完成第一次真实请求，读懂响应和 usage，并用同一接口的 Fake Adapter 覆盖无密钥测试。
category: ai-agent
part: 认识与第一次运行
chapter: 2
tags:
  - OpenAI
  - Responses API
  - Streaming
  - Usage
prerequisites:
  - 会运行 Python 脚本
  - 理解环境变量和 HTTP 请求
outcomes:
  - 能运行同步和流式 Responses 请求
  - 能区分认证、限流、超时、空响应与测试替身
practice:
  type: implementation
  result: 得到可替换的 ModelGateway、真实调用入口和无密钥测试
  verify:
    - 有密钥时读取真实 output_text 与 usage
    - 无密钥时 Fake Adapter 测试不会伪装在线结果
evidence: official
updated: 2026-08-12T00:00:00.000Z
lastUpdated: false
---
# Python 第一次调用真实模型：请求、响应、usage、错误与流式输出

先把这一行真正跑通：

```text
回答：发布完成后，先检查健康接口，再核对实际流量是否进入新版本。
输入 Token：37
输出 Token：24
```

这里的文字和数字应当来自一次真实 API 响应，而不是脚本里预先写好的字符串。要做到这一点，程序至少经历了五步：从环境变量读取凭证，构造请求，通过 HTTPS 把请求交给模型服务，等待服务生成 Response，再从 Response 中取出文本和用量。

这一章会把这五步落成 `app/model_gateway.py`。后面写 Tool Calling、Agent 循环、LangChain 和 LangGraph 时都继续使用这个网关，不再让每篇文章各写一套模型调用。

## API Key 是身份凭证，不是模型参数

OpenAI API Key 用来证明“哪个 API 项目正在发请求”。服务端据此判断权限、限额和计费归属。它不应写进 Python 文件、Prompt、URL、日志或浏览器代码，也不应该作为函数参数在业务层到处传递。

在终端中为当前 shell 设置变量：

```bash
# 把右侧内容替换为自己的 Key；环境变量只提供给当前 shell 启动的进程。
export OPENAI_API_KEY="你的_API_Key"

# 模型名也通过环境变量管理，后续切换模型时不必改业务代码。
export OPENAI_MODEL="gpt-5.6"

# 只检查变量是否存在，不打印真实凭证。
test -n "$OPENAI_API_KEY" && echo "OPENAI_API_KEY 已设置"
```

第一条命令把 Key 放进进程环境；Python SDK 默认读取 `OPENAI_API_KEY`。第二条命令保存模型配置。第三条只验证变量非空，避免 Key 被终端历史、录屏或工单再次暴露。关闭这个 shell 后，临时变量随之消失。

如果代码将来运行在容器或 CI 中，应使用 Secret 管理功能注入同名变量。`.env` 适合本地开发，但必须加入 `.gitignore`；它不是 Secret 保险箱。

## 一次 Responses 请求交了什么，又拿回什么

Responses API 的最小请求包含 `model` 和 `input`。`model` 选择能力与计价规则，`input` 保存本轮用户任务。SDK 把 Python 对象序列化为 JSON，通过 `/v1/responses` 发给服务端。

```mermaid
sequenceDiagram
  participant P as Python 应用
  participant S as OpenAI SDK
  participant A as Responses API
  participant M as 模型运行服务
  P->>S: model + instructions + input
  S->>A: HTTPS 请求和 Bearer Key
  A->>M: 鉴权通过后创建 Response
  M-->>A: output items + usage + status
  A-->>S: Response 对象
  S-->>P: output_text 与 usage
```

Python 应用负责输入和超时，SDK 负责认证头、序列化和响应类型，API 负责鉴权和创建 Response，模型运行服务完成输入处理与输出生成。返回的不是一段裸字符串，而是带 ID、状态、多个 output item 和 usage 的 Response 对象。

**`response.output_text` 是 SDK 提供的便利聚合字段。** `response.output` 可能同时包含消息、工具调用和其他 item，因此不要假定文字永远位于 `output[0].content[0].text`。后面接入 Tool Calling 时，我们会直接检查 output item 的类型。

## 建立可替换的模型网关

在 `agent-demo` 目录准备环境。输入是本机 Python 和包索引，目标是得到隔离环境、OpenAI SDK 与 pytest：

```bash
# 建立隔离环境，避免示例依赖污染系统 Python。
python3 -m venv .venv
source .venv/bin/activate

# SDK 负责 Responses API；pytest 用来验证无密钥替身和错误路径。
python -m pip install "openai>=1.99,<2" "pytest>=8,<9"

mkdir -p app tests
touch app/__init__.py
```

成功后，`python -c "import openai; print(openai.__version__)"` 会打印已安装版本。若安装失败，先检查虚拟环境是否激活、Python 能否访问包索引以及代理配置，不要通过关闭 TLS 校验绕过网络问题。

`app/model_gateway.py` 不把 OpenAI SDK 对象泄露到业务代码。调用方只看 `ModelReply`：文本、统一 usage 和供应商响应 ID。

```python
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    OpenAI,
    RateLimitError,
)

@dataclass(frozen=True, slots=True)
class TokenUsage:
    input_tokens: int
    output_tokens: int
    total_tokens: int

@dataclass(frozen=True, slots=True)
class ModelReply:
    text: str
    usage: TokenUsage
    response_id: str

class ModelGateway(Protocol):
    # 后续 Agent 只依赖这个协议，不直接依赖某一家 SDK。
    def answer(self, question: str) -> ModelReply: ...

class ModelGatewayError(RuntimeError):
    """向业务层暴露稳定错误码，同时保留原异常作为 cause。"""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code

class OpenAIResponsesGateway:
    def __init__(self, model: str | None = None, timeout_seconds: float = 20.0) -> None:
        # SDK 从 OPENAI_API_KEY 读取凭证；业务对象不保存或打印 Key。
        self._client = OpenAI(timeout=timeout_seconds, max_retries=0)
        self._model = model or os.environ.get("OPENAI_MODEL", "gpt-5.6")

    def answer(self, question: str) -> ModelReply:
        if not question.strip():
            raise ModelGatewayError("invalid_input", "问题不能为空")

        try:
            response = self._client.responses.create(
                model=self._model,
                # instructions 保存稳定规则，input 只保存本轮动态问题。
                instructions="你是只读技术助手。信息不足时明确说明，不虚构操作结果。",
                input=question.strip(),
            )
        except AuthenticationError as exc:
            raise ModelGatewayError("authentication_failed", "API Key 无效或无权访问") from exc
        except RateLimitError as exc:
            raise ModelGatewayError("rate_limited", "请求达到速率或额度限制") from exc
        except APITimeoutError as exc:
            raise ModelGatewayError("timeout", "模型请求超过截止时间") from exc
        except APIConnectionError as exc:
            raise ModelGatewayError("connection_failed", "无法连接模型服务") from exc
        except APIStatusError as exc:
            # 其他 HTTP 错误保留状态码，便于日志和重试策略判断。
            raise ModelGatewayError("api_error", f"模型服务返回 HTTP {exc.status_code}") from exc

        text = response.output_text.strip()
        if not text:
            # 本章没有声明 Tool，空文本不能被当成成功回答。
            raise ModelGatewayError("empty_output", "Response 完成但没有文本输出")

        usage = response.usage
        if usage is None:
            raise ModelGatewayError("missing_usage", "Response 没有返回 usage")

        return ModelReply(
            text=text,
            usage=TokenUsage(
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                total_tokens=usage.total_tokens,
            ),
            response_id=response.id,
        )
```

调用顺序从 `answer()` 开始。空问题在网络请求前被拒绝；随后 SDK 使用构造函数中的超时和禁用自动重试设置创建 Response。禁用 SDK 自动重试是为了让本章先看清一次失败，后面再在共享 Deadline 内加入有限重试。

异常转换没有抹掉原因：`raise ... from exc` 保留原始异常链，日志层可以读取 HTTP 状态和请求 ID，业务层只处理稳定 `code`。成功路径检查文本和 usage，然后返回不依赖 OpenAI 类型的 `ModelReply`。这一边界让 LangChain 或 Claude 适配器以后可以替换实现，而 Agent 循环不用改。

## 运行一次真实请求

入口只负责读取问题、调用网关和展示必要结果。不要打印完整 Response，因为其中可能包含用户输入、工具参数和其他不适合进入普通日志的内容。

```python
# run_model.py
from app.model_gateway import ModelGatewayError, OpenAIResponsesGateway

def main() -> None:
    # 网关隐藏供应商 SDK，入口只提交问题并接收统一的 ModelReply。
    gateway = OpenAIResponsesGateway()
    try:
        reply = gateway.answer("发布后怎样确认服务已经切换成功？")
    except ModelGatewayError as exc:
        # 命令行显示稳定错误；生产日志还应关联请求 ID，不能记录 API Key。
        raise SystemExit(f"模型调用失败 [{exc.code}]：{exc}") from exc

    # 只展示回答、计量和响应 ID，不把可能包含输入明细的完整 Response 写到终端。
    print(f"回答：{reply.text}")
    print(f"输入 Token：{reply.usage.input_tokens}")
    print(f"输出 Token：{reply.usage.output_tokens}")
    print(f"Response ID：{reply.response_id}")

if __name__ == "__main__":
    main()
```

执行 `python run_model.py`。真实回答和 Token 数会随模型、输入和服务端处理变化，不应该与本文开头的示意数字逐字一致。可验证的结果是：回答非空，三个 usage 字段为非负整数，`total_tokens` 能与响应计量对应，Response ID 非空。

认证失败通常先检查变量是否设置、Key 是否属于当前项目以及模型权限；429 既可能是短时间速率限制，也可能是额度限制，应读取原始错误类型后决定是否重试；连接失败检查 DNS、代理和 TLS；超时要记录已经消耗的时间，不能无上限原样重试。

## 流式输出不是“把字符串切碎”

非流式调用要等完整 Response 生成后才返回。流式调用使用 SSE 逐个发送**语义事件**。文本增量只是其中一种事件，常见生命周期还包括 `response.created`、`response.output_text.delta`、`response.completed` 和 `error`。

```python
from openai import OpenAI

def stream_answer(question: str) -> None:
    client = OpenAI(timeout=20.0, max_retries=0)
    stream = client.responses.create(
        model="gpt-5.6",
        input=question,
        stream=True,
    )

    completed = False
    for event in stream:
        if event.type == "response.output_text.delta":
            # delta 只是当前新增文字；按顺序追加，不能把它当完整答案覆盖页面。
            print(event.delta, end="", flush=True)
        elif event.type == "response.completed":
            # usage 位于完成事件携带的最终 Response 中，不能累加文本事件猜测。
            completed = True
            usage = event.response.usage
            if usage is not None:
                print(f"\n输入 {usage.input_tokens}，输出 {usage.output_tokens}")
        elif event.type == "error":
            # 协议错误是失败终态；已经显示的半截文字不能直接当作可信答案。
            raise RuntimeError(f"流式响应失败：{event}")

    if not completed:
        raise RuntimeError("流已关闭，但没有收到 response.completed")

stream_answer("用两句话说明健康检查与真实切流验证的区别。")
```

程序收到多个 delta 后追加显示，只有 `response.completed` 才证明这次 Response 正常结束。网络中断可能发生在已经显示一部分文字之后，因此 UI 要把流式草稿与最终状态分开；验证、引用和持久化通常在完整候选到达后完成。流式输出改善首字等待体验，却没有减少模型生成工作，也不会自动解决取消、重放和内容审核。

## 没有 Key 时怎样测试，而不是伪造“真实成功”

单元测试不应该依赖网络、额度或模型随机性。Fake Adapter 实现同一个 `ModelGateway` 协议，返回明确标记的固定结果。它证明调用方正确处理接口，**不能证明真实 API 可用**。

```python
from dataclasses import dataclass

from app.model_gateway import ModelGateway, ModelReply, TokenUsage

@dataclass
class FakeModelGateway:
    reply_text: str = "[测试替身] 先检查健康接口，再核对流量版本。"
    calls: int = 0

    def answer(self, question: str) -> ModelReply:
        # 记录调用次数和输入，后续可断言 Agent 有没有重复消耗模型。
        self.calls += 1
        if not question.strip():
            raise ValueError("问题不能为空")
        return ModelReply(
            text=self.reply_text,
            # usage 是测试夹具，不代表供应商真实计量。
            usage=TokenUsage(input_tokens=10, output_tokens=8, total_tokens=18),
            response_id="fake-response-1",
        )

def ask(gateway: ModelGateway, question: str) -> str:
    return gateway.answer(question).text

def test_ask_uses_gateway_once() -> None:
    gateway = FakeModelGateway()
    assert ask(gateway, "怎样验证切流？").startswith("[测试替身]")
    assert gateway.calls == 1
```

测试中的 `ask()` 只依赖协议，既能接收真实网关，也能接收 Fake。`calls` 让测试观察调用次数；固定 usage 只用于测试字段传递。运行 `pytest -q` 可以在没有 Key 时完成本地验证，但验收报告必须写“Fake 路径通过，在线调用未执行”，不能展示一段固定输出声称模型已经响应。

## 把运行结果变成可排障证据

最小日志建议记录：内部请求 ID、Response ID、模型名、开始与结束时间、最终状态、输入/输出 Token、错误码和 HTTP 状态。不要默认记录 API Key、完整 Prompt、完整工具结果或用户私密文本。

一次失败先按层定位：

| 现象 | 先观察 | 常见处理 |
| --- | --- | --- |
| 未设置 Key | 进程环境中变量是否存在 | 在运行该进程的同一 shell 或 Secret 配置中注入 |
| 401/403 | 异常类型、项目与模型权限 | 更换正确项目凭证，不要重试错误 Key |
| 429 | 限流头、额度和请求并发 | 区分短期限流与额度不足，再做有上限退避 |
| timeout | 请求耗时和剩余 Deadline | 缩小输入、调整模型或在总预算内有限重试 |
| 连接失败 | DNS、代理、TLS 和出口 | 修复网络链，不关闭证书校验 |
| output_text 为空 | Response status 与 output item 类型 | 检查拒绝、工具调用或不完整原因，不伪造空答案 |
| 流中途断开 | 最后事件类型与是否 completed | 丢弃或标记草稿，不能提交为最终答案 |

到这里，`ModelGateway` 已经成为后续文章的第一个稳定接口：模型服务接收请求，返回候选文字和计量；程序负责凭证、超时、错误分类和是否接受结果。

## 常见问题

### `output_text` 和 `output` 有什么区别？

`output` 是 Response 的 item 列表，可能包含文本消息、工具调用等不同类型。`output_text` 是部分官方 SDK 提供的便利属性，会聚合文本输出。只做纯文本请求时使用它很方便；进入 Tool Calling 后必须遍历 item 类型，因为空 `output_text` 可能意味着模型提出了工具调用，而不一定是服务失败。

### 为什么不把 API Key 写在配置文件里，代码读取更方便？

配置文件容易被提交、打包、截图或复制到日志。环境变量也不是绝对安全，但它让凭证脱离源码，并能由容器或 CI 的 Secret 系统注入。应用还应限制变量读取范围、定期轮换 Key，并确保异常和调试输出不打印它。

### `total_tokens` 是否永远等于输入加输出？

应以目标 API 返回的 usage 契约为准，不要自行猜供应商如何分类推理、缓存或其他 Token。本章保存 API 给出的三个顶层字段；后续 Prompt Cache 会继续读取输入明细中的缓存计量，而不是从总数倒推。

### SDK 自动重试不是更省事吗？

自动重试适合部分短暂错误，但 Agent 还有整轮 Deadline、调用预算和幂等约束。如果 SDK、网关和任务队列各自重试，次数会相乘。本章关闭自动重试以暴露单次语义；后续在一个位置根据错误类别和剩余时间加入有限重试。

### 流式请求为什么仍然需要超时？

建立连接成功不代表流会持续前进。服务可能迟迟没有首个事件，也可能在中途停滞。生产实现通常区分连接超时、首 Token 超时、事件空闲超时和整轮 Deadline，并在取消时关闭底层流。

### Fake Adapter 能测试什么，不能测试什么？

它能测试业务层是否按协议调用、是否处理空输入、调用次数和字段传播。它不能证明凭证有效、模型可用、真实 usage 正确、流式事件顺序稳定或网络错误映射完整。这些需要带明确权限和低成本输入的在线冒烟测试。

### 为什么真实回答不能写成测试断言？

模型输出具有非确定性，模型快照和服务行为也会演进。单元测试应断言结构、状态和边界；需要衡量回答质量时，使用代表样本和 Eval 指标，而不是要求某次回答逐字等于固定句子。

### `instructions` 和 `input` 为什么分开？

`instructions` 保存当前请求的高层行为约束，`input` 保存动态任务。分开有利于权限审查、Prompt 版本管理和后续缓存稳定前缀。它仍只是模型约束：真正的数据权限、工具白名单和终态必须由程序控制。
