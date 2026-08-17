---
title: 怎样用 Recall、MRR 与 nDCG 评估检索
description: 从带标注查询集计算三个指标，分析无答案问题、过滤条件和版本回归。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 43
sequence: 43
slug: rag-evaluation-recall-mrr-ndcg
tags:
  - RAG Evaluation
  - Recall
  - MRR
  - nDCG
sourceKey: ai-rag-evaluation-recall-mrr-ndcg
dependsOn:
  - hybrid-retrieval-rerank
updated: '2026-08-14'
lastUpdated: false
---
# 怎样用 Recall、MRR 与 nDCG 评估检索

检索评测从一组查询和人工标注的相关结果开始。Recall、MRR 与 nDCG 分别观察“是否找全”“第一个正确结果多靠前”和“不同相关等级的整体排序”。

## 评测集固定查询、范围和版本

每条样例包含原问题、允许 Scope、知识 Release、相关 Chunk ID 及相关等级，还应包含无答案和权限受限问题。索引变化后仍用同一快照对比。

标注单位要与系统返回单位一致。若检索返回 Chunk，却只标注文档是否相关，指标会掩盖具体片段排序。

## Recall 观察相关结果是否进入候选

`Recall@K` 等于前 K 个结果命中的相关项数除以全部相关项数。它适合检查召回通道与过滤，但不关心第一个相关项排第几。

无答案问题不能直接用相同公式，应单独检查系统是否返回空或安全拒答。

## MRR 关注第一个相关结果

每条查询取首个相关结果排名的倒数，再对查询求平均。第 1 名得 1，第 2 名得 1/2。它适合用户通常只看最前结果的场景。

MRR 不奖励第二个以后相关结果，不能替代多证据问题的覆盖评估。

## nDCG 处理分级相关和整体顺序

nDCG 给高相关结果更高收益，并按排名位置折损，再除以理想排序的 DCG。它适合同时标注“直接回答”“部分相关”和“背景资料”。

相关等级需要明确标注规则。若标注者理解不一致，小数点更精确也没有意义。

## 指标变化要定位到检索阶段

对比精确基线、候选索引、混合融合和 Rerank，保存每阶段结果。Recall 下降先查过滤与召回，MRR 或 nDCG 下降再查融合和重排。

还要并列观察 ACL 泄漏、无答案误召回、延迟和失败率。提高相关性不能以越权或版本混用为代价。
