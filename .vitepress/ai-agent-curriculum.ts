export interface AiAgentStage {
  key: string
  label: string
  question: string
}

export type AiAgentArticleType = 'concept' | 'implementation' | 'architecture' | 'diagnosis' | 'reference'

export interface AiAgentArticleSpec {
  stageKey: string
  slug: string
  title: string
  description: string
  tags: string[]
  dependsOn: string[]
  sourceKey: string
  coverageKeys: string[]
  articleType: AiAgentArticleType
}

export const aiAgentStages: AiAgentStage[] = [
  { key: 'foundations', label: '模型、调用与 Agent 基础', question: '模型怎样生成结果，应用又怎样把模型接入受限的行动循环？' },
  { key: 'tools', label: '工具、MCP 与 Skill', question: '模型提出动作后，程序怎样发现、校验、授权和执行外部能力？' },
  { key: 'context-memory', label: '上下文工程与记忆', question: '有限窗口怎样装配、压缩和缓存，多轮状态怎样保存而不污染事实？' },
  { key: 'single-agent', label: '单 Agent 推理', question: 'Router、Planning、Reflection 和搜索式推理分别改变哪段控制流？' },
  { key: 'multi-agent-research', label: '多 Agent 与研究', question: '任务拆开后，依赖、工作区、责任、覆盖度和停止条件由谁管理？' },
  { key: 'rag', label: 'RAG 知识工程', question: '文件怎样经过解析、切块、向量化、发布和检索，成为可引用的权限内证据？' },
  { key: 'trust-safety', label: '证据、质量与安全', question: '答案怎样绑定证据，执行怎样受到权限、策略、沙箱和评测约束？' },
  { key: 'runtime', label: 'Runtime 与异步执行', question: '长任务怎样处理幂等、持久化、队列、控制信号、超时、恢复和事件交付？' },
  { key: 'production', label: '生产架构', question: '模型、运行时、数据和基础设施怎样分层，并让失败能够定位和降级？' },
  { key: 'harness', label: 'Harness 与交互式 Agent', question: 'Computer Use、编码和本地 Agent 怎样共用一套上下文、权限和验证底座？' },
  { key: 'capstone', label: '综合项目', question: '怎样把文档入库、检索、证据、异步执行、恢复和评测串成完整系统？' },
  { key: 'appendix', label: '附录', question: '术语、模式选择和工程问题怎样快速反查，而不形成第二套学习路线？' },
]

type ArticleInput = Omit<AiAgentArticleSpec, 'stageKey' | 'sourceKey'>

function stage(stageKey: string, articles: ArticleInput[]): AiAgentArticleSpec[] {
  return articles.map((article) => ({
    ...article,
    stageKey,
    sourceKey: `ai-${article.slug}`,
  }))
}

const article = (
  slug: string,
  title: string,
  description: string,
  tags: string[],
  articleType: AiAgentArticleType,
  coverageKeys: string[],
  dependsOn: string[] = [],
): ArticleInput => ({ slug, title, description, tags, articleType, coverageKeys, dependsOn })

export const aiAgentCurriculum: AiAgentArticleSpec[] = [
  ...stage('foundations', [
    article('llm-workflow-rag-agent', 'LLM、工作流、RAG 与 Agent 如何分工', '用同一个知识查询任务比较模型生成、固定编排、外部检索和受限行动循环。', ['LLM', 'Workflow', 'RAG', 'Agent'], 'concept', ['wl-01-agent-essence', 'kb-runtime-boundaries']),
    article('messages-tokens-context', 'Message、Token 与上下文：模型一次调用看到了什么', '沿一条请求解释消息角色、分词、输入窗口、输出预算和停止原因。', ['Message', 'Token', 'Context'], 'concept', ['official-model-input', 'kb-context-assembly'], ['llm-workflow-rag-agent']),
    article('python-openai-responses-first-call', '用 Python 调用一次 Responses API', '从环境、凭证和请求字段走到同步输出、usage、流式事件和错误分类。', ['Python', 'OpenAI', 'Responses API'], 'implementation', ['official-responses-api', 'example-model-adapter'], ['messages-tokens-context']),
    article('structured-output-model-boundaries', '结构化输出约束格式，不证明业务事实', '说明 JSON Schema 能保证什么，以及身份、权限、版本和证据为何仍由程序确认。', ['Structured Outputs', 'JSON Schema', 'Pydantic'], 'concept', ['official-structured-output', 'kb-runtime-contracts'], ['messages-tokens-context']),
    article('agent-essence-autonomy-boundaries', 'Agent 的定义、自主性与责任边界', '把目标、状态、动作、观察和终止条件放回应用运行时，说明有限自主性怎样形成。', ['Agent', 'Autonomy', 'Runtime'], 'concept', ['wl-01-agent-essence', 'kb-runtime-boundaries'], ['structured-output-model-boundaries']),
    article('python-agent-loop-from-scratch', '什么是 Agent 循环', '不用框架实现一次有限行动循环，观察决策、执行、状态更新、异常和终止。', ['Agent Loop', 'Python', 'ReAct'], 'implementation', ['wl-02-react-loop', 'example-agent-loop', 'kb-runtime-state'], ['agent-essence-autonomy-boundaries']),
    article('agent-fit-deterministic-workflow', '哪些任务不该使用 Agent', '从控制图、失败代价、审计要求和分支不确定性判断固定程序、工作流或 Agent。', ['Agent', 'Workflow', 'Decision'], 'concept', ['wl-01-agent-fit', 'appendix-pattern-selection'], ['python-agent-loop-from-scratch']),
  ]),
  ...stage('tools', [
    article('tool-calling-contracts', 'Tool Calling 的提议、校验与执行契约', '拆开工具描述、参数 Schema、模型候选、可信上下文、执行结果和错误回传。', ['Tool Calling', 'Contract', 'JSON Schema'], 'implementation', ['wl-03-tool-calling', 'kb-tool-contracts'], ['python-agent-loop-from-scratch']),
    article('parallel-tool-execution', '并行工具执行怎样保持身份、顺序与预算', '判断调用级并发安全，处理结果身份、超时、取消、共享预算和部分失败。', ['Tool Calling', 'Concurrency', 'Budget'], 'implementation', ['wl-44-parallel-tools', 'kb-parallel-retrieval'], ['tool-calling-contracts']),
    article('mcp-foundations-boundaries', 'MCP 的系统位置与能力边界', '从 Host、Client、Server 和能力协商理解 MCP 与 Tool Calling、API、Skill 的关系。', ['MCP', 'Tool', 'Protocol'], 'concept', ['wl-04-mcp', 'kb-mcp-boundaries'], ['tool-calling-contracts']),
    article('mcp-protocol-lifecycle', 'MCP 从初始化到关闭的协议生命周期', '沿连接、版本协商、能力发现、调用、进度、取消、重连和关闭追踪 JSON-RPC 消息。', ['MCP', 'JSON-RPC', 'Lifecycle'], 'implementation', ['wl-04-mcp', 'official-mcp-lifecycle'], ['mcp-foundations-boundaries']),
    article('mcp-python-server-client', '用 Python 实现 MCP Server 与 Client', '实现只读工具并验证发现、调用、参数错误、超时和资源释放。', ['MCP', 'Python', 'Client Server'], 'implementation', ['official-mcp-python', 'kb-mcp-contract-tests'], ['mcp-protocol-lifecycle']),
    article('skill-system-progressive-disclosure', 'Skill 怎样按需加载任务知识', '说明触发、目录、渐进式披露、脚本与资源怎样降低常驻上下文。', ['Skill', 'Progressive Disclosure', 'Context'], 'implementation', ['wl-05-skills', 'official-agent-skills'], ['mcp-foundations-boundaries']),
    article('agent-hooks-events-approval', 'Hook、事件与人工审批怎样约束执行', '把观察、拦截、审批和审计放入动作前后，区分生命周期 Hook 与业务策略。', ['Hook', 'Event', 'Approval'], 'architecture', ['wl-06-hooks', 'kb-runtime-events'], ['tool-calling-contracts']),
  ]),
  ...stage('context-memory', [
    article('context-engineering-assembly-budget', '上下文工程怎样装配一次模型输入', '把规则、问题、历史、记忆、检索证据和工具结果放进有限输入预算。', ['Context Engineering', 'Token Budget'], 'architecture', ['wl-07-context-engineering', 'kb-context-assembly'], ['messages-tokens-context', 'tool-calling-contracts']),
    article('context-window-strategies', '上下文窗口怎样保留近期状态与关键事实', '比较滑动窗口、优先级裁剪和外部状态引用，说明各自损失的信息。', ['Context Window', 'Trimming'], 'implementation', ['wl-07-context-engineering', 'kb-conversation-window'], ['context-engineering-assembly-budget']),
    article('context-compression', '上下文压缩怎样选择保留与丢弃', '解释触发阈值、摘要输入、不可压缩字段、失败回退和压缩后的验证。', ['Context Compression', 'Summary'], 'implementation', ['wl-35-context-compression', 'kb-context-summary'], ['context-window-strategies']),
    article('hierarchical-context-compression', '分层压缩怎样保护近期工作状态', '按距离当前决策的远近分层处理历史、工具结果和工作文件，并限制摘要误差传播。', ['Context Compression', 'Hierarchy'], 'architecture', ['wl-37-hierarchical-compression', 'kb-context-summary'], ['context-compression']),
    article('tool-result-budget-overflow', 'Tool Result 预算、预览与外部引用', '处理大搜索结果和并行工具输出，用预览、稳定指针和生命周期约束避免窗口溢出。', ['Tool Result', 'Token Budget', 'Overflow'], 'implementation', ['wl-36-tool-result-budget', 'kb-evidence-budget'], ['context-engineering-assembly-budget', 'parallel-tool-execution']),
    article('deferred-tool-loading-search', '延迟工具加载与 Tool Search', '让模型先发现相关工具，再加载完整 Schema，同时保留必需工具、授权和缓存边界。', ['Tool Search', 'Deferred Loading'], 'architecture', ['wl-38-deferred-tools', 'official-tool-search'], ['tool-calling-contracts', 'context-engineering-assembly-budget']),
    article('prompt-cache-prefix-design', 'Prompt Cache 的稳定前缀与失效边界', '解释前缀匹配、断点、缓存键、字节稳定性、权限变化和命中测量。', ['Prompt Cache', 'Prefix', 'Cost'], 'implementation', ['wl-39-prompt-cache', 'official-prompt-cache'], ['context-engineering-assembly-budget']),
    article('memory-architecture-retrieval', 'Agent 记忆怎样写入、检索、更新和遗忘', '区分会话状态、用户记忆和事实知识，建立来源、范围、置信度、过期与撤回规则。', ['Memory', 'Retrieval', 'TTL'], 'architecture', ['wl-08-memory', 'kb-user-memory'], ['context-window-strategies']),
    article('multi-turn-conversation-design', '多轮对话怎样保存状态与处理指代', '从 Conversation、Turn 和 Message 的关系解释历史装配、焦点切换、并发消息和标题生成。', ['Conversation', 'Turn', 'Coreference'], 'architecture', ['wl-09-multi-turn', 'kb-conversation-state'], ['memory-architecture-retrieval']),
    article('context-pollution-injection', '上下文污染与间接提示注入', '追踪恶意内容怎样从文件、网页、记忆和工具结果进入输入，并在装配前标记和隔离。', ['Prompt Injection', 'Trust Boundary', 'Context'], 'diagnosis', ['wl-07-context-security', 'kb-untrusted-content'], ['context-engineering-assembly-budget', 'multi-turn-conversation-design']),
  ]),
  ...stage('single-agent', [
    article('agent-router-mode-selection', 'Router 怎样选择执行模式', '根据任务范围、时限、风险和证据要求选择固定回答、快速检索或研究循环。', ['Router', 'Mode Selection'], 'implementation', ['wl-13-routing', 'kb-mode-routing'], ['agent-fit-deterministic-workflow']),
    article('agent-planner-search-plan', 'Planner 怎样生成受限的 SearchPlan', '让计划描述目标、分支、依赖、范围、预算和停止条件，执行权仍留在运行时。', ['Planning', 'SearchPlan'], 'implementation', ['wl-10-planning', 'kb-search-plan'], ['agent-router-mode-selection']),
    article('agent-reflection-repair', 'Reflection 怎样验证结果并做有限修复', '将可观察问题反馈给修复步骤，限制轮数、保留原证据并处理评估器失真。', ['Reflection', 'Repair', 'Validation'], 'implementation', ['wl-11-reflection', 'kb-answer-repair'], ['agent-planner-search-plan']),
    article('chain-of-thought-boundaries', '推理过程的使用边界与审计记录', '区分模型内部推理、可公开解释和运行时决策记录，避免把隐式理由当事实证据。', ['Reasoning', 'Chain of Thought', 'Trace'], 'concept', ['wl-12-chain-of-thought', 'official-reasoning-boundary'], ['python-agent-loop-from-scratch']),
    article('tree-of-thoughts-search', 'Tree of Thoughts 怎样搜索候选路径', '从候选生成、评分、剪枝、回溯和预算耗尽理解树搜索的控制过程。', ['Tree of Thoughts', 'Search', 'Pruning'], 'implementation', ['wl-17-tree-of-thoughts', 'appendix-pattern-selection'], ['agent-planner-search-plan']),
    article('debate-pattern', 'Debate 模式怎样处理有证据的分歧', '让不同角色提出和质询证据，再由独立规则裁决，避免多数票替代事实验证。', ['Debate', 'Evidence', 'Multi Agent'], 'implementation', ['wl-18-debate', 'appendix-pattern-selection'], ['agent-reflection-repair']),
  ]),
  ...stage('multi-agent-research', [
    article('multi-agent-orchestration', '多 Agent 编排的职责、状态与成本', '从单循环拆出多个角色，明确输入输出、共享状态、预算和失败责任。', ['Multi Agent', 'Orchestration', 'State'], 'architecture', ['wl-13-orchestration', 'kb-runtime-state'], ['agent-planner-search-plan']),
    article('multi-agent-dag-workflows', 'DAG 工作流怎样表达依赖与并行', '用有向无环图表达稳定依赖，处理拓扑顺序、扇出、汇合、部分失败和重试。', ['DAG', 'Workflow', 'Parallel'], 'implementation', ['wl-14-dag', 'kb-parallel-retrieval'], ['multi-agent-orchestration']),
    article('multi-agent-swarm-pattern', 'Swarm 模式的局部协作与全局约束', '解释去中心化选择带来的灵活性，以及预算、权限、重复工作、工作区和收敛问题。', ['Swarm', 'Coordination', 'Budget'], 'architecture', ['wl-15-swarm', 'appendix-pattern-selection'], ['multi-agent-orchestration']),
    article('multi-agent-handoff-workspace', 'Handoff 怎样移交任务、上下文与责任', '设计移交包、共享工作区、消息和回收控制，让接收方知道目标、权限和返回条件。', ['Handoff', 'Workspace', 'Context'], 'implementation', ['wl-16-handoff', 'kb-runtime-state'], ['multi-agent-orchestration']),
    article('subagent-context-contracts', 'SubAgent 的上下文隔离与任务契约', '用窄契约限制资料、工具和输出，处理超时、冲突、父任务取消和结果合并。', ['SubAgent', 'Context Isolation', 'Contract'], 'implementation', ['wl-13-orchestration', 'kb-runtime-state'], ['multi-agent-handoff-workspace']),
    article('deep-research-agent', 'Deep Research Agent 怎样组织多轮检索', '从问题分解、并行搜索、来源审查到补缺，建立有预算的研究循环。', ['Deep Research', 'Search', 'Agent'], 'architecture', ['wl-27-deep-research', 'kb-search-plan'], ['agent-planner-search-plan', 'multi-agent-dag-workflows']),
    article('research-synthesis-coverage', '研究综合怎样判断覆盖度与冲突', '把问题维度、证据包、已知缺口和来源冲突分开，再生成有范围的结论。', ['Research', 'Coverage', 'Synthesis'], 'implementation', ['wl-19-research-synthesis', 'wl-27-deep-research', 'kb-evidence-model'], ['deep-research-agent']),
    article('research-stop-citation-failure', '研究任务的停止条件与引用失败', '用覆盖度、截止时间、轮数和边际收益停止循环，并拒绝无法核对的关键结论。', ['Research', 'Citation', 'Stop Condition'], 'diagnosis', ['wl-19-research-synthesis', 'wl-27-deep-research', 'kb-citation-validation'], ['research-synthesis-coverage']),
  ]),
  ...stage('rag', [
    article('rag-strategy-map', 'RAG 的系统位置、策略与升级路径', '从固定检索到混合检索和研究循环，比较数据流、控制流、成本与适用边界。', ['RAG', 'Retrieval', 'Agentic RAG'], 'concept', ['kb-rag-strategy', 'official-rag-patterns'], ['llm-workflow-rag-agent']),
    article('rag-upload-admission-object-storage', '文件上传、准入与对象存储', '设计上传协议、文件校验、内容哈希、Manifest、重复上传、对象生命周期和失败清理。', ['RAG', 'Upload', 'Object Storage'], 'implementation', ['kb-file-admission', 'kb-object-storage'], ['rag-strategy-map']),
    article('rag-document-parsing-ocr', '多格式文档解析与 OCR', '统一处理 Markdown、HTML、PDF、Office 和扫描件，记录解析警告并在 OCR 不可用时失败关闭。', ['Parsing', 'OCR', 'Document'], 'implementation', ['kb-document-parsers', 'kb-ocr-fail-closed'], ['rag-upload-admission-object-storage']),
    article('rag-block-document-model', 'Block 文档模型怎样保留结构与来源', '定义段落、标题、代码、表格和页码等 Block，区分显示文本、检索文本和稳定来源 ID。', ['Block', 'Document Model', 'Source ID'], 'architecture', ['kb-parsed-content', 'kb-block-structure'], ['rag-document-parsing-ocr']),
    article('rag-semantic-chunking', '语义切块怎样保留章节与邻接关系', '按语义边界、目标长度和最大长度生成 Chunk，保留父节点、相邻关系和稳定身份。', ['Chunking', 'Semantic Boundary'], 'implementation', ['kb-semantic-chunker', 'kb-stable-chunk-id'], ['rag-block-document-model']),
    article('rag-table-structured-chunks', '表格怎样生成可检索的结构化 Chunk', '保留表头、行字段、整表内容和业务编号，并处理超大表、空列和重复行。', ['Table', 'Structured Chunk', 'RAG'], 'implementation', ['kb-table-chunker', 'kb-structured-fields'], ['rag-semantic-chunking']),
    article('rag-chunk-quality-gates', 'Chunk 质量门禁与回归检查', '检查内容保留、重复、孤立邻接、超限切块和失败记录，让切块变化可回归。', ['Chunking', 'Quality Gate', 'Regression'], 'diagnosis', ['kb-chunk-quality', 'kb-ingestion-tests'], ['rag-semantic-chunking', 'rag-table-structured-chunks']),
    article('embedding-representation-boundaries', 'Embedding 表示什么，不能证明什么', '解释向量空间、相似度和语义邻近，说明权限、时效、精确编号与事实正确性不能由距离替代。', ['Embedding', 'Vector Space', 'Similarity'], 'concept', ['wl-08-embedding', 'official-embedding'], ['rag-chunk-quality-gates']),
    article('embedding-text-model-design', 'Embedding 文本、模型与版本元数据', '区分正文、显示文本、回答文本与 embedding_text，并保存模型、维度、规范化和版本信息。', ['Embedding', 'Model', 'Metadata'], 'architecture', ['kb-embedding-text', 'kb-embedding-metadata'], ['embedding-representation-boundaries']),
    article('embedding-batch-idempotency', 'Embedding 批处理、重试与幂等', '处理批量并发、内容哈希、部分成功、失败重试和重复任务，避免重算污染候选版本。', ['Embedding', 'Batch', 'Idempotency'], 'implementation', ['kb-embedding-batch', 'kb-ingestion-idempotency'], ['embedding-text-model-design']),
    article('rag-version-atomic-activation', '候选索引怎样原子激活与回滚', '区分候选版本和活动版本，处理校验、过期任务、补偿、旧版本服务和重新索引。', ['RAG', 'Release', 'Atomic Activation'], 'architecture', ['kb-staged-version', 'kb-release-activation'], ['embedding-batch-idempotency']),
    article('pgvector-storage-index-recall', 'pgvector 存储、索引与向量检索', '从查询向量、距离函数和精确基线进入 HNSW、IVFFlat、过滤、Top K、邻接补全、召回验证与降级。', ['pgvector', 'Vector Retrieval', 'Recall'], 'implementation', ['kb-vector-storage', 'official-pgvector', 'kb-dense-retrieval', 'kb-retrieval-degradation'], ['rag-version-atomic-activation']),
    article('rag-query-understanding-scope', '查询理解怎样固定意图、实体与权限范围', '用一次结构化理解提取意图、实体、时间、别名、指代和显式范围，不靠业务词特判。', ['Query Understanding', 'Scope', 'ACL'], 'implementation', ['kb-query-understanding', 'kb-scope-constraints'], ['multi-turn-conversation-design', 'rag-strategy-map']),
    article('rag-query-rewrite-decomposition', '查询改写、问题分解与分支预算', '比较 Multi-Query、HyDE 和 Step-back，确保实体、时间与权限不漂移并限制分支膨胀。', ['Query Rewrite', 'Decomposition', 'HyDE'], 'implementation', ['kb-query-rewrite', 'kb-search-plan'], ['rag-query-understanding-scope', 'agent-planner-search-plan']),
    article('rag-exact-fulltext-structured-retrieval', '精确、全文与结构化检索怎样协作', '为业务编号、中文词项、表格字段和严格查询设计通道，并只在受控条件下放宽。', ['Exact Retrieval', 'Full Text', 'Structured Search'], 'implementation', ['kb-exact-retrieval', 'kb-sparse-retrieval'], ['rag-query-understanding-scope']),
    article('hybrid-retrieval-rerank', '混合检索的融合、去重与重排', '并发运行多条检索通道，保留候选身份，用 RRF 融合并在超时边界内重排。', ['Hybrid Retrieval', 'RRF', 'Rerank'], 'implementation', ['kb-hybrid-retrieval', 'kb-rerank-context'], ['rag-exact-fulltext-structured-retrieval', 'pgvector-storage-index-recall']),
    article('rag-evidence-budget-cache', 'Evidence 预算、缓存与 Singleflight', '按问题覆盖选择证据，缓存键绑定查询、权限、知识版本和检索配置，命中后重新鉴权。', ['Evidence', 'Cache', 'Singleflight'], 'architecture', ['kb-evidence-budget', 'kb-retrieval-cache'], ['hybrid-retrieval-rerank']),
    article('wiki-alias-knowledge-governance', 'Wiki、Alias 与知识治理', '设计主题卡片、摘要、别名、人工修改、自动生成和版本更新，不让别名猜测替代事实。', ['Wiki', 'Alias', 'Knowledge Governance'], 'architecture', ['kb-wiki-service', 'kb-alias-governance'], ['hybrid-retrieval-rerank']),
    article('knowledge-graph-build-evidence', '知识图谱怎样从证据构建节点与边', '区分确定性关系和语义抽取，保存稳定 ID、来源、构建版本、属性过滤和失败回滚。', ['Knowledge Graph', 'Evidence', 'Build'], 'implementation', ['kb-graph-build', 'kb-graph-evidence'], ['rag-version-atomic-activation']),
    article('graph-assisted-retrieval', '图谱辅助检索的路由、扩展与回退', '用 Alias 和 Wiki 路由实体，受限扩展子图并把关系绑定到来源，图谱失败时退回普通检索。', ['Knowledge Graph', 'Retrieval', 'Fallback'], 'implementation', ['kb-graph-retrieval', 'kb-wiki-routing'], ['knowledge-graph-build-evidence', 'wiki-alias-knowledge-governance']),
    article('rag-acl-release-security', 'RAG 的 ACL 与知识版本链', '让用户范围和 Release 贯穿检索、缓存、重排、证据、引用和答案验证。', ['ACL', 'Release', 'RAG Security'], 'architecture', ['kb-rag-acl', 'kb-release-snapshot'], ['rag-evidence-budget-cache', 'rag-version-atomic-activation']),
    article('rag-evaluation-recall-mrr-ndcg', '用 Recall、MRR 与 nDCG 评估检索', '建立带标注查询集，计算召回、首个相关位置和排序质量，并分析权限与版本回归。', ['RAG Evaluation', 'Recall', 'MRR', 'nDCG'], 'implementation', ['kb-retrieval-eval', 'official-ranking-metrics'], ['hybrid-retrieval-rerank', 'rag-acl-release-security']),
  ]),
  ...stage('trust-safety', [
    article('claims-evidence-citations', 'Claim、Evidence 与 Citation 怎样对应', '把答案拆成原子断言，让每条事实绑定当前用户可见证据和准确位置。', ['Claim', 'Evidence', 'Citation'], 'architecture', ['kb-claim-model', 'kb-evidence-binding'], ['rag-evidence-budget-cache']),
    article('validation-repair-refusal', '答案验证、有限修复与安全拒答', '沿事实、引用、权限、隐私和新鲜度检查答案，只修可修问题并保留原始证据。', ['Validation', 'Repair', 'Refusal'], 'implementation', ['kb-answer-validation', 'kb-answer-repair'], ['claims-evidence-citations', 'agent-reflection-repair']),
    article('agent-security-trust-boundaries', 'Agent 安全从信任边界开始', '区分系统策略、用户输入、记忆、检索内容和工具结果的信任等级及传播规则。', ['Security', 'Trust Boundary', 'Prompt Injection'], 'architecture', ['kb-untrusted-content', 'wl-25-safe-execution'], ['context-pollution-injection', 'tool-calling-contracts']),
    article('agent-safe-execution-sandbox', '安全执行怎样限制文件、网络与进程', '组合沙箱、最小权限、资源配额和人工确认，约束具有副作用的工具。', ['Sandbox', 'Least Privilege', 'Approval'], 'implementation', ['wl-25-safe-execution', 'official-sandboxing'], ['agent-security-trust-boundaries', 'agent-hooks-events-approval']),
    article('agent-policy-governance', 'Agent 策略怎样版本化、灰度与回滚', '将模型、提示、工具、预算和质量门禁保存为不可变策略版本，并控制发布范围。', ['Policy', 'Governance', 'Canary'], 'architecture', ['wl-24-policy-governance', 'kb-policy-version'], ['validation-repair-refusal']),
    article('multi-tenant-agent-design', '多租户 Agent 的身份、状态与证据隔离', '让租户边界贯穿认证、Turn、检索、缓存、事件、工具和审计。', ['Multi Tenant', 'Isolation', 'ACL'], 'architecture', ['wl-26-multi-tenant', 'kb-tenant-scope'], ['agent-security-trust-boundaries', 'rag-acl-release-security']),
    article('agent-evaluation-regression', 'Agent Eval 怎样覆盖检索、回答与运行时', '用固定用例同时检查范围、召回、引用、拒答、终态、恢复和语义判定不可用。', ['Agent Eval', 'Regression', 'Quality Gate'], 'implementation', ['kb-agent-eval', 'kb-eval-regression'], ['validation-repair-refusal', 'rag-evaluation-recall-mrr-ndcg']),
    article('agent-feedback-optimization', '用户反馈怎样进入可控优化流程', '把采纳、拒绝、原因和纠正转成评测数据，再经过 Challenger、Canary 和回滚。', ['Feedback', 'Optimization', 'Canary'], 'architecture', ['kb-feedback-loop', 'kb-policy-version'], ['agent-evaluation-regression', 'agent-policy-governance']),
  ]),
  ...stage('runtime', [
    article('agent-runtime-domain-model', 'Agent Runtime 的领域模型与状态归属', '区分 Conversation、Turn、Message、Event、Task、Release 和 Policy 的生命周期与所有者。', ['Runtime', 'Turn', 'Domain Model'], 'architecture', ['kb-runtime-domain', 'kb-turn-state'], ['python-agent-loop-from-scratch']),
    article('agent-request-lifecycle-runtime', '一次 Agent 请求怎样穿过 API 与 Runtime', '从创建 Turn 到异步执行、事件持久化、流式读取和终态查询，解释每层职责。', ['Request Lifecycle', 'API', 'Runtime'], 'architecture', ['kb-runtime-api', 'kb-runtime-execution'], ['agent-runtime-domain-model']),
    article('turn-idempotency-version-snapshot', 'Turn 幂等与版本快照', '用幂等键处理重复请求，并在开始时固定知识 Release、Policy、模型和权限范围。', ['Turn', 'Idempotency', 'Snapshot'], 'implementation', ['kb-turn-idempotency', 'kb-release-snapshot'], ['agent-request-lifecycle-runtime']),
    article('dag-to-agent-loop-runtime', '从 DAG 到 Agent Loop 的运行时选择', '比较静态依赖图和运行时行动循环，说明生产系统为何常把两者组合。', ['DAG', 'Agent Loop', 'Runtime'], 'architecture', ['wl-34-dag-to-loop', 'kb-runtime-state'], ['multi-agent-dag-workflows', 'agent-runtime-domain-model']),
    article('persistent-agent-loop', '持久化 Agent Loop 的检查点与重入', '选择检查点边界，重新发现未完成 Turn，并让恢复过程重新经过授权和幂等检查。', ['Agent Loop', 'Checkpoint', 'Persistence'], 'implementation', ['wl-40-persistent-loop', 'kb-checkpoint-resume'], ['turn-idempotency-version-snapshot']),
    article('runtime-agent-control', '运行中的追加、撤回与中断', '区分 accepted、committed 和 completed，在决策边界处理新消息、竞态和交付确认。', ['Runtime', 'Control', 'Concurrency'], 'implementation', ['wl-41-runtime-control', 'kb-runtime-cancel'], ['persistent-agent-loop']),
    article('deadline-cancel-checkpoint-recovery', '取消、Deadline、Checkpoint 与恢复', '区分主动取消、阶段超时、进程崩溃和重试，避免恢复时重复副作用。', ['Deadline', 'Cancellation', 'Checkpoint'], 'implementation', ['kb-runtime-cancel', 'kb-checkpoint-resume'], ['persistent-agent-loop']),
    article('agent-watchdog-timeouts', 'Watchdog 怎样识别阶段超时', '用阶段模型区分软空闲、硬空闲和流式空闲，处理嵌套调用与跟踪器失真。', ['Watchdog', 'Timeout', 'Runtime'], 'diagnosis', ['wl-42-watchdog', 'kb-runtime-lease'], ['deadline-cancel-checkpoint-recovery']),
    article('agent-loop-stall-detection', '卡循环检测的信号、裁决与修复', '组合重复动作、无状态变化、错误循环和进度信号，避免探测器替代根因修复。', ['Agent Loop', 'Stall Detection'], 'diagnosis', ['wl-43-stall-detection', 'kb-runtime-events'], ['agent-watchdog-timeouts']),
    article('agent-admission-lease', 'Agent 准入控制、并发配额与 Lease', '在任务进入执行前分配容量，用租约区分活跃 Worker、失联执行和可重试任务。', ['Admission', 'Lease', 'Concurrency'], 'architecture', ['kb-agent-admission', 'kb-runtime-lease'], ['turn-idempotency-version-snapshot']),
    article('celery-worker-ack-lease', 'Celery Worker 的 ACK、Lease 与重复投递', '说明至少一次投递下的任务领取、晚确认、Worker 丢失、续租、重试与幂等。', ['Celery', 'ACK', 'Lease'], 'implementation', ['kb-celery-worker', 'kb-worker-recovery'], ['agent-admission-lease']),
    article('sse-events-replay-fallback', 'SSE 事件的序号、重放与轮询降级', '持久化递增事件序号，按 Last-Event-ID 重放，并在流式连接失败时读取终态。', ['SSE', 'Replay', 'Event'], 'implementation', ['kb-sse-events', 'kb-runtime-events'], ['agent-request-lifecycle-runtime']),
    article('temporal-workflow-patterns', 'Temporal 怎样执行可恢复的长流程', '区分 Workflow 与 Activity，解释事件历史、确定性重放、重试、Signal、Query 和版本演进。', ['Temporal', 'Workflow', 'Activity'], 'architecture', ['wl-21-temporal', 'official-temporal'], ['deadline-cancel-checkpoint-recovery']),
  ]),
  ...stage('production', [
    article('agent-three-layer-architecture', '生产 Agent 的三层架构与调用边界', '拆开 API 编排、Agent Runtime 和能力服务，明确状态、数据与失败各归谁处理。', ['Architecture', 'Agent', 'Layering'], 'architecture', ['wl-20-three-layer', 'kb-service-boundaries'], ['agent-request-lifecycle-runtime']),
    article('agent-production-architecture', '生产 Agent 的组件职责与失败传播', '把 API、Runtime、Worker、模型、检索、数据库、对象存储和观测放进同一故障图。', ['Architecture', 'Agent', 'Production'], 'architecture', ['wl-20-three-layer', 'kb-production-components'], ['agent-three-layer-architecture', 'rag-acl-release-security']),
    article('agent-trace-observability', 'Trace 怎样串起模型、检索、工具与验证', '设计跨节点 Trace、Metric 和 Log，区分延迟、错误、质量、成本和资源问题。', ['Trace', 'Observability', 'Metrics'], 'implementation', ['wl-22-observability', 'kb-observability'], ['agent-production-architecture']),
    article('agent-token-budget-model-routing', 'Token 预算与分层模型路由', '按任务阶段分配输入输出预算，再根据能力、时限、风险和降级状态选择模型。', ['Token Budget', 'Model Routing', 'Cost'], 'architecture', ['wl-23-token-budget', 'wl-31-model-routing', 'kb-mode-routing'], ['agent-router-mode-selection', 'agent-trace-observability']),
    article('background-agent-scheduling', '后台 Agent 的调度、预算与孤儿回收', '为后台任务定义身份、触发器、时区、幂等、预算、暂停、过期、通知和清理。', ['Background Agent', 'Scheduling', 'Worker'], 'architecture', ['wl-30-background-agent', 'kb-worker-recovery'], ['agent-production-architecture', 'celery-worker-ack-lease']),
  ]),
  ...stage('harness', [
    article('agent-harness-foundations', 'Agent Harness 的职责与接口', '说明 Harness 怎样统一模型、工具、上下文、状态、权限、运行时、评测和观测。', ['Agent Harness', 'Runtime', 'Platform'], 'architecture', ['wl-32-openclaw', 'wl-33-harness', 'kb-production-components'], ['agent-production-architecture']),
    article('computer-use-agent', 'Computer Use Agent 的观察、动作与验证循环', '把截图或可访问性树观察、动作提议、确认、执行和重新观察组成受控循环。', ['Computer Use', 'Vision', 'Sandbox'], 'implementation', ['wl-28-computer-use', 'official-computer-use'], ['agent-harness-foundations', 'agent-safe-execution-sandbox']),
    article('computer-use-visual-context', 'Computer Use 的视觉上下文管理', '区分浏览器图像和用户图像，处理采集大小、图像老化、幂等缓存、引用和对话契约。', ['Computer Use', 'Visual Context', 'Cache'], 'architecture', ['wl-45-visual-context', 'official-computer-use'], ['computer-use-agent', 'context-compression']),
    article('agentic-coding', '编码 Agent 怎样从仓库证据走到验证结果', '沿读取约束、定位代码、修改、测试、审查和交付解释编码 Agent 的控制流。', ['Agentic Coding', 'Testing', 'Repository'], 'implementation', ['wl-29-agentic-coding', 'kb-eval-regression'], ['agent-harness-foundations']),
    article('openclaw-local-agent', 'OpenClaw 时代的本地工具与权限引擎', '比较可访问性树和坐标控制，说明 Hook、权限分层、循环检测与本地优先的代价。', ['OpenClaw', 'Local Agent', 'Permissions'], 'architecture', ['wl-32-openclaw', 'wl-43-stall-detection'], ['computer-use-agent', 'agent-loop-stall-detection']),
    article('local-agent-runtime', '本地 Agent 的 Daemon、渠道与人工介入', '处理命名 Agent、状态边界、双向 MCP、调度、Watcher、Heartbeat 和人工接管。', ['Local Agent', 'Daemon', 'MCP'], 'architecture', ['wl-33-harness', 'wl-30-background-agent'], ['openclaw-local-agent', 'mcp-protocol-lifecycle']),
    article('agent-harness-platform', 'Agent Harness 怎样成为可治理的平台', '将协议适配、运行时、沙箱、策略、评测和观测做成可替换的平台能力。', ['Agent Harness', 'Platform', 'Governance'], 'architecture', ['wl-33-harness', 'kb-policy-version', 'kb-agent-eval'], ['agent-harness-foundations', 'agent-policy-governance']),
  ]),
  ...stage('capstone', [
    article('knowledge-agent-capstone', '综合项目：实现可信的知识 Agent', '从文件上传开始，串起解析、切块、检索、行动循环、证据验证、异步运行、恢复和评测。', ['Knowledge Agent', 'RAG', 'Runtime'], 'implementation', ['kb-ingestion-service', 'kb-hybrid-retrieval', 'kb-runtime-execution', 'kb-agent-eval'], ['rag-acl-release-security', 'agent-evaluation-regression', 'agent-production-architecture']),
  ]),
  ...stage('appendix', [
    article('agent-terminology-neighbor-concepts', 'Agent 术语与相邻概念', '按模型、上下文、工具、检索、运行时、安全和评测解释术语，并标出容易混淆的边界。', ['Glossary', 'Agent', 'RAG'], 'reference', ['appendix-terminology', 'course-all-stages']),
    article('agent-pattern-selection-handbook', 'Agent 模式选择手册', '根据任务不确定性、依赖、质量、延迟、成本和风险选择最小可行模式。', ['Pattern Selection', 'Decision', 'Agent'], 'reference', ['appendix-pattern-selection', 'course-patterns'], ['agent-fit-deterministic-workflow']),
    article('agent-engineering-faq', 'Agent 工程常见问题', '集中回答概念、模式、架构、成本、安全、调试和评测中的高频问题，并链接到主文章。', ['FAQ', 'Agent Engineering'], 'reference', ['appendix-engineering-faq', 'course-all-stages'], ['agent-pattern-selection-handbook']),
  ]),
]

if (aiAgentCurriculum.length !== 97) {
  throw new Error(`AI/Agent curriculum must contain 97 articles, got ${aiAgentCurriculum.length}`)
}
