import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import {
  articles,
  articleFile,
  articlePath,
  frontendTracks,
  sections
} from '../.vitepress/content.ts'
import { removedBackendRoutes } from '../.vitepress/removed-backend-routes.ts'

const baseURL = process.env.BLOG_URL ?? 'http://localhost:9999'
const checksDevMiddleware = !process.env.BLOG_URL || process.env.BLOG_EXPECT_DEV_REDIRECT === '1'
const tempDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'ai-full-stack-blog-visual-')
)
const errors = []
const consoleErrors = []
const availableArticles = articles.filter((article) =>
  fs.existsSync(path.join(process.cwd(), articleFile(article)))
)
const representativeRoutes = [
  '/docs/ai-agent/llm-workflow-rag-agent',
  '/docs/ai-agent/embedding-vector-space',
  '/docs/ai-agent/mcp-protocol-lifecycle',
  '/docs/ai-agent/rag-evaluation-recall-mrr-ndcg',
  '/docs/ai-agent/knowledge-agent-capstone',
  '/docs/ai-agent/agent-request-lifecycle-runtime',
  '/docs/ai-agent/python-openai-responses-first-call',
  '/docs/ai-agent/agent-compose-local-runtime',
  '/docs/ai-agent/prompt-cache-prefix-design',
  '/docs/ai-practice/mcp-design-workflow-mining',
  '/docs/ai-practice/python-mcp-server-practice',
  '/docs/ai-practice/article-publishing-skill-practice',
  '/docs/ai-practice/context-engineering-harness',
  '/docs/ai-practice/ai-work-modes-opc-full-stack',
  '/docs/seo/search-growth-model',
  '/docs/seo/technical-seo-rendering-performance',
  '/docs/seo/sem-account-keywords-landing',
  '/docs/frontend/vscode-extension-lifecycle',
  '/docs/frontend/react-fiber-concurrent-rendering',
  '/docs/frontend/vue-vdom-renderer-diff',
  '/docs/frontend/vite-dev-server-plugin-system',
  '/docs/algorithms/binary-search-boundaries',
  '/docs/backend/backend-learning-roadmap',
  '/docs/backend/transaction-acid-isolation-mvcc',
  '/docs/backend/react-nestjs-prisma-admin'
]

function assert(condition, message) {
  if (!condition) errors.push(message)
}

function frontendTrackFor(article) {
  if (article.slug.startsWith('relearn/') || article.part === '基础与手写') return 'fundamentals'
  if (article.part === 'TypeScript' || article.slug === 'typescript-type-system-engineering') return 'typescript'
  if (
    article.part === 'React' ||
    article.slug === 'react-fiber-concurrent-rendering' ||
    article.slug === 'nextjs-rendering-cache-invalidation'
  ) return 'react'
  if (article.part === 'Vue' || article.slug === 'vue-reactivity-scheduler') return 'vue'
  if (article.part === '构建工具' || article.part === '现代前端：构建工具') return 'tooling'
  return 'engineering'
}

function sectionExpectation(category) {
  const categoryArticles = articles.filter((article) => article.category === category)
  if (category === 'frontend') {
    return {
      tabCount: frontendTracks.length,
      secondKey: frontendTracks[1].key,
      thirdKey: frontendTracks[2].key,
      secondCount: categoryArticles.filter(
        (article) => frontendTrackFor(article) === frontendTracks[1].key
      ).length
    }
  }
  if (category === 'ai-agent') {
    return {
      tabCount: 3,
      secondKey: 'mainline',
      thirdKey: 'special',
      secondCount: categoryArticles.filter((article) => article.track === 'mainline').length
    }
  }
  const parts = [...new Set(categoryArticles.map((article) => article.part))]
  return {
    tabCount: parts.length + 1,
    secondKey: 'part-1',
    thirdKey: 'part-2',
    secondCount: categoryArticles.filter((article) => article.part === parts[0]).length
  }
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

  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    for (const article of availableArticles) {
      const route = articlePath(article)
      await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('.VPDoc').waitFor()
      if (!article.preserved) {
        assert((await page.locator('h1').count()) === 1, `${width}px 文章缺少唯一一级标题：${route}`)
      }
      assert((await page.locator('.VPLastUpdated').count()) === 0, `${width}px 文章仍展示更新时间：${route}`)
      const templateHeadings = await page.locator('.VPDoc h2').evaluateAll((headings) =>
        headings
          .map((heading) => heading.textContent?.trim() ?? '')
          .filter((heading) => /^参考资料|(?:本篇|本文)产物/.test(heading))
      )
      assert(templateHeadings.length === 0, `${width}px 文章仍展示模板章节：${route}`)
      if (article.category === 'backend') {
        assert(
          (await page.locator('h1').textContent())?.replace(/\u200b/g, '').trim() === article.title,
          `${width}px 后端文章标题与清单不一致：${route}`
        )
        assert(
          (await page.locator('.NotFound, .not-found, [data-not-found]').count()) === 0,
          `${width}px 后端文章误入 404 页面：${route}`
        )
        assert(
          (await page.locator('.chapter-guide').count()) === 0,
          `${width}px 后端文章仍展示固定阅读信息模板：${route}`
        )
        // 只有正文确实包含 Mermaid 时才等待 SVG；没有图的文章不应被测试脚本误判。
        if (await page.locator('.mermaid').count() > 0) {
          await page.locator('.mermaid svg').first().waitFor({ timeout: 10_000 })
          assert(
            (await page.locator('.mermaid svg').count()) > 0,
            `${width}px 后端文章 Mermaid 未渲染：${route}`
          )
        }
      }
      if (
        (!article.preserved && article.category === 'algorithms') ||
        (article.category === 'frontend' && article.chapter >= 19 && !article.slug.startsWith('relearn/'))
      ) {
        assert(
          (await page.locator('h1').textContent())?.replace(/\u200b/g, '').trim() === article.title,
          `${width}px 前端/算法文章标题与清单不一致：${route}`
        )
        assert(
          (await page.locator('.NotFound, .not-found, [data-not-found]').count()) === 0,
          `${width}px 文章误入 404 页面：${route}`
        )
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
  assert((await page.locator('.article-index-list a').count()) === 104, '前端栏目应展示 104 篇文章')
  assert((await page.locator('text=算法与数据结构').count()) === 0, '前端栏目不应再展示算法分组')
  assert((await page.locator('text=重学前端').count()) > 0, '前端栏目缺少重学前端分组')
  assert((await page.locator('.frontend-track-tabs [role="tab"]').count()) === 7, '前端栏目缺少七个专题 Tab')
  assert((await page.locator('.frontend-track-tabs [role="tab"][aria-selected="true"]').count()) === 1, '前端专题没有唯一激活 Tab')
  await page.locator('#frontend-tab-react').click()
  assert(new URL(page.url()).searchParams.get('track') === 'react', '专题 Tab 没有同步 track 查询参数')
  assert((await page.locator('.frontend-track-panel a').count()) > 0, 'React 专题没有文章')
  await page.locator('#frontend-tab-typescript').focus()
  await page.keyboard.press('ArrowRight')
  assert(await page.locator('#frontend-tab-react').evaluate((element) => document.activeElement === element), '专题 Tab 不支持方向键移动焦点')
  await page.keyboard.press('Home')
  assert(await page.locator('#frontend-tab-all').evaluate((element) => document.activeElement === element), '专题 Tab 不支持 Home')
  await page.keyboard.press('End')
  assert(await page.locator('#frontend-tab-engineering').evaluate((element) => document.activeElement === element), '专题 Tab 不支持 End')
  await page.goto(`${baseURL}/docs/frontend/?track=vue`, { waitUntil: 'networkidle' })
  assert(await page.locator('#frontend-tab-vue').getAttribute('aria-selected').then((value) => value === 'true'), '专题 Tab 无法从查询参数恢复')

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 812, height: 375 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 }
  ]) {
    const sectionPage = await browser.newPage({ viewport })
    sectionPage.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    sectionPage.on('pageerror', (error) => consoleErrors.push(error.message))

    for (const section of sections) {
      const expectation = sectionExpectation(section.key)
      const idPrefix = section.key === 'frontend' ? 'frontend' : 'category'
      const categoryArticles = articles.filter((article) => article.category === section.key)
      await sectionPage.goto(`${baseURL}${section.path}`, { waitUntil: 'networkidle' })

      const tabs = sectionPage.locator('.frontend-track-tabs [role="tab"]')
      assert(
        (await tabs.count()) === expectation.tabCount,
        `${viewport.width}px ${section.title} Tab 数量错误`
      )
      assert(
        (await sectionPage.locator('.frontend-track-tabs [role="tab"][aria-selected="true"]').count()) === 1,
        `${viewport.width}px ${section.title} 没有唯一激活 Tab`
      )
      assert(
        (await sectionPage.locator('.frontend-track-tabs [role="tab"][tabindex="0"]').count()) === 1,
        `${viewport.width}px ${section.title} roving tabindex 错误`
      )
      assert(
        (await sectionPage.locator('.article-index-list a').count()) === categoryArticles.length,
        `${viewport.width}px ${section.title} 默认没有展示全部文章`
      )

      const controlledPanels = await tabs.evaluateAll((elements) =>
        elements.every((element) => {
          const panelId = element.getAttribute('aria-controls')
          return Boolean(panelId && document.getElementById(panelId)?.getAttribute('role') === 'tabpanel')
        })
      )
      assert(controlledPanels, `${viewport.width}px ${section.title} 的 aria-controls 没有关联有效面板`)

      await sectionPage.locator(`#${idPrefix}-tab-${expectation.secondKey}`).click()
      assert(
        new URL(sectionPage.url()).searchParams.get('track') === expectation.secondKey,
        `${viewport.width}px ${section.title} 没有保存 track 查询参数`
      )
      assert(
        (await sectionPage.locator('.frontend-track-panel .article-index-list a').count()) === expectation.secondCount,
        `${viewport.width}px ${section.title} 第二个 Tab 的文章数量错误`
      )
      await sectionPage.reload({ waitUntil: 'networkidle' })
      assert(
        (await sectionPage.locator(`#${idPrefix}-tab-${expectation.secondKey}`).getAttribute('aria-selected')) === 'true',
        `${viewport.width}px ${section.title} 刷新后没有恢复 Tab`
      )

      await sectionPage.locator(`#${idPrefix}-tab-${expectation.thirdKey}`).click()
      await sectionPage.goBack({ waitUntil: 'networkidle' })
      assert(
        (await sectionPage.locator(`#${idPrefix}-tab-${expectation.secondKey}`).getAttribute('aria-selected')) === 'true',
        `${viewport.width}px ${section.title} 后退时没有恢复 Tab`
      )
      await sectionPage.goForward({ waitUntil: 'networkidle' })
      assert(
        (await sectionPage.locator(`#${idPrefix}-tab-${expectation.thirdKey}`).getAttribute('aria-selected')) === 'true',
        `${viewport.width}px ${section.title} 前进时没有恢复 Tab`
      )

      await sectionPage.goto(`${baseURL}${section.path}?track=invalid`, { waitUntil: 'networkidle' })
      assert(
        new URL(sectionPage.url()).searchParams.get('track') === 'all' &&
          (await sectionPage.locator(`#${idPrefix}-tab-all`).getAttribute('aria-selected')) === 'true',
        `${viewport.width}px ${section.title} 无效 Tab 没有回退到全部`
      )

      await sectionPage.locator(`#${idPrefix}-tab-${expectation.secondKey}`).focus()
      await sectionPage.keyboard.press('ArrowDown')
      assert(
        await sectionPage.locator(`#${idPrefix}-tab-${expectation.thirdKey}`).evaluate(
          (element) => document.activeElement === element && element.getAttribute('aria-selected') === 'true'
        ),
        `${viewport.width}px ${section.title} 不支持方向键切换`
      )
      await sectionPage.keyboard.press('Enter')
      assert(
        (await sectionPage.locator(`#${idPrefix}-tab-${expectation.thirdKey}`).getAttribute('aria-selected')) === 'true',
        `${viewport.width}px ${section.title} Enter 后状态错误`
      )
      await sectionPage.keyboard.press('Home')
      assert(
        await sectionPage.locator(`#${idPrefix}-tab-all`).evaluate((element) => document.activeElement === element),
        `${viewport.width}px ${section.title} 不支持 Home`
      )
      await sectionPage.keyboard.press('End')
      assert(
        await tabs.last().evaluate((element) => document.activeElement === element),
        `${viewport.width}px ${section.title} 不支持 End`
      )
      await sectionPage.locator('.frontend-track-panel').focus()
      await sectionPage.keyboard.press('Escape')
      assert(
        await tabs.last().evaluate((element) => document.activeElement === element),
        `${viewport.width}px ${section.title} Escape 后焦点没有返回当前 Tab`
      )

      const overflow = await sectionPage.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      assert(overflow <= 1, `${viewport.width}px ${section.title} 栏目存在 ${overflow}px 横向溢出`)
    }
    await sectionPage.close()
  }

  if (checksDevMiddleware) {
    const legacyResponse = await page.request.get(`${baseURL}/docs/frontend/algorithms/array.html`, { maxRedirects: 0 })
    assert(legacyResponse.status() === 302, '开发环境旧算法地址没有返回 302')
    assert(legacyResponse.headers().location === '/docs/algorithms/array', '旧算法地址跳转目标错误')
  }

  await page.goto(`${baseURL}/docs/algorithms/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 21, '算法栏目应展示 21 篇文章')
  assert((await page.locator('a[href="/docs/algorithms/"]').count()) > 0, '顶部导航缺少算法入口')

  await page.goto(`${baseURL}/docs/seo/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 12, 'SEO 栏目应展示 12 篇文章')
  assert((await page.getByText('需求、抓取与页面', { exact: true }).count()) > 0, 'SEO 栏目缺少需求、抓取与页面分组')
  assert((await page.getByText('技术审计与排障', { exact: true }).count()) > 0, 'SEO 栏目缺少技术审计与排障分组')
  assert((await page.getByText('站外、数据与投放', { exact: true }).count()) > 0, 'SEO 栏目缺少站外、数据与投放分组')

  await page.goto(`${baseURL}/docs/backend/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 68, '后端栏目应展示 68 篇文章')
  assert((await page.getByText('68 篇文章', { exact: true }).count()) > 0, '后端栏目没有显示 68 篇文章数量')

  await page.goto(`${baseURL}/docs/ai-practice/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 10, 'AI 实践栏目应展示 10 篇文章')
  assert((await page.getByText('基础认知', { exact: true }).count()) > 0, 'AI 实践栏目缺少基础认知分组')
  assert((await page.getByText('Agent 协作', { exact: true }).count()) > 0, 'AI 实践栏目缺少 Agent 协作分组')
  assert((await page.getByText('能力扩展', { exact: true }).count()) > 0, 'AI 实践栏目缺少能力扩展分组')
  assert((await page.getByText('研发系统', { exact: true }).count()) > 0, 'AI 实践栏目缺少研发系统分组')
  assert((await page.getByText('个人工作系统', { exact: true }).count()) > 0, 'AI 实践栏目缺少个人工作系统分组')

  for (const removedRoute of ['/docs/architecture/ai-system-seven-layers', '/docs/engineering/systematic-debugging', '/docs/ai-practice/codex-claude-code-rules']) {
    const removedPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await removedPage.goto(`${baseURL}${removedRoute}`, { waitUntil: 'networkidle' })
    assert((await removedPage.title()).startsWith('404'), `旧栏目路由没有进入 404 页面：${removedRoute}`)
    assert((await removedPage.locator('.NotFound, .not-found, [data-not-found]').count()) > 0, `旧栏目路由缺少 404 语义：${removedRoute}`)
    assert((await removedPage.locator('.VPDoc').count()) === 0, `旧栏目路由仍渲染文章正文：${removedRoute}`)
    await removedPage.close()
  }

  for (const removedRoute of removedBackendRoutes) {
    const removedPage = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await removedPage.goto(`${baseURL}${removedRoute}`, { waitUntil: 'domcontentloaded' })
    await removedPage.waitForFunction(() => document.title.startsWith('404'))
    assert((await removedPage.title()).startsWith('404'), `废弃后端路由没有进入 404：${removedRoute}`)
    assert((await removedPage.locator('.NotFound, .not-found, [data-not-found]').count()) > 0, `废弃后端路由缺少 404 语义：${removedRoute}`)
    assert((await removedPage.locator('.VPDoc').count()) === 0, `废弃后端路由仍渲染正文：${removedRoute}`)
    await removedPage.close()
  }

  await page.goto(`${baseURL}/docs/ai-agent/agent-request-lifecycle-runtime`, { waitUntil: 'networkidle' })
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
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('.mermaid-viewer')).opacity === '1'
  )
  assert(await mermaidViewer.getAttribute('aria-modal'), '流程图查看器缺少模态语义')
  assert(
    await mermaidViewer.locator('.mermaid-viewer__diagram svg').evaluate((diagram) => {
      const bounds = diagram.getBoundingClientRect()
      return (
        bounds.width >= 300 &&
        bounds.height >= 40 &&
        Boolean(diagram.getAttribute('viewBox'))
      )
    }),
    '放大后的流程图没有正常显示或缺少有效 viewBox'
  )
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
  const workflowCode = page.locator('div.language-python').first()
  await workflowCode.waitFor()
  const lineGeometry = await workflowCode.locator('code .line').evaluateAll((lines) => {
    const tops = lines.map((line) => line.getBoundingClientRect().top)
    return {
      count: lines.length,
      largestGap: Math.max(...tops.slice(1).map((top, index) => top - tops[index]))
    }
  })
  assert(lineGeometry.count >= 5, 'Agent 入门文章缺少可检查的多行 Python 示例')
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

console.log(`视觉冒烟通过：${articles.length} 篇文章完成 375px/1440px 检查，${representativeRoutes.length} 篇代表文章完成 768px/1024px 检查；首页、栏目、导航、Mermaid、深色模式、键盘焦点、代码复制和搜索均正常。`)
