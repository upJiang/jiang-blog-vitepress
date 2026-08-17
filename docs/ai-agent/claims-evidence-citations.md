---
title: Claim、Evidence 与 Citation 怎样对应
description: 把答案拆成原子断言，让每条事实绑定用户可见证据和准确位置。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 44
sequence: 44
slug: claims-evidence-citations
tags:
  - Claim
  - Evidence
  - Citation
sourceKey: ai-claims-evidence-citations
dependsOn:
  - rag-evidence-budget-cache
updated: '2026-08-14'
lastUpdated: false
---
# Claim、Evidence 与 Citation 怎样对应

一段流畅答案可能同时包含事实、推断和建议。要判断它是否可信，需要先拆成可验证的 Claim，再确认每条 Claim 是否有直接 Evidence，最后把 Citation 指向读者能看到的准确位置。

## Claim 是最小可验证断言

“远程访问需要登记设备，并且审批后当天生效”包含两个事实，应拆成“需要登记设备”和“审批后当天生效”。拆开后，其中一条缺证据不会污染另一条。

建议、过渡句和纯格式内容不一定需要引用，但其事实前提仍要形成 Claim。

## Evidence 保存来源和可见边界

Evidence 不只是文本片段，还包含稳定 ID、文档版本、位置、Scope、提取时间和原文。摘要可以帮助模型阅读，验证时仍回到原文。

<<< ../../examples/ai-agent/evidence.py

## Citation 是 Claim 到 Evidence 的公开连接

Citation 指向页码、章节、段落或网页锚点，读者应能打开并核对。一个引用只能证明它实际覆盖的断言，不能把整段答案都挂在段末同一链接上。

同一 Claim 可以有多条互补证据；同一 Evidence 也可以支持多个相关 Claim，但绑定关系必须显式保存。

## 生成前后各做一次绑定

生成前把选中的 Evidence 和稳定编号交给模型，限制它只能引用这些编号。生成后解析 Claim 与引用，检查 ID 存在、用户可见、版本一致，以及文本是否直接支持。

模型生成了形似 `[e99]` 的编号，不代表 e99 存在。引用完整性由程序验证。

## 冲突和缺证据有明确状态

Evidence 相互冲突时，Claim 标记 `conflict` 并说明范围；没有直接支持时标记 `unsupported`，删除肯定表述或拒答。

引用数量不是质量。两条间接材料不能替代一条直接证据，十个链接也无法证明一个来源中不存在的结论。
