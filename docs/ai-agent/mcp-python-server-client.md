---
title: 用 Python 实现 MCP Server 与 Client
description: 实现只读工具并验证发现、调用、参数错误、超时和资源释放。
category: ai-agent
part: 工具、MCP 与 Skill
stageKey: tools
chapter: 12
sequence: 12
slug: mcp-python-server-client
tags:
  - MCP
  - Python
  - Client Server
sourceKey: ai-mcp-python-server-client
dependsOn:
  - mcp-protocol-lifecycle
updated: '2026-08-17'
lastUpdated: false
---
# 用 Python 实现 MCP Server 与 Client

这篇从一个只读 `search_policy` 工具开始：Server 暴露函数，Client 初始化会话并发现目录，调用时传入查询词，最后读取文本与结构化结果。示例的价值在于把协议边界跑通，真实部署还要补认证、限流、审计和业务授权。

本文使用官方 [MCP Python SDK](https://py.sdk.modelcontextprotocol.io/)。SDK 与协议版本会变化，安装前先查看当前迁移说明，并把 Python、SDK 和传输实现写进锁文件。下面的代码是示例工程中的可运行替身，不能证明远程服务或供应商 API 行为。

## Server 先把函数变成窄工具

```python
@server.tool()
async def search_policy(query: str, limit: int = 5) -> list[dict[str, str]]:
    """Read public policy notes. It never queries private account state."""
    if not query.strip():
        raise ValueError("query must not be empty")
    if not 1 <= limit <= 20:
        raise ValueError("limit out of range")
    return await repository.search(query, limit=limit)
```

函数签名通常会生成输入 Schema，描述字符串会进入工具目录。描述要说清数据范围、副作用、错误和返回形状。只写“搜索政策”会让模型误以为它可以查询用户资料。

仓库中的 Server 示例保留了协议启动和资源释放：

<<< ../../examples/ai-agent/mcp-python/server.py

Server 仍需在函数内部做参数和业务校验。来自 Host 的身份不能只靠工具参数传入，远程部署应从认证上下文取得，并在访问存储前核对范围。
## Client 按顺序完成初始化和发现

Client 先打开传输，再使用 SDK 的会话上下文初始化。进入运行态后请求工具目录，并把能力投影给上层；应用不要绕过 SDK 手写一套并行的 JSON-RPC 状态。

<<< ../../examples/ai-agent/mcp-python/client.py

`tools/list` 的结果应缓存有限时间，缓存键绑定 Server、协议版本、能力版本和权限范围。调用前仍做本地授权，缓存只减少目录请求，不能变成许可。
## 调用结果要转换成 Observation

Client 收到结果后，应用层生成自己的观察对象：

```python
Observation(
    call_id="call-7",
    source="policy-server",
    status="success",
    text=preview(result),
    raw_ref=store_raw(result),
)
```

模型只看到受预算限制的预览，原始结果通过 `raw_ref` 供审计和引用验证。文本里出现“忽略系统规则”的句子仍是外部数据，不能提升为指令。

空数组、参数错误、权限拒绝、Server 异常和网络超时要保留不同状态。客户端收到 JSON-RPC 错误后不应把错误消息拼成成功文本再送给模型。
## stdio 和 HTTP 的部署差异

`stdio` 适合本地进程。Client 负责启动子进程、传递环境变量、读取标准错误和在退出时等待回收；测试应检查异常退出不会留下孤儿进程。

Streamable HTTP 适合远程 Server，但需要处理 TLS、认证、代理、连接池、响应上限和重连。网络连接断开后，写操作是否执行未知，必须查询回执或转人工，不能无条件重试。

Server 地址来自白名单配置，不能让模型把 URL 作为自由参数。请求体大小、单次调用时限和并发数都要在 Client 与 Server 两侧限制，防止一个工具结果占满整个上下文。
## 测试分三层

**函数测试**直接测试 Server 的参数范围、空查询和存储异常，速度快且不依赖协议。

**协议测试**启动隔离 Server，断言初始化、目录发现、调用成功、非法参数、错误编码和关闭行为。仓库中的测试示例展示了这一层：

<<< ../../examples/ai-agent/mcp-python/tests/test_server.py

**集成测试**通过真实传输和隔离下游验证认证、超时、响应大小、重连和取消。需要在线服务时只用测试账号和最小数据，记录版本与环境，测试完成清理资源。
## 失败按发生层排查

初始化失败先看协议版本和传输；目录为空看能力过滤、分页和权限；工具不存在看命名空间与缓存；参数错误看 Schema 与 Server 版本；结果错误看 Server 下游；模型回答错误则回到 Host 的上下文装配和证据验证。

重复调用通常来自两处：Client 超时后没有保存 `call_id`，或者 Agent 重试时创建了新的幂等键。只读调用可以通过相同请求去重，写调用必须由 Server 或领域服务提供幂等语义。
## 从示例走向生产还缺什么

生产 MCP Server 需要明确身份传递、租户范围、数据脱敏、审计字段、工具目录版本和回滚方法。Host 需要设置每个 Turn 的 Deadline、预算、取消与事件持久化。两侧都要在日志里保留请求 ID、调用 ID、状态和错误分类，原始敏感内容走受控存储。

协议能让 Server 被多个客户端发现和调用，可靠性仍来自应用契约。只读工具跑通后，再单独评审写工具的审批、幂等、未知结果和补偿，不要因为 demo 已经返回文本就扩大权限。
