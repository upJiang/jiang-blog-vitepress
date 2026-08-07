import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile } from "../.vitepress/content"

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

function stripReferences(source: string): string {
  const lines = source.split("\n")
  const result: string[] = []
  let referenceLevel = 0
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line)
    if (match) {
      const level = match[1].length
      if (/^(参考资料|源码与规范|延伸阅读)$/.test(match[2].trim())) {
        referenceLevel = level
        continue
      }
      if (referenceLevel && level <= referenceLevel) referenceLevel = 0
    }
    if (!referenceLevel) result.push(line)
  }
  return result.join("\n")
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

function checkTeachingEvidence(relative: string, source: string): void {
  const parsed = matter(source)
  const body = stripReferences(stripCode(parsed.content))
  const signals = [
    /本篇|这篇|本文|目标|完成/,
    /前置|准备|需要知道|开始前|基础/,
    /场景|问题|现象|例如|假设/,
    /实践|练习|运行|命令|输入|输出|流程|步骤|测试|验证|检查/,
    /边界|限制|适用|不适用|下一步|清单|失败|误区/
  ]
  const metadataEvidence = [
    Array.isArray(parsed.data.prerequisites),
    Array.isArray(parsed.data.outcomes),
    Boolean(parsed.data.practice),
    Boolean(parsed.data.evidence)
  ].filter(Boolean).length
  const count = signals.filter((pattern) => pattern.test(body)).length + Math.min(2, metadataEvidence)
  if (count < 4) fail(`${relative} 缺少目标、前置、场景、实践或边界说明（${count}/5）。`)
}

function checkLongSections(relative: string, content: string): void {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)]
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? content.length
    const section = content.slice(start, end)
    if (cjkLength(stripCode(section)) < 900) continue
    const structured = /^###\s+/m.test(section) || /^(?:```|~~~)/m.test(section) || /^\|.+\|\s*$/m.test(section) || /^(?:\d+\.|[-*])\s+/m.test(section)
    if (!structured) fail(`${relative} 的“${heading[1]}”章节较长，但没有步骤、三级标题、代码、表格或列表。`)
  }
}

function checkCodeTeaching(relative: string, content: string): void {
  const blocks = [...content.matchAll(/(?:```|~~~)([^\n]*)\n([\s\S]*?)(?:```|~~~)/g)]
  for (const block of blocks) {
    if (!block[1].trim()) fail(`${relative} 的代码围栏缺少语言标记。`)
    if (block[1].trim() === "mermaid") continue
    const start = block.index ?? 0
    const end = start + block[0].length
    const before = stripCode(content.slice(0, start))
    const nextHeading = content.slice(end).search(/^##\s/m)
    const after = stripCode(nextHeading < 0 ? content.slice(end) : content.slice(end, end + nextHeading))
    if (cjkLength(before) < 100) warn(`${relative} 某代码块前解释偏短，需做初学者复读。`)
    if (cjkLength(after) < 35) warn(`${relative} 某代码块后缺少足够的输入、逻辑、输出或边界解释。`)
  }
}

for (const article of articles) {
  if (article.preserved) continue
  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) continue
  const source = fs.readFileSync(absolute, "utf8")
  const parsed = matter(source)
  const prose = stripReferences(stripCode(parsed.content))
  checkTeachingEvidence(relative, source)
  checkLongSections(relative, prose)
  checkCodeTeaching(relative, parsed.content)

  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = normalizeParagraph(paragraph)
    const length = cjkLength(normalized)
    if (length > 350) fail(`${relative} 存在 ${length} 个中文字符的长段落，请拆成短段或结构化内容。`)
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
    /KnowledgeAgent/, /TurnEnvelope/, /await\s+outbox\.publish/, /class\s+MutationResult/, /写工具需要.*审批/
  ]
  for (const pattern of forbiddenCurrentClaims) if (pattern.test(source)) fail(`${relative} 包含未实现能力或占位模型：${pattern}`)
}

for (const [paragraph, owners] of paragraphOwners) {
  const unique = [...new Set(owners)]
  if (unique.length > 1) fail(`跨文章重复长段落：${unique.join(", ")} -> ${paragraph.slice(0, 72)}…`)
}

const reviewFile = path.join(root, "content-reviews", "reviews.json")
if (!fs.existsSync(reviewFile)) {
  fail("缺少 content-reviews/reviews.json，非保留文章必须完成双视角审查记录。")
} else {
  const reviews = JSON.parse(fs.readFileSync(reviewFile, "utf8")) as Record<string, {
    bodyHash: string
    beginner: boolean
    senior: boolean
    practiceVerified?: boolean
    sourcesVerified?: boolean
    privacyVerified?: boolean
  }>
  const expectedReviewFiles = new Set(articles.filter((article) => !article.preserved).map(articleFile))
  for (const relative of Object.keys(reviews)) {
    if (!expectedReviewFiles.has(relative)) fail(`审查记录包含未登记或保留文章：${relative}`)
  }
  for (const article of articles) {
    if (article.preserved) continue
    const relative = articleFile(article)
    const review = reviews[relative]
    const body = matter(fs.readFileSync(path.join(root, relative), "utf8")).content
    if (!review || review.bodyHash !== reviewHash(body)) fail(`${relative} 正文哈希与双视角审查记录不一致。`)
    if (!review?.beginner || !review?.senior) fail(`${relative} 缺少初学者或资深工程师审查通过标记。`)
    if (!review?.practiceVerified || !review?.sourcesVerified || !review?.privacyVerified) {
      fail(`${relative} 缺少实践、来源或匿名化审查标记。`)
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
  console.warn(`内容质量人工复查提示，共 ${warnings.length} 项：`)
  warnings.slice(0, 80).forEach((message) => console.warn(`- ${message}`))
}
if (errors.length) {
  console.error(`内容质量检查失败，共 ${errors.length} 项：`)
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}
console.log(`内容质量检查通过：${articles.length} 篇文章，正文重复、长段落、未实现 Agent 能力和双视角审查均通过。`)
