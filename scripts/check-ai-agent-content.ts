import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { aiAgentCurriculum, aiAgentStages } from '../.vitepress/ai-agent-curriculum'
import { aiAgentSourceLedger } from './data/ai-agent-source-ledger'

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const ledgerBySlug = new Map(aiAgentSourceLedger.map((entry) => [entry.slug, entry]))
const curriculumBySlug = new Map(aiAgentCurriculum.map((article) => [article.slug, article]))

if (aiAgentCurriculum.length !== 67) fail(`课程应有 67 篇文章，实际为 ${aiAgentCurriculum.length} 篇。`)
if (aiAgentSourceLedger.length !== 67) fail(`来源台账应有 67 条记录，实际为 ${aiAgentSourceLedger.length} 条。`)
if (ledgerBySlug.size !== aiAgentSourceLedger.length) fail('来源台账存在重复 slug。')

const expectedChapters = new Set(Array.from({ length: 33 }, (_, index) => String(index + 1).padStart(2, '0')))
const coveredChapters = new Set(aiAgentSourceLedger.flatMap((entry) => entry.waylandChapters))
for (const chapter of expectedChapters) {
  if (!coveredChapters.has(chapter)) fail(`来源台账没有覆盖 Wayland 第 ${chapter} 章。`)
}

const requiredTopics = [
  'Turn', 'Release', 'Policy', 'ACL', 'Context', 'Memory', 'Planner', 'Evidence', 'Claim',
  'SSE', 'Celery', 'Checkpoint', 'Eval', 'MCP', 'Runtime', 'Feedback', 'Canary'
]
const ledgerText = aiAgentSourceLedger
  .map((entry) => [entry.allowedClaims, ...entry.internalSources, ...entry.officialSources].join(' '))
  .join(' ')
for (const topic of requiredTopics) {
  if (!ledgerText.toLowerCase().includes(topic.toLowerCase())) fail(`来源台账未登记内部主题：${topic}。`)
}

let previousChapter = 0
const seenSourceKeys = new Set<string>()
for (const [index, article] of aiAgentCurriculum.entries()) {
  const ledger = ledgerBySlug.get(article.slug)
  if (!ledger) {
    fail(`${article.slug} 缺少来源台账。`)
    continue
  }
  if (article.sourceKey !== `ai-${article.slug}` && !article.sourceKey) fail(`${article.slug} 缺少 sourceKey。`)
  if (seenSourceKeys.has(article.sourceKey)) fail(`${article.slug} 的 sourceKey 重复。`)
  seenSourceKeys.add(article.sourceKey)
  if (index + 1 <= previousChapter) fail(`${article.slug} 的课程顺序倒退。`)
  previousChapter = index + 1
  for (const dependency of article.dependsOn) {
    const dependencyIndex = aiAgentCurriculum.findIndex((candidate) => candidate.slug === dependency)
    if (dependencyIndex < 0 || dependencyIndex >= index) fail(`${article.slug} 依赖未在前置位置：${dependency}。`)
  }

  const file = path.join(root, 'docs', 'ai-agent', `${article.slug}.md`)
  if (!fs.existsSync(file)) {
    fail(`${article.slug} 缺少正式正文。`)
    continue
  }
  const source = fs.readFileSync(file, 'utf8')
  const content = matter(source).content
  const prose = content.replace(/```[\s\S]*?```/g, '').replace(/<<<[^\n]+/g, '')
  const headings = [...prose.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }))
  if (headings.filter((heading) => heading.level === 1).length !== 1) fail(`${article.slug} 必须只有一个 H1。`)
  if (headings[0]?.text !== article.title) fail(`${article.slug} 的 H1 与课程标题不一致。`)
  for (let headingIndex = 1; headingIndex < headings.length; headingIndex += 1) {
    if (headings[headingIndex].level > headings[headingIndex - 1].level + 1) fail(`${article.slug} 的标题层级出现跳跃。`)
  }
  if (headings.filter((heading) => heading.level === 2).length < 4) fail(`${article.slug} 至少需要四个连续 H2。`)
  if (!/(?:执行轨迹|一次|失败|验证|```|\|.+\|)/.test(content)) fail(`${article.slug} 缺少执行轨迹、失败路径或可观察验证。`)
  if (/^##\s+(?:参考资料|本文产物|本篇产物)/m.test(prose)) fail(`${article.slug} 仍有旧模板章节。`)
  if (/更新于\s*[：:]/.test(prose)) fail(`${article.slug} 仍有可见更新时间。`)
  const frontmatter = matter(source).data
  if (frontmatter.sourceKey !== article.sourceKey) fail(`${article.slug} 的 sourceKey 与课程不一致。`)
  if (frontmatter.stageKey !== article.stageKey) fail(`${article.slug} 的 stageKey 与课程不一致。`)
}

for (const stage of aiAgentStages) {
  const count = aiAgentCurriculum.filter((article) => article.stageKey === stage.key).length
  if (count === 0) fail(`阶段 ${stage.label} 没有文章。`)
}

const oldRouteFiles = [
  'agent-compose-local-runtime', 'agent-framework-selection', 'agent-graph-runtime-testing',
  'agent-parallel-preprocess', 'agent-security-eval-observability', 'codex-context-compaction',
  'context-assembly-budget', 'context-memory-compression', 'document-format-parsing-ocr',
  'embedding-vector-space', 'langchain-core-abstractions', 'langgraph-state-runtime',
  'mcp-transports-discovery-cancellation', 'memory-quality-evaluation', 'rag-adaptive-corrective-agentic',
  'vector-store-selection'
]
for (const slug of oldRouteFiles) {
  if (fs.existsSync(path.join(root, 'docs', 'ai-agent', `${slug}.md`))) fail(`旧 AI 路由仍存在：${slug}`)
}

if (errors.length > 0) {
  console.error(`AI/Agent 内容检查失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`AI/Agent 内容检查通过：${aiAgentCurriculum.length} 篇正文、${aiAgentStages.length} 个阶段、Wayland 01-33 主题和来源台账均已登记。`)
