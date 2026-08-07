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
    assert((await page.locator('h1').textContent())?.trim() === '小江AI', `${viewport.width}px 首页标题错误`)
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
      const copy = link.querySelector('.article-index-copy')?.getBoundingClientRect()
      const arrow = link.querySelector('.article-index-arrow')?.getBoundingClientRect()
      const row = link.getBoundingClientRect()
      return {
        ordered: Boolean(copy && arrow && copy.left < arrow.left && copy.right <= arrow.left),
        copyWidth: copy?.width ?? 0,
        rowWidth: row.width
      }
    })
    assert(indexLayout.ordered, `${width}px 栏目标题与箭头顺序错误`)
    assert(indexLayout.copyWidth > 0 && indexLayout.rowWidth > 0, `${width}px 栏目列表内容没有正确布局`)
    assert(indexLayout.copyWidth >= indexLayout.rowWidth * 0.75, `${width}px 栏目标题列被压缩`)
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
  assert((await page.locator('text=建立增长模型').count()) > 0, 'SEO 栏目缺少增长模型分组')
  assert((await page.locator('text=站外、数据与投放').count()) > 0, 'SEO 栏目缺少投放分组')

  await page.goto(`${baseURL}/docs/ai-agent/agent-lifecycle`, { waitUntil: 'networkidle' })
  await page.locator('.mermaid svg').first().waitFor({ timeout: 10_000 })
  assert((await page.locator('.mermaid svg').count()) > 0, 'Agent 文章 Mermaid 未渲染')
  const mermaidPreview = page.locator('.mermaid-preview').first()
  const semanticNodeKinds = await mermaidPreview
    .locator('.node[data-xj-semantic]')
    .evaluateAll((nodes) => new Set(nodes.map((node) => node.getAttribute('data-xj-semantic'))).size)
  assert(semanticNodeKinds >= 3, '流程图节点没有形成足够清晰的语义配色')
  assert(
    await mermaidPreview.locator('.mermaid-preview__expand svg').count(),
    '流程图预览缺少放大入口'
  )
  await mermaidPreview.click()
  const mermaidViewer = page.locator('.mermaid-viewer')
  await mermaidViewer.waitFor()
  assert(await mermaidViewer.getAttribute('aria-modal'), '流程图查看器缺少模态语义')
  const mermaidStage = mermaidViewer.locator('.mermaid-viewer__stage')
  const zoomBefore = await mermaidViewer.locator('output').textContent()
  await mermaidStage.hover()
  await page.mouse.wheel(0, -240)
  const zoomAfter = await mermaidViewer.locator('output').textContent()
  assert(zoomBefore !== zoomAfter, '流程图查看器不支持滚轮缩放')
  const transformBeforeDrag = await mermaidViewer
    .locator('.mermaid-viewer__diagram')
    .getAttribute('style')
  const stageBox = await mermaidStage.boundingBox()
  if (stageBox) {
    await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(stageBox.x + stageBox.width / 2 + 60, stageBox.y + stageBox.height / 2 + 32)
    await page.mouse.up()
  }
  const transformAfterDrag = await mermaidViewer
    .locator('.mermaid-viewer__diagram')
    .getAttribute('style')
  assert(transformBeforeDrag !== transformAfterDrag, '流程图查看器不支持拖动查看')
  await page.screenshot({
    path: path.join(tempDirectory, 'mermaid-viewer-1440.png'),
    fullPage: false
  })
  await page.keyboard.press('Escape')
  await mermaidViewer.waitFor({ state: 'detached' })
  assert(await mermaidPreview.evaluate((element) => document.activeElement === element), '关闭流程图后焦点没有返回预览')
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

  await page.goto(`${baseURL}/docs/ai-agent/llm-workflow-rag-agent`, {
    waitUntil: 'networkidle'
  })
  const workflowCode = page.locator('div.language-text').filter({ hasText: '用户输入' }).first()
  const lineGeometry = await workflowCode.locator('code .line').evaluateAll((lines) => {
    const tops = lines.map((line) => line.getBoundingClientRect().top)
    return {
      count: lines.length,
      largestGap: Math.max(...tops.slice(1).map((top, index) => top - tops[index]))
    }
  })
  assert(lineGeometry.count === 5, '工作流示例应渲染为 5 行代码')
  assert(lineGeometry.largestGap < 30, '代码行之间出现了额外空行')

  await workflowCode.scrollIntoViewIfNeeded()
  const workflowBox = await workflowCode.boundingBox()
  const scrollBefore = await page.evaluate(() => window.scrollY)
  if (workflowBox) {
    await page.mouse.move(workflowBox.x + workflowBox.width / 2, workflowBox.y + 80)
    await page.mouse.wheel(0, 360)
    await page.waitForTimeout(100)
  }
  const scrollAfter = await page.evaluate(() => window.scrollY)
  assert(scrollAfter > scrollBefore, '鼠标位于代码块上时页面无法继续滚动')

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
    assert(
      await copyButton.evaluate((button) => {
        const buttonRect = button.getBoundingClientRect()
        const blockRect = button.parentElement?.getBoundingClientRect()
        const prompt = getComputedStyle(button, '::after').content.replaceAll('"', '')
        const themeColorProbe = document.createElement('span')
        themeColorProbe.style.color = 'var(--vp-c-brand-1)'
        document.body.append(themeColorProbe)
        const themeColor = getComputedStyle(themeColorProbe).color
        themeColorProbe.remove()
        const promptColor = getComputedStyle(button, '::after').color
        return (
          prompt === '已复制' &&
          promptColor === themeColor &&
          Boolean(blockRect && buttonRect.left >= blockRect.left)
        )
      }),
      '复制成功提示应使用主题色并显示在代码块工具栏内部'
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

console.log(`视觉冒烟通过：164 篇文章完成 375px/1440px 检查，8 篇代表文章完成 768px/1024px 检查；首页、栏目、导航、Mermaid、深色模式、键盘焦点、代码复制和搜索均正常。`)
