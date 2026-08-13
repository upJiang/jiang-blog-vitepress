import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile, articlePath } from "../.vitepress/content"
import { removedBackendRoutes } from "../.vitepress/removed-backend-routes"

type Review = {
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

const root = process.cwd()
const errors: string[] = []
const backend = articles.filter((article) => article.category === "backend")
const reviews = JSON.parse(
  fs.readFileSync(path.join(root, "content-reviews/reviews.json"), "utf8")
) as Record<string, Review>
const headingOwners = new Map<string, string[]>()
const bannedHeadings = new Set([
  "是什么",
  "为什么",
  "怎么做",
  "最小实验",
  "Node、Python 与 Go 分别落在哪里",
  "企业里怎样管理",
  "常见失败与处理顺序",
  "完成验证",
  "学完后的交付标准",
  "六层系统决定你要学什么",
  "参考资料"
])
const approvedArticleBodies = new Set([
  "backend-learning-roadmap",
  "dns-tcp-request-path",
  "mysql-crud-parameter-binding",
  "transaction-acid-isolation-mvcc",
  "jwt-access-refresh-token-lifecycle",
  "react-nestjs-prisma-admin"
])

function fail(message: string): void {
  errors.push(message)
}

function cjkLength(value: string): number {
  return (value.match(/[\u3400-\u9fff]/g) ?? []).length
}

function stripCode(value: string): string {
  return value.replace(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g, "")
}

if (backend.length !== 68) fail(`后端文章应为 68 篇，实际为 ${backend.length} 篇。`)

const routes = new Set(backend.map(articlePath))
for (const removed of removedBackendRoutes) {
  if (routes.has(removed)) fail(`废弃路由重新进入后端清单：${removed}`)
  const removedFile = path.join(root, `${removed.slice(1)}.md`)
  if (fs.existsSync(removedFile)) fail(`废弃路由仍有 Markdown：${removed}`)
}

for (const [index, article] of backend.entries()) {
  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (article.chapter !== index + 1) fail(`${article.slug} 的章节编号不连续。`)
  if (!fs.existsSync(absolute)) {
    fail(`后端正文不存在：${relative}`)
    continue
  }

  const parsed = matter(fs.readFileSync(absolute, "utf8"))
  if (parsed.data.title !== article.title) fail(`${relative} 的标题与清单不一致。`)
  if (parsed.data.chapter !== article.chapter) fail(`${relative} 的章节编号与清单不一致。`)
  if (parsed.data.part !== article.part) fail(`${relative} 的分组与清单不一致。`)

  const body = parsed.content
  const prose = stripCode(body)
  if (cjkLength(prose) < 1000) fail(`${relative} 的机制正文少于 1000 个中文字符。`)

  const h2 = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim())
  if (h2.length < 4) fail(`${relative} 少于 4 个主题化二级章节。`)
  for (const heading of h2) {
    if (bannedHeadings.has(heading)) fail(`${relative} 使用固定模板标题“${heading}”。`)
    const owners = headingOwners.get(heading) ?? []
    owners.push(relative)
    headingOwners.set(heading, owners)
  }

  const minimumQuestions = article.chapter >= 66 ? 6 : article.chapter >= 14 ? 4 : 2
  const questionCount = (body.match(/^###\s+.+[？?]$/gm) ?? []).length
  if (questionCount < minimumQuestions) {
    fail(`${relative} 深入追问少于 ${minimumQuestions} 个。`)
  }

  const codeBlocks = [...body.matchAll(/(?:```|~~~)([^\n]*)\n[\s\S]*?(?:```|~~~)/g)]
    .filter((match) => match[1].trim() !== "mermaid")
  for (const block of approvedArticleBodies.has(article.slug) ? [] : codeBlocks) {
    const start = block.index ?? 0
    const end = start + block[0].length
    if (cjkLength(body.slice(Math.max(0, start - 300), start)) < 20) {
      fail(`${relative} 的 ${block[1].trim()} 代码前缺少场景或观察目标。`)
    }
    if (cjkLength(body.slice(end, end + 360)) < 30) {
      fail(`${relative} 的 ${block[1].trim()} 代码后缺少执行或失败解释。`)
    }
  }

  const review = reviews[relative]
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex")
  if (!review || review.bodyHash !== bodyHash) fail(`${relative} 的审校哈希不匹配。`)
  const flags: Array<keyof Omit<Review, "bodyHash" | "reviewedAt">> = [
    "beginnerReviewed",
    "technicalReviewed",
    "factsVerified",
    "examplesVerified",
    "privacyVerified",
    "continuityReviewed",
    "voiceReviewed"
  ]
  for (const flag of flags) {
    if (review?.[flag] !== true) fail(`${relative} 缺少审校标记 ${flag}。`)
  }
}

for (const [heading, owners] of headingOwners) {
  if (owners.length >= 3) fail(`二级标题“${heading}”被 ${owners.length} 篇文章重复使用。`)
}

if (errors.length > 0) {
  console.error(`后端内容检查失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `后端内容检查通过：68 篇正文、${removedBackendRoutes.length} 个废弃路由、深度问答、代码解释与审校记录均符合门禁。`
)
