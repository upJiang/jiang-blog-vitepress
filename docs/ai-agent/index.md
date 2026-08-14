---
layout: page
title: AI 与 Agent
description: 从模型输入输出开始，逐步构建具备检索、工具、记忆、证据和质量治理的知识 Agent。
sidebar: false
aside: false
footer: false
---

这组文章回答一个实际问题：怎样把一次模型调用，逐步做成能检索、能调用工具、能保存状态，并且在证据不足或权限不允许时停下来的知识 Agent。

::: info 这条学习地图怎样使用

文章只有一条规范顺序。每个阶段先讲问题和概念，再给出最小数据流或控制流，随后进入代码、验证和失败边界。索引中的阶段同时决定左侧目录、文章顺序和上一篇/下一篇。

- **快速理解**：先读每个阶段的第一篇，建立术语和依赖关系。
- **系统学习**：从第一阶段开始按顺序阅读，保留每篇文章的代码和测试推演。
- **项目对照**：阅读时在 `tp-knowledge` 的 `server/app/agent/`、`server/app/rag/`、`server/app/services/` 和 `server/tests/` 中查找对应事实。

:::

## 阶段依赖

1. 模型基础与系统地图：先区分 LLM、工作流、RAG、Agent，再完成第一次 API 调用和结构化输出。
2. Agent 的最小闭环：把模型候选接入 Tool Calling、有限循环和控制模式。
3. 工具与能力扩展：理解 MCP、Skill、SubAgent 如何扩展能力，以及它们的权限边界。
4. LangChain 组件组合：把消息、Prompt、Runnable、Tool 和固定 RAG 组合成可测试链路。
5. LangGraph 与状态执行：把条件路由、并行、Checkpoint 和 SearchPlan 放入显式状态图。
6. 上下文与记忆：管理 Token 预算、压缩、缓存、污染和记忆生命周期。
7. RAG 知识工程：从文件准入、Block、Embedding 到检索、融合、图谱和评测。
8. 答案可信、安全与质量：用 Claim、Evidence、ACL、验证器、Eval 和 Trace 约束回答。
9. Runtime、异步执行与交付：把 Turn、Worker、Deadline、SSE、恢复和 Compose 串成可运行系统。

<SectionIndex category="ai-agent" />
