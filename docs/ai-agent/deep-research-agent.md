---
title: Deep Research Agent 怎样组织多轮检索
description: 从问题拆解、并行搜索、来源审查到补缺，建立有预算的研究循环。
category: ai-agent
part: 研究型 Agent
stageKey: research
chapter: 30
sequence: 30
slug: deep-research-agent
tags:
  - Deep Research
  - Search
  - Agent
sourceKey: ai-deep-research-agent
dependsOn:
  - agent-planner-search-plan
  - multi-agent-dag-workflows
updated: '2026-08-14'
lastUpdated: false
---
# Deep Research Agent 怎样组织多轮检索

普通 RAG 通常检索一次便开始回答。Deep Research 面对的是多维问题：第一轮资料会暴露缺口、冲突和新实体，系统需要在预算内继续搜索，直到足以综合或必须停止。

## 研究先定义问题边界

入口把用户目标拆成研究维度、时间范围、来源范围和输出要求。指定范围没有资料时应返回缺口，不能自动扩到全网或其他租户。

研究计划只描述要回答的问题与停止条件，身份、ACL 和知识版本由运行时固定。

## 每轮都产生可检查的证据包

搜索分支返回查询、来源、时间、摘录、可见性和支持的维度。综合器先更新覆盖矩阵，再决定补搜什么，不直接把所有网页拼成答案。

```text
plan -> search -> review sources -> update coverage
          ^                         |
          `------ missing gaps -----`
```

## 补搜针对缺口和冲突

某个维度无证据时改写查询，两个来源冲突时查发布日期和适用范围，出现新实体时确认它是否属于原问题。每次补搜说明预期新增信息，避免重复同一查询。

来源数量不是覆盖度。十篇转载同一消息只算一个证据链，关键结论需要直接来源或明确说明不确定。

## 研究循环有硬预算

总轮数、分支数、每源读取量、Token 和 Deadline 由运行时控制。连续两轮没有新增可用 Evidence，或剩余缺口无法在允许范围内解决，就停止。

部分完成可以输出已覆盖结论和缺口；核心问题无可靠证据则拒绝给确定答案。

## 研究型 Agent 的失败面

搜索服务失败、页面不可读、引用丢失、来源相互复制、注入内容诱导工具和综合器扩大结论都要分别处理。

一次研究能否复查，取决于是否保存计划版本、查询、来源快照、Evidence 与停止原因，而不是最终报告写得多长。
