import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articles, articleFile } from '../.vitepress/content'

const root = process.cwd()
const errors: string[] = []
const warnings: string[] = []
const paragraphOwners = new Map<string, string[]>()
const phrasePatterns = [
  ['不是……而是……', /不是[^。！？\n]{0,80}而是/g],
  ['必须', /必须/g],
  ['不能', /不能/g],
  ['真正', /真正/g],
  ['闭环', /闭环/g],
  ['生产级', /生产级/g]
] as const
const phraseTotals = new Map<string, number>()

function fail(message: string): void {
  errors.push(message)
}

function warn(message: string): void {
  warnings.push(message)
}

function stripNonProse(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/!?(\[[^\]]*\])\([^)]*\)/g, '$1')
}

function stripReferenceSections(source: string): string {
  const lines = source.split('\n')
  const kept: string[] = []
  let referenceLevel = 0

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].trim()
      if (/^(参考资料|源码与规范|延伸阅读)$/.test(title)) {
        referenceLevel = level
        continue
      }
      if (referenceLevel > 0 && level <= referenceLevel) referenceLevel = 0
    }
    if (referenceLevel === 0) kept.push(line)
  }

  return kept.join('\n')
}

function normalizeParagraph(value: string): string {
  return value
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*>\d.\s]+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, '')
    .trim()
}

function cjkLength(value: string): number {
  return (value.match(/[\u3400-\u9fff]/g) ?? []).length
}

function textBlockContainsCode(body: string): boolean {
  const codeSignals = [
    /^\s*(?:const|let|var|function|class|async\s+function|import|export)\s+/m,
    /(?:console\.|document\.|window\.|Object\.|Promise\.|Math\.)[A-Za-z_$]/,
    /=>|\b(?:if|for|while|switch|catch)\s*\(/,
    /<[a-z][^>]*>/i,
    /(?:^|\n)\s*[@.#:]?[a-z][^\n{]{0,80}\{\s*\n?\s*[a-z-]+\s*:/i
  ]

  return codeSignals.some((pattern) => pattern.test(body))
}

function checkCodeTeaching(relative: string, content: string): void {
  if (relative.startsWith('docs/frontend/relearn/') || relative.includes('/algorithms/')) return
  const strict = new Set([
    'docs/devops/docker-compose.md',
    'docs/backend/fastapi-layered-architecture.md',
    'docs/agent-practice/01-system-boundaries.md',
    'docs/seo/search-growth-model.md',
  ]).has(relative)
  const blocks = [...content.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)]
  const executable = blocks.filter((block) => {
    const language = block[1].trim()
    if (language === 'mermaid') return false
    if (language === 'text') return textBlockContainsCode(block[2])
    return true
  })

  for (const block of executable) {
    const body = block[2].replace(/\n$/, '')
    const lines = body ? body.split('\n').length : 0

    const start = block.index ?? 0
    const end = start + block[0].length
    const before = stripNonProse(content.slice(0, start))
    const after = content.slice(end).split(/^#{2,6}\s+/m, 1)[0]

    if (cjkLength(before) < 140) {
      if (strict) fail(`${relative} 在解释场景、概念和流程前就出现了可执行代码。`)
      else warn(`${relative} 的代码块前置解释较短，需要人工复查。`)
    }
    if (cjkLength(stripNonProse(after)) < 50) {
      if (strict) fail(`${relative} 的代码块后缺少输入、关键逻辑、输出或使用原因说明。`)
      else warn(`${relative} 的代码块后解释较短，需要人工复查。`)
    }
  }
}

function checkTeachingEvidence(relative: string, content: string): void {
  if (relative.startsWith('docs/frontend/relearn/') || relative.includes('/algorithms/')) return
  const prose = stripReferenceSections(stripNonProse(content))
  const evidence = [
    /本篇|这篇|本文|目标|要解决/,
    /前置|先理解|先认识|需要知道|基础知识|开始前|准备/,
    /场景|例如|假设|问题|现象/,
    /实践|实验|练习|演练|动手|运行|命令|输入|输出|流程|步骤|表格|检查|测试|验证|核对|评审/,
    /边界|限制|适用|不适用|什么时候|采用|下一步|清单/
  ].filter((pattern) => pattern.test(prose)).length
  if (evidence < 4) fail(`${relative} 缺少足够的目标、前置、场景、实践或边界说明（${evidence}/5）。`)
}

function checkLongSections(relative: string, content: string): void {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)]
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]
    const start = (heading.index ?? 0) + heading[0].length
    const end = headings[index + 1]?.index ?? content.length
    const section = content.slice(start, end)
    const proseLength = cjkLength(stripNonProse(section))
    if (proseLength < 900) continue

    const hasStructure =
      /^###\s+/m.test(section) ||
      /^```/m.test(section) ||
      /^\|.+\|\s*$/m.test(section) ||
      /^(?:\d+\.|[-*])\s+/m.test(section)
    if (!hasStructure) {
      fail(`${relative} 的“${heading[1]}”章节较长，但没有步骤、三级标题、代码、表格或列表。`)
    }
  }
}

for (const item of articles) {
  const relative = articleFile(item)
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const content = matter(source).content
  const prose = stripNonProse(stripReferenceSections(content))

  checkLongSections(relative, stripReferenceSections(content))
  checkCodeTeaching(relative, stripReferenceSections(content))
  checkTeachingEvidence(relative, content)

  if (!relative.startsWith('docs/frontend/relearn/') && !relative.includes('/algorithms/')) {
    for (const block of content.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
      if (!block[1].trim()) fail(`${relative} 代码围栏缺少语言标记。`)
    }
  }

  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = normalizeParagraph(paragraph)
    const length = cjkLength(normalized)
    if (length > 350) fail(`${relative} 存在 ${length} 个中文字符的长段落。`)
    if (length < 80 || /^\|/.test(paragraph.trim())) continue
    const owners = paragraphOwners.get(normalized) ?? []
    owners.push(relative)
    paragraphOwners.set(normalized, owners)
  }

  for (const [name, pattern] of phrasePatterns) {
    const count = (prose.match(pattern) ?? []).length
    phraseTotals.set(name, (phraseTotals.get(name) ?? 0) + count)
    if (count > 5) warn(`${relative} 的“${name}”出现 ${count} 次，需要人工复查语气。`)
  }

  if (item.category === 'agent-practice') {
    const forbiddenCurrentClaims = [
      /\bKnowledgeAgent\b/,
      /\bTurnEnvelope\b/,
      /await\s+outbox\.publish/,
      /class\s+MutationResult/,
      /写工具需要.*审批/
    ]
    for (const pattern of forbiddenCurrentClaims) {
      if (pattern.test(content)) fail(`${relative} 仍包含未实现能力或占位模型：${pattern}`)
    }
  }
}

for (const [paragraph, owners] of paragraphOwners) {
  const uniqueOwners = [...new Set(owners)]
  if (uniqueOwners.length > 1) {
    fail(`跨文章重复长段落：${uniqueOwners.join(', ')} -> ${paragraph.slice(0, 72)}…`)
  }
}

console.log('模板句式密度：')
for (const [name] of phrasePatterns) console.log(`- ${name}: ${phraseTotals.get(name) ?? 0}`)

if (warnings.length > 0) {
  console.warn(`内容质量警告，共 ${warnings.length} 项：`)
  for (const message of warnings) console.warn(`- ${message}`)
}

if (errors.length > 0) {
  console.error(`内容质量检查失败，共 ${errors.length} 项：`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log(`内容质量检查通过：${articles.length} 篇文章未发现长段落、重复正文或 Agent 虚构能力。`)
