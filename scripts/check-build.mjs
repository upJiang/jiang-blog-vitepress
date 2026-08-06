import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const sitemapFile = path.join(root, '.vitepress/dist/sitemap.xml')
const cleanUrlInstallerFile = path.join(root, 'deploy/install-nginx-clean-urls.sh')
const workflowFile = path.join(root, '.github/workflows/main.yml')
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

if (!fs.existsSync(cleanUrlInstallerFile)) {
  console.error('构建检查失败：缺少 VitePress clean URL 的 Nginx 安装脚本。')
  process.exit(1)
}

const installerSyntax = spawnSync('bash', ['-n', cleanUrlInstallerFile], { encoding: 'utf8' })
if (installerSyntax.status !== 0) {
  console.error(`构建检查失败：Nginx 安装脚本语法错误。\n${installerSyntax.stderr}`)
  process.exit(1)
}

const cleanUrlInstaller = fs.readFileSync(cleanUrlInstallerFile, 'utf8')
const installerRequirements = [
  /\/www\/server\/nginx\/conf\/nginx\.conf/,
  /try_files \$uri \$uri\.html \$uri\/ =404;/,
  /nginx -t/,
  /nginx -s reload/,
  /restore_config/,
  /--resolve 'junfeng530\.xyz:443:127\.0\.0\.1'/,
  /\/docs\/agent-practice\/01-system-boundaries/,
]

if (installerRequirements.some((pattern) => !pattern.test(cleanUrlInstaller))) {
  console.error('构建检查失败：Nginx clean URL 安装脚本缺少验证或回滚步骤。')
  process.exit(1)
}

if (!fs.existsSync(workflowFile)) {
  console.error('构建检查失败：缺少自动部署工作流。')
  process.exit(1)
}

const workflow = fs.readFileSync(workflowFile, 'utf8')
const workflowRequirements = [
  /push:\s*\n\s+branches: \[main\]/,
  /SOURCE: deploy\//,
  /install-nginx-clean-urls\.sh/,
  /DEPLOY_NGINX_CONFIG_PATH/,
  /\/www\/server\/nginx\/conf\/nginx\.conf/,
]

if (workflowRequirements.some((pattern) => !pattern.test(workflow))) {
  console.error('构建检查失败：自动部署没有安装生效站点的 clean URL 规则。')
  process.exit(1)
}

const expectedUrls = new Set([`${hostname}/`])

for (const file of walk(path.join(root, 'docs')).filter((item) => item.endsWith('.md'))) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  const route = relative.endsWith('/index.md')
    ? `${relative.slice(0, -'index.md'.length)}`
    : relative.slice(0, -'.md'.length)
  expectedUrls.add(`${hostname}/${route}`)

  const builtFile = path.join(
    root,
    '.vitepress/dist',
    relative.endsWith('/index.md')
      ? `${relative.slice(0, -'index.md'.length)}index.html`
      : `${relative.slice(0, -'.md'.length)}.html`
  )
  if (!fs.existsSync(builtFile)) {
    console.error(`构建检查失败：clean URL 没有对应产物：${route}`)
    process.exit(1)
  }
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
