import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const baseline = 'docs/ai-agent/llm-workflow-rag-agent.md'
const maxParagraphChars = 240
const maxHeadingChars = 80

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
    if (text) paragraphs.push({ text, startLine })
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

function collectBlocks(source) {
  const blocks = []
  const lines = source.split('\n')
  let start = null
  let fence = null
  lines.forEach((line, index) => {
    const opening = /^\s*(```|~~~)(.*)$/.exec(line)
    if (opening && !fence) {
      fence = opening[1]
      start = index
      return
    }
    if (fence && line.trim().startsWith(fence)) {
      blocks.push({ type: lines[start].toLowerCase().includes('mermaid') ? 'mermaid' : 'code', startLine: start + 1, endLine: index + 1 })
      fence = null
      start = null
    }
  })
  return { blocks, unclosed: Boolean(fence) }
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

function surroundingProse(lines, start, end) {
  const before = lines.slice(0, start).reverse().find((line) => line.trim() && !isStructuralLine(line))
  const after = lines.slice(end + 1).find((line) => line.trim() && !isStructuralLine(line))
  return { before, after }
}

function tableIssues(lines) {
  const issues = []
  let index = 0
  while (index < lines.length) {
    if (!/^\s*\|/.test(lines[index])) {
      index += 1
      continue
    }
    const start = index
    while (index < lines.length && /^\s*\|/.test(lines[index])) index += 1
    const end = index - 1
    const table = lines.slice(start, end + 1)
    const hasSeparator = table.some((line) => /^\s*\|?\s*:?-{3,}/.test(line))
    if (!hasSeparator) continue
    const longCell = table.some((line) => line.split('|').some((cell) => cell.trim().length > 80))
    if (longCell) issues.push(`table_long_cell:${start + 1}`)
    const context = surroundingProse(lines, start, end)
    if (!context.before) issues.push(`table_missing_before_explanation:${start + 1}`)
    if (!context.after) issues.push(`table_missing_after_explanation:${start + 1}`)
  }
  return issues
}

const files = walk(docsRoot)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !file.endsWith(`${path.sep}index.md`))
  .filter((file) => relative(file) !== baseline)

const duplicateParagraphs = new Map()
const report = []
const repeatedEndings = new Map()

for (const file of files) {
  const rel = relative(file)
  const source = stripFrontmatter(fs.readFileSync(file, 'utf8'))
  const lines = source.split('\n')
  const headings = collectHeadings(source)
  const paragraphs = collectParagraphs(source)
  const { blocks, unclosed } = collectBlocks(source)
  const issues = []

  const h1 = headings.filter((heading) => heading.level === 1)
  if (h1.length !== 1) issues.push(`h1_count:${h1.length}`)

  let previousLevel = 1
  for (const heading of headings) {
    if (heading.level > previousLevel + 1) issues.push(`heading_jump:${heading.line}:h${previousLevel}->h${heading.level}`)
    if (heading.text.length > maxHeadingChars || (heading.text.match(/[\u3400-\u9fff]/g) || []).length > 36) {
      issues.push(`heading_too_long:${heading.line}:${heading.text.length}`)
    }
    previousLevel = heading.level
  }

  if (unclosed) issues.push('unclosed_fence')

  for (const paragraph of paragraphs) {
    const normalized = paragraph.text.replace(/\s+/g, ' ')
    if (normalized.length > maxParagraphChars) issues.push(`long_paragraph:${paragraph.startLine}:${normalized.length}`)
    if (normalized.length >= 100) {
      const entries = duplicateParagraphs.get(normalized) ?? []
      entries.push(`${rel}:${paragraph.startLine}`)
      duplicateParagraphs.set(normalized, entries)
    }
  }

  let inFence = false
  for (const [index, line] of lines.entries()) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if ((line.match(/\*\*/g) || []).length % 2 !== 0) issues.push(`unmatched_bold_marker:${index + 1}`)
    if (/\*\*[^*]+\*\*[\u3400-\u9fff]/.test(line)) issues.push(`bold_without_following_space:${index + 1}`)
    if (/\baccess_request:\d+:[A-Za-z0-9_-]+\b|\bpolicy:[A-Za-z0-9_-]+:v\d+\b|\bctx-\d+\b/.test(line)) {
      issues.push(`unproven_engineering_id:${index + 1}`)
    }
  }

  for (const block of blocks) {
    const context = surroundingProse(lines, block.startLine - 1, block.endLine - 1)
    if (!context.before) issues.push(`block_missing_before_explanation:${block.startLine}`)
    if (!context.after) issues.push(`block_missing_after_explanation:${block.endLine}`)
  }

  issues.push(...tableIssues(lines))

  for (const match of source.matchAll(/\]\((\/docs\/[^)\s#?]+(?:#[^)]*)?)\)/g)) {
    const route = routeFromMarkdownLink(match[1])
    if (route && !routeExists(route)) issues.push(`broken_route:${route}`)
  }

  if (/^##\s+(机制复核|迁移复核|证据复核)：/m.test(source)) issues.push('template_review_heading')
  if (/下一篇(?:将|会|继续)从|本文(?:到这里|就完成了)/.test(source)) issues.push('mechanical_closing_phrase')

  const finalParagraph = paragraphs.at(-1)?.text.replace(/\s+/g, ' ')
  if (finalParagraph && finalParagraph.length >= 80) {
    const entries = repeatedEndings.get(finalParagraph) ?? []
    entries.push(`${rel}:${paragraphs.at(-1).startLine}`)
    repeatedEndings.set(finalParagraph, entries)
  }

  if (issues.length) report.push({ file: rel, issues })
}

const duplicateGroups = [...duplicateParagraphs.entries()]
  .filter(([, locations]) => locations.length > 1)
  .map(([text, locations]) => ({ text: text.slice(0, 180), locations }))
const endingGroups = [...repeatedEndings.entries()]
  .filter(([, locations]) => locations.length > 1)
  .map(([text, locations]) => ({ text: text.slice(0, 180), locations }))

console.log(JSON.stringify({
  kind: 'format-structure-gate',
  semanticAssessment: 'not_assessed',
  baseline,
  files: files.length,
  maxParagraphChars,
  maxHeadingChars,
  issueFiles: report.length,
  issues: report,
  duplicateGroups,
  repeatedEndingGroups: endingGroups,
  note: '本报告只检查格式、结构、链接和可见排版风险，不能证明标题兑现、概念关系、论证深度、案例贯穿或结尾闭环。'
}, null, 2))

if (report.length > 0) process.exitCode = 1
