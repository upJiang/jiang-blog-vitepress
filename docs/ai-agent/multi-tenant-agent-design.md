---
title: 多租户 Agent 怎样隔离身份、状态与证据
description: 让租户边界贯穿认证、Turn、检索、缓存、事件、工具和审计。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 49
sequence: 49
slug: multi-tenant-agent-design
tags:
  - Multi Tenant
  - Isolation
  - ACL
sourceKey: ai-multi-tenant-agent-design
dependsOn:
  - agent-security-trust-boundaries
  - rag-acl-release-security
updated: '2026-08-14'
lastUpdated: false
---
# 多租户 Agent 怎样隔离身份、状态与证据

多租户隔离不是给数据库表加一个 `tenant_id` 就结束。身份边界要贯穿 Conversation、Turn、检索、缓存、事件、工具和观测，任何旁路都可能泄漏。

## 可信身份从认证入口产生

网关验证令牌后创建 Auth Context，包含用户、租户、角色和允许 Scope。请求正文中同名字段一律视为不可信，模型也不能补写。

服务之间传递签名身份或短期凭证，不能只依赖客户端提供的租户 Header。

## 状态记录带租户所有权

Conversation、Turn、Message、Event、Task 和 Checkpoint 都保存租户归属，仓储查询同时按 ID 与租户过滤。只按全局 UUID 查询仍可能形成越权读取。

Worker 领取任务后重新加载并校验身份快照，队列消息不是授权证明。

## 检索与缓存共同隔离

每个检索通道在数据层应用 ACL；缓存键含租户、Scope 和 Release，命中后再次复核。Embedding 向量可以共用表，查询边界不能共用。

别名、图谱和 Rerank 也在同一租户视图内，不能成为旁路。

## 工具与事件防止侧信道

工具凭证按租户获取，输出过滤隐藏对象。错误消息不返回“另一个租户存在同名文档”，事件订阅验证 Turn 所有权，Trace 与指标避免记录原文。

资源限额按租户和用户控制，防止一个租户占满模型、队列或存储。

## 隔离测试使用成对样例

为两个租户创建同名问题和不同证据，分别测试直接查询、缓存命中、SSE 重连、任务恢复和引用链接。任一路径返回对方 ID 即失败。

隔离应由多层约束共同保证，不能把所有责任压在 Prompt 的“只回答当前用户”上。
