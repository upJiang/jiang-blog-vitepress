---
title: Embedding 批处理怎样保证幂等与原子激活
description: 说明稳定来源 ID、批次重试、失败补偿和候选版本切换怎样避免半成品。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 36
sequence: 36
slug: embedding-batch-idempotency
tags:
  - Embedding
  - Batch
  - Idempotency
sourceKey: ai-embedding-batch-idempotency
dependsOn:
  - document-parsing-block-chunking
updated: '2026-08-14'
lastUpdated: false
---
# Embedding 批处理怎样保证幂等与原子激活

文档切片完成后，需要把每个 Chunk 转成向量。批量调用能提高吞吐，却会带来部分成功、限流和重复写入。稳定身份与候选版本是处理这些问题的基础。

## 向量属于具体内容和模型版本

向量记录至少关联 Chunk ID、内容哈希、Embedding 模型标识和维度。同一 Chunk 内容或模型改变，就生成新的候选向量；仅重跑任务不应制造重复记录。

稳定 Chunk ID 可以由文档版本、结构路径和内容哈希组合，不能依赖本次批次序号。

## 批次只是一种传输单位

Worker 按供应商限制把待处理 Chunk 分组，记录每批输入 ID 和状态。服务返回后先核对数量、顺序和维度，再分别写入。

某一批失败只重试该批或其中缺失项。全量重跑仍使用相同幂等键，数据库唯一约束阻止重复。

## 错误决定重试方式

限流和临时网络错误可以退避重试；输入过长要回到切片或单条隔离；认证和模型不存在应停止整个任务；返回维度不符属于配置错误。

重试有次数与 Deadline。耗尽后把版本留在失败或待修复状态，不进入 active。

## 激活发生在完整校验之后

候选版本的所有可索引 Chunk 都有有效向量，数量与元数据一致，检索探针通过后，才在一个事务中切换当前 Release。旧版本继续可查，便于在切换失败时回滚。

向量逐条写成功不等于发布成功。对外可见状态应由 Release 指针控制。

## 验证幂等需要故障注入

测试在第二批写入后模拟 Worker 崩溃，再用同一任务 ID 恢复。期望已完成批次不重复，缺失批次继续，最终只有一个可激活候选版本。

还要覆盖响应缺项、维度错误和激活事务失败。没有这些路径，正常批处理通过不能证明可恢复。
