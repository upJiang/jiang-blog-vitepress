export type Category =
  | 'ai-agent'
  | 'seo'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'architecture'
  | 'engineering'

export type PracticeType =
  | 'walkthrough'
  | 'diagnosis'
  | 'implementation'
  | 'decision'

export type EvidenceType =
  | 'official'
  | 'public-source'
  | 'anonymized-practice'
  | 'official-guided-operation'
  | 'preserved'

export interface ChapterMeta {
  title: string
  description: string
  category: Category
  part: string
  chapter: number
  slug: string
  tags: string[]
  prerequisites: string[]
  outcomes: string[]
  practice: {
    type: PracticeType
    result: string
    verify: string[]
  }
  evidence: EvidenceType
  preserved?: true
}

export interface SectionMeta {
  key: Category
  title: string
  description: string
  path: string
}

export const sections: SectionMeta[] = [
  { key: 'ai-agent', title: 'AI 与 Agent', description: '从模型输入输出开始，逐步构建具备检索、工具、记忆、证据和质量治理的知识 Agent。', path: '/docs/ai-agent/' },
  { key: 'seo', title: 'SEO 与增长', description: '沿需求、页面、抓取、索引、排名、点击、转化和搜索广告建立完整增长方法。', path: '/docs/seo/' },
  { key: 'frontend', title: '前端', description: '保留算法与重学前端原有内容，并通过可观察页面和最小实现记录现代前端工程。', path: '/docs/frontend/' },
  { key: 'backend', title: '后端', description: '先补齐协议、数据库、缓存和消息队列，再完成 Node.js、Python、Go 三条服务实践。', path: '/docs/backend/' },
  { key: 'devops', title: 'AI Infra 与运维', description: '从 Linux、网络和容器走向数据服务、GPU 推理、容量、观测、交付与恢复。', path: '/docs/devops/' },
  { key: 'architecture', title: '架构实践', description: '站在 AI 工程师视角处理模型不确定性、证据、状态、权限、质量和成本边界。', path: '/docs/architecture/' },
  { key: 'engineering', title: '工程方法', description: '把调试、变更、测试、资料核实和技术决策整理成可以直接复用的工作方法。', path: '/docs/engineering/' }
]

type ChapterInput = Omit<ChapterMeta, 'category' | 'chapter'>

const course = (category: Category, items: ChapterInput[]): ChapterMeta[] =>
  items.map((item, index) => ({ ...item, category, chapter: index + 1 }))

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
  preserved?: true
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
  ...(preserved ? { preserved } : {})
})

const aiAgentArticles = course('ai-agent', [
  item('认识 AI 应用', 'llm-workflow-rag-agent', 'LLM、工作流、RAG 和 Agent 到底是什么，有什么区别', '用同一个资料查询问题拆开 LLM、固定工作流、RAG 和 Agent，判断什么时候该用哪一种。', ['LLM', 'Workflow', 'RAG', 'Agent'], ['会读 JSON', '知道 HTTP 请求和响应'], ['能解释 LLM、工作流、RAG 和 Agent 的差异', '能为一个需求选择合适的实现方式'], '完成一张 AI 功能选型表', ['能画出四种方案的执行路径', '能说明为什么一个任务不需要 Agent'], 'official', 'decision'),
  item('模型怎样接收与返回', 'messages-tokens-context', '消息、Token、上下文窗口与模型输入输出', '拆开一次聊天请求，理解消息角色、Token 预算、上下文窗口、采样和停止条件。', ['Token', 'Context', 'Message'], ['了解 JSON', '理解 LLM、工作流、RAG 与 Agent 的区别'], ['估算一次请求的上下文组成', '识别上下文超限与输出截断'], '检查一份聊天请求的 Token 预算', ['能标出系统消息、历史、工具结果和用户输入', '能说明超限时先裁剪什么'], 'official', 'diagnosis'),
  item('模型怎样接收与返回', 'structured-output-model-boundaries', '结构化输出、模型边界与确定性程序', '让模型负责语义判断，让程序负责权限、金额、状态和格式校验。', ['Structured Output', 'Schema'], ['了解 JSON Schema', '理解消息与模型输出'], ['设计结构化输出契约', '区分概率判断与确定性规则'], '为意图识别结果设计 Schema 与校验流程', ['合法输出通过校验', '缺字段和越界值被拒绝'], 'official', 'implementation'),
  item('Agent 怎样行动', 'agent-lifecycle', 'Agent 从收到问题到产生答案经历了什么', '沿一次只读知识问答，理解目标、计划、工具、观察、回答、验证和停止条件。', ['Agent', 'Runtime'], ['理解 LLM、工作流、RAG 与 Agent', '了解结构化输出'], ['复述 Agent 完整生命周期', '识别普通工作流与 Agent 循环'], '手工推演一次工具调用循环', ['能写出每一步输入和输出', '能指出循环的停止条件'], 'anonymized-practice'),
  item('Agent 怎样行动', 'agent-framework-selection', '常见 Agent 框架及 LangGraph 选型', '比较 OpenAI Agents SDK、LangGraph、AutoGen、CrewAI、Semantic Kernel 与 Dify 的抽象层和适用任务。', ['LangGraph', 'Framework'], ['理解 Agent 生命周期', '了解 Python 函数'], ['根据控制权、状态和部署要求选框架', '说明状态图适合什么任务'], '完成一张框架选型决策表', ['同一需求能比较至少三种实现', '结论包含团队与运行约束'], 'official', 'decision'),
  item('Agent 怎样行动', 'langgraph-state-runtime', 'LangGraph State、Node、Edge、Reducer 与 Checkpoint：从零看懂一张图', '先定义状态和节点，再连接普通分支与条件边，最后理解并行合并和 Checkpoint。', ['LangGraph', 'State', 'Reducer', 'Checkpoint'], ['会读 Python 函数和类型提示', '理解 Agent 生命周期'], ['能画出最小状态图', '能解释节点执行顺序和并行结果如何合并'], '完成一张可推演的只读问答状态图', ['普通问题和寒暄分支都能到达终态', '并行证据不会互相覆盖'], 'anonymized-practice', 'implementation'),
  item('Agent 怎样行动', 'tool-calling-contracts', 'Tool Calling：定义、选择、执行和校验工具', '从只读搜索工具开始，讲清 Schema、白名单、超时、错误和工具返回值为什么都要校验。', ['Tool Calling', 'JSON Schema'], ['理解结构化输出', '理解 Agent 生命周期'], ['写出工具契约', '验证模型生成的工具参数'], '实现一个受控的只读搜索工具', ['非法工具名被拒绝', '超时和空结果有明确语义'], 'anonymized-practice', 'implementation'),
  item('MCP：连接外部能力', 'mcp-skills-subagents', 'MCP、Skill 与 SubAgent：先分清协议、方法和协作', '先把三个经常混用的概念拆开，再判断一个能力究竟需要协议连接、任务说明还是独立执行上下文。', ['MCP', 'Skill', 'SubAgent'], ['了解函数和 JSON', '知道 Agent 会调用外部能力'], ['解释 MCP、Skill 和 SubAgent 的职责', '能为一个能力选择合适的封装方式'], '完成一张 MCP、Skill 与 SubAgent 选择表', ['能画出三者组合关系', '能指出权限和结果校验位置'], 'official', 'decision'),
  item('MCP：连接外部能力', 'mcp-protocol-lifecycle', 'MCP 协议：角色、能力、生命周期与传输方式', '从 Host 连接 Server 开始，拆解 JSON-RPC、initialize、能力发现、工具调用、取消、关闭和传输选择。', ['MCP', 'JSON-RPC', 'stdio', 'Streamable HTTP'], ['会读 JSON', '了解进程与 HTTP 的基本区别'], ['能复述一次 MCP 连接生命周期', '能为本地和远程服务选择传输方式'], '手工推演一次 MCP 协议会话', ['请求、响应和通知能够区分', '连接失败能定位到进程、传输、协商或业务调用'], 'official', 'walkthrough'),
  item('MCP：连接外部能力', 'mcp-node-search-notes-server', 'Node.js 实战：实现一个只读 search_notes MCP Server', '使用当前 TypeScript SDK 建立 stdio Server，注册带 Schema 的只读工具，并用 Inspector 验证正常、空结果和参数错误。', ['MCP', 'Node.js', 'TypeScript', 'Zod'], ['Node.js 20+', '会读 async 函数', '理解 MCP Tool 的输入输出'], ['能实现并运行一个 MCP Server', '能解释 stdout、stderr 和工具错误语义'], '完成一个可由 Inspector 调用的 Node.js MCP Server', ['合法查询返回结构化笔记', '越界参数在执行查询前被拒绝'], 'official-guided-operation', 'implementation'),
  item('MCP：连接外部能力', 'mcp-python-search-notes-server', 'Python 实战：实现同一份 search_notes MCP Server', '使用当前 Python SDK 和类型提示实现同一工具契约，再比较装饰器、Schema 推导、测试与异步数据访问。', ['MCP', 'Python', 'Type Hint'], ['Python 3.10+', '会读函数和类型提示', '理解 MCP Tool 的输入输出'], ['能实现 Python MCP Server', '能保持 Node 与 Python 工具契约一致'], '完成并验证 Python 版只读 MCP Server', ['同一输入得到同结构输出', '参数错误和无结果具有稳定语义'], 'official-guided-operation', 'implementation'),
  item('MCP：连接外部能力', 'mcp-client-security-testing', 'MCP 客户端、测试、认证与安全边界', '从 listTools 和 callTool 走到超时、取消、OAuth、权限、返回值校验、日志审计与远程部署检查。', ['MCP Client', 'OAuth', 'Security'], ['理解 MCP 生命周期', '完成任一 MCP Server 示例'], ['能实现最小 MCP Client', '能设计远程 MCP 的权限与审计边界'], '用客户端调用并验证 search_notes', ['连接会正确关闭', '不可信返回值不会直接变成系统指令'], 'official', 'implementation'),
  item('Skill：沉淀任务方法', 'skill-system-progressive-disclosure', 'Skill 的本质：触发、目录结构与渐进式披露', '从一条任务说明扩展到 SKILL.md、references、scripts、templates 和 assets，解释 Agent 何时读取什么。', ['Skill', 'Progressive Disclosure'], ['会读 Markdown', '知道 Agent 会使用工具'], ['能判断任务是否适合 Skill', '能设计不浪费上下文的 Skill 目录'], '为一个重复任务设计 Skill 信息架构', ['入口只保留路由信息', '详细资料按任务需要加载'], 'official', 'decision'),
  item('Skill：沉淀任务方法', 'skill-authoring-practice', 'Skill 实战：从空目录写出可验证的任务能力', '从一个页面审计任务开始，创建 SKILL.md、参考资料、脚本和模板，理解触发、渐进读取与验证。', ['Skill', 'Codex', 'Claude Code', 'Progressive Disclosure'], ['会读 Markdown 和 Shell 命令', '了解 Agent 会按任务读取说明'], ['能创建一个公开 Skill', '能验证 Skill 的触发条件和输出质量'], '完成一个匿名页面审计 Skill 的目录与最小实现', ['触发条件与任务匹配', '脚本失败时能给出可定位错误'], 'official', 'implementation'),
  item('Skill：沉淀任务方法', 'subagent-context-contracts', 'SubAgent：上下文隔离、任务契约与并行协作', '把资料检索、代码验证和内容审查拆成独立任务，处理权限继承、结果契约、冲突、成本和停止条件。', ['SubAgent', 'Context Isolation', 'Parallelism'], ['理解 Agent 生命周期', '知道工具权限需要显式授予'], ['能判断任务是否值得委派', '能设计可合并的子任务结果'], '写出一份可并行执行的 SubAgent 任务契约', ['子任务边界互不重叠', '失败和冲突有明确处理方式'], 'official', 'decision'),
  item('知识怎样进入 Agent', 'rag-ingestion-pipeline', 'RAG 数据导入：从文件准入到可发布知识版本', '先建立可重放的导入状态机，再处理文件准入、解析、OCR、清洗、切片、向量化、质量验证与安全发布。', ['RAG', 'Ingestion', 'Knowledge Version'], ['理解文件和文本编码', '知道 RAG 会先检索再生成'], ['设计可重建的数据导入链', '用候选版本避免半成品进入检索'], '完成一份文档导入状态表', ['失败可以定位到具体阶段', '旧知识在新版本验证前保持可用'], 'anonymized-practice', 'implementation'),
  item('知识怎样进入 Agent', 'document-format-parsing-ocr', 'PDF、Word、PPT、Excel、HTML 与 Markdown 怎样解析入库', '逐种文件拆开原生文本、版面结构、表格、图片、扫描页与 OCR，最后统一成可追溯的 Block。', ['Document Parsing', 'OCR', 'Block'], ['知道文件和文本的区别', '了解 RAG 数据导入流程'], ['为不同文件选择解析器与 OCR 条件', '检查解析覆盖率和原文定位'], '完成一张多格式文档解析决策表', ['扫描 PDF 不会被当成空文档', '表格和标题层级可以追溯'], 'anonymized-practice', 'diagnosis'),
  item('知识怎样进入 Agent', 'semantic-chunking-structure', '语义切片：标题、表格、代码、父子片段与稳定 ID', '从检索问题反推切片边界，保留章节路径、相邻关系、表头、代码块、父子片段和可重建标识。', ['Chunking', 'Parent-Child Retrieval', 'Stable ID'], ['了解文档 Block', '知道 Embedding 会处理文本片段'], ['设计语义切片规则', '验证切片完整性和可追溯性'], '把一份混合文档切成可检索片段', ['表格行保留表头语义', '同一版本重复导入得到稳定标识'], 'anonymized-practice', 'implementation'),
  item('知识怎样进入 Agent', 'embedding-vector-space', 'Embedding：从文档解析、向量入库到检索索引', '从 PDF、Word、PPT 和 Markdown 的统一处理开始，讲清 Embedding、向量库、批量写入、索引与召回评估。', ['Embedding', 'Vector Database', 'pgvector', 'RAG'], ['理解数组和函数', '知道数据库表和索引的基本概念', '了解文档解析与语义切片'], ['把多种文档转换为可向量化片段', '选择向量库和索引', '设计批量向量写入与召回评估'], '完成一张从文件到向量检索的设计表', ['能解释每种文件如何解析', '能用精确扫描作为索引召回基线'], 'official', 'implementation'),
  item('知识怎样进入 Agent', 'pgvector-index-recall', 'pgvector、索引结构、召回率与向量写入', '从精确扫描推进到 HNSW/IVFFlat，理解距离算子、过滤顺序、索引参数、批量写入和召回评测。', ['PostgreSQL', 'pgvector'], ['SQL 基础', '理解 Embedding 与距离函数'], ['为向量列选择距离与索引', '建立 Recall@K 检查'], '设计一张可版本化的向量表与查询', ['查询使用兼容算子', '候选结果能与精确基线比较'], 'official-guided-operation', 'implementation'),
  item('知识怎样进入 Agent', 'hybrid-retrieval-rerank', '精确、全文、向量、结构化检索与重排', '用专有名词、同义表达和表格问题解释多路召回、RRF 融合、重排、缓存和降级。', ['Retrieval', 'Rerank', 'RRF'], ['理解 Embedding 与向量索引', '了解全文检索'], ['为不同查询选择召回通道', '解释融合与重排的职责'], '手工合并三路候选列表', ['融合不会因分数尺度不同失真', '降级后仍保留可解释证据'], 'anonymized-practice', 'implementation'),
  item('答案质量与运行', 'context-memory-compression', '上下文压缩、短期记忆、摘要与长期记忆', '在固定 Token 预算内组织近期对话、滚动摘要、检索证据和用户可控记忆。', ['Context Engineering', 'Memory'], ['理解消息与上下文窗口', '理解 Agent 生命周期'], ['设计上下文预算表', '区分会话状态、摘要与长期事实'], '裁剪一段超长对话并保留决策依据', ['预算不超限', '敏感信息不会自动进入长期记忆'], 'anonymized-practice', 'implementation'),
  item('答案质量与运行', 'claims-evidence-citations', 'Claim、Evidence、引用生成与答案验证', '把答案拆成可验证 Claim，让每个事实绑定用户可见证据，并对缺证据结论做有限修复。', ['Claim', 'Evidence', 'Citation'], ['理解混合检索与重排', '知道回答会引用检索证据'], ['建立 Claim 与证据的对应关系', '区分回答生成和事实验证'], '审核一份带引用的答案', ['所有事实 Claim 有可见证据', '引用范围和原文位置一致'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-security-eval-observability', 'Agent 安全：权限、提示注入与不可信内容边界', '从一段恶意文档进入检索结果开始，逐层处理身份、范围、工具权限、间接提示注入、敏感输出与审计。', ['Security', 'Prompt Injection', 'ACL'], ['理解 Agent、工具、检索与证据链', '知道认证与授权的区别'], ['画出 Agent 信任边界', '为权限与注入建立回归用例'], '完成一份只读知识 Agent 威胁检查表', ['指定范围无结果时不会越界回退', '外部内容不能扩大工具权限'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-evaluation-regression', 'Agent Eval：从样本集、评分器到版本回归门禁', '把“看起来回答不错”变成可重复比较的评测：固定样本、运行版本、检索指标、Claim 支持、引用、工具轨迹与人工复核。', ['Agent Eval', 'Regression', 'Dataset'], ['理解检索、Claim、Evidence 与 Agent 终态', '会读 JSON 和测试结果'], ['建立分层 Agent 评测集', '比较基线与候选版本'], '实现一个调用真实 Runtime 的最小评测运行器', ['同一样本可重复运行', '严重安全回归能单独阻断'], 'anonymized-practice', 'implementation'),
  item('答案质量与运行', 'agent-trace-observability', 'Agent Trace：日志、指标与一次运行怎样关联', '从一次慢回答出发，用 Trace 还原模型、检索、工具、队列和验证阶段，并设计低基数指标与隐私安全日志。', ['OpenTelemetry', 'Trace', 'Metrics'], ['理解 Agent 生命周期', '了解日志和 HTTP 请求'], ['设计 Agent Span 树', '用 Trace 定位慢、错和卡住的位置'], '为一次 Agent 运行设计 Trace 与指标字典', ['请求、回合和任务能够关联', '原始问题与证据不会进入指标标签'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-cost-deadline-reliability', 'Agent 成本与可靠性：Deadline、路由、重试和降级', '从一轮请求预算出发，处理准入、模型能力声明、绝对 Deadline、有限重试、取消、降级终态和单位成本。', ['Deadline', 'Model Routing', 'Reliability', 'Cost'], ['理解 Agent 生命周期与 Trace', '知道超时和重试的基本含义'], ['分配 Agent 时间与 Token 预算', '设计可解释的模型路由和降级链'], '完成一张请求预算与故障决策表', ['重试不会重置整轮预算', '降级结果会明确质量边界'], 'anonymized-practice', 'decision'),
  item('答案质量与运行', 'knowledge-agent-capstone', '知识 Agent 工程实践：从文档进入系统到可审计回答', '把导入、版本、权限、检索、工具、证据、事件、取消、恢复、评测和观测串成一条匿名工程实现。', ['Agent', 'RAG', 'State Machine', 'Evidence'], ['理解 Agent 生命周期', '了解文档导入、检索与证据验证'], ['画出知识 Agent 完整执行链', '区分当前实现、设计建议与可选演进'], '完成一份知识 Agent 架构图、状态表和验收清单', ['正常、无证据、无权限、取消和恢复均有终态', '每个事实结论能追溯到可见证据'], 'anonymized-practice', 'implementation')
])

const seoArticles = course('seo', [
  item('第一部分：建立增长模型', 'search-growth-model', 'SEO、SEM、GEO 与搜索增长全景', '从用户提出问题到产生有效业务结果，分清自然搜索、广告和生成式搜索各自负责什么。', ['SEO', 'SEM', 'GEO'], ['了解网站基本组成'], ['画出搜索增长漏斗', '区分流量指标与业务结果'], '建立一张从需求到收入的诊断表', ['每一层都有证据字段', '数据缺口被明确记录'], 'official', 'decision'),
  item('第一部分：建立增长模型', 'seo-project-evaluation', '项目评估、目标设定与数据基线', '在写内容和投广告前，判断需求、业务匹配、竞争、交付能力、现金流和测量条件。', ['SEO', 'Project Evaluation'], ['读过第 1 章'], ['判断项目是否值得进入搜索渠道', '建立可比较的基线'], '完成一份项目评估卡', ['结论包含机会、成本和停止条件', '事实、假设与缺口分开'], 'official', 'decision'),
  item('第二部分：需求、抓取与页面', 'crawl-index-ranking', '搜索引擎怎样发现、抓取、索引和排名', '沿链接发现、抓取、渲染、索引、查询和排序理解网页进入搜索结果的全过程。', ['Crawl', 'Index'], ['HTTP 状态码基础'], ['定位页面卡在哪个阶段', '正确使用 robots、noindex 与 Sitemap'], '用 GET 和页面源码检查一个 URL', ['区分原始 HTML 与渲染 DOM', '能解释 200 页面为何仍可能不收录'], 'official-guided-operation', 'diagnosis'),
  item('第二部分：需求、抓取与页面', 'keyword-intent-page-mapping', '关键词、搜索意图与页面映射', '从用户任务而不是关键词数量出发，识别意图、主题、实体、修饰词和页面职责。', ['Keyword', 'Search Intent'], ['读过第 1、2 章'], ['建立关键词簇', '避免多个页面争夺同一任务'], '制作一张关键词到页面的映射表', ['每个关键词有意图和证据', '重复任务被合并或区分'], 'official', 'decision'),
  item('第二部分：需求、抓取与页面', 'site-structure-page-planning', '页面规划、网站结构、URL 与内链', '把关键词映射变成栏目、专题、详情页、面包屑和上下文内链。', ['Information Architecture', 'URL'], ['读过第 4 章'], ['设计稳定 URL', '让重要页面在合理点击深度内可达'], '画出一个小型网站的页面树和内链图', ['不存在孤立核心页', '参数页和规范页策略一致'], 'official', 'implementation'),
  item('第三部分：页面与内容', 'on-page-seo-structured-data', 'TDK、正文结构、Canonical 与结构化数据', '逐项完成标题、摘要、主标题、正文、链接、Canonical 和与可见内容一致的结构化数据。', ['On-page SEO', 'Structured Data'], ['HTML 基础', '读过第 5 章'], ['审查一张页面的基础 SEO', '避免模板冲突和错误标记'], '完成一份页面检查表和 JSON-LD 校验', ['原始 HTML 中元信息完整', '结构化数据字段可在页面中核对'], 'official-guided-operation', 'implementation'),
  item('第三部分：页面与内容', 'content-ai-media-topic-pages', '内容质量、AI 内容、图片、视频与主题页', '从内容简报、来源、独有信息、媒体可访问性和更新责任建立内容生产系统。', ['Content', 'GEO', 'Media'], ['读过第 4、6 章'], ['判断内容是否解决真实任务', '安全使用 AI 辅助研究和编辑'], '为一篇专题页制作内容简报', ['每个重要结论有来源', '图片视频有语义与性能处理'], 'official', 'decision'),
  item('第四部分：技术审计与排障', 'technical-seo-rendering-performance', '渲染、性能、robots、Sitemap 与技术 SEO', '用原始响应、渲染页面、网络瀑布和站点文件检查发现、渲染与体验问题。', ['Technical SEO', 'Performance'], ['HTTP 与浏览器基础', '读过第 3 章'], ['执行一轮技术 SEO 检查', '识别脚本渲染和资源问题'], '完成 robots、Sitemap、状态码和核心页面抽查', ['检查使用真实 GET', '规范 URL、内链和 Sitemap 一致'], 'anonymized-practice', 'diagnosis'),
  item('第四部分：技术审计与排障', 'browser-page-seo-audit', '使用页面快照和原始 HTML 完成 SEO 审计', '从单页快照扩展到多页抽样，比较原始 HTML、渲染 DOM、模板差异和规则证据。', ['Browser Extension', 'SEO Audit'], ['读过第 6、8 章'], ['设计页面审计快照', '区分评分、证据和修复优先级'], '对匿名页面执行一次浏览器侧审计', ['每条发现包含证据和复查方法', '不把工具分数等同于排名'], 'anonymized-practice', 'implementation'),
  item('第四部分：技术审计与排障', 'crawl-index-duplicate-troubleshooting', '抓取、索引、重复页面和收录异常排查', '按发现、抓取、渲染、索引、排名和数据口径逐层排查，不跨层猜原因。', ['Troubleshooting', 'Duplicate Content'], ['读过第 3、8、9 章'], ['使用诊断树缩小问题范围', '处理近重复、参数和迁移页面'], '完成一份 P0-P3 排障报告', ['每个问题有证据、动作、验证和回滚', '不存在把波动直接归因算法的结论'], 'official', 'diagnosis'),
  item('第五部分：站外、数据与投放', 'links-brand-analytics-attribution', '外链、品牌提及、搜索数据与归因', '把展现、点击、到站、有效转化、收入与品牌影响拆开，评估站外增长和真实业务价值。', ['Links', 'Analytics', 'Attribution'], ['读过第 1 章'], ['识别值得获取的链接', '建立 SEO 归因与置信度'], '制作一张搜索到业务结果的数据字典', ['品牌与非品牌分开', '平台转化与真实业务结果分开'], 'official', 'decision'),
  item('第五部分：站外、数据与投放', 'sem-account-keywords-landing', 'SEM 账户、关键词、出价、落地页与 90 天协同计划', '从账户结构和搜索词开始，串联匹配、否定词、预算、创意、落地页、归因和 SEO 回流。', ['SEM', 'Bidding', 'Landing Page'], ['读过第 1、2、11 章'], ['建立可控制的搜索广告账户', '制定 SEO/SEM 联合验证计划'], '完成一份 90 天搜索增长 Runbook', ['含预算停止条件和回滚', '广告词与 SEO 页面互相反馈但不重复归因'], 'official', 'implementation')
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

const algorithmArticles = course('frontend', algorithmSpecs.map(([slug, title, description, tags]) =>
  item('算法与数据结构', `algorithms/${slug}`, title, description, [...tags, 'TypeScript'], [], [], '', [], 'preserved', 'walkthrough', true)
))

const relearnSpecs = [
  ['overview/start', '重学前端：学习方法', '以规范、运行时和工程实践三条线重建前端知识体系', ['学习方法']],
  ['html/html_standard', 'HTML 标准与语言设计', '从源码到 DOM，理解 HTML 的解析、容错与元素行为', ['HTML']], ['html/html_DTD', 'DOCTYPE、DTD 与标准模式', '从一次布局差异理解现代 DOCTYPE 和历史兼容模式', ['HTML', 'DOCTYPE']], ['html/html_head', 'HTML Head 与元数据', '从浏览器加载顺序理解标题、编码、资源和搜索元数据', ['HTML', 'Metadata']], ['html/html_tag', '语义化 HTML', '从用户任务出发，选择自带正确行为的 HTML 元素', ['HTML', '语义化']], ['html/html_ARIA', 'ARIA 与可访问性语义', '从一个切换按钮理解角色、名称、状态和键盘行为', ['ARIA', 'Accessibility']], ['html/html_tramslate', '链接、资源与嵌入内容', '从 URL 解析到 iframe 隔离，理解浏览器如何加载外部内容', ['HTML', 'Resource']],
  ['css/css_rule', 'CSS At-rules 与规则系统', '从判断对象理解媒体、容器、能力、层叠和资源规则', ['CSS']], ['css/css_select', 'CSS 选择器与伪元素', '从匹配目标理解组合、优先级、状态伪类和生成内容', ['CSS', 'Selector']], ['css/css_compose', 'CSS 布局与格式化上下文', '从正常流、包含块和内容约束选择 Flex、Grid 与定位', ['CSS', 'Layout']], ['css/css_color', 'Web 色彩系统', '从颜色空间、透明度和对比度理解网页色彩', ['CSS', 'Color']], ['css/css_animation', 'CSS 动画与过渡', '从状态变化理解 transition、animation、性能和减弱动态效果', ['CSS', 'Animation']], ['css/css_link', 'CSS 与文档资源', '理解 link、样式表加载、资源提示和超链接关系', ['CSS', 'Resource']],
  ['javascript/js_type', 'JavaScript 类型系统', '掌握语言类型、转换、相等性和数值边界', ['JavaScript', 'Type']], ['javascript/js_object', 'JavaScript 对象模型', '从属性描述符理解对象、访问器、内建能力和函数调用', ['JavaScript', 'Object']], ['javascript/js_prototype', '原型与继承', '从属性查找理解 [[Prototype]]、new、class 与组合', ['JavaScript', 'Prototype']], ['javascript/js_function', 'JavaScript 函数', '从调用方式理解 this、普通函数、箭头函数、生成器和异步函数', ['JavaScript', 'Function']], ['javascript/js_closure', '作用域与闭包', '从词法环境和生命周期理解闭包、var、let 与 Realm', ['JavaScript', 'Closure']], ['javascript/js_eventLoop', '事件循环与任务队列', '用两次浏览器实验理解任务、微任务、渲染和异步竞态', ['JavaScript', 'Event Loop']], ['javascript/js_grammar', 'JavaScript 语法结构', '区分脚本、模块、声明、语句和表达式', ['JavaScript', 'Grammar']], ['javascript/js_token', 'JavaScript 词法系统', '理解空白、标识符、字面量、模板和正则的分词边界', ['JavaScript', 'Lexer']], ['javascript/js_semicolon', '自动分号插入', '用解析规则而不是代码风格争论理解 ASI', ['JavaScript', 'ASI']], ['javascript/js_completion', 'Completion Record 与控制流', '从规范完成记录理解 return、throw、break、finally 和表达式求值', ['JavaScript', 'Control Flow']],
  ['browser/browser_http', '浏览器网络与 HTTP', '从一次导航理解请求、缓存、HTTPS、HTTP/2 与 HTTP/3', ['Browser', 'HTTP']], ['browser/browser_dom', 'HTML 解析与 DOM 构建', '从字节流理解 tokenizer、tree builder、容错与脚本阻塞', ['Browser', 'DOM']], ['browser/browser_cssdom', 'CSSOM 与样式计算', '区分声明、层叠、计算值、实际几何和 CSSOM View', ['Browser', 'CSSOM']], ['browser/browser_domApi', 'DOM API 与节点操作', '从节点身份理解创建、移动、克隆、Range 与变更观察', ['Browser', 'DOM API']], ['browser/browser_event', 'DOM 事件系统', '从点击一个嵌套按钮开始，观察事件目标、捕获、冒泡、默认行为和事件委托。', ['Browser', 'Event']], ['browser/browser_maker', '浏览器布局与格式化上下文', '从 display、包含块、行盒、定位、浮动、Flex 和 Grid 理解几何', ['Browser', 'Layout']], ['browser/browser_css', '浏览器样式与布局过程', '从样式失效理解层叠、布局、绘制与合成的触发关系', ['Browser', 'Rendering']], ['browser/browser_print', '浏览器绘制与合成', '理解 paint order、display list、layer、raster 与 compositor', ['Browser', 'Rendering']],
  ['engineering/sum_architecture', '前端架构与组件化', '从职责、依赖和变化频率设计组件边界', ['Architecture']], ['engineering/sum_continue', '持续集成方法', '让自动检查成为可重复的质量反馈回路', ['CI']], ['engineering/sum_performance', '性能工程方法', '从指标、预算、测量到回归建立性能验证流程', ['Performance']], ['engineering/sum_system', '前端工程系统设计', '围绕开发、构建、发布和观测搭建工程系统', ['Engineering']], ['engineering/sum_tool', '前端工具链方法', '基于反馈周期和可替换性选择工具', ['Tooling']], ['questions/other_question', '前端常见问题与判断框架', '用规范、最小实验和工程约束回答前端开放问题', ['FAQ']]
] as const

const relearnArticles = course('frontend', relearnSpecs.map(([slug, title, description, tags]) =>
  item('重学前端', `relearn/${slug}`, title, description, [...tags], [], [], '', [], 'preserved', 'walkthrough', true)
))

const frontendArticles = course('frontend', [
  item('现代前端：语言与运行时', 'typescript-type-system-engineering', 'TypeScript 类型系统与工程配置', '从不可信接口响应开始，理解静态类型、泛型、条件类型、运行时校验与工程配置。', ['TypeScript'], ['JavaScript 基础'], ['建立可信数据边界', '读懂关键 tsconfig 选项'], '完成一条接口数据到页面状态的类型链', ['错误数据在边界被拒绝', '类型错误可在构建期发现'], 'public-source', 'implementation'),
  item('现代前端：语言与运行时', 'browser-render-event-loop', '浏览器渲染、事件循环与任务调度', '从点击后页面卡顿的现象出发，串起任务、微任务、渲染机会、长任务和调度。', ['Browser', 'Event Loop'], ['JavaScript 异步基础'], ['解释一帧内任务顺序', '用 Performance 面板定位长任务'], '运行并记录一次任务顺序实验', ['输出顺序与解释一致', '能指出渲染被阻塞的位置'], 'public-source', 'diagnosis'),
  item('现代前端：框架内部机制', 'vue-reactivity-scheduler', 'Vue 3 响应式与调度器', '从连续修改状态只渲染一次开始，实现依赖收集、触发和批量更新的最小模型。', ['Vue 3', 'Reactivity'], ['JavaScript Proxy'], ['解释 effect 与依赖关系', '理解调度队列和 nextTick'], '实现最小响应式与调度流程', ['重复读取不会重复订阅', '同步修改被合并刷新'], 'public-source', 'implementation'),
  item('现代前端：框架内部机制', 'react-fiber-concurrent-rendering', 'React Fiber 与并发渲染', '从不可中断递归的问题进入 Fiber 节点、Render、Commit、Lane 和并发更新。', ['React', 'Fiber'], ['React 组件基础'], ['画出 Fiber 遍历顺序', '区分 Render 与 Commit'], '用 mini Fiber 推演一次更新', ['可恢复工作不直接修改 DOM', '提交阶段保持一致性'], 'public-source', 'implementation'),
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
  item('现代前端：插件开发', 'vscode-extension-test-release', 'VS Code 扩展调试、测试、打包与发布', '从日志和自动化测试推进到 vsix 打包、版本、变更记录与发布前检查。', ['VS Code', 'Testing', 'Release'], ['读过第 16、17 章'], ['编写扩展测试', '生成可验证制品'], '完成一份扩展发布 Runbook', ['测试在扩展宿主执行', '包内不含密钥和无关文件'], 'public-source', 'implementation')
])

const backendArticles = course('backend', [
  item('第一部分：后端共同基础', 'request-connection-to-response', '后端请求从连接建立到响应返回经历了什么', '从 DNS、TCP/TLS、反向代理进入框架路由、业务逻辑、数据库和响应。', ['Backend', 'HTTP'], ['了解客户端请求'], ['复述请求链', '定位各层故障'], '使用 curl 和日志追踪一次请求', ['状态码与服务日志对应', '能区分网络、代理和应用错误'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：后端共同基础', 'http-rest-openapi-errors', 'HTTP、REST、OpenAPI、错误结构与接口版本', '用一个资源接口讲清方法语义、状态码、幂等、分页、错误码、契约和兼容演进。', ['HTTP', 'OpenAPI'], ['读过第 1 章'], ['设计稳定接口契约', '区分业务错误与传输错误'], '编写一份最小 OpenAPI 契约', ['请求响应能被校验', '新增字段保持兼容'], 'official', 'implementation'),
  item('第一部分：后端共同基础', 'session-jwt-rbac-acl', 'Session、JWT、Refresh Token、RBAC 与 ACL', '沿登录、续期、退出和资源读取讲清身份、会话、角色和数据范围。', ['Auth', 'RBAC', 'ACL'], ['HTTP Cookie 基础'], ['选择认证方案', '把权限落实到查询'], '画出登录与刷新时序图', ['退出后旧凭证失效', '无权数据在查询前过滤'], 'official', 'decision'),
  item('第一部分：后端共同基础', 'postgresql-index-transactions-locks', 'SQL、PostgreSQL、索引、执行计划、事务与锁', '从一条慢查询和一次并发更新进入 B-Tree、EXPLAIN、隔离级别、锁和死锁。', ['PostgreSQL', 'SQL'], ['关系数据基础'], ['读懂基础执行计划', '设计事务边界'], '创建索引并观察查询计划', ['索引与查询条件匹配', '并发异常有明确处理'], 'official-guided-operation', 'implementation'),
  item('第一部分：后端共同基础', 'redis-data-cache-coordination', 'Redis 数据结构、缓存、Session 与分布式协调', '从缓存旁路模式进入 TTL、穿透、击穿、一致性、Lua 和锁的租约边界。', ['Redis', 'Cache'], ['键值存储基础'], ['选择 Redis 数据结构', '处理缓存失效'], '设计一条读写与缓存更新流程', ['数据库是真相源', '锁有过期和所有者校验'], 'official-guided-operation', 'implementation'),
  item('第一部分：后端共同基础', 'rabbitmq-kafka-messaging', 'RabbitMQ、Kafka、ACK、消费组与重复消息', '从异步发邮件和事件流两种任务比较队列、交换机、分区、Offset、ACK 和顺序。', ['RabbitMQ', 'Kafka'], ['后端任务基础'], ['选择消息基础设施', '解释至少一次投递'], '画出生产、Broker 和消费链', ['重复消息有消费端策略', '顺序范围被明确'], 'official', 'decision'),
  item('第一部分：后端共同基础', 'idempotency-retry-dlq-outbox-saga', '幂等、有限重试、死信队列、Outbox 与 Saga', '从超时但结果未知的问题出发，逐层处理重复提交、消息丢失和跨服务补偿。', ['Idempotency', 'Outbox', 'Saga'], ['事务与消息队列基础'], ['设计幂等键', '识别能否安全重试'], '完成一张可靠性决策表', ['外部副作用不会盲目重试', '补偿动作有状态和审计'], 'official', 'decision'),
  item('第一部分：后端共同基础', 'streaming-backpressure-testing-observability', 'SSE、WebSocket、背压、测试与服务观测', '用实时任务状态讲清事件序列、慢消费者、取消、契约测试和 Trace。', ['SSE', 'WebSocket', 'Observability'], ['读过第 1、2 章'], ['设计可恢复事件流', '建立服务测试分层'], '实现并验证一条简化事件流', ['断线可从游标继续', '慢消费者不会拖垮生产者'], 'official', 'implementation'),
  item('第二部分：Node.js / NestJS', 'nestjs-request-layered-project', 'NestJS 请求生命周期与分层项目', '从 Guard、Pipe、Interceptor、Controller 进入应用服务、Repository 和异常过滤器。', ['Node.js', 'NestJS'], ['TypeScript', '前 8 章'], ['解释 NestJS 请求链', '划分模块职责'], '实现一个可测试的资源创建接口', ['DTO 被校验', 'Controller 不包含事务逻辑'], 'public-source', 'implementation'),
  item('第二部分：Node.js / NestJS', 'nestjs-postgres-auth-scope', 'NestJS、PostgreSQL、事务、认证与数据范围', '把登录身份、租户范围和事务落实到应用服务与 SQL 查询。', ['NestJS', 'PostgreSQL', 'ACL'], ['读过第 3、4、9 章'], ['实现事务用例', '防止跨租户读取'], '完成一个带数据范围的查询接口', ['SQL 含范围条件', '提交失败时事务回滚'], 'anonymized-practice', 'implementation'),
  item('第二部分：Node.js / NestJS', 'nestjs-redis-rabbitmq-worker', 'NestJS、Redis、RabbitMQ、幂等任务与 Worker', '从 API 创建任务到 Worker ACK，处理幂等、重试、租约、死信和进度缓存。', ['NestJS', 'Redis', 'RabbitMQ'], ['读过第 5、6、7 章'], ['实现异步任务链', '恢复停滞任务'], '推演重复投递与 Worker 中断', ['同一幂等键只有一个任务', '超限重试进入死信'], 'anonymized-practice', 'implementation'),
  item('第二部分：Node.js / NestJS', 'nestjs-realtime-test-deploy', 'NestJS 实时通信、测试、日志与部署', '串联 SSE/WebSocket、单元与集成测试、结构化日志、健康检查和容器部署。', ['NestJS', 'SSE', 'Testing'], ['读过第 8-11 章'], ['发布一条可观察服务', '验证断线恢复'], '完成 Node 服务发布检查表', ['健康检查不依赖外部慢调用', '事件和日志能关联请求'], 'anonymized-practice', 'implementation'),
  item('第三部分：Python / FastAPI', 'fastapi-pydantic-layered', 'FastAPI、Pydantic、依赖注入与分层', '用文档任务接口串起 DTO、路由、应用服务、Repository、Unit of Work 和错误映射。', ['Python', 'FastAPI', 'Pydantic'], ['Python 类型提示', '前 8 章'], ['解释依赖注入', '设计清晰事务边界'], '实现一条从请求到持久化的调用链', ['非法请求返回结构化错误', 'Worker 可复用应用服务'], 'anonymized-practice', 'implementation'),
  item('第三部分：Python / FastAPI', 'fastapi-sqlalchemy-postgres-redis', 'SQLAlchemy、PostgreSQL、事务与 Redis', '从 Session 生命周期进入并发更新、锁、缓存旁路和提交后失效。', ['SQLAlchemy', 'PostgreSQL', 'Redis'], ['读过第 4、5、13 章'], ['管理异步 Session', '避免缓存脏读'], '实现一个事务与缓存协作的查询', ['回滚后不发布缓存', '并发冲突可识别'], 'anonymized-practice', 'implementation'),
  item('第三部分：Python / FastAPI', 'python-asyncio-celery-recovery', 'asyncio、Celery、取消、超时与任务恢复', '区分协程并发和进程外任务，处理 TaskGroup、取消传播、ACK、Deadline 和停滞扫描。', ['asyncio', 'Celery'], ['Python async/await', '读过第 6、7 章'], ['选择 asyncio 或 Celery', '传播取消和 Deadline'], '推演一个可恢复后台任务', ['阻塞函数被隔离', 'Worker 中断后任务状态可判断'], 'anonymized-practice', 'implementation'),
  item('第三部分：Python / FastAPI', 'fastapi-stream-errors-test-deploy', 'FastAPI 流式响应、错误契约、测试与部署', '从 StreamingResponse 进入客户端断开、事件格式、错误映射、依赖替换测试和 ASGI 部署。', ['FastAPI', 'Streaming', 'Testing'], ['读过第 8、13-15 章'], ['实现可取消流式接口', '建立测试金字塔'], '完成 Python 服务发布 Runbook', ['断开连接触发取消', '错误响应与 OpenAPI 一致'], 'anonymized-practice', 'implementation'),
  item('第四部分：Go', 'go-gin-layered-errors', 'Gin Handler、Service、Repository 与错误模型', '用显式依赖和可判断错误构建一条清晰的 Go 请求链。', ['Go', 'Gin'], ['Go 语法', '前 8 章'], ['划分 Gin 服务职责', '使用 errors.Is/As'], '实现一个查询与创建接口', ['Handler 只做协议适配', '错误映射稳定'], 'public-source', 'implementation'),
  item('第四部分：Go', 'go-gorm-redis-context', 'GORM、PostgreSQL、Redis、Context 与并发', '从请求 Context 进入事务、缓存、goroutine 所有权、有界并发和取消。', ['Go', 'GORM', 'Redis'], ['读过第 4、5、17 章'], ['传播 Context', '避免 goroutine 泄漏'], '完成一个并发读取与缓存流程', ['取消能终止下游', '并发数量有上限'], 'public-source', 'implementation'),
  item('第四部分：Go', 'go-grpc-protobuf-messaging', 'gRPC、Protobuf、消息队列与契约演进', '从新增字段开始理解字段编号、Deadline、状态码、消费者兼容和事件版本。', ['gRPC', 'Protobuf', 'Messaging'], ['读过第 2、6、18 章'], ['安全演进 RPC 契约', '设计事件兼容'], '修改一份 Protobuf 并检查兼容性', ['旧客户端仍能解析', 'Deadline 传到下游'], 'official', 'implementation'),
  item('第四部分：Go', 'go-otel-testing-deployment', 'OpenTelemetry、测试、性能分析与部署', '把 Trace、Metric、结构化日志、基准测试、pprof、健康检查和容器交付串起来。', ['OpenTelemetry', 'pprof', 'Testing'], ['读过第 8、17-19 章'], ['定位 Go 服务瓶颈', '建立发布门禁'], '完成 Go 服务观测与部署清单', ['Trace 跨 HTTP/RPC 传播', '性能结论来自可复现实验'], 'official-guided-operation', 'diagnosis')
])

const devopsArticles = course('devops', [
  item('第一部分：能力地图与操作系统', 'ai-infra-role-map', 'AI Infra 工程师能力地图与学习路径', '用应用、数据、模型、计算、平台和可靠性六层地图理解岗位边界和成长路线。', ['AI Infra'], ['具备基础编程能力'], ['说明 AI Infra 与后端、MLOps、SRE 的区别', '制定个人学习路径'], '完成一张能力自评与路线表', ['每层都有可验证任务', '托管 API 与自托管路径分开'], 'official', 'decision'),
  item('第一部分：能力地图与操作系统', 'linux-service-troubleshooting', 'Linux 进程、线程、端口、权限、磁盘与内存排查', '从服务无法启动进入 ps、ss、lsof、journalctl、top、free、df 和信号。', ['Linux', 'Troubleshooting'], ['会使用终端'], ['检查服务资源与权限', '按证据定位启动失败'], '完成一份 Linux 服务排障 Runbook', ['每个命令知道看哪一列', '不会用 kill -9 代替诊断'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：能力地图与操作系统', 'network-dns-tls-http-proxy', 'DNS、TCP、TLS、HTTP 与代理请求链', '使用 dig、curl、openssl 和访问日志逐层检查域名解析、握手、证书、代理和超时。', ['Network', 'TLS', 'HTTP'], ['读过第 2 章'], ['定位请求链断点', '解释常见超时来源'], '追踪一个 HTTPS 请求', ['DNS、TCP、TLS、HTTP 证据分开', '代理头和源站状态可核对'], 'official-guided-operation', 'diagnosis'),
  item('第二部分：容器与入口', 'oci-container-runtime', 'OCI 镜像、容器、Namespace、cgroup 与信号', '从镜像 Layer 到容器进程，理解隔离、资源限制、PID 1 和优雅退出。', ['Docker', 'OCI', 'cgroup'], ['Linux 进程基础'], ['解释镜像与容器区别', '设置资源和停止策略'], '检查一个容器的进程与限制', ['SIGTERM 能传到应用', '资源限制可从 inspect 核对'], 'official-guided-operation', 'implementation'),
  item('第二部分：容器与入口', 'docker-compose', 'Docker Compose 启动 API、PostgreSQL、Redis 与 Worker', '从四个独立容器组成系统，讲清网络、卷、健康检查、依赖、日志、停止和恢复。', ['Docker Compose'], ['读过第 4 章'], ['编写多服务 Compose', '排查依赖与持久化'], '启动并验证一套匿名服务栈', ['服务通过名称互访', '重建容器后数据库数据仍在'], 'anonymized-practice', 'implementation'),
  item('第二部分：容器与入口', 'nginx-static-proxy-sse', 'Nginx 静态站、Clean URL、反向代理、TLS 与 SSE', '从文章刷新 404 和流式响应被缓冲两个问题进入 location、try_files、proxy 和热加载。', ['Nginx', 'Reverse Proxy'], ['HTTP 与 Linux 基础'], ['配置 VitePress Clean URL', '代理普通 API 和 SSE'], '编写并验证一份 Nginx 配置', ['文章刷新返回 200', '不存在路径保持 404', 'nginx -t 通过后才 reload'], 'anonymized-practice', 'implementation'),
  item('第三部分：数据与任务设施', 'postgres-pgbouncer-operations', 'PostgreSQL、PgBouncer、连接池、锁与慢查询', '从连接打满和请求变慢进入连接预算、事务池、pg_stat_activity、锁等待和慢查询。', ['PostgreSQL', 'PgBouncer'], ['SQL 与 Linux 基础'], ['计算连接容量', '定位连接泄漏和锁'], '执行一次数据库运行检查', ['应用池与数据库上限匹配', '事务池限制被说明'], 'official-guided-operation', 'diagnosis'),
  item('第三部分：数据与任务设施', 'redis-operations', 'Redis 缓存、Broker、TTL、淘汰与持久化', '从内存增长和缓存丢失进入 INFO、TTL、maxmemory、RDB、AOF 与故障边界。', ['Redis'], ['读过第 2、4 章'], ['检查 Redis 内存', '选择持久化与淘汰策略'], '完成一份 Redis 运行检查表', ['缓存与任务 Broker 风险分开', '关键数据不只依赖 Redis'], 'official-guided-operation', 'diagnosis'),
  item('第三部分：数据与任务设施', 'queue-worker-plane', 'RabbitMQ、Kafka 与 Worker 任务平面', '按在线 Agent、文档导入、向量投影和评测任务拆队列，管理并发、Prefetch、年龄和停机排空。', ['RabbitMQ', 'Kafka', 'Worker'], ['消息队列基础'], ['设计队列隔离', '根据任务特性设置 Worker'], '画出一张多队列资源平面', ['慢任务不阻塞在线任务', '停机前停止取新任务'], 'anonymized-practice', 'implementation'),
  item('第三部分：数据与任务设施', 'object-storage-minio', 'MinIO、对象存储、Multipart 与生命周期', '从大文件上传进入 Bucket、对象键、预签名 URL、分段、校验和和孤立对象清理。', ['MinIO', 'Object Storage'], ['HTTP 上传基础'], ['设计对象存储流程', '处理不完整上传'], '完成一份对象上传与清理时序图', ['客户端不接触永久密钥', '数据库和对象状态可对账'], 'official-guided-operation', 'implementation'),
  item('第四部分：GPU 与模型制品', 'gpu-cuda-vram-nvidia-smi', 'GPU、CUDA、Driver、显存与 nvidia-smi', '从模型加载失败进入驱动、Runtime、计算能力、权重、激活和 KV Cache 的显存组成。', ['GPU', 'CUDA'], ['Linux 基础'], ['读懂 nvidia-smi', '初步判断 OOM 来源'], '在有 NVIDIA GPU 的主机完成预检', ['驱动与 Runtime 兼容', '未配备硬件时明确只做命令解读'], 'official-guided-operation', 'diagnosis'),
  item('第四部分：GPU 与模型制品', 'model-artifacts-precision-quantization', '模型权重、Tokenizer、精度、量化与制品管理', '讲清配置、Tokenizer、Safetensors、FP32/FP16/BF16/INT8/INT4 和制品校验。', ['Model Artifact', 'Quantization'], ['读过第 11 章'], ['估算权重存储', '管理模型版本和来源'], '制作一张模型制品清单', ['权重与 Tokenizer 版本匹配', '来源和校验和可核对'], 'official', 'decision'),
  item('第四部分：GPU 与模型制品', 'distributed-training-infrastructure', 'DDP、FSDP、DeepSpeed、NCCL 与分布式训练基础设施', '从单卡放不下和多卡通信进入数据、参数和流水线并行及网络瓶颈。', ['DDP', 'FSDP', 'NCCL'], ['GPU 与深度学习基础'], ['区分并行策略', '识别通信和存储需求'], '设计一张两节点训练拓扑', ['明确这是官方资料指导的独立操作', '不虚构训练吞吐'], 'official-guided-operation', 'decision'),
  item('第五部分：推理服务', 'transformer-inference-lifecycle', 'Tokenize、Prefill、Decode 与流式推理生命周期', '沿一条生成请求解释分词、批处理、Prefill、逐 Token Decode、采样和结束。', ['Transformer', 'Inference'], ['Token 和 GPU 基础'], ['解释 TTFT 与 TPOT 来源', '定位推理阶段瓶颈'], '画出一条推理时序图', ['每阶段输入输出明确', '流式输出不等同于并行生成'], 'official', 'walkthrough'),
  item('第五部分：推理服务', 'continuous-batching-kv-cache', 'Continuous Batching、KV Cache 与 Prefix Cache', '比较静态批处理和连续批处理，分析吞吐、延迟、显存、请求公平性和前缀复用。', ['Continuous Batching', 'KV Cache'], ['读过第 14 章'], ['估算 KV Cache 影响', '理解调度取舍'], '完成一张批处理调度推演表', ['长短请求影响被解释', '缓存命中不泄露跨租户内容'], 'official', 'decision'),
  item('第五部分：推理服务', 'vllm-openai-compatible-serving', 'vLLM 启动、OpenAI 兼容接口、流式请求与排错', '在明确 GPU 前提下检查模型、启动服务、调用接口并观察显存、日志和健康状态。', ['vLLM', 'OpenAI API'], ['读过第 11、12、14、15 章'], ['启动 vLLM', '诊断模型加载和 OOM'], '完成一次官方资料指导的服务操作', ['配置注明硬件前提', '不提供未测吞吐数字'], 'official-guided-operation', 'implementation'),
  item('第五部分：推理服务', 'kubernetes-gpu-scheduling', 'Kubernetes GPU 调度、模型卷与自动扩缩容', '从 Pod 请求 GPU 进入 Device Plugin、节点标签、污点、拓扑、模型卷和队列驱动扩缩容。', ['Kubernetes', 'GPU'], ['容器与 GPU 基础'], ['设计 GPU Workload', '选择扩缩容信号'], '编写并静态校验一份 GPU Deployment', ['资源请求明确', '未在真实集群验证的部分被标记'], 'official-guided-operation', 'implementation'),
  item('第六部分：可靠性、容量与交付', 'ai-observability-slo', 'OpenTelemetry、Prometheus、Grafana 与 AI SLO', '把请求、检索、模型、首 Token、队列、GPU、引用和终态关联到可用性、延迟、质量和成本。', ['OpenTelemetry', 'Prometheus', 'SLO'], ['服务观测基础'], ['设计 AI 指标', '避免高基数标签'], '制作一张 AI 服务观测表', ['Trace 与 Metric 可通过稳定标识关联', '敏感内容不进入标签'], 'anonymized-practice', 'implementation'),
  item('第六部分：可靠性、容量与交付', 'ai-capacity-load-cost', 'TTFT、TPOT、吞吐、队列、容量、压测与成本', '用到达率、并发、服务时间和 Little’s Law 设计压测、容量表和扩容判断。', ['Capacity', 'Load Test', 'Cost'], ['读过第 14-18 章'], ['设计闭环压测', '拆分单请求成本'], '填写一张不含虚构数据的容量模板', ['指标定义一致', '结论包含硬件和模型版本'], 'official', 'diagnosis'),
  item('第六部分：可靠性、容量与交付', 'ci-cd-artifact-security', 'CI/CD、SBOM、签名、Secret 与不可变制品', '从提交到已验证制品，加入依赖锁定、测试、镜像、SBOM、签名、Secret 和环境提升。', ['CI/CD', 'Supply Chain'], ['Git 与容器基础'], ['设计构建流水线', '避免在服务器重复构建'], '完成一份制品发布流程', ['同一制品在环境间提升', 'Secrets 不进入产物和日志'], 'official-guided-operation', 'implementation'),
  item('第六部分：可靠性、容量与交付', 'candidate-migration-rollback-recovery', '候选验证、迁移、切流、备份、回滚与恢复', '沿预检、备份、候选、兼容迁移、流量切换、即时回滚和隔离恢复完成安全发布。', ['Deployment', 'Migration', 'Recovery'], ['读过容器、数据库和 CI/CD 章节'], ['设计低风险发布', '验证备份可恢复'], '完成一份发布与恢复 Runbook', ['旧版本在切流时可用', '健康失败触发明确回滚'], 'anonymized-practice', 'implementation')
])

const architectureArticles = course('architecture', [
  item('AI 系统设计', 'ai-system-seven-layers', '从一个 AI 功能到完整系统的七层架构', '从模型调用扩展到入口、应用、Agent、知识、模型、数据与基础设施七层。', ['AI Architecture'], ['了解普通 Web 服务'], ['画出 AI 系统边界', '识别各层所有权'], '完成一张七层架构图', ['模型调用不是全部系统', '每条依赖方向可解释'], 'anonymized-practice', 'decision'),
  item('AI 系统设计', 'deterministic-vs-model-boundaries', '确定性程序与模型推理怎样划分边界', '用意图识别、权限、金额、检索和回答比较概率逻辑与确定性逻辑。', ['LLM', 'Boundary'], ['读过第 1 章'], ['判断规则归属', '为模型输出增加校验'], '完成一张职责分配表', ['权限和状态不由模型拍板', '开放语义任务不被硬编码关键词替代'], 'anonymized-practice', 'decision'),
  item('AI 系统设计', 'api-runtime-rag-infra-layers', 'API、应用服务、Agent Runtime、RAG 与基础设施分层', '从职责混杂的函数中拆出协议、用例、编排、检索和适配器。', ['Layered Architecture', 'Agent Runtime'], ['读过第 1、2 章'], ['设计依赖方向', '共享 Runtime 而不复制规则'], '重构一段匿名伪代码的模块边界', ['领域规则不依赖 HTTP', '评测与 MCP 能复用 Runtime'], 'anonymized-practice', 'implementation'),
  item('AI 系统设计', 'conversation-event-task-ownership', '会话、回合、事件、异步任务与所有权', '把一次长时间 Agent 执行拆成可查询、可取消、可恢复的状态和事件。', ['State Machine', 'Async Task'], ['数据库与异步任务基础'], ['区分业务状态、图状态和事件', '设计任务所有权租约'], '绘制正常、取消和中断状态图', ['只有一个终态', '失去 Lease 的 Worker 停止写入'], 'anonymized-practice', 'implementation'),
  item('AI 系统设计', 'evidence-driven-ai-systems', 'Claim、Evidence、引用与证据驱动系统', '从无法核对的回答开始，设计证据对象、Claim 绑定、引用验证和无证据拒答。', ['Evidence', 'Claim', 'RAG'], ['RAG 基础'], ['建立可追溯回答链', '设计证据预算'], '审核并修复一份匿名 AI 回答', ['事实结论都能回到原文', '权限过滤贯穿证据和引用'], 'anonymized-practice', 'diagnosis'),
  item('AI 系统设计', 'multi-tenant-model-gateway-platform', '多租户权限、数据隔离、模型网关与模块化能力', '从多模型、多入口和多租户需求推导主体、范围、网关、能力契约和模块边界。', ['Multi-tenant', 'Model Gateway'], ['读过第 2、3 章'], ['设计租户隔离', '封装模型差异'], '完成一份平台模块与权限矩阵', ['缓存命中后仍检查权限', '供应商能力不泄漏到业务层'], 'anonymized-practice', 'decision'),
  item('AI 系统设计', 'ai-reliability-eval-cost-tradeoffs', '重试、去重、回放、降级、Eval、观测与成本取舍', '从模型超时和答案波动出发，组合可靠性模式、质量门禁、Deadline 和预算。', ['Reliability', 'Evaluation', 'Cost'], ['完成前 6 章'], ['为故障选择模式', '把质量和成本纳入 ADR'], '完成一份 AI 架构决策记录', ['未知结果不盲目重试', '降级后的质量边界明确'], 'anonymized-practice', 'decision')
])

const engineeringArticles = course('engineering', [
  item('工程工作法', 'systematic-debugging', '从现象、证据、假设到修复的系统化调试', '从偶发 500 开始，建立复现、观测、假设、对照实验、修复和回归流程。', ['Debugging'], ['会读日志'], ['缩小故障范围', '避免凭感觉改代码'], '完成一份排障 Runbook', ['每个假设可证伪', '修复后有回归证据'], 'anonymized-practice', 'diagnosis'),
  item('工程工作法', 'git-change-release-rollback', 'Git、变更拆分、发布、回滚与恢复', '区分工作区、提交、评审、制品、部署和恢复，并设计小而可回退的变更。', ['Git', 'Release'], ['Git 基础命令'], ['拆分提交', '选择回滚或前向修复'], '完成一份变更发布清单', ['提交不混入无关差异', '回滚点在发布前存在'], 'official-guided-operation', 'implementation'),
  item('工程工作法', 'testing-pyramid-contract-e2e', '单元、集成、契约与端到端测试', '以同一接口为例，解释每一层测试发现什么、依赖什么和为什么会变慢。', ['Testing'], ['至少使用过一种测试框架'], ['设计测试分层', '减少脆弱 E2E'], '制作一张测试策略表', ['关键规则有快速测试', '跨服务契约可验证'], 'official', 'decision'),
  item('工程工作法', 'docs-source-issue-verification', '官方文档、源码、Issue 与社区资料怎样交叉验证', '从一个看似正确的技术结论出发，定位规范、版本、源码、测试和历史 Issue。', ['Research', 'Source Code'], ['会使用搜索引擎和 Git'], ['判断资料可信度', '复现框架行为'], '完成一份技术事实核验卡', ['结论注明版本和适用条件', '社区文章不是唯一证据'], 'public-source', 'diagnosis'),
  item('工程工作法', 'adr-retrospective-knowledge-system', '技术方案、ADR、复盘与个人知识体系', '把方案背景、约束、决策、替代项、结果和后续行动沉淀为可检索记录。', ['ADR', 'Retrospective'], ['有一次完整开发经历'], ['撰写 ADR', '区分事实、判断和行动'], '完成一份匿名 ADR 与复盘模板', ['决策能回到当时约束', '未完成行动有负责人和期限'], 'anonymized-practice', 'implementation')
])

export const articles: ChapterMeta[] = [
  ...aiAgentArticles,
  ...seoArticles,
  ...algorithmArticles,
  ...relearnArticles,
  ...frontendArticles,
  ...backendArticles,
  ...devopsArticles,
  ...architectureArticles,
  ...engineeringArticles
]

export const articlePath = (chapter: ChapterMeta): string =>
  `/docs/${chapter.category}/${chapter.slug}`

export const articleFile = (chapter: ChapterMeta): string =>
  `docs/${chapter.category}/${chapter.slug}.md`

export const articlesByCategory = (category: Category): ChapterMeta[] =>
  articles.filter((chapter) => chapter.category === category)

export const isPreservedChapter = (chapter: ChapterMeta): boolean =>
  chapter.preserved === true
