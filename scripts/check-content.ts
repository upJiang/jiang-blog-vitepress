import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articles, articleFile, articlePath, sections } from '../.vitepress/content'

const root = process.cwd()
const errors: string[] = []
const expectedCategories = new Set(sections.map((section) => section.key))
const expectedCategoryCounts = new Map([
  ['ai-agent', 14],
  ['agent-practice', 18],
  ['seo', 18],
  ['frontend', 67],
  ['backend', 14],
  ['devops', 6],
  ['architecture', 5],
  ['engineering', 3]
])
const indexFiles = new Set(
  sections.map((section) => `docs/${section.key}/index.md`)
)

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function relative(file: string): string {
  return path.relative(root, file).split(path.sep).join('/')
}

function fail(message: string): void {
  errors.push(message)
}

if (articles.length !== 145) {
  fail(`内容清单应为 145 篇，实际为 ${articles.length} 篇。`)
}

for (const [category, expected] of expectedCategoryCounts) {
  const actual = articles.filter((item) => item.category === category).length
  if (actual !== expected) {
    fail(`${category} 应为 ${expected} 篇，实际为 ${actual} 篇。`)
  }
}

const paths = new Set<string>()
const files = new Set<string>()
const ordersByCategory = new Map<string, Set<number>>()

for (const item of articles) {
  const route = articlePath(item)
  const file = articleFile(item)

  if (paths.has(route)) fail(`重复路由：${route}`)
  if (files.has(file)) fail(`重复文件：${file}`)
  paths.add(route)
  files.add(file)

  const categoryOrders = ordersByCategory.get(item.category) ?? new Set<number>()
  if (categoryOrders.has(item.order)) {
    fail(`分类内 order 重复：${item.category} -> ${item.order}`)
  }
  categoryOrders.add(item.order)
  ordersByCategory.set(item.category, categoryOrders)

  const absolute = path.join(root, file)
  if (!fs.existsSync(absolute)) {
    fail(`清单文件不存在：${file}`)
    continue
  }

  const source = fs.readFileSync(absolute, 'utf8')
  const parsed = matter(source)

  if (!parsed.content.trim()) fail(`文章正文为空：${file}`)
  if (parsed.data.title !== item.title) fail(`标题与清单不一致：${file}`)
  if (parsed.data.description !== item.description) fail(`描述与清单不一致：${file}`)
  if (parsed.data.category !== item.category) fail(`分类与清单不一致：${file}`)
  if (parsed.data.order !== item.order) fail(`排序与清单不一致：${file}`)
  if (parsed.data.depth !== item.depth) fail(`深度等级与清单不一致：${file}`)
  if (parsed.data.series !== item.series) fail(`系列与清单不一致：${file}`)
  if (!Array.isArray(parsed.data.tags) || parsed.data.tags.length === 0) {
    fail(`缺少 tags：${file}`)
  }
  const updated = parsed.data.updated
  const updatedText =
    updated instanceof Date
      ? updated.toISOString().slice(0, 10)
      : String(updated ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedText)) {
    fail(`updated 必须使用 YYYY-MM-DD：${file}`)
  }
  if (!expectedCategories.has(parsed.data.category)) fail(`未知分类：${file}`)
  if (!/^#\s+\S/m.test(parsed.content)) fail(`缺少一级标题：${file}`)

  const fenceLines = parsed.content.match(/^```.*$/gm) ?? []
  if (fenceLines.length % 2 !== 0) fail(`代码围栏未闭合：${file}`)
  const fencedBlocks = fenceLines.filter((_, index) => index % 2 === 0)
  const emptyLanguages = fencedBlocks.filter((line) => line === '```').length
  if (emptyLanguages > 0) fail(`代码围栏缺少语言标记：${file}`)

  const sourceHeading = parsed.content.match(
    /^##\s+(?:参考资料|延伸阅读|源码与规范)\s*$/m
  )
  if (!sourceHeading || sourceHeading.index === undefined) {
    fail(`缺少参考资料或源码规范章节：${file}`)
  } else {
    const sourceStart = sourceHeading.index + sourceHeading[0].length
    const nextHeading = parsed.content.slice(sourceStart).search(/^##\s/m)
    const sourceBody =
      nextHeading === -1
        ? parsed.content.slice(sourceStart)
        : parsed.content.slice(sourceStart, sourceStart + nextHeading)
    const sourceLinks = sourceBody.match(/https?:\/\/[^\s)]+/g) ?? []
    if (sourceLinks.length < 2) {
      fail(`参考资料至少需要 2 个可核验链接：${file} -> ${sourceLinks.length}`)
    }
  }
  if (/^##\s+知识校验\s*\n\s*1\..*\n\s*2\..*\n\s*3\./m.test(parsed.content)) {
    fail(`仍使用三题式模板结尾：${file}`)
  }
}

const markdownFiles = walk(path.join(root, 'docs'))
  .filter((file) => file.endsWith('.md'))
  .map(relative)
  .sort()

const expectedFiles = new Set([...files, ...indexFiles])
const unexpectedRootMarkdown = fs
  .readdirSync(root, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md'
  )
  .map((entry) => entry.name)

for (const file of unexpectedRootMarkdown) {
  fail(`根目录存在未登记的公开 Markdown：${file}`)
}

for (const file of markdownFiles) {
  if (!expectedFiles.has(file)) fail(`未登记的孤立文章：${file}`)
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  if (!source.trim()) fail(`空 Markdown：${file}`)

  for (const match of source.matchAll(/\]\((\/[^)\s#]+)(?:#[^)\s]+)?\)/g)) {
    const link = match[1]
    if (!link.startsWith('/docs/')) continue
    const normalized = link.replace(/\.html$/, '').replace(/\/$/, '/index')
    const target = `${normalized.slice(1)}.md`
    if (!fs.existsSync(path.join(root, target))) {
      fail(`内部链接不存在：${file} -> ${link}`)
    }
  }
}

if (markdownFiles.length !== 153) {
  fail(`docs 应包含 145 篇文章和 8 个栏目索引，实际为 ${markdownFiles.length} 个文件。`)
}

if (!fs.readFileSync(path.join(root, 'index.md'), 'utf8').trim()) {
  fail('首页 index.md 不能为空。')
}

const algorithmCount = articles.filter((item) =>
  item.slug.startsWith('algorithms/')
).length
const relearnCount = articles.filter((item) =>
  item.slug.startsWith('relearn/')
).length
const modernFrontendCount = articles.filter((item) =>
  item.category === 'frontend' && !item.slug.startsWith('algorithms/') && !item.slug.startsWith('relearn/')
).length
const nodeBackendCount = articles.filter(
  (item) => item.category === 'backend' && item.group === 'Node.js'
).length
const pythonBackendCount = articles.filter(
  (item) => item.category === 'backend' && item.group === 'Python'
).length
const goBackendCount = articles.filter(
  (item) => item.category === 'backend' && item.group === 'Go'
).length

if (algorithmCount !== 16) fail(`算法文章应为 16 篇，实际为 ${algorithmCount} 篇。`)
if (relearnCount !== 37) fail(`重学前端应为 37 篇，实际为 ${relearnCount} 篇。`)
if (modernFrontendCount !== 14) {
  fail(`现代前端应为 14 篇，实际为 ${modernFrontendCount} 篇。`)
}
if (nodeBackendCount !== 5 || pythonBackendCount !== 5 || goBackendCount !== 4) {
  fail(
    `后端文章应为 Node.js 5 篇、Python 5 篇、Go 4 篇，实际为 ${nodeBackendCount}/${pythonBackendCount}/${goBackendCount}。`
  )
}

if (errors.length > 0) {
  console.error(`内容检查失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `内容检查通过：${articles.length} 篇文章，${sections.length} 个栏目索引，算法 ${algorithmCount} 篇，重学前端 ${relearnCount} 篇。`
)
