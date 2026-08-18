import { aiAgentCurriculum, aiAgentStages } from './ai-agent-curriculum'

export type Category =
  | 'ai-agent'
  | 'seo'
  | 'frontend'
  | 'algorithms'
  | 'backend'
  | 'devops'
  | 'ai-practice'
  | 'onnx-practice'

export type PracticeType =
  | 'walkthrough'
  | 'diagnosis'
  | 'implementation'
  | 'decision'

export type EvidenceType =
  | 'official'
  | 'public-source'
  | 'public-product-evidence'
  | 'anonymized-practice'
  | 'official-guided-operation'
  | 'existing-content'


export interface ChapterMeta {
  title: string
  description: string
  category: Category
  part: string
  stageKey: string
  chapter: number
  slug: string
  tags: string[]
  prerequisites?: string[]
  outcomes?: string[]
  practice?: {
    type: PracticeType
    result: string
    verify: string[]
  }
  evidence?: EvidenceType
  sourceKey?: string
  contentLocked?: true
  sequence?: number
  dependsOn?: string[]
}

export interface SectionMeta {
  key: Category
  title: string
  description: string
  path: string
}

export interface SectionStageMeta {
  key: string
  label: string
}

export const sectionStages: Record<Category, SectionStageMeta[]> = {
  'ai-agent': aiAgentStages,
  seo: [
    { key: 'growth', label: '搜索增长与项目判断' },
    { key: 'search-system', label: '搜索系统与页面规划' },
    { key: 'page-content', label: '页面内容与结构化信息' },
    { key: 'evidence-audit', label: '页面审计与证据模型' },
    { key: 'technical-site', label: '技术交付与站点审计' },
    { key: 'measurement', label: '搜索数据与业务归因' },
    { key: 'international-tracking', label: '国际 SEO 与分析追踪' },
    { key: 'sem', label: 'SEM 与协同增长' }
  ],
  frontend: [
    { key: 'fundamentals', label: '基础与手写' },
    { key: 'typescript', label: 'TypeScript' },
    { key: 'react', label: 'React' },
    { key: 'vue', label: 'Vue' },
    { key: 'tooling', label: '构建工具' },
    { key: 'engineering', label: '工程专题' }
  ],
  algorithms: [
    { key: 'foundations', label: '基础与复杂度' },
    { key: 'linear', label: '线性结构' },
    { key: 'trees-graphs', label: '树与图' },
    { key: 'search-string', label: '查找与字符串' },
    { key: 'paradigms', label: '算法思想' },
    { key: 'design', label: '综合设计' }
  ],
  backend: [
    { key: 'runtime-basics', label: '基础与运行环境' },
    { key: 'network-api', label: '网络与 API' },
    { key: 'database', label: '数据库与事务' },
    { key: 'async-data', label: '缓存、消息与异步' },
    { key: 'security', label: '认证与安全' },
    { key: 'quality', label: '测试、性能与观测' },
    { key: 'delivery', label: '部署与综合项目' }
  ],
  devops: [
    { key: 'runtime-containers', label: '运行与容器' },
    { key: 'ai-backend', label: 'AI Backend' },
    { key: 'model-serving', label: '模型推理服务' },
    { key: 'gpu', label: 'GPU' },
    { key: 'kubernetes', label: 'Kubernetes' },
    { key: 'platform', label: '平台安全与观测' },
    { key: 'training', label: '分布式训练' },
    { key: 'delivery', label: '发布与恢复' }
  ],
  'ai-practice': [
    { key: 'selection', label: '能力选型' },
    { key: 'collaboration', label: 'Agent 协作' },
    { key: 'mcp-practice', label: 'MCP 实践' },
    { key: 'skill-practice', label: 'Skill 实践' },
    { key: 'delivery', label: '研发交付' },
    { key: 'harness-system', label: 'Harness 与工作系统' }
  ],
  'onnx-practice': [
    { key: 'browser-inference', label: '浏览器推理' }
  ]
}

const aiAgentSpecBySlug = new Map(aiAgentCurriculum.map((article) => [article.slug, article]))

function oneOf(value: string, values: readonly string[]): boolean {
  return values.includes(value)
}

export function stageKeyFor(category: Category, slug: string, part: string): string {
  if (category === 'ai-agent') {
    return aiAgentSpecBySlug.get(slug)?.stageKey ?? 'foundations'
  }

  if (category === 'seo') {
    if (oneOf(slug, ['search-growth-model', 'seo-project-evaluation'])) return 'growth'
    if (oneOf(slug, ['crawl-index-ranking', 'keyword-intent-page-mapping', 'site-structure-page-planning'])) return 'search-system'
    if (oneOf(slug, ['on-page-seo-structured-data', 'content-ai-media-topic-pages', 'media-video-structured-data'])) return 'page-content'
    if (oneOf(slug, ['browser-page-seo-audit', 'seo-evidence-scoring-boundaries', 'seo-optimizer-chrome-extension'])) return 'evidence-audit'
    if (oneOf(slug, ['technical-seo-rendering-performance', 'developer-performance-optimization', 'http-javascript-rendering-seo', 'robots-sitemap-canonical-strategy', 'crawl-index-duplicate-troubleshooting'])) return 'technical-site'
    if (oneOf(slug, ['links-brand-analytics-attribution', 'search-performance-attribution'])) return 'measurement'
    if (oneOf(slug, ['international-seo-hreflang', 'analytics-tracking-evidence'])) return 'international-tracking'
    return 'sem'
  }

  if (category === 'frontend') {
    if (slug.startsWith('relearn/') || part === '基础与手写') return 'fundamentals'
    if (part === 'TypeScript' || slug === 'typescript-type-system-engineering') return 'typescript'
    if (part === 'React' || oneOf(slug, ['react-fiber-concurrent-rendering', 'nextjs-rendering-cache-invalidation'])) return 'react'
    if (part === 'Vue' || slug === 'vue-reactivity-scheduler') return 'vue'
    if (part === '构建工具' || part === '现代前端：构建工具') return 'tooling'
    return 'engineering'
  }

  if (category === 'algorithms') {
    if (oneOf(slug, ['dataStructures', 'complexity'])) return 'foundations'
    if (oneOf(slug, ['array', 'string', 'stack', 'queue', 'chain', 'chainHead', 'chainCicle'])) return 'linear'
    if (oneOf(slug, ['tree', 'ergodicTree', 'bstTree', 'DFS', 'bfs-topological-shortest-path'])) return 'trees-graphs'
    if (oneOf(slug, ['binary-search-boundaries', 'kmp-string-matching'])) return 'search-string'
    if (oneOf(slug, ['sort', 'thinking', 'dynamic', 'greedy-intervals'])) return 'paradigms'
    return 'design'
  }

  if (category === 'backend') {
    if (oneOf(part, ['后端基础', 'Linux 运行基础'])) return 'runtime-basics'
    if (oneOf(part, ['网络与请求链', 'API 设计'])) return 'network-api'
    if (/^(?:MySQL|ORM|事务)/.test(part)) return 'database'
    if (oneOf(part, ['Redis', '消息与任务', '文件与对象'])) return 'async-data'
    if (part.startsWith('认证')) return 'security'
    if (oneOf(part, ['测试', '性能', '观测与治理'])) return 'quality'
    return 'delivery'
  }

  if (category === 'devops') {
    const partNumber = part.match(/^第([一二三四五六七八])部分/)?.[1]
    const stages = { 一: 'runtime-containers', 二: 'ai-backend', 三: 'model-serving', 四: 'gpu', 五: 'kubernetes', 六: 'platform', 七: 'training', 八: 'delivery' } as const
    return stages[partNumber as keyof typeof stages] ?? 'runtime-containers'
  }

  if (category === 'ai-practice') {
    if (part === '能力选型') return 'selection'
    if (part === 'Agent 协作') return 'collaboration'
    if (part === 'MCP 实践') return 'mcp-practice'
    if (part === 'Skill 实践') return 'skill-practice'
    if (part === '研发交付') return 'delivery'
    return 'harness-system'
  }

  return 'browser-inference'
}

export interface SectionTrackGroup {
  key: string
  label: string
  groups: Array<{
    key: string
    label: string
    items: ChapterMeta[]
  }>
}

export function displayPart(part: string): string {
  return part.replace(/^第[一二三四五六七八九十]+部分[：:]?\s*/, '')
}

export function sectionTrackGroups(category: Category, items = articlesByCategory(category)): SectionTrackGroup[] {
  return sectionStages[category].map((track) => {
    const trackItems = items.filter((item) => item.stageKey === track.key)
    const groups = [...new Map(trackItems.map((item) => [item.part, item])).keys()].map((part) => ({
      key: part,
      label: displayPart(part),
      items: trackItems.filter((item) => item.part === part)
    }))
    return { ...track, groups }
  })
}

export const sections: SectionMeta[] = [
  { key: 'ai-agent', title: 'AI 与 Agent', description: '从模型输入输出开始，逐步构建具备检索、工具、记忆、证据和质量治理的知识 Agent。', path: '/docs/ai-agent/' },
  { key: 'seo', title: 'SEO 与增长', description: '沿需求、页面、抓取、索引、排名、点击、转化和搜索广告建立完整增长方法。', path: '/docs/seo/' },
  { key: 'frontend', title: '前端', description: '从语言、浏览器和框架内部机制走向构建、质量、性能、安全与跨端工程。', path: '/docs/frontend/' },
  { key: 'algorithms', title: '算法', description: '从数据结构、不变量和复杂度出发，用 TypeScript 推导并验证常见算法。', path: '/docs/algorithms/' },
  { key: 'backend', title: '后端', description: '系统学习网络、Linux、API、MySQL、事务、安全、缓存、消息、测试、性能、部署与企业项目。', path: '/docs/backend/' },
  { key: 'devops', title: 'AI Infra 工程', description: '从运行底座、AI Backend 和模型服务走向 GPU、Kubernetes、企业平台、分布式训练与可靠交付。', path: '/docs/devops/' },
  { key: 'ai-practice', title: 'AI 实践', description: '从核心概念、Agent 协作和能力扩展走向研发闭环、Harness 与个人全栈工作系统。', path: '/docs/ai-practice/' },
  { key: 'onnx-practice', title: 'ONNX 实践', description: '把轻量 ONNX 模型放进浏览器，沿图片预处理、Worker、WebGPU、WASM 和性能数据走完一次端侧推理。', path: '/docs/onnx-practice/' }
]

type ChapterInput = Omit<ChapterMeta, 'category' | 'chapter' | 'stageKey'>

const course = (category: Category, items: ChapterInput[]): ChapterMeta[] =>
  items.map((item, index) => ({
    ...item,
    category,
    stageKey: stageKeyFor(category, item.slug, item.part),
    chapter: index + 1,
  }))

const item = (
  part: string,
  slug: string,
  title: string,
  description: string,
  tags: string[],
  prerequisites: string[],
  outcomes: string[],
  result: string,
  verify: string[],
  evidence: EvidenceType,
  type: PracticeType = 'walkthrough',
  contentLocked?: true
): ChapterInput => ({
  part,
  slug,
  title,
  description,
  tags,
  prerequisites,
  outcomes,
  practice: { type, result, verify },
  evidence,
  ...(contentLocked ? { contentLocked } : {})
})

const aiAgentStageLabelByKey = new Map(aiAgentStages.map((stage) => [stage.key, stage.label]))

const aiAgentArticles: ChapterMeta[] = aiAgentCurriculum.map((article, index) => ({
  ...article,
  category: 'ai-agent',
  part: aiAgentStageLabelByKey.get(article.stageKey) ?? article.stageKey,
  chapter: index + 1,
  sequence: index + 1,
}))

const seoArticles = course('seo', [
  item('搜索增长与项目判断', 'search-growth-model', 'SEO、SEM、GEO 与搜索增长全景', '沿需求、页面、发现、抓取、索引、排名、点击、转化和收入，分清自然搜索、搜索广告与生成式搜索各自能证明什么。', ['SEO', 'SEM', 'GEO'], ['了解网站基本组成'], ['画出搜索增长漏斗', '区分流量指标与业务结果'], '建立一张从需求到收入的诊断表', ['每一层都有证据字段', '数据缺口被明确记录'], 'official', 'decision'),
  item('搜索增长与项目判断', 'seo-project-evaluation', '搜索项目评估、目标设定与数据基线', '在生产内容或购买流量前，核对需求、业务匹配、竞争、交付能力、现金流与测量条件。', ['SEO', 'Project Evaluation'], ['理解搜索增长漏斗'], ['判断项目是否值得进入搜索渠道', '建立可比较的数据基线'], '完成一份项目评估卡', ['结论包含机会、成本和停止条件', '事实、假设与缺口分开'], 'official', 'decision'),
  item('搜索系统与页面规划', 'crawl-index-ranking', '搜索引擎怎样发现、抓取、索引和排名', '沿链接发现、抓取、渲染、索引、查询和排序理解网页进入搜索结果的全过程。', ['Crawl', 'Index'], ['HTTP 状态码基础'], ['定位页面卡在哪个阶段', '正确使用 robots、noindex 与 Sitemap'], '用匿名 GET 和页面源码检查一个 URL', ['区分原始 HTML 与渲染 DOM', '能解释 200 页面为何仍可能不收录'], 'official-guided-operation', 'diagnosis'),
  item('搜索系统与页面规划', 'keyword-intent-page-mapping', '关键词、搜索意图与页面映射', '从用户任务出发，识别意图、主题、实体和修饰词，再决定一个查询应由哪类页面承接。', ['Keyword', 'Search Intent'], ['理解搜索增长漏斗'], ['建立关键词簇', '避免多个页面争夺同一任务'], '制作一张关键词到页面的映射表', ['每个关键词有意图和证据', '重复任务被合并或区分'], 'official', 'decision'),
  item('搜索系统与页面规划', 'site-structure-page-planning', '页面规划、网站结构、URL 与内链', '把查询与页面映射变成栏目、专题、详情页、面包屑和上下文内链，并识别孤立页候选。', ['Information Architecture', 'URL'], ['完成关键词与页面映射'], ['设计稳定 URL', '让重要页面在合理点击深度内可达'], '画出一个小型网站的页面树和内链图', ['不存在未经解释的孤立核心页', '参数页和规范页策略一致'], 'official', 'implementation'),
  item('页面内容与结构化信息', 'on-page-seo-structured-data', '页面 SEO、Canonical 与结构化数据', '把标题、摘要、H1、正文、链接、Canonical 和 Schema 组织成同一页面承诺，并核对最终 HTML 与可见事实。', ['On-page SEO', 'Structured Data'], ['HTML 基础', '理解页面职责'], ['审查页面的基础 SEO', '避免模板冲突和虚假标记'], '完成页面检查与 JSON-LD 校验', ['原始 HTML 中元信息完整', '结构化数据字段可在页面中核对'], 'official-guided-operation', 'implementation'),
  item('页面内容与结构化信息', 'content-ai-media-topic-pages', 'AI 辅助内容、证据与主题集群', '从页面任务、资料来源、独有信息与维护责任建立可核验的 AI 辅助内容流程。', ['Content', 'GEO'], ['理解查询与页面映射'], ['判断 AI 辅助内容是否解决真实任务', '为重要结论建立来源与维护责任'], '为一个主题集群制作内容简报和证据清单', ['每个重要结论有来源', '每个页面有独立任务与维护责任'], 'official', 'decision'),
  item('页面内容与结构化信息', 'media-video-structured-data', '图片、视频与媒体 SEO', '从语义、尺寸、加载优先级、失败路径和可见内容出发，配置图片、视频与媒体结构化信息。', ['Image SEO', 'Video SEO'], ['理解页面内容与结构化数据'], ['配置图片语义与加载优先级', '验证媒体 Schema 与可见内容一致'], '完成媒体资源规格与检查表', ['首屏和屏外媒体策略不同', '媒体字段与可见内容一致'], 'official-guided-operation', 'implementation'),
  item('页面审计与证据模型', 'seo-evidence-scoring-boundaries', 'SEO 诊断的证据、评分与边界', '拆开适用规则、已测规则、覆盖率、置信度、严重问题封顶和无法检测项，避免把审计分数当成排名结论。', ['Evidence', 'SEO Audit'], ['理解搜索漏斗与页面类型'], ['解释 SEO 分数的计算条件', '区分事实、风险候选与检测边界'], '建立证据等级与 P0-P3 任务模板', ['不可测项不被当作失败', '每项任务包含证据、验证与回滚'], 'public-product-evidence', 'diagnosis'),
  item('页面审计与证据模型', 'browser-page-seo-audit', '页面 SEO 六类规则与证据采集', '比较匿名 GET、原始 HTML、渲染 DOM、HTTP、Canonical、robots、资源与 Schema 证据，形成可复查的单页审计。', ['Browser Extension', 'SEO Audit'], ['理解页面 SEO 与证据状态'], ['设计页面审计快照', '区分评分、证据和修复优先级'], '对匿名页面执行一次浏览器侧审计', ['每条发现包含证据和复查方法', '不把工具分数等同于排名'], 'public-product-evidence', 'implementation'),
  item('页面审计与证据模型', 'seo-optimizer-chrome-extension', '页面审计如何从发现走到复验', '把规则发现、页面标注、证据核对、修复交付和重新验证连接起来，说明浏览器审计与站外数据的职责边界。', ['SEO Audit', 'Verification'], ['理解单页审计的证据来源'], ['按证据而不是分数安排修复', '知道何时需要日志或平台数据'], '完成一次发现、修复与复验记录', ['修复前后使用同一条规则和样本', '页面工具不能证明的结果被明确标记'], 'public-product-evidence', 'implementation'),
  item('技术交付与站点审计', 'robots-sitemap-canonical-strategy', 'Robots、Sitemap、Canonical 与索引治理', '区分抓取控制、索引控制和规范网址，并让 robots、Sitemap、Canonical、内链与页面目标保持一致。', ['Robots', 'Sitemap', 'Canonical'], ['理解发现、抓取与索引的区别'], ['决定哪些 URL 应被抓取和索引', '消除 Sitemap 与页面信号冲突'], '完成全站索引治理矩阵', ['每类 URL 有明确目标', '抽查结果与矩阵一致'], 'official-guided-operation', 'implementation'),
  item('技术交付与站点审计', 'http-javascript-rendering-seo', 'HTTP、JavaScript 渲染与搜索可访问性', '比较匿名 GET、原始 HTML、渲染 DOM、资源响应和失败路径，判断搜索系统能否稳定取得主要内容。', ['HTTP', 'Rendering'], ['HTTP 与 HTML 基础', '理解索引治理信号'], ['检查状态、跳转和渲染差异', '识别爬虫资源访问风险'], '完成原始响应与渲染结果对照表', ['关键内容不依赖脆弱交互', '失败路径有服务端证据'], 'official-guided-operation', 'diagnosis'),
  item('技术交付与站点审计', 'technical-seo-rendering-performance', 'Core Web Vitals：Field、Lab 与单次访问证据', '区分真实用户数据、实验室测试与浏览器单次访问，读懂 LCP、INP、CLS、FCP 和 TTFB 的用途与检测边界。', ['Technical SEO', 'Performance'], ['HTTP 与浏览器基础'], ['区分 Field Data、Lab Data 与单次会话数据', '使用性能指标定位页面体验问题'], '为关键页面制作性能指标诊断表', ['每个数值标明数据来源、设备、周期和统计口径', '不能检测的 INP 与 Field Data 不被补造'], 'public-product-evidence', 'diagnosis'),
  item('技术交付与站点审计', 'developer-performance-optimization', '开发侧性能优化与验证', '把性能证据拆到服务器、资源发现、主线程、布局和缓存任务，并建立基线、复测与回滚。', ['Web Performance', 'Performance Budget'], ['Web 开发基础', '理解性能指标证据边界'], ['定位 LCP、INP、CLS 和 TTFB 根因', '按影响与风险安排开发任务'], '完成开发优化任务单与性能预算', ['实验室与真实用户指标分别验收', '改动包含回滚条件'], 'official-guided-operation', 'implementation'),
  item('技术交付与站点审计', 'crawl-index-duplicate-troubleshooting', '站点抽样、重复页面与收录异常排查', '从 Sitemap、robots 和 20/50/100 页同源抽样进入模板、近似重复、孤立页候选与收录异常诊断。', ['Troubleshooting', 'Duplicate Content'], ['理解索引治理与渲染证据'], ['使用诊断树缩小问题范围', '区分已确认问题与抽样候选'], '完成一份站点审计与 P0-P3 排障报告', ['每个问题有证据、动作、验证和回滚', '抽样候选不被写成全站事实'], 'public-product-evidence', 'diagnosis'),
  item('搜索数据与业务归因', 'links-brand-analytics-attribution', '外链、品牌提及与站外增长', '从可引用资产、来源语境、链接关系和业务结果评估站外增长，避免把链接数量当作目标。', ['Links', 'Brand'], ['理解搜索增长漏斗'], ['识别值得获取的链接', '区分品牌提及、引荐访问与业务结果'], '评估一批新增链接与品牌提及', ['记录来源语境、关系属性与目标受众', '业务结果带有证据置信度'], 'official', 'decision'),
  item('搜索数据与业务归因', 'search-performance-attribution', '搜索表现分析与 SEO 归因', '用 Google、Bing 和百度搜索 CSV 分析展现、点击、CTR、平均位置、4-20 位页面、品牌流量和查询页面冲突。', ['Search Console', 'Attribution'], ['理解查询、页面和业务漏斗'], ['寻找可验证的搜索增长机会', '建立等长周期和置信度口径'], '制作查询页面分析表与数据字典', ['品牌与非品牌分开', '搜索指标与有效业务结果相连'], 'public-product-evidence', 'diagnosis'),
  item('国际 SEO 与分析追踪', 'international-seo-hreflang', '国际 SEO：语言页面、Canonical 与 hreflang', '从目标语言和地区出发，核对 html lang、Canonical、hreflang 自引用、互返和关联页面可访问性。', ['International SEO', 'hreflang'], ['理解规范网址与索引治理'], ['设计多语言 URL 与关联关系', '区分国际 SEO 问题、机会和检测边界'], '完成一组语言页面的关联验证表', ['每个语言页自引用且互返', '未知目标市场不会被误报为问题'], 'official-guided-operation', 'implementation'),
  item('国际 SEO 与分析追踪', 'analytics-tracking-evidence', '分析追踪的五层证据与跨域归因', '区分标签存在、浏览器初始化、浏览器请求、平台接收和后端有效业务，并说明 GA4、GTM、Ads、UET、Clarity、Consent 与跨域追踪的适用条件。', ['GA4', 'GTM', 'UET', 'Consent'], ['理解搜索数据与业务归因'], ['按五层证据诊断追踪', '验证成功、失败、拒绝同意和跨域路径'], '完成追踪证据与业务对账表', ['前一层证据不冒充后一层', '不使用个人信息强行关联'], 'public-product-evidence', 'diagnosis'),
  item('SEM 与协同增长', 'sem-account-keywords-landing', 'SEM 搜索广告的账户、关键词与落地页', '从业务目标和查询意图建立账户、广告组、关键词、创意与落地页的第一层映射。', ['SEM', 'Search Ads'], ['理解搜索增长与项目基线'], ['建立可控制的搜索广告账户', '让查询、广告承诺和页面任务一致'], '完成账户与意图结构图', ['品牌与非品牌分开', '每个广告组有明确落地页任务'], 'official', 'implementation'),
  item('SEM 与协同增长', 'sem-search-terms-bidding-budget', '搜索词、匹配方式、出价与预算', '从真实搜索词管理匹配方式、否定词候选、CPC、预算、转化延迟和学习期，避免无证据调价。', ['Search Terms', 'Bidding'], ['理解账户与意图结构'], ['识别无效消耗候选', '制定预算与停止条件'], '完成搜索词治理和预算规则', ['否定词经过人工意图复核', '调整保留成熟观察窗口'], 'public-product-evidence', 'diagnosis'),
  item('SEM 与协同增长', 'sem-creative-landing-tracking', '广告创意、落地页与转化追踪', '连接创意承诺、页面任务、主要转化、有效线索、收入、退款和毛利。', ['Landing Page', 'Conversion Tracking'], ['理解搜索词与预算治理'], ['区分平台转化与有效业务', '评估归因数据的可信度'], '完成转化事件与归因验收表', ['主要和观察转化分开', '结果可关联到点击或受控归因键'], 'official-guided-operation', 'implementation'),
  item('SEM 与协同增长', 'sem-platform-diagnostics', 'Google、Bing 与百度投放诊断', '按追踪、搜索词、成本、创意页面、有效业务与预算顺序诊断平台自动化，不用平台汇总替代增量与毛利。', ['PMax', 'AI Max', 'oCPC'], ['理解转化追踪与有效业务'], ['按固定顺序排查广告异常', '为自动化投放设置数据边界'], '完成多平台诊断与止损清单', ['先验证追踪再调整预算', '自动化结果回到有效 CPA 与毛利'], 'public-product-evidence', 'diagnosis'),
  item('SEM 与协同增长', 'seo-sem-90-day-plan', 'SEO 与 SEM 的协同验证周期', '把需求验证、技术修复、内容建设、广告实验和业务复盘放进同一依赖顺序，同时保留学习期、转化延迟和停止条件。', ['SEO Operations', 'SEM Operations'], ['理解 SEO 与 SEM 的完整证据链'], ['按依赖和证据安排工作', '建立负责人、观察周期和复盘机制'], '完成搜索增长协同路线图', ['每阶段有停止条件和回滚', 'SEO 与 SEM 共享数据但不重复归因'], 'anonymized-practice', 'implementation')
])

const algorithmSpecs = [
  ['dataStructures', '数据结构基础', '从访问模式出发选择数组、链表、栈、队列、树与图。', ['数据结构']],
  ['complexity', '复杂度分析', '用时间和空间增长率评估算法，而不是只比较一次运行耗时。', ['复杂度']],
  ['array', '数组、哈希与双指针', '从两数之和开始，理解数组扫描、Map 查找和双指针移动为什么不会漏掉答案。', ['数组', '双指针']],
  ['string', '字符串算法', '从字符单位开始，学习规范化、双指针与滑动窗口。', ['字符串']],
  ['stack', '栈与括号匹配', '利用后进先出不变量解决匹配、撤销与表达式问题。', ['栈']],
  ['queue', '队列与滑动窗口', '用先进先出和单调队列处理任务流与窗口最大值。', ['队列', '滑动窗口']],
  ['chain', '链表合并与反转', '围绕 next 指针不变量完成链表反转与有序合并。', ['链表']],
  ['chainHead', '链表倒数节点与快慢指针', '通过固定间距指针处理倒数位置和删除操作。', ['链表', '双指针']],
  ['chainCicle', '环形链表', '使用快慢指针判断环、定位入口并分析相遇条件。', ['链表', '环检测']],
  ['sort', '排序算法', '理解稳定性、比较器、归并排序和不同数据分布下的取舍。', ['排序']],
  ['tree', '二叉树的迭代遍历', '用显式栈表达前序、中序和后序遍历。', ['二叉树']],
  ['ergodicTree', '二叉树的递归与层序遍历', '比较深度优先和广度优先的状态组织方式。', ['二叉树', '遍历']],
  ['bstTree', '二叉搜索树', '利用有序不变量完成查找、插入、删除和验证。', ['二叉搜索树']],
  ['DFS', '深度优先搜索', '用递归或栈探索树、图与组合空间。', ['DFS']],
  ['thinking', '递归与回溯思维', '把选择、约束、撤销抽象为可验证的搜索树。', ['递归', '回溯']],
  ['dynamic', '动态规划', '从重叠子问题和状态转移建立可复用的求解模型。', ['动态规划']]
] as const

const contentLockedAlgorithmArticles = course('algorithms', algorithmSpecs.map(([slug, title, description, tags]) =>
  item('算法与数据结构', slug, title, description, [...tags, 'TypeScript'], [], [], '', [], 'existing-content', 'walkthrough', true)
))

const newAlgorithmArticles = course('algorithms', [
  item("查找与字符串", "binary-search-boundaries", "二分查找的边界、不变量与答案空间", "从“第一个满足条件的位置”推导左右边界模板，解释循环不变量、终止条件和答案空间二分。", ["二分查找","TypeScript"], ["数组与复杂度基础"], ["能从不变量写出四类边界","能判断何时对答案空间二分"], "实现并测试四种二分边界", ["空数组、重复值和越界目标均通过","每轮搜索区间严格缩小"], "existing-content", "implementation", true),
  item("图与搜索", "bfs-topological-shortest-path", "BFS、拓扑排序与无权最短路", "从队列分层进入图的入度、拓扑序和无权最短路径，区分访问时机、环检测与路径恢复。", ["BFS","拓扑排序","TypeScript"], ["队列与图基础"], ["解释 BFS 分层不变量","用入度识别有向环"], "实现课程依赖排序和最短路径恢复", ["重复边与孤立点有明确处理","有环时不会返回伪拓扑序"], "existing-content", "implementation", true),
  item("贪心与区间", "greedy-intervals", "贪心算法与区间问题：选择、合并和覆盖", "用交换论证解释为什么按结束位置排序可以选出最多不重叠区间，并比较合并、覆盖与会议室问题。", ["贪心","区间","TypeScript"], ["排序与复杂度基础"], ["能提出并证明局部选择","区分三类区间状态"], "实现区间选择、合并和最少会议室", ["端点相等语义在测试中固定","反例能击穿错误排序策略"], "existing-content", "implementation", true),
  item("缓存数据结构", "lru-cache-design", "LRU Cache：哈希表与双向链表的协作", "从 O(1) 查询、更新和淘汰约束推导哈希表加双向链表，处理容量、覆盖、移动与哨兵节点。", ["LRU","哈希表","双向链表","TypeScript"], ["链表与 Map 基础"], ["推导 LRU 的组合数据结构","维护链表和缓存容量不变量"], "实现带哨兵节点的 LRU Cache", ["容量为零和重复写入均通过","每次操作后 Map 与链表节点一一对应"], "existing-content", "implementation", true),
  item("查找与字符串", "kmp-string-matching", "KMP 字符串匹配：前缀函数与失配回退", "从朴素匹配重复比较的问题进入最长相等真前后缀，逐步推导前缀表和失配时的状态转移。", ["KMP","字符串","TypeScript"], ["字符串与数组基础"], ["手算前缀函数","解释 KMP 为什么不回退主串指针"], "实现前缀函数与 KMP 搜索", ["重复模式和空模式语义明确","比较次数符合线性复杂度推导"], "existing-content", "implementation", true)
]).map((article, index) => ({ ...article, chapter: algorithmSpecs.length + index + 1 }))

const relearnSpecs = [
  ['overview/start', '重学前端：学习方法', '以规范、运行时和工程实践三条线重建前端知识体系', ['学习方法']],
  ['html/html_standard', 'HTML 标准与语言设计', '从源码到 DOM，理解 HTML 的解析、容错与元素行为', ['HTML']], ['html/html_DTD', 'DOCTYPE、DTD 与标准模式', '从一次布局差异理解现代 DOCTYPE 和历史兼容模式', ['HTML', 'DOCTYPE']], ['html/html_head', 'HTML Head 与元数据', '从浏览器加载顺序理解标题、编码、资源和搜索元数据', ['HTML', 'Metadata']], ['html/html_tag', '语义化 HTML', '从用户任务出发，选择自带正确行为的 HTML 元素', ['HTML', '语义化']], ['html/html_ARIA', 'ARIA 与可访问性语义', '从一个切换按钮理解角色、名称、状态和键盘行为', ['ARIA', 'Accessibility']], ['html/html_tramslate', '链接、资源与嵌入内容', '从 URL 解析到 iframe 隔离，理解浏览器如何加载外部内容', ['HTML', 'Resource']],
  ['css/css_rule', 'CSS At-rules 与规则系统', '从判断对象理解媒体、容器、能力、层叠和资源规则', ['CSS']], ['css/css_select', 'CSS 选择器与伪元素', '从匹配目标理解组合、优先级、状态伪类和生成内容', ['CSS', 'Selector']], ['css/css_compose', 'CSS 布局与格式化上下文', '从正常流、包含块和内容约束选择 Flex、Grid 与定位', ['CSS', 'Layout']], ['css/css_color', 'Web 色彩系统', '从颜色空间、透明度和对比度理解网页色彩', ['CSS', 'Color']], ['css/css_animation', 'CSS 动画与过渡', '从状态变化理解 transition、animation、性能和减弱动态效果', ['CSS', 'Animation']], ['css/css_link', 'CSS 与文档资源', '理解 link、样式表加载、资源提示和超链接关系', ['CSS', 'Resource']],
  ['javascript/js_type', 'JavaScript 类型系统', '掌握语言类型、转换、相等性和数值边界', ['JavaScript', 'Type']], ['javascript/js_object', 'JavaScript 对象模型', '从属性描述符理解对象、访问器、内建能力和函数调用', ['JavaScript', 'Object']], ['javascript/js_prototype', '原型与继承', '从属性查找理解 [[Prototype]]、new、class 与组合', ['JavaScript', 'Prototype']], ['javascript/js_function', 'JavaScript 函数', '从调用方式理解 this、普通函数、箭头函数、生成器和异步函数', ['JavaScript', 'Function']], ['javascript/js_closure', '作用域与闭包', '从词法环境和生命周期理解闭包、var、let 与 Realm', ['JavaScript', 'Closure']], ['javascript/js_eventLoop', '事件循环与任务队列', '用两次浏览器实验理解任务、微任务、渲染和异步竞态', ['JavaScript', 'Event Loop']], ['javascript/js_grammar', 'JavaScript 语法结构', '区分脚本、模块、声明、语句和表达式', ['JavaScript', 'Grammar']], ['javascript/js_token', 'JavaScript 词法系统', '理解空白、标识符、字面量、模板和正则的分词边界', ['JavaScript', 'Lexer']], ['javascript/js_semicolon', '自动分号插入', '用解析规则而不是代码风格争论理解 ASI', ['JavaScript', 'ASI']], ['javascript/js_completion', 'Completion Record 与控制流', '从规范完成记录理解 return、throw、break、finally 和表达式求值', ['JavaScript', 'Control Flow']],
  ['browser/browser_http', '浏览器网络与 HTTP', '从一次导航理解请求、缓存、HTTPS、HTTP/2 与 HTTP/3', ['Browser', 'HTTP']], ['browser/browser_dom', 'HTML 解析与 DOM 构建', '从字节流理解 tokenizer、tree builder、容错与脚本阻塞', ['Browser', 'DOM']], ['browser/browser_cssdom', 'CSSOM 与样式计算', '区分声明、层叠、计算值、实际几何和 CSSOM View', ['Browser', 'CSSOM']], ['browser/browser_domApi', 'DOM API 与节点操作', '从节点身份理解创建、移动、克隆、Range 与变更观察', ['Browser', 'DOM API']], ['browser/browser_event', 'DOM 事件系统', '从点击一个嵌套按钮开始，观察事件目标、捕获、冒泡、默认行为和事件委托。', ['Browser', 'Event']], ['browser/browser_maker', '浏览器布局与格式化上下文', '从 display、包含块、行盒、定位、浮动、Flex 和 Grid 理解几何', ['Browser', 'Layout']], ['browser/browser_css', '浏览器样式与布局过程', '从样式失效理解层叠、布局、绘制与合成的触发关系', ['Browser', 'Rendering']], ['browser/browser_print', '浏览器绘制与合成', '理解 paint order、display list、layer、raster 与 compositor', ['Browser', 'Rendering']],
  ['engineering/sum_architecture', '前端架构与组件化', '从职责、依赖和变化频率设计组件边界', ['Architecture']], ['engineering/sum_continue', '持续集成方法', '让自动检查成为可重复的质量反馈回路', ['CI']], ['engineering/sum_performance', '性能工程方法', '从指标、预算、测量到回归建立性能验证流程', ['Performance']], ['engineering/sum_system', '前端工程系统设计', '围绕开发、构建、发布和观测搭建工程系统', ['Engineering']], ['engineering/sum_tool', '前端工具链方法', '基于反馈周期和可替换性选择工具', ['Tooling']], ['questions/other_question', '前端常见问题与判断框架', '用规范、最小实验和工程约束回答前端开放问题', ['FAQ']]
] as const

const relearnArticles = course('frontend', relearnSpecs.map(([slug, title, description, tags]) =>
  item('重学前端', `relearn/${slug}`, title, description, [...tags], [], [], '', [], 'existing-content', 'walkthrough', true)
))

const frontendArticles = course('frontend', [
  item('现代前端：语言与运行时', 'typescript-type-system-engineering', 'TypeScript 类型系统、配置与运行时边界', '从不可信接口响应进入基础类型、编译擦除、运行时校验与严格工程配置，建立完整类型安全边界。', ['TypeScript'], ['JavaScript 基础'], ['建立可信数据边界', '读懂关键 tsconfig 选项'], '完成一条接口数据到页面状态的类型链', ['错误数据在边界被拒绝', '类型错误可在构建期发现'], 'public-source', 'implementation'),
  item('现代前端：语言与运行时', 'browser-render-event-loop', '浏览器渲染、事件循环与任务调度', '从点击后页面卡顿的现象出发，串起任务、微任务、渲染机会、长任务和调度。', ['Browser', 'Event Loop'], ['JavaScript 异步基础'], ['解释一帧内任务顺序', '用 Performance 面板定位长任务'], '运行并记录一次任务顺序实验', ['输出顺序与解释一致', '能指出渲染被阻塞的位置'], 'public-source', 'diagnosis'),
  item('现代前端：框架内部机制', 'vue-reactivity-scheduler', 'Vue 3 响应式系统：依赖图与 Effect', '从一次属性读取和修改进入 Proxy、ReactiveEffect、Track、Trigger、依赖清理与分支切换。', ['Vue 3', 'Reactivity'], ['JavaScript Proxy'], ['解释 effect 与依赖关系', '理解调度队列和 nextTick'], '实现最小响应式与调度流程', ['重复读取不会重复订阅', '同步修改被合并刷新'], 'public-source', 'implementation'),
  item('现代前端：框架内部机制', 'react-fiber-concurrent-rendering', 'React Fiber：节点、工作单元与双缓冲', '从不可中断递归的问题进入 FiberNode、child/sibling/return 遍历、current/workInProgress 与 alternate 双缓冲。', ['React', 'Fiber'], ['React 组件基础'], ['画出 Fiber 遍历顺序', '区分 Render 与 Commit'], '用 mini Fiber 推演一次更新', ['可恢复工作不直接修改 DOM', '提交阶段保持一致性'], 'public-source', 'implementation'),
  item('现代前端：框架内部机制', 'nextjs-rendering-cache-invalidation', 'Next.js 渲染、缓存与失效', '围绕内容新鲜度选择静态、动态、流式渲染，并理解请求、数据和路由缓存。', ['Next.js', 'Cache'], ['React 与 HTTP 缓存基础'], ['选择渲染方式', '设计缓存失效'], '为三种页面完成渲染与缓存决策表', ['更新时效与成本匹配', '失效路径可以验证'], 'official', 'decision'),
  item('现代前端：构建工具', 'vite-dev-server-plugin-system', 'Vite 开发服务器与插件机制', '跟踪浏览器请求源码模块的过程，理解依赖预构建、转换、HMR 和插件钩子。', ['Vite', 'ESM'], ['浏览器 ESM'], ['解释 Vite 开发启动快的原因', '编写一个最小插件'], '实现并观察一次模块转换', ['转换只作用于目标模块', 'HMR 失效时能定位模块边界'], 'public-source', 'implementation'),
  item('现代前端：构建工具', 'rollup-esbuild-code-splitting', 'Rollup、esbuild、模块图与代码分割', '从动态导入开始，比较解析、转换、打包和压缩职责，并控制 Chunk 边界。', ['Rollup', 'esbuild'], ['ES Module'], ['解释 Tree Shaking 前提', '设计按路由分包'], '查看一次构建的模块图与产物', ['副作用声明正确', '公共依赖不会被意外重复'], 'official-guided-operation', 'diagnosis'),
  item('现代前端：工程体系', 'component-library-design-system', '组件库与设计系统', '从 Button 契约扩展到 Token、可访问性、文档、测试、版本和破坏性变更。', ['Component Library', 'Design System'], ['组件基础'], ['设计稳定组件 API', '管理主题和版本'], '完成一个组件的契约与验收表', ['键盘和读屏行为明确', '变更类型可以判断'], 'public-source', 'implementation'),
  item('现代前端：工程体系', 'web-performance-measurement', 'Web 性能测量与优化', '从用户指标和网络瀑布建立基线，再处理资源、渲染、交互和回归预算。', ['Performance', 'Core Web Vitals'], ['浏览器网络基础'], ['解释 LCP、INP、CLS', '用证据选择优化动作'], '完成一次页面性能诊断', ['实验前后使用同一口径', '优化不依赖过时技巧'], 'public-source', 'diagnosis'),
  item('现代前端：工程体系', 'sentry-sourcemap-observability', 'Sentry、Source Map 与前端观测', '从压缩堆栈恢复源码位置，串联 Release、Source Map、错误分组、Breadcrumb 和隐私。', ['Sentry', 'Source Map'], ['构建产物基础'], ['解释 Source Map 映射', '设计前端错误上下文'], '还原一条压缩错误并检查上传边界', ['线上不公开 Source Map', '错误关联到正确版本'], 'public-source', 'implementation'),
  item('现代前端：安全与通信', 'browser-security-boundaries', 'Cookie、CORS、CSRF、XSS 与浏览器安全', '从自动携带 Cookie 的跨站请求出发，理解同源策略、凭证、安全响应头和输出编码。', ['Security', 'Browser'], ['HTTP 基础'], ['区分 CORS 与 CSRF', '选择 Cookie 安全属性'], '审查一条登录与跨域请求链', ['HttpOnly 由服务端设置', 'XSS 与 CSRF 防护不混淆'], 'official', 'diagnosis'),
  item('现代前端：安全与通信', 'sse-websocket-streaming-ui', 'SSE、WebSocket 与流式页面', '从任务进度页面出发，选择单向或双向通道，并处理游标、重连、心跳和慢消费者。', ['SSE', 'WebSocket'], ['HTTP 与事件监听'], ['选择实时协议', '实现断线恢复状态机'], '设计一条可重放的进度流', ['重复事件不会重复更新', '断线后从游标继续'], 'public-source', 'implementation'),
  item('现代前端：安全与通信', 'service-worker-cache-offline', 'Service Worker、缓存与离线能力', '从断网刷新开始，理解安装、激活、请求拦截、Cache Storage 和安全更新。', ['Service Worker', 'PWA'], ['Promise 与 Fetch'], ['选择缓存策略', '安全升级缓存版本'], '实现离线页面与缓存更新流程', ['首次安装与升级行为可区分', '错误响应不会污染缓存'], 'public-source', 'implementation'),
  item('现代前端：安全与通信', 'large-file-resumable-transfer', '分片上传、断点续传与大文件下载', '用文件摘要、上传会话、分片幂等、并发上限和服务端校验处理网络中断。', ['File API', 'Upload'], ['HTTP 请求与 Blob'], ['设计上传协议', '恢复未完成分片'], '完成一张端到端分片传输时序图', ['合并前校验分片', '重试不会生成重复文件'], 'public-source', 'implementation'),
  item('现代前端：插件开发', 'manifest-v3-extension', 'Manifest V3 浏览器扩展架构', '从读取当前页面信息开始，理解页面、内容脚本、Service Worker、消息和最小权限。', ['Browser Extension', 'Manifest V3'], ['JavaScript 与浏览器 API'], ['设计扩展进程边界', '限制 host 权限'], '实现一次页面到侧边栏的数据传递', ['消息结构被校验', '权限与功能匹配'], 'anonymized-practice', 'implementation'),
  item('现代前端：插件开发', 'vscode-extension-lifecycle', 'VS Code 扩展生命周期、命令与贡献点', '从脚手架和目录开始，注册一个命令，理解 Extension Host、激活事件、菜单和资源释放。', ['VS Code', 'Extension'], ['TypeScript 与 Node.js'], ['创建并调试扩展', '解释命令注册与激活'], '完成一个处理选中文本的命令', ['F5 可启动扩展宿主', '停用时资源被释放'], 'public-source', 'implementation'),
  item('现代前端：插件开发', 'vscode-webview-csp-state', 'VS Code Webview 通信、状态、资源与 CSP', '建立扩展进程与 Webview 的双向消息，并正确处理资源 URI、状态恢复和 CSP。', ['VS Code', 'Webview', 'CSP'], ['读过第 16 章'], ['实现双向消息', '限制 Webview 脚本来源'], '完成一个可恢复状态的 Webview', ['消息有类型校验', 'CSP 不使用宽松通配符'], 'public-source', 'implementation'),
  item('现代前端：插件开发', 'vscode-extension-test-release', 'VS Code 扩展调试、测试、打包与发布', '从日志和自动化测试推进到 vsix 打包、版本、变更记录与发布前检查。', ['VS Code', 'Testing', 'Release'], ['读过第 16、17 章'], ['编写扩展测试', '生成可验证制品'], '完成一份扩展发布 Runbook', ['测试在扩展宿主执行', '包内不含密钥和无关文件'], 'public-source', 'implementation'),

  item("基础与手写", "promise-async-control-handwritten", "Promise、并发控制与异步任务编排", "从 Promise 状态机推导 then 链、错误传播、组合方法、并发池、取消和超时，而不是只背手写模板。", ["JavaScript","Promise","Async"], ["事件循环与函数基础"], ["解释 Promise Resolution Procedure","实现有界并发和失败策略"], "实现 Promise 核心链路与并发池", ["thenable、循环引用和空输入有测试","并发上限和错误语义可观察"], "public-source", "implementation"),
  item("基础与手写", "debounce-throttle-functional-tools", "防抖、节流、柯里化与函数组合", "从事件频率和业务语义选择防抖或节流，并实现 leading、trailing、cancel、flush、this 与参数透传。", ["JavaScript","Debounce","Throttle"], ["闭包、this 与定时器"], ["推导防抖节流状态机","组合可取消的函数工具"], "实现并用假时钟测试函数工具", ["边界时刻只触发预期次数","取消后不保留定时器和闭包状态"], "public-source", "implementation"),
  item("基础与手写", "new-bind-instanceof-inheritance-deep-clone", "new、bind、instanceof、继承与深拷贝", "沿对象创建、原型查找和属性描述符解释常见手写题，处理构造器返回值、Symbol、循环引用和内建对象。", ["JavaScript","Prototype","Clone"], ["对象、函数与原型基础"], ["解释五类能力的规范语义","识别面试简化实现的边界"], "实现并对照原生行为测试对象工具", ["原型、描述符和循环引用被保留","不支持的宿主对象明确拒绝"], "public-source", "implementation"),
  item("基础与手写", "design-patterns-event-emitter", "设计模式与 EventEmitter：从变化点选择结构", "用事件总线、策略、观察者、发布订阅、代理和工厂解决具体变化，避免把模式名称当答案。", ["JavaScript","Design Pattern","EventEmitter"], ["函数、对象与模块基础"], ["区分观察者和发布订阅","设计可释放、可诊断的事件系统"], "实现支持 once、off 和错误隔离的 EventEmitter", ["重复订阅和迭代中退订有测试","监听器异常不会破坏内部状态"], "public-source", "implementation"),
  item("TypeScript", "typescript-type-relations", "TypeScript 类型关系与结构化类型系统", "从赋值兼容进入子类型、结构化类型、对象新鲜度、联合与交叉，解释 TypeScript 有意保留的不健全边界。", ["TypeScript","Type Relations"], ["TypeScript 基础类型"], ["推导赋值兼容关系","识别结构化类型的收益与风险"], "用编译用例验证类型关系", ["正反例与编译结果一致","any 和断言不会被误称为安全"], "official", "implementation"),
  item("TypeScript", "typescript-narrowing-satisfies", "TypeScript 收窄、类型守卫与 satisfies", "沿控制流图解释 typeof、in、instanceof、自定义守卫、可辨识联合、穷尽检查和 satisfies 的保真校验。", ["TypeScript","Narrowing","satisfies"], ["联合类型与控制流基础"], ["写出可靠类型守卫","区分注解、断言与 satisfies"], "实现未知响应的解析和穷尽状态机", ["非法输入停在边界","新增联合成员触发编译错误"], "official", "implementation"),
  item("TypeScript", "typescript-generics-keyof", "TypeScript 泛型、keyof 与索引访问类型", "从输入输出关系推导类型参数、约束、默认参数、keyof、typeof 和 T[K]，避免无意义泛型与宽化。", ["TypeScript","Generics","keyof"], ["函数与对象类型"], ["为 API 保留输入输出关联","约束动态属性访问"], "实现类型安全的选择器和请求客户端", ["错误键在编译期被拒绝","返回类型随输入精确变化"], "official", "implementation"),
  item("TypeScript", "typescript-conditional-infer-mapped", "条件类型、infer、映射类型与模板字面量", "把联合分发、infer 匹配、键重映射和递归类型拆成可计算步骤，并控制复杂类型的性能与可读性。", ["TypeScript","Conditional Types","Mapped Types"], ["泛型与联合类型"], ["手算条件类型结果","组合可维护的工具类型"], "实现 Awaited、DeepReadonly 和事件名称映射", ["never、联合分发和递归深度有用例","类型错误能指向业务含义"], "official", "implementation"),
  item("TypeScript", "typescript-functions-overloads-variance", "函数重载、协变逆变与组件回调类型", "从回调替换安全进入参数逆变、返回值协变、strictFunctionTypes、重载解析和 React/Vue 事件回调设计。", ["TypeScript","Variance","Overload"], ["函数类型与继承基础"], ["解释函数可赋值条件","选择联合、泛型或重载"], "验证一组回调和重载契约", ["不安全回调被编译器拒绝","实现签名覆盖所有重载"], "official", "implementation"),
  item("TypeScript", "typescript-decorators-metadata", "TypeScript 装饰器、初始化顺序与元数据边界", "基于标准装饰器语义解释类、方法和字段装饰过程，区分旧实验装饰器、元数据提案与运行时反射。", ["TypeScript","Decorators","Metadata"], ["类、函数与 tsconfig"], ["跟踪装饰器求值和调用顺序","判断框架元数据依赖"], "实现并测试一个标准方法装饰器", ["this、返回值和初始化顺序保持正确","旧版配置差异被明确标注"], "official", "implementation"),
  item("TypeScript", "typescript-modules-declarations-project-references", "模块解析、声明文件与 Project References", "从一次“类型存在但运行时找不到模块”进入 Node/Bundler 解析、package exports/types、.d.ts、路径别名和增量工程图。", ["TypeScript","Module Resolution","Project References"], ["ES Module 与包基础"], ["区分类型解析和运行时解析","设计可构建的多包类型边界"], "搭建并验证两包 Project References", ["tsc --build 可增量执行","发布包的 exports 与 types 对齐"], "official-guided-operation", "implementation"),
  item("React", "react-jsx-elements-component-model", "JSX、React Element 与组件渲染模型", "从 JSX 编译结果进入不可变 Element、组件调用、Props、Children 和渲染纯度，区分元素、组件实例与 DOM。", ["React","JSX"], ["JavaScript 函数与模块"], ["读懂 jsx runtime 输出","解释组件为何应保持纯净"], "观察 JSX 编译结果和元素对象", ["开发与生产转换差异明确","渲染阶段没有外部副作用"], "official", "implementation"),
  item("React", "react-reconciliation-keys", "React Reconciliation、Key 与列表身份", "从列表输入框错位现象推导 type/key 身份、同层比较、复用、删除和移动，解释索引 key 的真实风险。", ["React","Reconciliation","Key"], ["React Element 与数组方法"], ["推演子节点协调过程","为业务实体选择稳定 key"], "用可编辑列表验证节点身份", ["重排后状态仍跟随业务实体","重复 key 和类型变化有对照结果"], "public-source", "implementation"),
  item("React", "react-work-loop-scheduler-lanes", "React Work Loop、Scheduler 与 Lanes", "沿一次更新进入 update lane、root 调度、beginWork、completeWork、时间切片、中断恢复、饥饿提升和 lane 纠缠。", ["React","Fiber","Scheduler","Lanes"], ["Fiber 节点与事件循环"], ["区分 Scheduler 优先级和 Lane","推演可中断工作循环"], "记录一次紧急与 transition 更新轨迹", ["高优先级更新先提交","教学调度器与 React 实现明确区分"], "public-source", "implementation"),
  item("React", "react-render-commit-effects", "React Render、Commit、Flags 与 Effect 执行", "从工作树完成进入 before mutation、mutation、layout 与 passive 阶段，解释 DOM、Ref、布局 Effect 和被动 Effect 的时序。", ["React","Fiber","Commit"], ["Fiber Work Loop 与 Hooks"], ["区分可重做 Render 和同步 Commit","解释 Flags 如何驱动宿主变更"], "记录 DOM、Ref 与 Effect 的提交顺序", ["渲染期不修改外部世界","cleanup 与下一次 setup 顺序可复现"], "public-source", "implementation"),
  item("React", "react-hooks-state-queues-closures", "Hooks、状态更新队列与闭包快照", "从连续 setState 和过期闭包进入 Hook 链、Update Queue、批处理、函数式更新和 render snapshot。", ["React","Hooks","State Queue"], ["闭包与 Fiber 基础"], ["推演状态队列归并","识别快照与可变引用边界"], "验证批处理和函数式更新", ["连续更新结果可预测","异步回调不会误读旧状态"], "official", "implementation"),
  item("React", "react-effect-lifecycle-cleanup", "Effect 生命周期、依赖与资源清理", "把 Effect 视为外部系统同步过程，解释依赖比较、cleanup、竞态、Strict Mode 检查和无需 Effect 的场景。", ["React","useEffect"], ["Hooks 状态与闭包"], ["按资源所有权设计 Effect","消除请求和订阅竞态"], "实现可取消请求与可释放订阅", ["切换参数不会显示旧响应","卸载后没有监听器和定时器残留"], "official", "implementation"),
  item("React", "react-concurrent-suspense-transitions-hydration", "React 并发、Transition、Suspense 与 Hydration", "从输入卡顿和流式页面进入并发渲染、transition、deferred value、Suspense 边界、流式 SSR 与选择性 Hydration。", ["React","Concurrent Rendering","Suspense"], ["Fiber、Lane 与服务端渲染基础"], ["解释并发不是多线程","设计稳定的加载与恢复边界"], "用 Profiler 比较紧急和非紧急更新", ["输入响应与总完成时间分别记录","Hydration 不匹配可定位到确定输出"], "official", "diagnosis"),
  item("React", "react-component-state-accessibility", "React 组件边界、状态架构与可访问性", "从难复用弹窗和复杂表单进入受控/非受控、状态归属、组合、Context、Reducer、焦点管理和语义契约。", ["React","Component Design","Accessibility"], ["React Hooks 与 HTML 语义"], ["按变化频率划分组件","设计键盘和读屏可用的交互"], "实现可控且可访问的 Modal", ["焦点进入并返回触发点","Escape、标题和背景交互符合契约"], "public-source", "implementation"),
  item("React", "react-performance-profiling-testing", "React 性能、Profiler 与分层测试", "从无证据的 memo 优化进入渲染原因、Profiler、结构共享、缓存成本、虚拟列表、单元测试和用户行为测试。", ["React","Profiler","Testing"], ["组件、Hooks 与浏览器性能基础"], ["定位重渲染来源","选择行为测试而非实现细节"], "完成一次基线、优化和回归测试", ["优化前后使用同一交互样本","memo 不掩盖错误状态边界"], "official-guided-operation", "diagnosis"),
  item("Vue", "vue-components-lifecycle-slots", "Vue 组件、生命周期、Props、Emits 与 Slots", "从父子数据混乱进入单向数据流、组件实例生命周期、事件契约、插槽作用域和资源清理。", ["Vue 3","Components"], ["Vue 模板与 JavaScript"], ["解释组件更新生命周期","设计稳定 Props/Emits/Slots 契约"], "实现可控对话框并记录生命周期", ["父子状态所有权清晰","卸载后订阅和副作用被释放"], "official", "implementation"),
  item("Vue", "vue-scheduler-computed-watch-nexttick", "Vue 调度器、computed、watch 与 nextTick", "从同步修改多次只渲染一次进入 Job Queue、去重排序、微任务刷新、computed 脏标记和 watch flush 时机。", ["Vue 3","Scheduler"], ["Vue 响应式 Effect"], ["推演批量更新队列","选择 computed、watch 或 watchEffect"], "实现最小调度器并记录刷新顺序", ["父子更新和去重顺序稳定","nextTick 只等待当前刷新周期"], "public-source", "implementation"),
  item("Vue", "vue-compiler-pipeline", "Vue 模板编译：Parse、Transform 与 Codegen", "把模板从字符串转换为 AST、转换上下文和渲染函数，解释静态提升、PatchFlag、Block Tree 与编译错误定位。", ["Vue 3","Compiler","AST"], ["模板、函数与树遍历"], ["追踪模板编译流水线","解释编译信息如何减少运行时工作"], "查看一段模板的编译输出", ["静态与动态节点可对应","手写 render 与编译结果行为一致"], "public-source", "implementation"),
  item("Vue", "vue-vdom-renderer-diff", "Vue VNode、Renderer 与 Keyed Diff", "从 render 结果进入 patch、组件 Effect、前后缀同步、索引映射和最长递增子序列，解释 DOM 移动最小化。", ["Vue 3","VNode","Diff"], ["Vue 编译与响应式基础"], ["推演 patchKeyedChildren","手算最长递增子序列"], "用列表重排观察 Patch 行为", ["新增删除移动分别有测试","重复 key 会被明确诊断"], "public-source", "implementation"),
  item("Vue", "vue-composition-pinia-router", "Composition API、Pinia 与 Vue Router 状态边界", "从大型 setup 拆分组合函数，区分局部状态、跨组件 Store 和 URL 状态，并处理导航守卫与异步竞态。", ["Vue 3","Pinia","Vue Router"], ["组件与响应式基础"], ["选择正确状态所有者","设计可测试组合函数"], "实现带筛选 URL 的列表 Store", ["刷新后 URL 可恢复状态","Store 不直接依赖视图实例"], "official", "implementation"),
  item("Vue", "vue-performance-testing", "Vue 性能诊断与组件测试", "从重复渲染和长列表进入 Vue Devtools、性能标记、shallowRef、v-memo、异步组件、虚拟化和用户行为测试。", ["Vue 3","Performance","Testing"], ["组件、响应式与浏览器性能"], ["用证据定位更新成本","建立组件测试边界"], "完成一次 Vue 更新基线与回归", ["优化不改变响应式语义","测试覆盖用户可观察行为"], "official-guided-operation", "diagnosis"),
  item("Vue", "vue-ssr-hydration", "Vue SSR、流式渲染与 Hydration", "沿服务端 HTML、客户端状态和事件绑定解释 SSR 生命周期、数据隔离、Hydration 不匹配及仅客户端能力边界。", ["Vue 3","SSR","Hydration"], ["组件生命周期与 HTTP 基础"], ["区分服务端渲染和客户端激活","排查 Hydration 不匹配"], "实现确定输出的 SSR 页面", ["每请求状态隔离","时间、随机数和浏览器 API 有明确处理"], "official", "diagnosis"),
  item("构建工具", "webpack-module-graph-loaders-plugins", "Webpack 模块图、Loader、Plugin 与 Runtime", "从入口解析进入 Resolver、Loader Pipeline、Compilation、Chunk、Runtime 和 HMR，解释 Tapable 插件如何介入构建生命周期。", ["Webpack","Module Graph"], ["ES Module 与 Node 包基础"], ["追踪模块到产物的路径","区分 Loader 和 Plugin"], "编写一个 Loader 和构建统计插件", ["模块依赖与 Chunk 可从 stats 核对","缓存失效条件有测试"], "public-source", "implementation"),
  item("构建工具", "bun-runtime-toolchain", "Bun Runtime、包管理器、测试器与构建工具", "从执行 TypeScript 到安装依赖、运行测试和打包，区分 Bun 的 Runtime 能力、兼容层和团队迁移边界。", ["Bun","Runtime","Toolchain"], ["JavaScript Runtime 与包管理基础"], ["解释 Bun 各子工具职责","评估 Node 兼容风险"], "用兼容矩阵验证一个前端仓库", ["锁文件、脚本和原生依赖逐项检查","性能结论只来自同机实验"], "official-guided-operation", "decision"),
  item("构建工具", "frontend-build-tools-comparison", "Vite、Webpack、Rollup、esbuild 与 Bun 如何选", "沿开发服务器、转换、打包、运行时和插件生态比较五种工具，建立应用、库和全栈项目的选型矩阵。", ["Vite","Webpack","Rollup","esbuild","Bun"], ["模块图与构建产物基础"], ["按工作阶段比较工具","设计可回滚迁移"], "完成同一最小项目的工具链决策表", ["比较口径和环境固定","不使用来源不明的性能数字"], "official", "decision"),
  item("构建工具", "package-managers-lockfiles-monorepo", "npm、Yarn、pnpm、Lockfile 与 Monorepo", "从幽灵依赖和重复安装进入依赖树、内容寻址、Peer Dependency、Workspace、锁文件合并与版本发布。", ["npm","Yarn","pnpm","Monorepo"], ["package.json 与 SemVer"], ["解释三种安装布局","维护可复现多包依赖图"], "搭建并检查三包 Workspace", ["冷安装严格遵守锁文件","包边界不会依赖未声明模块"], "official-guided-operation", "implementation"),
  item("构建工具", "frontend-cli-scaffolding-plugin-system", "前端 CLI、脚手架与插件系统设计", "从一次 create 命令进入参数解析、模板、虚拟文件树、幂等修改、插件钩子、冲突处理和升级策略。", ["CLI","Scaffolding","Plugin"], ["Node.js 文件系统与包管理"], ["设计可组合脚手架","避免模板覆盖用户代码"], "实现 dry-run 的最小生成器", ["重复执行结果稳定","冲突会预览并等待明确策略"], "anonymized-practice", "implementation"),
  item("构建工具", "frontend-ci-cd-release", "前端 CI/CD、制品、灰度与回滚", "把提交检查、锁文件安装、测试、构建、Source Map、不可变制品、环境提升、灰度和回滚串成可审计流水线。", ["CI/CD","Release","Artifact"], ["Git、构建和 HTTP 缓存基础"], ["设计一次构建多环境提升","建立发布验证和回滚点"], "编写一份前端发布 Runbook", ["生产不重新构建同一版本","HTML 与哈希资源缓存策略匹配"], "official-guided-operation", "implementation"),
  item("浏览器与网络", "browser-url-navigation-rendering", "从输入 URL 到页面可交互发生了什么", "沿导航、DNS、连接、请求、解析、脚本、样式、布局、绘制、合成和 Hydration 建立完整浏览器链路。", ["Browser","Navigation","Rendering"], ["HTTP、HTML 与事件循环基础"], ["复述导航关键路径","按层定位慢点和失败"], "用 DevTools 追踪一次冷导航", ["Network 与 Performance 时间线能对应","缓存命中和 Service Worker 分支被区分"], "official-guided-operation", "diagnosis"),
  item("浏览器与网络", "http-evolution-connections", "HTTP/1.1、HTTP/2、HTTP/3 与连接演进", "从队头阻塞、连接复用和加密握手解释各版本帧模型、流、优先级、QUIC 迁移及前端优化策略变化。", ["HTTP","HTTP/2","HTTP/3","QUIC"], ["TCP、TLS 与请求响应基础"], ["区分三层队头阻塞","根据协议调整资源策略"], "用协议列和时间线核对真实连接", ["协商结果以浏览器证据为准","HTTP/2 Push 不作为现代默认建议"], "official", "diagnosis"),
  item("浏览器与网络", "browser-cache-resource-hints", "HTTP 缓存、浏览器缓存与资源提示", "从一次刷新进入新鲜度、验证器、Vary、内存/磁盘缓存、preload、prefetch、preconnect 和缓存失效。", ["Browser","Cache","Resource Hints"], ["HTTP Header 与构建哈希"], ["设计 HTML 和静态资源缓存","选择不会争抢带宽的资源提示"], "记录冷加载、刷新和回访瀑布", ["状态码与 transferred size 一起判断","更新后不会出现新 HTML 配旧资源"], "official-guided-operation", "diagnosis"),
  item("浏览器与网络", "web-worker-off-main-thread", "Web Worker、消息传递与主线程预算", "从长任务阻塞输入进入 Worker 隔离、结构化克隆、Transferable、SharedWorker、取消协议和任务拆分成本。", ["Web Worker","Performance"], ["事件循环、模块与序列化"], ["判断任务是否值得移出主线程","设计可取消消息协议"], "把大数组计算迁移到 Worker", ["输入响应改善且总耗时被记录","Worker 异常、超时和终止可恢复"], "official-guided-operation", "implementation"),
  item("浏览器与网络", "frontend-performance-memory-diagnostics", "白屏、卡顿与内存泄漏的证据化诊断", "从用户现象建立加载、渲染、主线程、内存和框架五层证据，使用 Performance、Memory、Coverage 和错误日志缩小范围。", ["Performance","Memory","Diagnostics"], ["浏览器渲染与网络基础"], ["区分白屏和不可交互","定位长任务与泄漏保留链"], "完成一次故障复现和对照实验", ["修复前后使用相同样本","Detached DOM 与监听器所有权可解释"], "anonymized-practice", "diagnosis"),
  item("安全与认证", "frontend-auth-sso-oauth-oidc-pkce", "SSO、OAuth 2.0、OIDC、PKCE 与 Token 生命周期", "从 SPA 登录进入授权码、PKCE、ID Token、Access Token、刷新、登出和多标签页协同，明确前端与认证服务边界。", ["OAuth","OIDC","PKCE","SSO"], ["HTTPS、Cookie 与浏览器跳转"], ["区分认证和授权协议","设计不暴露凭证的登录流程"], "画出 Authorization Code + PKCE 时序", ["state、nonce 和 code_verifier 都被核对","Token 不进入 URL 和公开日志"], "official", "decision"),
  item("安全与认证", "frontend-security-defense-in-depth", "前端安全纵深防御：CSP、劫持、加密与支付边界", "在 XSS、CSRF 基础上连接 CSP、Trusted Types、点击劫持、依赖供应链、敏感数据、限流和支付确认。", ["Security","CSP","Trusted Types"], ["浏览器同源策略与认证基础"], ["建立前端威胁模型","区分浏览器缓解和服务端授权"], "审查一条登录到支付确认链路", ["安全头和注入点可自动检查","前端校验不替代服务端权限与金额校验"], "official", "diagnosis"),
  item("工程专题", "micro-frontend-architecture", "微前端架构：隔离、通信、路由与发布", "从多团队独立交付需求判断是否需要微前端，再比较 Module Federation、运行时加载、iframe 和 Web Components。", ["Micro Frontend","Architecture"], ["前端构建、路由与浏览器隔离"], ["识别微前端适用条件","设计依赖和故障隔离"], "完成一份边界、通信和回滚设计", ["全局资源所有权唯一","子应用失败不会阻塞壳应用恢复"], "public-source", "decision"),
  item("工程专题", "frontend-quality-testing-system", "前端质量体系：静态检查、测试与变更门禁", "把类型、Lint、单元、组件、契约、E2E、可访问性和视觉回归按反馈速度与风险分层。", ["Testing","Quality","Accessibility"], ["一种前端测试框架"], ["为风险选择测试层级","减少脆弱和重复测试"], "为一条结算流程设计质量矩阵", ["核心规则有快速测试","跨浏览器关键路径有最小 E2E"], "official", "decision"),
  item("工程专题", "frontend-observability-platform", "前端观测平台：错误、性能、行为与 Release", "从一次压缩报错进入采集 SDK、上下文、采样、去重、聚合、Source Map、Release、告警和隐私治理。", ["Observability","Sentry","RUM"], ["浏览器事件、网络与 Source Map"], ["设计端到端错误数据流","控制采样和敏感信息"], "实现最小错误采集与聚合模型", ["同根因事件稳定分组","Source Map 私有且版本匹配"], "anonymized-practice", "implementation"),
  item("工程专题", "frontend-performance-delivery", "前端性能交付：预算、资源、渲染与回归", "从业务页面建立实验基线，把 Core Web Vitals、资源预算、关键渲染路径、图片、字体、代码分割和 CI 回归连接起来。", ["Performance","Core Web Vitals","Delivery"], ["浏览器渲染、缓存与构建基础"], ["把指标映射到处理阶段","建立可执行性能预算"], "完成一次基线、优化和回归门禁", ["实验环境和样本固定","优化不牺牲可访问性与正确性"], "public-source", "implementation"),
  item("工程专题", "request-client-contract-resilience", "前端请求客户端：契约、取消、重试与一致性", "从重复提交和旧响应覆盖进入请求分层、类型校验、AbortSignal、超时、幂等键、退避、认证刷新和错误模型。", ["HTTP Client","Resilience","TypeScript"], ["Fetch、Promise 与 HTTP 语义"], ["设计稳定请求契约","判断何时能重试和去重"], "实现类型安全且可取消的请求客户端", ["未知结果不会盲目重试","刷新凭证并发被单飞控制"], "anonymized-practice", "implementation"),
  item("跨端开发", "webview-jsbridge-security", "WebView 与 JSBridge：通信、生命周期和安全", "从 H5 调用相机进入消息协议、回调表、导航生命周期、版本协商、Origin 校验和最小能力授权。", ["WebView","JSBridge","Security"], ["浏览器消息与移动端基础"], ["设计可版本化 Bridge 协议","限制不可信页面能力"], "实现带超时和取消的 Bridge 模型", ["重复回调和页面销毁被清理","来源、方法和参数都经过校验"], "public-source", "implementation"),
  item("跨端开发", "cross-platform-react-native-flutter-electron", "React Native、Flutter 与 Electron 的运行模型", "从渲染目标、线程、桥接、包体和原生能力比较三种跨端方案，建立移动端与桌面端选型边界。", ["React Native","Flutter","Electron"], ["前端组件与运行时基础"], ["解释三种渲染和通信路径","按产品约束选型"], "完成跨端技术决策矩阵", ["性能结论不脱离设备和场景","安全更新和原生能力成本被计入"], "official", "decision"),
  item("跨端开发", "mini-program-runtime-lifecycle", "小程序运行时、双线程模型与生命周期", "从页面首次打开进入逻辑层、视图层、数据序列化、路由、应用/页面/组件生命周期和 setData 成本。", ["Mini Program","Runtime","Lifecycle"], ["JavaScript 与组件生命周期"], ["推演小程序启动和更新链路","按生命周期管理资源"], "记录页面进入、切换和销毁时序", ["后台恢复与冷启动被区分","频繁 setData 的数据量可观察"], "official-guided-operation", "implementation"),
  item("跨端开发", "mini-program-auth-packaging-performance", "小程序授权、分包、版本与性能治理", "从登录凭证交换进入用户授权、隐私接口、主包/分包、预下载、版本更新、缓存和启动性能。", ["Mini Program","Authorization","Subpackage"], ["小程序运行时与 HTTPS"], ["设计安全登录和授权流程","规划分包与版本更新"], "完成启动链路和发布检查表", ["code 只使用一次且服务端换取会话","更新失败有兼容提示和恢复路径"], "official-guided-operation", "implementation")
])


const backendArticlePool = course('backend', [
  item("后端基础", "backend-learning-roadmap", "后端学习地图", "先看清请求、应用、数据、异步任务和运行环境怎样连接，再按依赖顺序学习网络、数据库、安全、性能、部署与三种后端语言。", ["Backend","Architecture","Roadmap"], ["会使用浏览器和终端","能读懂基础 JavaScript 或 TypeScript"], ["能说明后端系统各组成部分的职责和连接关系","能按知识依赖安排后端学习顺序"], "画出一张包含请求、数据、任务和运行环境的后端系统图", ["图中每个组件都有明确输入、处理和输出","能沿一次请求说明数据写入和异步任务怎样发生"], "anonymized-practice", "decision"),
  item("后端基础", "dns-tcp-request-path", "输入 URL 到页面显示：浏览器、网络与服务器的完整过程", "按一次导航的真实顺序，解释 URL 解析、缓存、DNS、TCP/QUIC、TLS、HTTP、代理、后端处理以及 HTML、CSS、JavaScript 的解析和渲染。", ["Browser","DNS","TCP","HTTP","Rendering"], ["读过后端学习地图","会使用浏览器开发者工具"], ["能完整说明输入 URL 到页面可交互之间发生的步骤","能根据 Network、命令和服务日志判断请求停在哪一层"], "完成一份导航时间线和分层故障诊断记录", ["能区分缓存、DNS、连接、TLS、HTTP、后端和渲染问题","每个判断都能对应具体报文、时间字段或日志"], "official-guided-operation", "diagnosis"),
  item("MySQL 与数据", "mysql-crud-parameter-binding", "MySQL 入门：数据库、表、SQL 与 CRUD", "从数据为什么需要长期保存开始，认识数据库和 MySQL，理解库、表、行、列、类型与约束，再完成连接、建表和增删改查。", ["MySQL","Database","SQL","CRUD"], ["会使用终端","能读懂基础对象和数组"], ["能解释数据库、MySQL、表、记录、约束和 SQL 的关系","能连接 MySQL 并安全完成建表与 CRUD"], "建立一个用户数据库并完成可核对的增删改查", ["每次写入都能根据约束和影响行数判断结果","外部输入通过参数绑定传给 SQL"], "official-guided-operation", "implementation"),
  item("MySQL 与数据", "transaction-acid-isolation-mvcc", "MySQL 事务、隔离级别与 MVCC：两个请求同时修改时发生了什么", "使用两个 MySQL 会话复现未提交数据不可见、快照读、当前读和丢失更新，再把 ACID 与事务代码落实到并发状态变化。", ["MySQL","Transaction","ACID","MVCC"], ["会写 MySQL CRUD","理解多个请求可能同时读写数据"], ["能推演事务提交、回滚和可见性","能选择原子更新、当前读或乐观版本保护业务不变量"], "完成一份双会话事务时间线和并发更新方案", ["每个读结果都能由快照或当前读解释","失败事务不会留下部分写入"], "official-guided-operation", "implementation"),
  item("认证与项目", "jwt-access-refresh-token-lifecycle", "JWT 登录不是签一个 Token：Access、Refresh、轮换与撤销", "从浏览器登录会话进入 JWT 签名、短时 Access Token、HttpOnly Refresh Cookie、数据库会话、轮换、重放检测和退出。", ["JWT","Authentication","Refresh Token","Cookie"], ["理解 HTTP Cookie 和登录表单","会读基础数据库表结构"], ["能解释完整令牌生命周期而非只会签发 JWT","能实现浏览器内存凭证、单飞刷新和服务端撤销"], "完成一条可撤销、可轮换的登录与刷新时序", ["旧 Refresh Token 重放会撤销会话族","Access Token 不持久化到 localStorage"], "official", "implementation"),
  item("后端基础", "client-server-web-architecture", "客户端与服务器：B/S、C/S、进程和职责边界", "从浏览器、桌面客户端和服务器进程的连接方式开始，解释请求由谁发起、谁保存状态、谁负责业务规则。", ["Client Server", "B/S", "C/S"], ["了解 URL、HTTP 请求"], ["能画出客户端、代理、应用和数据层的职责边界", "能解释一次请求中状态放在哪里"], "完成一张三种部署形态的请求路径图", ["每个箭头都有协议和数据方向", "能指出把业务逻辑放进客户端的风险"], "official", "walkthrough"),
  item("网络与请求链", "https-tls-certificates", "HTTPS、TLS 与证书：浏览器怎样确认连到正确的服务", "从证书错误和握手报文切入，解释 CA、域名校验、密钥协商、SNI、ALPN 与证书轮换。", ["HTTPS", "TLS", "Certificate"], ["理解 TCP 连接和 HTTP"], ["能读懂 TLS 握手关键字段", "能按证书链、域名、时间和协议版本排查失败"], "核对一次 HTTPS 握手并定位证书错误", ["证书身份验证和数据加密被区分", "续期不会靠手工复制私钥"], "official-guided-operation", "diagnosis"),
  item("网络与请求链", "http-message-state-semantics", "HTTP 报文、状态码与缓存语义", "通过请求头、响应头和重复请求结果，理解方法、状态码、内容协商、条件请求、幂等和缓存控制。", ["HTTP", "Status Code", "Cache"], ["会使用 curl 和浏览器 Network"], ["能根据报文判断资源是否改变", "能为接口选择正确的方法和状态码"], "记录一次条件请求从 200 到 304 的变化", ["缓存命中不会误当成业务成功", "POST 重试风险有明确处理"], "official", "implementation"),
  item("网络与请求链", "cookie-session-token-browser-state", "Cookie、Session、Token 与浏览器状态", "从登录后刷新页面仍保持身份开始，拆开 Cookie 属性、服务端 Session、Bearer Token、跨站请求和退出清理。", ["Cookie", "Session", "Token", "CSRF"], ["理解 HTTP 请求和浏览器存储"], ["能设计浏览器认证状态", "能解释 HttpOnly、SameSite、Secure 对攻击面的影响"], "画出登录、请求、刷新和退出的状态变化", ["凭证位置和发送条件可核对", "跨站和 XSS 风险没有混用"], "official", "implementation"),
  item("网络与请求链", "nginx-reverse-proxy-request-routing", "Nginx 反向代理、TLS 终止与请求路由", "从 502、超时和路径错配日志进入监听、upstream、Header 转发、负载均衡、静态文件和优雅 reload。", ["Nginx", "Reverse Proxy", "Upstream"], ["理解 HTTP 和进程端口"], ["能画出代理到应用的连接关系", "能按 access/error 日志和 upstream 状态排障"], "配置一个带健康检查和回滚的 API 入口", ["代理错误与应用错误分开", "reload 前后配置都可验证"], "official-guided-operation", "diagnosis"),
  item("Linux 运行基础", "linux-files-users-permissions", "Linux 文件、用户、组与权限：服务为什么读不到文件", "从 permission denied 和错误的属主开始，解释 inode、路径搜索、用户组、mode bits、ACL、umask 和 Secret 文件。", ["Linux", "Permissions", "ACL"], ["会使用终端和基本文件命令"], ["能判断读写权限来自哪一级目录", "能用最小权限运行服务"], "复现并修复一个服务读取配置失败", ["不使用 777 掩盖权限问题", "修复后能证明实际运行用户拥有所需权限"], "official-guided-operation", "diagnosis"),
  item("Linux 运行基础", "linux-process-port-resource-debugging", "Linux 进程、端口、资源与排障顺序", "从服务启动后立刻退出开始，沿 PID、信号、文件描述符、CPU、内存、磁盘和端口占用建立证据链。", ["Linux", "Process", "Resource"], ["会使用 ps、ss、top"], ["能按低风险顺序定位进程和资源故障", "能解释 SIGTERM、OOM 和端口冲突"], "完成一份服务故障时间线", ["先读日志和状态再执行破坏性操作", "结论对应命令输出"], "official-guided-operation", "diagnosis"),
  item("API 设计", "rest-resource-api-design", "REST 资源建模与接口边界", "从项目列表和单个项目请求开始，区分资源、动作、子资源、方法语义和状态转换。", ["REST", "API Design"], ["理解 HTTP 方法和 JSON"], ["能把页面操作建模为资源接口", "能处理创建、更新、删除的并发语义"], "为项目资源设计一组一致的 REST 路由", ["路由不依赖页面组件命名", "状态码和幂等性与方法一致"], "official", "decision"),
  item("API 设计", "api-validation-errors-pagination", "请求校验、错误结构与游标分页", "从一条 422 和一页重复数据开始，解释边界校验、字段错误、requestId、排序稳定性和游标编码。", ["Validation", "Errors", "Pagination"], ["会设计 JSON API"], ["能返回可定位的错误结构", "能实现不会漏项或重复的游标分页"], "设计项目列表和创建接口的错误与分页契约", ["跨租户资源返回 404", "游标包含稳定排序字段且不可篡改"], "official", "implementation"),
  item("API 设计", "openapi-contract-client-generation", "OpenAPI 契约、类型生成与兼容变更", "从前端类型和后端响应漂移开始，解释 OpenAPI 3.1、Schema、生成客户端、契约测试和破坏性变更。", ["OpenAPI", "Contract", "Type Generation"], ["理解 HTTP JSON API"], ["能维护一份共享契约", "能判断字段变更是否兼容"], "为项目 API 生成 React TypeScript 客户端", ["请求和响应类型来自契约", "删除或改名字段会触发契约检查"], "official-guided-operation", "implementation"),
  item("API 设计", "controller-service-repository-boundaries", "Controller、Service、Repository 的边界与事务归属", "从一个控制器塞满 SQL 和权限判断的故障开始，拆开协议适配、业务规则、数据访问和事务所有权。", ["Layered Architecture", "Service", "Repository"], ["会写基础 API 和 SQL"], ["能确定每层输入输出", "能让事务覆盖完整业务操作而不是单条查询"], "重构一个项目创建流程并保留错误语义", ["HTTP 层不直接拼 SQL", "事务边界和领域不变量有测试"], "anonymized-practice", "implementation"),
  item("API 设计", "runtime-concurrency-node-python-go", "Node.js、Python、Go 的并发运行时", "用同一个慢 IO 接口比较事件循环、协程、线程和 goroutine，解释并发、并行、取消与资源上限。", ["Node.js", "Python", "Go", "Concurrency"], ["理解函数、Promise 或 async/await"], ["能预测阻塞代码对请求的影响", "能在三种语言中传播超时和取消"], "为同一接口写三种运行时的并发模型对照", ["CPU 密集任务不会伪装成 IO 并发", "连接和任务数量有上限"], "official", "decision"),
  item("MySQL 基础", "mysql-relational-schema-design", "数据库是什么：关系、表、记录与持久化", "从进程重启后内存数据消失开始，解释数据库服务器、存储引擎、关系表、行列和持久化读写路径。", ["Database", "MySQL", "Relational"], ["会使用终端"], ["能解释数据库解决的具体问题", "能把业务对象拆成可查询的表和关系"], "为租户和项目设计第一版关系模型", ["每张表有明确事实和生命周期", "内存缓存不被当成持久化真相"], "official", "walkthrough"),
  item("MySQL 基础", "mysql-types-constraints-keys", "MySQL 类型、约束、主键与索引键", "从一条被拒绝的 INSERT 观察 NOT NULL、UNIQUE、外键、CHECK、UUID、时间精度和键的选择。", ["MySQL", "Constraints", "Keys"], ["理解表、行、列"], ["能为字段选择可验证的类型", "能用约束把业务不变量交给数据库"], "设计项目表并故意触发四类约束错误", ["约束错误能映射为稳定 API 错误", "时间统一使用 UTC DATETIME(6)"], "official-guided-operation", "implementation"),
  item("MySQL 查询", "mysql-joins-aggregation-subqueries", "MySQL 连表、聚合与子查询：从多张表得到一个列表", "从项目列表需要负责人和任务数量开始，推演 JOIN、NULL、GROUP BY、HAVING、子查询和重复行。", ["MySQL", "JOIN", "Aggregation"], ["会写 CRUD SQL"], ["能判断连接类型和基数", "能解释聚合前后行数变化"], "写出带负责人和任务统计的游标查询", ["空关联不丢失主表", "统计结果不会因多对多连接重复"], "official", "implementation"),
  item("MySQL 查询", "mysql-index-explain-slow-query", "索引、EXPLAIN 与慢查询", "从一个 p95 变慢的列表接口开始，阅读执行计划、选择性、回表、覆盖索引和慢查询日志。", ["MySQL", "Index", "EXPLAIN"], ["会写 JOIN 和 WHERE"], ["能从 EXPLAIN 解释扫描路径", "能用数据分布而不是列数量决定索引"], "为租户项目列表设计并验证复合索引", ["索引顺序与过滤和排序一致", "优化前后计划与延迟有同口径证据"], "official-guided-operation", "diagnosis"),
  item("MySQL 运行", "mysql-connection-pool-limits", "连接池、MySQL 上限与连接耗尽", "从 Too many connections 和线程池排队开始，建立请求并发、应用池、代理池和 MySQL max_connections 的预算关系。", ["MySQL", "Connection Pool", "Capacity"], ["理解 API 并发和数据库连接"], ["能计算连接预算", "能区分连接泄漏、慢查询和突发并发"], "为三套 API 设计连接池和超时参数", ["池满时请求有明确失败", "数据库不会被盲目调大连接数拖垮"], "official", "diagnosis"),
  item("MySQL 运行", "mysql-backup-restore-operations", "MySQL 备份、恢复与数据操作纪律", "从误删记录后的恢复窗口开始，比较逻辑备份、物理备份、binlog、恢复演练和权限隔离。", ["MySQL", "Backup", "Recovery"], ["理解事务提交和表结构"], ["能选择恢复方案", "能验证备份真的可用"], "在隔离库完成一次备份、恢复和校验", ["RPO/RTO 有测量值", "备份凭证和生产权限分离"], "official-guided-operation", "implementation"),
  item("ORM 与演进", "orm-unit-of-work-n-plus-one", "ORM、Unit of Work 与 N+1 查询", "从列表页发出几十条 SQL 开始，解释 ORM 映射、身份映射、Unit of Work、懒加载和预加载。", ["ORM", "Unit of Work", "N+1"], ["会写 SQL JOIN"], ["能读 ORM 生成的 SQL", "能在保持领域代码可读的同时控制查询次数"], "把项目列表从 N+1 改为批量查询", ["查询次数有测试或日志证据", "事务提交前变更状态可解释"], "official-guided-operation", "diagnosis"),
  item("ORM 与演进", "schema-migrations-seeds-evolution", "迁移、种子数据与 Schema 演进", "从线上新增必填列失败开始，设计可重复迁移、回填、双写、切换和回滚边界。", ["Migration", "Alembic", "Prisma", "GORM"], ["理解约束和事务"], ["能安全增加和删除字段", "能让三套语言迁移得到一致 Schema"], "写一份可重复执行的项目迁移计划", ["空库、升级库和重复执行结果一致", "破坏性变更有分阶段方案"], "official-guided-operation", "implementation"),
  item("事务与一致性", "mysql-locks-deadlocks-concurrency", "MySQL 锁、死锁与并发顺序", "用两个事务更新同一批项目复现等待和死锁，解释记录锁、间隙锁、索引范围和重试边界。", ["MySQL", "Locks", "Deadlock"], ["理解事务、隔离和索引"], ["能从 SHOW ENGINE INNODB STATUS 找到死锁顺序", "能统一锁顺序并设计有限重试"], "完成一次死锁复现和修复对照", ["重试只包住可重放事务", "锁等待超时不会无限延长请求"], "official-guided-operation", "diagnosis"),
  item("事务与一致性", "idempotency-outbox-saga-consistency", "幂等、Outbox 与 Saga：跨数据库和消息的可靠变更", "从支付回调重复到消息发布失败，推演幂等键、Outbox 状态、补偿动作和最终一致性。", ["Idempotency", "Outbox", "Saga"], ["理解事务、消息和唯一约束"], ["能让重复请求只产生一个业务结果", "能恢复数据库提交与消息发送之间的间隙"], "设计订单支付回调和 Outbox 处理状态机", ["重复回调返回同一结果", "失败补偿不伪造已完成状态"], "anonymized-practice", "implementation"),
  item("认证与安全", "password-cookie-session-login", "密码、Cookie、Session 与登录流程", "从登录失败和会话被盗的日志开始，解释 Argon2id、验证码边界、Session 存储、Cookie 属性和退出。", ["Argon2id", "Session", "Cookie"], ["理解 HTTP 和数据库"], ["能实现不保存明文密码的登录", "能解释会话固定和 CSRF 防护"], "设计一条带失败计数和退出撤销的登录流程", ["密码验证使用恒定时间库", "Session 失效后旧 Cookie 无法继续访问"], "official", "implementation"),
  item("认证与安全", "rbac-role-permission-model", "RBAC：角色、权限与授权判断", "从一个按钮隐藏却接口仍可调用开始，建立用户、角色、权限、继承和授权检查的服务端模型。", ["RBAC", "Authorization", "Permission"], ["理解登录和资源 API"], ["能设计角色权限表", "能在路由、服务和数据查询处执行授权"], "为项目管理设计最小 RBAC 模型", ["前端展示不替代后端授权", "权限变更有缓存失效和审计"], "official", "implementation"),
  item("认证与安全", "acl-multitenant-data-scope", "ACL、多租户与数据范围隔离", "从用户猜测项目 ID 访问到跨租户 404，解释租户上下文、部门范围、行级过滤和查询默认条件。", ["ACL", "Multi-tenant", "Data Scope"], ["理解 RBAC 和 JOIN"], ["能让范围过滤进入每个读写路径", "能区分角色权限与对象访问"], "为项目查询增加租户和部门范围条件", ["缺少范围的资源统一 404", "批量接口不会绕过单条授权"], "anonymized-practice", "implementation"),
  item("认证与安全", "api-security-secrets-audit", "API 安全、Secret 管理与审计日志", "从泄露的环境变量和无法解释的管理员操作开始，覆盖输入边界、限流、CORS、密钥轮换、脱敏和审计不可抵赖。", ["API Security", "Secrets", "Audit"], ["理解认证、授权和部署配置"], ["能建立 API 威胁模型", "能记录足够排障但不泄露凭证的审计事件"], "写出一份后台 API 安全检查和 Secret 轮换流程", ["日志不包含 Token 和密码", "高风险操作能关联 requestId、操作者和结果"], "official-guided-operation", "diagnosis"),
  item("Redis", "redis-types-ttl-persistence", "Redis 数据结构、TTL、持久化与内存淘汰", "从一个 key 到期或 Redis 重启后的结果开始，比较 String、Hash、List、Set、Sorted Set、Stream 及 RDB/AOF。", ["Redis", "TTL", "Persistence"], ["理解键值读写"], ["能按访问模式选数据结构", "能解释丢数据风险和淘汰策略"], "为 Session、计数器和任务进度选择 Redis 类型", ["每类 key 都有所有者和 TTL", "Redis 不被误当成唯一业务数据库"], "official", "decision"),
  item("Redis", "cache-aside-consistency-breakdown", "Cache-aside、一致性与缓存击穿", "从数据库已经更新但页面仍显示旧值开始，推演读旁路、失效顺序、击穿、穿透、雪崩和热 key。", ["Redis", "Cache", "Consistency"], ["理解 MySQL 更新和 Redis 基础"], ["能设计缓存键和失效路径", "能按故障现象区分击穿、穿透和雪崩"], "为项目详情设计缓存旁路和失效策略", ["缓存不覆盖权限条件", "失效失败有对账或短 TTL 兜底"], "anonymized-practice", "diagnosis"),
  item("Redis", "redis-session-rate-limit-leased-lock", "Redis Session、限流与租约锁", "用登录会话、令牌桶和短任务互斥三个例子，解释原子脚本、过期时间、租约续期和锁释放。", ["Redis", "Rate Limit", "Lease Lock"], ["理解 Redis TTL 和并发"], ["能设计按用户和 IP 的限流", "能避免锁过期后误删他人锁"], "实现带 owner token 的租约锁状态转换", ["超限返回 Retry-After", "释放锁只删除自己的 owner"], "official-guided-operation", "implementation"),
  item("消息与任务", "rabbitmq-routing-ack-retry-dlq", "RabbitMQ 路由、ACK、重试与死信", "从消息在 Worker 重启后重复投递开始，解释 Exchange、Queue、Binding、确认、预取、退避和 DLQ。", ["RabbitMQ", "ACK", "DLQ"], ["理解事务与幂等"], ["能设计可观测消费链路", "能把不可重试错误送入死信"], "为项目导入任务设计重试和死信策略", ["ACK 发生在副作用之后", "重试次数和死信原因可查询"], "official", "implementation"),
  item("消息与任务", "kafka-partitions-consumer-groups", "Kafka 分区、Consumer Group 与 Offset", "从一个消费者扩容却没有加速开始，解释分区顺序、Group 再均衡、Offset 提交和重复消费。", ["Kafka", "Partition", "Consumer Group"], ["理解消息投递和幂等"], ["能按键选择分区", "能判断并行度和顺序保证"], "推演三个分区和两个消费者的分配", ["Offset 与业务提交边界明确", "再均衡期间不会假设恰好一次"], "official", "walkthrough"),
  item("消息与任务", "rabbitmq-kafka-selection", "RabbitMQ 与 Kafka：按消息语义和运行责任选型", "从后台任务、事件流和审计日志三个场景比较队列、日志、顺序、回放、运维和团队成本。", ["RabbitMQ", "Kafka", "Messaging"], ["理解两种系统的基本投递模型"], ["能用约束做选型", "能避免为了扩展性引入不必要的集群"], "完成一张消息系统决策表", ["回放、顺序、延迟和失败处理都有证据", "选型包含迁移和退出成本"], "official", "decision"),
  item("消息与任务", "worker-scheduler-idempotent-recovery", "Worker、定时任务与故障恢复", "从定时任务重复执行和 Worker 被杀开始，设计任务状态、租约、心跳、幂等、副作用记录和停机排空。", ["Worker", "Scheduler", "Recovery"], ["理解 RabbitMQ 或 Kafka", "理解事务和幂等"], ["能让任务可重试、可恢复、可取消", "能区分调度重复和执行重复"], "设计一份任务状态机和恢复扫描器", ["失去租约的任务可重新接管", "已完成副作用不会再次产生"], "anonymized-practice", "implementation"),
  item("文件与对象", "local-object-storage-s3-minio", "本地文件、S3 与 MinIO：对象存储的路径和边界", "从上传一个头像开始，比较本地磁盘、S3 兼容对象存储和 MinIO 的对象键、元数据、权限和生命周期。", ["Object Storage", "S3", "MinIO"], ["理解 HTTP 上传和文件系统"], ["能选择文件存储位置", "能让数据库记录与对象状态可对账"], "画出本地和对象存储的上传路径", ["应用不把永久对象凭证交给浏览器", "孤立对象有清理策略"], "official", "decision"),
  item("文件与对象", "secure-file-upload-download-lifecycle", "安全上传、下载与文件生命周期", "从伪造 MIME 和超大文件开始，覆盖大小、Magic Number、病毒扫描、预签名 URL、权限复核和删除。", ["Upload", "Download", "Security"], ["理解对象存储和认证授权"], ["能设计分阶段文件状态", "能阻断路径穿越、类型伪造和越权下载"], "设计文件上传到归档的状态机", ["下载前重新检查资源权限", "扫描失败不会进入可见状态"], "official-guided-operation", "implementation"),
  item("容器", "oci-image-container-network-volume", "OCI 镜像、容器网络与卷", "从容器里 localhost 指向错误服务开始，解释镜像层、容器进程、网络命名空间、服务发现、卷和 PID 1。", ["OCI", "Container", "Network", "Volume"], ["理解 Linux 进程和端口"], ["能解释容器之间如何通信", "能判断数据应放镜像、可写层还是卷"], "用 Compose 网络核对 API 到 MySQL 的连接", ["服务名与宿主端口不混淆", "持久数据不依赖容器生命周期"], "official-guided-operation", "walkthrough"),
  item("容器", "dockerfile-compose-mysql-stack", "Dockerfile 与 Compose：搭建可重复的 MySQL 后端栈", "从镜像在另一台机器启动失败开始，解释构建上下文、多阶段构建、环境变量、健康检查、依赖就绪和数据卷。", ["Dockerfile", "Compose", "MySQL"], ["理解 OCI 镜像和网络"], ["能写可复现的 API 镜像", "能把配置、数据和代码生命周期分开"], "为三套 API 共用栈设计 Compose 配置", ["compose config 可展开", "健康检查表达服务可用而非仅进程存在"], "official-guided-operation", "implementation"),
  item("交付", "git-branch-review-environment-workflow", "Git 分支、Review 与环境工作流", "从一个无法回滚的混合提交开始，设计分支、提交粒度、Pull Request、预览环境和配置差异。", ["Git", "Code Review", "Environment"], ["会使用 Git 基础命令"], ["能让变更可审查、可定位、可回滚", "能区分代码、配置和数据迁移"], "为后端功能设计从分支到预览环境的流程", ["Review 有测试证据", "环境配置不复制进源码"], "anonymized-practice", "decision"),
  item("交付", "ci-test-image-artifact-supply-chain", "CI、测试、镜像制品与供应链", "从 CI 通过但线上镜像不同开始，串起三语言矩阵、锁文件、SBOM、签名、不可变制品和依赖漏洞门禁。", ["CI", "Artifact", "Supply Chain"], ["理解 Docker 和测试层级"], ["能设计从源码到镜像的可追溯链", "能阻止未验证制品进入发布"], "写出一份三语言 CI 工作流结构", ["构建只产生一次不可变制品", "部署引用摘要而不是 latest"], "official-guided-operation", "implementation"),
  item("交付", "release-migration-rollout-rollback-runbook", "迁移、滚动发布、回滚与 Runbook", "从数据库迁移和应用版本不兼容开始，安排 expand/contract、候选验证、滚动发布、回滚条件和人工操作手册。", ["Release", "Migration", "Rollback", "Runbook"], ["理解迁移、容器和健康检查"], ["能发布带数据库变更的版本", "能在故障时快速恢复旧版本"], "完成一次候选版本发布与回滚 Runbook", ["回滚不依赖删除数据", "每一步都有观察指标和停止条件"], "anonymized-practice", "implementation"),
  item("Kubernetes", "kubernetes-pod-deployment-service-ingress", "Kubernetes Pod、Deployment、Service 与 Ingress", "从 Pod 重启和服务访问失败开始，建立工作负载、稳定服务地址、入口路由和滚动更新的对象关系。", ["Kubernetes", "Pod", "Deployment", "Service"], ["理解容器网络和发布"], ["能读懂基础清单", "能解释流量如何到达 Pod"], "为一个 API 写 Deployment、Service 和 Ingress", ["配置与 Secret 分离", "副本变化不会改变服务地址"], "official-guided-operation", "implementation"),
  item("Kubernetes", "kubernetes-probes-resources-hpa-debugging", "Kubernetes 探针、资源、HPA 与排障", "从 CrashLoopBackOff 和 OOMKilled 开始，解释 startup/readiness/liveness、requests/limits、HPA 信号和 kubectl 证据。", ["Kubernetes", "Probes", "HPA", "Debugging"], ["理解 Pod 和 Deployment"], ["能设计不误杀启动中服务的探针", "能按事件、日志、指标排障"], "为 API 配置探针和基础扩缩容", ["readiness 不等于 liveness", "资源限制和扩容指标能回到请求预算"], "official-guided-operation", "diagnosis"),
  item("测试", "backend-test-pyramid-fixtures", "后端测试金字塔、Fixture 与隔离数据库", "从一个通过单测却在生产失败的规则开始，安排单元、集成、契约、端到端测试和可重复 Fixture。", ["Testing", "Fixture", "Integration"], ["会写 API 和 SQL"], ["能按风险分配测试层", "能让测试数据库可重建且互不污染"], "为登录和项目 CRUD 设计测试矩阵", ["失败测试可定位到层级", "测试数据不依赖共享开发库"], "official-guided-operation", "decision"),
  item("测试", "openapi-bruno-api-security-test", "OpenAPI、Bruno 与 API 安全测试", "从接口文档和实际响应不一致开始，用 Bruno/契约测试验证状态码、Schema、鉴权、租户隔离和错误结构。", ["OpenAPI", "Bruno", "Security Test"], ["理解 OpenAPI 和认证"], ["能把接口约束变成可运行测试", "能覆盖越权、重放、重复提交等安全路径"], "建立一套三后端共用的 API 测试集合", ["同一请求在三套服务有一致语义", "安全失败不会泄露租户存在性"], "official-guided-operation", "implementation"),
  item("测试", "k6-load-qps-tps-latency-p99", "k6 压测：QPS、TPS、并发与 P99 延迟", "从平均延迟看不出用户卡顿开始，解释负载模型、到达率、并发、吞吐、P50/P95/P99 和错误预算。", ["k6", "Load Test", "P99"], ["理解 API、连接池和指标"], ["能写小规模压测场景", "能从分位数和资源曲线判断瓶颈"], "为项目列表和登录设计基线场景", ["结果不被写成脱离环境的性能承诺", "压测数据与版本、负载和数据库状态绑定"], "official-guided-operation", "diagnosis"),
  item("性能", "mysql-query-connection-performance", "MySQL 查询、连接与事务性能", "把慢 SQL、锁等待、连接建立和事务持有时间放到一次请求的时间线中，建立可测量的优化顺序。", ["MySQL", "Performance", "Transactions"], ["理解 EXPLAIN、锁和连接池"], ["能区分查询、连接和锁成本", "能按收益和风险排序优化"], "完成一份从日志到执行计划的性能分析", ["优化前后使用相同查询和数据量", "没有用加索引掩盖错误访问模式"], "official-guided-operation", "diagnosis"),
  item("性能", "cache-async-pool-performance", "缓存、异步任务与连接池性能", "从缓存命中率下降和队列堆积开始，解释缓存热度、批量、背压、Worker 并发和池化资源争用。", ["Cache", "Async", "Pool"], ["理解 Redis、消息队列和连接池"], ["能把吞吐瓶颈定位到具体资源", "能用背压而不是无限扩容"], "设计一次队列积压的容量分析", ["缓存命中率和新鲜度一起观察", "Worker 并发不超过下游容量"], "anonymized-practice", "diagnosis"),
  item("性能", "profiling-capacity-timeout-shutdown", "Profiling、容量、超时预算与优雅停机", "从发布时请求被截断开始，串起 CPU/内存 Profiling、容量模型、分层 timeout、取消传播和 drain。", ["Profiling", "Capacity", "Timeout", "Shutdown"], ["理解并发、队列和部署"], ["能用 Profile 定位热点", "能设计不丢请求的停机流程"], "为三套 API 写超时和停机时序", ["超时总和小于上游预算", "SIGTERM 后拒绝新请求并等待可控时间"], "official-guided-operation", "implementation"),
  item("观测与治理", "logging-metrics-tracing-opentelemetry", "日志、指标、Trace 与 OpenTelemetry", "从一次 requestId 无法串起前后端开始，建立结构化日志、RED 指标、Trace Context、采样和敏感字段脱敏。", ["Logging", "Metrics", "Tracing", "OpenTelemetry"], ["理解 HTTP 请求和服务进程"], ["能把一次请求映射到日志、指标和 Trace", "能设计低噪声高价值字段"], "为项目 CRUD 定义观测字段和 Trace 链", ["日志不含 Token 和密码", "指标标签不会无限基数增长"], "official", "implementation"),
  item("观测与治理", "alerting-slo-runbook", "告警、SLO、错误预算与 Runbook", "从告警太多导致没人处理开始，用可用性、延迟和新鲜度定义 SLI/SLO，再把告警连接到操作手册。", ["SLO", "Alerting", "Runbook"], ["理解日志、指标和 P99"], ["能选择用户可感知的 SLI", "能写出收到告警后的第一步和回滚条件"], "为登录、列表和异步任务定义 SLO", ["告警可行动且有责任人", "错误预算消耗会影响发布节奏"], "anonymized-practice", "decision"),
  item("观测与治理", "enterprise-tools-environment-governance", "企业工具、环境配置与权限治理", "从开发机能跑而候选环境失败开始，梳理密钥、配置、制品、数据库、队列、对象存储、权限、审计和 Runbook 的责任归属。", ["Enterprise", "Governance", "Environment"], ["理解发布、Secret 和观测"], ["能画出环境与工具责任矩阵", "能为变更建立审批、审计和回滚边界"], "完成一份企业后台环境治理表", ["生产凭证不进入仓库", "每个工具都有 owner、备份和退出方案"], "anonymized-practice", "decision"),
  item("Node.js", "node-nestjs-runtime-architecture", "Node.js 与 NestJS：运行时、模块和请求生命周期", "从一个 NestJS 请求进入 Node 事件循环、模块装配、Guard、Pipe、Interceptor、Exception Filter 和优雅停机。", ["Node.js", "NestJS", "Runtime"], ["理解 API 分层和并发运行时"], ["能追踪 NestJS 请求生命周期", "能确定横切逻辑的放置位置"], "完成一个带认证和错误过滤的 NestJS 模块", ["阻塞代码和异步错误可定位", "关闭时连接和队列被排空"], "official-guided-operation", "implementation"),
  item("Node.js", "react-nestjs-prisma-admin", "React、NestJS 与 Prisma：打通登录和项目 CRUD", "用一个可运行垂直切片把 React Router、TanStack Query、NestJS Controller/Service、Prisma、MySQL、租户范围和乐观版本串成完整请求链。", ["React","NestJS","Prisma","MySQL"], ["完成 MySQL CRUD 与 JWT 生命周期","会使用 React Hook 和 TypeScript"], ["能从页面事件追到数据库写入","能保持协议、业务与数据访问职责清晰"], "运行 React 与 NestJS 企业后台垂直切片", ["登录、列表、创建和更新均有可观察结果","跨租户查询和版本冲突有稳定结果"], "anonymized-practice", "implementation"),
  item("Node.js", "node-redis-rabbitmq-minio-quality", "Node.js 接入 Redis、RabbitMQ、MinIO 与质量门禁", "把缓存、后台任务、对象上传和 Jest/契约测试接入 NestJS 项目，解释连接关闭、重试和本地环境管理。", ["Node.js", "Redis", "RabbitMQ", "MinIO"], ["完成 NestJS 项目垂直切片", "理解缓存、队列和对象存储"], ["能实现 Node 异步任务和文件流转", "能让集成测试使用隔离依赖"], "为项目增加文件上传和异步任务状态", ["重复消息不会重复副作用", "测试结束后连接和临时对象被清理"], "official-guided-operation", "implementation"),
  item("Python", "python-fastapi-runtime-async", "Python 与 FastAPI：ASGI、依赖注入和异步边界", "从阻塞函数拖慢所有请求开始，解释 ASGI、事件循环、依赖注入、后台任务和同步代码隔离。", ["Python", "FastAPI", "ASGI"], ["理解 Python 函数和 asyncio"], ["能追踪 FastAPI 请求生命周期", "能判断同步依赖是否应该进入线程池"], "实现一个带依赖和取消传播的 FastAPI 路由", ["阻塞调用不会占住事件循环", "异常结构与 OpenAPI 契约一致"], "official", "implementation"),
  item("Python", "python-sqlalchemy-mysql-auth", "SQLAlchemy 2、MySQL 与认证会话", "从 SQLAlchemy 生成的查询开始，解释 Session、Unit of Work、事务、异步驱动、Argon2id 和 Refresh Token。", ["Python", "SQLAlchemy", "MySQL", "Auth"], ["理解 ORM、事务和 JWT"], ["能实现租户项目 CRUD 和认证", "能识别 lazy load 与 N+1"], "完成 FastAPI 管理端数据库切片", ["迁移和查询与共享 Schema 一致", "认证失败和事务回滚可测试"], "official-guided-operation", "implementation"),
  item("Python", "python-redis-celery-minio-quality", "Python 接入 Redis、Celery、MinIO 与测试质量", "把 Celery 任务、Redis 状态、MinIO 预签名和 pytest/ruff/mypy 接入同一项目，处理任务重试和连接回收。", ["Python", "Celery", "Redis", "MinIO"], ["完成 FastAPI 数据库与认证切片", "理解 Worker 和对象生命周期"], ["能实现可恢复的文档任务", "能用契约和集成测试验证边界"], "完成上传、任务状态和 SSE 进度链", ["任务状态不会被旧 Worker 覆盖", "测试依赖可替换且无残留"], "official-guided-operation", "implementation"),
  item("Go", "go-gin-context-concurrency", "Go 与 Gin：Context、并发和请求生命周期", "从 goroutine 泄漏和请求取消没有传播开始，解释 Gin Handler、context.Context、goroutine、channel 和 pprof 钩子。", ["Go", "Gin", "Context", "Concurrency"], ["理解 Go 函数和 HTTP"], ["能传播取消和 deadline", "能避免后台 goroutine 失控"], "实现一个带并发限制的 Gin 路由", ["请求结束后 goroutine 可回收", "错误和超时映射到统一响应"], "official", "implementation"),
  item("Go", "go-gorm-mysql-auth", "GORM、MySQL 与 Go 认证授权", "从 GORM 生成 SQL 和事务回调进入模型标签、预加载、乐观版本、Argon2id、JWT 和租户过滤。", ["Go", "Gin", "GORM", "MySQL"], ["理解 ORM、事务和 JWT"], ["能实现三语言一致的项目 CRUD", "能从 SQL 日志判断预加载和锁行为"], "完成 Gin 管理端数据库与认证切片", ["迁移后 Schema 与其他语言一致", "跨租户资源统一 404"], "official-guided-operation", "implementation"),
  item("Go", "go-redis-rabbitmq-minio-quality", "Go 接入 Redis、RabbitMQ、MinIO 与测试", "把 context-aware Redis、RabbitMQ 消费、MinIO 上传和标准测试、go vet、pprof 接入同一项目。", ["Go", "Redis", "RabbitMQ", "MinIO"], ["完成 Gin 数据库与认证切片", "理解消息确认和对象存储"], ["能实现可取消的 Worker", "能用 pprof 和集成测试定位问题"], "完成文件任务和消息重试链", ["ACK 前副作用可恢复", "连接和 goroutine 在测试结束时释放"], "official-guided-operation", "implementation"),
  item("综合项目", "enterprise-admin-capstone", "企业后台综合项目：租户、权限、文件、审计与任务", "把三套后端和 React 管理端连接到同一契约，完成企业后台的核心资源、数据范围、上传、审计和异步进度。", ["Capstone", "Admin", "Multi-tenant"], ["完成三语言专项文章", "理解 OpenAPI、MySQL、Redis、消息和部署"], ["能独立交付一套企业后台", "能按故障证据排查跨层问题"], "交付可切换三套 API 的 React 企业后台", ["契约、权限、迁移、测试和观测都有对应产物", "发布和回滚步骤可由 Runbook 执行"], "anonymized-practice", "implementation"),
  item("综合项目", "ecommerce-order-inventory-extension", "电商扩展：商品、库存、订单与支付回调", "在企业后台基础上加入库存锁、订单事务、模拟支付回调、幂等和 Outbox，追踪状态变化和补偿。", ["Ecommerce", "Inventory", "Order", "Payment"], ["完成事务、锁、幂等与 Outbox", "完成企业后台综合项目"], ["能设计库存和订单不变量", "能处理重复支付和库存并发"], "实现一条可恢复的下单到支付状态链", ["超卖和重复扣款有测试", "支付失败不会留下已支付订单"], "anonymized-practice", "implementation"),
  item("综合项目", "ai-application-platform-extension", "AI 应用平台扩展：知识库、解析任务与聊天运行", "在企业后台基础设施上加入知识库、文档解析、向量写入、聊天运行和 SSE 流式输出，模型使用可替换的本地模拟适配器。", ["AI Platform", "Knowledge Base", "SSE"], ["完成企业后台综合项目", "理解对象存储、Worker、SSE 和权限"], ["能交付不依赖付费模型的 AI 应用骨架", "能把文档版本、任务状态和聊天事件串起来"], "完成知识库导入和聊天运行的端到端设计", ["文档权限不会被检索绕过", "模型适配器可替换，失败和取消可恢复"], "anonymized-practice", "implementation")
])

const backendArticleOrder = [
  'backend-learning-roadmap', 'client-server-web-architecture', 'dns-tcp-request-path',
  'https-tls-certificates', 'http-message-state-semantics', 'cookie-session-token-browser-state',
  'nginx-reverse-proxy-request-routing', 'linux-files-users-permissions',
  'linux-process-port-resource-debugging', 'rest-resource-api-design',
  'api-validation-errors-pagination', 'openapi-contract-client-generation',
  'controller-service-repository-boundaries', 'runtime-concurrency-node-python-go',
  'mysql-relational-schema-design', 'mysql-types-constraints-keys',
  'mysql-crud-parameter-binding', 'mysql-joins-aggregation-subqueries',
  'mysql-index-explain-slow-query', 'mysql-connection-pool-limits',
  'mysql-backup-restore-operations', 'orm-unit-of-work-n-plus-one',
  'schema-migrations-seeds-evolution', 'transaction-acid-isolation-mvcc',
  'mysql-locks-deadlocks-concurrency', 'idempotency-outbox-saga-consistency',
  'password-cookie-session-login', 'jwt-access-refresh-token-lifecycle',
  'rbac-role-permission-model', 'acl-multitenant-data-scope', 'api-security-secrets-audit',
  'redis-types-ttl-persistence', 'cache-aside-consistency-breakdown',
  'redis-session-rate-limit-leased-lock', 'rabbitmq-routing-ack-retry-dlq',
  'kafka-partitions-consumer-groups', 'rabbitmq-kafka-selection',
  'worker-scheduler-idempotent-recovery', 'local-object-storage-s3-minio',
  'secure-file-upload-download-lifecycle', 'oci-image-container-network-volume',
  'dockerfile-compose-mysql-stack', 'git-branch-review-environment-workflow',
  'ci-test-image-artifact-supply-chain', 'release-migration-rollout-rollback-runbook',
  'kubernetes-pod-deployment-service-ingress', 'kubernetes-probes-resources-hpa-debugging',
  'backend-test-pyramid-fixtures', 'openapi-bruno-api-security-test',
  'k6-load-qps-tps-latency-p99', 'mysql-query-connection-performance',
  'cache-async-pool-performance', 'profiling-capacity-timeout-shutdown',
  'logging-metrics-tracing-opentelemetry', 'alerting-slo-runbook',
  'enterprise-tools-environment-governance', 'node-nestjs-runtime-architecture',
  'react-nestjs-prisma-admin', 'node-redis-rabbitmq-minio-quality',
  'python-fastapi-runtime-async', 'python-sqlalchemy-mysql-auth',
  'python-redis-celery-minio-quality', 'go-gin-context-concurrency',
  'go-gorm-mysql-auth', 'go-redis-rabbitmq-minio-quality', 'enterprise-admin-capstone',
  'ecommerce-order-inventory-extension', 'ai-application-platform-extension'
] as const

const backendBySlug = new Map(backendArticlePool.map((article) => [article.slug, article]))
const backendArticles: ChapterMeta[] = backendArticleOrder.map((slug, index) => {
  const article = backendBySlug.get(slug)
  if (!article) throw new Error(`Backend article is missing from pool: ${slug}`)
  return { ...article, chapter: index + 1 }
})

const devopsArticles = course('devops', [
  item('第一部分：认识 AI Infra 与运行底座', 'ai-infra-role-map', '什么是 AI Infra？它为什么不只是部署模型', '从一次模型请求出发，解释 AI Infra 管理的计算、数据、模型、运行平台与可靠性，并划清它和算法、后端、MLOps、SRE 的关系。', ['AI Infra', 'Platform'], ['具备基础编程能力'], ['解释 AI Infra 管理的系统对象', '区分 AI Infra 与相邻工程岗位'], '完成一张 AI 请求与责任分层图', ['每一层都有输入、状态、输出和负责人', '托管模型与自托管模型的责任差异被说明'], 'official', 'decision'),
  item('第一部分：认识 AI Infra 与运行底座', 'linux-service-troubleshooting', 'Linux 服务是怎样运行的？从进程、端口到正常退出', '沿一个模型 API 从启动到退出的生命周期，解释程序、进程、端口、权限、文件描述符、内存、磁盘与信号。', ['Linux', 'Troubleshooting'], ['了解 AI Infra 管理的运行对象'], ['解释 Linux 服务从执行到监听的过程', '根据进程、端口、权限和资源证据定位故障'], '完成一次 Linux 服务生命周期检查', ['每个判断能对应具体命令字段', '退出前能够保存现场并验证资源释放'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：认识 AI Infra 与运行底座', 'network-dns-tls-http-proxy', 'DNS、TCP、TLS 和 HTTP 分别是什么？一次请求怎样到达服务器', '从一条 URL 开始，逐层解释域名解析、IP 与端口、TCP 连接、TLS 身份验证、HTTP 消息和反向代理。', ['Network', 'TLS', 'HTTP'], ['理解 Linux 进程与监听端口'], ['解释一次 HTTPS 请求经过的协议层次', '使用分层证据判断请求停止的位置'], '完成一条 HTTPS 请求证据链', ['DNS、TCP、TLS、HTTP 与代理证据被分开', '入口状态和源站状态可以独立核对'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：认识 AI Infra 与运行底座', 'oci-container-runtime', '什么是镜像和容器？OCI、Namespace 与 cgroup 如何隔离进程', '从一份 OCI 镜像到容器进程，解释文件层、rootfs、运行时、Namespace、cgroup、PID 1、挂载、端口和停止过程。', ['OCI', 'Container', 'cgroup'], ['理解 Linux 进程、端口和信号'], ['区分镜像、容器与进程', '解释隔离、资源限制和退出怎样共同作用'], '完成一张容器运行与停止证据链', ['镜像身份可以回到 digest', '容器内进程、资源、挂载和信号均有证据'], 'official', 'walkthrough'),
  item('第一部分：认识 AI Infra 与运行底座', 'docker-compose', 'Docker Compose 是什么？怎样写出一个可运行的多服务环境', '从 Docker 与容器的关系开始，逐项解释 Compose 项目、服务、网络、卷、健康检查和依赖，再写出可验证的本地 AI 服务栈。', ['Docker Compose', 'Container', 'Local Development'], ['理解镜像、容器、端口和挂载'], ['解释 Docker Compose 解决的问题和配置结构', '写出能区分启动、就绪、持久化与退出的多服务环境'], '完成一份可检查的本地 AI 服务栈 Compose 配置', ['服务通过名称互访且不误用 localhost', '数据、健康状态和停止边界均可验证'], 'official-guided-operation', 'implementation'),
  item('第一部分：认识 AI Infra 与运行底座', 'nginx-static-proxy-sse', 'Nginx 是什么？反向代理怎样转发普通 API 与 SSE', '从 Nginx 的进程与配置开始，解释反向代理、TLS 终止、上游连接、超时、缓冲和 SSE 流式转发，并完成一次分层验证。', ['Nginx', 'Reverse Proxy', 'SSE'], ['理解 DNS、TCP、TLS 与 HTTP', '理解容器端口与服务名'], ['解释 Nginx 与反向代理在请求链中的责任', '为普通 API 和 SSE 配置不同的缓冲与超时边界'], '完成一份可检查和可热加载的 Nginx 入口配置', ['普通响应与 SSE 的首字节行为可以分别验证', '入口错误和上游错误有独立证据'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 与数据底座', 'python-ai-service-runtime', 'Python 程序怎样同时处理多个任务？理解 asyncio、线程与多进程', '从任务等待与 CPU 执行开始，解释并发、并行、事件循环、协程、线程、进程和 CPython GIL，并完成一次可运行的选择与验证。', ['Python', 'asyncio', 'Concurrency'], ['会运行 Python 脚本', '理解进程和网络请求'], ['区分并发、并行和异步 I/O', '根据等待型与计算型工作选择协程、线程或进程'], '运行并解释一段混合 I/O 与 CPU 任务的 Python 程序', ['事件循环没有被同步阻塞调用卡住', '进程、线程和协程的状态边界可以说明'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 与数据底座', 'fastapi-openai-compatible-service', 'FastAPI 是什么？怎样实现一个兼容 OpenAI 的接口', '从 ASGI、路由和数据校验开始，解释 FastAPI 怎样接收请求、调用模型并返回 JSON 或 SSE，再实现和验证一个最小 OpenAI 兼容接口。', ['FastAPI', 'ASGI', 'OpenAI Compatible API'], ['理解 HTTP 请求与状态码', '理解 Python 协程和事件循环'], ['区分 FastAPI、ASGI Server 与业务服务', '实现带校验、错误和流式语义的聊天接口'], '完成一个可调用的最小 OpenAI 兼容 FastAPI 服务', ['非流式响应与流式事件结构均可解析', '请求取消、错误和就绪状态有明确边界'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 与数据底座', 'redis-operations', 'Redis 是什么？缓存、Session、限流与队列该怎样选择', '从 Redis 的内存数据结构和命令执行开始，解释 TTL、持久化、缓存一致性、Session、限流和队列，并完成一次故障与恢复推演。', ['Redis', 'Cache', 'Rate Limit'], ['理解网络请求与进程', '会使用基本命令行工具'], ['解释 Redis 的数据模型、过期和持久化边界', '为缓存、Session、限流与任务传递选择合适结构'], '为一条 AI 请求设计 Redis 状态与验证方法', ['Key、TTL、原子边界与数据来源明确', 'Redis 故障不会被误判为全部业务数据丢失'], 'official-guided-operation', 'decision'),
  item('第二部分：AI Backend 与数据底座', 'postgres-pgbouncer-operations', 'PostgreSQL 是什么？事务、索引、JSONB、向量与连接池如何配合', '从关系表和 SQL 开始，解释 PostgreSQL 的事务、MVCC、索引、JSONB、pgvector 与连接池，并沿一次 RAG 写入和检索完成验证。', ['PostgreSQL', 'pgvector', 'Connection Pool'], ['理解进程、网络连接和基本 SQL'], ['解释 PostgreSQL 怎样维护持久数据与并发事务', '为结构化字段、JSONB 与向量选择索引和连接边界'], '完成一条文档写入、向量检索和事务失败推演', ['权限、事务、查询计划和连接池证据可以对齐', '向量相似不被误写成最终权限或事实判断'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 与数据底座', 'queue-worker-plane', '消息队列是什么？后台任务怎样可靠地执行、重试和结束', '从消息、生产者和消费者开始，解释消息队列、ACK、重试、幂等、死信、延迟与顺序，并沿一次文档导入任务完成全生命周期推演。', ['Message Queue', 'Worker', 'Idempotency'], ['理解事务、进程和网络连接', '理解 Redis 与 PostgreSQL 的状态边界'], ['区分队列、发布订阅与日志型消息系统', '设计可确认、可重试、幂等且有结束状态的后台任务'], '完成一条文档导入任务的投递、执行与恢复设计', ['每次状态变化都有持久证据和所有者', 'Worker 崩溃不会让任务静默消失或无限重复'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 与数据底座', 'object-storage-minio', '对象存储是什么？模型和文档怎样上传、校验、发布与清理', '从 Bucket、Object Key 和对象元数据开始，解释分段上传、Checksum、预签名 URL、版本、发布、权限和生命周期，并完成一次制品验证推演。', ['Object Storage', 'MinIO', 'Artifact'], ['理解 HTTP、文件和数据库事务', '理解后台任务与幂等'], ['区分对象存储、文件系统和数据库的职责', '设计可校验、可发布、可回滚且可清理的对象生命周期'], '完成一次文档或模型制品上传与发布证据链', ['对象身份可回到 Key、版本与内容摘要', '上传中、已验证、已发布和待清理状态不会混用'], 'official-guided-operation', 'implementation'),
  item('第三部分：模型推理服务', 'llm-serving-architecture', 'LLM Serving 是什么？模型文件怎样变成稳定的推理 API', '从模型制品与 Tokenizer 开始，解释 Serving 的加载器、推理引擎、调度器、请求队列、健康状态和 API 边界，并完成一次从启动到响应的推演。', ['LLM Serving', 'Inference Engine', 'Scheduler'], ['理解 FastAPI、对象存储和后台任务', '会读基本 HTTP 请求与日志'], ['解释模型制品怎样被 Serving 加载并执行', '区分加载、存活、就绪、排队、推理和取消状态'], '完成一条模型服务启动与请求证据链', ['每个状态有所有者、输入与可观察结果', 'API 成功不被误写成模型质量或容量已经达标'], 'official', 'walkthrough'),
  item('第三部分：模型推理服务', 'open-model-huggingface-deployment', 'Hugging Face 是什么？如何识别并部署一个开源模型', '从 Hugging Face Hub、模型 Repository 和 Revision 开始，解释 Config、Tokenizer、权重、Model Card、许可证与远程代码，再完成一次可部署性审查。', ['Hugging Face', 'Open Model', 'Model Artifact'], ['理解模型制品、对象存储与 Serving', '会使用 Git 和命令行'], ['读懂一个模型仓库的身份、文件和使用边界', '把固定 Revision 转换成可验证的部署制品'], '完成一个开源模型仓库的静态部署审查', ['权重、Tokenizer、架构、许可证和来源能够对齐', '未在真实 GPU 运行的结论被明确标为静态检查'], 'official', 'walkthrough'),
  item('第三部分：LLM Serving', 'transformer-inference-lifecycle', 'Tokenize、Prefill、Decode 与流式推理生命周期', '沿一条生成请求解释分词、批处理、Prefill、逐 Token Decode、采样、停止和流式发送。', ['Transformer', 'Inference', 'Streaming'], ['理解 Token 与模型 API'], ['解释 TTFT 与 TPOT 的来源', '定位生成生命周期中的瓶颈'], '完成一条推理时序推演', ['每阶段输入输出明确', '流式输出不等于并行生成'], 'official', 'walkthrough'),
  item('第三部分：LLM Serving', 'continuous-batching-kv-cache', 'Continuous Batching、PagedAttention 与 KV Cache', '比较静态批处理和连续批处理，解释 KV Block、请求调度、Prefix Cache、公平性和显存压力。', ['vLLM', 'PagedAttention', 'KV Cache'], ['理解推理生命周期'], ['推演动态批处理调度', '解释吞吐、延迟和缓存复用取舍'], '完成一张批处理调度表', ['长短请求影响被解释', '跨租户缓存不会越过安全边界'], 'official', 'decision'),
  item('第三部分：LLM Serving', 'vllm-openai-compatible-serving', 'vLLM 服务、OpenAI 兼容接口与故障定位', '从启动参数、模型加载和 Readiness 进入普通请求、流式请求、并行策略、显存配置与错误分层。', ['vLLM', 'OpenAI Compatible API'], ['理解模型制品、推理生命周期和 GPU 栈'], ['解释 vLLM 服务启动与请求路径', '诊断模型加载、显存和接口错误'], '完成一份 vLLM 启动与排障设计', ['兼容范围被明确声明', '不提供未经目标硬件实测的吞吐数字'], 'official-guided-operation', 'diagnosis'),
  item('第三部分：LLM Serving', 'model-artifacts-precision-quantization', '模型制品、精度、量化与推理优化', '讲清 Config、Tokenizer、Safetensors、FP32、FP16、BF16、INT8、INT4、量化校准和性能验证。', ['Model Artifact', 'Precision', 'Quantization'], ['理解模型部署与 GPU 显存'], ['估算权重与运行显存', '判断量化收益和质量风险'], '制作一份模型制品与精度清单', ['权重和 Tokenizer Revision 匹配', '性能与质量使用同一候选版本验证'], 'official', 'decision'),
  item('第四部分：GPU 基础', 'gpu-computing-foundations', 'GPU 基础：是什么、怎么工作，以及 AI 为什么使用它', '先定义 GPU、主机与设备的数据路径，再用矩阵乘解释并行执行、显存、带宽和 AI 工作负载取舍。', ['GPU', 'Parallel Computing'], ['了解 CPU 与内存基础'], ['解释 GPU 适合深度学习的原因', '判断任务是否值得迁移到 GPU'], '完成一张 CPU 与 GPU 工作负载比较表', ['并行度、数据搬运和批量都被考虑', '不会把所有计算都归为 GPU 更快'], 'official', 'decision'),
  item('第四部分：GPU 基础', 'cuda-programming-model', 'CUDA 执行模型：Thread、Block、Grid、Warp 与 SM', '沿一次 Kernel Launch 解释 Host/Device、线程层级、Warp 调度、SM 资源、同步和内存访问。', ['CUDA', 'Kernel', 'SM'], ['理解 GPU 并行计算'], ['推演 CUDA Kernel 的执行层级', '识别分支和访存对利用率的影响'], '完成一张 CUDA 执行映射图', ['层级关系和资源所有者明确', '未使用真实 GPU 的内容标为机制推演'], 'official', 'walkthrough'),
  item('第四部分：GPU 基础', 'gpu-cuda-vram-nvidia-smi', 'GPU Driver、CUDA Runtime、HBM/VRAM 与显存诊断', '从 CUDA 不可用和 OOM 进入驱动兼容、权重、激活、工作区、KV Cache、数据搬运和多卡需求。', ['GPU', 'CUDA', 'VRAM'], ['Linux 与 CUDA 执行模型基础'], ['建立显存组成账本', '按证据区分兼容问题和容量问题'], '完成一张 GPU 预检与显存估算表', ['Driver 与 Runtime 关系正确', '没有 NVIDIA GPU 时只解释命令字段'], 'official', 'diagnosis'),
  item('第五部分：Kubernetes AI Infra', 'kubernetes-ai-platform-basics', '为什么 AI 平台需要 Kubernetes：控制面与核心对象', '从多模型、多副本和资源声明进入控制面、Pod、Deployment、Service、Ingress、配置与期望状态。', ['Kubernetes', 'AI Platform'], ['理解容器和网络'], ['解释 Kubernetes 的调谐模型', '划分应用、模型服务和平台职责'], '完成一张 AI 工作负载对象图', ['对象之间的控制关系明确', 'Kubernetes 不被描述为理解模型语义'], 'official', 'walkthrough'),
  item('第五部分：Kubernetes AI Infra', 'kubernetes-ai-service-deployment', 'Kubernetes 部署 AI 服务：GPU Operator、模型卷与探针', '把模型服务放入集群，解释 NVIDIA Device Plugin、GPU Operator、Runtime、模型制品卷、启动探针和滚动发布。', ['Kubernetes', 'GPU Operator', 'Deployment'], ['理解 Kubernetes 核心对象与 GPU 栈'], ['解释 GPU 能力进入 Pod 的路径', '设计模型加载和就绪检查'], '完成一份 AI 服务部署清单推演', ['探针不会把加载中实例送入流量', '配置示例明确未在真实集群执行'], 'official', 'walkthrough'),
  item('第五部分：Kubernetes AI Infra', 'kubernetes-gpu-scheduling', 'Kubernetes GPU 调度、共享、MIG 与自动扩缩容', '从资源请求进入设备发现、标签、污点、亲和性、拓扑、共享、MIG、队列和扩缩容信号。', ['Kubernetes', 'GPU Scheduling', 'MIG'], ['理解 Kubernetes 核心对象和 GPU 显存'], ['设计 GPU Workload 放置策略', '选择能反映推理压力的扩缩容信号'], '完成一张 GPU 调度决策表', ['设备数量和显存边界不混淆', '未在真实集群验证的结论被标记'], 'official', 'decision'),
  item('第六部分：企业级 AI Platform', 'llm-gateway-design', 'LLM Gateway：API Key、路由、限流、Token 与成本', '沿一次多模型请求解释身份、能力路由、配额、限流、预算、用量、错误映射和流式透传。', ['LLM Gateway', 'Rate Limit', 'Usage'], ['理解 FastAPI 与 LLM Serving'], ['设计稳定的模型网关契约', '隔离供应商差异和业务身份'], '完成一张网关请求状态表', ['模型路由有确定性输入', '未知结果不会被盲目重试或重复计费'], 'anonymized-practice', 'implementation'),
  item('第六部分：企业级 AI Platform', 'multi-model-platform', '多模型管理平台：注册、版本、路由、健康与切换', '从 GPT、Claude、Qwen、DeepSeek 和 Llama 的差异进入模型注册、能力声明、Deployment、探测和故障切换。', ['Model Registry', 'Routing', 'Control Plane'], ['理解模型网关和 Serving'], ['拆开控制面与数据面', '设计不绑定供应商名称的模型能力'], '完成一张模型注册与路由模型', ['模型 Revision 和部署实例分开', '健康切换不改变业务模型标识'], 'anonymized-practice', 'decision'),
  item('第六部分：企业级 AI Platform', 'agent-runtime-infrastructure', 'Agent Runtime 基础设施：LangGraph、MCP、工具与恢复', '沿一次长任务解释 Turn、状态图、工具契约、Checkpoint、Worker Lease、并发、取消和终态。', ['Agent Runtime', 'LangGraph', 'MCP'], ['理解 Python 并发、队列和模型网关'], ['设计可恢复的 Agent 执行状态', '限制工具权限、循环和并发预算'], '完成一条可恢复 Agent 时序', ['模型不能决定权限和业务终态', '取消、超时和工具失败可区分'], 'official', 'implementation'),
  item('第六部分：企业级 AI Platform', 'rag-infrastructure', 'RAG Infra：从文档发布到带证据回答', '完整串联文件准入、解析、切片、Embedding、向量索引、知识版本、检索、重排、上下文和引用。', ['RAG', 'Embedding', 'Vector Database'], ['理解对象存储、PostgreSQL、Worker 和 Agent Runtime'], ['设计可重建的知识导入平面', '设计受权限和版本约束的查询平面'], '完成一张 RAG 双平面架构图', ['半成品索引不会进入在线查询', '相似结果必须转换为可核对证据'], 'anonymized-practice', 'implementation'),
  item('第六部分：企业级 AI Platform', 'ai-observability-slo', 'OpenTelemetry、Prometheus、Grafana、Langfuse 与 AI SLO', '把入口、检索、模型、首 Token、队列、GPU、引用和终态连接成 Trace、Metric、Log 与质量信号。', ['OpenTelemetry', 'Prometheus', 'SLO'], ['理解完整 AI 请求链'], ['定义 AI 服务 SLI 与 SLO', '控制高基数、敏感数据和采样成本'], '制作一张 AI 服务观测表', ['Trace 与 Metric 可用稳定 ID 关联', 'Prompt 和原始文档不进入指标标签'], 'official', 'implementation'),
  item('第六部分：企业级 AI Platform', 'ai-capacity-load-cost', 'TTFT、TPOT、吞吐、队列、容量与成本', '用到达率、并发、服务时间、Little’s Law、开放负载和单位成本建立容量判断。', ['Capacity', 'Load Test', 'Cost'], ['理解推理生命周期和观测指标'], ['设计不会自我欺骗的压测', '拆分托管模型和自托管 GPU 成本'], '填写一张不含虚构数据的容量模板', ['指标口径和请求分布固定', '结论包含模型、版本、硬件和时间窗口'], 'official', 'diagnosis'),
  item('第六部分：企业级 AI Platform', 'ai-platform-security', 'AI Platform 安全：多租户、Secret、数据、模型与审计', '从恶意 Prompt、越权检索、泄露密钥和不可信模型制品进入纵深防御与责任边界。', ['AI Security', 'Multi-tenant', 'Secret'], ['理解网关、Agent、RAG 和模型平台'], ['建立 AI 平台威胁模型', '把租户范围落实到缓存、检索和工具执行'], '完成一张安全边界与审计矩阵', ['模型输出只作为不可信候选', 'Secret、Prompt 和文档内容不会进入公开日志'], 'official', 'diagnosis'),
  item('第七部分：分布式训练基础设施', 'distributed-training-infrastructure', '分布式训练：Data、Tensor、Pipeline Parallel、DDP 与 FSDP', '从单卡放不下和训练过慢出发，比较数据、参数和流水线并行的状态分布、通信和检查点。', ['Distributed Training', 'DDP', 'FSDP'], ['理解 GPU、显存和网络'], ['区分常见并行策略', '识别计算、通信、存储和恢复需求'], '设计一张两节点训练拓扑', ['策略选择能回到瓶颈', '不提供未经实测的训练吞吐'], 'official', 'decision'),
  item('第七部分：分布式训练基础设施', 'deepspeed-zero-infrastructure', 'DeepSpeed ZeRO：状态分片、Offload 与显存边界', '拆开参数、梯度和 Optimizer State，逐级解释 ZeRO-1、2、3、通信、CPU/NVMe Offload 和恢复。', ['DeepSpeed', 'ZeRO', 'Offload'], ['理解数据并行和训练显存'], ['推演 ZeRO 各阶段的状态所有权', '判断 Offload 的容量收益和带宽代价'], '完成一张 ZeRO 状态分片表', ['状态分布和通信阶段一致', 'DeepSpeed 不被描述为消除通信成本'], 'official', 'walkthrough'),
  item('第七部分：分布式训练基础设施', 'nccl-gpu-communication', 'NCCL、Collective、AllReduce 与多机 GPU 通信', '沿一次梯度 AllReduce 解释 Rank、Communicator、Ring/Tree、NVLink、PCIe、RDMA、拓扑和失败传播。', ['NCCL', 'AllReduce', 'GPU Communication'], ['理解分布式训练和网络'], ['解释 Collective 的输入输出和同步点', '按拓扑、网络和进程分层定位通信故障'], '完成一张 NCCL 通信与排障图', ['调用阻塞位置可定位', '没有真实集群时只做机制和日志推演'], 'official', 'diagnosis'),
  item('第八部分：交付与综合项目', 'ci-cd-artifact-security', 'CI/CD、SBOM、签名、Secret 与不可变制品', '从提交到已验证镜像，串联依赖锁定、测试、制品、SBOM、签名、证明、Secret 和环境提升。', ['CI/CD', 'Supply Chain', 'SBOM'], ['Git、容器和模型制品基础'], ['设计 AI 平台构建流水线', '让代码、模型和配置版本可追溯'], '完成一份不可变制品发布流程', ['同一制品在环境间提升', 'Secret 不进入镜像、SBOM 或日志'], 'official', 'implementation'),
  item('第八部分：交付与综合项目', 'candidate-migration-rollback-recovery', '候选验证、迁移、切流、回滚、备份与恢复', '沿预检、备份、候选实例、兼容迁移、旁路验证、流量切换、即时回滚和隔离恢复设计发布。', ['Deployment', 'Migration', 'Recovery'], ['理解数据库、容器、Kubernetes 和 CI/CD'], ['设计不中断依赖的低风险发布', '区分应用回滚、数据回退和灾难恢复'], '完成一份发布与恢复 Runbook', ['旧版本在切流时仍可用', '恢复能力由隔离演练而非备份文件证明'], 'anonymized-practice', 'implementation'),
  item('第八部分：交付与综合项目', 'enterprise-ai-platform-capstone', '综合项目：设计 Enterprise AI Platform', '把 Gateway、Agent、RAG、vLLM、GPU、PostgreSQL、Redis、对象存储、观测、成本和发布连接成可演进平台。', ['AI Platform', 'Architecture', 'Capstone'], ['完成前 36 章'], ['给出企业 AI 平台的模块、数据和运行边界', '制定从单体到多集群的建设顺序'], '完成一份 Enterprise AI Platform 设计包', ['正常、过载、取消、发布和恢复路径完整', '每项能力都有所有者、证据和停止条件'], 'anonymized-practice', 'decision')
])

const aiPracticeInputs: Array<Omit<ChapterMeta, 'category' | 'chapter' | 'stageKey' | 'sequence'>> = [
  { part: '能力选型', slug: 'ai-capability-selection', title: 'AI 能力选型：Prompt、RAG、Tool、Agent、Skill 与 MCP', description: '用同一个开发任务比较六类能力的输入、控制、数据、执行和失败边界。', tags: ['Prompt', 'RAG', 'Tool', 'Agent', 'Skill', 'MCP'], sourceKey: 'practice-capability-selection', dependsOn: [] },
  { part: 'Agent 协作', slug: 'subagent-collaboration-practice', title: 'SubAgent 协作：拆分任务、并行取证与结果合并', description: '用跨前后端改动练习依赖分析、上下文隔离、文件所有权和可验证结果契约。', tags: ['SubAgent', 'Parallelism', 'Context Isolation'], sourceKey: 'practice-subagent-collaboration', dependsOn: ['ai-capability-selection'] },
  { part: 'MCP 实践', slug: 'mcp-opportunity-analysis', title: '怎样从重复工作中识别 MCP 机会', description: '从跨系统复制、实时查询和标准操作判断普通 API、CLI、Skill 或 MCP。', tags: ['MCP', 'Opportunity Analysis', 'Tool'], sourceKey: 'practice-mcp-opportunity', dependsOn: ['ai-capability-selection'] },
  { part: 'MCP 实践', slug: 'fastmcp-server-practice', title: '用 FastMCP 实现一个可测试的只读 Server', description: '实现公开包信息查询，验证发现、Schema、Transport、超时、缓存和错误映射。', tags: ['MCP', 'FastMCP', 'Python'], sourceKey: 'practice-fastmcp-server', dependsOn: ['mcp-opportunity-analysis'] },
  { part: 'Skill 实践', slug: 'skill-design-practice', title: 'Skill 设计：触发、渐进式披露与回归评测', description: '把重复 Prompt 和检查步骤整理成可正确触发、按需加载并能测试的 Skill。', tags: ['Skill', 'SKILL.md', 'Evaluation'], sourceKey: 'practice-skill-design', dependsOn: ['ai-capability-selection'] },
  { part: 'Skill 实践', slug: 'article-check-skill-practice', title: '实现文章检查 Skill：规则、脚本与评测', description: '将 Frontmatter、标题、链接、示例和隐私检查拆成写作判断与确定性脚本。', tags: ['Skill', 'Content Quality', 'Testing'], sourceKey: 'practice-article-check-skill', dependsOn: ['skill-design-practice'] },
  { part: '研发交付', slug: 'ai-coding-delivery-chain', title: 'AI Coding 交付链：从需求到候选发布', description: '用一个功能贯穿需求、仓库取证、最小 Diff、测试、审查、候选验证与回滚。', tags: ['AI Coding', 'Testing', 'Delivery'], sourceKey: 'practice-ai-coding-delivery', dependsOn: ['subagent-collaboration-practice'] },
  { part: '研发交付', slug: 'spec-sdd-plan-first-development', title: 'Spec 与 SDD：让规格连接需求、代码与验证', description: '比较常见规格方法，并为已有仓库设计能随需求更新的轻量执行规格。', tags: ['Specification', 'SDD', 'Plan'], sourceKey: 'practice-spec-sdd', dependsOn: ['ai-coding-delivery-chain'] },
  { part: 'Harness 与工作系统', slug: 'coding-harness-troubleshooting', title: 'Coding Harness 排障：上下文、工具、环境与反馈', description: '沿一次不可重复任务的 Trace 区分输入截断、工具失败、越界修改、卡循环和恢复错误。', tags: ['Harness', 'Context Engineering', 'Troubleshooting'], sourceKey: 'practice-coding-harness', dependsOn: ['ai-coding-delivery-chain'] },
  { part: 'Harness 与工作系统', slug: 'personal-ai-work-system', title: '个人 AI 工作系统：任务模式、权限与长期反馈', description: '按不确定性、权限和持续周期安排计划、执行、评测、发布、增长和复盘。', tags: ['AI Work System', 'Goal', 'Feedback'], sourceKey: 'practice-personal-ai-system', dependsOn: ['coding-harness-troubleshooting', 'spec-sdd-plan-first-development'] },
]

const aiPracticeArticles: ChapterMeta[] = aiPracticeInputs.map((article, index) => ({
  ...article,
  category: 'ai-practice',
  stageKey: stageKeyFor('ai-practice', article.slug, article.part),
  chapter: index + 1,
  sequence: index + 1,
}))

const onnxPracticeArticles = course('onnx-practice', [
  item('浏览器推理', 'squeezenet-browser-inference', 'ONNX 浏览器图片识别：从整图分类到目标检测', '用 SqueezeNet 和 YOLOX-Nano 在浏览器里完成整图分类、关注区域分析和目标检测，沿 ONNX 计算图、Tensor、Worker、WebGPU/WASM 与后处理讲清推理过程。', ['ONNX', 'ONNX Runtime Web', 'SqueezeNet', 'YOLOX', 'WebGPU', 'WASM', 'Web Worker'], ['会阅读 TypeScript 和 Vue 组件', '理解图片像素、Promise 和基本浏览器 API'], ['能区分整图分类、关注区域和目标检测分别回答的问题', '能解释 ONNX 文件、ONNX Runtime、Execution Provider 和后处理的职责', '能把 RGB 图片转换为 NCHW Float32 Tensor，并读懂分类概率、检测框和置信度'], '在浏览器本地完成一次整图分类、关注区域分析和目标检测', ['整图分类返回 5 个中文备选类别', '遮挡敏感度分析能标出影响当前判断的区域', '目标检测能在内置图片上标出猫的类别、置信度和位置', '调整置信度阈值只重新筛选结果，不重复执行模型', 'WebGPU 不可用时自动回退 WASM，图片不上传到业务服务器'], 'official-guided-operation', 'implementation')
])

export const articles: ChapterMeta[] = [
  ...aiAgentArticles,
  ...seoArticles,
  ...relearnArticles,
  ...frontendArticles,
  ...contentLockedAlgorithmArticles,
  ...newAlgorithmArticles,
  ...backendArticles,
  ...devopsArticles,
  ...aiPracticeArticles,
  ...onnxPracticeArticles
]

export const articlePath = (chapter: ChapterMeta): string =>
  `/docs/${chapter.category}/${chapter.slug}`

export const articleFile = (chapter: ChapterMeta): string =>
  `docs/${chapter.category}/${chapter.slug}.md`

export const articlesByCategory = (category: Category): ChapterMeta[] =>
  articles.filter((chapter) => chapter.category === category)

export const articlesInStageOrder = (category: Category): ChapterMeta[] =>
  sectionTrackGroups(category).flatMap((track) =>
    track.groups.flatMap((group) => group.items)
  )

export const isContentLockedChapter = (chapter: ChapterMeta): boolean =>
  chapter.contentLocked === true
