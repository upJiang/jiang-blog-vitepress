import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articleFile, articles } from '../.vitepress/content'

type Review = {
  path: string
  slug: string
  chapter: number
  bodySha256: string
  sources: Array<{ url: string; checkedAt: string }>
  beginnerReview: { status: string; note: string }
  seniorReview: { status: string; note: string }
  privacyReview: { status: string; note: string }
  visualReview: {
    status: string
    asset: string
    model: string
    promptSummary: string
    note: string
  }
}

const root = process.cwd()
const errors: string[] = []
const fail = (message: string): void => errors.push(message)
const devopsArticles = articles.filter((article) => article.category === 'devops')
const reviewFile = path.join(root, 'content-reviews', 'reviews.json')

if (devopsArticles.length !== 37) fail(`AI Infra 应登记 37 篇，实际为 ${devopsArticles.length} 篇。`)

const reviews = fs.existsSync(reviewFile)
  ? (JSON.parse(fs.readFileSync(reviewFile, 'utf8')).reviews as Review[])
  : []
const reviewBySlug = new Map(reviews.map((review) => [review.slug, review]))

if (reviews.length !== 37) fail(`AI Infra 审查记录应为 37 条，实际为 ${reviews.length} 条。`)

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function codeFences(content: string): Array<{ before: string; after: string }> {
  const lines = content.split('\n')
  const fences: Array<{ before: string; after: string }> = []
  let start = -1

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^```\S+/.test(lines[index]) && !/^~~~\S+/.test(lines[index])) continue
    start = index
    const marker = lines[index].slice(0, 3)
    let end = index + 1
    while (end < lines.length && !lines[end].startsWith(marker)) end += 1
    const before = lines.slice(Math.max(0, start - 4), start).join('\n').trim()
    const after = lines.slice(end + 1, end + 6).join('\n').trim()
    fences.push({ before, after })
    index = end
  }

  return fences
}

for (const [index, article] of devopsArticles.entries()) {
  const expectedChapter = index + 1
  if (article.chapter !== expectedChapter) fail(`${article.slug} 章节号应为 ${expectedChapter}。`)

  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    fail(`缺少文章：${relative}`)
    continue
  }

  const parsed = matter(fs.readFileSync(absolute, 'utf8'))
  const body = parsed.content
  if (body.match(/^#\s+(.+)$/m)?.[1] !== article.title) fail(`${relative} 的 H1 与登记标题不一致。`)
  if (!body.includes('| 概念 | 在这条链路中的含义 |')) fail(`${relative} 缺少定义与反定义。`)
  if (!body.includes('| 表面现象 | 实际可能发生的事 | 下一步证据 |')) fail(`${relative} 缺少误判与证据表。`)
  if (!body.includes('```mermaid')) fail(`${relative} 缺少确定性的机制图。`)

  const hasVisual = body.includes('```mermaid') || body.includes('<InfraFigure ') || body.includes('<figure class="doc-shot">')
  if (!hasVisual) fail(`${relative} 缺少可回读的机制图或官方文档截图。`)

  for (const [fenceIndex, fence] of codeFences(body).entries()) {
    if (!fence.before || !fence.after) fail(`${relative} 的第 ${fenceIndex + 1} 个代码/配置块缺少前置场景或结果解释。`)
  }

  const review = reviewBySlug.get(article.slug)
  if (!review) {
    fail(`${relative} 缺少审查记录。`)
    continue
  }
  if (review.path !== relative || review.chapter !== article.chapter) fail(`${relative} 的审查路径或章节号不一致。`)
  if (review.bodySha256 !== sha256(body)) fail(`${relative} 的正文哈希未更新。`)
  if (!review.sources.length || review.sources.some((source) => !source.url.startsWith('https://') || !/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt))) {
    fail(`${relative} 的来源或核对日期不完整。`)
  }
  for (const key of ['beginnerReview', 'seniorReview', 'privacyReview'] as const) {
    if (review[key].status !== 'pass' || review[key].note.length < 30) fail(`${relative} 的 ${key} 未完成。`)
  }
  if (review.visualReview.model === 'mermaid') {
    if (!body.includes('```mermaid')) fail(`${relative} 的视觉审查标记为 Mermaid，但正文没有 Mermaid 机制图。`)
  } else if (review.visualReview.model === 'gpt-image-2') {
    const imageAbsolute = path.join(root, review.visualReview.asset)
    if (!fs.existsSync(imageAbsolute)) {
      fail(`${relative} 缺少 gpt-image-2 图片：${review.visualReview.asset}（${review.visualReview.status}）。`)
    } else if (fs.statSync(imageAbsolute).size < 100_000) {
      fail(`${review.visualReview.asset} 文件过小，需人工确认不是占位图。`)
    }
  } else {
    fail(`${relative} 的视觉审查必须使用 Mermaid 或 gpt-image-2。`)
  }
}

for (const field of ['beginnerReview', 'seniorReview', 'privacyReview'] as const) {
  const notes = reviews.map((review) => review[field].note)
  if (new Set(notes).size !== notes.length) fail(`${field} 存在跨文章重复审查文案。`)
}

if (errors.length) {
  console.error(`AI Infra 内容门禁失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('AI Infra 内容门禁通过：37 篇正文、来源、哈希、机制图与双视角审查均完整。')
