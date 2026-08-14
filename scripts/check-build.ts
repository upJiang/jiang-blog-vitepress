import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { draftArticleFiles } from '../.vitepress/drafts'
import { removedBackendRoutes } from '../.vitepress/removed-backend-routes'

const root = process.cwd()
const sitemapFile = path.join(root, '.vitepress/dist/sitemap.xml')
const cleanUrlInstallerFile = path.join(root, 'deploy/install-nginx-clean-urls.sh')
const workflowFile = path.join(root, '.github/workflows/main.yml')
const hostname = 'https://junfeng530.xyz'

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

function fail(message: string): never {
  console.error(`构建检查失败：${message}`)
  process.exit(1)
}

if (!fs.existsSync(sitemapFile)) fail('未生成 sitemap.xml。')
if (!fs.existsSync(cleanUrlInstallerFile)) fail('缺少 VitePress clean URL 的 Nginx 安装脚本。')

const installerSyntax = spawnSync('bash', ['-n', cleanUrlInstallerFile], { encoding: 'utf8' })
if (installerSyntax.status !== 0) {
  fail(`Nginx 安装脚本语法错误。\n${installerSyntax.stderr}`)
}

const cleanUrlInstaller = fs.readFileSync(cleanUrlInstallerFile, 'utf8')
const installerRequirements = [
  /\/www\/server\/nginx\/conf\/nginx\.conf/,
  /try_files \$uri \$uri\.html \$uri\/ =404;/,
  /nginx -t/,
  /nginx -s reload/,
  /restore_config/,
  /--resolve 'junfeng530\.xyz:443:127\.0\.0\.1'/,
  /\/docs\/ai-agent\/agent-request-lifecycle-runtime/,
  /rewrite \^\/docs\/frontend\/algorithms\/\(\[\^\/\.\]\+\).*\/docs\/algorithms\/\$1 permanent;/
]
if (installerRequirements.some((pattern) => !pattern.test(cleanUrlInstaller))) {
  fail('Nginx clean URL 安装脚本缺少验证或回滚步骤。')
}

if (!fs.existsSync(workflowFile)) fail('缺少自动部署工作流。')
const workflow = fs.readFileSync(workflowFile, 'utf8')
const workflowRequirements = [
  /push:\s*\n\s+branches: \[main\]/,
  /SOURCE: deploy\//,
  /install-nginx-clean-urls\.sh/,
  /DEPLOY_NGINX_CONFIG_PATH/,
  /\/www\/server\/nginx\/conf\/nginx\.conf/
]
if (workflowRequirements.some((pattern) => !pattern.test(workflow))) {
  fail('自动部署没有安装生效站点的 clean URL 规则。')
}

const expectedUrls = new Set([`${hostname}/`])
const removedRoutes = [
  '/docs/agent-practice/01-system-boundaries',
  '/docs/architecture/ai-system-seven-layers',
  '/docs/engineering/systematic-debugging',
  '/docs/ai-practice/codex-claude-code-rules',
  '/docs/backend/fastapi-layered-architecture',
  ...removedBackendRoutes,
  '/docs/frontend/typescript-engineering'
]
const legacyAlgorithmSlugs = [
  'dataStructures', 'complexity', 'array', 'string', 'stack', 'queue', 'chain',
  'chainHead', 'chainCicle', 'sort', 'tree', 'ergodicTree', 'bstTree', 'DFS',
  'thinking', 'dynamic'
]

const draftSet = new Set<string>(draftArticleFiles)
for (const file of walk(path.join(root, 'docs')).filter((item) => item.endsWith('.md'))) {
  const relative = path.relative(root, file).split(path.sep).join('/')
  if (draftSet.has(relative)) continue

  const route = relative.endsWith('/index.md')
    ? relative.slice(0, -'index.md'.length)
    : relative.slice(0, -'.md'.length)
  expectedUrls.add(`${hostname}/${route}`)

  const builtFile = path.join(
    root,
    '.vitepress/dist',
    relative.endsWith('/index.md')
      ? `${relative.slice(0, -'index.md'.length)}index.html`
      : `${relative.slice(0, -'.md'.length)}.html`
  )
  if (!fs.existsSync(builtFile)) fail(`clean URL 没有对应产物：${route}`)
}

const sitemap = fs.readFileSync(sitemapFile, 'utf8')
const actualUrls = new Set<string>(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
)
const missing = [...expectedUrls].filter((url) => !actualUrls.has(url))
const unexpected = [...actualUrls].filter((url) => !expectedUrls.has(url))
if (actualUrls.size !== expectedUrls.size || missing.length > 0 || unexpected.length > 0) {
  console.error(`构建检查失败：期望 ${expectedUrls.size} 个 URL，实际 ${actualUrls.size} 个。`)
  for (const url of missing) console.error(`- Sitemap 缺失：${url}`)
  for (const url of unexpected) console.error(`- Sitemap 多余：${url}`)
  process.exit(1)
}

for (const route of removedRoutes) {
  const outputFile = path.join(root, '.vitepress/dist', `${route.slice(1)}.html`)
  if (fs.existsSync(outputFile)) fail(`已移除路由仍生成产物：${route}`)
  if (actualUrls.has(`${hostname}${route}`)) fail(`已移除路由仍进入 Sitemap：${route}`)
}

for (const slug of legacyAlgorithmSlugs) {
  const legacyRoute = `/docs/frontend/algorithms/${slug}`
  const canonicalRoute = `/docs/algorithms/${slug}`
  if (actualUrls.has(`${hostname}${legacyRoute}`)) fail(`旧算法路由仍进入 Sitemap：${legacyRoute}`)
  if (!actualUrls.has(`${hostname}${canonicalRoute}`)) fail(`新算法路由没有进入 Sitemap：${canonicalRoute}`)
}

console.log(`构建检查通过：Sitemap 精确包含 ${actualUrls.size} 个公开 URL，旧非保留路由未生成产物。`)
