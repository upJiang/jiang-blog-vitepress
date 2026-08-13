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

const existingReviews: Record<string, Record<string, unknown>> = fs.existsSync(reviewPath)
  ? JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  : {}
const reviews: Record<string, unknown> = {}

for (const article of articles) {
  if (article.preserved) continue
  const relative = articleFile(article)
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const body = matter(source).content
  const existing = existingReviews[relative] ?? {}
  reviews[relative] = {
    ...existing,
    bodyHash: hash(body),
    beginnerReviewed: existing.beginnerReviewed ?? false,
    technicalReviewed: existing.technicalReviewed ?? false,
    factsVerified: existing.factsVerified ?? false,
    examplesVerified: existing.examplesVerified ?? false,
    privacyVerified: existing.privacyVerified ?? false,
    continuityReviewed: existing.continuityReviewed ?? false,
    voiceReviewed: existing.voiceReviewed ?? false,
    reviewedAt: new Date().toISOString().slice(0, 10)
  }
}

fs.mkdirSync(reviewDir, { recursive: true })
fs.writeFileSync(reviewPath, `${JSON.stringify(reviews, null, 2)}\n`)
console.log(`已生成 ${Object.keys(reviews).length} 篇非保留文章的文章级审校记录：${reviewPath}`)
