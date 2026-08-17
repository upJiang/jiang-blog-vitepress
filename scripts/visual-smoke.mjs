import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import {
  articles,
  articleFile,
  articlePath,
  sectionStages,
  sectionTrackGroups,
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
  '/docs/ai-agent/pgvector-storage-index-recall',
  '/docs/ai-agent/mcp-protocol-lifecycle',
  '/docs/ai-agent/rag-evaluation-recall-mrr-ndcg',
  '/docs/ai-agent/knowledge-agent-capstone',
  '/docs/ai-agent/agent-request-lifecycle-runtime',
  '/docs/ai-agent/python-openai-responses-first-call',
  '/docs/ai-agent/agent-production-architecture',
  '/docs/ai-agent/prompt-cache-prefix-design',
  '/docs/ai-practice/mcp-opportunity-analysis',
  '/docs/ai-practice/fastmcp-server-practice',
  '/docs/ai-practice/article-check-skill-practice',
  '/docs/ai-practice/coding-harness-troubleshooting',
  '/docs/ai-practice/personal-ai-work-system',
  '/docs/seo/search-growth-model',
  '/docs/seo/technical-seo-rendering-performance',
  '/docs/seo/sem-account-keywords-landing',
  '/docs/frontend/vscode-extension-lifecycle',
  '/docs/frontend/react-fiber-concurrent-rendering',
  '/docs/frontend/vue-vdom-renderer-diff',
  '/docs/frontend/vite-dev-server-plugin-system',
  '/docs/onnx-practice/squeezenet-browser-inference',
  '/docs/algorithms/binary-search-boundaries',
  '/docs/backend/backend-learning-roadmap',
  '/docs/backend/transaction-acid-isolation-mvcc',
  '/docs/backend/react-nestjs-prisma-admin'
]

function assert(condition, message) {
  if (!condition) errors.push(message)
}

function sectionExpectation(category) {
  const categoryArticles = articles.filter((article) => article.category === category)
  const stages = sectionStages[category]
  const second = stages[0]
  const third = stages[1] ?? { key: 'all', label: '全部' }
  return {
    tabCount: stages.length + 1,
    secondKey: second.key,
    thirdKey: third.key,
    secondCount: categoryArticles.filter((article) => article.stageKey === second.key).length
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
    assert((await page.locator('.topic-grid a').count()) === 8, `${viewport.width}px 知识地图不是 8 个栏目`)

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
      if (!article.contentLocked) {
        assert((await page.locator('h1').count()) === 1, `${width}px 文章缺少唯一一级标题：${route}`)
      }
      assert(
        (await page.locator('.chapter-guide').count()) === 0,
        `${width}px 文章仍展示“开始前可以了解/读完可以带走”模板卡：${route}`
      )
      assert((await page.locator('.VPLastUpdated').count()) === 0, `${width}px 文章仍展示更新时间：${route}`)
      if (!article.contentLocked) {
        const templateHeadings = await page.locator('.VPDoc h2').evaluateAll((headings) =>
          headings
            .map((heading) => heading.textContent?.trim() ?? '')
            .filter((heading) => /^参考资料|(?:本篇|本文)产物/.test(heading))
        )
        assert(templateHeadings.length === 0, `${width}px 文章仍展示模板章节：${route}`)
      }
      if (article.category === 'backend') {
        assert(
          (await page.locator('h1').textContent())?.replace(/\u200b/g, '').trim() === article.title,
          `${width}px 后端文章标题与清单不一致：${route}`
        )
        assert(
          (await page.locator('.NotFound, .not-found, [data-not-found]').count()) === 0,
          `${width}px 后端文章误入 404 页面：${route}`
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
        (!article.contentLocked && article.category === 'algorithms') ||
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

      assert(
        (await sectionPage.locator('.VPSidebar').count()) === 0,
        `${viewport.width}px ${section.title} 栏目索引不应显示左侧目录`
      )
      assert(
        (await sectionPage.locator('.VPDocAside').count()) === 0,
        `${viewport.width}px ${section.title} 栏目索引不应显示右侧目录`
      )

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

      if (section.key === 'ai-agent') {
        const tabLabels = await tabs.allTextContents()
        const expectedAiTabs = [{ key: 'all', label: '全部' }, ...sectionStages['ai-agent']]
        assert(
          tabLabels.map((label) => label.trim()).join('|') === expectedAiTabs.map((track) => track.label).join('|'),
          `${viewport.width}px AI 与 Agent 主题 Tab 文案或顺序错误`
        )
        assert(
          (await sectionPage.getByText('推荐阅读顺序', { exact: true }).count()) === 0,
          `${viewport.width}px AI 与 Agent 仍展示推荐阅读顺序`
        )
        assert(
          (await sectionPage.getByText('专题阅读', { exact: true }).count()) === 0,
          `${viewport.width}px AI 与 Agent 仍展示专题阅读`
        )

        for (const track of sectionStages['ai-agent']) {
          await sectionPage.locator(`#${idPrefix}-tab-${track.key}`).click()
          const expectedCount = categoryArticles.filter(
            (article) => article.stageKey === track.key
          ).length
          assert(
            (await sectionPage.locator('.frontend-track-panel .article-index-list a').count()) === expectedCount,
            `${viewport.width}px AI 与 Agent 的「${track.label}」文章数量错误`
          )
        }
        await sectionPage.locator(`#${idPrefix}-tab-all`).click()
      }

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

  await page.goto(`${baseURL}/docs/ai-agent/context-window-strategies`, { waitUntil: 'networkidle' })
  const aiSidebarGroupLabels = await page.locator('.VPSidebarItem.level-0 > .item .text').allTextContents()
  assert(
    aiSidebarGroupLabels.map((label) => label.trim()).join('|') === sectionStages['ai-agent'].map((track) => track.label).join('|'),
    'AI 与 Agent 左侧一级目录没有与栏目 Tab 保持一致'
  )
  const contextTrack = sectionTrackGroups('ai-agent').find((track) => track.key === 'context-memory')
  const contextSidebarGroup = page.locator('.VPSidebarItem.level-0').filter({ hasText: '上下文工程与记忆' }).first()
  assert(
    (await contextSidebarGroup.locator('a[href^="/docs/ai-agent/"]').count()) ===
      (contextTrack?.groups.flatMap((group) => group.items).length ?? 0),
    'AI 与 Agent 左侧专题没有包含外层专题中的全部文章'
  )
  assert(
    (await page.locator('.VPSidebarItem.is-active a[href="/docs/ai-agent/context-window-strategies"]').count()) === 1,
    'AI 与 Agent 左侧目录没有高亮当前文章'
  )

  await page.goto(`${baseURL}/docs/seo/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 25, 'SEO 栏目应展示 25 篇文章')
  for (const track of sectionStages.seo) {
    assert(
      (await page.getByText(track.label, { exact: true }).count()) > 0,
      `SEO 栏目缺少「${track.label}」分组`
    )
  }

  await page.goto(`${baseURL}/docs/backend/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 68, '后端栏目应展示 68 篇文章')
  assert((await page.getByText('68 篇文章', { exact: true }).count()) > 0, '后端栏目没有显示 68 篇文章数量')

  await page.goto(`${baseURL}/docs/ai-practice/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 10, 'AI 实践栏目应展示 10 篇文章')
  assert((await page.getByText('能力选型', { exact: true }).count()) > 0, 'AI 实践栏目缺少能力选型分组')
  assert((await page.getByText('Agent 协作', { exact: true }).count()) > 0, 'AI 实践栏目缺少 Agent 协作分组')
  assert((await page.getByText('MCP 实践', { exact: true }).count()) > 0, 'AI 实践栏目缺少 MCP 实践分组')
  assert((await page.getByText('Skill 实践', { exact: true }).count()) > 0, 'AI 实践栏目缺少 Skill 实践分组')
  assert((await page.getByText('研发交付', { exact: true }).count()) > 0, 'AI 实践栏目缺少研发交付分组')
  assert((await page.getByText('Harness 与工作系统', { exact: true }).count()) > 0, 'AI 实践栏目缺少 Harness 与工作系统分组')

  await page.goto(`${baseURL}/docs/onnx-practice/`, { waitUntil: 'networkidle' })
  assert((await page.locator('.article-index-list a').count()) === 1, 'ONNX 实践栏目应展示 1 篇文章')
  assert((await page.getByText('浏览器推理', { exact: true }).count()) > 0, 'ONNX 实践栏目缺少浏览器推理分组')

  await page.goto(`${baseURL}/docs/onnx-practice/squeezenet-browser-inference`, { waitUntil: 'networkidle' })
  const onnxLab = page.locator('.onnx-lab')
  await onnxLab.waitFor()
  assert((await onnxLab.locator('img').count()) === 1, 'ONNX 实验缺少内置样例图片')
  await onnxLab.getByRole('button', { name: 'WASM' }).click()
  await onnxLab.getByRole('button', { name: '运行整图分类' }).click()
  await onnxLab.locator('.onnx-lab__results li').first().waitFor({ timeout: 120_000 })
  assert((await onnxLab.locator('.onnx-lab__results li').count()) === 5, 'WASM 推理没有返回 5 个候选类别')
  assert((await onnxLab.getByText('模型认为整张图片最像什么', { exact: true }).count()) === 1, 'ONNX 实验缺少整图分类的中文问题')
  assert((await onnxLab.getByText('这是同一个问题的五个备选答案，不是图片中的五个物体。', { exact: true }).count()) === 1, 'ONNX 实验没有解释五项结果不是五个物体')
  assert((await onnxLab.locator('.onnx-lab__metrics dd').nth(1).textContent())?.trim() === 'WASM', '强制 WASM 没有使用 WASM 后端')
  assert(!((await onnxLab.locator('.onnx-lab__metrics dd').nth(3).textContent())?.includes('—')), 'ONNX 实验没有记录预处理耗时')
  assert(!((await onnxLab.locator('.onnx-lab__metrics dd').nth(4).textContent())?.includes('—')), 'ONNX 实验没有记录推理耗时')
  const wasmResults = await onnxLab.locator('.onnx-lab__results li').allTextContents()
  const wasmProbabilities = wasmResults.map((item) => Number(item.match(/([\d.]+)%/)?.[1] ?? 0))
  assert(wasmResults.every((item) => item.trim().length > 4), 'WASM 候选类别存在空标签')
  assert(
    wasmProbabilities.every((value, index) => value > 0 && value <= 100 && (index === 0 || value <= wasmProbabilities[index - 1])),
    'WASM 候选类别的概率无效或没有按降序排列'
  )
  await onnxLab.getByRole('button', { name: '分析模型关注区域' }).click()
  await onnxLab.locator('.onnx-lab__attention-map span').first().waitFor({ timeout: 180_000 })
  assert((await onnxLab.locator('.onnx-lab__attention-map span').count()) === 25, '关注区域分析没有生成 25 个热力格')
  assert(!((await onnxLab.locator('.onnx-lab__metrics dd').nth(5).textContent())?.includes('—')), 'ONNX 实验没有记录关注分析耗时')
  assert(
    (await onnxLab.getByText('这只能说明模型依赖哪个区域，不能证明模型明确识别出了耳朵、毛发等具名特征。', { exact: true }).count()) === 1,
    'ONNX 实验没有说明关注区域的解释边界'
  )

  await onnxLab.getByRole('tab', { name: '目标检测' }).click()
  await onnxLab.getByRole('button', { name: '运行目标检测' }).click()
  await Promise.race([
    onnxLab.locator('.onnx-lab__detections').waitFor({ timeout: 120_000 }),
    onnxLab.locator('.onnx-lab__error').waitFor({ timeout: 120_000 })
  ])
  assert((await onnxLab.locator('.onnx-lab__error').count()) === 0, 'WASM 目标检测运行失败')
  const detectionCount = await onnxLab.locator('.onnx-lab__detection-item').count()
  assert(detectionCount >= 2, '内置猫图在默认阈值下没有返回预期的候选目标')
  assert((await onnxLab.locator('.onnx-lab__detection-item').filter({ hasText: '猫' }).count()) >= 1, '目标检测没有返回中文“猫”')
  assert((await onnxLab.locator('.onnx-lab__detection-overlay .onnx-lab__detection-box').count()) === detectionCount, '检测框数量与文字结果不一致')
  assert((await onnxLab.locator('.onnx-lab__detection-summary').textContent())?.includes('猫'), '目标检测中文总结没有说明识别到猫')
  const detectionInferenceMs = (await onnxLab.locator('.onnx-lab__metrics dd').nth(4).textContent())?.trim()
  await onnxLab.locator('#onnx-detection-threshold').fill('0.4')
  await onnxLab.getByText('没有重复运行模型', { exact: false }).waitFor({ timeout: 10_000 })
  assert((await onnxLab.locator('.onnx-lab__detection-item').count()) < detectionCount, '调高置信度阈值后检测结果没有减少')
  assert((await onnxLab.locator('.onnx-lab__metrics dd').nth(4).textContent())?.trim() === detectionInferenceMs, '调整阈值后重复执行了模型推理')

  await onnxLab.getByRole('tab', { name: '整图分类' }).focus()
  await page.keyboard.press('End')
  assert(
    await onnxLab.getByRole('tab', { name: '目标检测' }).evaluate((element) => document.activeElement === element),
    'ONNX 模式控件不支持 End 键'
  )
  await page.keyboard.press('Home')
  assert(
    await onnxLab.getByRole('tab', { name: '整图分类' }).evaluate((element) => document.activeElement === element),
    'ONNX 模式控件不支持 Home 键'
  )

  await onnxLab.getByRole('button', { name: '自动' }).click()
  await onnxLab.getByRole('button', { name: '运行整图分类' }).click()
  await onnxLab.locator('.onnx-lab__results li').first().waitFor({ timeout: 120_000 })
  const automaticBackend = (await onnxLab.locator('.onnx-lab__metrics dd').nth(1).textContent())?.trim()
  assert(['WEBGPU', 'WASM'].includes(automaticBackend ?? ''), '自动模式没有选择 WebGPU 或 WASM')
  if (automaticBackend === 'WASM') {
    assert(
      (await onnxLab.locator('.onnx-lab__notice').textContent())?.includes('自动模式已回退到 WASM'),
      'WebGPU 不可用时没有显示明确的 WASM 回退状态'
    )
  }

  await onnxLab.getByRole('button', { name: 'WebGPU' }).click()
  await onnxLab.getByRole('button', { name: '运行整图分类' }).click()
  await Promise.race([
    onnxLab.locator('.onnx-lab__results li').first().waitFor({ timeout: 120_000 }),
    onnxLab.locator('.onnx-lab__error').waitFor({ timeout: 120_000 })
  ])
  const webGpuState = await onnxLab.locator('.onnx-lab__results li').count() > 0
    ? 'success'
    : (await onnxLab.locator('.onnx-lab__error').getAttribute('data-error-code')) === 'webgpu_unavailable'
      ? 'unavailable'
      : 'unexpected_error'
  assert(webGpuState !== 'unexpected_error', '显式 WebGPU 失败没有返回 webgpu_unavailable 错误码')

  await onnxLab.getByRole('button', { name: 'WASM' }).click()
  const fileInput = onnxLab.locator('input[type="file"]')
  await fileInput.setInputFiles(path.join(process.cwd(), 'public/images/onnx/domestic-cat-2011-g02-960.jpg'))
  assert((await onnxLab.getByRole('button', { name: '恢复内置猫图' }).count()) === 1, '上传图片后没有显示恢复内置猫图按钮')
  await onnxLab.getByRole('button', { name: '运行整图分类' }).click()
  await onnxLab.locator('.onnx-lab__results li').first().waitFor({ timeout: 120_000 })
  assert((await onnxLab.locator('.onnx-lab__results li').count()) === 5, '上传图片后没有重新返回 5 个候选类别')
  await onnxLab.getByRole('tab', { name: '目标检测' }).click()
  await onnxLab.getByRole('button', { name: '运行目标检测' }).click()
  await onnxLab.locator('.onnx-lab__detections').waitFor({ timeout: 120_000 })
  assert((await onnxLab.locator('.onnx-lab__detection-item').filter({ hasText: '猫' }).count()) >= 1, '上传图片后没有重新检测到中文“猫”')
  await onnxLab.getByRole('button', { name: '恢复内置猫图' }).click()
  assert((await onnxLab.getByRole('button', { name: '恢复内置猫图' }).count()) === 0, '恢复内置猫图后上传状态没有清除')

  await onnxLab.getByRole('button', { name: '自动' }).focus()
  await page.keyboard.press('End')
  assert(
    await onnxLab.getByRole('button', { name: 'WASM' }).evaluate((element) => document.activeElement === element),
    'ONNX 后端控件不支持 End 键'
  )
  await page.keyboard.press('Home')
  assert(
    await onnxLab.getByRole('button', { name: '自动' }).evaluate((element) => document.activeElement === element),
    'ONNX 后端控件不支持 Home 键'
  )
  await page.keyboard.press('ArrowRight')
  assert(
    await onnxLab.getByRole('button', { name: 'WebGPU' }).evaluate((element) => document.activeElement === element),
    'ONNX 后端控件不支持方向键切换'
  )
  const modelResponse = await page.request.get(`${baseURL}/models/onnx/squeezenet1.0-12.onnx`)
  assert(modelResponse.status() === 200, 'ONNX 模型静态资源不可访问')
  const detectionModelResponse = await page.request.get(`${baseURL}/models/onnx/yolox-nano-416.onnx`)
  assert(detectionModelResponse.status() === 200, 'YOLOX-Nano 模型静态资源不可访问')

  for (const removedRoute of ['/docs/architecture/ai-system-seven-layers', '/docs/engineering/systematic-debugging', '/docs/ai-practice/codex-claude-code-rules', '/docs/ai-agent/pgvector-index-recall', '/docs/ai-practice/python-mcp-server-practice']) {
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

  await page.goto(`${baseURL}/docs/ai-agent/llm-workflow-rag-agent`, { waitUntil: 'networkidle' })
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
  await page.goto(`${baseURL}/docs/ai-agent/agent-request-lifecycle-runtime`, { waitUntil: 'networkidle' })
  assert((await page.locator('.VPSidebar').count()) === 1, '文章页缺少左侧导航')
  assert((await page.locator('.VPDocAside').count()) === 1, '文章页缺少右侧目录')
  const aiSidebar = page.locator('.VPSidebar')
  const aiSidebarGroups = aiSidebar.locator('.VPSidebarItem.level-0.collapsible')
  assert((await aiSidebarGroups.count()) === sectionStages['ai-agent'].length, 'AI 文章侧栏主题数量与栏目 Tab 不一致')
  const aiSidebarLabels = await aiSidebarGroups.locator(':scope > .item > .text').allTextContents()
  assert(
    aiSidebarLabels.map((label) => label.trim()).join('|') ===
      sectionStages['ai-agent'].map((track) => track.label).join('|'),
    'AI 文章侧栏主题文案或顺序与栏目 Tab 不一致'
  )
  assert(
    (await aiSidebar.getByText('推荐阅读顺序', { exact: true }).count()) === 0 &&
      (await aiSidebar.getByText('专题阅读', { exact: true }).count()) === 0,
    'AI 文章侧栏仍展示旧阅读路径分组'
  )
  assert(
    (await aiSidebar.locator('a[href^="/docs/ai-agent/"]').count()) ===
      articles.filter((article) => article.category === 'ai-agent').length + 1,
    'AI 文章侧栏没有包含栏目入口和全部文章'
  )
  const activeAiSidebarGroup = aiSidebar.locator('.VPSidebarItem.level-0.has-active')
  const runtimeArticle = articles.find((article) => article.slug === 'agent-request-lifecycle-runtime')
  const expectedRuntimeTrack = sectionStages['ai-agent'].find(
    (track) => track.key === runtimeArticle?.stageKey
  )
  assert(
    (await activeAiSidebarGroup.locator(':scope > .item > .text').textContent())?.trim() === expectedRuntimeTrack?.label &&
      !(await activeAiSidebarGroup.getAttribute('class'))?.includes('collapsed'),
    'AI 文章当前主题没有自动展开'
  )

  for (const section of sections) {
    const article = articles.find((entry) => entry.category === section.key)
    if (!article) continue
    await page.goto(`${baseURL}${articlePath(article)}`, { waitUntil: 'domcontentloaded' })
    const sidebarGroups = page.locator('.VPSidebar .VPSidebarItem.level-0.collapsible')
    const sidebarLabels = await sidebarGroups.locator(':scope > .item > .text').allTextContents()
    const expectedLabels = sectionTrackGroups(section.key).map((track) => track.label)
    assert(
      sidebarLabels.map((label) => label.trim()).join('|') === expectedLabels.join('|'),
      `${section.title} 左侧目录与栏目 Tab 的分组或顺序不一致`
    )
    assert(
      (await sidebarGroups.locator('.VPSidebarItem.collapsible').count()) === 0,
      `${section.title} 左侧目录不应在栏目 Tab 分组下重复嵌套小节`
    )
    assert(
      (await page.locator('.VPSidebarItem.level-0.has-active').count()) === 1,
      `${section.title} 左侧目录没有只展开当前一级分组`
    )
  }

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
