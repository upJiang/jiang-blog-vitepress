---
title: 用 Python 实现 MCP Server 与 Client
description: 实现一个只读搜索工具，并用进程内客户端验证发现、调用、参数错误和资源释放。
category: ai-agent
part: 工具与能力扩展
stageKey: tools
chapter: 10
sequence: 10
slug: mcp-python-server-client
tags:
  - MCP
  - Python
  - Client Server
sourceKey: ai-mcp-python-server-client
dependsOn:
  - mcp-protocol-lifecycle
updated: '2026-08-14'
lastUpdated: false
---
# 用 Python 实现 MCP Server 与 Client

这一篇只实现一个只读搜索能力。重点不在框架语法，而在 Server 如何声明契约、Client 如何发现能力，以及参数错误和资源释放怎样被观察。

## 先定义不依赖协议的搜索函数

业务函数接收 `query` 和 `limit`，返回结构化条目。它不读取模型消息，也不持有 Client 状态。这样同一函数既能被 MCP 适配，也能被普通 HTTP 路由和单元测试复用。

返回值应包含稳定 ID、标题和摘要；权限范围由 Server 根据已认证会话注入，不能让调用参数提供用户 ID 或租户 ID。

## Server 把函数暴露为工具

Python SDK 可以根据函数签名生成工具定义。说明文字要写清用途、输入和限制，不要写隐藏业务规则。Server 入口选择 stdio 时，协议 stdout 只能输出消息，调试日志写到 stderr。

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("notes")

@mcp.tool()
def search_notes(query: str, limit: int = 5) -> list[dict[str, str]]:
    if not query.strip():
        raise ValueError("query_is_empty")
    return search_service(query=query, limit=min(limit, 20))
```

## Client 先发现再调用

Client 建立会话后读取工具列表，确认 `search_notes` 存在，再发出调用。测试不应直接调用业务函数后声称协议可用，它至少要经过一次发现和一次协议调用。

输入 `{"query": "访问规则", "limit": 3}` 时，可观察结果包括工具是否被发现、Server 是否收到两个参数、返回内容是否可解析。把 `limit` 改成字符串，则应得到协议层可识别的参数错误。

## 进程内测试和真实传输各证明什么

进程内测试快，适合验证工具 Schema、调用结果和错误映射；stdio 集成测试能发现 stdout 污染、子进程退出和编码问题；远程 HTTP 测试才覆盖认证、代理、TLS 和断线。三类测试不能互相冒充。

测试结束必须关闭会话和传输。遗漏清理会留下子进程或连接池，单次运行看不出来，测试套件却会逐渐不稳定。

## 从示例走向生产还缺哪些约束

生产 Server 需要认证、请求大小限制、并发控制、Deadline、审计和版本兼容。远程能力还要限制重定向和目标网络，避免工具成为内网访问代理。

MCP 适配层应保持薄：协议对象转成业务命令，业务结果转回协议结果。事务、ACL 和知识版本留在业务服务中，不能散落到工具描述里。
