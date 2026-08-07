---
title: "Skill 实战：从空目录写出可验证的任务能力"
description: "从一个页面审计任务开始，创建 SKILL.md、参考资料、脚本和模板，理解触发、渐进读取与验证。"
category: ai-agent
part: "Skill：沉淀任务方法"
chapter: 14
tags: ["Skill", "Codex", "Claude Code", "Progressive Disclosure"]
prerequisites: ["会读 Markdown 和 Shell 命令", "了解 Agent 会按任务读取说明"]
outcomes: ["能创建一个公开 Skill", "能验证 Skill 的触发条件和输出质量"]
practice:
  type: implementation
  result: "完成一个匿名页面审计 Skill 的目录与最小实现"
  verify: ["触发条件与任务匹配", "脚本失败时能给出可定位错误"]
evidence: official
updated: 2026-08-07
---
# Skill 实战：从空目录写出可验证的任务能力

Skill 最容易被误解成一段更长的 Prompt。实际使用时，它更像一个“小型任务包”：入口文件告诉 Agent 什么时候使用、先做什么和不能做什么；详细资料按需读取；脚本负责重复检查；模板负责让输出稳定。

这篇文章不做抽象介绍，而是从空目录创建一个匿名的“页面审计 Skill”。它只检查页面是否能访问、是否包含标题和 Canonical，不连接私有服务，也不修改网站。

## 先看最终目录

```text
page-audit/
├── SKILL.md
├── references/
│   └── checks.md
├── scripts/
│   └── check-page.sh
└── templates/
    └── report.md
```

`SKILL.md` 是触发入口；`references/checks.md` 放详细判断标准；`scripts/check-page.sh` 负责确定性 HTTP 检查；`templates/report.md` 规定结果格式。Agent 不需要每次都读取所有文件，先读入口，确定任务匹配后再按需要读取其他文件。

## 第一步：写清触发条件和边界

先创建目录：

```bash
mkdir -p page-audit/references page-audit/scripts page-audit/templates
```

`mkdir -p` 会一次创建四层目录；目录已经存在时不会报错，因此可以重复执行。命令的输出通常为空，验证方式是运行 `find page-audit -maxdepth 2 -type d`，确认 `references`、`scripts` 和 `templates` 都存在。

然后写 `SKILL.md`：

```markdown
---
name: page-audit
description: 当用户要求检查网页可访问性、标题、Canonical 或 robots 时使用；只做只读检查，不修改线上页面。
---

# 页面审计

## 任务目标

收集真实 GET、响应状态、最终 URL、原始 HTML 中的 title、canonical 和 robots，并输出证据化报告。

## 执行顺序

1. 先确认用户提供了 URL 和允许检查的范围。
2. 读取 `references/checks.md`，按页面类型选择检查项。
3. 运行 `scripts/check-page.sh` 获取响应和基础字段。
4. 把脚本输出填入 `templates/report.md`。
5. 把事实、假设、缺口和下一步分开。

## 不做什么

- 不修改网页、广告账户或站点配置。
- 不把工具评分当成排名结果。
- 不在报告中写入 Cookie、Token 或完整页面敏感正文。
```

Agent 发现这份入口时，先用 Frontmatter 的 `name` 识别能力，用 `description` 判断“网页只读检查”是否与用户任务匹配；匹配后才读取正文。正文规定先确认 URL 和授权，再读规则、运行脚本、填模板。用户缺少 URL 时停在输入检查；脚本非零退出时进入失败报告；只有采集成功才填写事实字段。`references` 和 `scripts` 使用相对路径，Skill 搬到另一个环境后仍能定位资源；“不修改线上页面”则防止诊断任务越界成修复任务。

## 第二步：把详细判断放进 references

`SKILL.md` 不应该塞进所有 HTTP 细节。把规则放进 `references/checks.md`：

```markdown
# 页面检查表

## 状态与跳转

- 使用 GET，不用 HEAD 代替页面检查。
- 记录最终状态、跳转链和响应时间。
- 5xx 是服务故障线索，4xx 需要确认是否符合页面预期。

## HTML 基础字段

- title 应存在且与页面主题匹配。
- canonical 应是绝对 URL，并检查是否指向预期页面。
- robots 需要和页面是否允许抓取的意图一致。

## 报告边界

- 只截取必要字段，不保存完整 HTML。
- 结论标记为事实、假设或数据缺口。
```

这个文件的输入是已经确认的页面类型和检查目标，输出是当前任务要执行的字段清单与判断边界。Agent 只有进入页面字段检查时才读取它；若目标只是确认状态码，就不需要加载 HTML 规则。读取后，状态与跳转规则指导脚本采集，HTML 字段规则指导结果解释，报告边界限制保存内容。渐进式披露的目的不是隐藏规则，而是让入口保持短小，把细节按任务加载。

## 第三步：脚本负责确定性检查

现在写一个最小 Shell 脚本。它只接收 URL，返回状态、最终 URL 和几个 HTML 字段；它不生成结论，也不修改远程资源。

```bash
#!/usr/bin/env bash
set -euo pipefail

url="${1:?usage: check-page.sh URL}"
html_file="$(mktemp)"
trap 'rm -f "$html_file"' EXIT

curl --fail-with-body --silent --show-error --location --max-time 10 \
  --output "$html_file" --write-out 'status=%{http_code}\nfinal_url=%{url_effective}\n' \
  "$url"

awk 'BEGIN{IGNORECASE=1} /<title[^>]*>/ { print "title=" $0; exit }' "$html_file"
awk 'BEGIN{IGNORECASE=1} /rel=["'"'"']canonical["'"'"']/ { print "canonical=" $0; exit }' "$html_file"
awk 'BEGIN{IGNORECASE=1} /name=["'"'"']robots["'"'"']/ { print "robots=" $0; exit }' "$html_file"
```

脚本按从上到下的顺序执行：`set -euo pipefail` 把未定义变量、管道失败和命令错误变成非零退出；`${1:?...}` 要求调用方传入 URL；`mktemp` 创建临时 HTML 文件；`trap` 无论成功或失败都清理它；`curl` 最多等待 10 秒、跟随跳转、把正文写入临时文件，同时把状态和最终 URL 输出到终端；三个 `awk` 依次读取文件并只打印第一处 title、canonical 和 robots 标签。输入是一个 URL，输出是可复查字段。连接失败、4xx/5xx 或超时会让 `curl` 非零退出，调用方应停止依赖 HTML 的判断并记录错误。脚本没有执行 JavaScript，也不等价于浏览器渲染审计。

本地验证可以使用一个公开测试页或自己的开发服务器：

```bash
chmod +x page-audit/scripts/check-page.sh
page-audit/scripts/check-page.sh https://example.com
```

`chmod +x` 给当前用户增加执行权限；第二行把 URL 作为 `$1` 传给脚本。预期输出包含 `status=200`、`final_url=...`，以及存在时的三个 HTML 字段。没有某个字段时，对应 `awk` 不打印内容，这代表“原始 HTML 未找到”，还不能推出渲染后页面也没有。命令非零退出时先查看 curl 错误，不生成成功报告。示例 URL 只用于说明命令，实际审计使用用户明确提供且允许检查的地址。

## 第四步：模板让报告可以复查

报告模板只规定字段，不替 Agent 编造结论：

```markdown
# 页面审计报告

URL：
检查时间：

## 已确认事实

- 状态与最终 URL：
- title：
- canonical：
- robots：

## 假设与缺口

- 需要额外证据的问题：

## 下一步

- 修复动作：
- 复查命令：
```

Agent 先把脚本的状态、最终 URL 与 HTML 字段填入“已确认事实”，再把需要浏览器渲染或搜索平台才能确认的问题放入“假设与缺口”，最后为每个动作写复查命令。任何采集失败都保留在事实区，不能把空字段改写成“正常”。模板让多次运行使用同一结果契约，但不会宣称页面一定能收录，因为抓取、索引和排名还需要搜索平台数据。

## Codex 与 Claude Code 怎样使用

把 Skill 放入对应工具能发现的 Skills 目录后，调用时直接描述任务：“检查这个 URL 的状态、title、canonical 和 robots，输出事实与缺口”。Agent 应先根据 `description` 判断是否触发，再读取 `SKILL.md`，随后按任务读取 `references/checks.md`，最后运行脚本并套用模板。

Codex 和 Claude Code 的具体发现目录、权限和命令以当前版本官方文档为准。Skill 本身不能绕过沙箱、网络权限或用户授权；脚本失败时应保留失败原因，不能用模型猜一个成功结果。

## 如何验证 Skill 真的可用

至少做四种输入：

1. 用户提供完整 URL：应该触发并完成检查；
2. 用户只说“帮我优化 SEO”：信息不足，应该询问范围或说明缺口；
3. 用户要求修改页面：这个 Skill 应拒绝修改，只提供只读诊断；
4. URL 返回 404 或超时：报告应记录真实状态，并停止依赖 HTML 字段的判断。

验证的重点是触发是否准确、步骤是否完整、脚本输出是否被正确解释、失败是否可定位。只看到模型生成了一份格式漂亮的报告，不能证明 Skill 工作正确。

## Skill、MCP 和 Tool 怎样组合

这个页面审计 Skill 可以调用普通 Shell Tool，也可以把页面检查能力放进 MCP Server。MCP 负责连接和调用，Skill 负责告诉 Agent 先查什么、如何判断和如何写报告；两者边界清楚时，换成浏览器或远程 HTTP 实现也不会改变审计规则。

不要为了一个固定脚本创建 SubAgent。只有当页面抓取、模板比较和转化数据核对可以独立并行，并且每个子任务都有明确结果字段时，拆分才有价值。

## 带走一张 Skill 验收卡

```text
触发条件是否具体：
输入和授权范围是否明确：
SKILL.md 是否只保留入口规则：
详细规则是否按 references 拆分：
重复检查是否由脚本执行：
输出是否有模板和证据字段：
失败是否保留原始错误：
是否说明当前能力和限制：
```

完成这张卡后，再把同样的方法迁移到日志排障、代码审查或文档导入 Skill。先把任务边界和验证写清楚，再增加参考资料和脚本，Skill 才会从“几段提示词”变成可重复使用的工程资产。
