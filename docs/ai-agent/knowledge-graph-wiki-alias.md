---
title: 知识图谱、Wiki 与 Alias 分别解决什么
description: 用确定性别名治理查询，用带来源关系扩展检索，不把语义猜测冒充事实。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 41
sequence: 41
slug: knowledge-graph-wiki-alias
tags:
  - Knowledge Graph
  - Wiki
  - Alias
sourceKey: ai-knowledge-graph-wiki-alias
dependsOn:
  - hybrid-retrieval-rerank
updated: '2026-08-14'
lastUpdated: false
---
# 知识图谱、Wiki 与 Alias 分别解决什么

向量相似度能找到语义接近文本，却不擅长确定性别名和多跳关系。Wiki、Alias 与知识图谱可以补足这部分，但三者承载的事实强度不同。

## Wiki 提供人工维护的知识入口

Wiki 页面组织主题、摘要和导航，适合稳定解释与编辑审核。检索时它仍然是有版本、有 ACL 的文档，不应因为“Wiki”名称而自动获得更高权限。

发布时保存页面快照，正在执行的 Turn 按固定 Release 读取。

## Alias 做确定性名称归一化

Alias 把缩写、旧名和正式名映射到同一实体 ID。例如“远程桌面”和内部缩写可以指向同一主题。冲突别名需要人工裁决，不能由向量相似度直接确认。

查询先做别名展开，保留原词和目标 ID，结果可解释且易于回归。

## 知识图谱保存有来源的关系

图谱节点表示实体，边表示“属于”“依赖”“适用于”等关系。每条边保存来源、Release、方向和置信状态。共同出现在一篇文档中只能生成候选，不能冒充已确认关系。

图遍历适合回答明确关系问题，最终 Claim 仍要绑定用户可见来源。

## 三种能力与文本检索协同

Alias 先规范化实体，图谱扩展一到有限跳的相关对象，文本检索取得具体说明，Wiki 提供主题背景。扩展结果继续经过 ACL 与版本过滤。

图谱不是向量库替代品，文本也不该承担所有确定关系。按问题选择通道，再在 Evidence 层合并。

## 变更和删除保持一致

实体改名时更新 Alias 版本，文档撤回时停用由它确认的关系，Release 发布时固定 Wiki、别名和边的共同快照。

测试覆盖别名冲突、循环关系、跨租户边和来源撤回。一次测试轨迹从别名解析开始，经图遍历和 ACL 过滤，最后回到可见 Citation。图能遍历到某节点不代表当前用户可以读取它。
