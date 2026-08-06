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
    description: '从大模型边界开始，通过实验理解工具、上下文、RAG、评测与安全治理。',
    path: '/docs/ai-agent/'
  },
  {
    key: 'agent-practice',
    title: 'Agent 实践',
    description: '18 篇连续实践，从一次问答推进到知识、检索、编排、恢复、评测和交付。',
    path: '/docs/agent-practice/'
  },
  {
    key: 'seo',
    title: 'SEO 与增长',
    description: '沿 18 个搜索问题学习需求、页面、抓取、内容、数据、GEO 与搜索广告。',
    path: '/docs/seo/'
  },
  {
    key: 'frontend',
    title: '前端',
    description: '保留算法与重学前端课程，并从浏览器现象进入框架、构建和复杂交互。',
    path: '/docs/frontend/'
  },
  {
    key: 'backend',
    title: '后端',
    description: '从一条请求或任务链学习 Node.js、Python、Go 的事务、权限、异步与数据系统。',
    path: '/docs/backend/'
  },
  {
    key: 'devops',
    title: '运维与交付',
    description: '从服务启动开始，逐步掌握容器、网关、CI、观测、切流和恢复演练。',
    path: '/docs/devops/'
  },
  {
    key: 'architecture',
    title: '架构实践',
    description: '从具体场景推导边界、状态、证据、模块所有权与可靠性取舍。',
    path: '/docs/architecture/'
  },
  {
    key: 'engineering',
    title: '工程手册',
    description: '用可复现实验学习调试、变更发布与证据检索，并留下工作模板。',
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
  article('ai-agent', '基础与边界', 20, 'agent-lifecycle', 'Agent 的完整生命周期', '用一次资料问答看懂 Agent 怎样理解目标、选择工具、观察结果、生成答案并完成验证。', ['Agent', '工作流'], 'flagship'),
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
  article('ai-agent', '质量与治理', 130, 'agent-observability-quality', 'Agent Trace 与质量验证', '把模型、工具、检索、状态和引用串成可复现、可评测的执行轨迹。', ['Observability', 'Trace'], 'core', 'Agent 生产治理'),
  article('ai-agent', '质量与治理', 140, 'agent-cost-governance', 'Agent 成本、超时与降级治理', '用预算、截止时间、模型路由和降级策略控制不可预测的执行成本。', ['Cost', 'Timeout'], 'core', 'Agent 生产治理')
]

const agentPracticeArticles: ArticleMeta[] = [
  article('agent-practice', '一、定义系统', 10, '01-system-boundaries', '01｜从零认识 Agent：一个问题怎样变成答案', '从普通聊天、工作流和 RAG 的区别开始，理解 Agent 的适用场景、常用框架和一次请求的完整执行链。', ['Agent', '入门'], 'flagship', '知识 Agent 分步实践'),
  article('agent-practice', '一、定义系统', 20, '02-domain-model', '02｜把一次回答拆成可恢复的状态', '用会话、回合、事件、证据和 Claim 描述一次 Agent 执行，并区分三种状态。', ['Domain Model', 'State Machine'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '二、构建知识', 30, '03-document-parsing-ocr', '03｜解析文档，并只对缺失页面做 OCR', '从普通文本解析开始，逐步处理 PDF 扫描页、Office 结构、OCR 失败和内容回填。', ['Ingestion', 'OCR'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '二、构建知识', 40, '04-semantic-chunking', '04｜把文档切成保留结构的片段', '从标题、段落、列表、代码和表格识别开始，生成稳定片段并用覆盖率阻止内容丢失。', ['Chunking', 'Quality Gate'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '二、构建知识', 50, '05-versioned-index-release', '05｜构建新索引，并在校验后激活', '将解析、切片、向量和发布拆成候选版本，处理幂等重放、旧任务保护与原子激活。', ['Embedding', 'Release'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '三、检索证据', 60, '06-hybrid-retrieval', '06｜从关键词检索扩展到混合召回', '用同一个问题逐步加入精确、全文、向量、表格检索，再完成融合、重排和降级。', ['Retrieval', 'Rerank'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '三、检索证据', 70, '07-acl-evidence-isolation', '07｜让权限进入每一次检索', '从两个用户得到不同结果的场景出发，把身份、显式范围、SQL、缓存和引用校验串起来。', ['ACL', 'Evidence'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '四、编排 Agent', 80, '08-langgraph-state-reducers', '08｜把串行流程改造成 LangGraph 状态图', '从一条串行函数开始，逐步加入真实节点、Send 并行分支、Reducer 和条件边。', ['LangGraph', 'Reducer'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '四、编排 Agent', 90, '09-parallel-research-fusion', '09｜并行检索后，怎样合并成一组证据', '从多目标问题出发，动态创建检索分支，按完成顺序收集、去重、审查并有限补充研究。', ['Parallel', 'Evidence Fusion'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '四、编排 Agent', 100, '10-claim-evidence-validation', '10｜让答案中的每个事实都绑定证据', '从候选证据生成 Claim，完成流式合成、五类验证和最多一次有限修复。', ['Claim', 'Validation'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '五、上下文与工具', 110, '11-tool-mcp-trust', '11｜通过 MCP 暴露只读知识能力', '从 initialize 到 tools/call，逐步实现认证、只读工具、权限复用和不可信结果处理。', ['MCP', 'Read-only Tools'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '五、上下文与工具', 120, '12-context-memory', '12｜在 Token 预算内组织对话和记忆', '从短对话开始，逐步加入近期消息、滚动摘要、确定性裁剪和用户可控的长期记忆。', ['Context', 'Memory'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '六、可靠运行', 130, '13-durable-turn-idempotency', '13｜让重复请求只执行一次', '从一次网络重试开始，加入幂等键、提交后派发、并发准入和执行所有权租约。', ['Idempotency', 'Concurrency'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '六、可靠运行', 140, '14-checkpoint-recovery', '14｜Worker 中断后怎样恢复回合', '从持久 Deadline、协作取消、按需 Checkpoint 和停滞扫描构建可恢复执行。', ['Checkpoint', 'Recovery'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '六、可靠运行', 150, '15-sse-event-replay', '15｜SSE 断线后从上一条事件继续', '用数据库事件序列作为真相源，让 Redis 只负责提醒，并实现 Last-Event-ID 与轮询降级。', ['SSE', 'Event Replay'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '七、质量与交付', 160, '16-agent-eval', '16｜用同一套 Runtime 做 Agent Eval', '固定知识与策略版本，逐步检查检索、事实、引用、范围、权限和提示注入。', ['Agent Eval', 'Regression'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '七、质量与交付', 170, '17-observability-governance', '17｜从一次请求追到最终引用', '把 HTTP、图节点、检索、模型、首事件、引用和终态关联到同一条 Trace。', ['Observability', 'Trace'], 'core', '知识 Agent 分步实践'),
  article('agent-practice', '七、质量与交付', 180, '18-deployment-runbook', '18｜从候选容器到失败回滚', '沿真实更新脚本讲清预检、备份、构建、候选验证、迁移、滚动替换和回滚。', ['Deployment', 'Rollback'], 'core', '知识 Agent 分步实践')
]

const seoArticles: ArticleMeta[] = [
  article('seo', '一、认识搜索增长', 10, 'search-growth-model', 'SEO、SEM、GEO：用户怎样找到一个网站', '从一个真实搜索问题开始，分清自然搜索、付费搜索和生成式搜索各自解决什么问题。', ['SEO', 'SEM', 'GEO', '搜索增长'], 'flagship', '搜索增长零基础教程'),
  article('seo', '一、认识搜索增长', 20, 'seo-project-evaluation', '一个项目值得做 SEO 吗', '在写文章前判断需求、业务匹配、竞争、交付能力和回报周期。', ['SEO', 'Project Evaluation'], 'core', '搜索增长零基础教程'),
  article('seo', '二、需求与页面', 30, 'crawl-index-ranking', '搜索引擎怎样发现、收录和排序网页', '沿发现、抓取、渲染、索引、排序和点击看懂一次搜索结果的产生。', ['SEO', 'Crawl'], 'core', '搜索增长零基础教程'),
  article('seo', '二、需求与页面', 40, 'keyword-intent-page-mapping', '怎样从用户问题找到关键词', '从真实问题识别搜索意图、建立关键词分类，并避免只看工具搜索量。', ['SEO', 'Keywords'], 'core', '搜索增长零基础教程'),
  article('seo', '二、需求与页面', 50, 'keyword-page-planning', '怎样把关键词规划成网站页面', '用页面映射表决定一个关键词应该进入教程、产品页、专题页还是现有页面。', ['SEO', 'Page Planning'], 'core', '搜索增长零基础教程'),
  article('seo', '三、网站与页面', 60, 'site-architecture-url-internal-links', '网站结构、URL 与内链怎样设计', '从栏目、URL、导航和上下文链接搭建用户与搜索引擎都能理解的网站。', ['SEO', 'Information Architecture'], 'core', 'SEO 网站基础'),
  article('seo', '三、网站与页面', 70, 'on-page-seo-tdk-structured-data', '一张网页怎样完成基础 SEO', '逐项完成标题、摘要、正文层级、规范链接和结构化数据。', ['SEO', 'Structured Data'], 'core', 'SEO 网站基础'),
  article('seo', '三、网站与页面', 80, 'ai-content-geo-quality', '怎样用 AI 辅助内容而不制造垃圾', '从内容简报、事实来源、人工责任和更新机制建立 AI 内容质量线。', ['SEO', 'GEO', 'AI'], 'core', 'SEO 内容生产'),
  article('seo', '三、网站与页面', 90, 'image-video-topic-pages', '图片、视频和专题页怎样做搜索优化', '让视觉内容可理解、可加载、可访问，并用专题页组织复杂主题。', ['SEO', 'Image', 'Video'], 'core', 'SEO 内容生产'),
  article('seo', '四、技术与排障', 100, 'technical-seo-performance-media', '技术 SEO 与网站性能怎样一起检查', '从渲染、脚本、缓存和核心网页指标检查搜索体验。', ['Technical SEO', 'Performance'], 'core', 'SEO 技术与排障'),
  article('seo', '四、技术与排障', 110, 'crawl-index-troubleshooting', '页面不收录或排名下降时怎样排查', '按发现、抓取、索引、排名和数据口径逐层定位问题。', ['SEO', 'Troubleshooting'], 'core', 'SEO 技术与排障'),
  article('seo', '五、站外与数据', 120, 'links-brand-mentions', '外链、品牌提及与站外增长', '先创建值得引用的内容，再评估链接、合作和品牌提及的真实价值。', ['SEO', 'Brand'], 'core', 'SEO 数据与增长'),
  article('seo', '五、站外与数据', 130, 'seo-analytics-attribution', '怎样判断 SEO 是否真的有效', '把展现、点击、到站、有效转化和收入拆开记录与分析。', ['SEO', 'Analytics'], 'core', 'SEO 数据与增长'),
  article('seo', '六、搜索广告', 140, 'sem-account-structure', 'SEM 搜索广告和账户结构入门', '看懂一次广告竞价，并按业务目标建立可分析、可控制的账户。', ['SEM', 'Account'], 'core', 'SEM 零基础教程'),
  article('seo', '六、搜索广告', 150, 'sem-account-keywords-bidding', 'SEM 关键词、匹配、出价与预算', '从搜索意图、否定词、可承受成本和边际回报管理投放。', ['SEM', 'Bidding'], 'core', 'SEM 零基础教程'),
  article('seo', '六、搜索广告', 160, 'sem-creative-landing-tracking', 'SEM 创意、落地页与转化追踪', '让搜索词、广告承诺、落地页和业务转化保持一致。', ['SEM', 'Conversion'], 'core', 'SEM 零基础教程'),
  article('seo', '六、搜索广告', 170, 'sem-platform-diagnostics', 'Google、Bing、百度 SEM 怎样诊断', '先建立通用诊断树，再理解不同平台自动化和流量结构的差异。', ['SEM', 'Google Ads', 'Bing Ads', '百度营销'], 'core', 'SEM 零基础教程'),
  article('seo', '七、执行计划', 180, 'seo-sem-90-day-runbook', 'SEO 与 SEM 协同的 90 天执行手册', '把市场判断、网站、内容、数据和小预算广告组织成可检查的 90 天计划。', ['SEO', 'SEM', 'Runbook'], 'core', '搜索增长执行计划')
]

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

const algorithmArticles = algorithmSpecs.map(([slug, title, description, tags], index) =>
  article('frontend', '算法与数据结构', 100 + index * 10, `algorithms/${slug}`, title, description, [...tags, 'TypeScript'], 'reference')
)

const relearnSpecs = [
  ['overview/start', '重学前端：学习方法', '以规范、运行时和工程实践三条线重建前端知识体系', ['学习方法']],
  ['html/html_standard', 'HTML 标准与语言设计', '从源码到 DOM，理解 HTML 的解析、容错与元素行为', ['HTML']],
  ['html/html_DTD', 'DOCTYPE、DTD 与标准模式', '从一次布局差异理解现代 DOCTYPE 和历史兼容模式', ['HTML', 'DOCTYPE']],
  ['html/html_head', 'HTML Head 与元数据', '从浏览器加载顺序理解标题、编码、资源和搜索元数据', ['HTML', 'Metadata']],
  ['html/html_tag', '语义化 HTML', '从用户任务出发，选择自带正确行为的 HTML 元素', ['HTML', '语义化']],
  ['html/html_ARIA', 'ARIA 与可访问性语义', '从一个切换按钮理解角色、名称、状态和键盘行为', ['ARIA', 'Accessibility']],
  ['html/html_tramslate', '链接、资源与嵌入内容', '从 URL 解析到 iframe 隔离，理解浏览器如何加载外部内容', ['HTML', 'Resource']],
  ['css/css_rule', 'CSS At-rules 与规则系统', '从判断对象理解媒体、容器、能力、层叠和资源规则', ['CSS']],
  ['css/css_select', 'CSS 选择器与伪元素', '从匹配目标理解组合、优先级、状态伪类和生成内容', ['CSS', 'Selector']],
  ['css/css_compose', 'CSS 布局与格式化上下文', '从正常流、包含块和内容约束选择 Flex、Grid 与定位', ['CSS', 'Layout']],
  ['css/css_color', 'Web 色彩系统', '从颜色空间、透明度和对比度理解网页色彩', ['CSS', 'Color']],
  ['css/css_animation', 'CSS 动画与过渡', '从状态变化理解 transition、animation、性能和减弱动态效果', ['CSS', 'Animation']],
  ['css/css_link', 'CSS 与文档资源', '理解 link、样式表加载、资源提示和超链接关系', ['CSS', 'Resource']],
  ['javascript/js_type', 'JavaScript 类型系统', '掌握语言类型、转换、相等性和数值边界', ['JavaScript', 'Type']],
  ['javascript/js_object', 'JavaScript 对象模型', '从属性描述符理解对象、访问器、内建能力和函数调用', ['JavaScript', 'Object']],
  ['javascript/js_prototype', '原型与继承', '从属性查找理解 [[Prototype]]、new、class 与组合', ['JavaScript', 'Prototype']],
  ['javascript/js_function', 'JavaScript 函数', '从调用方式理解 this、普通函数、箭头函数、生成器和异步函数', ['JavaScript', 'Function']],
  ['javascript/js_closure', '作用域与闭包', '从词法环境和生命周期理解闭包、var、let 与 Realm', ['JavaScript', 'Closure']],
  ['javascript/js_eventLoop', '事件循环与任务队列', '用两次浏览器实验理解任务、微任务、渲染和异步竞态', ['JavaScript', 'Event Loop']],
  ['javascript/js_grammar', 'JavaScript 语法结构', '区分脚本、模块、声明、语句和表达式', ['JavaScript', 'Grammar']],
  ['javascript/js_token', 'JavaScript 词法系统', '理解空白、标识符、字面量、模板和正则的分词边界', ['JavaScript', 'Lexer']],
  ['javascript/js_semicolon', '自动分号插入', '用解析规则而不是代码风格争论理解 ASI', ['JavaScript', 'ASI']],
  ['javascript/js_completion', 'Completion Record 与控制流', '从规范完成记录理解 return、throw、break、finally 和表达式求值', ['JavaScript', 'Control Flow']],
  ['browser/browser_http', '浏览器网络与 HTTP', '从一次导航理解请求、缓存、HTTPS、HTTP/2 与 HTTP/3', ['Browser', 'HTTP']],
  ['browser/browser_dom', 'HTML 解析与 DOM 构建', '从字节流理解 tokenizer、tree builder、容错与脚本阻塞', ['Browser', 'DOM']],
  ['browser/browser_cssdom', 'CSSOM 与样式计算', '区分声明、层叠、计算值、实际几何和 CSSOM View', ['Browser', 'CSSOM']],
  ['browser/browser_domApi', 'DOM API 与节点操作', '从节点身份理解创建、移动、克隆、Range 与变更观察', ['Browser', 'DOM API']],
  ['browser/browser_event', 'DOM 事件系统', '从点击一个嵌套按钮开始，观察事件目标、捕获、冒泡、默认行为和事件委托。', ['Browser', 'Event']],
  ['browser/browser_maker', '浏览器布局与格式化上下文', '从 display、包含块、行盒、定位、浮动、Flex 和 Grid 理解几何', ['Browser', 'Layout']],
  ['browser/browser_css', '浏览器样式与布局过程', '从样式失效理解层叠、布局、绘制与合成的触发关系', ['Browser', 'Rendering']],
  ['browser/browser_print', '浏览器绘制与合成', '理解 paint order、display list、layer、raster 与 compositor', ['Browser', 'Rendering']],
  ['engineering/sum_architecture', '前端架构与组件化', '从职责、依赖和变化频率设计组件边界', ['Architecture']],
  ['engineering/sum_continue', '持续集成方法', '让自动检查成为可重复的质量反馈回路', ['CI']],
  ['engineering/sum_performance', '性能工程方法', '从指标、预算、测量到回归建立性能验证流程', ['Performance']],
  ['engineering/sum_system', '前端工程系统设计', '围绕开发、构建、发布和观测搭建工程系统', ['Engineering']],
  ['engineering/sum_tool', '前端工具链方法', '基于反馈周期和可替换性选择工具', ['Tooling']],
  ['questions/other_question', '前端常见问题与判断框架', '用规范、最小实验和工程约束回答前端开放问题', ['FAQ']]
] as const

const relearnArticles = relearnSpecs.map(([slug, title, description, tags], index) =>
  article('frontend', '重学前端', 300 + index * 10, `relearn/${slug}`, title, description, [...tags], 'reference')
)

const frontendDeepArticles: ArticleMeta[] = [
  article('frontend', '现代前端', 700, 'typescript-engineering', 'TypeScript 工程实践', '从一份不可信的接口响应开始，学习类型检查、运行时校验和页面状态建模。', ['TypeScript', 'Architecture'], 'flagship'),
  article('frontend', '现代前端', 710, 'vue-reactivity-scheduler', 'Vue 3 响应式与调度', '从连续修改两次状态只渲染一次开始，理解依赖收集、触发和更新队列。', ['Vue 3', 'Scheduler']),
  article('frontend', '现代前端', 720, 'react-fiber-concurrency', 'React Fiber 与并发渲染', '从一次输入卡顿开始，理解 Fiber、Render、Commit 与可中断更新的边界。', ['React', 'Fiber']),
  article('frontend', '现代前端', 730, 'nextjs-rendering-cache', 'Next.js 渲染与缓存', '从一张内容页的新鲜度要求开始，选择静态、动态、流式渲染与缓存失效。', ['Next.js', 'Cache']),
  article('frontend', '现代前端', 740, 'vite-dev-server-plugins', 'Vite 开发服务器与插件', '从浏览器请求一个源码模块开始，理解原生 ESM、依赖预构建、HMR 和插件钩子。', ['Vite', 'Plugin'], 'flagship'),
  article('frontend', '现代前端', 750, 'bundlers-code-splitting', 'Rollup、esbuild 与代码分割', '从一次动态导入开始，理解构建工具职责、模块图、Tree Shaking 和 Chunk 边界。', ['Rollup', 'esbuild'], 'flagship'),
  article('frontend', '现代前端', 760, 'component-library-design-system', '组件库与设计系统工程', '从一个 Button 的状态和契约开始，建立 Token、组件 API、文档、测试与版本发布。', ['Component Library', 'Design System'], 'flagship'),
  article('frontend', '现代前端', 770, 'manifest-v3-extension', 'Manifest V3 浏览器扩展架构', '从读取当前页面标题开始，理解页面脚本、内容脚本、Service Worker、消息与最小权限。', ['Browser Extension', 'Manifest V3'], 'flagship'),
  article('frontend', '质量与体验', 780, 'web-performance', 'Web 性能工程', '以用户指标、资源优先级和回归预算驱动性能优化。', ['Web Performance', 'Core Web Vitals']),
  article('frontend', '质量与体验', 790, 'sentry-sourcemap', 'Sentry、Source Map 与前端可观测性', '从一条压缩堆栈开始，完成 Release 关联、Source Map 上传、错误分组和隐私控制。', ['Sentry', 'Source Map']),
  article('frontend', '质量与体验', 800, 'browser-security', '浏览器安全边界', '从一张自动携带 Cookie 的表单开始，理解同源、XSS、CSRF、CSP 与客户端存储。', ['Security', 'Browser']),
  article('frontend', '质量与体验', 810, 'realtime-communication', 'SSE 与 WebSocket 实时通信', '从任务进度页面开始，选择 SSE 或 WebSocket，并处理游标、重连、背压和页面生命周期。', ['SSE', 'WebSocket'], 'core', '浏览器数据通道'),
  article('frontend', '质量与体验', 820, 'service-worker-offline', 'Service Worker 与离线架构', '从一次断网刷新开始，理解安装、激活、请求拦截、缓存版本和安全更新。', ['Service Worker', 'PWA'], 'core', '浏览器数据通道'),
  article('frontend', '质量与体验', 830, 'large-file-transfer', '大文件校验、分片与断点续传', '从一个网络中断的上传开始，设计文件摘要、分片会话、并发上限、幂等合并和恢复。', ['File Upload', 'Resumable'], 'core', '浏览器数据通道')
]

const backendArticles: ArticleMeta[] = [
  article('backend', 'Node.js', 10, 'node-layered-architecture', 'Node.js 与 NestJS 分层架构', '从一个最小发布接口开始，理解 Controller、应用服务、数据访问和依赖装配各自负责什么。', ['Node.js', 'NestJS'], 'flagship'),
  article('backend', 'Node.js', 20, 'node-auth-token-lifecycle', 'Node 认证与 Token 生命周期', '从一次登录开始，理解 Session、Access Token、Refresh Token、轮换与退出怎样协同工作。', ['Node.js', 'Auth'], 'core', 'Node.js 服务安全'),
  article('backend', 'Node.js', 30, 'node-acl-data-scope', 'Node ACL 与数据范围控制', '从两条不同归属的数据开始，把权限约束落实到策略、服务、查询与缓存。', ['Node.js', 'ACL'], 'core', 'Node.js 服务安全'),
  article('backend', 'Node.js', 40, 'node-queues-idempotency', 'Node 队列、幂等与重试', '从一次重复提交开始，理解任务记录、幂等键、至少一次投递、租约与有限重试。', ['Node.js', 'Queue']),
  article('backend', 'Node.js', 50, 'node-realtime', 'Node 实时通信服务', '从任务进度推送开始，理解 SSE、WebSocket、事件序列、断线重放与慢消费者。', ['Node.js', 'Realtime']),
  article('backend', 'Python', 60, 'fastapi-layered-architecture', 'FastAPI 分层架构：从请求到事务', '从一个创建任务接口开始，理解请求模型、应用服务、仓储、事务和错误映射怎样协作。', ['Python', 'FastAPI', 'SQLAlchemy'], 'flagship'),
  article('backend', 'Python', 70, 'python-document-pipeline', 'Python 文档处理流水线', '从一份普通 PDF 开始，逐步完成格式识别、条件 OCR、结构切片、质量检查和候选发布。', ['Python', 'Document'], 'flagship'),
  article('backend', 'Python', 80, 'sqlalchemy-transaction-boundaries', 'SQLAlchemy 事务与数据访问边界', '从一次转账式更新理解 Session、事务、锁、并发冲突和外部副作用。', ['Python', 'SQLAlchemy'], 'core', 'Python 数据系统'),
  article('backend', 'Python', 90, 'postgres-pgvector-hybrid-search', 'PostgreSQL、pgvector 与混合检索', '从一个查不到同义表达的问题开始，组合关系过滤、全文检索、向量召回和名次融合。', ['PostgreSQL', 'pgvector'], 'flagship', 'Python 数据系统'),
  article('backend', 'Python', 100, 'celery-async-tasks', 'Celery 异步任务工程', '从一条 pending 任务开始，理解 Celery 投递、ACK、重试、取消、队列隔离和 Worker 恢复。', ['Python', 'Celery']),
  article('backend', 'Go', 110, 'go-gin-layered-errors', 'Go 与 Gin 的服务分层和错误模型', '从一个查询接口开始，用显式依赖和可判断错误构建可测试的 Gin 服务。', ['Go', 'Gin'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 120, 'go-grpc-contract-evolution', 'gRPC 与 Protobuf 契约演进', '从新增一个可选字段开始，理解字段编号、默认值、状态码、Deadline 和跨版本发布。', ['Go', 'gRPC', 'Protobuf'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 130, 'go-context-concurrency', 'Goroutine、Context、取消与背压', '从一个并行处理流水线开始，理解有界 goroutine、Context 取消、Channel 所有权和慢消费者。', ['Go', 'Concurrency'], 'core', 'Go 服务工程'),
  article('backend', 'Go', 140, 'go-data-observability', 'GORM、Redis 与 OpenTelemetry', '从一次缓存旧数据问题出发，串联数据库版本、缓存失效与可观测链路。', ['Go', 'GORM', 'OpenTelemetry'], 'core', 'Go 服务工程')
]

const devopsArticles: ArticleMeta[] = [
  article('devops', '基础设施', 10, 'docker-compose', 'Docker Compose：从两个容器跑通一个服务', '从 API 与 PostgreSQL 的最小组合开始，理解镜像、容器、网络、健康检查、数据卷和停止恢复。', ['Docker', 'Compose', '容器'], 'flagship'),
  article('devops', '基础设施', 20, 'nginx-reverse-proxy', 'Nginx 与反向代理', '从代理一个 API 开始，处理可信请求头、静态站刷新、缓存、SSE 和安全切流。', ['Nginx', 'Proxy']),
  article('devops', '交付', 30, 'ci-cd', 'CI/CD 质量流水线', '从一次提交开始，理解检查、构建、制品提升、自动部署与失败阻断。', ['CI/CD', 'Artifact'], 'flagship'),
  article('devops', '可观测性', 40, 'observability', '日志、指标与链路追踪', '从一次慢请求出发，理解日志、Metric、Trace 和告警怎样共同定位问题。', ['Logging', 'Metrics', 'Tracing']),
  article('devops', '交付', 50, 'candidate-validation-traffic-switching', '候选验证、流量切换与回滚', '在旧版保持服务时启动候选，完成业务验证后只切换代理指针，并准备即时回滚。', ['Canary', 'Rollback'], 'flagship', '安全交付'),
  article('devops', '交付', 60, 'backup-migration-recovery', '备份、数据库迁移与恢复演练', '从一次隔离恢复开始，理解 RPO、RTO、兼容迁移、可恢复回填和外部副作用对账。', ['Backup', 'Migration', 'Recovery'], 'core', '安全交付')
]

const architectureArticles: ArticleMeta[] = [
  article('architecture', '系统方法', 10, 'layered-boundaries', '分层边界：代码为什么要按变化原因拆开', '从一个职责混杂的发布函数开始，理解入口、用例、领域规则和基础设施之间的依赖方向。', ['Architecture', 'Boundaries', '依赖方向'], 'flagship'),
  article('architecture', '系统方法', 20, 'async-task-lifecycle', '异步任务生命周期设计', '从一个报告任务开始，用 Task、Attempt、Lease 和 Event 处理重复、取消与中断恢复。', ['Async', 'State Machine']),
  article('architecture', 'AI 系统', 30, 'evidence-driven-systems', '证据驱动的 AI 系统', '从一条无法核对的回答开始，建立 Evidence、Claim、引用与验证边界。', ['Evidence', 'RAG'], 'flagship'),
  article('architecture', '平台工程', 40, 'modular-platform', '模块化能力平台', '从 HTTP、评测和 MCP 三份重复逻辑开始，设计共享 Runtime、稳定契约与独立适配器。', ['Platform', 'Modularity']),
  article('architecture', '可靠性', 50, 'reliability-patterns', '重试、去重、回放与降级', '从一次超时但结果未知的调用开始，区分四种可靠性模式解决的问题。', ['Reliability', 'Idempotency'])
]

const engineeringArticles: ArticleMeta[] = [
  article('engineering', '工作方法', 10, 'systematic-debugging', '系统化调试方法', '从一个偶发 500 开始，用复现、观测、假设和对照实验定位根因。', ['Debugging', 'DevTools']),
  article('engineering', '工作方法', 20, 'git-release-management', 'Git 与变更发布', '从一处修复开始，理解工作区、提交、评审、不可变制品、部署和回滚的不同边界。', ['Git', 'Release']),
  article('engineering', '持续学习', 30, 'engineering-resources', '工程问题与学习资源索引', '从一个技术疑问出发，学习怎样查规范、源码、测试与实验，并记录适用边界。', ['Resources', 'Learning'])
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
