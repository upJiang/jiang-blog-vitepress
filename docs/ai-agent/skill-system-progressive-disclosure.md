---
title: Skill 系统怎样按需提供任务知识
description: 说明 Skill 的触发、目录、渐进式披露和脚本资源怎样减少常驻上下文。
category: ai-agent
part: 工具与能力扩展
stageKey: tools
chapter: 11
sequence: 11
slug: skill-system-progressive-disclosure
tags:
  - Skill
  - Progressive Disclosure
  - Context
sourceKey: ai-skill-system-progressive-disclosure
dependsOn:
  - mcp-foundations-boundaries
updated: '2026-08-14'
lastUpdated: false
---
# Skill 系统怎样按需提供任务知识

工具告诉 Agent“能执行什么”，Skill 告诉它“遇到一类任务时应该怎样工作”。如果所有说明、脚本和参考资料都常驻上下文，真正的问题还没出现，Token 预算已经被背景材料占满。

## Skill 是任务知识包

一个 Skill 通常包含触发说明、主指令、参考资料、脚本和可复用资产。主指令负责工作流与边界，长篇背景放在 references，确定性操作优先交给 scripts。

Skill 不等于工具。它可以指导 Agent 调用多个工具，也可以只规定审查顺序；真正的执行权限仍由运行时的工具注册和策略决定。

## 渐进式披露分三层加载

第一层是简短元数据，用于判断是否匹配任务；匹配后读取完整主指令；只有主指令明确路由到某个参考或脚本时，才加载第三层材料。

```text
metadata: 何时使用
  -> instructions: 怎样执行
       -> references/scripts/assets: 当前步骤需要的材料
```

## 触发描述决定 Skill 是否被找到

描述要写任务信号和排除范围。例如“处理 Word 文档的创建、批注和排版”比“文档助手”更容易正确触发。多个 Skill 同时适用时，运行时要选择覆盖任务的最小集合，并说明执行顺序。

描述过宽会让 Skill 抢占无关任务，过窄则只有用户准确说出名称才触发。可以用真实请求集测误触发和漏触发，不用关键词数量判断质量。

## 脚本承担可重复的确定性步骤

格式校验、文件转换、结构扫描和测试命令适合写成脚本。Agent 先读脚本用法，再执行并解释结果，避免每次临时拼一段近似代码。脚本的输入路径和输出位置也要受运行时权限约束。

参考资料只保存稳定知识。带日期的审查快照、私有路径和当前得分不应被包装成长期规则，否则 Skill 会把过期状态当事实。

## Skill 的边界在运行时之外

Skill 中写“只能只读”是一条指导，运行时仍要从文件系统、网络和工具层真正禁止写入。外部 Skill 也属于不可信内容，安装前需要检查脚本、命令和资源链接。

适合 Skill 的是可复用工作方法。一次性项目状态放任务上下文，长期用户偏好放受控记忆，远程业务能力放 API 或 MCP，四者不要混在一个目录里。
