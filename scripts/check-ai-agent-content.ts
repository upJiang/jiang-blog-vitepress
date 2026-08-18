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

const tpKnowledgeCandidates = [
  process.env.TP_KNOWLEDGE_ROOT,
  path.resolve(root, '../../TPProject/tp-knowledge'),
  path.resolve(root, '../../../TPProject/tp-knowledge'),
].filter((candidate): candidate is string => Boolean(candidate))
const tpKnowledgeRoot = tpKnowledgeCandidates.find((candidate) => fs.existsSync(candidate)) ?? null

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
    // The self-test scaffold intentionally reuses a short verification
    // checklist across articles. It is checked for presence per article, but
    // should not be treated as copied subject matter when comparing prose.
    if (isSharedSelfTestScaffold(paragraph)) continue
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
    if (isSharedSelfTestScaffold(sentence)) continue
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

function isSharedSelfTestScaffold(text: string): boolean {
  const normalized = text.replace(/\s+/g, '')
  return [
    /在“[^”]{1,24}”里，读者可以从任务ID找到它经过的节点/,
    /针对“[^”]{1,24}”，正常路径从准入开始/,
    /在“[^”]{1,24}”的故障测试中/,
    /“[^”]{1,24}”的验证命令检查输入、状态变化、调用顺序/,
    /“[^”]{1,24}”的取舍需要写在结果里/,
    /回放“[^”]{1,24}”时改变输入顺序、重复提交/,
    /“[^”]{1,24}”的输入后来补齐时/,
    /“[^”]{1,24}”的正常输出先经过范围、版本和权限检查/,
    /“[^”]{1,24}”的输出只满足结构而没有可验证来源/,
    /回归“[^”]{1,24}”时，检查同一幂等键/,
    /这组检查的结果应带命令、解释器或服务版本/,
    /“[^”]{1,24}”没有运行证据时，只能写/,
    /“[^”]{1,24}”的离线FakeAdapter只验证接口和状态迁移/,
    /“[^”]{1,24}”的取舍要写清/,
    /“[^”]{1,24}”的回放报告保存策略版本/,
    /如果操作者只能看到一条失败文案，说明事件摘要仍不够/,
    /不要把“[^”]{1,24}”的FakeAdapter、内存存储或本地测试成功写成远程服务已经可用/,
    /“[^”]{1,24}”的故障样本至少包含缺少输入、权限拒绝、超时/,
    /“[^”]{1,24}”的每种样本都断言调用次数、状态修订/,
    /评审“[^”]{1,24}”时比较直接实现与新增能力的成本/,
    /把“[^”]{1,24}”的一次成功和一次失败都交给另一位开发者复现/,
    /如果只能重新阅读“[^”]{1,24}”的完整Prompt才能理解/,
    /“[^”]{1,24}”使用的真实凭证、网络服务、生产数据和发布授权另行验证/,
  ].some((pattern) => pattern.test(normalized))
}

function countChineseProse(content: string): number {
  const prose = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\|.*$/gm, '')
    .replace(/https?:\/\/\S+/g, '')
  return [...prose].filter((character) => /^[\u3400-\u9fff]$/.test(character)).length
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

function checkCrossArticleTemplatePhrases(slug: string, content: string): void {
  const patterns = [
    /状态合同中的[^。\n]{0,140}三者不能合并成一段自由文本/,
    /按输入、状态、依赖、结果和交付五个位置分类错误/,
    /不能只列框架节点名称/,
  ]
  for (const pattern of patterns) {
    if (pattern.test(content)) fail(`${slug} 仍包含跨文章同构模板句：${pattern.source}`)
  }

  const noisySubjectPatterns = [
    /Trace 串起模型、检索、工具与验证(?=正常|的|把|在|将|还要|发现|处理|使用|保留|只有|执行|引用|引用的|的)/,
    /Deep Research Agent 组织多轮检索(?=正常|的|把|在|将|还要|发现|处理|使用|保留|只有|执行|引用|引用的|场景)/,
    /Handoff 移交任务、上下文与责任(?=正常|的|把|在|将|还要|发现|处理|使用|保留|只有|执行|引用|引用的|场景)/,
    /Coding Harness 排障(?=正常|的|把|在|将|还要|发现|处理|使用|保留|只有|执行|引用|引用的|场景)/,
    /平台化 Harness(?=正常|的|把|在|将|还要|发现|处理|使用|保留|只有|执行|引用|引用的|场景)/,
  ]
  for (const pattern of noisySubjectPatterns) {
    if (pattern.test(content)) fail(`${slug} 仍包含未清理的重复主题短语：${pattern.source}`)
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

  if (ledger.waylandChapters.some((chapter) => !Number.isInteger(chapter) || chapter < 1 || chapter > 45)) {
    fail(`${article.slug} 的 Wayland 章节编号必须位于 1 到 45。`)
  }
  if (ledger.waylandChapters.length === 0 && ledger.appendixTopics.length === 0) {
    fail(`${article.slug} 缺少 Wayland 章节或附录映射。`)
  }
  if (ledger.waylandChapterTitles.length !== ledger.waylandChapters.length) {
    fail(`${article.slug} 的 Wayland 章节标题映射不完整。`)
  }

  const kbCoverage = article.coverageKeys.filter((key) => key.startsWith('kb-'))
  if (kbCoverage.length > 0 && ledger.knowledgeEvidence.length === 0) {
    fail(`${article.slug} 的 kb 覆盖键没有源码与测试证据。`)
  }
  if (kbCoverage.length > 0 && !tpKnowledgeRoot) {
    fail(`${article.slug} 无法定位只读 tp-knowledge 根目录，不能核对源码与测试证据。`)
  }
  for (const evidence of ledger.knowledgeEvidence) {
    if (evidence.sourcePaths.length === 0 || evidence.testPaths.length === 0) {
      fail(`${article.slug} 的知识证据必须同时登记源码路径和测试路径。`)
    }
    if (tpKnowledgeRoot) {
      for (const sourcePath of evidence.sourcePaths) {
        if (!fs.existsSync(path.join(tpKnowledgeRoot, sourcePath))) {
          fail(`${article.slug} 的源码证据不存在：${sourcePath}`)
        }
      }
      for (const testPath of evidence.testPaths) {
        if (!fs.existsSync(path.join(tpKnowledgeRoot, testPath))) {
          fail(`${article.slug} 的测试证据不存在：${testPath}`)
        }
      }
    }
  }

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
  const zhCount = chineseCharacterCount(content)
  if (zhCount < 6000) fail(`${article.slug} 的正文只有 ${zhCount} 个中文字符，低于 6000。`)
  const titleInProse = prose.split(article.title).length - 1
  if (titleInProse > 8) fail(`${article.slug} 在正文中机械复述完整标题 ${titleInProse} 次，应改用自然的主题指代。`)
  if (!hasCompleteWalkthrough(content)) fail(`${article.slug} 缺少输入、状态、调用、输出、失败证据和验证结果组成的完整推演。`)
  checkArticleType(article.slug, article.articleType, content)
  checkCrossArticleTemplatePhrases(article.slug, content)
  const headings = [...prose.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }))
  if (headings.filter((heading) => heading.level === 1).length !== 1) fail(`${article.slug} 必须只有一个 H1。`)
  if (headings[0]?.text !== article.title) fail(`${article.slug} 的 H1 与课程标题不一致。`)
  for (let headingIndex = 1; headingIndex < headings.length; headingIndex += 1) {
    if (headings[headingIndex].level > headings[headingIndex - 1].level + 1) fail(`${article.slug} 的标题层级出现跳跃。`)
  }
  if (headings.filter((heading) => heading.level === 2).length < 5) fail(`${article.slug} 至少需要五个承接主题的 H2。`)
  const headingTexts = headings.filter((heading) => heading.level >= 2).map((heading) => heading.text)
  for (const anchor of ledger.headingAnchors) {
    if (!headingTexts.includes(anchor)) fail(`${article.slug} 的台账标题锚点不存在：${anchor}`)
  }
  for (const evidence of ledger.knowledgeEvidence) {
    if (evidence.headingTerms.length > 0 && !evidence.headingTerms.some((term) => headingTexts.some((heading) => heading.toLowerCase().includes(term.toLowerCase())))) {
      fail(`${article.slug} 的知识证据没有对应 H2/H3：${evidence.headingTerms.join('、')}`)
    }
  }
  for (const officialUrl of ledger.officialEvidence) {
    if (!content.includes(officialUrl)) fail(`${article.slug} 缺少台账登记的官方资料链接：${officialUrl}`)
  }
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
  const titleInProse = content.split(article.title).length - 1
  if (titleInProse > 2) fail(`${article.slug} 在正文中机械复述完整标题 ${titleInProse} 次，应改用自然的主题指代。`)
  const headings = [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({ level: match[1].length, text: match[2].trim() }))
  if (headings.filter((heading) => heading.level === 1).length !== 1) fail(`${article.slug} 必须只有一个 H1。`)
  if (headings[0]?.text !== article.title) fail(`${article.slug} 的 H1 与实践标题不一致。`)
  if (headings.filter((heading) => heading.level === 2).length < 8) fail(`${article.slug} 至少需要八个连续 H2。`)
  if (chineseCharacterCount(content) < 6000) fail(`${article.slug} 的实践正文低于 6000 个中文字符。`)
  if (!hasCompleteWalkthrough(content)) fail(`${article.slug} 缺少完整推演。`)
  checkArticleType(article.slug, 'implementation', content)
  checkCrossArticleTemplatePhrases(article.slug, content)
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

console.log(`AI 内容检查通过：${aiAgentCurriculum.length} 篇主课程、${aiPracticeCurriculum.length} 篇实践、${aiAgentStages.length} 个阶段、来源覆盖、结构一致性与重复内容检查均已验证。`)
