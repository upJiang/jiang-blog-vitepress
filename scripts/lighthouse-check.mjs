import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const previewPort = Number(process.env.LIGHTHOUSE_PORT ?? 4173)
const startsLocalPreview = !process.env.BLOG_URL
const baseURL = (process.env.BLOG_URL ?? `http://localhost:${previewPort}`).replace(/\/$/, '')
const threshold = Number(process.env.LIGHTHOUSE_MIN_SCORE ?? 90)
const defaultRoutes = [
  '/',
  '/docs/ai-agent/knowledge-agent-capstone',
  '/docs/ai-agent/prompt-cache-prefix-design',
  '/docs/ai-agent/python-openai-responses-first-call',
  '/docs/ai-agent/agent-production-architecture',
  '/docs/seo/browser-page-seo-audit',
  '/docs/frontend/typescript-type-system-engineering',
  '/docs/backend/python-fastapi-runtime-layering',
  '/docs/devops/vllm-openai-compatible-serving',
  '/docs/ai-practice/',
  '/docs/ai-practice/python-mcp-server-practice',
  '/docs/ai-practice/article-publishing-skill-practice',
  '/docs/ai-practice/context-engineering-harness',
  '/docs/ai-practice/ai-work-modes-opc-full-stack'
]
const routes = process.env.LIGHTHOUSE_ROUTES
  ? process.env.LIGHTHOUSE_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : defaultRoutes
const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-full-stack-lighthouse-'))
const lighthouseBin = path.join(process.cwd(), 'node_modules', '.bin', 'lighthouse')
const vitepressBin = path.join(process.cwd(), 'node_modules', '.bin', 'vitepress')
const failures = []
let previewProcess
let previewOutput = ''

if (!fs.existsSync(lighthouseBin) || !fs.existsSync(vitepressBin)) {
  console.error('Lighthouse 检查失败：请先执行 yarn install --frozen-lockfile。')
  process.exit(1)
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (previewProcess?.exitCode !== null) {
      throw new Error(`VitePress preview 提前退出：${previewOutput.trim()}`)
    }
    try {
      const response = await fetch(`${baseURL}/`)
      if (response.ok) return
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`等待 VitePress preview 超时：${previewOutput.trim()}`)
}

async function requestStatus(target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return (await fetch(target)).status
    } catch {
      if (attempt === 4) return undefined
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }
}

try {
  if (startsLocalPreview) {
    previewProcess = spawn(
      vitepressBin,
      ['preview', '--port', String(previewPort), '--host', 'localhost'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    previewProcess.stdout.on('data', (chunk) => { previewOutput += chunk })
    previewProcess.stderr.on('data', (chunk) => { previewOutput += chunk })
    await waitForServer()
  }

  for (const [index, route] of routes.entries()) {
    const target = `${baseURL}${route === '/' ? '/' : route}`
    const status = await requestStatus(target)
    if (status === undefined || status < 200 || status >= 400) {
      failures.push(`${route} 无法访问：${status === undefined ? '连接失败' : `HTTP ${status}`}`)
      continue
    }

    const reportFile = path.join(tempDirectory, `report-${index}.json`)
    const result = spawnSync(
      lighthouseBin,
      [
        target,
        '--quiet',
        '--preset=desktop',
        '--only-categories=performance,accessibility,best-practices,seo',
        '--output=json',
        `--output-path=${reportFile}`,
        '--chrome-flags=--headless --no-sandbox --disable-gpu'
      ],
      { encoding: 'utf8', timeout: 120_000 }
    )

    if (result.status !== 0 || !fs.existsSync(reportFile)) {
      failures.push(`${route} Lighthouse 执行失败：${(result.stderr || result.stdout).trim()}`)
      continue
    }

    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'))
    const scores = categories.map((category) => {
      const score = Math.round((report.categories?.[category]?.score ?? 0) * 100)
      if (score < threshold) failures.push(`${route} ${category}=${score}，低于 ${threshold}`)
      return `${category}=${score}`
    })
    console.log(`${route}：${scores.join('，')}`)
  }
} finally {
  previewProcess?.kill('SIGTERM')
  fs.rmSync(tempDirectory, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`Lighthouse 检查失败，共 ${failures.length} 项：`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Lighthouse 检查通过：${routes.length} 个页面四项分数均不低于 ${threshold}。`)
