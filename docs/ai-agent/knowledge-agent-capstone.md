---
title: 综合项目：实现一个可信的知识 Agent
description: 从文档入库开始，串起检索、Agent 循环、证据验证、异步运行和前端交付。
category: ai-agent
part: 综合项目
stageKey: capstone
chapter: 67
sequence: 67
slug: knowledge-agent-capstone
tags:
  - Knowledge Agent
  - RAG
  - Runtime
sourceKey: ai-knowledge-agent-capstone
dependsOn:
  - rag-acl-release-security
  - agent-evaluation-regression
  - agent-production-architecture
updated: '2026-08-14'
lastUpdated: false
---
# 综合项目：实现一个可信的知识 Agent

综合项目把前面的知识串成一条可运行链路：文档进入候选知识版本，用户问题创建 Turn，Runtime 在固定范围内检索并生成带引用答案，前端通过事件读取进度。

## 第一步建立文档与 Release

上传入口校验文件与权限，把原文写入对象存储；Worker 解析 Block、生成 Chunk、批量 Embedding。候选版本通过数量、定位和检索探针后，切换为 active Release。

失败版本不影响当前服务，文档、Chunk 和向量都能通过稳定 ID 回查。

## 第二步创建带快照的 Turn

API 从认证会话取得用户与租户，以幂等键创建 Turn，同时固定 Scope、Knowledge Release、Policy Version 和 Deadline，再提交后台任务。

客户端得到 Turn ID 后订阅 SSE，断线可以按事件序号重放。

## 第三步运行有限 Agent 循环

Router 选择一次检索或研究模式，Planner 只在多目标问题中生成受限计划。每个工具候选经过 Schema 与授权，检索通道始终带 Scope 和 Release。

模型只看到预算内的策略、问题、历史和 Evidence，外部内容以低信任数据进入。

## 第四步验证 Claim 和 Citation

生成器把答案拆成 Claim 并引用 Evidence。验证器检查支持、可见性、版本、隐私与完整性；可修问题有限修复，关键证据不足或越权时安全拒答。

<<< ../../examples/ai-agent/evidence.py

## 第五步覆盖异步失败路径

Worker 使用 Lease 与 Checkpoint，重复投递通过业务幂等处理；每个节点检查取消和 Deadline；事件先持久化再推送。进程崩溃后从安全节点恢复，已确认副作用不重复。

端到端测试覆盖正常回答、无结果、跨租户拒绝、注入、重复请求、断线重放、取消和恢复。

## 最后建立评测与发布闭环

固定查询集同时检查检索指标、Claim 支持、引用、拒答和终态。模型、Prompt、工具或检索参数变化形成候选 Policy，经 Eval 和 Canary 后发布。

项目完成的标志不是页面能聊天，而是每个事实有来源、每个动作受约束、每次失败有终态、每个版本能回滚。
