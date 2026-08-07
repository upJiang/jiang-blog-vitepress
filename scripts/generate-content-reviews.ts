import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { articles, articleFile } from '../.vitepress/content'

const root = process.cwd()
const reviewDir = path.join(root, 'content-reviews')
const reviewPath = path.join(reviewDir, 'reviews.json')

function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function stripCode(value: string): string {
  return value.replace(/(?:```|~~~)[^\n]*\n[\s\S]*?(?:```|~~~)/g, '')
}

function hasAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value))
}

const existingReviews: Record<string, Record<string, unknown>> = fs.existsSync(reviewPath)
  ? JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  : {}
const reviews: Record<string, unknown> = { ...existingReviews }
for (const article of articles) {
  if (article.preserved) continue
  const relative = articleFile(article)
  if (existingReviews[relative]) continue
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const body = matter(source).content
  const prose = stripCode(body)

  // A new entry is only a review placeholder. It is intentionally not
  // approved by this generator; a reader and engineer must fill the checks.
  const hasBoundaries = hasAny(prose, [/边界/, /限制/, /适用/, /不适用/, /下一步/, /排查/])
  if (!hasBoundaries) {
    throw new Error(`${relative} 缺少适用范围、限制或排查边界，不能登记为通过。`)
  }

  // New entries are deliberately unapproved. A human review must fill these
  // fields after reading the article and verifying its practice.
  reviews[relative] = {
    bodyHash: hash(body),
    beginner: false,
    senior: false,
    practiceVerified: false,
    sourcesVerified: false,
    privacyVerified: false,
    beginnerChecks: [],
    seniorChecks: [],
    reviewedAt: new Date().toISOString().slice(0, 10)
  }
}

fs.mkdirSync(reviewDir, { recursive: true })
fs.writeFileSync(reviewPath, `${JSON.stringify(reviews, null, 2)}\n`)
console.log(`已生成 ${Object.keys(reviews).length} 篇非保留文章的双视角审查记录：${reviewPath}`)
