---
title: Evidence 预算与检索缓存怎样设计
description: 按问题覆盖选择证据，缓存键同时包含查询、权限范围、知识版本和检索配置。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 40
sequence: 40
slug: rag-evidence-budget-cache
tags:
  - Evidence
  - Cache
  - Budget
sourceKey: ai-rag-evidence-budget-cache
dependsOn:
  - hybrid-retrieval-rerank
updated: '2026-08-14'
lastUpdated: false
---
# Evidence 预算与检索缓存怎样设计

检索可以返回很多相关片段，但模型上下文只需要能覆盖问题的少量 Evidence。选择与缓存都必须带上权限和知识版本，否则性能优化会破坏事实边界。

## Evidence 预算按问题维度分配

先为每个必答维度保留至少一条直接证据，再考虑补充背景。相同来源的重复片段合并，长片段按结构压缩，同时保存原文定位。

预算包括条目数和 Token。只按 Top-K 取前几条，可能让一个容易维度占满上下文。

## 选择过程保留覆盖关系

每条 Evidence 记录支持的 Claim 或问题维度、来源、Release、可见范围和选中理由。模型只能引用被选中的可见证据，验证器可以回查原片段。

证据冲突时双方都保留，不能因为预算紧就删除低分但关键的反例。

## 缓存键包含所有影响结果的边界

检索缓存键至少包含规范化查询、租户或 Scope、知识 Release、检索配置和索引版本。用户可见范围变化后，旧缓存不能直接复用。

缓存值保存候选 ID 与必要分数，不复制无法失效的大段正文。读取时重新检查 ACL 和记录是否仍有效。

## 并发未命中可以合并请求

相同完整键的并发查询可用 singleflight 合并后端工作，但每个等待者返回前仍根据当前身份复核。失败结果短暂缓存要谨慎，避免一次依赖故障长期变成“无资料”。

Release 发布后使用新键自然失效，旧 Turn 继续读取固定旧版本。

## 缓存故障只允许影响性能

缓存不可用时退回真实检索，不能绕过权限或返回跨范围默认值。监控命中率、回源错误、陈旧读取和复核拒绝。

验证缓存要覆盖同查询不同用户、Release 切换、ACL 撤回和候选删除。只测第二次更快远远不够。
