import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile, articlePath, sections } from "../.vitepress/content"
import { draftArticleFiles } from "../.vitepress/drafts"

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const expectedCounts: Record<string, number> = {
  "ai-agent": 70,
  seo: 12,
  frontend: 104,
  algorithms: 21,
  backend: 68,
  devops: 37,
  "ai-practice": 10
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

if (articles.length !== 322) fail(`当前全站完整重建应登记 322 篇文章，实际为 ${articles.length} 篇。`)

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
const draftFiles = new Set<string>(draftArticleFiles)
for (const file of markdownFiles) {
  if (!expectedFiles.has(file) && !draftFiles.has(file)) fail(`存在未登记的孤立 Markdown：${file}`)
}
for (const file of expectedFiles) {
  if (!markdownFiles.includes(file)) fail(`登记文件缺失：${file}`)
}
for (const file of draftFiles) {
  if (!markdownFiles.includes(file)) fail(`草稿登记文件缺失：${file}`)
  if (expectedFiles.has(file)) fail(`草稿不能同时登记为正式文章：${file}`)
}
if (expectedFiles.size !== 329) fail(`docs 完整重建应发布 329 个 Markdown，实际登记为 ${expectedFiles.size} 个。`)

const aiArticles = articles.filter((article) => article.category === "ai-agent")
const aiBySlug = new Map(aiArticles.map((article) => [article.slug, article]))
for (const article of aiArticles) {
  if (article.track !== "mainline" && article.track !== "special") fail(`${article.slug} 缺少有效 track。`)
  if (!Number.isInteger(article.sequence) || Number(article.sequence) < 1) fail(`${article.slug} 缺少有效 sequence。`)
  if (!article.milestone) fail(`${article.slug} 缺少 milestone。`)
  if (!Array.isArray(article.dependsOn) || !Array.isArray(article.artifactIn) || !Array.isArray(article.artifactOut)) {
    fail(`${article.slug} 缺少连续产物元数据。`)
    continue
  }
  for (const dependencySlug of article.dependsOn) {
    const dependency = aiBySlug.get(dependencySlug)
    if (!dependency) {
      fail(`${article.slug} 依赖未登记文章 ${dependencySlug}。`)
      continue
    }
    if (dependency.chapter >= article.chapter) fail(`${article.slug} 倒序依赖 ${dependencySlug}。`)
  }
  for (const artifact of article.artifactIn) {
    const produced = article.dependsOn.some((dependencySlug) =>
      aiBySlug.get(dependencySlug)?.artifactOut?.includes(artifact)
    )
    if (!produced) fail(`${article.slug} 消费的产物 ${artifact} 未由直接依赖产生。`)
  }
}

for (const track of ["mainline", "special"] as const) {
  const sequences = aiArticles.filter((article) => article.track === track).map((article) => article.sequence).sort((a, b) => Number(a) - Number(b))
  sequences.forEach((sequence, index) => {
    if (sequence !== index + 1) fail(`AI ${track} 的 sequence 不连续：${sequences.join(", ")}`)
  })
}

for (const file of markdownFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8")
  for (const match of source.matchAll(/\]\((\/docs\/[^)#\s]+)(?:#[^)]*)?\)/g)) {
    const target = match[1].replace(/\/$/, "/index").replace(/\.html$/, "") + ".md"
    if (!fs.existsSync(path.join(root, target.slice(0)))) fail(`内部链接不存在：${file} -> ${match[1]}`)
  }
}

const algorithmCount = articles.filter((article) => article.category === "algorithms").length
const relearnCount = articles.filter((article) => article.slug.startsWith("relearn/")).length
if (algorithmCount !== 21) fail(`算法文章应为 21 篇，实际为 ${algorithmCount} 篇。`)
if (relearnCount !== 37) fail(`重学前端应为 37 篇，实际为 ${relearnCount} 篇。`)

if (errors.length) {
  console.error(`内容检查失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`内容检查通过：${articles.length} 篇文章，${sections.length} 个栏目索引，docs 发布 ${expectedFiles.size} 个 Markdown。`)
