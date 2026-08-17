import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { articles, articleFile, articlePath, sectionStages, sections } from "../.vitepress/content"
import { draftArticleFiles } from "../.vitepress/drafts"

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const categorySet = new Set(sections.map((section) => section.key))
const articleFiles = new Set<string>()
const articleRoutes = new Set<string>()
const contentLockedFiles = new Set([
  'docs/algorithms/index.md',
  ...articles.filter((article) => article.contentLocked).map(articleFile)
])
const forbiddenVisibleTemplates = [
  { pattern: /^##\s+参考资料(?:\s|$)/m, reason: "独立参考资料章节" },
  { pattern: /^##\s+.*(?:本文|本篇)产物/m, reason: "本文/本篇产物模板标题" },
  { pattern: /(?:本文|本篇)产物(?:是|为|：|:)/, reason: "本文/本篇产物模板句" },
  { pattern: /(?:开始前可以了解|读完可以带走)/, reason: "顶部阅读卡文案" },
  { pattern: /更新于\s*[：:]/, reason: "可见更新时间" }
] as const

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function dateText(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "")
}

for (const section of sections) {
  const indexFile = path.join(root, "docs", section.key, "index.md")
  if (!fs.existsSync(indexFile)) {
    fail(`栏目索引不存在：${indexFile}`)
    continue
  }

  const indexFrontmatter = matter(fs.readFileSync(indexFile, "utf8")).data
  if (
    indexFrontmatter.layout !== "page" ||
    indexFrontmatter.sidebar !== false ||
    indexFrontmatter.aside !== false ||
    indexFrontmatter.footer !== false
  ) {
    fail(`栏目索引必须使用无侧栏、无右侧目录、无页脚的 page 布局：${indexFile}`)
  }
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

  if (article.contentLocked) continue

  const source = fs.readFileSync(absolute, "utf8")
  const parsed = matter(source)
  if (!parsed.content.trim()) fail(`文章正文为空：${relative}`)

  const expectedFields: Record<string, unknown> = {
    title: article.title,
    description: article.description,
    category: article.category,
    part: article.part,
    chapter: article.chapter,
    tags: article.tags,
    ...(article.prerequisites ? { prerequisites: article.prerequisites } : {}),
    ...(article.outcomes ? { outcomes: article.outcomes } : {}),
    ...(article.evidence ? { evidence: article.evidence } : {}),
    ...(['ai-agent', 'ai-practice'].includes(article.category) ? {
      stageKey: article.stageKey,
      sequence: article.sequence,
      slug: article.slug,
      sourceKey: article.sourceKey,
      dependsOn: article.dependsOn ?? []
    } : {})
  }
  for (const [field, expected] of Object.entries(expectedFields)) {
    const actual = parsed.data[field]
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(`${relative} 的 ${field} 与文章清单不一致。`)
    }
  }
  if (article.practice) {
    const practice = parsed.data.practice
    if (!practice || practice.type !== article.practice.type || practice.result !== article.practice.result || JSON.stringify(practice.verify) !== JSON.stringify(article.practice.verify)) {
      fail(`${relative} 的 practice 与文章清单不一致。`)
    }
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
for (const file of markdownFiles) {
  if (contentLockedFiles.has(file)) continue
  const body = matter(fs.readFileSync(path.join(root, file), "utf8")).content
  for (const { pattern, reason } of forbiddenVisibleTemplates) {
    if (pattern.test(body)) fail(`${file} 仍包含${reason}。`)
  }
}

const themeRoot = path.join(root, ".vitepress", "theme")
const themeFiles = walk(themeRoot).filter((file) => /\.(?:vue|ts|css)$/.test(file))
const forbiddenThemeFragments = [
  "ChapterGuide",
  "chapter-guide",
  "开始前可以了解",
  "读完可以带走",
  "本文产物",
  "本篇产物"
]
for (const file of themeFiles) {
  const source = fs.readFileSync(file, "utf8")
  for (const fragment of forbiddenThemeFragments) {
    if (source.includes(fragment)) {
      fail(`${path.relative(root, file)} 重新引入已删除的顶部阅读卡或产物模板：${fragment}`)
    }
  }
}

const aiArticles = articles.filter((article) => article.category === "ai-agent")
const aiBySlug = new Map(aiArticles.map((article) => [article.slug, article]))
const removedAiSlugs = new Set([
  "agent-lifecycle",
  "mcp-skills-subagents",
  "knowledge-version-release",
  "admission-model-resource-slots",
  "agent-cost-deadline-reliability"
])
for (const slug of removedAiSlugs) {
  if (aiBySlug.has(slug)) fail(`已合并的 AI 旧路由重新进入文章清单：${slug}`)
  if (fs.existsSync(path.join(root, "docs", "ai-agent", `${slug}.md`))) fail(`已合并的 AI 旧路由文件重新出现：${slug}`)
}
const aiStageKeys = new Set(sectionStages['ai-agent'].map((stage) => stage.key))
const sourceKeys = new Set<string>()
for (const article of aiArticles) {
  if (!aiStageKeys.has(article.stageKey)) fail(`${article.slug} 缺少有效 stageKey。`)
  if (!Number.isInteger(article.sequence) || Number(article.sequence) !== article.chapter) fail(`${article.slug} 缺少规范顺序 sequence。`)
  if (!article.sourceKey || sourceKeys.has(article.sourceKey)) {
    fail(`${article.slug} 缺少唯一 sourceKey。`)
  } else {
    sourceKeys.add(article.sourceKey)
  }
  for (const dependencySlug of article.dependsOn ?? []) {
    const dependency = aiBySlug.get(dependencySlug)
    if (!dependency) {
      fail(`${article.slug} 依赖未登记文章 ${dependencySlug}。`)
      continue
    }
    if (dependency.chapter >= article.chapter) fail(`${article.slug} 倒序依赖 ${dependencySlug}。`)
  }
}

const aiIndexBody = matter(fs.readFileSync(path.join(root, 'docs/ai-agent/index.md'), 'utf8')).content
if (/推荐阅读顺序|专题阅读/.test(aiIndexBody)) {
  fail('AI/Agent 索引不能保留推荐阅读顺序或专题阅读双轨语义。')
}
if (aiArticles.some((article) => article.part === '认识 AI 应用' || article.part === 'Tool、MCP、Skill 与 SubAgent')) {
  fail('AI/Agent 文章仍使用旧的双轨或专题分组。')
}

function articleHeadings(slug: string): { h1: string | undefined; h2: string[] } {
  const article = aiBySlug.get(slug)
  if (!article) return { h1: undefined, h2: [] }
  const content = matter(fs.readFileSync(path.join(root, articleFile(article)), 'utf8')).content
    .replace(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g, '')
  return {
    h1: content.match(/^#\s+(.+)$/m)?.[1],
    h2: [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1])
  }
}

for (const article of aiArticles) {
  const headings = articleHeadings(article.slug)
  if (headings.h1 !== article.title) fail(`${article.slug} 的 H1 与文章标题不一致。`)
  if (headings.h2.length === 0) fail(`${article.slug} 缺少可进入本文目录的 H2。`)
}

const focusHeadingSequences: Record<string, string[]> = {
  'llm-workflow-rag-agent': [
    '用同一个问题比较四条执行路径',
    'LLM 怎样根据上下文生成候选',
    '工作流怎样固定控制路径',
    'RAG 怎样把外部知识带进回答',
    'Agent 怎样根据观察选择下一步',
    '四类系统怎样组合',
    '怎样选择最小可行方案'
  ],
  'python-openai-responses-first-call': [
    'Responses API 解决什么问题',
    '准备 Python 环境和凭证',
    '发出第一次同步请求',
    '读取文本、响应状态和 usage',
    '流式事件怎样到达',
    '认证、限流、超时和空响应怎样区分',
    '用 Fake Adapter 测试无密钥路径'
  ],
  'python-agent-loop-from-scratch': [
    'Agent 循环的定义与作用',
    '从用户输入到最终回答的执行链路',
    '执行链路的 Python 实现',
    '循环终止与异常处理',
    '状态复杂化后的框架选择'
  ]
}

for (const [slug, expected] of Object.entries(focusHeadingSequences)) {
  const actual = articleHeadings(slug).h2
  let cursor = 0
  for (const heading of actual) {
    if (heading === expected[cursor]) cursor += 1
  }
  if (cursor !== expected.length) fail(`${slug} 的重点标题树未按学习顺序排列。`)
}

for (const file of markdownFiles) {
  if (contentLockedFiles.has(file)) continue
  const source = fs.readFileSync(path.join(root, file), "utf8")
  for (const match of source.matchAll(/\]\((\/docs\/[^)#\s]+)(?:#[^)]*)?\)/g)) {
    const target = match[1].replace(/\/$/, "/index").replace(/\.html$/, "") + ".md"
    if (!fs.existsSync(path.join(root, target.slice(0)))) fail(`内部链接不存在：${file} -> ${match[1]}`)
  }
}

if (errors.length) {
  console.error(`内容检查失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`内容检查通过：${articles.length} 篇文章，${sections.length} 个栏目索引，docs 发布 ${expectedFiles.size} 个 Markdown。`)
