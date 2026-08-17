---
title: 文档解析怎样保留 Block、表格与章节结构
description: 从 PDF、Office、HTML 和 Markdown 统一到 Block，再按语义边界生成可追溯 Chunk。
category: ai-agent
part: RAG 知识工程
stageKey: rag
chapter: 35
sequence: 35
slug: document-parsing-block-chunking
tags:
  - Parsing
  - Block
  - Chunking
sourceKey: ai-document-parsing-block-chunking
dependsOn:
  - rag-ingestion-pipeline
updated: '2026-08-14'
lastUpdated: false
---
# 文档解析怎样保留 Block、表格与章节结构

PDF、Office、HTML 和 Markdown 的内部结构不同。如果解析后只剩一整段纯文本，标题层级、表格关系和原文位置都会丢失，后面的切片无法补回来。

## Block 是解析层的统一语言

Block 表示标题、段落、列表、表格、代码或图片说明，携带顺序、层级、页码、坐标和来源 ID。不同解析器映射到同一模型，检索层不必理解每种文件格式。

原始文本和规范化文本分开保存。前者用于引用，后者用于搜索；规范化不能抹掉数字、代码和表格表头。

## 表格和代码需要整体语义

表格行离开表头往往没有意义，可以将表头带入每个分片，或保存结构化单元格与原表引用。代码块保留语言、文件名和行范围，避免按自然语言句号切碎。

扫描 PDF 需要 OCR 时，要标记识别来源与置信信号，不能把 OCR 文本当作无误原文。

## Chunk 沿语义边界生成

先按章节和 Block 边界分组，超过预算时再在段落或列表项之间切分。重叠用于保留跨边界上下文，但过大重叠会制造重复候选。

每个 Chunk 保存稳定 ID、Block IDs、section path、文档版本和定位信息。标题可以作为检索上下文，不必复制成多段无来源正文。

## 一次结构变化示例

原文包含“申请条件”标题、三项列表和一个例外表格。解析后得到 1 个 heading、3 个 list item 和 1 个 table Block；切片器把标题与列表组合，表格单独成片并携带同一 section path。

若直接按 500 字符切分，标题可能落在上一片，表头和数据行分离，引用也无法定位。

## 解析质量通过不变量检查

检查 Block 顺序单调、文本覆盖率、页码有效、表格有表头、Chunk 能反查原 Block，以及空白或重复片段。抽样对照渲染页，确认阅读顺序没有被多栏版式打乱。

解析器升级后用固定文档集回归。Chunk 数量变化本身不是好坏，关键是结构、召回与引用定位是否保持。
