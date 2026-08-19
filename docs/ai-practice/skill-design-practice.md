---
title: Skill 设计：触发、渐进式披露与回归评测
description: 把重复 Prompt 和检查步骤整理成可正确触发、按需加载并能测试的 Skill。
category: ai-practice
part: Skill 实践
stageKey: skill-practice
chapter: 5
sequence: 5
slug: skill-design-practice
tags:
  - Skill
  - SKILL.md
  - Evaluation
sourceKey: practice-skill-design
dependsOn:
  - ai-capability-selection
updated: '2026-08-17'
lastUpdated: false
---
# Skill 设计：触发、渐进式披露与回归评测

Skill 把一类任务需要的说明、脚本和参考资料放进可复用目录。它的难点集中在三个边界：什么时候触发，触发后先读什么，哪些判断必须由脚本或外部证据完成。

本文使用“检查技术文章”这个任务。目标是让 Agent 在用户要求审阅 Markdown 时加载检查流程，不在普通代码修改中误触发，也不把整套写作资料常驻上下文。

## description 决定能否正确触发

描述要同时写适用任务和不适用任务。只写“帮助处理文章”会匹配得过宽；堆满所有可能关键词，又会让边界失去意义。

```yaml
---
name: article-review
description: >-
  Review Markdown technical articles for structure, factual boundaries, links,
  code fences, and natural Chinese prose. Use for drafting, rewriting and
  publication review. Do not use for code comments or API implementation.
---
```

触发评测包含应该触发、边界相近但不应触发、表达模糊需要确认三组样本。改描述后重跑固定样本，不能只拿一次成功选择判断。
## 入口文件只保存路由和硬规则

`SKILL.md` 让 Agent 在一次阅读后知道任务顺序、权限边界、输出合同和需要加载的资料。长篇风格例子、供应商文档和模板放进 `references/`，确定性检查放进 `scripts/`。

```text
article-review/
├── SKILL.md
├── references/
│   ├── chinese-prose.md
│   └── technical-article.md
├── scripts/
│   ├── check-links.mjs
│   └── check-markdown.mjs
└── assets/
    └── frontmatter.example.yml
```

渐进式披露依赖明确路由。入口写“中文长文读取 chinese-prose.md”，Agent 才知道何时加载。只把文件放进目录不会自动节省上下文，也不能保证它被使用。
## 能确定的判断交给脚本

链接是否指向存在文件、frontmatter 能否解析、代码围栏是否闭合，应由脚本返回稳定错误码和位置。模型处理需要语义理解的判断，比如核心概念是否解释到机制层、边界是否与结论对应。

```json
{
  "ok": false,
  "issues": [
    {
      "code": "BROKEN_LOCAL_LINK",
      "file": "docs/example.md",
      "line": 42,
      "target": "./missing.md"
    }
  ]
}
```

Agent 依据结构化结果定位问题，不需要解析终端装饰文本。只读脚本也要限制根目录，避免跟随链接扫描任务范围外的文件。
## 资源要说明来源和版本

每份规则应有适用语言、更新时间和来源说明。旧版规范保留时标记用途，防止它与当前规则同时进入上下文。模板中的占位符必须明显，不能让示例日期、域名或密钥被当成可发布事实。

大文件按任务切片。审阅中文文风不需要加载部署说明，检查链接也不需要读取全部写作例子。上下文节省来自只加载当前决策需要的材料。
## Skill 需要明确失败终态

Skill 入口除了成功流程，还要规定材料缺失、脚本失败、权限不足和输出过大时怎样停止。缺少参考文件不能静默退回模型常识，脚本退出非零不能把未执行规则标成通过，用户只授权审阅时也不能应用自动修复。

```yaml
outcomes:
  complete: all_required_checks_ran
  partial: optional_external_checks_unavailable
  blocked: required_policy_or_parser_missing
  denied: requested_write_not_authorized
```

这些名称是示意合同，具体 Host 可能使用其他状态。关键在于 Skill 输出能告诉上层哪些规则实际运行、哪些证据缺失，以及是否产生文件修改。成功文案不能覆盖部分失败。

加载图也要进入测试。给定中文长文，只应读取通用入口和中文写作参考；给定断链检查，还要加载链接脚本说明；无关的部署材料保持未读。用资源访问记录验证渐进式披露，不能只根据最终回答长度猜测。
## 一次执行怎样留下证据

入口先固定文件范围和允许修改项，脚本保存确定性问题，模型再处理语义问题。两类结果使用不同代码，最后汇总为已修复、待人工确认和无法验证。模型不能把无法访问的外部链接写成已验证，也不能因为语气更顺就删除代码或 frontmatter。

自动修改前保存差异，修改后重跑同一检查。链接脚本不可用时，结果应显示该门禁未运行；用模型目测替代后仍标成通过，会让报告失去证据边界。
## 回归集覆盖触发、执行和输出

触发回归检查 Skill 是否被选中；执行回归检查资源加载顺序、脚本参数和权限；输出回归检查问题类型、文件位置和未验证项。三者不能合成一个“回答看起来不错”的评分。

误触发增多时先缩小 description，脚本误报时修实现，语义判断漂移时调整模型评测。Skill 版本升级后，用固定文章验证旧问题没有漏检，再加入新规则的正反样本。
