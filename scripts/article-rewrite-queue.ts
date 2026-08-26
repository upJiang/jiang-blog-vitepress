import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { articles, articleFile, articlePath, sections, type ChapterMeta } from '../.vitepress/content'
import { aiAgentCurriculum } from '../.vitepress/ai-agent-curriculum'

const root = process.cwd()
const evidenceRoot = '/tmp/jiang-blog-rewrite'
const baselineFile = 'docs/ai-agent/llm-workflow-rag-agent.md'
const categoryOrder = ['ai-agent', 'ai-practice', 'backend', 'devops', 'onnx-practice', 'frontend', 'algorithms', 'seo']
const rewriteStatuses = [
  'queued',
  'concept_model_ready',
  'concept_model_verified',
  'title_contract_ready',
  'outline_ready',
  'draft_ready',
  'self_checked',
  'independent_blind_review',
  'evidence_review',
  'render_checked',
  'pass'
] as const
const aiAgentSpecBySlug = new Map(aiAgentCurriculum.map((article) => [article.slug, article]))

type RewriteStatus = (typeof rewriteStatuses)[number]
type ArticleRecord = {
  contentId: string
  file: string
  route: string
  canonicalRoute: string
  candidateSlug: string
  category: ChapterMeta['category']
  title: string
  description: string
  articleType: string
  stageKey: string
  part: string
  chapter: number
  sequence: number
  sourceKey?: string
  dependsOn: string[]
  previous?: string
  next?: string
  sectionEntry: string
  homeEntries: string[]
  inboundReferences: string[]
  isBaseline: boolean
  mayDeleteSplitOrMerge: true
  status: RewriteStatus | 'read_only_baseline'
  failureReason: string | null
  conceptModelStatus: 'not_started' | 'verified' | 'invalid'
  argumentMode: string | null
  carrierType: string | null
}

function idFor(article: ChapterMeta): string {
  return `${article.category}__${article.slug.replaceAll('/', '__')}`
}

function compareArticles(a: ChapterMeta, b: ChapterMeta): number {
  const categoryDelta = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  if (categoryDelta) return categoryDelta
  return (a.sequence ?? a.chapter) - (b.sequence ?? b.chapter)
}

function topologicalSort(input: ChapterMeta[]): ChapterMeta[] {
  const bySlug = new Map(input.map((article) => [article.slug, article]))
  const indegree = new Map(input.map((article) => [article.slug, 0]))
  const outgoing = new Map<string, string[]>()

  if (bySlug.size !== input.length) throw new Error('内容模型存在重复 slug，无法建立唯一依赖图。')

  for (const article of input) {
    for (const dependency of article.dependsOn ?? []) {
      if (!bySlug.has(dependency)) throw new Error(`${article.slug} dependsOn unknown article: ${dependency}`)
      indegree.set(article.slug, (indegree.get(article.slug) ?? 0) + 1)
      outgoing.set(dependency, [...(outgoing.get(dependency) ?? []), article.slug])
    }
  }

  const ready = input.filter((article) => indegree.get(article.slug) === 0).sort(compareArticles)
  const result: ChapterMeta[] = []
  while (ready.length) {
    const current = ready.shift()!
    result.push(current)
    for (const dependent of outgoing.get(current.slug) ?? []) {
      const nextDegree = (indegree.get(dependent) ?? 0) - 1
      indegree.set(dependent, nextDegree)
      if (nextDegree === 0) {
        ready.push(bySlug.get(dependent)!)
        ready.sort(compareArticles)
      }
    }
  }

  if (result.length !== input.length) {
    const emitted = new Set(result.map((article) => article.slug))
    throw new Error(`dependsOn contains a cycle: ${input.filter((article) => !emitted.has(article.slug)).map((article) => !emitted.has(article.slug) && article.slug).join(', ')}`)
  }
  return result
}

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function relative(file: string): string {
  return path.relative(root, file).split(path.sep).join('/')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function referencesTo(route: string, files: string[]): string[] {
  const pattern = new RegExp(`\\]\\(${escapeRegExp(route)}(?:[#?)\\"']|$)`)
  return files
    .filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
    .map(relative)
}

function evidenceFile(contentId: string, name: string): string {
  return path.join(evidenceRoot, contentId, name)
}

function readEvidence(contentId: string, name: string): string | null {
  const file = evidenceFile(contentId, name)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
}

function modifiedAt(file: string): number {
  return fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0
}

function hasLineLocation(value: unknown): boolean {
  return typeof value === 'string' && /(?:\bline\s*\d+(?:\s*[-–]\s*\d+)?\b|:\d+(?:[-–]\d+)?\b|第\s*\d+(?:\s*[-–]\s*\d+)?\s*行|标题|^h[1-6]\b)/i.test(value)
}

function hasReviewEvidence(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0)
  return typeof value === 'string' && value.trim().length > 0
}

function conceptDigest(source: string): string {
  const normalized = source
    .replace(/^status:\s*\S+\s*$/m, 'status: concept_model_ready')
    .replace(/^verified_by:\s*\S+\s*\n?/m, '')
    .replace(/^verified_sha256:\s*\S+\s*\n?/m, '')
  return createHash('sha256').update(normalized).digest('hex')
}

function evidenceState(contentId: string, sourceFile: string): Pick<ArticleRecord, 'status' | 'failureReason' | 'conceptModelStatus' | 'argumentMode' | 'carrierType'> {
  const concept = readEvidence(contentId, 'concept-model.md')
  const titleContract = readEvidence(contentId, 'title-contract.md')
  const contract = readEvidence(contentId, 'contract.md')
  const selfCheck = readEvidence(contentId, 'self-check.md')
  const reviewSource = readEvidence(contentId, 'third-party-review.json')
  const renderSource = readEvidence(contentId, 'render-check.json')
  const argumentMode = contract?.match(/^[- ]*argument_mode:\s*(\S+)/m)?.[1] ?? null
  const carrierType = contract?.match(/^[- ]*carrier_type:\s*(\S+)/m)?.[1] ?? null

  if (!concept) {
    return { status: 'queued', failureReason: '待建立概念模型，旧契约不能作为新稿输入。', conceptModelStatus: 'not_started', argumentMode, carrierType }
  }
  const conceptReviewName = concept.match(/^verified_by:\s*(\S+)\s*$/m)?.[1]
  const verifiedDigest = concept.match(/^verified_sha256:\s*([a-f0-9]{64})\s*$/m)?.[1]
  const conceptReviewFile = conceptReviewName ? evidenceFile(contentId, conceptReviewName) : ''
  const conceptReview = conceptReviewFile && fs.existsSync(conceptReviewFile)
    ? fs.readFileSync(conceptReviewFile, 'utf8')
    : null
  const conceptVerified = /^status:\s*concept_model_verified\s*$/m.test(concept) &&
    verifiedDigest === conceptDigest(concept) &&
    Boolean(conceptReview) &&
    /(?:^|`)verdict:\s*pass(?:`|$)/m.test(conceptReview!) &&
    new RegExp(`^concept_sha256:\\s*${verifiedDigest}$`, 'm').test(conceptReview!)
  if (!conceptVerified) {
    return { status: 'concept_model_ready', failureReason: '概念模型缺少当前版本的独立 pass 审查，或状态不是 concept_model_verified。', conceptModelStatus: 'invalid', argumentMode, carrierType }
  }
  if (!titleContract || !contract) {
    return { status: 'concept_model_verified', failureReason: '概念模型已验证，标题契约或文章契约尚未完成。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  if (!selfCheck || !/^status:\s*ready_for_third_party\s*$/m.test(selfCheck)) {
    return { status: 'outline_ready', failureReason: '契约已存在，作者自测尚未声明 ready_for_third_party。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  const articleModifiedAt = modifiedAt(path.join(root, sourceFile))
  const selfCheckModifiedAt = modifiedAt(evidenceFile(contentId, 'self-check.md'))
  if (selfCheckModifiedAt < Math.max(articleModifiedAt, modifiedAt(evidenceFile(contentId, 'title-contract.md')), modifiedAt(evidenceFile(contentId, 'contract.md')))) {
    return { status: 'outline_ready', failureReason: '作者自测早于当前正文或契约，必须重新执行。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  if (!reviewSource) {
    return { status: 'self_checked', failureReason: '等待独立第三者盲审报告。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }

  let review: {
    verdict?: string
    independentContext?: { mode?: string; authorProcessVisible?: boolean; blindRead?: boolean }
    readback?: { mainQuestion?: string; concepts?: string; relationships?: string; outlinePath?: string }
    views?: Record<string, { verdict?: string; location?: string; problem?: string; evidence?: string; impact?: string; required_action?: string }>
  } | null = null
  try {
    review = JSON.parse(reviewSource)
  } catch {
    return { status: 'independent_blind_review', failureReason: '第三者报告不是有效 JSON。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  if (modifiedAt(evidenceFile(contentId, 'third-party-review.json')) < Math.max(articleModifiedAt, selfCheckModifiedAt)) {
    return { status: 'independent_blind_review', failureReason: '第三者报告早于当前正文或作者自测，必须重新盲审。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  const independent = review?.independentContext
  const readback = review?.readback
  if (independent?.mode !== 'fresh_context' || independent.authorProcessVisible !== false || independent.blindRead !== true ||
    !readback?.mainQuestion || !readback.concepts || !readback.relationships || !readback.outlinePath) {
    return { status: 'independent_blind_review', failureReason: '第三者报告缺少全新上下文、盲读声明或独立复述。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  const reviewViews = ['beginner', 'engineer', 'editorSeo']
  const completeViews = reviewViews.every((view) => {
    const item = review?.views?.[view]
    return item && hasLineLocation(item.location) && item.problem && hasReviewEvidence(item.evidence) && item.impact && item.required_action
  })
  if (!completeViews) {
    return { status: 'independent_blind_review', failureReason: '第三者报告缺少带位置的问题、证据、影响或行动。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  const viewVerdicts = reviewViews.map((view) => review?.views?.[view]?.verdict)
  if (viewVerdicts.includes('rewrite_required')) {
    return { status: 'concept_model_ready', failureReason: '第三者发现语义问题，必须退回概念模型阶段。', conceptModelStatus: 'invalid', argumentMode, carrierType }
  }
  if (review?.verdict !== 'pass' || viewVerdicts.some((verdict) => verdict !== 'pass')) {
    return { status: 'evidence_review', failureReason: '第三者报告尚未达到三视角 pass。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  if (!renderSource) {
    return { status: 'evidence_review', failureReason: '第三者通过，尚缺四尺寸浏览器渲染证据。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  try {
    const render = JSON.parse(renderSource)
    const renderModifiedAt = modifiedAt(evidenceFile(contentId, 'render-check.json'))
    const checkedAt = Date.parse(render.checkedAt ?? '')
    if (renderModifiedAt < articleModifiedAt || !Number.isFinite(checkedAt) || checkedAt < articleModifiedAt) {
      return { status: 'evidence_review', failureReason: '渲染报告早于当前正文，必须重新检查四个视口。', conceptModelStatus: 'verified', argumentMode, carrierType }
    }
    const renderPassed = [375, 768, 1024, 1440].every((viewport) => {
      const item = render.viewports?.[String(viewport)]
      return item &&
        item.horizontalOverflow === false &&
        item.markdownLeak === false &&
        item.navigationOccluded === false &&
        item.h1Count === 1 &&
        Array.isArray(item.consoleErrors) && item.consoleErrors.length === 0 &&
        Number.isFinite(item.maxParagraphLines) && item.maxParagraphLines <= 6
    })
    if (!renderPassed) return { status: 'evidence_review', failureReason: '渲染证据未覆盖四个视口，或存在 H1、控制台、段落行数和排版红线。', conceptModelStatus: 'verified', argumentMode, carrierType }
  } catch {
    return { status: 'evidence_review', failureReason: '渲染报告不是有效 JSON。', conceptModelStatus: 'verified', argumentMode, carrierType }
  }
  return { status: 'pass', failureReason: null, conceptModelStatus: 'verified', argumentMode, carrierType }
}

const markdownFiles = walk(path.join(root, 'docs')).filter((file) => file.endsWith('.md'))
const sourceFiles = [
  ...markdownFiles,
  ...walk(path.join(root, '.vitepress')).filter((file) => /\.(?:ts|vue|mjs|js)$/.test(file))
]
const diskArticleFiles = markdownFiles.map(relative).filter((file) => !file.endsWith('/index.md'))
const modelFiles = new Set<string>(articles.map((article) => articleFile(article) as string))
const missingFromDisk = [...modelFiles].filter((file) => !fs.existsSync(path.join(root, file)))
const missingFromModel = diskArticleFiles.filter((file) => !modelFiles.has(file))

if (missingFromDisk.length || missingFromModel.length) {
  throw new Error(JSON.stringify({ missingFromDisk, missingFromModel }, null, 2))
}

const ordered = topologicalSort(articles)
const byCategory = new Map<string, ChapterMeta[]>()
for (const article of ordered) byCategory.set(article.category, [...(byCategory.get(article.category) ?? []), article])

function recordFor(article: ChapterMeta): ArticleRecord {
  const siblings = byCategory.get(article.category) ?? []
  const index = siblings.indexOf(article)
  const route = articlePath(article)
  const sectionEntry = sections.find((section) => section.key === article.category)?.path ?? `/docs/${article.category}/`
  const isBaseline = articleFile(article) === baselineFile
  const state = isBaseline
    ? { status: 'read_only_baseline' as const, failureReason: null, conceptModelStatus: 'verified' as const, argumentMode: null, carrierType: null }
    : evidenceState(idFor(article), articleFile(article))

  return {
    contentId: idFor(article),
    file: articleFile(article),
    route,
    canonicalRoute: route,
    candidateSlug: article.slug,
    category: article.category,
    title: article.title,
    description: article.description,
    articleType: article.category === 'ai-agent'
      ? aiAgentSpecBySlug.get(article.slug)?.articleType ?? 'concept'
      : article.practice?.type ?? 'reference',
    stageKey: article.stageKey,
    part: article.part,
    chapter: article.chapter,
    sequence: article.sequence ?? article.chapter,
    sourceKey: article.sourceKey,
    dependsOn: article.dependsOn ?? [],
    previous: siblings[index - 1] ? articlePath(siblings[index - 1]) : undefined,
    next: siblings[index + 1] ? articlePath(siblings[index + 1]) : undefined,
    sectionEntry,
    homeEntries: referencesTo(route, [path.join(root, '.vitepress/theme/HomePage.vue')]),
    inboundReferences: referencesTo(route, sourceFiles),
    isBaseline,
    mayDeleteSplitOrMerge: true,
    status: state.status,
    failureReason: state.failureReason,
    conceptModelStatus: state.conceptModelStatus,
    argumentMode: state.argumentMode,
    carrierType: state.carrierType
  }
}

const records = ordered.map(recordFor)
const queue = records.filter((record) => !record.isBaseline)

fs.mkdirSync(evidenceRoot, { recursive: true })
for (const record of queue) fs.mkdirSync(path.join(evidenceRoot, record.contentId, 'failed'), { recursive: true })

const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  baseline: { file: baselineFile, readOnly: true },
  totalDiskArticles: diskArticleFiles.length,
  totalModelArticles: articles.length,
  rewriteRequired: queue.filter((record) => record.status !== 'pass').length,
  categoryOrder,
  statuses: rewriteStatuses,
  records,
  queue,
  note: '此清单只表示任务状态，不表示正文质量通过。契约、自测、第三方报告和渲染证据必须由作者与独立审查流程产生。'
}

fs.writeFileSync(path.join(evidenceRoot, 'queue.json'), JSON.stringify(output, null, 2))
console.log(JSON.stringify({
  schemaVersion: output.schemaVersion,
  evidenceRoot,
  totalDiskArticles: output.totalDiskArticles,
  totalModelArticles: output.totalModelArticles,
  rewriteRequired: output.rewriteRequired,
  baseline: output.baseline,
  first: queue.slice(0, 5).map((item) => ({ id: item.contentId, title: item.title, dependsOn: item.dependsOn })),
  last: queue.slice(-5).map((item) => item.contentId)
}, null, 2))
