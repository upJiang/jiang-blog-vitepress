---
title: 混合检索怎样召回、融合与重排
description: 把精确、全文、向量和结构化检索放进同一候选链，解释 RRF 和 Rerank 的位置。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 39
sequence: 39
slug: hybrid-retrieval-rerank
tags:
  - Hybrid Retrieval
  - RRF
  - Rerank
sourceKey: ai-hybrid-retrieval-rerank
dependsOn:
  - pgvector-index-recall
  - rag-query-rewrite-decomposition
updated: '2026-08-14'
lastUpdated: false
---
# 混合检索怎样召回、融合与重排

单一检索通道很难同时处理精确 ID、领域词、自然语言和结构化条件。混合检索让不同通道各自召回，再在统一候选层融合与重排。

## 检索前先固定范围

用户、租户、知识库、Release 和文档状态在每个通道查询前确定。精确、全文和向量通道都使用同一范围，不能在融合后才删除越权结果。

结构化过滤适合 ID、日期和状态；全文适合词项；向量适合语义。让通道解决自己的问题。

## 各通道返回可比较的候选身份

结果统一为 Chunk 或文档稳定 ID、来源、通道内排名和分数。不同分数尺度不能直接相加，余弦相似度与全文相关度没有天然同一单位。

同一候选被多个通道召回时合并通道证据，不复制正文。

## RRF 用排名融合多路结果

Reciprocal Rank Fusion 根据候选在各列表中的名次累积分数，减少对原始分数校准的依赖。常数和候选深度影响结果，应通过评测集选择。

融合提高候选覆盖，不能替代 ACL，也不证明排在前面的内容直接回答问题。

## Rerank 在小候选集上重排

Reranker 同时看查询和候选文本，重新估计相关性。输入前保留标题、章节和必要正文，限制候选数与 Token。返回结果要保持稳定来源 ID。

Rerank 服务失败时可以退回融合顺序并标记降级，不能返回空列表后让模型自由回答。

## 用一次链路定位召回问题

查询“VPN-104”时精确通道命中错误码，全文命中排障章节，向量通道补充同义描述；融合去重后重排，把直接解释错误码的片段放前面。

调试时逐层保存各通道候选、融合排名和重排结果，才能区分“没召回”和“召回后排丢”。
