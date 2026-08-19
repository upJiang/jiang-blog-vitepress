import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const baseline = 'docs/ai-agent/llm-workflow-rag-agent.md'

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function stripFrontmatter(source) {
  return source.replace(/^---\n[\s\S]*?\n---\n?/, '')
}

function isFence(line) {
  return /^\s*(?:```|~~~)/.test(line)
}

function isStructural(line) {
  return /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|\||:::|>|<!--|<[^>]|!\[)/.test(line)
}

function headings(source) {
  const result = []
  let inFence = false
  source.split('\n').forEach((line, index) => {
    if (isFence(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (match) result.push({ level: match[1].length, text: match[2], line: index + 1 })
  })
  return result
}

function paragraphs(source) {
  const result = []
  let inFence = false
  let buffer = []
  let startLine = 1
  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) result.push({ text, line: startLine })
    buffer = []
  }

  source.split('\n').forEach((line, index) => {
    if (isFence(line)) {
      flush()
      inFence = !inFence
      startLine = index + 2
      return
    }
    if (inFence || !line.trim() || isStructural(line)) {
      flush()
      startLine = index + 2
      return
    }
    if (!buffer.length) startLine = index + 1
    buffer.push(line)
  })
  flush()
  return result
}

function routeExists(route) {
  const clean = route.split('#')[0].split('?')[0].replace(/^\//, '')
  return fs.existsSync(path.join(root, `${clean}.md`)) || fs.existsSync(path.join(root, clean, 'index.md'))
}

const files = walk(docsRoot)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !file.endsWith(`${path.sep}index.md`))
  .filter((file) => relative(file) !== baseline)

const results = []
for (const file of files) {
  const rel = relative(file)
  const source = stripFrontmatter(fs.readFileSync(file, 'utf8'))
  const hs = headings(source)
  const ps = paragraphs(source)
  const findings = []
  const views = {
    beginner: 'pass',
    engineer: 'pass',
    editorSeo: 'pass'
  }

  const h1 = hs.filter((heading) => heading.level === 1)
  if (h1.length !== 1) {
    findings.push({ view: 'beginner', verdict: 'rewrite_required', line: h1[0]?.line ?? 1, reason: `需要唯一 H1，当前为 ${h1.length} 个` })
    views.beginner = 'rewrite_required'
  }
  if (hs.length < 2) {
    findings.push({ view: 'beginner', verdict: 'repair_allowed', line: h1[0]?.line ?? 1, reason: '标题树不足以表达问题、机制和边界' })
    if (views.beginner === 'pass') views.beginner = 'repair_allowed'
  }

  const fenceCount = (source.match(/^\s*(?:```|~~~)/gm) || []).length
  if (fenceCount % 2 !== 0) {
    findings.push({ view: 'engineer', verdict: 'rewrite_required', line: 1, reason: '代码或 Mermaid 围栏未闭合' })
    views.engineer = 'rewrite_required'
  }

  for (const paragraph of ps) {
    if (paragraph.text.replace(/\s+/g, ' ').length > 240) {
      findings.push({ view: 'editorSeo', verdict: 'rewrite_required', line: paragraph.line, reason: '段落超过排版红线，需要按逻辑拆分' })
      views.editorSeo = 'rewrite_required'
    }
  }

  const seen = new Map()
  for (const paragraph of ps) {
    const normalized = paragraph.text.replace(/\s+/g, ' ')
    if (normalized.length < 100) continue
    const locations = seen.get(normalized) ?? []
    locations.push(paragraph.line)
    seen.set(normalized, locations)
  }
  for (const [text, locations] of seen) {
    if (locations.length > 1) {
      findings.push({ view: 'editorSeo', verdict: 'rewrite_required', line: locations[1], reason: `重复段落：${text.slice(0, 70)}` })
      views.editorSeo = 'rewrite_required'
    }
  }

  for (const match of source.matchAll(/\]\((\/docs\/[^)\s#?]+(?:#[^)]*)?)\)/g)) {
    if (!routeExists(match[1])) {
      findings.push({ view: 'editorSeo', verdict: 'repair_allowed', line: source.slice(0, match.index).split('\n').length, reason: `站内路由不存在：${match[1]}` })
      if (views.editorSeo === 'pass') views.editorSeo = 'repair_allowed'
    }
  }

  const verdict = views.beginner === 'rewrite_required' || views.engineer === 'rewrite_required' || views.editorSeo === 'rewrite_required'
    ? 'rewrite_required'
    : Object.values(views).includes('repair_allowed')
      ? 'repair_allowed'
      : 'pass'
  results.push({ file: rel, verdict, views, findings })
}

const summary = results.reduce((acc, item) => {
  acc[item.verdict] += 1
  return acc
}, { pass: 0, repair_allowed: 0, rewrite_required: 0 })

console.log(JSON.stringify({ baseline, files: results.length, summary, results }, null, 2))
