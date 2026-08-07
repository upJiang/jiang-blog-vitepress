import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const roots = ['docs', '.vitepress', 'public', 'scripts', '.github']
const extensions = new Set(['.md', '.vue', '.ts', '.js', '.mjs', '.css', '.json'])
const ignoredDirectories = new Set(['cache', 'dist', '.temp'])
const ignoredFiles = new Set(['scripts/check-privacy.mjs'])
const allowedFindings = new Set([
  'scripts/visual-smoke.mjs|内部 URL|http://localhost:9999',
  // Public tutorials use the standard loopback address for local-only labs.
  'docs/devops/docker-compose.md|私网或回环 IPv4|127.0.0.1',
  'docs/devops/vllm-openai-compatible-serving.md|私网或回环 IPv4|127.0.0.1',
  'docs/devops/linux-service-troubleshooting.md|私网或回环 IPv4|127.0.0.1',
  'docs/devops/oci-container-runtime.md|私网或回环 IPv4|127.0.0.1'
])

const checks = [
  { name: '本机绝对路径', pattern: /\/(?:Users|home)\/[^\s'"`)]+/g },
  {
    name: '私网或回环 IPv4',
    pattern:
      /\b(?:10(?:\.\d{1,3}){3}|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g
  },
  {
    name: '内部 URL',
    pattern:
      /\bhttps?:\/\/(?:localhost(?::\d+)?|(?:[^\s/'"`)]+\.)?(?:local|internal|lan))(?=[/\s'"`)]|$)/gi
  },
  { name: '疑似私钥', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: '疑似云密钥', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { name: '疑似 Bearer Token', pattern: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/gi },
  { name: '凭证赋值', pattern: /\b(?:password|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"\n]{8,}['"]/gi }
]

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return []
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

const findings = []

for (const directory of roots) {
  for (const file of walk(path.join(root, directory))) {
    if (!extensions.has(path.extname(file))) continue
    const relativeFile = path.relative(root, file)
    if (ignoredFiles.has(relativeFile)) continue
    const source = fs.readFileSync(file, 'utf8')
    for (const check of checks) {
      for (const match of source.matchAll(check.pattern)) {
        const findingKey = `${relativeFile}|${check.name}|${match[0]}`
        if (allowedFindings.has(findingKey)) continue
        const line = source.slice(0, match.index).split('\n').length
        findings.push(
          `${relativeFile}:${line} ${check.name}：${match[0].slice(0, 80)}`
        )
      }
    }
  }
}

if (findings.length > 0) {
  console.error(`隐私检查失败，共 ${findings.length} 项：`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('隐私检查通过：未发现绝对路径、私网地址、私钥或常见凭证模式。')
