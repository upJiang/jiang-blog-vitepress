---
title: RAG 怎样同时约束 ACL 与知识版本
description: 检索前固定用户范围和 Release，缓存、重排、引用和输出继续保留同一边界。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 42
sequence: 42
slug: rag-acl-release-security
tags:
  - ACL
  - Release
  - RAG Security
sourceKey: ai-rag-acl-release-security
dependsOn:
  - rag-evidence-budget-cache
updated: '2026-08-14'
lastUpdated: false
---
# RAG 怎样同时约束 ACL 与知识版本

RAG 的安全边界不是在回答生成后删敏感词。用户可见范围和知识 Release 要从检索前就固定，并贯穿缓存、融合、重排、上下文和引用。

## Turn 开始时建立可信快照

运行时从认证会话取得用户与租户，从业务服务取得 Scope 和当前可用 Release，保存到 Turn。模型只能提出查询词，不能填写或修改这些字段。

长任务中即使新 Release 发布，当前 Turn 仍使用原快照，避免同一答案混合两个版本。权限被紧急撤回时可以额外中止，而不是继续沿旧授权执行。

## 每个召回通道在数据库侧过滤

精确、全文、向量和图谱查询都带 Scope、Release 与有效状态条件。先取全库候选再在应用层过滤，会暴露分数、计数和缓存内容，也浪费预算。

数据库行级安全可以增加防线，但应用仍要传入正确身份并测试连接池上下文清理。

## 缓存和重排保持同一边界

缓存键包含权限范围与 Release，读取后重新授权。Reranker 只接收已过滤候选，不能为了相关性调用一个看见全库的旁路服务。

Evidence 保存来源 Scope，答案验证器拒绝任何不可见引用。

## 无结果时不得放宽范围

指定知识库没有结果，系统可以改写查询或说明资料不足，不能自动去公共库、其他团队或旧版本找“类似答案”。安全拒答是合法终态。

攻击者也可能通过文档内容诱导模型调用更宽搜索工具，运行时的命令校验必须阻止。

## 安全回归覆盖旁路

测试两个租户使用相同查询、缓存命中、Rerank、Alias、图遍历和引用回查，确认均不能交叉。再测试 Release 发布后旧 Turn 保持一致，新 Turn 使用新版本。

最终回答没有泄漏并不充分，还要检查 Trace、事件和错误信息是否暴露隐藏标题或 ID。
