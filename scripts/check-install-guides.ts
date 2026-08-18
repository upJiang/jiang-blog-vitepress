import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const errors: string[] = []

const officialDomains = [
  'python.org', 'nodejs.org', 'docs.docker.com', 'docker.com', 'redis.io',
  'postgresql.org', 'mysql.com', 'dev.mysql.com', 'nginx.org', 'go.dev',
  'kafka.apache.org', 'rabbitmq.com', 'min.io', 'docs.temporal.io',
  'huggingface.co', 'pytorch.org', 'docs.astral.sh', 'bun.com',
  'code.visualstudio.com', 'openpolicyagent.org', 'docs.wasmtime.dev',
  'pypi.org', 'github.com', 'docs.celeryq.dev', 'docs.vllm.ai', 'google.com/chrome',
]

const screenshotHints: Array<{ domain: string; tokens: string[] }> = [
  { domain: 'python.org', tokens: ['python'] },
  { domain: 'docs.astral.sh', tokens: ['uv'] },
  { domain: 'py.sdk.modelcontextprotocol.io', tokens: ['mcp-python'] },
  { domain: 'openpolicyagent.org', tokens: ['opa'] },
  { domain: 'docs.wasmtime.dev', tokens: ['wasmtime'] },
  { domain: 'docs.celeryq.dev', tokens: ['celery'] },
  { domain: 'docs.temporal.io', tokens: ['temporal'] },
  { domain: 'docs.docker.com', tokens: ['docker'] },
  { domain: 'nodejs.org', tokens: ['node'] },
  { domain: 'code.visualstudio.com', tokens: ['vscode', 'vsce'] },
  { domain: 'go.dev', tokens: ['go'] },
  { domain: 'rabbitmq.com', tokens: ['rabbitmq'] },
  { domain: 'kafka.apache.org', tokens: ['kafka'] },
  { domain: 'min.io', tokens: ['minio'] },
  { domain: 'redis.io', tokens: ['redis'] },
  { domain: 'mysql.com', tokens: ['mysql'] },
  { domain: 'dev.mysql.com', tokens: ['mysql'] },
  { domain: 'postgresql.org', tokens: ['postgres'] },
  { domain: 'nginx.org', tokens: ['nginx'] },
  { domain: 'docs.vllm.ai', tokens: ['vllm'] },
  { domain: 'huggingface.co', tokens: ['huggingface'] },
  { domain: 'docs.nvidia.com', tokens: ['cuda'] },
  { domain: 'bun.com', tokens: ['bun'] },
  { domain: 'agentskills.io', tokens: ['agentskills'] },
  { domain: 'google.com/chrome', tokens: ['chrome'] },
]

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolute)
    return entry.name.endsWith('.md') ? [absolute] : []
  })
}

function shellBlocks(body: string): string[] {
  return [...body.matchAll(/```(?:bash|shell|sh|powershell|console)\n([\s\S]*?)```/gi)].map((match) => match[1])
}

function hasInstallCommand(body: string): boolean {
  return /\b(?:pip\s+install|uv\s+(?:pip\s+install|add)|npm\s+(?:install|i)|pnpm\s+(?:add|install)|yarn\s+(?:add|install)|brew\s+install|apt(?:-get)?\s+install|docker\s+(?:pull|run)|go\s+install|cargo\s+install|python3?\s+-m\s+venv|corepack\s+enable|npx\s+(?:--yes\s+)?(?:@?vscode\/vsce|vsce))\b|astral\.sh\/uv\/install\.(?:sh|ps1)/i.test(body)
}

function hasInstallInstruction(body: string): boolean {
  // Only inspect an actual install section or an executable shell block. A
  // paragraph that merely mentions “安装” is not an install guide and should
  // not force readers to look for a download screenshot.
  if (shellBlocks(body).some(hasInstallCommand)) return true
  return body.split(/(?=^#{2,3}\s)/m).some((section) => {
    const heading = section.match(/^#{2,3}\s+([^\n]+)/)?.[1] ?? ''
    return /(?:安装|下载|环境准备|准备.+(?:环境|依赖|工具))/i.test(heading) && hasInstallCommand(section)
  })
}

function hasShellCommand(body: string): boolean {
  return /```(?:bash|shell|sh|powershell|console)[^\n]*\n[\s\S]*?```/.test(body)
}

function hasOfficialLink(body: string): boolean {
  const links = [...body.matchAll(/https?:\/\/[^)\s]+/g)].map((match) => match[0])
  return links.some((link) => officialDomains.some((domain) => link.includes(domain)))
}

function screenshotPaths(body: string): string[] {
  return [...body.matchAll(/(?:src=["']|\]\()([/]images\/[^\s)"']+)/g)].map((match) => match[1])
}

function hasInstallScreenshot(body: string): boolean {
  const paths = screenshotPaths(body)
  if (paths.length === 0) return false

  for (const publicPath of paths) {
    const absolute = path.join(root, 'public', publicPath.replace(/^\//, ''))
    if (!fs.existsSync(absolute)) return false
  }

  // A screenshot must explain what it shows. This catches empty Markdown alt
  // text and figures that were copied without their caption.
  return paths.every((publicPath) => {
    const escaped = publicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const htmlImage = body.match(new RegExp(`<img[^>]*src=["']${escaped}["'][^>]*>`, 'i'))?.[0] ?? ''
    const markdownImage = body.match(new RegExp(`!\\[([^\\]]+)\\]\\(${escaped}\\)`, 'i'))
    return /alt=["'][^"']{8,}["']/i.test(htmlImage) || (markdownImage?.[1].trim().length ?? 0) >= 8
  })
}

function hasMatchingScreenshot(body: string): boolean {
  const links = [...body.matchAll(/https?:\/\/[^)\s]+/g)].map((match) => match[0])
  const paths = screenshotPaths(body).map((value) => value.toLowerCase())
  const html = body.toLowerCase()
  return screenshotHints.every(({ domain, tokens }) => {
    if (!links.some((link) => link.includes(domain))) return true
    return tokens.some((token) => paths.some((value) => value.includes(token)) || html.includes(`alt="${token}`))
  })
}

function installSections(body: string): string[] {
  return body.split(/(?=^#{2,3}\s)/m).filter((section) => {
    // A few tutorials call this section “运行与验证” or “准备宿主”，but
    // the executable command still makes it an installation boundary. Keep
    // the heading requirement out of the gate and let the command define it.
    return shellBlocks(section).some(hasInstallCommand)
  })
}

for (const file of walk(docsRoot)) {
  const relative = path.relative(root, file)
  if (relative.endsWith('/index.md')) continue
  const source = fs.readFileSync(file, 'utf8')
  const body = matter(source).content
  if (!hasInstallInstruction(body)) continue

  const sections = installSections(body)
  if (sections.length === 0) {
    errors.push(`${relative} 检测到安装命令，但没有按安装主题组织成 H2/H3 小节。`)
    continue
  }

  for (const section of sections) {
    if (!hasOfficialLink(section)) errors.push(`${relative} 的安装小节缺少同节官方入口链接。`)
    if (!hasShellCommand(section)) errors.push(`${relative} 的安装小节缺少可执行命令块。`)
    if (!hasInstallScreenshot(section)) errors.push(`${relative} 的安装小节缺少存在且有说明的对应截图。`)
    if (!hasMatchingScreenshot(section)) errors.push(`${relative} 的安装小节截图与官方入口不匹配。`)
  }
}

if (errors.length) {
  console.error(`安装说明检查失败，共 ${errors.length} 项：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log('安装说明检查通过：所有显式安装/下载章节都包含官方入口、命令和截图。')
