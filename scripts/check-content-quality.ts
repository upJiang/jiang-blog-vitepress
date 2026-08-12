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
  checkCodeFences(relative, parsed.content)
  checkAiPresentation(relative, source)
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
