export type Category =
  | 'ai-agent'
  | 'seo'
  | 'frontend'
  | 'algorithms'
  | 'backend'
  | 'devops'
  | 'ai-practice'

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

export type ArticleTrack = 'mainline' | 'special'
export type ArticleMilestone = 'local-agent' | 'runtime'

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
  track?: ArticleTrack
  sequence?: number
  dependsOn?: string[]
  artifactIn?: string[]
  artifactOut?: string[]
  milestone?: ArticleMilestone
}

export interface SectionMeta {
  key: Category
  title: string
  description: string
  path: string
}

export type FrontendTrackKey =
  | 'all'
  | 'fundamentals'
  | 'typescript'
  | 'react'
  | 'vue'
  | 'tooling'
  | 'engineering'

export interface FrontendTrackMeta {
  key: FrontendTrackKey
  label: string
}

export const frontendTracks: FrontendTrackMeta[] = [
  { key: 'all', label: '全部' },
  { key: 'fundamentals', label: '基础与手写' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'tooling', label: '构建工具' },
  { key: 'engineering', label: '工程专题' }
]

export const sections: SectionMeta[] = [
  { key: 'ai-agent', title: 'AI 与 Agent', description: '从模型输入输出开始，逐步构建具备检索、工具、记忆、证据和质量治理的知识 Agent。', path: '/docs/ai-agent/' },
  { key: 'seo', title: 'SEO 与增长', description: '沿需求、页面、抓取、索引、排名、点击、转化和搜索广告建立完整增长方法。', path: '/docs/seo/' },
  { key: 'frontend', title: '前端', description: '从语言、浏览器和框架内部机制走向构建、质量、性能、安全与跨端工程。', path: '/docs/frontend/' },
  { key: 'algorithms', title: '算法', description: '从数据结构、不变量和复杂度出发，用 TypeScript 推导并验证常见算法。', path: '/docs/algorithms/' },
  { key: 'backend', title: '后端', description: '系统学习网络、Linux、API、MySQL、事务、安全、缓存、消息、测试、性能、部署与企业项目。', path: '/docs/backend/' },
  { key: 'devops', title: 'AI Infra 工程', description: '从运行底座、AI Backend 和模型服务走向 GPU、Kubernetes、企业平台、分布式训练与可靠交付。', path: '/docs/devops/' },
  { key: 'ai-practice', title: 'AI 实践', description: '从核心概念、Agent 协作和能力扩展走向研发闭环、Harness 与个人全栈工作系统。', path: '/docs/ai-practice/' }
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

const aiAgentArticlePool = course('ai-agent', [
  item('认识 AI 应用', 'llm-workflow-rag-agent', 'LLM、工作流、RAG 和 Agent 到底是什么，有什么区别', '从同一个知识查询任务出发，拆开模型生成、固定流程、外部检索和动态决策，建立后续 Agent 开发需要的第一张系统地图。', ['LLM', 'Workflow', 'RAG', 'Agent'], ['会运行简单脚本', '知道 HTTP 请求和 JSON'], ['能从输入、状态、控制者和输出解释四种系统', '能为一个需求选择最小可行实现'], '完成一张 AI 功能选型表和四种执行轨迹', ['能画出四种方案的完整执行路径', '能说明为什么一个任务不需要 Agent'], 'official', 'decision'),
  item('模型怎样接收与返回', 'messages-tokens-context', '消息、Token、上下文窗口与模型输入输出', '从一条真实模型请求开始，拆开消息角色、Token 计量、输入输出预算、工具结果和停止原因。', ['Token', 'Context', 'Message'], ['读过 LLM、工作流、RAG 和 Agent 的区别', '会运行简单脚本'], ['能拆分一次请求的消息和上下文预算', '能识别超限、截断和工具消息配对问题'], '完成一份聊天请求的 Token 预算和裁剪记录', ['能标出系统消息、历史、工具结果和当前问题', '能解释输入过长时为什么先裁剪可选内容'], 'official', 'diagnosis'),
  item('模型怎样接收与返回', 'structured-output-model-boundaries', '结构化输出、Schema 校验与确定性边界', '从一条知识查询请求出发，拆开 JSON、Schema 约束、Pydantic 领域校验、可信字段装配和失败终态，避免把格式正确误认为业务可信。', ['Structured Output', 'JSON Schema', 'Pydantic', 'Trust Boundary'], ['读过消息、Token、上下文窗口与模型输入输出', '会运行脚本并能阅读 JSON'], ['能区分 JSON 模式、Schema 约束和业务语义校验', '能设计模型字段与服务端可信字段的所有权边界', '能用 Pydantic 实现结构、跨字段和可信上下文校验'], '实现并测试一个不会接受模型越权字段的知识查询契约', ['正常结果能生成受控 SearchCommand', '缺字段、错误类型、额外权限字段和非法字段组合都会被拒绝'], 'anonymized-practice', 'implementation'),
  item('Agent 怎样行动', 'agent-lifecycle', 'Agent 从收到问题到产生答案经历了什么', '沿一次只读知识问答，从 HTTP 入口、Turn、准入、版本快照、Worker Lease 走到检索、证据、验证、SSE 与可恢复终态。', ['Agent', 'Runtime', 'Turn', 'Lease', 'Evidence'], ['读过 LLM、工作流、RAG 和 Agent 的区别', '了解消息、Token 和结构化输出'], ['能复述一次 Agent 请求的完整生命周期', '能为每个阶段定义输入、状态、输出和失败终态'], '画出一条可恢复的只读知识 Agent 请求链', ['能定位请求停在哪个状态和事件', '能说明取消、超时、无权限和证据不足的差异'], 'anonymized-practice', 'walkthrough'),
  item('Agent 怎样行动', 'agent-framework-selection', 'Agent 怎样决策：Router、ReAct、Planner、Reflection 与框架选型', '用同一个只读知识查询拆开四种 Agent 控制模式的状态、循环和停止条件，再从控制权、恢复、评测、部署与团队约束选择实现框架。', ['Agent Pattern', 'ReAct', 'Planner', 'LangGraph'], ['理解 Agent 从输入到终态的完整生命周期', '理解结构化输出与可信字段边界'], ['能解释 Router、ReAct、Planner 和 Reflection 的输入、状态与停止条件', '能根据任务复杂度选择普通函数、LangChain、LangGraph 或其他框架', '能设计包含正常、超时、工具失败和循环上限的选型实验'], '运行一个可观察的四模式 Runtime，并完成框架选型评分卡', ['单步问题不会被过度设计成多 Agent', '循环、计划和修复都有确定上限与失败终态'], 'official', 'decision'),
  item('LangGraph：状态图和执行语义', 'langgraph-state-runtime', 'LangGraph State、Node、Edge、Reducer 与 Checkpoint：从零看懂一张图', '从普通函数推导 StateGraph，逐步解释 State channel、节点局部更新、边、super-step、并发合并和恢复边界。', ['LangGraph', 'State', 'Node', 'Edge', 'Reducer', 'Checkpoint'], ['会读函数和类型提示', '理解 Agent 生命周期'], ['能按输入、状态更新和输出推演最小状态图', '能解释 super-step、并发更新和 Checkpoint 的职责边界'], '实现并测试一张包含知识问题、寒暄和输入不足终态的只读问答图', ['三条路径都能到达可解释终态', '原问题、查询词和证据不会在节点间丢失'], 'anonymized-practice', 'implementation'),
  item('认识与第一次运行', 'tool-calling-contracts', '不用框架实现 Tool Calling：模型候选、程序执行与结果回传', '从一次只读知识查询拆开 Tool Schema、模型候选、可信上下文、执行器、错误联合类型、取消和结果校验，避免把模型输出当命令。', ['Tool Calling', 'JSON Schema', 'Trust Boundary'], ['理解结构化输出与可信字段边界', '会读类型提示、JSON 和异常'], ['能解释工具定义、ToolCall、执行器和 ToolResult 的输入输出关系', '能实现不会接受模型越权字段的只读工具注册表与执行门禁'], '实现并测试一个带白名单、参数校验、Scope 和稳定错误语义的 search_notes 执行器', ['模型只能提供 query 和 limit，身份与 Scope 由服务端注入', '正常、空结果、参数错误、未知工具、越权、超时和取消能被区分'], 'anonymized-practice', 'implementation'),
  item('Tool、MCP、Skill 与 SubAgent', 'mcp-skills-subagents', 'MCP、Skill 与 SubAgent：连接能力、沉淀方法和隔离协作', '从同一个知识审计任务拆开协议连接、可复用工作方法和独立执行上下文，并比较 Tool、Prompt、Plugin 与项目规则的边界。', ['MCP', 'Skill', 'SubAgent'], ['已理解 Tool Calling 的候选、执行与权限边界', '知道进程、HTTP、文件和并发任务的基本区别'], ['能从输入、状态、执行者、输出和生命周期解释 MCP、Skill 与 SubAgent', '能为一个 Agent 能力选择 Tool、MCP、Skill、SubAgent 或它们的组合'], '为知识审计需求画出能力连接、工作方法与并行协作的分层设计', ['能指出每层权限、上下文、错误和结果校验由谁负责', '简单函数不会被过度封装成远程 MCP 或多 Agent'], 'official', 'decision'),
  item('Tool、MCP、Skill 与 SubAgent', 'mcp-protocol-lifecycle', 'MCP 协议：现代无状态请求、Legacy 握手与两种传输', '以 2026-07-28 规范为主线，拆开 Host/Client/Server、每请求元数据、server/discover、JSON-RPC、MRTR、订阅、stdio 与 Streamable HTTP，并解释旧 initialize 示例为何仍会出现。', ['MCP', 'JSON-RPC', 'stdio', 'Streamable HTTP'], ['会读 JSON，理解请求、响应、进程和 HTTP', '已理解 Tool Calling 的候选与执行边界'], ['能推演现代 MCP 请求、版本发现、能力调用、补充输入、订阅、取消和关闭', '能区分 2026-07-28 现代协议与 initialize 型 Legacy 协议，并选择 stdio 或 Streamable HTTP'], '手工推演一次现代 search_notes 调用和一次 Legacy 兼容探测', ['能区分连接、版本、能力、业务调用和传输五层失败', '不会把 SDK 主版本、协议日期、HTTP Session 和对话 Thread 混为一谈'], 'official', 'walkthrough'),
  item('Tool、MCP、Skill 与 SubAgent', 'mcp-node-search-notes-server', 'Node.js 实战：实现一个只读 search_notes MCP Server', '使用 Node.js SDK 1.30.0 建立 stdio Server，注册同时约束输入与输出的只读工具，并用进程内 Client 验证正常、空结果和参数错误。', ['MCP', 'Node.js', 'JavaScript', 'Zod'], ['Node.js 20+', '会读 JavaScript async 函数', '理解 MCP Tool 契约'], ['能实现并运行 Node MCP Server', '能解释 SDK 版本与协议版本的区别'], '完成一个有单元测试和协议契约测试的 Node Server', ['合法与空查询返回结构化结果', '越界参数在查询函数前被拒绝'], 'official-guided-operation', 'implementation'),
  item('Tool、MCP、Skill 与 SubAgent', 'mcp-python-search-notes-server', 'Python 实战：实现同一份 search_notes MCP Server', '使用 Python、MCP 2.0、Annotated 约束和进程内 Client 实现同一工具契约。', ['MCP', 'Python', 'Pydantic'], ['Python', '会读函数和类型提示', '理解 MCP Tool 契约'], ['能实现 Python MCP Server', '能保持 Node 与 Python 行为一致'], '完成并验证 Python 版只读 MCP Server', ['同一输入得到同结构输出', '参数错误和无结果具有稳定语义'], 'official-guided-operation', 'implementation'),
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
  item('上下文工程：预算和记忆', 'context-memory-compression', '短期记忆、长期记忆与滚动摘要：Agent 怎样记住而不越权', '从一次环境和偏好对话出发，区分运行状态、短期上下文、会话摘要与长期事实，并实现授权、冲突、TTL 和撤回状态机。', ['Context Engineering', 'Memory'], ['理解 Message、Turn、Checkpoint、上下文预算和压缩策略', '理解用户 Scope、来源与版本'], ['能区分运行状态、短期记忆、会话摘要和长期记忆的生命周期', '能实现带来源、授权、冲突、过期和撤回的记忆写入门禁'], '保存一个长期回答偏好，同时阻止临时环境和敏感内容跨会话传播', ['只有 active 且仍在 Scope/TTL 内的事实进入未来上下文', '撤回事实不会从旧历史或旧摘要静默复活'], 'anonymized-practice', 'implementation'),
  item('答案质量与运行', 'claims-evidence-citations', 'Claim、Evidence、引用生成与答案验证', '把答案拆成可验证 Claim，让每个事实绑定用户可见证据，并对缺证据结论做有限修复。', ['Claim', 'Evidence', 'Citation'], ['理解混合检索与重排', '知道回答会引用检索证据'], ['建立 Claim 与证据的对应关系', '区分回答生成和事实验证'], '审核一份带引用的答案', ['所有事实 Claim 有可见证据', '引用范围和原文位置一致'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-security-eval-observability', 'Agent 安全：权限、提示注入与不可信内容边界', '从一段恶意文档进入检索结果开始，逐层处理身份、范围、工具权限、间接提示注入、敏感输出与审计。', ['Security', 'Prompt Injection', 'ACL'], ['理解 Agent、工具、检索与证据链', '知道认证与授权的区别'], ['画出 Agent 信任边界', '为权限与注入建立回归用例'], '完成一份只读知识 Agent 威胁检查表', ['指定范围无结果时不会越界回退', '外部内容不能扩大工具权限'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-evaluation-regression', 'Agent Eval：从样本集、评分器到版本回归门禁', '把“看起来回答不错”变成可重复比较的评测：固定样本、运行版本、检索指标、Claim 支持、引用、工具轨迹与人工复核。', ['Agent Eval', 'Regression', 'Dataset'], ['理解检索、Claim、Evidence 与 Agent 终态', '会读 JSON 和测试结果'], ['建立分层 Agent 评测集', '比较基线与候选版本'], '实现一个调用真实 Runtime 的最小评测运行器', ['同一样本可重复运行', '严重安全回归能单独阻断'], 'anonymized-practice', 'implementation'),
  item('答案质量与运行', 'agent-trace-observability', 'Agent Trace：日志、指标与一次运行怎样关联', '从一次慢回答出发，用 Trace 还原模型、检索、工具、队列和验证阶段，并设计低基数指标与隐私安全日志。', ['OpenTelemetry', 'Trace', 'Metrics'], ['理解 Agent 生命周期', '了解日志和 HTTP 请求'], ['设计 Agent Span 树', '用 Trace 定位慢、错和卡住的位置'], '为一次 Agent 运行设计 Trace 与指标字典', ['请求、回合和任务能够关联', '原始问题与证据不会进入指标标签'], 'anonymized-practice', 'diagnosis'),
  item('答案质量与运行', 'agent-cost-deadline-reliability', 'Agent 成本与可靠性：Deadline、路由、重试和降级', '从一轮请求预算出发，处理准入、模型能力声明、绝对 Deadline、有限重试、取消、降级终态和单位成本。', ['Deadline', 'Model Routing', 'Reliability', 'Cost'], ['理解 Agent 生命周期与 Trace', '知道超时和重试的基本含义'], ['分配 Agent 时间与 Token 预算', '设计可解释的模型路由和降级链'], '完成一张请求预算与故障决策表', ['重试不会重置整轮预算', '降级结果会明确质量边界'], 'anonymized-practice', 'decision'),
  item('答案质量与运行', 'knowledge-agent-capstone', '知识 Agent 工程实践：从文档进入系统到可审计回答', '把导入、版本、权限、检索、工具、证据、事件、取消、恢复、评测和观测串成一条匿名工程实现。', ['Agent', 'RAG', 'State Machine', 'Evidence'], ['理解 Agent 生命周期', '了解文档导入、检索与证据验证'], ['画出知识 Agent 完整执行链', '区分当前实现、设计建议与可选演进'], '完成一份知识 Agent 架构图、状态表和验收清单', ['正常、无证据、无权限、取消和恢复均有终态', '每个事实结论能追溯到可见证据'], 'anonymized-practice', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-core-abstractions', 'LangChain 核心抽象：Message、Prompt、Model、Parser 与 Runnable', '从一次无框架模型调用开始，逐层映射 LangChain 的消息、提示模板、聊天模型、输出解析器和统一执行协议，并实际运行同步、批量与异步链路。', ['LangChain', 'Message', 'Prompt', 'Runnable'], ['会写 函数和类型提示', '理解消息、Token 与结构化输出边界'], ['能沿数据流解释 LangChain 五个核心对象的输入与输出', '能使用 invoke、ainvoke、batch 和 LCEL 组合可测试链路', '能判断普通 Python、LangChain 与 LangGraph 的适用边界'], '实现一个无 API Key、可同步与异步验证的 LangChain 术语解释器', ['输入清洗、Prompt 装配、模型输出和边界校验可以独立测试', '空输入与空模型输出会在明确节点失败'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-messages-prompts', 'LangChain Message 与 Prompt：装配历史、证据和当前问题', '从消息角色和 PromptValue 开始，逐步装配系统规则、最近历史、可见证据与当前问题，并测试角色注入、缺失变量和不可信资料边界。', ['LangChain', 'Message', 'ChatPromptTemplate', 'Context Assembly'], ['理解 LangChain 的 Message、PromptValue 和上下文窗口', '理解可信字段与不可信证据边界'], ['能解释不同 Message 类型和 PromptValue 的数据流', '能用 MessagesPlaceholder 保留历史角色并控制装配顺序', '能把外部证据标成不可信数据且拒绝历史角色注入'], '实现并测试一个 System、History、Evidence、Question 四层 Prompt 装配器', ['最终消息角色、顺序和内容边界可直接检查', '历史 SystemMessage、超长证据和空问题会在模型调用前失败'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-runnable-lcel', 'Runnable 与 LCEL：串行、并行、分支和异常怎样传播', '用一个知识问题路由器逐步运行 RunnableSequence、RunnableParallel、RunnableBranch 与 Passthrough.assign，追踪每个节点的数据形状、并发和失败边界。', ['LangChain', 'LCEL', 'Runnable', 'Concurrency'], ['理解 LangChain Message、Prompt 和 Runnable 的基本输入输出', '会阅读 字典、函数和异常'], ['能推演 Sequence、Parallel、Branch 和 Passthrough 的数据形状', '能解释并行完成、分支选择与异常传播的运行顺序', '能判断 LCEL 线性组合何时应升级为 LangGraph 状态图'], '实现并测试一个包含并行派生字段和三路分支的知识问题管道', ['direct、reject 和 search 三条路径只有一条执行', '并行节点保留原始输入，任一关键节点失败时不会返回伪成功'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-pydantic-output', 'LangChain 结构化输出：原生约束、Pydantic 解析与有限修复', '区分模型原生 Structured Outputs、Tool Calling 和文本后置解析，使用 PydanticOutputParser 实现嵌套 SearchPlan 校验、错误分类与最多一次修复。', ['LangChain', 'Pydantic', 'Structured Output', 'SearchPlan'], ['理解 JSON Schema、Pydantic 和可信字段边界', '会使用 Runnable 与 LCEL'], ['能选择原生结构化输出、Tool Calling 或 Pydantic 后置解析', '能为嵌套 SearchPlan 设计字段、组合与额外字段校验', '能区分生成、解析、领域拒绝和有限修复失败'], '实现并测试一个拒绝重复分支和越权字段的 SearchPlan 解析器', ['合法计划转换为 Pydantic 对象', '非法枚举、重复 ID、额外 Scope 和二次修复失败被明确阻断'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-tool-design', 'LangChain Tool：Schema、ToolRuntime 与受控执行边界', '从一次 search_notes 调用拆开工具描述、参数 Schema、ToolCall、可信 ToolRuntime、ToolMessage、返回值校验和错误终态，并用七个测试验证权限与失败语义。', ['LangChain', 'Tool Calling', 'ToolRuntime', 'Trust Boundary'], ['理解结构化输出、Pydantic 和可信字段边界', '会阅读 函数、类型提示和异常'], ['能解释 Tool、ToolCall、ToolRuntime 与 ToolMessage 的输入输出关系', '能把模型可控参数和服务端可信上下文分开', '能为参数错误、无结果、超时和未知工具设计稳定语义'], '实现并测试一个不会接受模型越权范围的只读 search_notes Tool', ['模型可见 Schema 只有 query 和 limit', '合法、越权、未知工具、空结果和超时路径得到可观察结果'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-simple-agent', 'LangChain create_agent：模型、工具与消息循环怎样闭合', '使用当前 create_agent 和离线 ScriptedChatModel 跑通 HumanMessage、ToolCall、ToolMessage 与最终 AIMessage，拆解 Harness、停止条件、递归上限和企业 Runtime 边界。', ['LangChain', 'create_agent', 'Agent Loop', 'ToolMessage'], ['完成 LangChain Tool 与受控执行边界', '理解 Message、ToolCall、ToolRuntime 和 ToolMessage'], ['能沿消息状态解释 create_agent 的模型与工具循环', '能区分正常结束、空证据、工具失败和循环耗尽', '能判断简单 Agent 何时足够、何时需要显式 LangGraph Runtime'], '实现一个无需 API Key、最多受图递归上限约束的只读知识 Agent', ['正常运行产生 Human、AI ToolCall、Tool、最终 AI 四段消息', '直接回答、空证据、范围过滤和无限循环分支均有测试'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-streaming-middleware-retry', 'LangChain Streaming、Callback、Middleware 与有限重试', '从同一 create_agent 运行拆开 updates、messages、custom 三类流、Callback 生命周期和 Middleware 包装点，实现稳定公开事件、共享 Deadline 的有限重试与取消传播。', ['LangChain', 'Streaming', 'Middleware', 'Callback', 'Retry'], ['已运行 LangChain create_agent 消息循环', '理解 asyncio、异常和绝对 Deadline'], ['能选择 updates、messages 和 custom 流并解释事件来源', '能区分面向调用方的 Streaming、面向观测的 Callback 和控制执行的 Middleware', '能实现不吞取消、共享整轮 Deadline 的有限模型重试'], '为只读知识 Agent 增加公开事件适配器、Callback 记录和 DeadlineRetryMiddleware', ['工具请求、工具进度、工具完成和答案完成按单调序号输出', '短暂错误有限恢复，重试耗尽、Deadline 和取消保持不同语义'], 'official', 'implementation'),
  item('LangChain：从函数到 Agent', 'langchain-retriever-rag', 'LangChain Retriever 与 2-Step RAG：从 Document 到 Evidence', '实现绑定 Scope 与 Release 的 BaseRetriever，用 LCEL 串起查询、Document、Evidence、上下文和拒答，解释向量库边界、错误语义、缓存隔离及升级 LangGraph 的条件。', ['LangChain', 'Retriever', 'RAG', 'Evidence', 'LCEL'], ['理解 Runnable 与 LCEL 的串行和并行组合', '理解 ToolRuntime、Scope、Release 和只读 Agent 消息循环'], ['能区分 Retriever、向量库、Document 与 Evidence', '能实现检索前权限和版本过滤的 2-Step RAG', '能根据分支、验证和恢复需求判断是否升级 LangGraph'], '实现并测试一个带稳定引用、空证据拒答和隔离缓存键的固定 RAG 链', ['私有范围与旧知识版本不会进入候选和上下文', '正常、空结果、元数据错误、重复证据和批量查询均可验证'], 'official', 'implementation'),
  item('LangGraph：状态图和执行语义', 'langgraph-conditional-reducers', 'LangGraph 条件路由与 Reducer：分支为什么不会互相覆盖', '在最小 StateGraph 上加入问题分类、条件边和并行列表合并，逐步观察状态快照。', ['LangGraph', 'Reducer', 'Conditional Edge'], ['理解 State、Node、Edge', '会读 TypedDict'], ['能写条件路由', '能选择覆盖、追加和自定义 Reducer'], '完成普通问题、寒暄和拒答三条路径', ['每条路径都有终态', '并行结果按 Reducer 合并'], 'official', 'implementation'),
  item('LangGraph：状态图和执行语义', 'langgraph-parallel-fanout', 'LangGraph 并行扇出与融合：同时查多种知识源', '用 Send 把一个问题分给全文、向量和结构化检索分支，再在融合节点去重和排序。', ['LangGraph', 'Send', 'Parallelism'], ['理解条件边和 Reducer', '了解多路检索'], ['能推演扇出和扇入', '能处理一个分支失败而其他分支成功'], '完成三路检索的状态图推演', ['分支结果带来源标识', '失败分支不会丢弃可用证据'], 'official', 'implementation'),
  item('LangGraph：状态图和执行语义', 'langgraph-checkpoint-threads', 'LangGraph Checkpoint、Thread 与恢复：进程重启后如何继续', '从一次中断的图执行开始，区分 thread、checkpoint、业务 Turn 和事件，并验证恢复不会重复副作用。', ['LangGraph', 'Checkpoint', 'Thread'], ['理解状态图和异步任务', '了解数据库持久化'], ['能为图选择恢复点', '能设计幂等工具边界'], '实现一个可暂停和恢复的只读图', ['恢复从最近快照继续', '不可重放副作用有幂等保护'], 'official-guided-operation', 'implementation'),
  item('LangGraph：状态图和执行语义', 'agent-runtime-domain-model', 'Conversation、Turn、Message、Event、Task：Agent 的业务状态模型', '从聊天页面的一个问题拆出会话、回合、消息、事件和后台任务，解释每个对象的所有权与终态。', ['Runtime', 'Turn', 'Event'], ['理解 HTTP 请求生命周期', '了解数据库主键'], ['能设计 Agent 业务实体', '能区分状态和事件'], '画出一次 Turn 的状态和事件表', ['重复请求可查到同一 Turn', '事件顺序可重放'], 'anonymized-practice', 'implementation'),
  item('LangGraph：状态图和执行语义', 'agent-request-lifecycle-runtime', '一次 Agent 请求的完整 Runtime 生命周期', '从入口准入、版本快照、Worker 所有权、图执行到终态事件，逐阶段列出输入、写入和停止条件。', ['Runtime', 'Admission', 'Snapshot'], ['理解 Turn 和 Checkpoint', '知道队列 Worker 的基本职责'], ['能画出请求时序图', '能定位一个请求在运行链的阶段'], '完成一份可审计的 Runtime 时序表', ['每阶段有可观测状态', '取消、过期和失败均有终态'], 'anonymized-practice', 'walkthrough'),
  item('LangGraph：状态图和执行语义', 'agent-parallel-preprocess', 'Agent 并行预处理：安全、上下文、记忆与快速检索怎样合并', '把互不依赖的预处理拆成并行节点，说明共享输入、结果 Reducer、失败隔离和预算扣减。', ['LangGraph', 'Preprocess', 'Concurrency'], ['理解并行扇出', '了解提示注入和上下文预算'], ['能识别可并行阶段', '能设计局部失败和合并策略'], '完成四路预处理的状态表', ['分支不修改共享可变对象', '合并结果可复现'], 'anonymized-practice', 'implementation'),
  item('LangGraph：状态图和执行语义', 'agent-planner-search-plan', 'Planner、SearchPlan 与停止条件：Agent 怎样决定查到哪里', '把自然语言问题转换成有预算的研究计划，解释查询任务、证据目标、优先级和停止条件。', ['Planner', 'SearchPlan', 'Budget'], ['理解结构化输出和检索', '了解 Deadline'], ['能设计有限 SearchPlan', '能判断证据足够还是需要补搜'], '为三个问题类型写研究计划 Schema', ['计划可被程序校验', '不会因模型反复改写而无限循环'], 'anonymized-practice', 'implementation'),
  item('LangGraph：状态图和执行语义', 'agent-graph-runtime-testing', 'Agent 图和 Runtime 测试：状态快照比最终文本更重要', '用单元、图级和运行级测试验证路由、Reducer、Checkpoint、取消和终态，而不是只断言最后一句话。', ['Testing', 'LangGraph', 'Runtime'], ['会使用 pytest', '理解状态和事件'], ['能为 Agent 写状态断言', '能构造失败和恢复测试'], '建立一个最小 Runtime 回归集', ['非法状态不可达', '终态和事件序列一致'], 'anonymized-practice', 'implementation'),
  item('上下文工程：预算和记忆', 'context-assembly-budget', '上下文由什么组成：按预算装配消息、证据和工具结果', '从一次真实问答出发，把规则、问题、历史、工具定义、证据和输出空间装进有限窗口，并实现可解释的装配器。', ['Context', 'Token Budget'], ['理解消息、Token 和 RAG', '会读 dataclass 与列表处理'], ['能从模型窗口推导硬预算和分区软预算', '能实现不破坏权限、消息顺序和工具协议的上下文装配器'], '实现一个会解释保留与丢弃原因的确定性上下文装配器', ['每一段都有来源、优先级、信任级别和选择结果', '总 Token 不超限且始终保留输出余量'], 'official', 'implementation'),
  item('上下文工程：预算和记忆', 'prompt-cache-prefix-design', 'Prompt Cache：GPT 与 Claude 如何复用输入前缀、计算费用并诊断命中', '从 Transformer 的 Prefill 与注意力状态出发，拆解 GPT 和 Claude 的精确前缀缓存、断点、usage、费用、盈亏平衡与多租户隔离。', ['Prompt Cache', 'Prefill', 'Cost', 'Context'], ['理解消息、Token 与上下文窗口', '知道 Agent 会装配规则、工具、历史与检索证据'], ['能解释 Prompt Cache 省掉的计算以及它与 KV Cache、结果缓存和上下文压缩的边界', '能设计 GPT 与 Claude 的稳定前缀、缓存断点、费用统计和多租户隔离'], '完成一套可复算费用、验证前缀指纹并定位缓存未命中的诊断方案', ['能从两家 usage 字段还原普通输入、缓存写入、缓存读取与输出费用', '规则、工具顺序、可信 Scope 或知识 Release 改变时稳定前缀指纹同步变化'], 'official', 'diagnosis'),
  item('上下文工程：预算和记忆', 'codex-context-compaction', 'Codex 的手动与自动上下文压缩：从机制到 Agent 设计启示', '用 Codex 当前公开的 /compact、自动阈值、Hook 和 App Server 事件解释压缩生命周期，并实现不覆盖原始历史的审计记录。', ['Codex', 'Compaction', 'Context'], ['理解上下文窗口、消息历史和 Token 预算', '会读 TOML、JSON 与事件日志'], ['能准确解释 Codex 手动与自动压缩的触发、配置和可观察结果', '能把压缩设计成可验证、可回滚的 Agent 状态迁移'], '实现一条保留目标、约束、证据和未完成事项的压缩记录', ['压缩前后保留任务目标、硬约束和未完成事项', '压缩失败或质量不合格时继续使用原始状态'], 'official', 'walkthrough'),
  item('上下文工程：预算和记忆', 'context-window-strategies', '上下文压缩策略：滑动窗口、抽取、滚动摘要、分层摘要与语义选择', '用同一段发布讨论推演五种上下文策略的输入、状态、输出和信息损失，并实现可运行的组合选择实验。', ['Context', 'Summary', 'Selection'], ['已理解上下文预算和压缩状态迁移', '会读 函数、集合与简单测试'], ['能解释并实现滑动窗口、确定性抽取、滚动摘要、分层摘要和语义选择', '能按信息类型、风险和任务跨度组合策略，而不是只选一种'], '对同一段会话运行五种策略并比较保留与丢失字段', ['关键约束、当前决定和来源范围可以自动检查', '敏感字段不会因为摘要或语义召回进入错误范围'], 'official', 'implementation'),
  item('上下文工程：预算和记忆', 'tool-result-compression', '工具结果压缩：表格、日志和长文档怎样进入上下文', '区分原始工具结果与模型视图，为日志、表格、搜索和长文档设计结构化压缩、脱敏、分页与可追溯错误。', ['Tool Result', 'Compression'], ['理解 Tool Calling、上下文预算和证据对象', '会读 dataclass 与 JSON 数据'], ['能为不同类型工具设计不会丢失语义的模型结果 Schema', '能保留原始结果指针、截断状态、错误状态和隐私边界'], '把一批日志压缩为错误聚合、代表样本和可回查游标', ['模型能看到完成当前判断所需的字段和截断状态', '原始结果可按 ID 复查，工具失败不会伪装成空成功'], 'anonymized-practice', 'implementation'),
  item('上下文工程：预算和记忆', 'context-pollution-injection', '上下文污染与间接提示注入：外部内容怎样保持不可信', '从恶意文档进入 RAG 开始，追踪它如何影响候选工具调用，并用信任标记、能力白名单、参数校验和安全 Eval 阻断副作用。', ['Prompt Injection', 'Context Isolation'], ['理解 Tool Calling、RAG、上下文装配和 ACL', '知道读操作与写操作的副作用差异'], ['能画出系统规则、用户输入、外部资料和工具执行的信任边界', '能实现不因文档内容扩大权限的动作验证器与回归样例'], '构造恶意文档并证明它不能触发未授权导出或写操作', ['外部文本无法改变服务端工具白名单、用户 Scope 和审批要求', 'Trace 能定位污染来源、候选动作、阻断层和实际副作用数'], 'official', 'diagnosis'),
  item('上下文工程：预算和记忆', 'memory-quality-evaluation', '短期记忆、长期记忆与压缩质量评测', '把“模型好像记住了”拆成字段覆盖、来源忠实、冲突、过期、隐私和下游任务指标，并建立候选策略发布门禁。', ['Memory', 'Evaluation', 'Privacy'], ['已理解上下文策略、记忆生命周期和用户授权', '会读集合运算、比例指标和 pytest'], ['能设计同时覆盖保留、忠实、冲突、过期和隐私的记忆 Eval 数据集', '能用硬失败与趋势指标决定压缩或记忆策略是否可以发布'], '比较基线和候选策略，输出可回溯的逐样本评测结果与发布决定', ['未授权、撤回和过期事实进入未来上下文时立即硬失败', '摘要新增事实、丢失硬约束和错误解决冲突都能定位到来源样本'], 'anonymized-practice', 'implementation'),
  item('RAG 与知识工程：策略', 'rag-strategy-map', 'RAG 策略地图：Naive、Advanced、Adaptive、Corrective 与 Agentic RAG', '用同一知识问答分别运行固定检索、查询改写、纠错检索和 Agentic 研究，说明复杂度增加换来了什么。', ['RAG', 'Adaptive RAG', 'Agentic RAG'], ['理解 RAG 基本链路', '理解 Agent 生命周期'], ['能为问题选择 RAG 策略', '能写出升级条件而不是盲目堆组件'], '制作一张 RAG 策略决策树', ['策略差异落到输入输出和停止条件', '简单问题不走过度复杂路径'], 'official', 'decision'),
  item('RAG 与知识工程：导入和版本', 'knowledge-version-release', '知识版本、候选索引与 Release：为什么不能边导入边上线', '从一份文档更新开始，设计 staging、校验、激活和回滚状态，保证回答只看到完整版本。', ['RAG', 'Release', 'Versioning'], ['理解导入流水线', '了解数据库事务'], ['能设计知识版本状态机', '能解释候选版本回滚'], '完成一张知识 Release 状态表', ['激活前旧版本继续可用', '向量和元数据数量可对账'], 'anonymized-practice', 'implementation'),
  item('RAG 与知识工程：导入和版本', 'rag-object-storage-lifecycle', 'RAG 的对象存储：文件、对象键、校验和与生命周期', '把上传文件和解析片段分开管理，讲清对象键、Multipart、预签名、校验和、孤立对象和删除边界。', ['Object Storage', 'RAG'], ['了解 HTTP 上传', '理解导入状态'], ['能设计文件存储与数据库对账', '能处理不完整上传'], '画出文件上传到解析的时序图', ['客户端不持有永久密钥', '清理任务不会误删激活版本'], 'official-guided-operation', 'implementation'),
  item('RAG 与知识工程：导入和版本', 'rag-external-content-security', '外部内容进入 RAG 前的安全准入', '从 URL、压缩包和网页内容开始，检查协议、DNS、重定向、MIME、Magic、压缩炸弹和提示注入。', ['RAG', 'SSRF', 'Content Security'], ['了解 HTTP 和文件类型', '知道外部内容不可信'], ['能设计多层准入检查', '能把安全标记带入审计'], '完成一份外部文件准入 Runbook', ['被拒内容不会进入索引', '日志不泄露原始敏感内容'], 'anonymized-practice', 'diagnosis'),
  item('RAG 与知识工程：Embedding 和写入', 'embedding-batch-idempotency', 'Embedding 批处理、限流、部分失败与幂等写入', '把片段分批发送给 Embedding 服务，处理 Token 上限、速率限制、重试、死信和重复写入。', ['Embedding', 'Batching', 'Idempotency'], ['理解 Embedding 和片段 ID', '了解异步任务'], ['能设计批处理状态表', '能让失败批次单独重跑'], '实现一个可重试的匿名批处理器', ['部分成功不会重复写入', '失败原因和片段范围可查询'], 'anonymized-practice', 'implementation'),
  item('RAG 与知识工程：Embedding 和写入', 'vector-store-selection', '向量库怎样选：pgvector、Qdrant、Milvus、Weaviate 与 Pinecone', '从数据所有权、过滤、事务、规模、运维和供应商依赖比较向量存储，而不是只看名称。', ['Vector Database', 'Architecture'], ['理解向量检索', '了解 PostgreSQL 和服务部署'], ['能完成向量库选择表', '能解释迁移与回滚成本'], '为一个多租户知识库写选型决策', ['权限过滤路径明确', '实验指标和运维责任分开'], 'official', 'decision'),
  item('RAG 与知识工程：查询理解', 'rag-query-rewrite-decomposition', '查询改写、问题分解与检索计划', '把口语问题变成可搜索查询，同时保护用户范围、时间、实体和否定条件，并把多目标问题拆成有依赖的计划。', ['Query Rewrite', 'Decomposition', 'Search Plan'], ['理解混合检索输入', '理解结构化输出'], ['能区分改写与分解', '能校验检索计划'], '实现一个有约束的 SearchPlan', ['改写不改变用户范围', '子问题依赖和停止条件明确'], 'anonymized-practice', 'implementation'),
  item('RAG 与知识工程：查询与召回', 'rag-multi-query-hyde-step-back', 'Multi-Query、HyDE 与 Step-back：三种查询扩展怎样取舍', '用同一召回集比较多查询、假设文档和抽象问题，说明它们改善的召回缺口和引入的噪声。', ['RAG', 'HyDE', 'Multi-Query'], ['理解 Embedding 和查询改写', '会读 Top-K 结果'], ['能选择查询扩展策略', '能用评测集验证而不是凭感觉'], '完成三种策略的召回对照表', ['记录查询版本和额外成本', '噪声增加时有停止条件'], 'official', 'diagnosis'),
  item('RAG 与知识工程：高级检索', 'rag-adaptive-corrective-agentic', 'Adaptive、Corrective、多跳与 Agentic RAG 的执行链', '用证据质量作为路由信号，分别处理补搜、外部校验、多跳关系和动态研究，并定义终止条件。', ['Adaptive RAG', 'Corrective RAG', 'Multi-hop'], ['理解策略地图和查询分解', '理解 Agent 图和 Evidence'], ['能画出纠错检索状态机', '能限制多跳成本和权限范围'], '为一个多跳问题设计有限研究图', ['每一跳有证据目标', '无法补齐时安全拒答'], 'official', 'implementation'),
  item('RAG 与知识工程：知识组织和评测', 'knowledge-graph-wiki-alias-acl', '知识图谱、Wiki、别名、ACL 与 Release 怎样和 RAG 配合', '把实体关系、人工维护页面、别名和权限放进同一知识版本，解释图谱不是向量库的替代品。', ['Knowledge Graph', 'Wiki', 'ACL'], ['理解知识版本和混合检索', '了解关系数据'], ['能判断图谱适合的问题', '能保持图谱和文本版本一致'], '为一个实体问答设计文本与图谱双通道', ['别名冲突可审计', '图谱越权不会绕过正文 ACL'], 'anonymized-practice', 'decision'),
  item('RAG 与知识工程：知识组织和评测', 'rag-evaluation-recall-mrr-ndcg', 'RAG 评测：Recall@K、MRR、nDCG、答案支持率与延迟', '从标注问题和相关片段开始，计算召回、排序、证据覆盖和系统时间，建立可复现对照。', ['RAG Eval', 'Recall', 'MRR', 'nDCG'], ['理解多路检索和 Claim', '会读 CSV 或 JSON'], ['能建立检索评测集', '能区分召回问题和生成问题'], '实现一个精确基线与候选索引对照', ['指标定义和 K 明确', '没有数据时不虚构提升数字'], 'official', 'implementation'),
  item('RAG 与知识工程：知识组织和评测', 'rag-evidence-budget-cache', '融合、Rerank、缓存与证据预算', '从多路候选进入上下文开始，解释分数融合、重排、缓存键、权限复核和 Evidence 数量限制。', ['RAG', 'Rerank', 'Cache'], ['理解混合检索和上下文预算', '了解 ACL'], ['能设计可失效缓存', '能为证据选择设置预算'], '手工推演一次候选融合和缓存命中', ['缓存不绕过权限', '失效后能回到精确检索'], 'anonymized-practice', 'implementation'),
  item('可信运行：证据和回答', 'validation-repair-refusal', '验证器、有限修复与安全拒答：答案不可信时怎么办', '把事实、引用、ACL、隐私和注入验证拆开，定义可修复问题、不可修复问题和终态。', ['Validation', 'Repair', 'Refusal'], ['理解 Claim、Evidence 和安全边界', '了解有限预算'], ['能设计验证结果结构', '能让拒答成为可解释终态'], '实现一个不调用模型的引用覆盖修复', ['修复次数有限', '修复后仍无证据则拒答'], 'anonymized-practice', 'implementation'),
  item('可信运行：状态和资源', 'turn-idempotency-version-snapshot', 'Turn 幂等、准入与版本快照：一次请求怎样获得稳定边界', '从重复点击和知识发布并发开始，设计幂等键、状态锁、资源准入和版本快照。', ['Turn', 'Idempotency', 'Snapshot'], ['理解 Runtime 生命周期', '了解数据库唯一约束和 Redis'], ['能区分请求 ID 与 Turn ID', '能写出快照建立时机'], '完成一次重复请求的状态推演', ['只创建一个执行单元', '版本变化不影响已开始 Turn'], 'anonymized-practice', 'implementation'),
  item('可信运行：状态和资源', 'admission-model-resource-slots', '准入控制与模型资源槽：为什么请求要在执行前排队', '用全局、用户、模型和供应商四个维度解释并发槽、等待队列、拒绝和资源释放。', ['Admission', 'Concurrency', 'Model Routing'], ['了解 Deadline 和队列', '会读 Redis 有序集合'], ['能设计准入策略', '能防止重试放大资源占用'], '制作一张请求准入状态表', ['过载时快速拒绝或排队', '终态一定释放槽位'], 'anonymized-practice', 'decision'),
  item('可信运行：异步和恢复', 'celery-worker-ack-lease', 'Celery Worker、ACK、任务所有权与 Lease', '沿消息投递、预取、执行、ACK、重投和租约续期解释 Worker 重启后的行为。', ['Celery', 'Worker', 'Lease'], ['理解队列和 Turn', '会读 async/sync 区别'], ['能设计任务所有权', '能处理 ACK 前崩溃和重复执行'], '推演一条任务在 Worker 故障下的生命周期', ['副作用有幂等键', '失去租约的 Worker 停止写状态'], 'official-guided-operation', 'implementation'),
  item('可信运行：异步和恢复', 'deadline-cancel-checkpoint-recovery', 'Deadline、取消、Checkpoint 与停滞恢复', '把用户取消、绝对截止时间、图快照和停滞扫描放进同一状态机，明确谁能改变终态。', ['Deadline', 'Cancellation', 'Recovery'], ['理解 Checkpoint、Lease 和事件', '了解 asyncio cancellation'], ['能设计取消传播链', '能区分过期、取消和失败'], '完成正常、取消、过期和停滞恢复四条路径', ['取消不会被后续节点覆盖', '恢复不会重复已确认副作用'], 'anonymized-practice', 'implementation'),
  item('可信运行：异步和恢复', 'sse-events-replay-fallback', 'SSE 事件、序号、断线重放与轮询降级', '从浏览器断开开始，说明事件持久化、Last-Event-ID、心跳、重放窗口和轮询兜底。', ['SSE', 'Event Replay', 'Fallback'], ['了解 HTTP 流式响应', '理解 Event 和 Turn 终态'], ['能设计可重放事件流', '能处理慢客户端和断线'], '实现一个匿名事件重放状态表', ['事件序号单调递增', '终态后仍可查询最终结果'], 'anonymized-practice', 'implementation')
  ,item('认识与第一次运行', 'python-openai-responses-first-call', 'Python 第一次调用真实模型：请求、响应、usage、错误与流式输出', '使用 OpenAI Responses API 完成第一次真实请求，读懂响应和 usage，并用同一接口的 Fake Adapter 覆盖无密钥测试。', ['OpenAI', 'Responses API', 'Streaming', 'Usage'], ['会运行 Python 脚本', '理解环境变量和 HTTP 请求'], ['能运行同步和流式 Responses 请求', '能区分认证、限流、超时、空响应与测试替身'], '得到可替换的 ModelGateway、真实调用入口和无密钥测试', ['有密钥时读取真实 output_text 与 usage', '无密钥时 Fake Adapter 测试不会伪装在线结果'], 'official', 'implementation')
  ,item('认识与第一次运行', 'python-agent-loop-from-scratch', '不用框架实现第一个有限 Agent 循环', '把模型候选、只读工具结果和下一轮调用连接成有次数上限、重复检测和明确终态的 Python Agent。', ['Agent Loop', 'Tool Calling', 'Stop Condition'], ['完成无框架 Tool Calling', '理解模型网关与结构化结果'], ['能复述 ToolCall 到 ToolResult 再到最终回答的循环', '能处理未知工具、参数错误、空结果和循环耗尽'], '得到可测试的 agent_loop.py 和五条终态路径', ['正常问题产生有证据回答', '重复调用和达到上限时确定停止'], 'anonymized-practice', 'implementation')
  ,item('RAG 与知识工程：导入和版本', 'rag-unified-block-model', '统一 Block：标题、段落、表格、代码和原文定位', '把不同解析器输出统一为可追溯 Block，保留层级、版面、表头、代码语言和原文坐标。', ['RAG', 'Block', 'Document Parsing'], ['理解多格式解析和 OCR', '知道切片需要结构信息'], ['能定义跨格式 Block 契约', '能验证结构覆盖和原文定位'], '得到 ingestion.py 中的 Block 模型与覆盖率检查', ['标题、表格和代码不退化成无来源纯文本', '每个 Block 都能定位到原文件'], 'anonymized-practice', 'implementation')
  ,item('MCP、Skill 与 SubAgent 专题', 'mcp-foundations-boundaries', 'MCP 是什么：与 HTTP API、Tool Calling 和插件的边界', '从 Host 为什么需要统一连接外部能力讲起，区分协议、模型候选、业务 API 和能力打包方式。', ['MCP', 'HTTP API', 'Tool Calling', 'Plugin'], ['理解 Tool Calling 和执行器边界', '知道 Client、Server 和进程'], ['能解释 MCP 解决的互操作问题', '能判断何时使用 MCP、普通函数或 HTTP API'], '得到一张 MCP 系统位置图和能力边界表', ['不会把 MCP 说成模型直接执行工具', '能说明 Host、Client 和 Server 各自状态'], 'official', 'decision')
  ,item('MCP、Skill 与 SubAgent 专题', 'mcp-transports-discovery-cancellation', 'MCP 传输与生命周期：stdio、Streamable HTTP、Legacy SSE、发现、取消和重连', '沿一次连接拆开传输、会话、能力发现、调用、取消、断开和重连，并说明旧 SSE 的兼容边界。', ['MCP', 'stdio', 'Streamable HTTP', 'Cancellation'], ['理解 MCP 角色与 JSON-RPC', '了解进程标准输入输出和 HTTP'], ['能选择本地或远程传输', '能推演发现、调用、取消和重连状态'], '得到一份传输选择表和失败分层 Runbook', ['stdio 不把日志写入协议 stdout', 'HTTP 重连不会盲目重放有副作用调用'], 'official', 'walkthrough')
  ,item('可信运行与完整系统', 'agent-compose-local-runtime', '本地 Compose 部署：FastAPI、PostgreSQL/pgvector、Redis、Celery、MinIO 与 SSE', '把此前的模型、图、检索和 Runtime 适配器连接到本地基础设施，解释容器、网络、健康检查、迁移和清理。', ['Docker Compose', 'FastAPI', 'pgvector', 'Celery', 'SSE'], ['理解完整 Agent Runtime', '会使用 Docker 和环境变量'], ['能启动并检查本地 Agent 基础设施', '能沿 API、队列、数据库和事件定位启动失败'], '得到可校验的 compose.yaml 和端到端健康检查', ['docker compose config 通过', '服务健康、任务执行和 SSE 可观察'], 'official-guided-operation', 'implementation')
])

const aiAgentArticleOrder = [
  'llm-workflow-rag-agent',
  'python-openai-responses-first-call',
  'messages-tokens-context',
  'structured-output-model-boundaries',
  'tool-calling-contracts',
  'python-agent-loop-from-scratch',
  'agent-framework-selection',
  'langchain-core-abstractions',
  'langchain-messages-prompts',
  'langchain-runnable-lcel',
  'langchain-pydantic-output',
  'langchain-tool-design',
  'langchain-simple-agent',
  'langchain-streaming-middleware-retry',
  'langchain-retriever-rag',
  'langgraph-state-runtime',
  'langgraph-conditional-reducers',
  'langgraph-parallel-fanout',
  'langgraph-checkpoint-threads',
  'agent-runtime-domain-model',
  'agent-planner-search-plan',
  'agent-request-lifecycle-runtime',
  'agent-parallel-preprocess',
  'agent-graph-runtime-testing',
  'context-assembly-budget',
  'context-window-strategies',
  'codex-context-compaction',
  'prompt-cache-prefix-design',
  'tool-result-compression',
  'context-pollution-injection',
  'context-memory-compression',
  'memory-quality-evaluation',
  'rag-strategy-map',
  'rag-ingestion-pipeline',
  'rag-object-storage-lifecycle',
  'rag-external-content-security',
  'document-format-parsing-ocr',
  'rag-unified-block-model',
  'semantic-chunking-structure',
  'embedding-vector-space',
  'embedding-batch-idempotency',
  'vector-store-selection',
  'pgvector-index-recall',
  'rag-query-rewrite-decomposition',
  'rag-multi-query-hyde-step-back',
  'hybrid-retrieval-rerank',
  'rag-evidence-budget-cache',
  'rag-adaptive-corrective-agentic',
  'knowledge-graph-wiki-alias-acl',
  'rag-evaluation-recall-mrr-ndcg',
  'mcp-foundations-boundaries',
  'mcp-protocol-lifecycle',
  'mcp-transports-discovery-cancellation',
  'mcp-python-search-notes-server',
  'mcp-node-search-notes-server',
  'mcp-client-security-testing',
  'skill-system-progressive-disclosure',
  'skill-authoring-practice',
  'subagent-context-contracts',
  'claims-evidence-citations',
  'validation-repair-refusal',
  'turn-idempotency-version-snapshot',
  'celery-worker-ack-lease',
  'deadline-cancel-checkpoint-recovery',
  'sse-events-replay-fallback',
  'agent-security-eval-observability',
  'agent-evaluation-regression',
  'agent-trace-observability',
  'agent-compose-local-runtime',
  'knowledge-agent-capstone'
] as const

const aiAgentSpecialOrder = [
  'mcp-foundations-boundaries',
  'mcp-protocol-lifecycle',
  'mcp-transports-discovery-cancellation',
  'mcp-python-search-notes-server',
  'mcp-node-search-notes-server',
  'mcp-client-security-testing',
  'skill-system-progressive-disclosure',
  'skill-authoring-practice',
  'subagent-context-contracts'
] as const

const aiAgentSpecialSlugs = new Set<string>(aiAgentSpecialOrder)
const aiAgentMainlineOrder = aiAgentArticleOrder.filter((slug) => !aiAgentSpecialSlugs.has(slug))

function aiArtifact(slug: string, chapter: number): string[] {
  if (slug === 'knowledge-agent-capstone' || slug === 'subagent-context-contracts') return []
  if (chapter === 1) return ['system-map.json']
  if (chapter === 2) return ['app/model_gateway.py']
  if (chapter === 3) return ['app/messages.py']
  if (chapter === 4) return ['app/schemas.py']
  if (chapter === 5) return ['app/tools.py']
  if (chapter === 6) return ['app/agent_loop.py']
  if (chapter === 7) return ['app/decision_policy.py']
  if (chapter <= 15) return ['app/langchain_agent.py']
  if (chapter <= 21) return ['app/graph.py']
  if (chapter <= 24) return ['app/runtime.py']
  if (chapter <= 32) return ['app/context.py']
  if (chapter <= 39) return ['app/ingestion.py']
  if (chapter <= 49) return ['app/retriever.py']
  if (chapter === 50) return ['tests/rag_eval.json']
  if (chapter <= 56) return ['mcp/search_notes']
  if (chapter <= 58) return ['skills/page-audit']
  if (chapter <= 61) return ['app/validation.py']
  if (chapter <= 65) return ['app/runtime.py']
  if (chapter === 66) return ['app/security.py']
  if (chapter === 67) return ['tests/agent_eval.json']
  if (chapter === 68) return ['app/observability.py']
  if (chapter === 69) return ['compose.yaml']
  return ['agent-demo']
}

const aiAgentBySlug = new Map(aiAgentArticlePool.map((article) => [article.slug, article]))
const aiAgentArticles: ChapterMeta[] = aiAgentArticleOrder.map((slug, index) => {
  const article = aiAgentBySlug.get(slug)
  if (!article) throw new Error(`AI article is missing from pool: ${slug}`)
  const chapter = index + 1
  const track = aiAgentSpecialSlugs.has(slug) ? 'special' : 'mainline'
  const trackOrder = track === 'special' ? [...aiAgentSpecialOrder] : aiAgentMainlineOrder
  const sequence = trackOrder.indexOf(slug) + 1
  const previousSlug = track === 'special'
    ? (sequence === 1 ? 'tool-calling-contracts' : trackOrder[sequence - 2])
    : trackOrder[sequence - 2]
  const previousChapter = previousSlug ? aiAgentArticleOrder.indexOf(previousSlug) + 1 : 0
  return {
    ...article,
    chapter,
    track,
    sequence,
    dependsOn: previousSlug ? [previousSlug] : [],
    artifactIn: previousSlug ? aiArtifact(previousSlug, previousChapter) : [],
    artifactOut: aiArtifact(slug, chapter),
    milestone: chapter < 22 || track === 'special' ? 'local-agent' : 'runtime'
  }
})

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

const preservedAlgorithmArticles = course('algorithms', algorithmSpecs.map(([slug, title, description, tags]) =>
  item('算法与数据结构', slug, title, description, [...tags, 'TypeScript'], [], [], '', [], 'preserved', 'walkthrough', true)
))

const newAlgorithmArticles = course('algorithms', [
  item("查找与字符串", "binary-search-boundaries", "二分查找的边界、不变量与答案空间", "从“第一个满足条件的位置”推导左右边界模板，解释循环不变量、终止条件和答案空间二分。", ["二分查找","TypeScript"], ["数组与复杂度基础"], ["能从不变量写出四类边界","能判断何时对答案空间二分"], "实现并测试四种二分边界", ["空数组、重复值和越界目标均通过","每轮搜索区间严格缩小"], "public-source", "implementation"),
  item("图与搜索", "bfs-topological-shortest-path", "BFS、拓扑排序与无权最短路", "从队列分层进入图的入度、拓扑序和无权最短路径，区分访问时机、环检测与路径恢复。", ["BFS","拓扑排序","TypeScript"], ["队列与图基础"], ["解释 BFS 分层不变量","用入度识别有向环"], "实现课程依赖排序和最短路径恢复", ["重复边与孤立点有明确处理","有环时不会返回伪拓扑序"], "public-source", "implementation"),
  item("贪心与区间", "greedy-intervals", "贪心算法与区间问题：选择、合并和覆盖", "用交换论证解释为什么按结束位置排序可以选出最多不重叠区间，并比较合并、覆盖与会议室问题。", ["贪心","区间","TypeScript"], ["排序与复杂度基础"], ["能提出并证明局部选择","区分三类区间状态"], "实现区间选择、合并和最少会议室", ["端点相等语义在测试中固定","反例能击穿错误排序策略"], "public-source", "implementation"),
  item("缓存数据结构", "lru-cache-design", "LRU Cache：哈希表与双向链表的协作", "从 O(1) 查询、更新和淘汰约束推导哈希表加双向链表，处理容量、覆盖、移动与哨兵节点。", ["LRU","哈希表","双向链表","TypeScript"], ["链表与 Map 基础"], ["推导 LRU 的组合数据结构","维护链表和缓存容量不变量"], "实现带哨兵节点的 LRU Cache", ["容量为零和重复写入均通过","每次操作后 Map 与链表节点一一对应"], "public-source", "implementation"),
  item("查找与字符串", "kmp-string-matching", "KMP 字符串匹配：前缀函数与失配回退", "从朴素匹配重复比较的问题进入最长相等真前后缀，逐步推导前缀表和失配时的状态转移。", ["KMP","字符串","TypeScript"], ["字符串与数组基础"], ["手算前缀函数","解释 KMP 为什么不回退主串指针"], "实现前缀函数与 KMP 搜索", ["重复模式和空模式语义明确","比较次数符合线性复杂度推导"], "public-source", "implementation")
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
  item('重学前端', `relearn/${slug}`, title, description, [...tags], [], [], '', [], 'preserved', 'walkthrough', true)
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
  item("Node.js", "react-nestjs-prisma-admin", "React、NestJS 与 Prisma：打通登录和项目 CRUD", "用一个可运行垂直切片把 React Router、TanStack Query、NestJS Controller/Service、Prisma、MySQL、租户范围和乐观版本串成完整请求链。", ["React","NestJS","Prisma","MySQL"], ["完成 MySQL CRUD 与 JWT 生命周期","会使用 React Hook 和 TypeScript"], ["能从页面事件追到数据库写入","能保持协议、业务与数据访问职责清晰"], "运行 React 与 NestJS 企业后台垂直切片", ["登录、列表、创建和更新形成完整闭环","跨租户查询和版本冲突有稳定结果"], "anonymized-practice", "implementation"),
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
  item('第一部分：认识 AI Infra 与运行底座', 'ai-infra-role-map', 'AI Infra 全景、岗位职责与学习路径', '沿一条 AI 请求拆开应用、数据、模型、计算、平台和可靠性六层，并把岗位能力落实为可验证产物。', ['AI Infra', 'Platform'], ['具备基础编程能力'], ['解释 AI Infra 与后端、算法、MLOps、SRE 的边界', '制定从模型 API 到企业平台的学习顺序'], '完成一张六层能力地图', ['每层都有输入、输出和负责人', '托管模型与自托管路径被区分'], 'official', 'decision'),
  item('第一部分：认识 AI Infra 与运行底座', 'linux-service-troubleshooting', 'Linux 服务运行：进程、资源、信号与证据化排障', '从模型服务无法启动出发，检查进程、线程、文件描述符、端口、权限、内存、磁盘和退出信号。', ['Linux', 'Troubleshooting'], ['会使用终端'], ['按层读取 Linux 运行证据', '区分资源不足、权限错误和进程退出'], '完成一份 Linux 服务排障表', ['每个结论能对应命令字段', '不会用 kill -9 掩盖根因'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：认识 AI Infra 与运行底座', 'network-dns-tls-http-proxy', 'DNS、TCP、TLS、HTTP 与代理请求链', '沿一次模型请求逐层解释解析、连接、握手、HTTP、反向代理和超时预算。', ['Network', 'TLS', 'HTTP'], ['会使用终端', '知道 URL 的组成'], ['定位请求链断点', '为各层分配可解释的超时预算'], '完成一张 HTTPS 请求证据链', ['DNS、TCP、TLS、HTTP 证据分开', '代理状态与源站状态可以核对'], 'official-guided-operation', 'diagnosis'),
  item('第一部分：认识 AI Infra 与运行底座', 'oci-container-runtime', 'OCI 镜像、容器隔离、cgroup 与进程生命周期', '从镜像清单到容器进程，解释 Layer、Namespace、cgroup、PID 1、挂载和优雅退出。', ['OCI', 'Container', 'cgroup'], ['理解 Linux 进程'], ['解释镜像、容器和进程的区别', '为 AI 服务设置资源与停止边界'], '完成一张容器运行模型图', ['资源限制能回到 cgroup', 'SIGTERM 能到达业务进程'], 'official', 'walkthrough'),
  item('第一部分：认识 AI Infra 与运行底座', 'docker-compose', 'Docker Compose：组织本地 AI 服务栈', '把 API、PostgreSQL、Redis、Worker 和对象存储放入同一可恢复网络，讲清卷、探针、依赖与日志。', ['Docker Compose', 'AI Backend'], ['理解容器运行模型'], ['设计多服务本地拓扑', '区分进程启动和服务就绪'], '完成一份 AI 服务栈 Compose 设计', ['服务通过名称互访', '持久数据不依赖容器可写层'], 'anonymized-practice', 'implementation'),
  item('第一部分：认识 AI Infra 与运行底座', 'nginx-static-proxy-sse', 'Nginx、TLS、模型 API 与 SSE 流式入口', '从普通响应正常但 Token 长时间不出现的问题进入反向代理、缓冲、连接超时、TLS 和热加载。', ['Nginx', 'SSE', 'Reverse Proxy'], ['理解 HTTP 与代理'], ['设计普通 API 和 SSE 的入口规则', '区分代理缓冲与模型生成延迟'], '完成一份入口请求链配置', ['SSE 事件能够及时转发', '配置检查通过后才允许热加载'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 基础设施', 'python-ai-service-runtime', 'Python AI 服务运行时：typing、asyncio、线程与多进程', '用并发模型请求、分词和文档解析三类任务解释类型边界、事件循环、取消、线程池与进程池。', ['Python', 'asyncio', 'Concurrency'], ['会编写 Python 函数'], ['区分异步并发、线程和多进程', '传播超时、取消和结构化结果'], '实现一个有界并发调度器', ['阻塞任务不占住事件循环', '失败和取消不会遗留后台任务'], 'official', 'implementation'),
  item('第二部分：AI Backend 基础设施', 'fastapi-openai-compatible-service', 'FastAPI 构建 OpenAI 兼容的 LLM 服务', '完整实现请求校验、依赖注入、Middleware、模型路由、普通响应、SSE、Token 用量和错误契约。', ['FastAPI', 'Pydantic', 'SSE'], ['Python 类型与 asyncio 基础'], ['实现兼容子集的 Chat Completions 接口', '处理流式取消、模型选择和稳定错误'], '完成一个文内可验证的 LLM API', ['普通与流式响应结构明确', '兼容子集和官方 API 的差异被声明'], 'official', 'implementation'),
  item('第二部分：AI Backend 基础设施', 'redis-operations', 'Redis 在 AI 系统中的缓存、Session、限流与任务角色', '比较缓存、会话、令牌桶、Broker 和调度状态的读写模式，解释 TTL、淘汰、持久化与故障边界。', ['Redis', 'Cache', 'Rate Limit'], ['理解键值操作'], ['为不同状态选择 Redis 数据结构', '避免缓存和队列争抢同一资源预算'], '完成一张 Redis 场景决策表', ['业务真相保留在持久存储', '每类键都有 TTL、所有者和失效策略'], 'official', 'decision'),
  item('第二部分：AI Backend 基础设施', 'postgres-pgbouncer-operations', 'PostgreSQL、JSONB、pgvector、索引与连接池', '从用户、Prompt、Agent 状态和 Embedding 四类数据进入关系约束、JSONB、向量索引、事务和 PgBouncer。', ['PostgreSQL', 'pgvector', 'PgBouncer'], ['SQL 基础'], ['设计 AI 平台数据边界', '计算连接预算并诊断慢查询'], '完成一张 AI 数据与连接模型', ['权限过滤进入 SQL', '应用池、PgBouncer 和数据库上限一致'], 'official-guided-operation', 'implementation'),
  item('第二部分：AI Backend 基础设施', 'queue-worker-plane', '消息队列与 Worker：拆分在线推理和离线任务', '按在线 Agent、解析、Embedding、评测任务讲清 ACK、幂等、重试、死信、Prefetch、租约和停机排空。', ['Queue', 'Worker', 'Idempotency'], ['理解请求内与后台任务'], ['设计隔离的任务平面', '处理重复投递和 Worker 中断'], '完成一张多队列资源拓扑', ['慢任务不阻塞在线请求', '副作用能识别重复执行'], 'anonymized-practice', 'implementation'),
  item('第二部分：AI Backend 基础设施', 'object-storage-minio', '对象存储：模型、文档、Multipart 与生命周期', '从大文件上传进入 Bucket、对象键、预签名 URL、分段上传、校验和、版本和孤立对象清理。', ['Object Storage', 'MinIO'], ['HTTP 上传基础'], ['设计模型和文档对象生命周期', '对账数据库状态与对象状态'], '完成一张对象上传状态机', ['客户端不持有永久密钥', '清理任务不会删除仍被版本引用的对象'], 'official', 'implementation'),
  item('第三部分：LLM Serving', 'llm-serving-architecture', 'LLM Serving：从模型文件到稳定推理 API', '拆开准入、调度、推理引擎、流式传输、用量统计和观测，建立模型服务的职责边界。', ['LLM Serving', 'Inference'], ['会调用模型 API'], ['解释 Serving 的控制流和数据流', '定义延迟、吞吐、队列和错误指标'], '画出一次推理请求生命周期', ['每个阶段都有输入输出', '服务健康与回答质量不会混为一谈'], 'official', 'walkthrough'),
  item('第三部分：LLM Serving', 'open-model-huggingface-deployment', 'Hugging Face、Qwen、Llama、DeepSeek 与首次开源模型部署', '从模型仓库选择进入许可证、Revision、配置、Tokenizer、权重、缓存和启动前检查。', ['Hugging Face', 'Open Model'], ['理解容器与模型 API'], ['核对开源模型制品与使用边界', '设计可复现的首次部署流程'], '完成一张开源模型部署清单', ['模型来源和 Revision 可追溯', '硬件不满足时在启动前停止'], 'official', 'decision'),
  item('第三部分：LLM Serving', 'transformer-inference-lifecycle', 'Tokenize、Prefill、Decode 与流式推理生命周期', '沿一条生成请求解释分词、批处理、Prefill、逐 Token Decode、采样、停止和流式发送。', ['Transformer', 'Inference', 'Streaming'], ['理解 Token 与模型 API'], ['解释 TTFT 与 TPOT 的来源', '定位生成生命周期中的瓶颈'], '完成一条推理时序推演', ['每阶段输入输出明确', '流式输出不等于并行生成'], 'official', 'walkthrough'),
  item('第三部分：LLM Serving', 'continuous-batching-kv-cache', 'Continuous Batching、PagedAttention 与 KV Cache', '比较静态批处理和连续批处理，解释 KV Block、请求调度、Prefix Cache、公平性和显存压力。', ['vLLM', 'PagedAttention', 'KV Cache'], ['理解推理生命周期'], ['推演动态批处理调度', '解释吞吐、延迟和缓存复用取舍'], '完成一张批处理调度表', ['长短请求影响被解释', '跨租户缓存不会越过安全边界'], 'official', 'decision'),
  item('第三部分：LLM Serving', 'vllm-openai-compatible-serving', 'vLLM 服务、OpenAI 兼容接口与故障定位', '从启动参数、模型加载和 Readiness 进入普通请求、流式请求、并行策略、显存配置与错误分层。', ['vLLM', 'OpenAI Compatible API'], ['理解模型制品、推理生命周期和 GPU 栈'], ['解释 vLLM 服务启动与请求路径', '诊断模型加载、显存和接口错误'], '完成一份 vLLM 启动与排障设计', ['兼容范围被明确声明', '不提供未经目标硬件实测的吞吐数字'], 'official-guided-operation', 'diagnosis'),
  item('第三部分：LLM Serving', 'model-artifacts-precision-quantization', '模型制品、精度、量化与推理优化', '讲清 Config、Tokenizer、Safetensors、FP32、FP16、BF16、INT8、INT4、量化校准和性能验证。', ['Model Artifact', 'Precision', 'Quantization'], ['理解模型部署与 GPU 显存'], ['估算权重与运行显存', '判断量化收益和质量风险'], '制作一份模型制品与精度清单', ['权重和 Tokenizer Revision 匹配', '性能与质量使用同一候选版本验证'], 'official', 'decision'),
  item('第四部分：GPU 基础', 'gpu-computing-foundations', '为什么 AI 需要 GPU：并行计算、矩阵乘与吞吐', '从一次矩阵乘拆开 CPU 延迟优化、GPU 吞吐设计、SIMT、带宽和算术强度。', ['GPU', 'Parallel Computing'], ['了解 CPU 与内存基础'], ['解释 GPU 适合深度学习的原因', '判断任务是否值得迁移到 GPU'], '完成一张 CPU 与 GPU 工作负载比较表', ['并行度、数据搬运和批量都被考虑', '不会把所有计算都归为 GPU 更快'], 'official', 'decision'),
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

const aiPracticeArticles = course('ai-practice', [
  item('基础认知', 'ai-capability-concepts', 'Prompt、Tool、RAG、Agent、Skill 与 MCP：一张图建立完整认知', '用一次真实开发任务拆开 Prompt、Context、Tool Calling、RAG、Agent、SubAgent、Skill 与 MCP，建立不会混用概念的能力地图。', ['Prompt', 'Tool Calling', 'RAG', 'Agent', 'Skill', 'MCP'], ['会使用命令行和编辑器', '知道 HTTP 请求与 JSON 的基本形式'], ['能从输入、控制、数据与执行边界解释八种 AI 能力', '能为开发需求选择 Prompt、RAG、Tool、Skill、MCP 或 SubAgent'], '完成一张 AI 能力选型表和端到端执行轨迹', ['每种能力都有明确输入、处理、输出与责任方', '简单任务不会被过度设计成多 Agent 或 MCP'], 'official', 'decision'),
  item('Agent 协作', 'subagent-development-workflows', 'SubAgent 开发协作：拆任务、并行取证与主 Agent 收口', '用一次跨前后端改动拆开可并行与必须串行的工作，建立任务契约、上下文隔离、文件所有权和证据合并方法。', ['SubAgent', 'Parallelism', 'Context Isolation', 'Task Contract'], ['理解 Agent 的目标、工具和停止条件', '知道 Git 工作区可能包含未提交改动'], ['能用依赖图判断开发任务应并行还是串行', '能编写可验证、可取消、可合并的 SubAgent 任务契约'], '完成一份跨前后端任务的依赖图、所有权表与结果契约', ['多个 Agent 不会同时修改同一文件或竞争共享状态', '主 Agent 能识别失败、冲突、证据缺口并完成最终验证'], 'official-guided-operation', 'decision'),
  item('能力扩展', 'mcp-design-workflow-mining', 'MCP 设计方法：从重复工作中发现值得开发的连接器', '从跨系统复制、实时查询和标准操作中识别 MCP 机会，完整设计 Server、Tool、Resource、Schema、权限、幂等、错误、审计与部署。', ['MCP', 'Tool', 'Resource', 'Schema', 'Security'], ['理解 HTTP、JSON 和进程的基本概念', '知道 Agent 会通过 Tool Calling 请求外部能力'], ['能区分 MCP、Skill、普通 API、CLI 与 RAG 的职责边界', '能从工作摩擦设计可授权、可审计、可测试的 MCP Server'], '完成一张 MCP 机会卡、能力清单和 Server 契约', ['静态知识和一次性脚本不会被误做成远程 MCP', '实时数据、敏感权限与副作用都有明确所有者和失败语义'], 'official-guided-operation', 'decision'),
  item('能力扩展', 'python-mcp-server-practice', '从零实现 FastMCP Server：查询依赖包最新版本', '用 FastMCP 把普通 Python 函数注册为可发现 Tool，并以公开包索引练习 Schema、Transport、错误映射、缓存与真实 Client 契约测试。', ['MCP', 'FastMCP', 'Python', 'Contract Test'], ['会编写带类型提示的异步函数', '理解 Client、Server 与 Tool 的基本职责'], ['能解释 FastMCP 封装的协议工作并实现可发现 Tool', '能为外部 HTTP 查询设计超时、缓存、稳定错误与安全约束'], '完成一个查询 PyPI 最新稳定版本的 FastMCP Server 和契约测试', ['正常、非法名称、包不存在、限流、超时和缓存均有可复现结果', '外部响应只作为数据处理，不会成为 Agent 指令'], 'official-guided-operation', 'implementation'),
  item('能力扩展', 'skill-design-workflow-mining', 'Skill 设计方法：把成功 Prompt 变成稳定工作流', '从重复 Prompt、固定检查表和频繁纠错中挖掘 Skill，设计触发描述、渐进式披露、脚本、参考、资产、错误处理和评测。', ['Skill', 'SKILL.md', 'Progressive Disclosure', 'Evaluation'], ['会读 Markdown 和简单脚本', '理解 Agent、项目规则与 MCP 的基本边界'], ['能判断重复工作是否值得沉淀为 Skill', '能设计可正确触发、按需加载、可回归评测的 Skill'], '完成一张 Skill 机会卡和可验证的最小目录设计', ['触发描述覆盖真实说法且不会抢占无关任务', '确定性步骤、长资料和输出资产进入正确目录'], 'official-guided-operation', 'implementation'),
  item('能力扩展', 'article-publishing-skill-practice', '从零实现文章发布检查 Skill：规则、脚本、评测与迭代', '把一次文章验收任务做成完整 Skill，检查 Frontmatter、标题、内部链接、示例、敏感信息与发布清单，并建立触发和回归评测。', ['Skill', 'Content Quality', 'Python', 'Evaluation'], ['理解 SKILL.md、scripts、references 与 assets 的分工', '会运行脚本并阅读 Markdown Frontmatter'], ['能实现一个规则与确定性检查分离的文章发布 Skill', '能用正例、负例和失败用例评测触发与执行质量'], '完成 article-publishing-check Skill、检查器和评测矩阵', ['检查器能定位元数据、标题、链接与敏感信息问题', 'Skill 不会把普通润色误判为发布验收或擅自发布'], 'official-guided-operation', 'implementation'),
  item('研发系统', 'ai-coding-development-loop', 'AI Coding 研发闭环：从需求文档、原子 Diff 到 PR 与部署', '用一个完整功能贯穿需求成文、仓库取证、变更契约、原子 Diff、自动测试、独立审查、PR、候选发布、观测与回滚。', ['AI Coding', 'Diff Policy', 'Pull Request', 'CI/CD'], ['能独立完成一次代码修改和测试', '了解版本控制、发布与运行监控的基本概念'], ['能把产品想法转成连接需求、代码、测试和发布的可执行工件', '能设计自动化研发流水线，同时保留 Git、生产和不可逆操作的人类授权'], '完成需求文档、变更契约、测试矩阵、Diff Checker、PR 与发布状态样例', ['越界文件、敏感信息、迁移和测试缺口可被确定性检查', '候选产物通过门禁后才进入灰度，异常可快速回滚'], 'public-source', 'implementation'),
  item('研发系统', 'spec-sdd-plan-first-development', 'Spec 与 SDD 实践：主流工具、可执行规格与真实仓库落地', '用同一个带权限批量导出需求，对比 Superpowers、Spec Kit、OpenSpec 与 BMAD Method，并给出已有仓库和新项目的选型判断。', ['Specification', 'SDD', 'Spec Kit', 'OpenSpec'], ['会阅读需求、代码和测试', '理解计划、规格与实现是不同工件'], ['能判断四类主流方法各自在澄清、增量变更、多 Agent 与流程纪律上的取舍', '能为真实仓库写一份随需求变化而更新的轻量可执行 Spec'], '完成带权限批量导出的四种规格推演和选型结果', ['Star 快照只作样本筛选而非质量证明', '小任务不会因套用完整 SDD 而制造无效文档'], 'public-source', 'decision'),
  item('研发系统', 'context-engineering-harness', '上下文工程与 Harness Engineering：为 Agent 建立可靠执行环境', '从一次不可重复的编码任务追查上下文截断、提示注入、工具超时、越界修改、无限重试、多 Agent 冲突和发布后异常。', ['Context Engineering', 'Harness Engineering', 'Agent Runtime', 'Evaluation'], ['理解 Prompt、Agent、Tool、规则和测试的基本职责', '知道沙箱、权限与运行环境会影响 Agent 行为'], ['能从故障证据区分 Prompt、上下文、工具、环境、控制和反馈问题', '能为编码 Agent 建立可追踪、可取消、可恢复并能长期回归的 Harness'], '完成一次不可重复任务的 Trace 复盘、修复设计和长期评测方案', ['工具失败不会被当成空成功，测试结果会反馈给下一轮决策', 'Checkpoint 恢复不重复已确认副作用，Goal 有明确完成定义'], 'public-source', 'diagnosis'),
  item('个人工作系统', 'ai-work-modes-opc-full-stack', 'Plan、Auto、Goal 与 OPC：AI 时代的个人全栈工作系统', '区分 Plan、Auto 和 Goal 的任务、权限与周期，再把产品、设计、研发、测试、发布、增长和复盘组织成保留人类门禁的 OPC 闭环。', ['Plan Mode', 'Auto', 'Goal Mode', 'OPC', 'Full Stack'], ['能独立完成一次小型开发任务', '了解测试、发布、监控与回滚的基本概念'], ['能按任务不确定性、执行权限和持续周期选择 Plan、Auto 或 Goal', '能建立 AI 执行与人类经营门禁分离的一人全栈闭环'], '完成一张 AI 工作模式决策表、OPC 角色图和人类门禁表', ['Goal 不会被误解为扩大沙箱、审批或外部系统权限', '生产、资金、法律与不可逆操作始终有明确人类责任'], 'official-guided-operation', 'decision')
])

export const articles: ChapterMeta[] = [
  ...aiAgentArticles,
  ...seoArticles,
  ...relearnArticles,
  ...frontendArticles,
  ...preservedAlgorithmArticles,
  ...newAlgorithmArticles,
  ...backendArticles,
  ...devopsArticles,
  ...aiPracticeArticles
]

export const articlePath = (chapter: ChapterMeta): string =>
  `/docs/${chapter.category}/${chapter.slug}`

export const articleFile = (chapter: ChapterMeta): string =>
  `docs/${chapter.category}/${chapter.slug}.md`

export const articlesByCategory = (category: Category): ChapterMeta[] =>
  articles.filter((chapter) => chapter.category === category)

export const isPreservedChapter = (chapter: ChapterMeta): boolean =>
  chapter.preserved === true
