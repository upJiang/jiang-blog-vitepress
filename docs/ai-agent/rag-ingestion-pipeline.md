---
title: 文档怎样从上传进入可发布知识库
description: 沿准入、对象存储、解析、切片、向量化、校验和发布建立可重放入库链路。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 34
sequence: 34
slug: rag-ingestion-pipeline
tags:
  - RAG
  - Ingestion
  - Release
sourceKey: ai-rag-ingestion-pipeline
dependsOn:
  - rag-strategy-map
updated: '2026-08-14'
lastUpdated: false
---
# 文档怎样从上传进入可发布知识库

检索质量从入库开始。文件上传成功只说明字节到达，距离可查询知识还要经过准入、对象存储、解析、切片、向量化、校验和发布。

## 准入先确认文件和权限

入口检查用户是否能写目标知识库、文件大小、扩展名、MIME 与 Magic 是否一致，并为上传生成稳定任务 ID。外部 URL 还要限制协议、DNS、重定向和目标网段。

原文件保存校验和，重复请求可以识别同一内容；同名文件不应直接覆盖已发布版本。

## 对象、元数据和任务分开保存

对象存储保存原始字节，数据库保存文档、版本和状态，队列只携带 ID。不要把大文件塞进任务消息，也不要让 Worker 依赖上传进程的临时路径。

任务状态按 `accepted -> parsing -> chunking -> embedding -> validating -> ready` 推进，失败保存阶段和原因。

## 解析与切片保留来源定位

解析器输出统一 Block，记录页码、章节、表格或代码类型。Chunk 从 Block 生成，保留文档版本、section path、字符或版面位置，使检索结果能回到原文。

解析失败只影响候选版本，当前已发布版本继续服务。

## 向量写入采用候选版本

Embedding 按批次处理，使用稳定 Chunk ID 幂等写入。部分批次失败时重跑缺失项，不把半套向量标成 active。

校验数量、维度、引用和 ACL 后，事务性切换 Release。正在执行的 Turn 继续使用开始时固定的旧 Release。

## 失败与删除都要可补偿

数据库写入失败后清理孤立对象，向量失败后保留可重试批次，发布失败不修改当前指针。删除文档时先停用检索数据，再按保留策略清理对象。

入库的完成证据是候选版本通过校验并发布，不是 Worker 日志出现“处理结束”。
