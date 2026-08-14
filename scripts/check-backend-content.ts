import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  articles,
  articleFile,
  articlePath,
  sectionStages
} from '../.vitepress/content'
import { removedBackendRoutes } from '../.vitepress/removed-backend-routes'

const root = process.cwd()
const errors: string[] = []
const backend = articles.filter((article) => article.category === 'backend')
const fail = (message: string): void => errors.push(message)

if (backend.length !== 68) fail(`后端文章应为 68 篇，实际为 ${backend.length} 篇。`)

const routes = new Set(backend.map(articlePath))
for (const removed of removedBackendRoutes) {
  if (routes.has(removed)) fail(`废弃路由重新进入后端清单：${removed}`)
  if (fs.existsSync(path.join(root, `${removed.slice(1)}.md`))) {
    fail(`废弃路由仍有 Markdown：${removed}`)
  }
}

const validStages = new Set(sectionStages.backend.map((stage) => stage.key))
for (const [index, article] of backend.entries()) {
  const relative = articleFile(article)
  const absolute = path.join(root, relative)

  if (article.chapter !== index + 1) fail(`${article.slug} 的章节编号不连续。`)
  if (!validStages.has(article.stageKey)) fail(`${article.slug} 的 stageKey 未登记：${article.stageKey}`)
  if (!fs.existsSync(absolute)) {
    fail(`后端正文不存在：${relative}`)
    continue
  }

  const parsed = matter(fs.readFileSync(absolute, 'utf8'))
  if (parsed.data.title !== article.title) fail(`${relative} 的标题与清单不一致。`)
  if (parsed.data.chapter !== article.chapter) fail(`${relative} 的章节编号与清单不一致。`)
  if (parsed.data.part !== article.part) fail(`${relative} 的分组与清单不一致。`)
}

for (const stage of sectionStages.backend) {
  if (!backend.some((article) => article.stageKey === stage.key)) {
    fail(`后端阶段没有文章：${stage.label}`)
  }
}

if (errors.length > 0) {
  console.error(`后端内容检查失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`后端内容检查通过：68 篇正文、阶段映射、章节元数据和 ${removedBackendRoutes.length} 个废弃路由均一致。`)
