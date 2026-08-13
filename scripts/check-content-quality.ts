import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile } from "../.vitepress/content"
import { draftArticleFiles } from "../.vitepress/drafts"

const root = process.cwd()
const errors: string[] = []
const warnings: string[] = []
const paragraphOwners = new Map<string, string[]>()
const phraseTotals = new Map<string, number>()
const phrasePatterns = [
  ["不是……而是……", /不是[^。！？\n]{0,80}而是/g],
  ["必须", /必须/g],
  ["不能", /不能/g],
  ["真正", /真正/g],
  ["闭环", /闭环/g],
  ["生产级", /生产级/g]
] as const

const fail = (message: string): void => errors.push(message)
const warn = (message: string): void => warnings.push(message)

function stripCode(source: string): string {
  return source.replace(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g, "")
}

function normalizeParagraph(value: string): string {
  return value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*>\d.\s]+/, "")
    .replace(/\s+/g, "")
    .trim()
}

function cjkLength(value: string): number {
  return (value.match(/[\u3400-\u9fff]/g) ?? []).length
}

function reviewHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex")
}

function checkCodeFences(relative: string, content: string): void {
  const openFences = [...content.matchAll(/^(?:```|~~~)([^\n]*)$/gm)]
  if (openFences.length % 2 !== 0) fail(`${relative} 的代码围栏没有成对闭合。`)

  const blocks = [...content.matchAll(/(?:```|~~~)([^\n]*)\n[\s\S]*?(?:```|~~~)/g)]
  for (const block of blocks) {
    if (!block[1].trim()) fail(`${relative} 的代码围栏缺少语言标记。`)
  }
}

function checkHumanizedPresentation(relative: string, source: string): void {
  const parsed = matter(source)
  const prose = stripCode(parsed.content)
  const bannedPatterns = [
    { pattern: /^##\s+参考资料(?:\s|$)/m, reason: "仍包含独立参考资料章节" },
    { pattern: /^##\s+.*(?:本篇|本文)产物/m, reason: "仍包含产物模板标题" },
    { pattern: /(?:本篇|本文)产物(?:是|为|：|:)/, reason: "仍使用产物模板句" },
    { pattern: /希望这对(?:您|你)有帮助/, reason: "仍包含聊天式收尾" },
    { pattern: /(?:当然！|您说得完全正确|请告诉我)/, reason: "仍包含协作对话痕迹" },
    { pattern: /(?:综上所述|总而言之)/, reason: "仍包含通用总结填充词" },
    { pattern: /(?:在当今(?:快速|不断)[^，。]{0,30}(?:时代|格局|环境)中)/, reason: "仍包含模板化开场" },
    { pattern: /(?:行业报告显示|观察者指出|专家认为|一些批评者认为)/, reason: "仍包含没有具体来源的模糊归因" },
    { pattern: /(?:至关重要|开创性的|革命性的|令人叹为观止|充满活力的)/, reason: "仍包含宣传性或夸张措辞" }
  ]

  for (const { pattern, reason } of bannedPatterns) {
    if (pattern.test(prose)) fail(`${relative} ${reason}：${pattern}`)
  }
}

function checkAiCodeTeaching(relative: string, content: string): void {
  if (!relative.startsWith("docs/ai-agent/") || relative.endsWith("/index.md")) return

  const programLanguages = /^(python|javascript|typescript|bash|sh|sql|yaml|yml|jsonc|toml|nginx|dockerfile)(?:\s|$)/i
  const blocks = [...content.matchAll(/(?:```|~~~)([^\n]*)\n([\s\S]*?)(?:```|~~~)/g)]
  for (const block of blocks) {
    const language = block[1].trim()
    if (language === "mermaid") continue

    const blockStart = block.index ?? 0
    const blockEnd = blockStart + block[0].length
    if (programLanguages.test(language)) {
      const before = stripCode(content.slice(Math.max(0, blockStart - 420), blockStart))
      const after = stripCode(content.slice(blockEnd, blockEnd + 520))
      if (cjkLength(before) < 25) fail(`${relative} 存在缺少相邻中文场景、输入或目标说明的 ${language} 代码块。`)
      if (cjkLength(after) < 35) fail(`${relative} 存在缺少相邻中文调用顺序、结果或边界解释的 ${language} 代码块。`)

      const hasChineseComment = /(?:#|\/\/|\/\*|<!--|--)\s*[^\n]*[\u3400-\u9fff]/.test(block[2])
      if (!hasChineseComment) fail(`${relative} 的 ${language} 代码块缺少关键语句对应的中文注释。`)

      const meaningfulLines = block[2]
        .split("\n")
        .filter((line) => line.trim() && !/^\s*[}\])]+[,;]?$/.test(line))
      const chineseCommentCount = meaningfulLines.filter((line) =>
        /(?:#|\/\/|\/\*|<!--|--)\s*[^\n]*[\u3400-\u9fff]/.test(line)
      ).length
      if (meaningfulLines.length >= 10 && chineseCommentCount < 2) {
        fail(`${relative} 的 ${language} 长代码块只有一处中文注释，无法覆盖输入、关键分支和返回值。`)
      }
      if (meaningfulLines.length >= 60 && chineseCommentCount < 4) {
        fail(`${relative} 的 ${language} 长代码块中文注释过少，应覆盖多个职责或状态变化。`)
      }
    }
  }
}

function checkAiRuntimeEvidence(relative: string, content: string): void {
  if (relative === "docs/ai-agent/python-openai-responses-first-call.md") {
    const required = [
      /class\s+OpenAIResponsesGateway/,
      /client\.responses\.create/,
      /response\.output_text/,
      /response\.usage/,
      /stream\s*=\s*True/,
      /Fake(?:Model)?Gateway/,
      /测试替身/
    ]
    for (const pattern of required) {
      if (!pattern.test(content)) fail(`${relative} 缺少真实 Responses API 或 Fake 测试边界：${pattern}`)
    }
  }

  if (relative === "docs/ai-agent/knowledge-agent-capstone.md") {
    const required = [
      /OpenAIResponsesGateway/,
      /OPENAI_API_KEY/,
      /ContextSnapshot/,
      /pgvector/i,
      /Celery/,
      /SSE/,
      /真实模型/,
      /Fake[^\n]{0,80}测试/
    ]
    for (const pattern of required) {
      if (!pattern.test(content)) fail(`${relative} 的端到端实践缺少真实运行边界：${pattern}`)
    }
  }
}

function checkAiPresentation(relative: string, source: string): void {
  const isAiArticle = relative.startsWith("docs/ai-agent/") || relative.startsWith("docs/ai-practice/")
  if (!isAiArticle || relative.endsWith("/index.md")) return

  const parsed = matter(source)
  const bodyWithoutCode = stripCode(parsed.content)
  if (parsed.data.lastUpdated !== false) fail(`${relative} 必须用 lastUpdated: false 隐藏更新时间。`)

  const bannedPatterns = [
    /这篇和下一篇怎样衔接/,
    /读完后的自测/,
    /迁移练习/,
    /从这篇迁移到实际工程/,
    /上一篇[^。！？\n]{0,120}下一篇/,
    /下一篇(?:会|将|进入|继续)/,
    /说明：以下内容展示/,
    /教学说明：这份报文展示/,
    /中文说明：(?:以下|这段)/
  ]
  for (const pattern of bannedPatterns) {
    if (pattern.test(bodyWithoutCode)) fail(`${relative} 仍包含模板式衔接、自测或教学说明：${pattern}`)
  }

  for (const [lineNumber, line] of bodyWithoutCode.split("\n").entries()) {
    if (/^\s*\*\*[^*]+\*\*\s*$/.test(line)) {
      fail(`${relative}:${lineNumber + 1} 存在整段加粗，应只强调真正重要的短语或短句。`)
    }
    for (const match of line.matchAll(/\*\*([^*]+)\*\*/g)) {
      if (match[1].length > 120) fail(`${relative}:${lineNumber + 1} 的粗体内容过长，会形成视觉噪声。`)
    }
  }

  const faq = parsed.content.split(/^##\s+常见问题\s*$/m)[1]
  if (!faq) {
    fail(`${relative} 必须以主题相关的“常见问题”收尾。`)
  } else {
    const faqSections = faq.split(/^###\s+/m).slice(1)
    for (const section of faqSections) {
      const firstNewline = section.indexOf("\n")
      const question = section.slice(0, firstNewline).trim()
      const answer = stripCode(section.slice(firstNewline + 1))
      if (cjkLength(answer) < 65) {
        fail(`${relative} 的常见问题“${question}”回答过短，需补充原因、机制、示例或排查动作。`)
      }
    }
  }

  if (relative.startsWith("docs/ai-practice/")) {
    if (/^#{1,6}\s+来源与阅读说明\s*$/m.test(parsed.content)) {
      fail(`${relative} 不得展示“来源与阅读说明”。`)
    }
    if (/\]\(https?:\/\//.test(parsed.content)) {
      fail(`${relative} 不得展示 GitHub、掘金、官方文档或其他研究型外链。`)
    }
    if (/(?:最高赞|点赞快照|检索日期|检索口径|主题检索)/.test(bodyWithoutCode)) {
      fail(`${relative} 不得展示资料筛选和点赞口径。`)
    }
  }
}

function checkBackendDepth(relative: string, source: string): void {
  if (!relative.startsWith("docs/backend/") || relative.endsWith("/index.md")) return

  const parsed = matter(source)
  const body = parsed.content
  const prose = stripCode(body)
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
  const questionCount = (body.match(/^###\s+.+[？?]$/gm) ?? []).length
  const codeBlocks = [...body.matchAll(/(?:```|~~~)([^\n]*)\n[\s\S]*?(?:```|~~~)/g)]
    .filter((match) => match[1].trim() !== "mermaid")
  const teachingCarriers = [
    /^\|.+\|$/m.test(body),
    /```mermaid/.test(body),
    codeBlocks.length > 0,
    /(?:状态|时序|执行顺序|影响行数|版本|日志|报文|输出)/.test(prose)
  ].filter(Boolean).length

  if (cjkLength(prose) < 1000) fail(`${relative} 正文机制展开不足 1000 个中文字符。`)
  if (headings.length < 4) fail(`${relative} 缺少足够的主题化二级结构。`)
  if (teachingCarriers < 2) fail(`${relative} 少于两种有效教学载体。`)
  const approvedBackendSlugs = new Set([
    "backend-learning-roadmap",
    "dns-tcp-request-path",
    "mysql-crud-parameter-binding",
    "transaction-acid-isolation-mvcc",
    "jwt-access-refresh-token-lifecycle",
    "react-nestjs-prisma-admin"
  ])
  const slug = path.basename(relative, ".md")
  if (codeBlocks.length > 0 && !approvedBackendSlugs.has(slug)) {
    for (const block of codeBlocks) {
      const before = body.slice(Math.max(0, (block.index ?? 0) - 260), block.index)
      const after = body.slice((block.index ?? 0) + block[0].length, (block.index ?? 0) + block[0].length + 320)
      if (cjkLength(before) < 20 || cjkLength(after) < 30) {
        fail(`${relative} 存在缺少场景说明或执行结果解释的代码块。`)
      }
    }
  }
  const minimumQuestions = Number(parsed.data.chapter) >= 66 ? 6 : Number(parsed.data.chapter) >= 14 ? 4 : 2
  if (questionCount < minimumQuestions) {
    fail(`${relative} 深入追问少于 ${minimumQuestions} 个。`)
  }
  const bannedHeadings = [
    "是什么", "为什么", "怎么做", "最小实验", "企业里怎样管理", "常见失败与处理顺序", "完成验证"
  ]
  for (const heading of headings) {
    if (bannedHeadings.includes(heading)) fail(`${relative} 仍使用固定模板标题“${heading}”。`)
  }
}

for (const article of articles) {
  if (article.preserved) continue
  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) continue

  const source = fs.readFileSync(absolute, "utf8")
  const parsed = matter(source)
  const prose = stripCode(parsed.content)
  checkHumanizedPresentation(relative, source)
  checkCodeFences(relative, parsed.content)
  checkAiPresentation(relative, source)
  checkAiCodeTeaching(relative, parsed.content)
  checkAiRuntimeEvidence(relative, parsed.content)
  checkBackendDepth(relative, source)

  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = normalizeParagraph(paragraph)
    const length = cjkLength(normalized)
    if (length > 350) fail(`${relative} 存在 ${length} 个中文字符的异常长段落，请拆分以保持可读性。`)
    if (length < 80 || /^\|/.test(paragraph.trim())) continue
    const owners = paragraphOwners.get(normalized) ?? []
    owners.push(relative)
    paragraphOwners.set(normalized, owners)
  }

  for (const [name, pattern] of phrasePatterns) {
    const count = (prose.match(pattern) ?? []).length
    phraseTotals.set(name, (phraseTotals.get(name) ?? 0) + count)
    if (count > 7) warn(`${relative} 的“${name}”出现 ${count} 次，需人工复查语气。`)
  }

  const forbiddenCurrentClaims = [
    /KnowledgeAgent/,
    /TurnEnvelope/,
    /await\s+outbox\.publish/,
    /class\s+MutationResult/,
    /写工具需要.*审批/
  ]
  for (const pattern of forbiddenCurrentClaims) {
    if (pattern.test(source)) fail(`${relative} 包含未实现能力或占位模型：${pattern}`)
  }
}

for (const [paragraph, owners] of paragraphOwners) {
  const unique = [...new Set(owners)]
  if (unique.length > 1) fail(`跨文章重复长段落：${unique.join(", ")} -> ${paragraph.slice(0, 72)}…`)
}

type ArticleReview = {
  bodyHash: string
  beginnerReviewed: boolean
  technicalReviewed: boolean
  factsVerified: boolean
  examplesVerified: boolean
  privacyVerified: boolean
  continuityReviewed: boolean
  voiceReviewed: boolean
  reviewedAt: string
}

const reviewFile = path.join(root, "content-reviews", "reviews.json")
if (!fs.existsSync(reviewFile)) {
  fail("缺少 content-reviews/reviews.json，非保留文章必须完成人工审校。")
} else {
  const reviews = JSON.parse(fs.readFileSync(reviewFile, "utf8")) as Record<string, ArticleReview>
  const expectedReviewFiles = new Set(articles.filter((article) => !article.preserved).map(articleFile))
  const allowedDraftReviews = new Set<string>(draftArticleFiles)

  for (const relative of Object.keys(reviews)) {
    if (!expectedReviewFiles.has(relative) && !allowedDraftReviews.has(relative)) {
      fail(`审校记录包含未登记、非草稿或保留文章：${relative}`)
    }
  }

  for (const article of articles) {
    if (article.preserved) continue
    const relative = articleFile(article)
    const absolute = path.join(root, relative)
    if (!fs.existsSync(absolute)) {
      fail(`${relative} 缺少正文文件，无法执行质量审校。`)
      continue
    }

    const body = matter(fs.readFileSync(absolute, "utf8")).content
    const review = reviews[relative]
    if (!review || review.bodyHash !== reviewHash(body)) fail(`${relative} 正文哈希与审校记录不一致。`)

    const requiredChecks: Array<keyof Omit<ArticleReview, "bodyHash" | "reviewedAt">> = [
      "beginnerReviewed",
      "technicalReviewed",
      "factsVerified",
      "examplesVerified",
      "privacyVerified",
      "continuityReviewed",
      "voiceReviewed"
    ]
    for (const check of requiredChecks) {
      if (review?.[check] !== true) fail(`${relative} 缺少文章级审校标记 ${check}。`)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review?.reviewedAt ?? "")) {
      fail(`${relative} 缺少有效的 reviewedAt 日期。`)
    }

    const allowedKeys = new Set([
      "bodyHash",
      "beginnerReviewed",
      "technicalReviewed",
      "factsVerified",
      "examplesVerified",
      "privacyVerified",
      "continuityReviewed",
      "voiceReviewed",
      "reviewedAt"
    ])
    for (const key of Object.keys(review ?? {})) {
      if (!allowedKeys.has(key)) fail(`${relative} 仍包含已废弃的模板审校字段 ${key}。`)
    }
  }
}

const preservedHashFile = path.join(root, "content-reviews", "preserved-hashes.json")
if (!fs.existsSync(preservedHashFile)) {
  fail("缺少 content-reviews/preserved-hashes.json，算法和重学前端正文没有锁定。")
} else {
  const preservedHashes = JSON.parse(fs.readFileSync(preservedHashFile, "utf8")) as Record<string, string>
  const preservedArticles = articles.filter((article) => article.preserved)
  for (const article of preservedArticles) {
    const relative = articleFile(article)
    const expected = preservedHashes[relative]
    const body = matter(fs.readFileSync(path.join(root, relative), "utf8")).content
    if (!expected || expected !== reviewHash(body)) fail(`${relative} 保留正文哈希已变化。`)
  }
  for (const relative of Object.keys(preservedHashes)) {
    if (!preservedArticles.some((article) => articleFile(article) === relative)) {
      fail(`保留正文哈希包含未登记文件：${relative}`)
    }
  }
}

console.log("模板句式密度：")
for (const [name] of phrasePatterns) console.log(`- ${name}: ${phraseTotals.get(name) ?? 0}`)
if (warnings.length) {
  console.warn(`模板句式人工复查提示，共 ${warnings.length} 项：`)
  warnings.slice(0, 80).forEach((message) => console.warn(`- ${message}`))
}
if (errors.length) {
  console.error(`内容质量检查失败，共 ${errors.length} 项：`)
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}
console.log(`内容质量检查通过：${articles.length} 篇文章，哈希、围栏、重复内容、事实审校与写作自然度门禁均通过。`)
