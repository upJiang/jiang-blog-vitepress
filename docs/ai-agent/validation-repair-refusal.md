---
title: 答案验证、有限修复与安全拒答
description: 沿事实、引用、权限、隐私和新鲜度检查答案，只修可修问题。
category: ai-agent
part: 可信、安全与治理
stageKey: trust-safety
chapter: 45
sequence: 45
slug: validation-repair-refusal
tags:
  - Validation
  - Repair
  - Refusal
sourceKey: ai-validation-repair-refusal
dependsOn:
  - claims-evidence-citations
  - agent-reflection-repair
updated: '2026-08-14'
lastUpdated: false
---
# 答案验证、有限修复与安全拒答

答案生成后还没有完成。验证器要检查事实绑定、引用、权限、隐私、版本和输出契约，再把问题分成可修复与不可修复两类。

## 验证结果使用结构化问题

每个问题包含类型、严重级别、Claim 或字段位置和 Evidence ID。例如缺引用、引用不直接、隐藏证据、敏感字段和知识版本不一致分别记录。

自由文本“答案可能有问题”无法驱动稳定修复，也不能用于回归统计。

## 可修复问题只改必要部分

格式错误可以重建结构，缺少已有引用可以补绑定，非关键表达可以收窄。修复候选必须重新经过全套验证，且不能删除已支持的必要步骤。

补搜只针对明确缺口，并继承原 Scope、Release 和 Deadline。

## 不可修复问题进入拒答

越权、关键证据不存在、注入风险和无法消解的身份冲突不靠改写解决。系统返回安全拒答，说明缺少哪类信息和用户可采取的合法下一步。

拒答不是抛出通用异常。它是可解释终态，拥有原因码、事件和可公开消息。

## 修复循环有确定上限

运行时比较每轮问题集合，只有问题减少才继续。达到轮数、Deadline 或新问题替代旧问题时停止。模型声称已修复不能改变验证结果。

一条轨迹是：发现 `missing_citation` -> 在现有 Evidence 中补绑定 -> 重新验证通过；另一条是 `hidden_evidence` -> 不允许修复 -> 安全拒答。

## 验证器本身也要测试

用支持、缺失、冲突、越权和注入样例检查每条规则，验证误报与漏报。规则版本与生成策略一起记录，便于解释同一答案为何在新版本下被拒绝。

通过格式校验不等于事实正确，通过事实绑定也不等于用户有权查看，两层不能合并成一个布尔值。
