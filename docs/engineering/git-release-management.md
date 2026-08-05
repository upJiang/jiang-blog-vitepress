---
title: "Git 与变更发布"
description: "用小提交、评审、版本和回滚管理工程变更风险。"
category: engineering
tags: ["Git","Release"]
updated: 2026-08-04
order: 20
depth: core
series: "工作方法"
---
# Git 与变更发布

Git 保存内容寻址的提交图，不替团队决定变更边界、兼容策略和发布授权。可维护历史应让评审者回答“为何改变、风险在哪、如何验证”，让发布系统把精确提交绑定到不可变制品，让回滚恢复已知状态而不抹掉历史。

## 修改前先识别工作区所有权

```bash
git status --short --branch
git diff --stat
git diff --name-only
git log -5 --oneline --decorate
```

未提交变化可能来自用户、其他任务或生成工具。先阅读重叠文件，不能用 `reset --hard`、`checkout --` 或 `clean -fd` 清除来源不明内容。只修改任务范围，格式化避免波及全仓库。

记录开始 commit 与状态到用户级临时目录，可用于验收比较，不提交计划快照。任务结束删除临时记录。

## 提交是一个可验证意图

“小”不是行数少，而是单一可解释意图。实现、对应测试和必要文档可以同一提交；无关重命名、全局格式化、依赖升级拆开。一个提交在其父提交上应能构建/通过相关门禁，便于 bisect 和 revert。

提交信息说明 why 与影响：

```text
fix(auth): reject replayed refresh token families

Refresh rotation was not atomic under concurrent requests. Consume the old
record with a version condition and revoke the family on confirmed replay.
```

不要把测试结果、Issue 号或敏感内部信息塞进公开提交正文。团队可约定 Conventional Commits，但格式不能替代清晰原因。

## 暂存区用于精确选择

`git diff` 看工作区，`git diff --cached` 看即将提交。用明确文件或非交互 patch 选择任务变更；二进制/生成产物确认来源。提交前检查 staged diff，避免把 `.env`、日志、截图、临时计划和密钥带入。

自动格式化后重新看 diff，确保没有改用户无关内容。Git hook 可快速检查，CI 才是可信门禁；hook 可被跳过且环境不同。

## 分支、Merge 和 Rebase

短生命周期功能分支降低漂移。Rebase 重写 commit ID，适合未共享个人历史；共享分支使用 merge/revert，不擅自重写。必须强推时明确远端/分支并用 `--force-with-lease`，它防止覆盖未见新提交，但仍是破坏性操作。

Merge commit 保留分支拓扑，squash 得到单一主线意图，rebase 保留整理后的细粒度提交。选择依据回溯与评审需求，不以个人审美绝对化。自动生成/Release 分支规则单独定义。

## 冲突解决是语义合并

冲突标记只指出文本重叠，不指出语义冲突。分别理解 base、ours、theirs 的意图，合并后跑相关测试。不要固定“全部选 ours/theirs”。

重命名、Schema、锁文件和生成代码冲突尤其需要重新生成/验证。锁文件通常由包管理器按最终清单生成，不手工删除冲突段后假设正确。

## Pull Request 是风险说明

PR 包含：问题与用户影响、方案与替代、变更范围、风险/兼容、验证证据、数据/配置变化、发布与回滚。UI 变化提供不含敏感信息的运行态证据；数据库迁移写 expand/contract 窗口。

```markdown
## Problem
## Design and boundaries
## Risk and compatibility
## Verification
## Release / rollback
```

评审顺序先语义/架构/安全，再代码细节和样式。大 PR 可用 stacked/预备重构，但每步不改变或明确改变行为。机器人绿色不替代边界、权限和产品语义评审。

## 版本不只是 Git Tag

源码 commit -> 构建运行时/锁文件 -> Artifact Digest -> Release Manifest -> 环境配置版本，形成发布身份。Tag 可以被移动，Artifact Digest 不可变。线上响应/遥测记录 Release/Digest，使事故能映射回源码和证据。

公共库使用 SemVer：MAJOR 破坏兼容，MINOR 向后兼容能力，PATCH 向后兼容修复。0.x 和预发布语义按团队契约明确。兼容不仅是类型能编译，还包括运行行为、CSS/DOM、错误码、默认值和数据格式。

已发布版本不覆盖，修复发布新版本。Changelog 面向消费者写影响、迁移、弃用和安全，不粘贴 commit 列表。

## 数据库、事件和配置的版本共存

应用滚动发布意味着新旧代码同时运行。Schema 先 expand，新旧 reader 都兼容，再回填/切换，后续 contract。事件/Proto/OpenAPI 先部署兼容 reader，再让 writer 发新字段。

配置/Feature Flag 也是变更，版本化、评审、候选验证、审计。仅回退 Git commit 不会自动恢复数据库、对象、缓存、Secret 与外部副作用。

## Revert、Reset 与 Restore 的边界

| 命令/动作 | 作用 | 共享历史建议 |
| --- | --- | --- |
| `git revert <commit>` | 新提交反向应用 | 首选，可审计 |
| `git reset` | 移动分支/索引 | 仅未共享且明确授权 |
| `git restore` | 恢复工作区/索引内容 | 确认不会丢用户变化 |
| 回滚部署 | 环境指回旧 Artifact | 与 Git 操作不同 |

Revert 可能产生冲突，且反向代码不等于数据恢复。合并提交 revert 要明确 mainline parent。公开安全修复是否披露细节按响应流程，不在普通 PR 泄露可利用 Secret。

## 发布授权分层

修改、暂存、提交、推送、开 PR、部署是不同外部影响。实现请求默认保留工作区差异；只有明确要求才 commit/push；部署还需环境权限和 Runbook。自动化机器人遵守同样边界。

发布输入锁定已验证 Digest，不允许在生产服务器重新构建。候选 -> 验证 -> 审批 -> 切流 -> 回归 -> 观察；失败切回旧 Artifact。Git Tag 不是部署完成证据。

## 二分与历史质量

高质量小提交让 `git bisect run <test>` 自动找首次回归。判定测试必须稳定，历史提交用对应工具链/锁文件。发现坏提交后仍分析根因，不能只 revert 而不补回归。

Rebase/squash 若把巨大变更压成一个提交，会失去二分价值；但大量“fix typo/fix test”噪声也难读。合并前整理为几个独立意图，每个通过门禁。

## Monorepo 与依赖图

Monorepo 的影响检查依据包依赖图、公共配置和锁文件。只测改动目录可能漏共享类型/构建插件。发布独立包时计算 changeset/版本与依赖联动，独立消费者安装 packed Artifact，防路径别名和 hoist 掩盖缺依赖。

不要把所有包永远同版本或全部独立版本当教条；根据一起发布/兼容关系选择。生成 Release Manifest 固定最终解析的包版本。

## Secret 与大文件历史

`.gitignore` 只阻止未来未跟踪文件，不删除已提交历史。发现 Secret：立即撤销/轮换，审计使用范围，再按需要重写历史并协调所有 clone；删除一行不是安全恢复。

大二进制使用 Artifact/Object/LFS，根据生命周期选择；不要把构建目录、截图、数据库 dump 和模型包提交 Git。历史重写是破坏性协调操作，需明确授权和通知。

## 作者身份、签名与自动化账号

提交作者、提交者、推送者和发布批准者可能不同，审计系统要保留各自身份。GPG/SSH 签名证明某把受信私钥签过提交/Tag，不证明代码正确；仍需分支保护、评审和 CI。自动化账号使用独立最小权限身份和短期凭证，提交信息标明生成来源，不能借用个人长期 Token。签名 Tag 也只绑定源码历史，部署仍验证 Artifact provenance 和 Digest。

## 验证：提交到发布的证据

```bash
git diff --check
git diff --cached --stat
git diff --cached
git status --short
```

| 阶段 | 断言 |
| --- | --- |
| 工作区 | 未覆盖既有变化，无临时敏感文件 |
| 提交 | 单一意图、相关测试同在、父提交可验证 |
| PR | 风险/兼容/发布/回滚清楚 |
| CI | 冻结依赖、冷缓存可构建、契约通过 |
| Artifact | Digest/provenance 对应 commit |
| 候选 | 精确 Artifact 运行态通过 |
| 发布 | upstream/版本/业务与观测证据 |
| 回滚 | 旧 Artifact + Schema 兼容且演练 |

Mutation 示例：在 CI 临时加入 Secret Fixture、破坏契约、修改生成文件，确认门禁失败；候选故障确认不会改变 current upstream。

## 常见误区

- 清理来源不明的工作区差异再开始任务。
- 一次提交混入重构、功能、格式化和依赖升级。
- 只看 `git diff`，未检查 cached diff。
- 冲突解决固定选择一侧，不理解语义。
- Rebase/force push 重写已共享历史。
- Tag/latest 被当作不可变发布身份。
- SemVer 只看 TypeScript 签名，不看行为/CSS/数据。
- Revert 被当作数据库和外部副作用回滚。
- `.gitignore` 被当作已泄露 Secret 的补救。
- “实现/继续”被误认为自动授权 commit、push 或 deploy。

## 参考资料

- [Git Reference](https://git-scm.com/docs)：提交图、索引、分支、Rebase、Revert 和 Restore 的权威入口。
- [Pro Git](https://git-scm.com/book/en/v2)：对象模型、分支、协作和历史改写的系统说明。
- [Semantic Versioning](https://semver.org/)：公共 API 的 MAJOR/MINOR/PATCH 契约。
- [GitHub Artifact Attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)：源码工作流与构建制品来源证明。
- [Git 使用总结](https://juejin.cn/post/6998891460267343880)：我的早期 Git 实践；本文补齐工作区所有权、发布身份和数据回滚边界。
- [semantic-release + GitHub Actions](https://juejin.cn/post/7055958932933574669)：我的自动版本实践；旧运行时与长期 Token 配置不作为现行安全建议。
