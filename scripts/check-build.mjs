import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sitemapFile = path.join(root, '.vitepress/dist/sitemap.xml')
const hostname = 'https://junfeng530.xyz'

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

if (!fs.existsSync(sitemapFile)) {
  console.error('构建检查失败：未生成 sitemap.xml。')
  process.exit(1)
}

const expectedUrls = new Set([`${hostname}/`])

for (const file of walk(path.join(root, 'docs')).filter((item) => item.endsWith('.md'))) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  const route = relative.endsWith('/index.md')
    ? `${relative.slice(0, -'index.md'.length)}`
    : relative.slice(0, -'.md'.length)
  expectedUrls.add(`${hostname}/${route}`)
}

const sitemap = fs.readFileSync(sitemapFile, 'utf8')
const actualUrls = new Set(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
)
const missing = [...expectedUrls].filter((url) => !actualUrls.has(url))
const unexpected = [...actualUrls].filter((url) => !expectedUrls.has(url))

if (actualUrls.size !== expectedUrls.size || missing.length > 0 || unexpected.length > 0) {
  console.error(
    `构建检查失败：期望 ${expectedUrls.size} 个 URL，实际 ${actualUrls.size} 个。`
  )
  for (const url of missing) console.error(`- Sitemap 缺失：${url}`)
  for (const url of unexpected) console.error(`- Sitemap 多余：${url}`)
  process.exit(1)
}

console.log(`构建检查通过：Sitemap 精确包含 ${actualUrls.size} 个公开 URL。`)
