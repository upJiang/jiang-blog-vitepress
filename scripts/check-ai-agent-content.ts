import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { aiAgentCurriculum, aiAgentStages } from '../.vitepress/ai-agent-curriculum'
import { articles } from '../.vitepress/content'
import { aiAgentSourceLedger } from './data/ai-agent-source-ledger'

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const ledgerBySlug = new Map(aiAgentSourceLedger.map((entry) => [entry.slug, entry]))
const curriculumBySlug = new Map(aiAgentCurriculum.map((article) => [article.slug, article]))
const allCoverageKeys = new Set(aiAgentSourceLedger.flatMap((entry) => entry.coverageKeys))
const aiPracticeCurriculum = articles.filter((article) => article.category === 'ai-practice')
const paragraphOwners = new Map<string, Set<string>>()
const sentenceOwners = new Map<string, Set<string>>()
const ngramOwner = new Map<string, string>()
const overlapCounts = new Map<string, number>()
const headingTreeOwners = new Map<string, Set<string>>()

if (aiAgentCurriculum.length !== 97) fail(`课程应有 97 篇文章，实际为 ${aiAgentCurriculum.length} 篇。`)
if (aiAgentStages.length !== 12) fail(`课程应有 12 个阶段，实际为 ${aiAgentStages.length} 个。`)
if (aiAgentSourceLedger.length !== aiAgentCurriculum.length) fail('来源台账数量与课程文章数量不一致。')
if (ledgerBySlug.size !== aiAgentSourceLedger.length) fail('来源台账存在重复 slug。')

for (let chapter = 1; chapter <= 45; chapter += 1) {
  const prefix = `wl-${String(chapter).padStart(2, '0')}-`
  if (![...allCoverageKeys].some((key) => key.startsWith(prefix))) {
    fail(`匿名覆盖键没有覆盖 Wayland 第 ${chapter} 章。`)
  }
}

for (const key of ['appendix-terminology', 'appendix-pattern-selection', 'appendix-engineering-faq']) {
  if (!allCoverageKeys.has(key)) fail(`匿名覆盖键缺少 ${key}。`)
}

const requiredKnowledgePrefixes = [
  'kb-file-', 'kb-object-', 'kb-document-', 'kb-ocr-', 'kb-block-', 'kb-semantic-', 'kb-table-',
  'kb-chunk-', 'kb-embedding-', 'kb-staged-', 'kb-vector-', 'kb-query-', 'kb-exact-', 'kb-sparse-',
  'kb-dense-', 'kb-hybrid-', 'kb-rerank-', 'kb-evidence-', 'kb-wiki-', 'kb-alias-', 'kb-graph-',
  'kb-rag-acl', 'kb-release-', 'kb-retrieval-eval', 'kb-claim-', 'kb-answer-', 'kb-untrusted-',
  'kb-policy-', 'kb-tenant-', 'kb-agent-eval', 'kb-feedback-', 'kb-runtime-', 'kb-turn-', 'kb-checkpoint-',
  'kb-celery-', 'kb-worker-', 'kb-sse-', 'kb-observability',
]
for (const prefix of requiredKnowledgePrefixes) {
  if (![...allCoverageKeys].some((key) => key.startsWith(prefix))) {
    fail(`匿名覆盖键缺少知识域 ${prefix}。`)
  }
}

function stripNonProse(content: string): string {
  return content
    .replace(/```(?:mermaid)?[\s\S]*?```/g, ' ')
    .replace(/^\s*<<<.*$/gm, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`\-[\](){}]/g, ' ')
}

function chineseCharacterCount(content: string): number {
  return stripNonProse(content).match(/[\u3400-\u9fff]/g)?.length ?? 0
}

function hasCompleteWalkthrough(content: string): boolean {
  const requirements = [
    /输入|请求|问题/,
    /状态|快照|上下文|记录/,
    /调用|执行|处理/,
    /输出|结果|回答|事件/,
    /失败|错误|超时|拒绝|取消|空结果/,
    /验证|测试|断言|检查|回归/,
  ]
  return requirements.every((pattern) => pattern.test(content))
}

function recordCrossArticleText(slug: string, content: string): void {
  const prose = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*<<<.*$/gm, '')

  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = paragraph
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*\d.>\s]+/, '')
      .replace(/\s+/g, '')
      .trim()
    if ((normalized.match(/[\u3400-\u9fff]/g)?.length ?? 0) < 80) continue
    const owners = paragraphOwners.get(normalized) ?? new Set<string>()
    owners.add(slug)
    paragraphOwners.set(normalized, owners)

    const compact = paragraph
      .replace(/[\p{P}\p{S}\s]/gu, '')
      .toLowerCase()
    const size = 150
    const local = new Set<string>()
    for (let index = 0; index + size <= compact.length; index += 12) {
      const ngram = compact.slice(index, index + size)
      if (local.has(ngram)) continue
      local.add(ngram)
      const owner = ngramOwner.get(ngram)
      if (!owner) {
        ngramOwner.set(ngram, slug)
        continue
      }
      if (owner === slug) continue
      const pair = [owner, slug].sort().join('|')
      overlapCounts.set(pair, (overlapCounts.get(pair) ?? 0) + 1)
    }
  }

  for (const sentence of prose.split(/(?<=[。！？])\s*|\n+/)) {
    const normalized = sentence
      .replace(/^#{1,6}\s+/, '')
      .replace(/^[-*\d.>\s]+/, '')
      .replace(/[*_`\[\](){}]/g, '')
      .replace(/\s+/g, '')
      .trim()
    if ((normalized.match(/[\u3400-\u9fff]/g)?.length ?? 0) < 24) continue
    const owners = sentenceOwners.get(normalized) ?? new Set<string>()
    owners.add(slug)
    sentenceOwners.set(normalized, owners)
  }
}

function checkArticleType(slug: string, type: string, content: string): void {
  const typeRequirements: Record<string, RegExp[]> = {
    concept: [/机制|过程|运行/, /区别|相邻|对比|比较|差别/, /适用|条件|场景/, /反例|不适用|不能/],
    implementation: [/正常|成功/, /失败|错误|异常/, /停止|终止|取消|超时/, /测试|验证|断言/],
    architecture: [/职责|所有者/, /状态|数据/, /调用|依赖/, /失败|传播/, /恢复|回滚|降级/, /取舍|代价/],
    diagnosis: [/现象|症状/, /证据|日志|状态/, /原因|根因/, /修复|处理/, /回归|复测|验证/],
    reference: [/定义|术语|问题/, /边界|区别|选择/, /主文章|\/docs\/ai-agent\//],
  }
  for (const pattern of typeRequirements[type] ?? []) {
    if (!pattern.test(content)) fail(`${slug} 的 ${type} 正文缺少 ${pattern.source} 相关展开。`)
  }
}

const seenSourceKeys = new Set<string>()
for (const [index, article] of aiAgentCurriculum.entries()) {
  const ledger = ledgerBySlug.get(article.slug)
  if (!ledger) {
    fail(`${article.slug} 缺少脱敏来源台账。`)
    continue
  }
  if (ledger.sourceKey !== article.sourceKey) fail(`${article.slug} 的来源台账 sourceKey 不一致。`)
  if (ledger.coverageKeys.join('|') !== article.coverageKeys.join('|')) fail(`${article.slug} 的覆盖键与课程不一致。`)
  if (article.coverageKeys.length < 2) fail(`${article.slug} 至少需要两个来源或知识覆盖键。`)
  if (seenSourceKeys.has(article.sourceKey)) fail(`${article.slug} 的 sourceKey 重复。`)
  seenSourceKeys.add(article.sourceKey)

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
  const parsed = matter(source)
  const content = parsed.content
  const prose = content.replace(/```[\s\S]*?```/g, '').replace(/^\s*<<<.*$/gm, '')
  const headings = [...prose.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }))
  if (headings.filter((heading) => heading.level === 1).length !== 1) fail(`${article.slug} 必须只有一个 H1。`)
  if (headings[0]?.text !== article.title) fail(`${article.slug} 的 H1 与课程标题不一致。`)
  for (let headingIndex = 1; headingIndex < headings.length; headingIndex += 1) {
    if (headings[headingIndex].level > headings[headingIndex - 1].level + 1) fail(`${article.slug} 的标题层级出现跳跃。`)
  }
  if (headings.filter((heading) => heading.level === 2).length < 5) fail(`${article.slug} 至少需要五个承接主题的 H2。`)
  const headingTree = headings
    .filter((heading) => heading.level >= 2)
    .map((heading) => `${heading.level}:${heading.text}`)
    .join('|')
  const headingTreeArticles = headingTreeOwners.get(headingTree) ?? new Set<string>()
  headingTreeArticles.add(article.slug)
  headingTreeOwners.set(headingTree, headingTreeArticles)

  const generatedHeadingPatterns = [
    /^这一环节解决哪类知识问题$/,
    /^.+位于 RAG 的哪一段$/,
    /^沿一份制度文档完整推演$/,
    /^正常完成会留下哪些证据$/,
    /^规模、缓存与发布运维$/,
    /^与相邻检索或数据组件的边界$/,
  ]
  for (const heading of headings.filter((candidate) => candidate.level === 2)) {
    if (generatedHeadingPatterns.some((pattern) => pattern.test(heading.text))) {
      fail(`${article.slug} 仍使用生成器通用标题：${heading.text}。`)
    }
  }

  const zhCount = chineseCharacterCount(content)
  if (zhCount < 6000) fail(`${article.slug} 的正文只有 ${zhCount} 个中文字符，低于 6000。`)
  if (!hasCompleteWalkthrough(content)) fail(`${article.slug} 缺少输入、状态、调用、输出、失败证据和验证结果组成的完整推演。`)
  checkArticleType(article.slug, article.articleType, content)
  recordCrossArticleText(article.slug, content)

  if (/^##\s+(?:参考资料|本文产物|本篇产物|阅读地图)/m.test(prose)) fail(`${article.slug} 仍有已删除的模板章节。`)
  if (/更新于\s*[：:]/.test(prose)) fail(`${article.slug} 仍有可见更新时间。`)
  if (/(?:Wayland|Shannon|Kocoro|TP Knowledge|\/Users\/mac\/Desktop\/TPProject)/i.test(content)) fail(`${article.slug} 暴露来源名称、案例名或私有路径。`)
  if (/(?:这篇文章接下来|本文旨在|综上所述|希望这对|推荐阅读顺序|专题阅读)/.test(content)) fail(`${article.slug} 仍有模板式或协作式文案。`)
  if (/[—–]/.test(content)) fail(`${article.slug} 使用了破折号。`)

  if (parsed.data.sourceKey !== article.sourceKey) fail(`${article.slug} 的 sourceKey 与课程不一致。`)
  if (parsed.data.stageKey !== article.stageKey) fail(`${article.slug} 的 stageKey 与课程不一致。`)
  if (parsed.data.sequence !== index + 1) fail(`${article.slug} 的 sequence 应为 ${index + 1}。`)
  if (JSON.stringify(parsed.data.dependsOn ?? []) !== JSON.stringify(article.dependsOn)) fail(`${article.slug} 的 dependsOn 与课程不一致。`)
}

for (const stage of aiAgentStages) {
  const count = aiAgentCurriculum.filter((article) => article.stageKey === stage.key).length
  if (count === 0) fail(`阶段 ${stage.label} 没有文章。`)
}

const markdownFiles = fs.readdirSync(path.join(root, 'docs', 'ai-agent'))
  .filter((file) => file.endsWith('.md') && file !== 'index.md')
const expectedFiles = new Set(aiAgentCurriculum.map((article) => `${article.slug}.md`))
for (const file of markdownFiles) {
  if (!expectedFiles.has(file)) fail(`旧 AI URL 对应文件仍存在：${file}`)
}
for (const file of expectedFiles) {
  if (!markdownFiles.includes(file)) fail(`课程文件未生成：${file}`)
}

if (curriculumBySlug.size !== aiAgentCurriculum.length) fail('课程存在重复 slug。')

if (aiPracticeCurriculum.length !== 10) fail(`AI 实践应有 10 篇文章，实际为 ${aiPracticeCurriculum.length} 篇。`)
for (const [index, article] of aiPracticeCurriculum.entries()) {
  const file = path.join(root, 'docs', 'ai-practice', `${article.slug}.md`)
  if (!fs.existsSync(file)) {
    fail(`${article.slug} 缺少 AI 实践正文。`)
    continue
  }
  const source = fs.readFileSync(file, 'utf8')
  const parsed = matter(source)
  const content = parsed.content
  const headings = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }))
  if (headings.filter((heading) => heading.level === 1).length !== 1) fail(`${article.slug} 必须只有一个 H1。`)
  if (headings[0]?.text !== article.title) fail(`${article.slug} 的 H1 与实践标题不一致。`)
  if (headings.filter((heading) => heading.level === 2).length < 8) fail(`${article.slug} 至少需要八个连续 H2。`)
  if (chineseCharacterCount(content) < 6000) fail(`${article.slug} 的实践正文低于 6000 个中文字符。`)
  if (!hasCompleteWalkthrough(content)) fail(`${article.slug} 缺少完整推演。`)
  checkArticleType(article.slug, 'implementation', content)
  recordCrossArticleText(article.slug, content)

  if (parsed.data.title !== article.title) fail(`${article.slug} 的 title 与实践清单不一致。`)
  if (parsed.data.stageKey !== article.stageKey) fail(`${article.slug} 的 stageKey 与实践清单不一致。`)
  if (parsed.data.sequence !== index + 1) fail(`${article.slug} 的 sequence 应为 ${index + 1}。`)
  if (parsed.data.sourceKey !== article.sourceKey) fail(`${article.slug} 的 sourceKey 与实践清单不一致。`)
  if (JSON.stringify(parsed.data.dependsOn ?? []) !== JSON.stringify(article.dependsOn ?? [])) fail(`${article.slug} 的 dependsOn 与实践清单不一致。`)
  if (/^##\s+(?:参考资料|本文产物|本篇产物|阅读地图)/m.test(content)) fail(`${article.slug} 仍有已删除的模板章节。`)
  if (/(?:Wayland|Shannon|Kocoro|TP Knowledge|\/Users\/mac\/Desktop\/TPProject)/i.test(source)) fail(`${article.slug} 暴露来源名称、案例名或私有路径。`)
  if (/[—–]/.test(content)) fail(`${article.slug} 使用了破折号。`)
}

for (const [paragraph, owners] of paragraphOwners) {
  if (owners.size > 1) fail(`跨文章重复长段落：${[...owners].join('、')} -> ${paragraph.slice(0, 60)}...`)
}
for (const [sentence, owners] of sentenceOwners) {
  if (owners.size > 2) fail(`跨文章重复长句（${owners.size} 篇）：${[...owners].slice(0, 6).join('、')} -> ${sentence.slice(0, 70)}...`)
}
for (const [headingTree, owners] of headingTreeOwners) {
  if (owners.size > 1) {
    fail(`多篇文章复用同一标题树：${[...owners].join('、')} -> ${headingTree.slice(0, 100)}...`)
  }
}
for (const [pair, count] of overlapCounts) {
  // A single shared sentence can be a legitimate protocol definition. Flag only
  // sustained overlap, which indicates that an article copied an entire block.
  if (count > 12) fail(`${pair} 存在 ${count} 段重复的 150 字连续内容。`)
}

if (errors.length > 0) {
  console.error(`AI/Agent 内容检查失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('AI 内容检查通过：97 篇主课程、10 篇实践、12+6 个阶段、来源覆盖、深度推演与跨文重复均已验证。')
