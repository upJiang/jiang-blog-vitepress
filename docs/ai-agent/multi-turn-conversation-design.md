---
title: 多轮对话怎样保存状态与处理指代
description: 从 Conversation、Message 和 Turn 的关系解释历史装配、焦点切换与并发消息。
category: ai-agent
part: 上下文、记忆与多轮对话
stageKey: context-memory
chapter: 17
sequence: 17
slug: multi-turn-conversation-design
tags:
  - Conversation
  - Turn
  - Coreference
sourceKey: ai-multi-turn-conversation-design
dependsOn:
  - memory-architecture-retrieval
updated: '2026-08-14'
lastUpdated: false
---
# 多轮对话怎样保存状态与处理指代

多轮对话的难点不在把消息全部存下来，而在“这次执行属于哪段会话、指代哪个对象、并发请求会不会覆盖状态”。Conversation、Message 和 Turn 需要分开建模。

## Conversation、Message 和 Turn 各自负责什么

**Conversation** 是长期会话容器；**Message** 保存用户、助手和工具的可见内容；**Turn** 是一次可执行请求，拥有状态、版本快照和事件。一次 Turn 可以产生多条流式 Message 或工具事件。

分开以后，刷新页面只读取消息，恢复任务读取 Turn 和事件，审计工具调用不必从助手文本里猜。

## 指代解析依赖当前焦点

用户先问“远程访问规则”，再问“它什么时候更新的”，`它` 指向当前主题而不是最近一条任意名词。应用可以保存焦点实体、主题、时间范围和待确认项，再把相关历史交给模型做一次结构化理解。

模型返回的实体仍要映射到用户可见对象。找不到唯一目标时应追问，不能用相似标题静默替代。

## 并发消息需要明确顺序

同一会话中两个请求同时运行，后完成的旧 Turn 不能覆盖新焦点。创建 Turn 时记录基于哪个消息序号和状态版本，提交焦点更新时做版本检查。

用户取消第一个 Turn 后发送新问题，新 Turn 可以继续；旧 Worker 即使稍后返回，也只能写自己的终态，不能追加成当前回答。

## 历史装配不是完整回放

模型上下文选择与当前焦点相关的消息、摘要和证据。存储层保留完整记录，装配层使用 Token 预算。工具调用与结果必须成组，隐私字段在进入模型前脱敏。

如果摘要覆盖到消息 40，滑窗应从 41 开始，避免内容重复。若摘要生成失败，回退到确定性窗口并标记上下文降级。

## 失败路径要保留可恢复状态

指代不明确进入 `needs_clarification`；权限变化导致证据不可见时重新检索；并发冲突重新基于最新焦点理解；超时和取消保持各自终态。

多轮体验来自稳定的数据模型，而不是一条越来越长的 Prompt。只有状态可定位，读者和开发者才知道一次回答用了哪些历史。
