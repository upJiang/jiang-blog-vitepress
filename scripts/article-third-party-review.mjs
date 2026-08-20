import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const evidenceRoot = '/tmp/jiang-blog-rewrite'
const baseline = 'docs/ai-agent/llm-workflow-rag-agent.md'
const views = ['beginner', 'engineer', 'editorSeo']
const allowedVerdicts = new Set(['pass', 'repair_allowed', 'rewrite_required'])

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function contentId(file) {
  return relative(file).replace(/^docs\//, '').replace(/\.md$/, '').replaceAll('/', '__')
}

function nonEmptyFile(file) {
  return fs.existsSync(file) && fs.readFileSync(file, 'utf8').trim().length > 0
}

function hasLineLocation(location) {
  return typeof location === 'string' && /(?:\bline\s*\d+\b|:\d+\b|第\s*\d+\s*行|标题|^h[1-6]\b)/i.test(location)
}

function hasEvidence(evidence) {
  if (Array.isArray(evidence)) return evidence.length > 0 && evidence.every((item) => typeof item === 'string' && item.trim())
  return typeof evidence === 'string' && evidence.trim().length > 0
}

const files = walk(docsRoot)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !file.endsWith(`${path.sep}index.md`))
  .filter((file) => relative(file) !== baseline)

const results = files.map((file) => {
  const id = contentId(file)
  const directory = path.join(evidenceRoot, id)
  const findings = []
  const requiredFiles = ['concept-model.md', 'title-contract.md', 'contract.md', 'self-check.md', 'render-check.json', 'third-party-review.json']

  for (const name of requiredFiles) {
    if (!nonEmptyFile(path.join(directory, name))) {
      findings.push({ view: 'process', verdict: 'rewrite_required', location: `${name}:1`, reason: `缺少 ${name}，不能证明文章经过 v3 流程` })
    }
  }

  const selfCheckFile = path.join(directory, 'self-check.md')
  if (nonEmptyFile(selfCheckFile) && !/^status:\s*ready_for_third_party\s*$/m.test(fs.readFileSync(selfCheckFile, 'utf8'))) {
    findings.push({ view: 'process', verdict: 'rewrite_required', location: 'self-check.md:1', reason: '作者自测必须只声明 ready_for_third_party' })
  }

  const renderFile = path.join(directory, 'render-check.json')
  let render = null
  if (nonEmptyFile(renderFile)) {
    try {
      render = JSON.parse(fs.readFileSync(renderFile, 'utf8'))
      for (const viewport of [375, 768, 1024, 1440]) {
        const item = render.viewports?.[String(viewport)]
        if (!item || item.horizontalOverflow !== false || item.markdownLeak !== false || item.navigationOccluded !== false) {
          findings.push({ view: 'render', verdict: 'rewrite_required', location: `render-check.json:viewport-${viewport}`, reason: '渲染证据必须明确证明无横向溢出、无裸露 Markdown、无导航遮挡' })
        }
      }
    } catch (error) {
      findings.push({ view: 'render', verdict: 'rewrite_required', location: 'render-check.json:1', reason: `渲染报告不是有效 JSON：${error.message}` })
    }
  }

  const reviewFile = path.join(directory, 'third-party-review.json')
  let review = null
  if (nonEmptyFile(reviewFile)) {
    try {
      review = JSON.parse(fs.readFileSync(reviewFile, 'utf8'))
    } catch (error) {
      findings.push({ view: 'process', verdict: 'rewrite_required', location: 'third-party-review.json:1', reason: `第三者报告不是有效 JSON：${error.message}` })
    }
  }

  if (review) {
    const independent = review.independentContext
    if (independent?.mode !== 'fresh_context' || independent?.authorProcessVisible !== false || independent?.blindRead !== true) {
      findings.push({ view: 'process', verdict: 'rewrite_required', location: 'third-party-review.json:independentContext', reason: '报告必须声明使用不共享作者过程的全新上下文，并完成盲读' })
    }
    const readback = review.readback
    if (!readback || !readback.mainQuestion || !readback.concepts || !readback.relationships || !readback.outlinePath) {
      findings.push({ view: 'process', verdict: 'rewrite_required', location: 'third-party-review.json:readback', reason: '第三者必须先独立复述主问题、概念、关系和标题树路径' })
    }
    for (const view of views) {
      const item = review.views?.[view]
      if (!item || !allowedVerdicts.has(item.verdict)) {
        findings.push({ view, verdict: 'rewrite_required', location: 'third-party-review.json:views', reason: `缺少 ${view} 视角或 verdict 不合法` })
        continue
      }
      if (!hasLineLocation(item.location) || !item.problem || !hasEvidence(item.evidence) || !item.impact || !item.required_action) {
        findings.push({ view, verdict: 'rewrite_required', location: item.location ?? `third-party-review.json:${view}`, reason: `${view} 必须提供带行号或标题位置的问题、证据、影响和行动` })
      }
    }
  }

  const viewVerdicts = views.map((view) => review?.views?.[view]?.verdict)
  const verdict = findings.length > 0
    ? 'rewrite_required'
    : viewVerdicts.includes('rewrite_required')
      ? 'rewrite_required'
      : viewVerdicts.includes('repair_allowed')
        ? 'repair_allowed'
        : 'pass'

  return {
    file: relative(file),
    contentId: id,
    verdict,
    views: review?.views ?? null,
    renderChecked: Boolean(render),
    findings
  }
})

const summary = results.reduce((acc, item) => {
  acc[item.verdict] += 1
  return acc
}, { pass: 0, repair_allowed: 0, rewrite_required: 0 })

console.log(JSON.stringify({
  kind: 'independent-semantic-review-evidence-gate',
  semanticAssessment: 'evidence_presence_only',
  baseline,
  evidenceRoot,
  files: results.length,
  summary,
  results,
  note: '本脚本只校验第三者报告的独立性声明、证据位置和渲染证据结构，不阅读文章，也不推断语义质量。'
}, null, 2))

if (summary.pass !== results.length) process.exitCode = 1
