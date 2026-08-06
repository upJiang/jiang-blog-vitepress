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
  const blocks = [...content.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)]
  const executable = blocks.filter((block) => {
    const language = block[1].trim()
    if (language === 'mermaid') return false
    if (language === 'text') return textBlockContainsCode(block[2])
    return true
  })

  if (executable.length > 3) {
    fail(`${relative} 有 ${executable.length} 个可执行代码块，教程正文最多保留 3 个。`)
  }

  let totalLines = 0
  for (const block of executable) {
    const body = block[2].replace(/\n$/, '')
    const lines = body ? body.split('\n').length : 0
    totalLines += lines
    if (lines > 40) fail(`${relative} 存在 ${lines} 行代码块，单个代码块最多 40 行。`)

    const start = block.index ?? 0
    const end = start + block[0].length
    const before = stripNonProse(content.slice(0, start))
    const after = content.slice(end).split(/^#{2,6}\s+/m, 1)[0]

    if (cjkLength(before) < 220) {
      fail(`${relative} 在解释场景、概念和流程前就出现了可执行代码。`)
    }
    if (cjkLength(stripNonProse(after)) < 35) {
      fail(`${relative} 的代码块后缺少输入、关键逻辑、输出或使用原因说明。`)
    }
  }

  if (totalLines > 80) {
    fail(`${relative} 正文共有 ${totalLines} 行可执行代码，最多保留 80 行。`)
  }
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

  for (const block of content.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
    const lines = block[2].split('\n').length
    if (lines > 80) fail(`${relative} 存在 ${lines} 行代码块。`)
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
