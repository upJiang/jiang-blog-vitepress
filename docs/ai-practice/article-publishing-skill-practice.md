---
title: 从零实现文章发布检查 Skill：规则、脚本、评测与迭代
description: 把一次文章验收任务做成完整 Skill，检查 Frontmatter、标题、内部链接、示例、敏感信息与发布清单，并建立触发和回归评测。
category: ai-practice
part: 能力扩展
chapter: 6
tags:
  - Skill
  - Content Quality
  - Python
  - Evaluation
prerequisites:
  - 理解 SKILL.md、scripts、references 与 assets 的分工
  - 会运行脚本并阅读 Markdown Frontmatter
outcomes:
  - 能实现一个规则与确定性检查分离的文章发布 Skill
  - 能用正例、负例和失败用例评测触发与执行质量
practice:
  type: implementation
  result: 完成 article-publishing-check Skill、检查器和评测矩阵
  verify:
    - 检查器能定位元数据、标题、链接与敏感信息问题
    - Skill 不会把普通润色误判为发布验收或擅自发布
evidence: official-guided-operation
updated: 2026-08-12
lastUpdated: false
---

# 从零实现文章发布检查 Skill：规则、脚本、评测与迭代

文章发布检查 Skill 是把内容规则、确定性脚本、语义审查和评测样例组织成一套可重复任务能力。它位于文章正文与构建发布入口之间，用来稳定检查 Frontmatter、链接、隐私、代码说明和构建结果。脚本证明可计算事实，Agent 负责需要语义判断的部分。

一篇技术文章读起来不错，构建时却因 Frontmatter 字段缺失失败；修好后又发现内部链接指向旧路由，代码示例没有说明错误分支，正文还带着本机路径。每次靠 Agent 从头“认真检查”会出现不同遗漏，我们要把确定检查、语义审查和发布边界拆开。

完成后的 Skill 接收文章路径，读取仓库规范，运行检查脚本，再按评审量表检查示例与来源，最终输出报告。它只验收和修复授权范围内的内容；`git commit`、推送和发布不属于默认能力。

## 可复用写作任务的四类资产

| 资产 | 要保存什么 | 为什么放这里 |
| --- | --- | --- |
| `SKILL.md` | 触发、输入、顺序、边界、完成条件 | 触发后立即需要 |
| `scripts/check_article.py` | 可确定的文件与语法检查 | 可复现且无需进入上下文 |
| `references/` | 发布政策、语义评审量表 | 内容长且按步骤读取 |
| `assets/review-report.md` | 最终报告结构 | 防止每次输出漂移 |

Frontmatter 是否存在、H1 数量和内部链接文件是否存在可由脚本判断；“示例是否解释输入与错误”“来源是否支持结论”需要 Agent 语义审查。把两类判断都写成 Prompt 会漏项，把语义问题硬编码为关键词又会制造误报。

Skill 输入是文章路径和仓库上下文，处理顺序是读取规则、确定性检查、语义审查、有限修复、重跑验证，输出是证据报告。任何阶段失败都保留为失败项，不允许为了完成报告将未知标成通过。

## 建立最小目录

```text
article-publishing-check/
├── SKILL.md
├── scripts/
│   └── check_article.py
├── references/
│   ├── publishing-policy.md
│   └── review-rubric.md
└── assets/
    └── review-report.md
```

入口对所有任务保持相同，两个 reference 分别承载仓库发布硬规则与语义质量问题，报告资产固定交付字段。路径只有一层引用；脚本可以独立运行并用退出码表达结果。若仓库已有内容检查器，Skill 应优先调用它，不重复实现另一套口径。

## `SKILL.md` 负责触发、顺序与边界

下面是可工作的入口。Frontmatter 描述包含直接任务、间接任务和负例；正文要求先读项目规则，再运行脚本，避免 Skill 覆盖仓库约束。不同 Agent 产品的安装目录和额外元数据以各自官方文档为准。

```markdown
---
name: article-publishing-check
description: 检查 Markdown 技术文章的 Frontmatter、标题、内部链接、代码示例、来源、隐私和发布门禁。用户要求发布前检查、文章验收、内容质量检查或排查文章构建失败时使用；不要用于只改语气的普通润色，也不要自动提交或发布。
---

# 文章发布检查

## 输入

- 一个明确的 Markdown 路径，或用户明确给出的文章集合。
- 当前仓库规则、内容注册方式和允许执行的验证命令。

## 工作流

1. 读取目标仓库规则和 `references/publishing-policy.md`。
2. 确认路径在授权工作区内；记录开始时的 Git 状态。
3. 运行 `python scripts/check_article.py <article> --root <repo>`。
4. 按 `references/review-rubric.md` 检查示例、来源、隐私和边界。
5. 仅在用户授权范围内修复，随后重跑脚本与仓库内容门禁。
6. 使用 `assets/review-report.md` 输出证据、失败和未验证项。

## 停止与失败

- 路径缺失、越出仓库或来源不明时停止并说明原因。
- 脚本非零退出时保留问题位置；不能把失败改写成通过。
- 需要网络、外部写入、提交、推送或发布时，先取得对应授权。
```

Skill 被触发后先验证输入和授权，再调用确定性脚本。脚本成功不等于文章质量通过，仍需读取 rubric；语义修复后必须重跑脚本和仓库门禁。普通润色命中负例时不加载整套发布流程，用户只要求验收时也不会扩大到真实发布。

## 检查脚本只做可确定判断

脚本使用标准库读取 Markdown，解析最外层 Frontmatter 的必填键，统计 H1，扫描绝对内部链接和高风险敏感模式。完整 YAML 解析在真实项目中应复用仓库现有依赖；为保持示例独立，这里只验证键是否出现，不声称覆盖所有 YAML 语法。

输入路径先解析并确认位于仓库根目录内，避免 Skill 被诱导读取任意文件。输出使用 JSON，方便 Agent 和 CI 共同消费；发现问题返回 1，输入或运行错误返回 2。

```python
import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

REQUIRED_FRONTMATTER = {"title", "description", "category", "updated"}
SENSITIVE_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----"),
    "token_assignment": re.compile(r"(?i)(?:api[_-]?key|token|password)\s*[:=]\s*[^<\s]{8,}"),
    "local_home_path": re.compile(r"/(?:Users|home)/[^/\s]+/"),
}

@dataclass
class Finding:
    code: str
    message: str
    line: int | None = None

def resolve_article(root: Path, raw_path: str) -> Path:
    # 路径必须留在仓库根目录，不能借发布检查读取任意本机文件。
    candidate = (root / raw_path).resolve() if not Path(raw_path).is_absolute() else Path(raw_path).resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("article_outside_root")
    if not candidate.is_file() or candidate.suffix.lower() != ".md":
        raise ValueError("article_not_found_or_not_markdown")
    return candidate

def frontmatter_keys(text: str) -> set[str]:
    # 示例只识别顶层键；复杂 YAML 应交给项目已有解析器。
    if not text.startswith("---\n"):
        return set()
    end = text.find("\n---\n", 4)
    if end < 0:
        return set()
    return {
        match.group(1)
        for match in re.finditer(r"^([A-Za-z][A-Za-z0-9_-]*):", text[4:end], re.MULTILINE)
    }

def inspect(text: str, article: Path, root: Path) -> list[Finding]:
    findings: list[Finding] = []
    missing = REQUIRED_FRONTMATTER - frontmatter_keys(text)
    for field in sorted(missing):
        findings.append(Finding("missing_frontmatter", f"缺少 Frontmatter 字段：{field}"))

    # 一个发布页面只保留一个正文 H1，避免标题层级混乱。
    h1_lines = [index for index, line in enumerate(text.splitlines(), 1) if re.match(r"^#\s+\S", line)]
    if len(h1_lines) != 1:
        findings.append(Finding("invalid_h1_count", f"H1 数量应为 1，实际为 {len(h1_lines)}"))

    for match in re.finditer(r"\]\((/[^)#\s]+)(?:#[^)]*)?\)", text):
        route = match.group(1)
        # 站点路由到文件的映射应按目标仓库规则替换，这里演示 docs 路由。
        if route.startswith("/docs/"):
            target = root / f"{route.lstrip('/').rstrip('/')}.md"
            index_target = root / route.lstrip("/") / "index.md"
            if not target.exists() and not index_target.exists():
                line = text.count("\n", 0, match.start()) + 1
                findings.append(Finding("broken_internal_link", f"内部链接不存在：{route}", line))

    for name, pattern in SENSITIVE_PATTERNS.items():
        for match in pattern.finditer(text):
            # 只报告规则和位置，不把疑似秘密重新输出到日志。
            line = text.count("\n", 0, match.start()) + 1
            findings.append(Finding("sensitive_content", f"命中敏感模式：{name}", line))
    return findings

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("article")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()

    try:
        root = Path(args.root).resolve()
        article = resolve_article(root, args.article)
        findings = inspect(article.read_text(encoding="utf-8"), article, root)
    except (OSError, UnicodeError, ValueError) as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 2

    # 输出稳定结构；Agent 根据 status 决定修复或停止。
    payload = {
        "status": "passed" if not findings else "failed",
        "article": str(article.relative_to(root)),
        "findings": [asdict(finding) for finding in findings],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if not findings else 1

if __name__ == "__main__":
    raise SystemExit(main())
```

执行从路径门禁开始，再进行元数据、标题、链接和隐私检查，最终只输出问题类型与位置，不回显疑似秘密。`article` 参数和 `root` 决定读取范围，返回码区分通过、内容失败和运行错误。脚本的链接映射只是示例，接入 VitePress、Next.js 或自定义路由时必须替换并补测试。

它没有检查内容真实性、示例教学质量或引用是否支持结论，因为这些判断不能靠几个关键词稳定完成。Skill 的下一步会用评审量表让 Agent 给每项结论绑定文章位置和来源。

## 仓库政策与报告资产
`publishing-policy.md` 记录仓库事实：必填 Frontmatter、内容注册、允许的链接形式、验证命令和发布授权。`review-rubric.md` 用问题指导语义审查，例如“代码前是否说明输入与目标”“关键 Claim 是否有官方或源码证据”“是否包含无法公开的项目细节”。

报告资产至少包含：目标文件、确定性检查结果、语义审查、执行命令、修复差异、未验证项、隐私结论和外部动作状态。资产不预填“全部通过”，每项必须由本次证据填写。

长政策不复制进 `SKILL.md`，这样规则变化只需更新 reference；报告格式变化只改 asset。若某条政策对仓库所有任务始终有效，应同时进入 `AGENTS.md` 或 CI，不能只依赖发布 Skill 触发。

## 评测触发与执行是两组用例

| 类型 | Prompt | 预期 |
| --- | --- | --- |
| 直接正例 | “发布前检查这篇 Markdown” | 触发 Skill |
| 间接正例 | “为什么这篇文章构建失败，顺便做内容验收” | 触发 Skill |
| 显式调用 | “使用 article-publishing-check 检查文件” | 触发 Skill |
| 相似负例 | “把这段介绍改得更自然” | 不触发 |
| 权限负例 | “检查完直接推送并发布”但无授权 | 检查可继续，外部动作暂停 |
| 输入边界 | 没有给路径 | 追问，不扫描全仓 |

执行评测还要准备缺 Frontmatter、两个 H1、坏链接、路径越界、疑似 Token、脚本异常和完全通过的 fixture。每次修改 description 先回放触发集；修改脚本回放 fixture；修改 rubric 用人工标注文章比较漏检和误报。

评测记录包括 Skill 版本、是否触发、读取了哪些资源、脚本退出码、问题集合和报告完整度。不要只看最终措辞，也不要为了高召回让描述覆盖“所有 Markdown 工作”。

## 从本地成功走向持续迭代

第一版先在个人环境使用，收集真实漏项。失败出现时先保存最小用例，再判断修复属于 description、工作流、script、reference 还是 asset。一个问题只改一层，才能知道改善来自哪里。

当多个仓库复用时，把仓库专属字段移出 Skill，改为读取当地规则；共享检查器用参数接受路由映射或 Frontmatter Schema。团队分发前固定版本、变更记录和回滚方式。若 Skill 还要携带 MCP Server 与安装配置，再评估打包 Plugin，而不是让入口承担部署逻辑。


**示例脚本为什么没有完整解析 YAML？**

文章示例只验证顶层键，用来说明 Skill 的分层，没有声称覆盖完整 YAML 语法。真实仓库应复用已经安装的 Frontmatter 解析器，避免正则误判多行值和复杂类型；reference 记录真实 Schema，fixture 覆盖仓库现有写法。

**敏感信息正则能证明文章安全吗？**

正则只能发现部分明显模式，无法理解截图、编码内容、业务语义和未知凭证格式，也可能误报占位符。Agent 仍需做隐私复读，必要时调用专用秘密扫描器。报告只能写“通过当前检查集”，命中时也不得把疑似秘密原值输出到日志。

**仓库已经有内容检查命令，还需要这个 Skill 吗？**

Skill 不应重复实现现有命令。它的价值是读取项目规则、选择正确门禁、补充语义审查、解释失败并输出统一报告；确定性部分直接调用仓库脚本。现有命令已经完整覆盖任务时，再包一层 Skill 只会增加维护成本。**先复用仓库事实，再补充 Agent 才能完成的判断。**
