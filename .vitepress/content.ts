export type Category =
  | 'ai-agent'
  | 'agent-practice'
  | 'seo'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'architecture'
  | 'engineering'

export type ArticleDepth = 'flagship' | 'core' | 'reference'

export interface ArticleMeta {
  title: string
  description: string
  category: Category
  group: string
  tags: string[]
  slug: string
  order: number
  depth: ArticleDepth
  series: string
}

export interface SectionMeta {
  key: Category
  title: string
  description: string
  path: string
}

export const sections: SectionMeta[] = [
  {
    key: 'ai-agent',
    title: 'AI 与 Agent',
    description: '从模型能力边界到可评测、可观测、可治理的 Agent 工程。',
    path: '/docs/ai-agent/'
  },
  {
    key: 'agent-practice',
    title: 'Agent 实践',
    description: '从零实现一个可检索、可恢复、可评测、可安全交付的生产级知识 Agent。',
    path: '/docs/agent-practice/'
  },
  {
    key: 'seo',
    title: 'SEO 与增长',
    description: '从搜索需求、技术抓取到内容、GEO、SEM 和可验证的增长闭环。',
    path: '/docs/seo/'
  },
  {
    key: 'frontend',
    title: '前端工程',
    description: '浏览器基础、算法、框架、构建系统与复杂前端工程。',
    path: '/docs/frontend/'
  },
  {
    key: 'backend',
    title: '后端工程',
    description: 'Node.js 与 Python 并重的 API、数据、任务和实时系统实践。',
    path: '/docs/backend/'
  },
  {
    key: 'devops',
    title: '运维与交付',
    description: '容器、网关、CI/CD、可观测性以及可回滚的安全发布。',
    path: '/docs/devops/'
  },
  {
    key: 'architecture',
    title: '架构实践',
    description: '从真实复杂系统中抽象出的边界、证据、异步与可靠性方法。',
    path: '/docs/architecture/'
  },
  {
    key: 'engineering',
    title: '工程手册',
    description: '调试、版本管理、问题复盘与持续学习的工作方法。',
    path: '/docs/engineering/'
  }
]

const article = (
  category: Category,
  group: string,
  order: number,
  slug: string,
  title: string,
  description: string,
  tags: string[],
  depth: ArticleDepth = 'core',
  series = group
): ArticleMeta => ({
  category,
  group,
  order,
  slug,
  title,
  description,
  tags,
  depth,
  series
})

const aiAgentArticles: ArticleMeta[] = [
  article('ai-agent', '基础与边界', 10, 'llm-application-boundaries', 'LLM 应用的能力边界', '用概率模型、上下文和外部验证理解大模型适合与不适合承担的工作。', ['LLM', '工程决策']),
  article('ai-agent', '基础与边界', 20, 'agent-lifecycle', 'Agent 的完整生命周期', '拆解一次 Agent 请求从理解、计划、执行到验证和持久化的状态变化。', ['Agent', '工作流'], 'flagship'),
  article('ai-agent', '编排与工具', 30, 'langgraph-state-orchestration', 'LangGraph 与状态编排', '用显式状态、条件边和扇出扇入构建可恢复的 Agent 工作流。', ['LangGraph', '状态机'], 'flagship'),
  article('ai-agent', '编排与工具', 40, 'tool-contract-design', 'Tool Calling 与工具契约设计', '从 Schema、权限、幂等和错误语义设计模型可安全调用的工具。', ['Tool Calling', 'Schema'], 'core', 'Agent 工具系统'),
  article('ai-agent', '编排与工具', 50, 'mcp-protocol-lifecycle', 'MCP 协议与连接生命周期', '从初始化、能力协商、传输到取消和恢复理解 MCP 的工程边界。', ['MCP', 'Protocol'], 'flagship', 'Agent 工具系统'),
  article('ai-agent', '编排与工具', 60, 'skills-subagents', 'Skill、SubAgent 与能力封装', '设计可发现、可组合、可授权且能独立验收的 Agent 能力单元。', ['Skill', 'SubAgent'], 'core', 'Agent 工具系统'),
  article('ai-agent', '上下文与记忆', 70, 'context-compression', '上下文工程与压缩', '设计信息预算、摘要层级和可追溯压缩，避免长对话退化。', ['Context', 'Token']),
  article('ai-agent', '上下文与记忆', 80, 'agent-memory', '短期记忆与长期记忆', '把会话状态、用户偏好和可删除的长期事实分层治理。', ['Memory', 'Privacy']),
  article('ai-agent', 'RAG 与证据', 90, 'rag-ingestion', 'RAG 数据处理流水线', '从解析、结构化切片到原子发布，建立可重建的知识数据链路。', ['RAG', 'Ingestion'], 'flagship'),
  article('ai-agent', 'RAG 与证据', 100, 'hybrid-retrieval', '混合检索、重排与引用', '组合关键词、向量、结构化检索和重排，并让回答绑定可见证据。', ['Retrieval', 'Rerank', 'Citation'], 'flagship'),
  article('ai-agent', '质量与治理', 110, 'agent-evaluation', 'Agent Eval 评测体系', '用离线样本、在线反馈和版本对比约束 Agent 质量演进。', ['Evaluation', 'Quality'], 'flagship'),
  article('ai-agent', '质量与治理', 120, 'agent-security-permissions', 'Agent 安全与权限边界', '以不可信输入、最小授权和证据范围控制提示注入与越权风险。', ['Security', 'Permission'], 'core', 'Agent 生产治理'),
  article('ai-agent', '质量与治理', 130, 'agent-observability-quality', 'Agent Trace 与质量闭环', '把模型、工具、检索、状态和引用串成可复现、可评测的执行轨迹。', ['Observability', 'Trace'], 'core', 'Agent 生产治理'),
  article('ai-agent', '质量与治理', 140, 'agent-cost-governance', 'Agent 成本、超时与降级治理', '用预算、截止时间、模型路由和降级策略控制不可预测的执行成本。', ['Cost', 'Timeout'], 'core', 'Agent 生产治理')
]

const agentPracticeArticles: ArticleMeta[] = [
  article('agent-practice', '一、定义系统', 10, '01-system-boundaries', '01｜定义生产级知识 Agent 的边界', '从答案契约、可信边界和非功能目标开始，而不是从调用模型开始。', ['Agent', 'System Design'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '一、定义系统', 20, '02-domain-model', '02｜领域模型与状态机', '把会话、回合、证据、声明、策略和发布版本建模为可持久化状态。', ['Domain Model', 'State Machine'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '二、构建知识', 30, '03-document-parsing-ocr', '03｜文档解析、OCR 与内容保真', '统一处理文本、HTML、PDF 和 Office 文档，并识别需要 OCR 的失败页面。', ['Ingestion', 'OCR'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '二、构建知识', 40, '04-semantic-chunking', '04｜语义切片与质量门禁', '保留标题、表格、列表和上下文关系，用可量化门禁阻止坏切片发布。', ['Chunking', 'Quality Gate'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '二、构建知识', 50, '05-versioned-index-release', '05｜向量化、索引版本与原子发布', '隔离构建中索引与在线索引，用版本钉住一次回答看到的知识快照。', ['Embedding', 'Release'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '三、检索证据', 60, '06-hybrid-retrieval', '06｜混合检索、查询规划与重排', '组合精确标识、全文、向量、表格和范围检索，并为失败设计降级。', ['Retrieval', 'Rerank'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '三、检索证据', 70, '07-acl-evidence-isolation', '07｜ACL、范围快照与证据隔离', '让权限约束进入每条检索分支、缓存键、引用和评测，而不是回答后过滤。', ['ACL', 'Evidence'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '四、编排 Agent', 80, '08-langgraph-state-reducers', '08｜LangGraph 状态、节点与 Reducer', '用显式状态和合并规则组织并行节点，避免共享可变状态和隐式控制流。', ['LangGraph', 'Reducer'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '四、编排 Agent', 90, '09-parallel-research-fusion', '09｜并行研究、融合与补充检索', '设计 fan-out/fan-in、证据去重、覆盖率计算和有上限的研究回路。', ['Parallel', 'Evidence Fusion'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '四、编排 Agent', 100, '10-claim-evidence-validation', '10｜Claim 级证据绑定与回答修复', '先规划可核验声明，再逐条绑定证据、合成答案并执行确定性校验。', ['Claim', 'Validation'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '五、上下文与工具', 110, '11-tool-mcp-trust', '11｜工具、MCP 与不可信结果', '把工具输出视为数据，用契约、超时、幂等、权限和注入检测包住副作用。', ['Tool Calling', 'MCP'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '五、上下文与工具', 120, '12-context-memory', '12｜上下文预算、滚动摘要与记忆', '在不可变会话记录之上编译模型上下文，区分近期消息、摘要和可删除长期记忆。', ['Context', 'Memory'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '六、可靠运行', 130, '13-durable-turn-idempotency', '13｜持久化回合、幂等与并发准入', '先持久化再执行，用唯一键、租约和所有权锁保证一次回合只被一个执行者推进。', ['Idempotency', 'Concurrency'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '六、可靠运行', 140, '14-checkpoint-recovery', '14｜Checkpoint、取消、超时与故障恢复', '区分业务状态、图检查点和事件日志，实现不重放已完成副作用的恢复路径。', ['Checkpoint', 'Recovery'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '六、可靠运行', 150, '15-sse-event-replay', '15｜SSE 流式事件、断线重放与背压', '以数据库事件序列为真相源，用 Redis 只做低延迟通知并支持 Last-Event-ID。', ['SSE', 'Event Log'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '七、质量与交付', 160, '16-agent-eval', '16｜Agent Eval 与回归门禁', '同时评测召回、权限、引用、事实、延迟、模型调用次数和注入防御。', ['Agent Eval', 'Regression'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '七、质量与交付', 170, '17-observability-governance', '17｜Trace、指标、成本与策略治理', '贯通 HTTP、模型、检索、图节点和持久状态，用版本化策略控制成本与质量。', ['Observability', 'Governance'], 'core', '生产级知识 Agent 实战'),
  article('agent-practice', '七、质量与交付', 180, '18-deployment-runbook', '18｜容器化交付、迁移、旁路验证与回滚', '把数据库迁移、候选环境、健康门禁、流量切换和恢复演练写进发布协议。', ['Deployment', 'Rollback'], 'core', '生产级知识 Agent 实战')
]

const seoArticles: ArticleMeta[] = [
  article('seo', '策略与市场', 10, 'search-growth-model', '搜索增长模型与 SEO 项目评估', '把需求、页面、抓取、点击、转化和收入放进同一条可验证的搜索增长链路。', ['SEO', 'Growth'], 'core', 'SEO 与增长实战'),
  article('seo', '策略与市场', 20, 'keyword-intent-page-mapping', '关键词意图与页面映射', '从真实搜索需求建立语义聚类、页面职责和关键词内耗的诊断方法。', ['SEO', 'Keywords'], 'core', 'SEO 与增长实战'),
  article('seo', '抓取与索引', 30, 'crawl-index-ranking', '搜索引擎如何发现、抓取、收录和排序', '沿发现、抓取、渲染、索引、排名到点击逐层定位搜索可见性问题。', ['SEO', 'Crawl'], 'core', 'SEO 技术基础'),
  article('seo', '架构与迁移', 40, 'site-architecture-url-internal-links', '网站架构、URL 与内链设计', '用信息架构、规范 URL、分页和内链权重控制大型站点的可理解性。', ['SEO', 'Information Architecture'], 'core', 'SEO 技术基础'),
  article('seo', '页面与内容', 50, 'on-page-seo-tdk-structured-data', '页面 SEO、TDK 与结构化数据', '从标题层级、规范链接、结构化信息到作者责任链完成页面验收。', ['SEO', 'Structured Data'], 'core', '内容与页面工程'),
  article('seo', '页面与内容', 60, 'ai-content-geo-quality', 'SEO 内容生产、AI 辅助与 GEO 质量控制', '把内容简报、证据链、AI 辅助边界和生成式搜索可引用性纳入生产门禁。', ['SEO', 'GEO', 'AI'], 'core', '内容与页面工程'),
  article('seo', '技术与媒体', 70, 'technical-seo-performance-media', '技术 SEO、性能与图片视频优化', '联合处理渲染、缓存、Core Web Vitals、图片、视频和专题页的搜索体验。', ['Technical SEO', 'Performance'], 'core', 'SEO 技术基础'),
  article('seo', '站外与品牌', 80, 'links-brand-mentions', '外链、品牌提及与站外增长', '用可引用资产、链接属性和品牌监测建立可持续的站外信号，而不是购买链接。', ['SEO', 'Brand'], 'core', 'SEO 与增长实战'),
  article('seo', '数据与实验', 90, 'seo-analytics-attribution', 'SEO 数据分析、归因与实验', '区分展现、点击、到站、有效线索和收入，建立 URL 级看板与实验阈值。', ['SEO', 'Analytics'], 'core', 'SEO 与增长实战'),
  article('seo', 'SEM', 100, 'sem-account-keywords-bidding', 'SEM 账户结构、关键词、出价与预算', '按品牌、非品牌和竞品拆分搜索广告账户，用边际回报管理预算。', ['SEM', 'Bidding'], 'core', 'SEO 与 SEM 协同'),
  article('seo', 'SEM', 110, 'sem-creative-landing-tracking', 'SEM 创意、落地页与转化追踪', '把搜索词、创意承诺、落地页体验和服务端转化核对连成闭环。', ['SEM', 'Conversion'], 'core', 'SEO 与 SEM 协同'),
  article('seo', '执行与治理', 120, 'seo-sem-90-day-runbook', 'SEO 与 SEM 协同的 90 天执行手册', '用分阶段目标、问题分级、每周决策日志和停止条件推进搜索增长。', ['SEO', 'SEM', 'Runbook'], 'core', 'SEO 与 SEM 协同')
]

const algorithmSpecs = [
  ['dataStructures', '数据结构基础', '从访问模式出发选择数组、链表、栈、队列、树与图。', ['数据结构']],
  ['complexity', '复杂度分析', '用时间和空间增长率评估算法，而不是只比较一次运行耗时。', ['复杂度']],
  ['array', '数组、哈希与双指针', '掌握数组索引、哈希映射和双指针的典型问题模型。', ['数组', '双指针']],
  ['string', '字符串算法', '处理字符串扫描、窗口、映射与边界条件。', ['字符串']],
  ['stack', '栈与括号匹配', '利用后进先出不变量解决匹配与表达式问题。', ['栈']],
  ['queue', '队列与滑动窗口', '用先进先出和单调结构处理流式数据与窗口问题。', ['队列', '滑动窗口']],
  ['chain', '链表合并与反转', '围绕 next 指针不变量完成链表结构变换。', ['链表']],
  ['chainHead', '链表倒数节点与快慢指针', '通过固定间距指针处理倒数位置和删除操作。', ['链表', '双指针']],
  ['chainCicle', '环形链表', '使用快慢指针判断环、定位入口并分析相遇条件。', ['链表', '环检测']],
  ['sort', '排序算法', '理解常见排序的稳定性、复杂度和适用数据分布。', ['排序']],
  ['tree', '二叉树的迭代遍历', '用显式栈表达前序、中序和后序遍历。', ['二叉树']],
  ['ergodicTree', '二叉树的递归与层序遍历', '比较深度优先和广度优先的状态组织方式。', ['二叉树', '遍历']],
  ['bstTree', '二叉搜索树', '利用有序不变量完成查找、插入、删除和验证。', ['二叉搜索树']],
  ['DFS', '深度优先搜索', '用递归或栈探索树、图与组合空间。', ['DFS']],
  ['thinking', '递归与回溯思维', '把选择、约束、撤销抽象为可验证的搜索树。', ['递归', '回溯']],
  ['dynamic', '动态规划', '从重叠子问题和状态转移建立可复用的求解模型。', ['动态规划']]
] as const

const algorithmArticles = algorithmSpecs.map(([slug, title, description, tags], index) =>
  article('frontend', '算法与数据结构', 100 + index * 10, `algorithms/${slug}`, title, description, [...tags, 'TypeScript'], 'reference')
)

const relearnSpecs = [
  ['overview/start', '重学前端：学习方法', '以规范、运行时和工程实践三条线重建前端知识体系', ['学习方法']],
  ['html/html_standard', 'HTML 标准与语言设计', '理解 HTML 的容错模型、元素语义和现行标准', ['HTML']],
  ['html/html_DTD', 'DOCTYPE、DTD 与标准模式', '厘清历史 DTD 与现代 HTML doctype 的关系', ['HTML', 'DOCTYPE']],
  ['html/html_head', 'HTML Head 与元数据', '正确组织标题、链接、脚本和页面元信息', ['HTML', 'Metadata']],
  ['html/html_tag', '语义化 HTML', '用原生元素表达文档结构和交互语义', ['HTML', '语义化']],
  ['html/html_ARIA', 'ARIA 与可访问性语义', '坚持原生优先并在必要时补充角色、状态与关系', ['ARIA', 'Accessibility']],
  ['html/html_tramslate', '链接、资源与嵌入内容', '理解 href、src、srcset、iframe 等资源语义', ['HTML', 'Resource']],
  ['css/css_rule', 'CSS At-rules 与规则系统', '梳理媒体、字体、动画、支持查询等规则', ['CSS']],
  ['css/css_select', 'CSS 选择器与伪元素', '理解选择器匹配、优先级、伪类和伪元素', ['CSS', 'Selector']],
  ['css/css_compose', 'CSS 布局与格式化上下文', '从正常流、定位和格式化上下文理解布局', ['CSS', 'Layout']],
  ['css/css_color', 'Web 色彩系统', '从颜色空间、透明度和对比度理解网页色彩', ['CSS', 'Color']],
  ['css/css_animation', 'CSS 动画与过渡', '区分 transition、animation 与合成友好属性', ['CSS', 'Animation']],
  ['css/css_link', 'CSS 与文档资源', '理解样式表加载、资源引用和媒体条件', ['CSS', 'Resource']],
  ['javascript/js_type', 'JavaScript 类型系统', '掌握语言类型、转换、相等性和数值边界', ['JavaScript', 'Type']],
  ['javascript/js_object', 'JavaScript 对象模型', '理解属性描述符、内建对象和对象能力边界', ['JavaScript', 'Object']],
  ['javascript/js_prototype', '原型与继承', '从内部原型链到 class 语法理解对象继承', ['JavaScript', 'Prototype']],
  ['javascript/js_function', 'JavaScript 函数', '比较普通函数、箭头函数、生成器和异步函数', ['JavaScript', 'Function']],
  ['javascript/js_closure', '作用域与闭包', '从词法环境和生命周期理解闭包的能力与成本', ['JavaScript', 'Closure']],
  ['javascript/js_eventLoop', '事件循环与任务队列', '理解浏览器任务、微任务、渲染机会和阻塞', ['JavaScript', 'Event Loop']],
  ['javascript/js_grammar', 'JavaScript 语法结构', '区分脚本、模块、声明、语句和表达式', ['JavaScript', 'Grammar']],
  ['javascript/js_token', 'JavaScript 词法系统', '理解标识符、字面量、模板和自动分号插入前提', ['JavaScript', 'Lexer']],
  ['javascript/js_semicolon', '自动分号插入', '用语法规则而不是风格争论理解 ASI', ['JavaScript', 'ASI']],
  ['javascript/js_completion', 'Completion Record 与控制流', '从规范内部记录理解 return、throw、break 和 continue', ['JavaScript', 'Control Flow']],
  ['browser/browser_http', '浏览器网络与 HTTP', '从导航请求到 HTTP/2、HTTP/3 理解现代网络栈', ['Browser', 'HTTP']],
  ['browser/browser_dom', 'HTML 解析与 DOM 构建', '理解 tokenizer、tree builder 和容错解析', ['Browser', 'DOM']],
  ['browser/browser_cssdom', 'CSSOM 与样式计算', '理解样式表解析、层叠、继承和计算值', ['Browser', 'CSSOM']],
  ['browser/browser_domApi', 'DOM API 与节点操作', '掌握节点、遍历、Range 和变更观察', ['Browser', 'DOM API']],
  ['browser/browser_event', 'DOM 事件系统', '理解事件路径、捕获、冒泡、默认行为和委托', ['Browser', 'Event']],
  ['browser/browser_maker', '浏览器进程与线程模型', '建立页面、进程、线程和安全隔离的现代认知', ['Browser', 'Process']],
  ['browser/browser_css', '浏览器样式与布局过程', '串联样式计算、布局、绘制与合成', ['Browser', 'Rendering']],
  ['browser/browser_print', '浏览器绘制与合成', '理解 paint、layer、raster 和 compositor', ['Browser', 'Rendering']],
  ['engineering/sum_architecture', '前端架构与组件化', '从职责、依赖和变化频率设计组件边界', ['Architecture']],
  ['engineering/sum_continue', '持续集成方法', '让自动检查成为可重复的质量反馈回路', ['CI']],
  ['engineering/sum_performance', '性能工程方法', '从指标、预算、测量到回归建立性能闭环', ['Performance']],
  ['engineering/sum_system', '前端工程系统设计', '围绕开发、构建、发布和观测搭建工程系统', ['Engineering']],
  ['engineering/sum_tool', '前端工具链方法', '基于反馈周期和可替换性选择工具', ['Tooling']],
  ['questions/other_question', '前端常见问题与判断框架', '把零散问题转化为规范、浏览器和工程约束的判断方法', ['FAQ']]
] as const

const relearnArticles = relearnSpecs.map(([slug, title, description, tags], index) =>
  article('frontend', '重学前端', 300 + index * 10, `relearn/${slug}`, title, description, [...tags], 'reference')
)

const frontendDeepArticles: ArticleMeta[] = [
  article('frontend', '现代前端工程', 700, 'typescript-engineering', 'TypeScript 工程实践', '用类型边界、运行时校验和分层类型控制大型前端复杂度。', ['TypeScript', 'Architecture'], 'flagship'),
  article('frontend', '现代前端工程', 710, 'vue-reactivity-scheduler', 'Vue 3 响应式与调度', '从依赖收集、批处理和更新队列理解 Vue 3 运行机制。', ['Vue 3', 'Scheduler']),
  article('frontend', '现代前端工程', 720, 'react-fiber-concurrency', 'React Fiber 与并发渲染', '理解 Fiber 数据结构、Render/Commit 阶段和并发特性边界。', ['React', 'Fiber']),
  article('frontend', '现代前端工程', 730, 'nextjs-rendering-cache', 'Next.js 渲染与缓存', '围绕数据新鲜度选择静态、动态、流式渲染和缓存策略。', ['Next.js', 'Cache']),
  article('frontend', '现代前端工程', 740, 'vite-dev-server-plugins', 'Vite 开发服务器与插件', '理解原生 ESM、依赖预构建、HMR 和插件生命周期。', ['Vite', 'Plugin'], 'flagship'),
  article('frontend', '现代前端工程', 750, 'bundlers-code-splitting', 'Rollup、esbuild 与代码分割', '比较构建工具职责并设计可测量的包边界。', ['Rollup', 'esbuild'], 'flagship'),
  article('frontend', '现代前端工程', 760, 'component-library-design-system', '组件库与设计系统工程', '从 API、主题、文档、消费沙箱到版本发布治理组件资产。', ['Component Library', 'Design System'], 'flagship'),
  article('frontend', '现代前端工程', 770, 'manifest-v3-extension', 'Manifest V3 浏览器扩展架构', '设计最小权限、页面采集、后台通信与本地数据边界。', ['Browser Extension', 'Manifest V3'], 'flagship'),
  article('frontend', '质量与体验', 780, 'web-performance', 'Web 性能工程', '以用户指标、资源优先级和回归预算驱动性能优化。', ['Web Performance', 'Core Web Vitals']),
  article('frontend', '质量与体验', 790, 'sentry-sourcemap', 'Sentry、Source Map 与前端可观测性', '建立错误采集、版本关联、源码定位和隐私控制链路。', ['Sentry', 'Source Map']),
  article('frontend', '质量与体验', 800, 'browser-security', '浏览器安全边界', '系统理解同源、Cookie、CSP、CSRF、XSS 与客户端存储。', ['Security', 'Browser']),
  article('frontend', '质量与体验', 810, 'realtime-communication', 'SSE 与 WebSocket 实时通信', '围绕方向性、背压、重连、回放和扩容设计浏览器实时链路。', ['SSE', 'WebSocket'], 'core', '浏览器数据通道'),
  article('frontend', '质量与体验', 820, 'service-worker-offline', 'Service Worker 与离线架构', '从生命周期、缓存一致性和更新策略构建可靠的离线体验。', ['Service Worker', 'PWA'], 'core', '浏览器数据通道'),
  article('frontend', '质量与体验', 830, 'large-file-transfer', '大文件校验、分片与断点续传', '设计增量哈希、分片并发、幂等合并和失败恢复协议。', ['File Upload', 'Resumable'], 'core', '浏览器数据通道')
]

const backendArticles: ArticleMeta[] = [
  article('backend', 'Node.js', 10, 'node-layered-architecture', 'Node.js 与 NestJS 分层架构', '用模块、应用服务和适配器控制 Node 服务依赖方向。', ['Node.js', 'NestJS'], 'flagship'),
  article('backend', 'Node.js', 20, 'node-auth-token-lifecycle', 'Node 认证与 Token 生命周期', '从登录会话、签名验证、轮换和撤销构建可治理的身份链路。', ['Node.js', 'Auth'], 'core', 'Node.js 服务安全'),
  article('backend', 'Node.js', 30, 'node-acl-data-scope', 'Node ACL 与数据范围控制', '把角色、资源范围和查询约束落实到服务与数据访问边界。', ['Node.js', 'ACL'], 'core', 'Node.js 服务安全'),
  article('backend', 'Node.js', 40, 'node-queues-idempotency', 'Node 队列、幂等与重试', '设计可重复提交、失败重试和去重的异步任务。', ['Node.js', 'Queue']),
  article('backend', 'Node.js', 50, 'node-realtime', 'Node 实时通信服务', '处理 SSE/WebSocket 的连接、背压、重放和水平扩展。', ['Node.js', 'Realtime']),
  article('backend', 'Python', 60, 'fastapi-layered-architecture', 'FastAPI 分层架构', '在路由、服务、仓储和领域之间保持清晰边界。', ['Python', 'FastAPI'], 'flagship'),
  article('backend', 'Python', 70, 'python-document-pipeline', 'Python 文档处理流水线', '构建解析、OCR、切片、质量检查和原子发布流程。', ['Python', 'Document'], 'flagship'),
  article('backend', 'Python', 80, 'sqlalchemy-transaction-boundaries', 'SQLAlchemy 事务与数据访问边界', '控制 Session 生命周期、并发写入、锁和领域事务的一致性。', ['Python', 'SQLAlchemy'], 'core', 'Python 数据系统'),
  article('backend', 'Python', 90, 'postgres-pgvector-hybrid-search', 'PostgreSQL、pgvector 与混合检索', '组合关系过滤、全文检索、向量召回和可解释排序。', ['PostgreSQL', 'pgvector'], 'flagship', 'Python 数据系统'),
  article('backend', 'Python', 100, 'celery-async-tasks', 'Celery 异步任务工程', '治理任务路由、重试、取消、进度和可观测性。', ['Python', 'Celery']),
  article('backend', 'Go', 110, 'go-gin-layered-errors', 'Go 与 Gin 的服务分层和错误模型', '用显式依赖、错误分类和协议映射构建可测试的 Go API。', ['Go', 'Gin'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 120, 'go-grpc-contract-evolution', 'gRPC 与 Protobuf 契约演进', '处理兼容字段、状态码、截止时间和跨服务契约发布。', ['Go', 'gRPC', 'Protobuf'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 130, 'go-context-concurrency', 'Goroutine、Context、取消与背压', '用结构化并发管理生命周期、资源上限和慢消费者。', ['Go', 'Concurrency'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 140, 'go-data-observability', 'GORM、Redis 与 OpenTelemetry', '串联事务、缓存一致性和 Trace，构建可诊断的数据访问链路。', ['Go', 'GORM', 'OpenTelemetry'], 'core', 'Go 服务工程')
]

const devopsArticles: ArticleMeta[] = [
  article('devops', '基础设施', 10, 'docker-compose', 'Docker 与 Compose', '用不可变镜像、健康检查和持久化边界组织多服务环境。', ['Docker', 'Compose']),
  article('devops', '基础设施', 20, 'nginx-reverse-proxy', 'Nginx 与反向代理', '正确处理 upstream、TLS、静态资源、SSE 和代理超时。', ['Nginx', 'Proxy']),
  article('devops', '交付', 30, 'ci-cd', 'CI/CD 质量流水线', '把静态检查、测试、制品和受控发布串成可审计流程。', ['CI/CD', 'Artifact'], 'flagship'),
  article('devops', '可观测性', 40, 'observability', '日志、指标与链路追踪', '用统一关联标识和信号分工定位分布式系统问题。', ['Logging', 'Metrics', 'Tracing']),
  article('devops', '交付', 50, 'candidate-validation-traffic-switching', '候选验证、流量切换与回滚', '用同构候选、健康门禁和原子切流控制应用发布风险。', ['Canary', 'Rollback'], 'flagship', '安全交付'),
  article('devops', '交付', 60, 'backup-migration-recovery', '备份、数据库迁移与恢复演练', '把可恢复备份、兼容迁移和恢复时间目标纳入发布闭环。', ['Backup', 'Migration', 'Recovery'], 'core', '安全交付')
]

const architectureArticles: ArticleMeta[] = [
  article('architecture', '系统方法', 10, 'layered-boundaries', '分层边界与依赖方向', '按变化原因和数据所有权划分 API、服务、仓储与集成层。', ['Architecture', 'Boundaries']),
  article('architecture', '系统方法', 20, 'async-task-lifecycle', '异步任务生命周期设计', '统一创建、排队、执行、取消、终态和清理的状态模型。', ['Async', 'State Machine']),
  article('architecture', 'AI 系统', 30, 'evidence-driven-systems', '证据驱动的 AI 系统', '让检索证据、事实声明、引用和权限形成可审计链路。', ['Evidence', 'RAG'], 'flagship'),
  article('architecture', '平台工程', 40, 'modular-platform', '模块化能力平台', '把工具、Agent、规范和组件封装为可发现、可组合、可治理的资产。', ['Platform', 'Modularity']),
  article('architecture', '可靠性', 50, 'reliability-patterns', '重试、去重、回放与降级', '用一致语义组合常见可靠性模式，避免重复副作用和恢复盲区。', ['Reliability', 'Idempotency'])
]

const engineeringArticles: ArticleMeta[] = [
  article('engineering', '工作方法', 10, 'systematic-debugging', '系统化调试方法', '从复现、观测、假设到最小验证建立稳定排障路径。', ['Debugging', 'DevTools']),
  article('engineering', '工作方法', 20, 'git-release-management', 'Git 与变更发布', '用小提交、评审、版本和回滚管理工程变更风险。', ['Git', 'Release']),
  article('engineering', '持续学习', 30, 'engineering-resources', '工程问题与学习资源索引', '按问题类型组织工具、规范、文档和持续学习路径。', ['Resources', 'Learning'])
]

export const articles: ArticleMeta[] = [
  ...aiAgentArticles,
  ...agentPracticeArticles,
  ...seoArticles,
  ...algorithmArticles,
  ...relearnArticles,
  ...frontendDeepArticles,
  ...backendArticles,
  ...devopsArticles,
  ...architectureArticles,
  ...engineeringArticles
]

export const articlePath = (item: ArticleMeta): string =>
  `/docs/${item.category}/${item.slug}`

export const articleFile = (item: ArticleMeta): string =>
  `docs/${item.category}/${item.slug}.md`

export const articlesByCategory = (category: Category): ArticleMeta[] =>
  articles
    .filter((item) => item.category === category)
    .sort((left, right) => left.order - right.order)
