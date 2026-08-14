import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articles, articleFile } from '../.vitepress/content'

const root = process.cwd()
const errors: string[] = []
const paragraphOwners = new Map<string, string[]>()
const fail = (message: string): void => errors.push(message)

function sha256(source: Buffer | string): string {
  return crypto.createHash('sha256').update(source).digest('hex')
}

function stripCode(source: string): string {
  return source.replace(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g, '')
}

function cjkLength(value: string): number {
  return (value.match(/[\u3400-\u9fff]/g) ?? []).length
}

function normalizeParagraph(value: string): string {
  return value
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*>\d.\s]+/, '')
    .replace(/\s+/g, '')
    .trim()
}

function checkCodeFences(relative: string, content: string): void {
  const lines = content.split('\n')
  let activeFence: string | null = null

  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (!match) continue

    const marker = match[1][0]
    if (activeFence === null) {
      activeFence = marker
      if (!match[2].trim()) fail(`${relative}:${index + 1} 的代码围栏缺少语言标记。`)
      continue
    }

    if (activeFence === marker && !match[2].trim()) activeFence = null
  }

  if (activeFence !== null) fail(`${relative} 的代码围栏没有成对闭合。`)
}

function checkHeadingStructure(relative: string, content: string): void {
  const headings = stripCode(content)
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+\S/)
      return match ? { level: match[1].length, line: index + 1 } : null
    })
    .filter((heading): heading is { level: number; line: number } => Boolean(heading))

  const h1Count = headings.filter((heading) => heading.level === 1).length
  if (h1Count !== 1) fail(`${relative} 必须且只能有一个一级标题，实际为 ${h1Count} 个。`)
  if (headings[0]?.level !== 1) fail(`${relative} 的标题树必须从一级标题开始。`)

  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1]
    const current = headings[index]
    if (current.level > previous.level + 1) {
      fail(`${relative}:${current.line} 的标题从 H${previous.level} 跳到了 H${current.level}。`)
    }
  }
}

function checkTemplateResidue(relative: string, source: string): void {
  const prose = stripCode(matter(source).content)
  const patterns = [
    { pattern: /^#{2,6}\s+参考资料(?:\s|$)/m, reason: '独立参考资料章节' },
    { pattern: /^#{2,6}\s+.*(?:本文|本篇)产物/m, reason: '本文/本篇产物模板标题' },
    { pattern: /(?:本文|本篇)产物(?:是|为|：|:)/, reason: '本文/本篇产物模板句' },
    { pattern: /(?:开始前可以了解|读完可以带走)/, reason: '顶部阅读卡文案' },
    { pattern: /更新于\s*[：:]/, reason: '可见更新时间' },
    { pattern: /希望这对(?:您|你)有帮助/, reason: '聊天式收尾' },
    { pattern: /(?:当然！|您说得完全正确|请告诉我)/, reason: '协作对话残留' }
  ]

  for (const { pattern, reason } of patterns) {
    if (pattern.test(prose)) fail(`${relative} 仍包含${reason}。`)
  }
}

for (const article of articles) {
  if (article.contentLocked) continue

  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) continue

  const source = fs.readFileSync(absolute, 'utf8')
  const body = matter(source).content
  checkCodeFences(relative, body)
  checkHeadingStructure(relative, body)
  checkTemplateResidue(relative, source)

  const prose = stripCode(body)
  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = normalizeParagraph(paragraph)
    if (cjkLength(normalized) < 80 || /^\|/.test(paragraph.trim())) continue
    const owners = paragraphOwners.get(normalized) ?? []
    owners.push(relative)
    paragraphOwners.set(normalized, owners)
  }
}

for (const [paragraph, owners] of paragraphOwners) {
  const unique = [...new Set(owners)]
  if (unique.length > 1) {
    fail(`跨文章重复长段落：${unique.join(', ')} -> ${paragraph.slice(0, 72)}...`)
  }
}

type ContentLock = {
  algorithm: 'sha256'
  files: Record<string, string>
}

const contentLockFile = path.join(root, '.vitepress', 'content-lock.json')
if (!fs.existsSync(contentLockFile)) {
  fail('缺少 .vitepress/content-lock.json，算法与重学前端没有独立内容锁。')
} else {
  const contentLock = JSON.parse(fs.readFileSync(contentLockFile, 'utf8')) as ContentLock
  if (contentLock.algorithm !== 'sha256') fail('内容锁算法必须为 sha256。')

  const expectedFiles = new Set([
    'docs/algorithms/index.md',
    ...articles.filter((article) => article.contentLocked).map(articleFile)
  ])
  const actualFiles = new Set(Object.keys(contentLock.files))

  for (const relative of expectedFiles) {
    if (!actualFiles.has(relative)) {
      fail(`内容锁缺少文件：${relative}`)
      continue
    }

    const absolute = path.join(root, relative)
    if (!fs.existsSync(absolute)) {
      fail(`内容锁文件不存在：${relative}`)
      continue
    }

    const actualHash = sha256(fs.readFileSync(absolute))
    if (contentLock.files[relative] !== actualHash) fail(`${relative} 的锁定内容已变化。`)
  }

  for (const relative of actualFiles) {
    if (!expectedFiles.has(relative)) fail(`内容锁包含未登记文件：${relative}`)
  }
}

if (errors.length) {
  console.error(`内容质量检查失败，共 ${errors.length} 项：`)
  errors.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}

const lockedCount = articles.filter((article) => article.contentLocked).length
console.log(`内容质量检查通过：${articles.length - lockedCount} 篇可编辑文章通过结构、模板、围栏与重复检查，${lockedCount + 1} 个文件通过内容锁。`)
