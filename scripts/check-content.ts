import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile, articlePath, sections } from "../.vitepress/content"

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const expectedCounts: Record<string, number> = {
  "ai-agent": 28,
  seo: 12,
  frontend: 71,
  backend: 20,
  devops: 21,
  architecture: 7,
  engineering: 5
}
const categorySet = new Set(sections.map((section) => section.key))
const articleFiles = new Set<string>()
const articleRoutes = new Set<string>()

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function dateText(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "")
}

if (articles.length !== 164) fail(`当前应登记 164 篇文章，实际为 ${articles.length} 篇。`)

for (const [category, expected] of Object.entries(expectedCounts)) {
  const actual = articles.filter((article) => article.category === category).length
  if (actual !== expected) fail(`${category} 应为 ${expected} 篇，实际为 ${actual} 篇。`)
}

for (const section of sections) {
  const indexFile = path.join(root, "docs", section.key, "index.md")
  if (!fs.existsSync(indexFile)) fail(`栏目索引不存在：${indexFile}`)
}

for (const article of articles) {
  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  const route = articlePath(article)
  if (articleFiles.has(relative)) fail(`重复文件：${relative}`)
  if (articleRoutes.has(route)) fail(`重复路由：${route}`)
  articleFiles.add(relative)
  articleRoutes.add(route)
  if (!categorySet.has(article.category)) fail(`未知分类：${article.category}`)
  if (!fs.existsSync(absolute)) {
    fail(`清单文件不存在：${relative}`)
    continue
  }

  const source = fs.readFileSync(absolute, "utf8")
  const parsed = matter(source)
  if (!parsed.content.trim()) fail(`文章正文为空：${relative}`)
  if (article.preserved) continue

  const expectedFields: Record<string, unknown> = {
    title: article.title,
    description: article.description,
    category: article.category,
    part: article.part,
    chapter: article.chapter,
    tags: article.tags,
    prerequisites: article.prerequisites,
    outcomes: article.outcomes,
    evidence: article.evidence
  }
  for (const [field, expected] of Object.entries(expectedFields)) {
    const actual = parsed.data[field]
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`${relative} 的 ${field} 与文章清单不一致。`)
    }
  }
  const practice = parsed.data.practice
  if (!practice || practice.type !== article.practice.type || practice.result !== article.practice.result || JSON.stringify(practice.verify) !== JSON.stringify(article.practice.verify)) {
    fail(`${relative} 的 practice 与文章清单不一致。`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText(parsed.data.updated))) fail(`${relative} 的 updated 不是 YYYY-MM-DD。`)
  if (!/^#\s+\S/m.test(parsed.content)) fail(`${relative} 缺少一级标题。`)

  const fences = [...parsed.content.matchAll(/^(?:```|~~~)([^\n]*)\n[\s\S]*?^(?:```|~~~)\s*$/gm)]
  if (fences.some((fence) => !fence[1].trim())) fail(`${relative} 存在没有语言标记的代码围栏。`)
}

const markdownFiles = walk(path.join(root, "docs")).filter((file) => file.endsWith(".md")).map((file) => path.relative(root, file).split(path.sep).join("/")).sort()
const expectedFiles = new Set([
  ...articleFiles,
  ...sections.map((section) => `docs/${section.key}/index.md`)
])
for (const file of markdownFiles) {
  if (!expectedFiles.has(file)) fail(`存在未登记的孤立 Markdown：${file}`)
}
for (const file of expectedFiles) {
  if (!markdownFiles.includes(file)) fail(`登记文件缺失：${file}`)
}
if (markdownFiles.length !== 171) fail(`docs 应有 171 个 Markdown，实际为 ${markdownFiles.length} 个。`)

for (const file of markdownFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8")
  for (const match of source.matchAll(/\]\((\/docs\/[^)#\s]+)(?:#[^)]*)?\)/g)) {
    const target = match[1].replace(/\/$/, "/index").replace(/\.html$/, "") + ".md"
    if (!fs.existsSync(path.join(root, target.slice(0)))) fail(`内部链接不存在：${file} -> ${match[1]}`)
  }
}

const algorithmCount = articles.filter((article) => article.slug.startsWith("algorithms/")).length
const relearnCount = articles.filter((article) => article.slug.startsWith("relearn/")).length
if (algorithmCount !== 16) fail(`算法文章应为 16 篇，实际为 ${algorithmCount} 篇。`)
if (relearnCount !== 37) fail(`重学前端应为 37 篇，实际为 ${relearnCount} 篇。`)

if (errors.length) {
  console.error(`内容检查失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`内容检查通过：${articles.length} 篇文章，${sections.length} 个栏目索引，docs ${markdownFiles.length} 个 Markdown。`)
