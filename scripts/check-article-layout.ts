import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articleFile, articles } from '../.vitepress/content'

const root = process.cwd()
const errors: string[] = []

function stripNonProse(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/^<<<.*$/gm, '')
    .replace(/<figure[\s\S]*?<\/figure>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^\|.*$/gm, '')
    .replace(/^:::[\s\S]*?^:::\s*$/gm, '')
}

function proseLength(markdown: string): number {
  return (stripNonProse(markdown).match(/[\u3400-\u9fff]/g) ?? []).length
}

function readingAids(markdown: string): number {
  return [
    /(?:```|~~~)mermaid/.test(markdown),
    /^(?:```|~~~)(?:bash|shell|sh|python|typescript|ts|js|json|jsonc|yaml|sql|nginx|text|css|html|vue|tsx|jsx)/m.test(markdown),
    /^<<<\s+/m.test(markdown),
    /^\|.+\|$/m.test(markdown),
    /^:::/m.test(markdown),
    /<figure\b|<img\b|<InfraFigure\b|<OnnxVisionLab\b/.test(markdown),
    /^(?:[-*]|\d+\.)\s+/m.test(markdown),
  ].filter(Boolean).length
}

for (const article of articles.filter((item) => !item.contentLocked)) {
  const relative = articleFile(article)
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) continue

  const body = matter(fs.readFileSync(absolute, 'utf8')).content
  if (readingAids(body) < 2) {
    errors.push(`${relative} 缺少至少两种阅读辅助材料，页面容易退化成连续纯文本。`)
  }

  const prose = stripNonProse(body)
  for (const paragraph of prose.split(/\n\s*\n/)) {
    const normalized = paragraph
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/^(?:[-*]|\d+\.|>)\s+/gm, '')
      .replace(/\[[^\]]+\]\([^)]*\)/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\s+/g, '')
    if ([...normalized].length > 520) {
      errors.push(`${relative} 存在超过 520 字符的连续段落，应拆分论点或加入结构化表达。`)
      break
    }
  }

  for (const section of body.split(/(?=^##\s+)/m)) {
    const heading = section.match(/^##\s+(.+)$/m)?.[1]
    if (!heading || proseLength(section) < 900) continue
    if (readingAids(section) === 0) {
      errors.push(`${relative} 的“${heading}”连续文字过密，缺少代码、列表、表格、信息块或图示。`)
    }
  }
}

if (errors.length) {
  console.error(`全站排版检查失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`全站排版检查通过：${articles.filter((article) => !article.contentLocked).length} 篇可编辑正文均有阅读辅助材料，未发现超长段落或无结构的高密度章节。`)
