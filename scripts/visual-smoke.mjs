import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { articles, articlePath } from '../.vitepress/content.ts'

const baseURL = process.env.BLOG_URL ?? 'http://localhost:9999'
const tempDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'ai-full-stack-blog-visual-')
)
const errors = []
const consoleErrors = []

function assert(condition, message) {
  if (!condition) errors.push(message)
}

const browser = await chromium.launch({ headless: true })

try {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 812, height: 375 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 }
  ]) {
    const page = await browser.newPage({ viewport })
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto(baseURL, { waitUntil: 'networkidle' })
    await page.locator('.knowledge-home').waitFor()
    assert((await page.locator('h1').textContent())?.trim() === 'AI 全栈', `${viewport.width}px 首页标题错误`)
    assert((await page.locator('.topic-grid a').count()) === 7, `${viewport.width}px 知识地图不是 7 个栏目`)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    assert(overflow <= 1, `${viewport.width}px 首页存在 ${overflow}px 横向溢出`)
    await page.screenshot({
      path: path.join(tempDirectory, `home-${viewport.width}.png`),
      fullPage: true
    })
    await page.close()
  }

  const representativeRoutes = [
    '/docs/ai-agent/embedding-vector-space',
    '/docs/ai-agent/agent-lifecycle',
    '/docs/seo/search-growth-model',
    '/docs/frontend/vscode-extension-lifecycle',
    '/docs/backend/fastapi-pydantic-layered',
    '/docs/devops/docker-compose',
    '/docs/devops/ai-infra-role-map',
    '/docs/devops/vllm-openai-compatible-serving'
  ]

  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    for (const article of articles) {
      const route = articlePath(article)
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('.VPDoc').waitFor()
      if (!article.preserved) {
        assert((await page.locator('h1').count()) === 1, `${width}px 文章缺少唯一一级标题：${route}`)
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      assert(overflow <= 1, `${width}px 文章存在 ${overflow}px 横向溢出：${route}`)
    }

    await page.goto(`${baseURL}/docs/ai-agent/`, { waitUntil: 'domcontentloaded' })
    const indexLayout = await page.locator('.article-index-list a').first().evaluate((link) => {
      const chapter = link.querySelector('.article-index-chapter')?.getBoundingClientRect()
      const copy = link.querySelector('.article-index-copy')?.getBoundingClientRect()
      const arrow = link.querySelector('.article-index-arrow')?.getBoundingClientRect()
      const row = link.getBoundingClientRect()
      return {
        ordered: Boolean(chapter && copy && arrow && chapter.left < copy.left && copy.right < arrow.right),
        copyWidth: copy?.width ?? 0,
        rowWidth: row.width
      }
    })
    assert(indexLayout.ordered, `${width}px 栏目列表三列顺序错误`)
    assert(indexLayout.copyWidth >= indexLayout.rowWidth * 0.55, `${width}px 栏目标题列被压缩`)
    await page.close()
  }

  for (const width of [768, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    for (const route of representativeRoutes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('h1').waitFor()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      assert(overflow <= 1, `${width}px 代表文章存在 ${overflow}px 横向溢出：${route}`)
    }
    await page.close()
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(baseURL).origin
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.goto(`${baseURL}/docs/frontend/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 71, '前端栏目应展示 71 篇文章')
  assert((await page.locator('text=算法与数据结构').count()) > 0, '前端栏目缺少算法分组')
  assert((await page.locator('text=重学前端').count()) > 0, '前端栏目缺少重学前端分组')

  await page.goto(`${baseURL}/docs/seo/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 12, 'SEO 栏目应展示 12 篇文章')
  assert((await page.locator('text=第一部分：建立增长模型').count()) > 0, 'SEO 栏目缺少增长模型分组')
  assert((await page.locator('text=第五部分：站外、数据与投放').count()) > 0, 'SEO 栏目缺少投放分组')

  await page.goto(`${baseURL}/docs/ai-agent/agent-lifecycle`, { waitUntil: 'networkidle' })
  await page.locator('.mermaid svg').first().waitFor({ timeout: 10_000 })
  assert((await page.locator('.mermaid svg').count()) > 0, 'Agent 文章 Mermaid 未渲染')
  assert((await page.locator('.VPSidebar').count()) === 1, '文章页缺少左侧导航')
  assert((await page.locator('.VPDocAside').count()) === 1, '文章页缺少右侧目录')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert(
    await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    '浏览器没有进入 reduced-motion 模式'
  )

  await page.keyboard.press('Tab')
  assert(
    await page.evaluate(() => document.activeElement !== document.body),
    '键盘 Tab 没有进入可交互元素'
  )

  const switchButton = page.locator('.VPSwitchAppearance:visible')
  await switchButton.click()
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  assert(await page.locator('html.dark').count(), '深色模式没有生效')

  await page.locator('.VPNavBarSearch button').click()
  const searchInput = page.locator('.VPLocalSearchBox input')
  await searchInput.fill('混合检索')
  await page.locator('.VPLocalSearchBox .result').first().waitFor({ timeout: 10_000 })
  assert((await page.locator('.VPLocalSearchBox .result').count()) > 0, '本地搜索没有返回结果')
  await page.keyboard.press('Escape')

  await page.goto(`${baseURL}/docs/frontend/typescript-type-system-engineering`, {
    waitUntil: 'networkidle'
  })
  const copyButton = page.locator('button.copy').first()
  const copyButtonCount = await copyButton.count()
  assert(copyButtonCount === 1, 'TypeScript 文章代码块缺少复制按钮')
  if (copyButtonCount === 1) {
    await copyButton.click()
    await page.waitForFunction(
      () => document.querySelector('button.copy')?.classList.contains('copied')
    )
    assert(
      await copyButton
        .getAttribute('class')
        .then((value) => value?.includes('copied')),
      '代码复制没有成功反馈'
    )
  }

  await page.close()
} finally {
  await browser.close()
  fs.rmSync(tempDirectory, { recursive: true, force: true })
}

const ignoredConsolePatterns = [/favicon/i]
const relevantConsoleErrors = consoleErrors.filter(
  (message) => !ignoredConsolePatterns.some((pattern) => pattern.test(message))
)

if (relevantConsoleErrors.length > 0) {
  for (const message of relevantConsoleErrors) errors.push(`浏览器控制台：${message}`)
}

if (errors.length > 0) {
  console.error(`视觉冒烟失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`视觉冒烟通过：152 篇文章完成 375px/1440px 检查，8 篇代表文章完成 768px/1024px 检查；首页、栏目、导航、Mermaid、深色模式、键盘焦点、代码复制和搜索均正常。`)
