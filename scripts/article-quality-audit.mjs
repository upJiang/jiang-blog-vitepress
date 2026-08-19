import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const baseline = 'docs/ai-agent/llm-workflow-rag-agent.md'
const maxParagraphChars = 240

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

function isStructuralLine(line) {
  return /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|\||:::|>|<!--|<[^>]|!\[)/.test(line)
}

function collectParagraphs(source) {
  const paragraphs = []
  let inFence = false
  let buffer = []
  let startLine = 1

  const flush = () => {
    const text = buffer.join('\n').trim()
    if (text) {
      paragraphs.push({ text, startLine })
    }
    buffer = []
  }

  source.split('\n').forEach((line, index) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      flush()
      inFence = !inFence
      startLine = index + 2
      return
    }
    if (inFence || !line.trim() || isStructuralLine(line)) {
      flush()
      startLine = index + 2
      return
    }
    if (!buffer.length) startLine = index + 1
    buffer.push(line)
  })
  flush()
  return paragraphs
}

function collectHeadings(source) {
  const headings = []
  let inFence = false
  source.split('\n').forEach((line, index) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (match) headings.push({ level: match[1].length, text: match[2], line: index + 1 })
  })
  return headings
}

function routeFromMarkdownLink(link) {
  const clean = link.split('#')[0].split('?')[0]
  if (!clean.startsWith('/docs/')) return null
  return clean.replace(/\/$/, '') || '/docs'
}

function routeExists(route) {
  const relativeRoute = route.replace(/^\//, '')
  return fs.existsSync(path.join(root, `${relativeRoute}.md`)) ||
    fs.existsSync(path.join(root, relativeRoute, 'index.md'))
}

const files = walk(docsRoot)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !file.endsWith(`${path.sep}index.md`))
  .filter((file) => relative(file) !== baseline)

const duplicateParagraphs = new Map()
const report = []

for (const file of files) {
  const rel = relative(file)
  const raw = fs.readFileSync(file, 'utf8')
  const source = stripFrontmatter(raw)
  const headings = collectHeadings(source)
  const paragraphs = collectParagraphs(source)
  const issues = []

  const h1 = headings.filter((heading) => heading.level === 1)
  if (h1.length !== 1) issues.push(`h1_count:${h1.length}`)

  let previousLevel = 1
  for (const heading of headings) {
    if (heading.level > previousLevel + 1) {
      issues.push(`heading_jump:${heading.line}:h${previousLevel}->h${heading.level}`)
    }
    previousLevel = heading.level
  }

  const fenceCount = (source.match(/^\s*(?:```|~~~)/gm) || []).length
  if (fenceCount % 2 !== 0) issues.push('unclosed_fence')

  for (const paragraph of paragraphs) {
    const normalized = paragraph.text.replace(/\s+/g, ' ')
    if (normalized.length > maxParagraphChars) {
      issues.push(`long_paragraph:${paragraph.startLine}:${normalized.length}`)
    }
    if (normalized.length >= 100) {
      const entries = duplicateParagraphs.get(normalized) ?? []
      entries.push(`${rel}:${paragraph.startLine}`)
      duplicateParagraphs.set(normalized, entries)
    }
  }

  for (const match of source.matchAll(/\]\((\/docs\/[^)\s#?]+(?:#[^)]*)?)\)/g)) {
    const route = routeFromMarkdownLink(match[1])
    if (route && !routeExists(route)) issues.push(`broken_route:${route}`)
  }

  if (/^##\s+(机制复核|迁移复核|证据复核)：/m.test(source)) {
    issues.push('template_review_heading')
  }

  if (issues.length) report.push({ file: rel, issues })
}

const duplicateGroups = [...duplicateParagraphs.entries()]
  .filter(([, locations]) => locations.length > 1)
  .map(([text, locations]) => ({ text: text.slice(0, 180), locations }))

const result = {
  baseline,
  files: files.length,
  maxParagraphChars,
  issueFiles: report.length,
  issues: report,
  duplicateGroups,
}

console.log(JSON.stringify(result, null, 2))

if (report.some((item) => item.issues.some((issue) => issue.startsWith('broken_route:') || issue === 'unclosed_fence'))) {
  process.exitCode = 1
}
