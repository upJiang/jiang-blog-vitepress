import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articleFile, articles } from '../.vitepress/content'

const root = process.cwd()
const errors: string[] = []
const devopsArticles = articles.filter((article) => article.category === 'devops')

const fail = (message: string): void => errors.push(message)

function codeFences(content: string): Array<{ before: string; after: string }> {
  const lines = content.split('\n')
  const fences: Array<{ before: string; after: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^(```|~~~)\S*/.test(lines[index])) continue
    const marker = lines[index].slice(0, 3)
    let end = index + 1
    while (end < lines.length && !lines[end].startsWith(marker)) end += 1
    const before = lines.slice(Math.max(0, index - 4), index).join('\n').trim()
    const after = lines.slice(end + 1, end + 6).join('\n').trim()
    fences.push({ before, after })
    index = end
  }

  return fences
}

function headingLevels(body: string): number[] {
  return [...body.matchAll(/^(#{1,6})\s+/gm)].map((match) => match[1].length)
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

  const body = matter(fs.readFileSync(absolute, 'utf8')).content
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (h1 !== article.title) fail(`${relative} 的 H1 与登记标题不一致。`)
  if (!/^##\s+.+/m.test(body)) fail(`${relative} 缺少按知识块组织的二级标题。`)

  const opening = body.slice(0, 1800)
  if (!/(?:是|指|表示|负责|用于|解决)/.test(opening)) {
    fail(`${relative} 开头没有说明主题定义、职责或用途。`)
  }

  const aids = [
    /```mermaid/.test(body),
    /<figure\b|<img\b|<InfraFigure\b/.test(body),
    /^\|.+\|$/m.test(body),
    /^:::/m.test(body),
    /^```(?:bash|shell|sh|python|typescript|ts|js|json|yaml|sql|nginx|text)/m.test(body),
    /^(?:[-*]|\d+\.)\s+/m.test(body),
  ].filter(Boolean).length
  if (aids < 2) fail(`${relative} 缺少至少两种帮助读者理解的排版材料（代码、表格、信息块、列表、图或截图）。`)

  const levels = headingLevels(body.replace(/```[\s\S]*?```/g, ''))
  if (levels.filter((level) => level === 1).length !== 1) fail(`${relative} 必须只有一个 H1。`)
  for (let levelIndex = 1; levelIndex < levels.length; levelIndex += 1) {
    if (levels[levelIndex] - levels[levelIndex - 1] > 1) {
      fail(`${relative} 标题层级从 H${levels[levelIndex - 1]} 跳到 H${levels[levelIndex]}。`)
    }
  }

  const fenceCount = (body.match(/^```/gm) ?? []).length
  if (fenceCount % 2 !== 0) fail(`${relative} 代码围栏没有成对闭合。`)
  for (const [fenceIndex, fence] of codeFences(body).entries()) {
    if (!fence.before || !fence.after) {
      fail(`${relative} 的第 ${fenceIndex + 1} 个代码/配置块缺少前置场景或结果解释。`)
    }
  }

  if (/^##\s+(?:参考资料|本文产物|本篇产物)/m.test(body)) {
    fail(`${relative} 仍有独立模板章节，应把来源和交付条件放回对应知识块。`)
  }
}

if (errors.length) {
  console.error(`AI Infra 内容门禁失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`AI Infra 内容门禁通过：${devopsArticles.length} 篇正文完成定义、标题、排版材料、代码围栏与模板清理检查。`)
